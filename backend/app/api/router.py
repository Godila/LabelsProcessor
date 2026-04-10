from fastapi import APIRouter
from app.api import health, labels, debug

router = APIRouter(prefix="/api")
router.include_router(health.router)
router.include_router(labels.router)
router.include_router(debug.router)
