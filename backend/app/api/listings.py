from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.listing import Listing
from app.services.rpc import get_total_listings, get_listing

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("/")
async def list_listings(
    status: int = Query(0, description="0=active, 1=sold, 2=cancelled"),
    listing_type: int = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Listing).where(Listing.status == status)
    if listing_type is not None:
        query = query.where(Listing.listing_type == listing_type)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    listings = result.scalars().all()
    return {"listings": [l.__dict__ for l in listings], "total": len(listings)}

@router.get("/sync")
async def sync_listings(db: AsyncSession = Depends(get_db)):
    total = await get_total_listings()
    synced = 0
    for i in range(total):
        data = await get_listing(i)
        if not data:
            continue
        existing = await db.execute(
            select(Listing).where(Listing.listing_id == i)
        )
        listing = existing.scalar_one_or_none()
        if listing:
            for k, v in data.items():
                setattr(listing, k, v)
        else:
            db.add(Listing(**data))
        synced += 1
    await db.commit()
    return {"synced": synced, "total": total}

@router.get("/{listing_id}")
async def get_listing_by_id(listing_id: int, db: AsyncSession = Depends(get_db)):
    data = await get_listing(listing_id)
    if not data:
        return {"error": "Not found"}
    return data