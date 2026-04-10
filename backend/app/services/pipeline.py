import base64
import json
import logging
from typing import AsyncGenerator

from app.models.response import (
    AnalysisResult,
    ConfidenceInfo,
    LabelFields,
    NutritionInfo,
    PhotoQuality,
    Signs,
    Violation,
)
from app.services.gemini_analyzer import GeminiAnalyzerService
from app.services.image_processor import get_image_dimensions, prepare_image_for_ocr
from app.utils.pdf_utils import pdf_to_jpeg

logger = logging.getLogger(__name__)

JPEG_MIME = "image/jpeg"
PDF_MIME = "application/pdf"


class LabelPipeline:
    def __init__(self, ocr: YandexOCRService, gemini: GeminiAnalyzerService):
        self.ocr = ocr
        self.gemini = gemini

    async def run(self, file_bytes: bytes, mime: str,
                  settings: dict | None = None) -> AnalysisResult:
        # 1. PDF → JPEG
        if mime == PDF_MIME or mime == "application/octet-stream":
            logger.info("Converting PDF to JPEG")
            file_bytes = pdf_to_jpeg(file_bytes)
            mime = JPEG_MIME

        # 2. Store original dimensions for BBox scaling
        orig_width, orig_height = get_image_dimensions(file_bytes)
        logger.info("Image dimensions: %dx%d", orig_width, orig_height)

        # 3. Resize for Yandex (≤3.95 MB)
        b64_for_ocr, ocr_mime = prepare_image_for_ocr(file_bytes, mime)
        logger.info("Image prepared for OCR (mime=%s, b64_len=%d)", ocr_mime, len(b64_for_ocr))

        # 4. Yandex OCR
        ocr_result = await self.ocr.analyze(b64_for_ocr, ocr_mime)
        logger.info("OCR done: %d lines, avg_conf=%.3f", len(ocr_result.lines), ocr_result.avg_confidence)

        # 5. Gemini analysis (original bytes — no 4MB limit)
        gemini_result = await self.gemini.analyze(file_bytes, mime, ocr_result.full_text, settings)
        logger.info("Gemini done: category=%s, violations=%d",
                    gemini_result.get("category_detected"),
                    len(gemini_result.get("violations", [])))

        # 6. Merge into AnalysisResult
        return self._merge(ocr_result, orig_width, orig_height, gemini_result)

    async def run_streaming(
        self, file_bytes: bytes, mime: str, settings: dict | None = None
    ) -> AsyncGenerator[dict, None]:
        # Step 1: file prepare (PDF convert + resize)
        yield {"step": "file_prepare", "label": "Подготовка файла", "progress": 15}

        if mime == PDF_MIME or mime == "application/octet-stream":
            logger.info("Converting PDF to JPEG")
            file_bytes = pdf_to_jpeg(file_bytes)
            mime = JPEG_MIME

        orig_width, orig_height = get_image_dimensions(file_bytes)
        b64_for_ocr, ocr_mime = prepare_image_for_ocr(file_bytes, mime)
        logger.info("Image prepared for OCR (mime=%s)", ocr_mime)

        # Step 2: OCR
        ocr_label = getattr(self.ocr, "ocr_label", "OCR")
        yield {"step": "yandex_ocr", "label": ocr_label, "progress": 45}
        ocr_result = await self.ocr.analyze(b64_for_ocr, ocr_mime)
        logger.info("OCR done: %d lines", len(ocr_result.lines))

        # Step 3: Gemini analysis
        yield {"step": "gemini_analyze", "label": "AI — анализ регламентов", "progress": 85}
        gemini_result = await self.gemini.analyze(file_bytes, mime, ocr_result.full_text, settings)
        logger.info("Gemini done: violations=%d", len(gemini_result.get("violations", [])))

        # Step 4: Merge
        yield {"step": "merge", "label": "Формирование результата", "progress": 98}
        result = self._merge(ocr_result, orig_width, orig_height, gemini_result)

        yield {"step": "done", "label": "Готово", "progress": 100,
               "result": result.model_dump()}

    # ------------------------------------------------------------------
    def _merge(self, ocr_result, width, height, g: dict) -> AnalysisResult:
        photo_quality = None
        pq = g.get("photo_quality")
        if isinstance(pq, dict):
            photo_quality = PhotoQuality(
                ok=bool(pq.get("ok", True)),
                issues=pq.get("issues", []),
            )

        fields = None
        raw_fields = g.get("fields")
        if isinstance(raw_fields, dict):
            fields = self._parse_fields(raw_fields)

        violations = []
        for v in g.get("violations", []):
            if not isinstance(v, dict):
                continue
            sev = v.get("severity", "warning")
            if sev not in ("block", "warning"):
                sev = "warning"
            violations.append(Violation(
                severity=sev,
                field=str(v.get("field", "")),
                rule=str(v.get("rule", "")),
                message=str(v.get("message", "")),
            ))

        confidence = None
        raw_conf = g.get("confidence")
        if isinstance(raw_conf, dict):
            confidence = ConfidenceInfo(
                overall=float(raw_conf.get("overall", 0.0)),
                low_confidence_fields=raw_conf.get("low_confidence_fields", []),
            )

        return AnalysisResult(
            ocr=ocr_result,
            image_width=width,
            image_height=height,
            photo_quality=photo_quality,
            category_detected=g.get("category_detected"),
            fields=fields,
            violations=violations,
            confidence=confidence,
        )

    def _parse_fields(self, raw: dict) -> LabelFields:
        nutrition = None
        raw_n = raw.get("nutrition")
        if isinstance(raw_n, dict):
            nutrition = NutritionInfo(
                protein=_float_or_none(raw_n.get("protein")),
                fat=_float_or_none(raw_n.get("fat")),
                carbs=_float_or_none(raw_n.get("carbs")),
                kcal=_float_or_none(raw_n.get("kcal")),
            )

        signs = None
        raw_s = raw.get("signs")
        if isinstance(raw_s, dict):
            signs = Signs(
                eac=_bool_or_none(raw_s.get("eac")),
                recycling=_bool_or_none(raw_s.get("recycling")),
                fork_glass=_bool_or_none(raw_s.get("fork_glass")),
            )

        zozh = raw.get("zozh")
        if not isinstance(zozh, list):
            zozh = None

        return LabelFields(
            product_name=_str_or_none(raw.get("product_name")),
            gtin=_str_or_none(raw.get("gtin")),
            barcode_type=_str_or_none(raw.get("barcode_type")),
            standard=_str_or_none(raw.get("standard")),
            composition=_str_or_none(raw.get("composition")),
            allergens=_str_or_none(raw.get("allergens")),
            nutrition=nutrition,
            storage_temp_min=_float_or_none(raw.get("storage_temp_min")),
            storage_temp_max=_float_or_none(raw.get("storage_temp_max")),
            shelf_life=_str_or_none(raw.get("shelf_life")),
            shelf_life_after_opening=_str_or_none(raw.get("shelf_life_after_opening")),
            manufacturer=_str_or_none(raw.get("manufacturer")),
            manufacturer_address=_str_or_none(raw.get("manufacturer_address")),
            production_address=_str_or_none(raw.get("production_address")),
            country_of_origin=_str_or_none(raw.get("country_of_origin")),
            net_weight_kg=_float_or_none(raw.get("net_weight_kg")),
            net_weight_display=_str_or_none(raw.get("net_weight_display")),
            packaging_type=_str_or_none(raw.get("packaging_type")),
            storage_conditions=_str_or_none(raw.get("storage_conditions")),
            cooking_instructions=_str_or_none(raw.get("cooking_instructions")),
            signs=signs,
            zozh=zozh,
        )


def _str_or_none(v) -> str | None:
    if v is None or v == "":
        return None
    return str(v)


def _float_or_none(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _bool_or_none(v) -> bool | None:
    if v is None:
        return None
    return bool(v)
