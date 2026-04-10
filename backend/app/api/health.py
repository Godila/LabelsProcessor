import os

from fastapi import APIRouter
from app.config import settings
from app.dependencies import iam_manager

router = APIRouter()


@router.get("/health")
async def health():
    token_valid = iam_manager._token is not None and not iam_manager._is_expiring_soon()
    return {
        "status": "ok",
        "iam_token_valid": token_valid,
        "ocr_provider": settings.ocr_provider,
        "nemotron_url": settings.nemotron_ocr_url or "NOT SET",
        # raw env var — bypasses pydantic to confirm what OS sees
        "env_NEMOTRON_OCR_URL": os.environ.get("NEMOTRON_OCR_URL", "NOT SET"),
        "env_OCR_PROVIDER": os.environ.get("OCR_PROVIDER", "NOT SET"),
    }
