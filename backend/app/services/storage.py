"""Media storage helpers for NEXUS PULSE.

Prefer Supabase Storage when a service-role key is configured so flyers
survive ephemeral API disks (Render) and stay on the same project as
Postgres. Fall back to local disk for offline development.
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging import logger


async def store_flyer_image(data: bytes, content_type: str, extension: str, prefix: str = "review") -> str:
    """Persist a flyer and return a public URL or local static path."""
    fname = f"{prefix}_{uuid.uuid4().hex[:12]}{extension}"
    remote = await _upload_supabase_flyer(data, content_type, fname)
    if remote:
        return remote
    return _store_local_flyer(data, fname)


async def _upload_supabase_flyer(data: bytes, content_type: str, fname: str) -> Optional[str]:
    key = (settings.SUPABASE_SERVICE_ROLE_KEY or "").strip()
    base = (settings.SUPABASE_URL or "").rstrip("/")
    bucket = settings.STORAGE_FLYERS_BUCKET
    if not key or not base:
        return None

    object_path = f"opportunities/{fname}"
    url = f"{base}/storage/v1/object/{bucket}/{object_path}"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, content=data, headers=headers)
        if resp.status_code not in (200, 201):
            logger.warning(
                "Supabase flyer upload failed (%s): %s",
                resp.status_code,
                resp.text[:300],
            )
            return None
        return f"{base}/storage/v1/object/public/{bucket}/{object_path}"
    except Exception as exc:
        logger.warning("Supabase flyer upload error: %s", exc)
        return None


def _store_local_flyer(data: bytes, fname: str) -> str:
    flyer_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "flyers")
    os.makedirs(flyer_dir, exist_ok=True)
    with open(os.path.join(flyer_dir, fname), "wb") as handle:
        handle.write(data)
    return f"/static/uploads/flyers/{fname}"
