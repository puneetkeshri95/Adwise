from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
        company=payload.company,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/pixel-snippet")
async def pixel_snippet(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return the HTML snippet this user should embed on their site."""
    # Lazy-generate if missing (legacy users)
    if not current_user.pixel_id:
        from app.models.user import _gen_pixel_id
        current_user.pixel_id = _gen_pixel_id()
        await db.commit()
        await db.refresh(current_user)

    base = str(request.base_url).rstrip("/")
    pid = current_user.pixel_id
    snippet = (
        f'<script>\n'
        f'  !function(){{var n=window.namyah=function(){{(n.q=n.q||[]).push(arguments)}};\n'
        f'    var s=document.createElement("script");\n'
        f'    s.src="{base}/api/pixel/namyah.js?id={pid}";\n'
        f'    s.async=true;document.head.appendChild(s);\n'
        f'  }}();\n'
        f'  namyah("init","{pid}");\n'
        f'</script>'
    )
    return {
        "pixel_id": pid,
        "snippet": snippet,
        "js_url": f"{base}/api/pixel/namyah.js?id={pid}",
        "gif_url": f"{base}/api/pixel/p.gif?id={pid}",
    }
