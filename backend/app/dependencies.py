import logging

from app.config import settings
from app.services.gemini_analyzer import GeminiAnalyzerService
from app.services.iam_token_manager import IAMTokenManager
from app.services.pipeline import LabelPipeline

logger = logging.getLogger(__name__)

# ── Gemini (всегда используется) ──────────────────────────────────────────────
gemini_service = GeminiAnalyzerService(
    api_key=settings.openrouter_api_key,
    model=settings.gemini_model,
)

# ── OCR provider: yandex | nemotron ──────────────────────────────────────────
# IAM manager нужен только для Yandex, но импортируется из main.py всегда
iam_manager = IAMTokenManager(
    oauth_token=settings.yandex_oauth_token,
    refresh_interval=settings.iam_refresh_interval_seconds,
)

if settings.ocr_provider == "nemotron":
    from app.services.nemotron_ocr import NemotronOCRService
    if not settings.nemotron_ocr_url:
        raise RuntimeError("NEMOTRON_OCR_URL не задан в .env")
    ocr_service = NemotronOCRService(base_url=settings.nemotron_ocr_url)
    logger.info("OCR provider: Nemotron @ %s", settings.nemotron_ocr_url)
else:
    from app.services.yandex_ocr import YandexOCRService
    ocr_service = YandexOCRService(
        folder_id=settings.yandex_folder_id,
        token_manager=iam_manager,
    )
    logger.info("OCR provider: Yandex Vision")

pipeline = LabelPipeline(ocr=ocr_service, gemini=gemini_service)
