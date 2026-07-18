from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from database import users_col
from models.schemas import UserRegister, UserLogin, TokenResponse, UserOut
from services.auth_service import hash_password, verify_password, create_token, decode_token
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = users_col.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def fmt_user(u: dict) -> UserOut:
    return UserOut(
        id=str(u["_id"]),
        name=u["name"],
        email=u["email"],
        grade=u["grade"],
        created_at=u["created_at"],
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: UserRegister):
    if users_col.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    user_doc = {
        "name":       body.name,
        "email":      body.email.lower(),
        "password":   hash_password(body.password),
        "grade":      body.grade,
        "created_at": datetime.utcnow(),
    }
    result = users_col.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_token({"sub": str(result.inserted_id)})
    return TokenResponse(access_token=token, user=fmt_user(user_doc))


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    user = users_col.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=fmt_user(user))


@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return fmt_user(current_user)


@router.put("/me/grade")
def update_grade(grade: str, current_user=Depends(get_current_user)):
    users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"grade": grade}}
    )
    return {"message": "Grade updated"}
