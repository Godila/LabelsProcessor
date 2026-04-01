import base64
import io

from PIL import Image

MAX_YANDEX_BYTES = 3_950_000


def prepare_image_for_ocr(image_bytes: bytes, original_mime: str) -> tuple[str, str]:
    """Resize image to fit Yandex 4MB limit. Returns (base64, mime_type)."""
    if len(image_bytes) <= MAX_YANDEX_BYTES:
        return base64.b64encode(image_bytes).decode(), original_mime

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    quality = 90
    scale = 1.0

    while True:
        buf = io.BytesIO()
        w = max(1, int(img.width * scale))
        h = max(1, int(img.height * scale))
        resized = img.resize((w, h), Image.LANCZOS) if scale < 1.0 else img
        resized.save(buf, format="JPEG", quality=quality, optimize=True)
        result = buf.getvalue()

        if len(result) <= MAX_YANDEX_BYTES:
            return base64.b64encode(result).decode(), "image/jpeg"

        if quality > 70:
            quality -= 10
        else:
            scale *= 0.85

        if scale < 0.15:
            raise ValueError(f"Cannot reduce image below Yandex limit: {len(result)} bytes")


def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    """Returns (width, height) of original image for bbox scaling."""
    img = Image.open(io.BytesIO(image_bytes))
    return img.width, img.height
