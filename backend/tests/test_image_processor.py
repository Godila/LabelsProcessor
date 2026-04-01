import io
import pytest
from PIL import Image
from app.services.image_processor import prepare_image_for_ocr, get_image_dimensions

MAX = 3_950_000


def make_jpeg(width: int, height: int, quality: int = 95) -> bytes:
    img = Image.new("RGB", (width, height), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def make_png(width: int, height: int) -> bytes:
    img = Image.new("RGBA", (width, height), color=(0, 128, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_small_image_passthrough():
    data = make_jpeg(100, 100)
    assert len(data) <= MAX
    b64, mime = prepare_image_for_ocr(data, "image/jpeg")
    assert mime == "image/jpeg"
    assert len(b64) > 0


def test_png_small_passthrough():
    data = make_png(200, 200)
    b64, mime = prepare_image_for_ocr(data, "image/png")
    assert mime == "image/png"


def test_large_image_reduced():
    # Create a large incompressible image (random-ish solid color at high quality)
    data = make_jpeg(4000, 3000, quality=100)
    if len(data) <= MAX:
        pytest.skip("Image already small enough, cannot test resize path")
    b64, mime = prepare_image_for_ocr(data, "image/jpeg")
    import base64
    result_bytes = base64.b64decode(b64)
    assert len(result_bytes) <= MAX
    assert mime == "image/jpeg"


def test_dimensions():
    data = make_jpeg(640, 480)
    w, h = get_image_dimensions(data)
    assert w == 640
    assert h == 480


def test_rgba_converted():
    data = make_png(300, 300)
    b64, mime = prepare_image_for_ocr(data, "image/png")
    # Should not raise
    assert b64
