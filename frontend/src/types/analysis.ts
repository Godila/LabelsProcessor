export interface BBoxVertex {
  x: number
  y: number
}

export interface OCRLine {
  text: string
  confidence: number
  bbox: BBoxVertex[]
}

export interface OCRResult {
  full_text: string
  lines: OCRLine[]
  avg_confidence: number
  ocr_label?: string
}

export interface NutritionInfo {
  protein: number | null
  fat: number | null
  carbs: number | null
  kcal: number | null
}

export interface Signs {
  eac: boolean | null
  recycling: boolean | null
  fork_glass: boolean | null
}

export interface LabelFields {
  product_name: string | null
  gtin: string | null
  barcode_type: string | null
  standard: string | null
  composition: string | null
  allergens: string | null
  nutrition: NutritionInfo | null
  storage_temp_min: number | null
  storage_temp_max: number | null
  shelf_life: string | null
  shelf_life_after_opening: string | null
  manufacturer: string | null
  manufacturer_address: string | null
  production_address: string | null
  country_of_origin: string | null
  net_weight_kg: number | null
  net_weight_display: string | null
  packaging_type: string | null
  storage_conditions: string | null
  cooking_instructions: string | null
  signs: Signs | null
  zozh: string[] | null
}

export interface Violation {
  severity: 'block' | 'warning'
  field: string
  rule: string
  message: string
}

export interface PhotoQuality {
  ok: boolean
  issues: string[]
}

export interface ConfidenceInfo {
  overall: number
  low_confidence_fields: string[]
}

export interface AnalysisResult {
  ocr: OCRResult
  image_width: number
  image_height: number
  photo_quality: PhotoQuality | null
  category_detected: string | null
  fields: LabelFields | null
  violations: Violation[]
  confidence: ConfidenceInfo | null
}
