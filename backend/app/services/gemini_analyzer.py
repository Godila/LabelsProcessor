import base64
import json
import logging

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

SCHEMA = """{
  "photo_quality": {"ok": true, "issues": []},
  "category_detected": "string",
  "fields": {
    "product_name": null,
    "gtin": null,
    "barcode_type": null,
    "standard": null,
    "composition": null,
    "allergens": null,
    "nutrition": {"protein": null, "fat": null, "carbs": null, "kcal": null},
    "storage_temp_min": null,
    "storage_temp_max": null,
    "shelf_life": null,
    "shelf_life_after_opening": null,
    "manufacturer": null,
    "manufacturer_address": null,
    "production_address": null,
    "country_of_origin": null,
    "net_weight_kg": null,
    "net_weight_display": null,
    "packaging_type": null,
    "storage_conditions": null,
    "cooking_instructions": null,
    "signs": {"eac": false, "recycling": false, "fork_glass": false},
    "zozh": []
  },
  "violations": [
    {"severity": "block|warning", "field": "string", "rule": "string", "message": "string"}
  ],
  "confidence": {"overall": 0.0, "low_confidence_fields": []}
}"""

SYSTEM_PROMPT = (
    "Ты — эксперт по проверке маркировки товаров по российскому законодательству. "
    "Регламенты: ТР ТС 021/2011, 022/2011, 029/2012, ТР ЕАЭС 051/2021, ГОСТ 32478-2013. "
    "Отвечай ТОЛЬКО валидным JSON без markdown и пояснений."
)

USER_PROMPT_TEMPLATE = """Yandex Vision уже распознал текст с этикетки:
<ocr_text>
{ocr_text}
</ocr_text>

Используй OCR-текст как основу для извлечения полей.
По изображению дополни визуальные элементы: знаки EAC, Мебиус, Бокал-вилка, штрихкод.

Задачи:
1. Оцени качество фото (blur/glare/wrong_product/low_resolution/partial).
2. Извлеки все поля в fields{{}}.
3. Проверь нарушения регламентов. Особое внимание:
   - Наличие знака EAC (пищевые и бытовые товары, поднадзорные ТС)
   - Наличие КБЖУ (пищевые продукты)
   - Наличие состава, изготовителя, адреса, СГ, температуры хранения
   - Для бытовой химии: "хранить в местах, недоступных для детей"
   - Орфографические ошибки в составе (например "подности" вместо "годности")
4. Заполни confidence.low_confidence_fields для полей, в которых не уверен.

Верни JSON строго по схеме:
{schema}"""


class GeminiAnalyzerService:
    def __init__(self, api_key: str, model: str):
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model = model

    async def analyze(self, image_bytes: bytes, mime: str, ocr_text: str) -> dict:
        b64 = base64.b64encode(image_bytes).decode()
        prompt = USER_PROMPT_TEMPLATE.format(ocr_text=ocr_text, schema=SCHEMA)

        for attempt in range(3):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                                {"type": "text", "text": prompt},
                            ],
                        },
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                )
                raw = response.choices[0].message.content or ""
                raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(raw)
            except json.JSONDecodeError as e:
                logger.warning("Gemini invalid JSON attempt %d: %s", attempt + 1, e)
                if attempt == 2:
                    return {
                        "photo_quality": {"ok": False, "issues": ["parse_error"]},
                        "category_detected": None,
                        "fields": {},
                        "violations": [{"severity": "warning", "field": "system",
                                        "rule": "system", "message": "Ошибка разбора ответа AI"}],
                        "confidence": {"overall": 0.0, "low_confidence_fields": []},
                    }
            except Exception as e:
                logger.error("Gemini API error: %s", e)
                raise
