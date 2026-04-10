from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from jose import jwt, JWTError
import hashlib
import secrets
from typing import Optional

from config import settings
from models.request_models import LoginRequest, RegisterRequest, PasswordResetRequest
from models.response_models import LoginResponse, UserInfo, RegisterResponse, ErrorResponse
from database import execute_query, get_pool

router = APIRouter(prefix="/api/auth", tags=["认证"])


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${hashed.hex()}"


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, stored_hash = hashed.split('$')
        computed = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt.encode('utf-8'), 100000)
        return computed.hex() == stored_hash
    except Exception:
        return False


_memory_users = {}


def _create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def _get_user_by_email(email: str) -> Optional[dict]:
    pool = await get_pool()
    if pool:
        result = await execute_query(
            "SELECT * FROM users WHERE email = %s AND is_active = 1",
            (email,),
            fetch="one",
        )
        return result
    return _memory_users.get(email)


async def _create_user(name: str, email: str, password: str, plan: str = "免费版") -> dict:
    password_hash = _hash_password(password)
    pool = await get_pool()
    if pool:
        await execute_query(
            "INSERT INTO users (name, email, password_hash, plan) VALUES (%s, %s, %s, %s)",
            (name, email, password_hash, plan),
            fetch="none",
        )
        return {"name": name, "email": email, "plan": plan, "api_key": "", "model_name": ""}
    else:
        _memory_users[email] = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "plan": plan,
            "api_key": "",
            "model_name": "",
        }
        return {"name": name, "email": email, "plan": plan, "api_key": "", "model_name": ""}


@router.post("/login", response_model=LoginResponse, responses={401: {"model": ErrorResponse}})
async def login(req: LoginRequest):
    user = await _get_user_by_email(req.email)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": 401, "message": "认证失败", "detail": "邮箱或密码错误"},
        )

    stored_hash = user.get("password_hash", "")
    if not stored_hash:
        stored_hash = user.get("password", "")

    if not _verify_password(req.password, stored_hash):
        raise HTTPException(
            status_code=401,
            detail={"code": 401, "message": "认证失败", "detail": "邮箱或密码错误"},
        )

    token = _create_access_token({"sub": req.email, "name": user.get("name", "")})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserInfo(
            name=user.get("name", ""),
            email=user.get("email", req.email),
            plan=user.get("plan", "免费版"),
        ),
    )


@router.post("/register", response_model=RegisterResponse, responses={400: {"model": ErrorResponse}})
async def register(req: RegisterRequest):
    existing = await _get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "注册失败", "detail": "该邮箱已被注册"},
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "注册失败", "detail": "密码长度不能少于6位"},
        )

    user = await _create_user(req.name, req.email, req.password)
    return RegisterResponse(
        message="注册成功",
        user=UserInfo(name=user["name"], email=user["email"], plan=user["plan"]),
    )


@router.post("/reset-password", responses={400: {"model": ErrorResponse}, 200: {"model": dict}})
async def reset_password(req: PasswordResetRequest):
    user = await _get_user_by_email(req.email)
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": "重置失败", "detail": "该邮箱未注册"},
        )

    new_hash = _hash_password(req.new_password)
    pool = await get_pool()
    if pool:
        await execute_query(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (new_hash, req.email),
            fetch="none",
        )
    else:
        user["password_hash"] = new_hash

    return {"message": "密码重置成功"}


@router.get("/me", response_model=UserInfo, responses={401: {"model": ErrorResponse}})
async def get_current_user(token: str = ""):
    if not token:
        raise HTTPException(status_code=401, detail={"code": 401, "message": "未提供认证令牌", "detail": ""})

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail={"code": 401, "message": "令牌无效或已过期", "detail": ""})

    email = payload.get("sub", "")
    user = await _get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail={"code": 401, "message": "用户不存在", "detail": ""})

    return UserInfo(
        name=user.get("name", ""),
        email=user.get("email", email),
        plan=user.get("plan", "免费版"),
    )
