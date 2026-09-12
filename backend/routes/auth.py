"""Registration and login endpoints."""

import bcrypt
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError, PyMongoError

from database import get_database
from schemas import LoginRequest, RegisterRequest

router = APIRouter()


@router.post("/register")
def register(payload: RegisterRequest):
    """Create a new user with a securely hashed password."""
    try:
        password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
        get_database().users.insert_one({
            "username": payload.username.strip(),
            "email": payload.email.lower(),
            "password": password_hash,
            "isVerified": True,
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except PyMongoError:
        raise HTTPException(status_code=500, detail="Registration failed")
    return {"message": "Registration successful"}


@router.post("/login")
def login(payload: LoginRequest):
    """Check credentials and return the user id required by the frontend."""
    try:
        user = get_database().users.find_one({"email": payload.email.lower()})
    except PyMongoError:
        raise HTTPException(status_code=500, detail="Login failed")
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.checkpw(payload.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Wrong password")
    return {"message": "Login success", "userId": str(user["_id"]), "username": user["username"]}
