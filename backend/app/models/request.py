from pydantic import BaseModel, Field


class CheckSettings(BaseModel):
    enabled_regulations: list[str] = Field(
        default=["ТР ТС 021/2011", "ТР ТС 022/2011", "ТР ТС 029/2012",
                 "ТР ЕАЭС 051/2021", "ГОСТ 32478-2013"]
    )
    require_eac: bool = True
    require_nutrition: bool = True
    require_composition: bool = True
    require_manufacturer: bool = True
    require_shelf_life: bool = True
    require_storage_temp: bool = True
    require_gtin: bool = False
    check_children_warning: bool = True
    check_spelling: bool = True
    extra_instructions: str = ""
    ocr_provider: str = ""  # "" = use server default, "yandex" | "nemotron" = override
