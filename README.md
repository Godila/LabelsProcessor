# X5 Label Checker

Сервис автоматической проверки этикеток поставщиков X5 (Пятёрочка / Перекрёсток / Чижик) на соответствие российским регламентам (ТР ТС 021/2011, 022/2011, 029/2012, ТР ЕАЭС 051/2021, ГОСТ 32478-2013).

## Стек

| Слой | Технология |
|------|-----------|
| OCR | Yandex Vision API (текст + bbox-координаты) |
| AI-анализ | Gemini 3 Flash via OpenRouter (структура полей + compliance) |
| Backend | FastAPI + Python 3.13 |
| Frontend | React 18 + Vite + TypeScript |
| Деплой | Docker Compose + Dokploy (Traefik) |

## Как работает

```
Загрузка фото/PDF
  → PDF? → pdfplumber → JPEG
  → Pillow resize ≤ 3.95 МБ (лимит Yandex gRPC)
  → Yandex Vision → OCR-текст + bbox строк
  → Gemini Flash → структурированные поля + нарушения
  → Merge → AnalysisResult JSON
  → React UI: фото с SVG bbox-overlay | поля | нарушения
```

## Быстрый старт

### 1. Переменные окружения

```bash
cp .env.example .env
# заполни .env:
# YANDEX_OAUTH_TOKEN=y0_Ag...
# YANDEX_FOLDER_ID=b1g...
# OPENROUTER_API_KEY=sk-or-v1-...
# GEMINI_MODEL=google/gemini-3-flash-preview
```

### 2. Локально (без Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (в другом терминале)
cd frontend
npm install
VITE_API_URL=http://localhost:8000/api npm run dev
```

### 3. Docker Compose

```bash
docker compose up --build
# frontend → http://localhost:80
# backend  → http://localhost:8000/api/health
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/analyze` | `multipart/form-data: file` (JPG/PNG/WebP/PDF, до 20 МБ) → `AnalysisResult` JSON |
| `GET` | `/api/health` | `{"status": "ok", "iam_token_valid": bool}` |

### Пример ответа

```json
{
  "ocr": { "full_text": "...", "lines": [...], "avg_confidence": 0.99 },
  "image_width": 1200, "image_height": 900,
  "photo_quality": { "ok": true, "issues": [] },
  "category_detected": "Мясная продукция из мяса птицы",
  "fields": {
    "product_name": "ПРОДУКТ ИЗ МЯСА КУР...",
    "gtin": "2782151006190",
    "barcode_type": "EAN-13",
    "nutrition": { "protein": 20.0, "fat": 7.0, "carbs": null, "kcal": 143.0 },
    "storage_temp_min": 0, "storage_temp_max": 6,
    "manufacturer": "АО «Омский бекон»",
    "signs": { "eac": true, "recycling": true, "fork_glass": true }
  },
  "violations": [
    {
      "severity": "warning",
      "field": "nutrition.carbs",
      "rule": "ТР ТС 022/2011",
      "message": "Отсутствует информация об углеводах"
    }
  ],
  "confidence": { "overall": 0.98, "low_confidence_fields": [] }
}
```

## Тесты

```bash
cd backend

# Unit тесты (без внешних API)
pytest tests/test_image_processor.py tests/test_api.py -v

# Интеграционные тесты (нужны реальные ключи)
pytest tests/test_pipeline_integration.py -v --run-integration
```

## Деплой на Dokploy

1. GitHub → подключить репо `Godila/LabelsProcessor`
2. **New Service → Compose** → branch `master`, path `docker-compose.yml`
3. Вставить переменные из `.env` в Environment
4. **Deploy**
5. **Domains**:
   - frontend → `ваш-домен.com`, path `/`, HTTPS + Let's Encrypt
   - backend → `ваш-домен.com`, path `/api`, **stripPath ON**, HTTPS

## Структура проекта

```
x5-label-checker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI + lifespan
│   │   ├── config.py            # pydantic-settings (.env)
│   │   ├── dependencies.py      # singletons
│   │   ├── api/
│   │   │   ├── labels.py        # POST /api/analyze
│   │   │   └── health.py        # GET /api/health
│   │   ├── models/response.py   # Pydantic схемы
│   │   ├── services/
│   │   │   ├── iam_token_manager.py
│   │   │   ├── image_processor.py
│   │   │   ├── yandex_ocr.py
│   │   │   ├── gemini_analyzer.py
│   │   │   └── pipeline.py
│   │   └── utils/pdf_utils.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types/analysis.ts
│   │   ├── api/client.ts
│   │   ├── hooks/
│   │   └── components/
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```
