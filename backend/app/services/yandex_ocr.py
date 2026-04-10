import logging

import httpx

from app.models.response import BBoxVertex, OCRLine, OCRResult
from app.services.iam_token_manager import IAMTokenManager

logger = logging.getLogger(__name__)

YANDEX_OCR_URL = "https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze"


class YandexOCRService:
    ocr_label = "OCR — Yandex Vision"

    def __init__(self, folder_id: str, token_manager: IAMTokenManager):
        self.folder_id = folder_id
        self.token_manager = token_manager

    async def analyze(self, b64_image: str, mime: str) -> OCRResult:
        token = await self.token_manager.get_token()
        payload = {
            "folderId": self.folder_id,
            "analyzeSpecs": [{
                "content": b64_image,
                "features": [{
                    "type": "TEXT_DETECTION",
                    "textDetectionConfig": {"languageCodes": ["ru", "en"]},
                }],
            }],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                YANDEX_OCR_URL,
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )

        if resp.status_code != 200:
            logger.error("Yandex OCR error %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Yandex Vision API error: {resp.status_code} — {resp.text[:200]}")

        return self._parse_response(resp.json())

    def _parse_response(self, data: dict) -> OCRResult:
        try:
            blocks = (
                data["results"][0]["results"][0]
                ["textDetection"]["pages"][0]["blocks"]
            )
        except (KeyError, IndexError):
            logger.warning("Yandex OCR: empty or unexpected response structure")
            return OCRResult(full_text="", lines=[], avg_confidence=0.0)

        lines_out: list[OCRLine] = []
        for block in blocks:
            for line in block.get("lines", []):
                words = line.get("words", [])
                if not words:
                    continue
                text = " ".join(w["text"] for w in words)
                conf = sum(w.get("confidence", 0) for w in words) / len(words)
                raw_bbox = line.get("boundingBox", {}).get("vertices", [])
                bbox = [BBoxVertex(x=int(v.get("x", 0)), y=int(v.get("y", 0))) for v in raw_bbox]
                lines_out.append(OCRLine(text=text, confidence=round(conf, 3), bbox=bbox))

        full_text = "\n".join(l.text for l in lines_out)
        avg_conf = round(
            sum(l.confidence for l in lines_out) / max(len(lines_out), 1), 3
        )
        return OCRResult(full_text=full_text, lines=lines_out, avg_confidence=avg_conf)
