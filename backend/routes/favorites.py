"""Saved recipe endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError, PyMongoError

from database import get_database
from schemas import FavoriteRequest

router = APIRouter()


@router.post("/add")
def add_favorite(payload: FavoriteRequest):
    try:
        get_database().favorites.insert_one(payload.model_dump())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Already in favorites")
    except PyMongoError:
        raise HTTPException(status_code=500, detail="Failed to add favorite")
    return {"message": "Added to favorites"}


@router.get("/{user_id}")
def get_favorites(user_id: str) -> list[dict[str, Any]]:
    try:
        favorites = list(get_database().favorites.find({"userId": user_id}))
    except PyMongoError:
        raise HTTPException(status_code=500, detail="Failed to load favorites")
    for favorite in favorites:
        favorite["_id"] = str(favorite["_id"])
    return favorites


@router.delete("/{user_id}/{meal_id}")
def delete_favorite(user_id: str, meal_id: str):
    try:
        get_database().favorites.delete_one({"userId": user_id, "mealId": meal_id})
    except PyMongoError:
        raise HTTPException(status_code=500, detail="Failed to remove favorite")
    return {"message": "Removed from favorites"}
