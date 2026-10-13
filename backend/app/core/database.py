from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Dual-driver: asyncpg for postgres, aiosqlite for sqlite
_engine_kwargs = {"echo": False}
if not settings.is_postgres:
    # SQLite needs check_same_thread=False
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
AsyncSessionLocal = async_session  # alias


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create tables if not using Alembic (dev mode) and apply lightweight migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Lightweight migration: add pixel_id column + backfill if missing (SQLite-safe)
    from sqlalchemy import text
    from app.models.user import User, _gen_pixel_id
    async with engine.begin() as conn:
        try:
            cols = await conn.exec_driver_sql("PRAGMA table_info(users)")
            col_names = [row[1] for row in cols.fetchall()]
            if "pixel_id" not in col_names:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN pixel_id VARCHAR")
                await conn.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_pixel_id ON users(pixel_id)")
        except Exception:
            pass  # postgres or other; assume Alembic handles it

    # Backfill any users missing a pixel_id
    async with async_session() as db:
        from sqlalchemy import select
        r = await db.execute(select(User).where((User.pixel_id == None) | (User.pixel_id == "")))
        for u in r.scalars().all():
            u.pixel_id = _gen_pixel_id()
        await db.commit()
