"""MongoDB connection and collection helpers."""

import os

from fastapi import HTTPException
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "servesmart")
_client: MongoClient | None = None


def connect_database() -> None:
    """Connect to MongoDB and create the indexes required by the app."""
    global _client
    try:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")
        db = _client[DATABASE_NAME]
        db.users.create_index("email", unique=True)
        db.favorites.create_index([("userId", ASCENDING), ("mealId", ASCENDING)], unique=True)
        print("MongoDB connected")
    except PyMongoError as error:
        _client = None
        print(f"MongoDB connection failed: {error}")


def get_database():
    if _client is None:
        raise HTTPException(status_code=503, detail="Database is unavailable")
    return _client[DATABASE_NAME]


def is_database_connected() -> bool:
    return _client is not None


def close_database() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
