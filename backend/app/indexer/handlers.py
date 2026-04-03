from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.listing import Listing
from app.services.rpc import get_listing

async def handle_listed(listing_id: int, db: AsyncSession):
    data = await get_listing(listing_id)
    if not data:
        return
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        for k, v in data.items():
            setattr(listing, k, v)
    else:
        db.add(Listing(**data))
    await db.commit()
    print(f"[INDEXER] Listed #{listing_id}")

async def handle_sale(listing_id: int, db: AsyncSession):
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.status = 1  # Sold
        await db.commit()
    print(f"[INDEXER] Sold #{listing_id}")

async def handle_bid(listing_id: int, db: AsyncSession):
    data = await get_listing(listing_id)
    if not data:
        return
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.highest_bid    = data["highest_bid"]
        listing.highest_bidder = data["highest_bidder"]
        await db.commit()
    print(f"[INDEXER] Bid on #{listing_id}")

async def handle_cancelled(listing_id: int, db: AsyncSession):
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.status = 2  # Cancelled
        await db.commit()
    print(f"[INDEXER] Cancelled #{listing_id}")

async def handle_settled(listing_id: int, db: AsyncSession):
    # AuctionSettled → status = Sold (1)
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.status = 1  # Sold
        await db.commit()
    print(f"[INDEXER] Settled #{listing_id}")