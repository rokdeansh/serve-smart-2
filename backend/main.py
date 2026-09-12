"""Application entry point: starts FastAPI and connects all route files."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import close_database, connect_database, is_database_connected
from routes import auth, favorites, recipes

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Connect to MongoDB when the server starts; close it when it stops."""
    connect_database()
    yield
    close_database()


app = FastAPI(title="ServeSmart API", lifespan=lifespan)

# Allows the browser frontend to make API requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    """Keep the old Express `{ message: ... }` error format for the frontend."""
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, __: RequestValidationError):
    return JSONResponse(status_code=422, content={"message": "Invalid request data"})


# These lines attach each separate route file to the application.
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["Recipes"])


@app.get("/health")
def health():
    """Check whether the app and MongoDB connection are available."""
    return {"status": "ok", "database": is_database_connected()}


# This must be last. It serves frontend/index.html at / and the other frontend files.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
