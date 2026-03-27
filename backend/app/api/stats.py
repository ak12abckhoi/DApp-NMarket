from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.models.listing import Listing
from app.services.rpc import get_total_listings, get_block_number

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_listings = await get_total_listings()
    block_number   = await get_block_number()

    active = await db.execute(
        select(func.count()).where(Listing.status == 0)
    )
    sold = await db.execute(
        select(func.count()).where(Listing.status == 1)
    )

    return {
        "total_listings": total_listings,
        "active_listings": active.scalar(),
        "sold_listings": sold.scalar(),
        "block_number": block_number,
        "platform_fee": "2.5%",
        "network": "Hardhat Local"
    }