import asyncio
import logging
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

IAM_URL = "https://iam.api.cloud.yandex.net/iam/v1/tokens"


class IAMTokenManager:
    def __init__(self, oauth_token: str, refresh_interval: int = 40000):
        self.oauth_token = oauth_token
        self.refresh_interval = refresh_interval
        self._token: str | None = None
        self._expires_at: datetime | None = None
        self._lock = asyncio.Lock()

    async def get_token(self) -> str:
        async with self._lock:
            if self._token is None or self._is_expiring_soon():
                await self._refresh()
            return self._token

    def _is_expiring_soon(self) -> bool:
        if self._expires_at is None:
            return True
        return datetime.utcnow() >= self._expires_at - timedelta(minutes=10)

    async def _refresh(self):
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                IAM_URL,
                json={"yandexPassportOauthToken": self.oauth_token},
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["iamToken"]
            self._expires_at = datetime.utcnow() + timedelta(hours=11, minutes=50)
            logger.info("IAM token refreshed, expires ~%s", self._expires_at)

    async def start_background_refresh(self):
        await self.get_token()
        asyncio.create_task(self._refresh_loop())

    async def _refresh_loop(self):
        while True:
            await asyncio.sleep(self.refresh_interval)
            try:
                async with self._lock:
                    await self._refresh()
            except Exception as e:
                logger.error("IAM token refresh failed: %s", e)
