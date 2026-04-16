"""
Nemotron OCR v2 client — drop-in замена YandexOCRService.
Вызывает FastAPI сервер на vast.ai: POST /ocr {image_b64, mime}
"""
import base64
import logging

import httpx

from app.models.response import BBoxVertex, OCRLine, OCRResult

logger = logging.getLogger(__name__)


class NemotronOCRService:
    ocr_label = "OCR — JustOCR 2.0"

    def __init__(self, base_url: str):
        # base_url например: http://194.228.55.129:37479
        self.base_url = base_url.rstrip("/")

    async def analyze(self, image_b64: str, mime: str, merge_level: str = "paragraph") -> OCRResult:
        """Совместимый интерфейс с YandexOCRService."""
        payload = {"image_b64": image_b64, "mime": mime, "merge_level": merge_level}

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self.base_url}/ocr", json=payload)
            resp.raise_for_status()
            data = resp.json()

        lines = []
        for item in data.get("lines", []):
            bbox = [BBoxVertex(x=v["x"], y=v["y"]) for v in item.get("bbox", [])]
            lines.append(OCRLine(
                text=item["text"],
                confidence=item["confidence"],
                bbox=bbox,
            ))

        full_text = data.get("full_text", "")
        avg_conf = data.get("avg_confidence", 0.0)

        logger.info("Nemotron OCR: %d lines, avg_conf=%.3f", len(lines), avg_conf)
        return OCRResult(full_text=full_text, lines=lines, avg_confidence=avg_conf, ocr_label=self.ocr_label)
