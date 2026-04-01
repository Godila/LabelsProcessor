export interface CheckSettings {
  enabled_regulations: string[]
  require_eac: boolean
  require_nutrition: boolean
  require_composition: boolean
  require_manufacturer: boolean
  require_shelf_life: boolean
  require_storage_temp: boolean
  require_gtin: boolean
  check_children_warning: boolean
  check_spelling: boolean
  extra_instructions: string
}

export const ALL_REGULATIONS = [
  'ТР ТС 021/2011',
  'ТР ТС 022/2011',
  'ТР ТС 029/2012',
  'ТР ЕАЭС 051/2021',
  'ГОСТ 32478-2013',
]

export const DEFAULT_SETTINGS: CheckSettings = {
  enabled_regulations: [...ALL_REGULATIONS],
  require_eac: true,
  require_nutrition: true,
  require_composition: true,
  require_manufacturer: true,
  require_shelf_life: true,
  require_storage_temp: true,
  require_gtin: false,
  check_children_warning: true,
  check_spelling: true,
  extra_instructions: '',
}
