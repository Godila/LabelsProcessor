import io

import pdfplumber
from PIL import Image


def pdf_to_jpeg(pdf_bytes: bytes, dpi: int = 150) -> bytes:
    """Extract first page of PDF and convert to JPEG bytes."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        if not pdf.pages:
            raise ValueError("PDF has no pages")
        page = pdf.pages[0]
        # pdfplumber uses points (72dpi); scale to target dpi
        scale = dpi / 72.0
        img = page.to_image(resolution=dpi)
        pil_img = img.original
        if pil_img.mode in ("RGBA", "P"):
            pil_img = pil_img.convert("RGB")
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=90, optimize=True)
        return buf.getvalue()
