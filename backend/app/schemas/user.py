from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# Base Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["peternak_makmur"])
    nama_user: str = Field(..., min_length=2, max_length=100, examples=["Budi Santoso"])
    nama_peternakan: Optional[str] = Field(None, max_length=100, examples=["Makmur Farm"])
    alamat: Optional[str] = Field(None, examples=["Jl. Raya Bogor KM 30"])
    no_telp: Optional[str] = Field(None, max_length=20, examples=["081234567890"])

    @field_validator("username", "nama_user", mode="before")
    @classmethod
    def strip_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v


# Request Schemas
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100, examples=["PasswordAman123!"])
    email: Optional[str] = Field(None, description="Email alternatif atau username fallback")

    @model_validator(mode="before")
    @classmethod
    def handle_username_and_email(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Jika username tidak disediakan namun email ada, gunakan email sebagai username
            raw_username = values.get("username")
            raw_email = values.get("email")
            if not raw_username and raw_email:
                values["username"] = str(raw_email).strip()
            elif raw_username:
                values["username"] = str(raw_username).strip()
        return values


class UserLogin(BaseModel):
    username: str = Field(..., examples=["peternak_makmur"])
    password: str = Field(..., examples=["PasswordAman123!"])


class UserUpdate(BaseModel):
    nama_user: Optional[str] = Field(None, min_length=2, max_length=100, examples=["Budi Santoso"])
    nama_peternakan: Optional[str] = Field(None, max_length=100, examples=["Makmur Farm"])
    alamat: Optional[str] = Field(None, examples=["Jl. Raya Bogor KM 30"])
    no_telp: Optional[str] = Field(None, max_length=20, examples=["081234567890"])

    @field_validator("nama_user", "nama_peternakan", "alamat", "no_telp", mode="before")
    @classmethod
    def strip_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


# Response Schemas
class UserResponse(UserBase):
    id_user: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegisterData(BaseModel):
    id_user: int
    username: str
    nama_user: str
    nama_peternakan: Optional[str] = None
    alamat: Optional[str] = None
    no_telp: Optional[str] = None
    created_at: Optional[datetime] = None

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
