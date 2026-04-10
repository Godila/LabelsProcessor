import base64
import io
import logging

import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

MAX_YANDEX_BYTES = 3_950_000


# ── Level-1 preprocessing (always on, safe) ──────────────────────────────────

def preprocess_for_ocr(image_bytes: bytes) -> bytes:
    """
    Safe image enhancement pipeline:
    1. Fix EXIF orientation
    2. CLAHE contrast enhancement (helps dark/faded labels)
    3. Mild denoise (removes camera noise without blurring text)
    Returns enhanced JPEG bytes.
    """
    try:
        # Fix EXIF orientation via Pillow
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        if pil_img.mode in ("RGBA", "P", "LA"):
            pil_img = pil_img.convert("RGB")

        # PIL → OpenCV (BGR)
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        # CLAHE on L channel (LAB colorspace) — improves contrast without washing out
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        enhanced = cv2.merge([l_enhanced, a, b])
        img = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        # Mild fast denoise (only if image looks noisy — check std dev)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        noise_level = float(np.std(gray - cv2.GaussianBlur(gray, (5, 5), 0)))
        if noise_level > 12.0:
            img = cv2.fastNlMeansDenoisingColored(img, None, h=7, hColor=7,
                                                  templateWindowSize=7, searchWindowSize=21)
            logger.debug("Denoise applied (noise_level=%.1f)", noise_level)

        # Back to JPEG bytes
        success, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if not success:
            logger.warning("OpenCV encode failed, returning original")
            return image_bytes

        result = buf.tobytes()
        logger.info("Preprocessed: %d → %d bytes (%.0f%%)",
                    len(image_bytes), len(result), 100 * len(result) / len(image_bytes))
        return result

    except Exception as e:
        logger.warning("Preprocessing failed (%s), returning original", e)
        return image_bytes


# ── Level-2 preprocessing (optional, label crop) ────────────────────────────

def crop_label_region(image_bytes: bytes, margin: float = 0.02) -> bytes:
    """
    Attempt to find and crop the main label rectangle using contour detection.
    Falls back to original if no clear rectangle found.
    margin: extra padding around detected region (fraction of image size).
    """
    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Edge detection
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 30, 100)
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)

        # Find largest contour
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return image_bytes

        # Filter contours by area (at least 15% of image)
        min_area = 0.15 * w * h
        valid = [c for c in contours if cv2.contourArea(c) > min_area]
        if not valid:
            return image_bytes

        largest = max(valid, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest)

        # Skip if crop covers almost the full image (no point)
        if bw * bh > 0.92 * w * h:
            return image_bytes

        # Add margin
        pad_x = int(w * margin)
        pad_y = int(h * margin)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w, x + bw + pad_x)
        y2 = min(h, y + bh + pad_y)

        cropped = img[y1:y2, x1:x2]
        success, buf = cv2.imencode(".jpg", cropped, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if not success:
            return image_bytes

        result = buf.tobytes()
        logger.info("Label crop: %dx%d → %dx%d (%.0f%% area)",
                    w, h, x2 - x1, y2 - y1, 100 * (x2 - x1) * (y2 - y1) / (w * h))
        return result

    except Exception as e:
        logger.warning("Label crop failed (%s), returning original", e)
        return image_bytes


# ── Yandex size limit ────────────────────────────────────────────────────────

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
