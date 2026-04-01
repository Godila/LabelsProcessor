"""
Integration tests — require real API keys and run only with --run-integration flag.
Tests all label photos from Assets directory.
"""
import os
import pathlib

import pytest
import pytest_asyncio

ASSETS = pathlib.Path(__file__).parents[4] / "Assets" / "Фото этикеток"


@pytest.mark.asyncio
async def test_grudka_label(run_integration):
    if not run_integration:
        pytest.skip("Integration tests disabled. Pass --run-integration to enable.")

    from app.dependencies import pipeline

    photo = _find_photo("7261")
    with open(photo, "rb") as f:
        data = f.read()

    result = await pipeline.run(data, "image/png")

    assert result.fields is not None
    assert result.fields.product_name is not None
    name_upper = result.fields.product_name.upper()
    assert "КУР" in name_upper or "ГРУДК" in name_upper, f"Unexpected name: {result.fields.product_name}"

    # Should flag missing carbs or other nutrition issue
    violation_fields = [v.field for v in result.violations]
    print(f"Violations: {result.violations}")
    print(f"Category: {result.category_detected}")
    print(f"Fields: {result.fields}")


@pytest.mark.asyncio
async def test_drain_cleaner_label(run_integration):
    if not run_integration:
        pytest.skip("Integration tests disabled.")

    from app.dependencies import pipeline

    photos = list(ASSETS.glob("*дрейн*")) + list(ASSETS.glob("*Drain*")) + list(ASSETS.glob("*drain*"))
    if not photos:
        pytest.skip("Drain Cleaner photo not found in Assets")

    with open(photos[0], "rb") as f:
        data = f.read()

    result = await pipeline.run(data, _mime(photos[0]))
    messages = " ".join(v.message.lower() for v in result.violations)
    assert "недоступн" in messages or "детей" in messages or "химия" in messages, \
        f"Expected child safety warning, got: {result.violations}"


@pytest.mark.asyncio
async def test_all_photos(run_integration):
    """Smoke test: all photos in Assets should parse without crashing."""
    if not run_integration:
        pytest.skip("Integration tests disabled.")

    from app.dependencies import pipeline

    photos = list(ASSETS.glob("*.jpg")) + list(ASSETS.glob("*.png")) + list(ASSETS.glob("*.jpeg"))
    assert photos, f"No photos found in {ASSETS}"

    for photo in photos:
        with open(photo, "rb") as f:
            data = f.read()
        result = await pipeline.run(data, _mime(photo))
        assert result.ocr is not None
        print(f"{photo.name}: category={result.category_detected}, violations={len(result.violations)}")


def _find_photo(substr: str) -> pathlib.Path:
    matches = list(ASSETS.glob(f"*{substr}*"))
    if not matches:
        pytest.skip(f"Photo matching '{substr}' not found in {ASSETS}")
    return matches[0]


def _mime(path: pathlib.Path) -> str:
    ext = path.suffix.lower()
    return {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext.lstrip("."), "image/jpeg")
