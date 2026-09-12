"""Validation models for data sent from the frontend."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class FavoriteRequest(BaseModel):
    userId: str = Field(min_length=1)
    mealId: str = Field(min_length=1)
    mealName: str | None = None
    mealImage: str | None = None
