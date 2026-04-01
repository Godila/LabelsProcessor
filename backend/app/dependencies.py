from app.config import settings
from app.services.gemini_analyzer import GeminiAnalyzerService
from app.services.iam_token_manager import IAMTokenManager
from app.services.pipeline import LabelPipeline
from app.services.yandex_ocr import YandexOCRService

iam_manager = IAMTokenManager(
    oauth_token=settings.yandex_oauth_token,
    refresh_interval=settings.iam_refresh_interval_seconds,
)

ocr_service = YandexOCRService(
    folder_id=settings.yandex_folder_id,
    token_manager=iam_manager,
)

gemini_service = GeminiAnalyzerService(
    api_key=settings.openrouter_api_key,
    model=settings.gemini_model,
)

pipeline = LabelPipeline(ocr=ocr_service, gemini=gemini_service)
