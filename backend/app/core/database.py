"""
Database configuration and session management for NEXUS PULSE.
Supports SQLAlchemy 2.0 async engine with PostgreSQL (asyncpg) and SQLite (aiosqlite).
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings
from app.core.logging import logger

from sqlalchemy import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.
    Uses PostgreSQL's native UUID type, otherwise CHAR(36) for SQLite.
    Always accepts and returns string values in Python.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)

Base = declarative_base()

# Engine configuration
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args: dict = {}
if is_sqlite:
    connect_args = {"check_same_thread": False}
elif "supabase.com" in settings.DATABASE_URL or settings.APP_ENV == "production":
    # Supabase pooler presents a chain Python 3.14 rejects as self-signed.
    # Encrypt the connection without failing the handshake on that chain.
    import ssl

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl": ssl_context}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
    pool_pre_ping=True,
)

if is_sqlite:
    from sqlalchemy import event

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing transactional database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes tables for local sqlite/test runs if not using remote postgres."""
    async with engine.begin() as conn:
        # Import all models to ensure they are registered with Base.metadata
        import app.models  # noqa
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas initialized.")

