import logging

from fastapi import APIRouter, HTTPException, UploadFile

from app.config import settings
from app.dependencies import pipeline
from app.models.response import AnalysisResult

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_label(file: UploadFile):
    mime = file.content_type or ""
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime}")

    data = await file.read()
    if len(data) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {len(data)} bytes (max {settings.max_file_size_bytes})",
        )

    logger.info("analyze: filename=%s mime=%s size=%d", file.filename, mime, len(data))
    try:
        result = await pipeline.run(data, mime)
    except Exception as e:
        logger.exception("Pipeline error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return result
