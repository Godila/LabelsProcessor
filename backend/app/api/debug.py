import base64

from fastapi import APIRouter, UploadFile
from fastapi.responses import HTMLResponse

from app.services.image_processor import preprocess_for_ocr, crop_label_region

router = APIRouter()


@router.get("/debug/preprocess", response_class=HTMLResponse)
async def debug_preprocess_form():
    return HTMLResponse("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Preprocess Test</title>
<style>body{font-family:Arial;background:#1a1a1a;color:#eee;padding:40px;text-align:center}
input,button{margin:10px;padding:10px 20px;border-radius:8px;border:none;font-size:14px}
button{background:#e63329;color:#fff;cursor:pointer}</style></head>
<body><h2>🔬 Тест препроцессинга</h2>
<form method="POST" enctype="multipart/form-data">
  <input type="file" name="file" accept="image/*,.pdf" required><br>
  <button type="submit">Обработать</button>
</form></body></html>""")


@router.post("/debug/preprocess", response_class=HTMLResponse)
async def debug_preprocess(file: UploadFile):
    """Returns side-by-side HTML with original vs preprocessed image."""
    data = await file.read()

    enhanced = preprocess_for_ocr(data)
    cropped = crop_label_region(enhanced)

    orig_b64 = base64.b64encode(data).decode()
    enhanced_b64 = base64.b64encode(enhanced).decode()
    cropped_b64 = base64.b64encode(cropped).decode()

    mime = file.content_type or "image/jpeg"

    def size_kb(b: bytes) -> str:
        return f"{len(b) / 1024:.1f} KB"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preprocessing Debug</title>
  <style>
    body {{ font-family: Arial, sans-serif; background: #1a1a1a; color: #eee; margin: 0; padding: 20px; }}
    h1 {{ font-size: 18px; margin-bottom: 20px; color: #fff; }}
    .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
    .card {{ background: #2a2a2a; border-radius: 10px; padding: 14px; }}
    .label {{ font-size: 13px; font-weight: 700; margin-bottom: 6px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }}
    .meta {{ font-size: 12px; color: #76b900; margin-bottom: 10px; }}
    img {{ width: 100%; border-radius: 6px; display: block; }}
  </style>
</head>
<body>
  <h1>🔬 Preprocessing Debug — {file.filename}</h1>
  <div class="grid">
    <div class="card">
      <div class="label">1. Оригинал</div>
      <div class="meta">{size_kb(data)}</div>
      <img src="data:{mime};base64,{orig_b64}">
    </div>
    <div class="card">
      <div class="label">2. CLAHE + Denoise</div>
      <div class="meta">{size_kb(enhanced)} · {'%.0f' % (100 * len(enhanced) / len(data))}% от оригинала</div>
      <img src="data:image/jpeg;base64,{enhanced_b64}">
    </div>
    <div class="card">
      <div class="label">3. + Crop к тексту</div>
      <div class="meta">{size_kb(cropped)} {'✅ обрезано' if len(cropped) < len(enhanced) * 0.95 else '⚠️ crop не сработал'}</div>
      <img src="data:image/jpeg;base64,{cropped_b64}">
    </div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)
