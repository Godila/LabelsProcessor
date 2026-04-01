from fastapi import APIRouter
from app.dependencies import iam_manager

router = APIRouter()


@router.get("/health")
async def health():
    token_valid = iam_manager._token is not None and not iam_manager._is_expiring_soon()
    return {"status": "ok", "iam_token_valid": token_valid}
