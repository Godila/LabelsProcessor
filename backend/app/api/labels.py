import json
import logging

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.config import settings as app_settings
from app.dependencies import gemini_service, iam_manager, ocr_service, pipeline
from app.models.response import AnalysisResult
from app.services.pipeline import LabelPipeline

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


def _get_pipeline(parsed_settings: dict | None) -> LabelPipeline:
    """Return pipeline, optionally overriding OCR provider per-request."""
    provider = (parsed_settings or {}).get("ocr_provider", "")
    # no override, or same as server default → use pre-built pipeline
    if not provider or provider == app_settings.ocr_provider:
        return pipeline
    if provider == "nemotron" and app_settings.nemotron_ocr_url:
        from app.services.nemotron_ocr import NemotronOCRService
        ocr = NemotronOCRService(base_url=app_settings.nemotron_ocr_url)
        return LabelPipeline(ocr=ocr, gemini=gemini_service)
    if provider == "yandex":
        from app.services.yandex_ocr import YandexOCRService
        ocr = YandexOCRService(folder_id=app_settings.yandex_folder_id, token_manager=iam_manager)
        return LabelPipeline(ocr=ocr, gemini=gemini_service)
    # fallback — never raise, just use server default
    return pipeline


def _parse_settings(settings_json: str | None) -> dict | None:
    if not settings_json:
        return None
    try:
        return json.loads(settings_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON in 'settings' field")


async def _read_and_validate(file: UploadFile) -> tuple[bytes, str]:
    mime = file.content_type or ""
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime}")
    data = await file.read()
    if len(data) > app_settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {len(data)} bytes (max {settings.max_file_size_bytes})",
        )
    return data, mime


@router.post("/analyze/pipeline-compare")
async def compare_full_pipelines(
    file: UploadFile,
    settings_json: str | None = Form(None, alias="settings"),
):
    """Run full analysis (OCR + LLM) with both Yandex and Nemotron in parallel."""
    import asyncio
    from app.services.yandex_ocr import YandexOCRService
    from app.services.nemotron_ocr import NemotronOCRService

    data, mime = await _read_and_validate(file)
    parsed_settings = _parse_settings(settings_json)

    yandex_ocr = YandexOCRService(folder_id=app_settings.yandex_folder_id, token_manager=iam_manager)
    yandex_pipeline = LabelPipeline(ocr=yandex_ocr, gemini=gemini_service)

    async def run_yandex():
        try:
            result = await yandex_pipeline.run(data, mime, parsed_settings)
            return {"ok": True, "result": result.model_dump()}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def run_nemotron():
        if not app_settings.nemotron_ocr_url:
            return {"ok": False, "error": "NEMOTRON_OCR_URL не задан"}
        try:
            nem_ocr = NemotronOCRService(base_url=app_settings.nemotron_ocr_url)
            nem_pipeline = LabelPipeline(ocr=nem_ocr, gemini=gemini_service)
            result = await nem_pipeline.run(data, mime, parsed_settings)
            return {"ok": True, "result": result.model_dump()}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    yandex_res, nemotron_res = await asyncio.gather(run_yandex(), run_nemotron())
    return {"yandex": yandex_res, "nemotron": nemotron_res}


@router.post("/analyze/ocr-compare")
async def compare_ocr_providers(
    file: UploadFile,
    merge_level: str | None = Form(None),
):
    """Run Yandex Vision and Nemotron in parallel, return both OCR results for comparison."""
    import asyncio
    import base64
    from app.services.yandex_ocr import YandexOCRService
    from app.services.nemotron_ocr import NemotronOCRService

    data, mime = await _read_and_validate(file)
    b64 = base64.b64encode(data).decode()

    yandex_svc = YandexOCRService(
        folder_id=app_settings.yandex_folder_id, token_manager=iam_manager
    )

    async def run_yandex():
        try:
            r = await yandex_svc.analyze(b64, mime)
            return {"full_text": r.full_text, "lines": [{"text": l.text, "confidence": l.confidence} for l in r.lines], "avg_confidence": r.avg_confidence, "line_count": len(r.lines)}
        except Exception as e:
            return {"error": str(e)}

    async def run_nemotron():
        if not app_settings.nemotron_ocr_url:
            return {"error": "NEMOTRON_OCR_URL не задан"}
        try:
            svc = NemotronOCRService(base_url=app_settings.nemotron_ocr_url)
            ml = merge_level if merge_level in ("word", "sentence", "paragraph") else "paragraph"
            r = await svc.analyze(b64, mime, merge_level=ml)
            return {"full_text": r.full_text, "lines": [{"text": l.text, "confidence": l.confidence} for l in r.lines], "avg_confidence": r.avg_confidence, "line_count": len(r.lines)}
        except Exception as e:
            return {"error": str(e)}

    yandex_res, nemotron_res = await asyncio.gather(run_yandex(), run_nemotron())
    return {"yandex": yandex_res, "nemotron": nemotron_res}


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_label(
    file: UploadFile,
    settings_json: str | None = Form(None, alias="settings"),
):
    data, mime = await _read_and_validate(file)
    parsed_settings = _parse_settings(settings_json)
    logger.info("analyze: filename=%s mime=%s size=%d", file.filename, mime, len(data))
    try:
        result = await _get_pipeline(parsed_settings).run(data, mime, parsed_settings)
    except Exception as e:
        logger.exception("Pipeline error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    return result


@router.post("/analyze/stream")
async def analyze_label_stream(
    file: UploadFile,
    settings_json: str | None = Form(None, alias="settings"),
):
    data, mime = await _read_and_validate(file)
    parsed_settings = _parse_settings(settings_json)
    logger.info("analyze/stream: filename=%s mime=%s size=%d", file.filename, mime, len(data))

    req_pipeline = _get_pipeline(parsed_settings)

    async def event_gen():
        try:
            async for event in req_pipeline.run_streaming(data, mime, parsed_settings):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.exception("Stream pipeline error: %s", e)
            err = {"step": "error", "label": "Ошибка", "progress": 0,
                   "message": str(e)}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
