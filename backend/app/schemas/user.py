from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


# Base Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["peternak_makmur"])
    nama_user: str = Field(..., min_length=2, max_length=100, examples=["Budi Santoso"])
    nama_peternakan: Optional[str] = Field(None, max_length=100, examples=["Makmur Farm"])
    alamat: Optional[str] = Field(None, examples=["Jl. Raya Bogor KM 30"])
    no_telp: Optional[str] = Field(None, max_length=20, examples=["081234567890"])


# Request Schemas
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100, examples=["PasswordAman123!"])


class UserLogin(BaseModel):
    username: str = Field(..., examples=["peternak_makmur"])
    password: str = Field(..., examples=["PasswordAman123!"])


# Response Schemas
class UserResponse(UserBase):
    id_user: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegisterData(BaseModel):
    id_user: int
    username: str
    nama_peternakan: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    status: str = "success"
    message: str = "Pendaftaran berhasil"
    data: UserRegisterData


class UserLoginData(BaseModel):
    id_user: int
    username: str
    nama_user: str
    nama_peternakan: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserLoginData


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
