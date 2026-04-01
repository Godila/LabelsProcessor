import io
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.models.response import (
    AnalysisResult, ConfidenceInfo, LabelFields, OCRResult, PhotoQuality
)


def make_jpeg_bytes(w=100, h=100) -> bytes:
    img = Image.new("RGB", (w, h), color=(180, 120, 60))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


MOCK_RESULT = AnalysisResult(
    ocr=OCRResult(full_text="Тест", lines=[], avg_confidence=0.99),
    image_width=100,
    image_height=100,
    photo_quality=PhotoQuality(ok=True, issues=[]),
    category_detected="Тестовая категория",
    fields=LabelFields(product_name="Тест продукт"),
    violations=[],
    confidence=ConfidenceInfo(overall=0.95, low_confidence_fields=[]),
)


@pytest.fixture
def client():
    with patch("app.dependencies.iam_manager.start_background_refresh", new_callable=AsyncMock):
        with patch("app.dependencies.pipeline.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = MOCK_RESULT
            with TestClient(app) as c:
                yield c, mock_run


def test_health(client):
    c, _ = client
    resp = c.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "iam_token_valid" in data


def test_analyze_success(client):
    c, mock_run = client
    jpeg = make_jpeg_bytes()
    resp = c.post(
        "/api/analyze",
        files={"file": ("test.jpg", jpeg, "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["category_detected"] == "Тестовая категория"
    assert data["fields"]["product_name"] == "Тест продукт"
    mock_run.assert_called_once()


def test_analyze_unsupported_mime(client):
    c, _ = client
    resp = c.post(
        "/api/analyze",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 415


def test_analyze_too_large(client):
    c, _ = client
    big = b"x" * (21 * 1024 * 1024)
    resp = c.post(
        "/api/analyze",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert resp.status_code == 413
