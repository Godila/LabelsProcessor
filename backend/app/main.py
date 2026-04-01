import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.dependencies import iam_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — refreshing IAM token")
    try:
        await iam_manager.start_background_refresh()
        logger.info("IAM token ready")
    except Exception as e:
        logger.error("IAM token refresh failed at startup (will retry on first request): %s", e)
    yield
    logger.info("Shutting down")


app = FastAPI(title="X5 Label Checker", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
