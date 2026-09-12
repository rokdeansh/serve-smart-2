"""Recipe endpoints that request data from TheMealDB."""

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

MEAL_DB_URL = "https://www.themealdb.com/api/json/v1/1"
router = APIRouter()


async def meal_db_request(endpoint: str, parameter: str, value: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{MEAL_DB_URL}/{endpoint}", params={parameter: value})
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=500, detail="Recipe service request failed")


@router.get("/search/{name}")
async def search_recipes(name: str):
    return await meal_db_request("search.php", "s", name)


@router.get("/detail/{meal_id}")
async def recipe_detail(meal_id: str):
    return await meal_db_request("lookup.php", "i", meal_id)


@router.get("/area/{area}")
async def recipes_by_area(area: str):
    return await meal_db_request("filter.php", "a", area)


@router.get("/category/{category}")
async def recipes_by_category(category: str):
    return await meal_db_request("filter.php", "c", category)
