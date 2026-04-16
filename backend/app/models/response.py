from pydantic import BaseModel
from typing import Optional, List, Literal, Any


class BBoxVertex(BaseModel):
    x: int
    y: int


class OCRLine(BaseModel):
    text: str
    confidence: float
    bbox: List[BBoxVertex] = []


class OCRResult(BaseModel):
    full_text: str
    lines: List[OCRLine]
    avg_confidence: float
    ocr_label: str = "OCR"


class NutritionInfo(BaseModel):
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    kcal: Optional[float] = None


class Signs(BaseModel):
    eac: Optional[bool] = None
    recycling: Optional[bool] = None
    fork_glass: Optional[bool] = None


class LabelFields(BaseModel):
    product_name: Optional[str] = None
    gtin: Optional[str] = None
    barcode_type: Optional[str] = None
    standard: Optional[str] = None
    composition: Optional[str] = None
    allergens: Optional[str] = None
    nutrition: Optional[NutritionInfo] = None
    storage_temp_min: Optional[float] = None
    storage_temp_max: Optional[float] = None
    shelf_life: Optional[str] = None
    shelf_life_after_opening: Optional[str] = None
    manufacturer: Optional[str] = None
    manufacturer_address: Optional[str] = None
    production_address: Optional[str] = None
    country_of_origin: Optional[str] = None
    net_weight_kg: Optional[float] = None
    net_weight_display: Optional[str] = None
    packaging_type: Optional[str] = None
    storage_conditions: Optional[str] = None
    cooking_instructions: Optional[str] = None
    signs: Optional[Signs] = None
    zozh: Optional[List[str]] = None


class Violation(BaseModel):
    severity: Literal["block", "warning"]
    field: str
    rule: str
    message: str


class PhotoQuality(BaseModel):
    ok: bool
    issues: List[str] = []


class ConfidenceInfo(BaseModel):
    overall: float
    low_confidence_fields: List[str] = []


class AnalysisResult(BaseModel):
    ocr: OCRResult
    image_width: int
    image_height: int
    photo_quality: Optional[PhotoQuality] = None
    category_detected: Optional[str] = None
    fields: Optional[LabelFields] = None
    violations: List[Violation] = []
    confidence: Optional[ConfidenceInfo] = None
