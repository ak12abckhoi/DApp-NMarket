from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.models.activity import NFTActivity

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("/{address}")
async def get_activity(
    address: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    addr = address.lower()
    query = (
        select(NFTActivity)
        .where(NFTActivity.user_address == addr)
        .order_by(desc(NFTActivity.block_number))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "address": addr,
        "activities": [
            {
                "id":           a.id,
                "action":       a.action,
                "token_id":     a.token_id,
                "nft_contract": a.nft_contract,
                "price":        a.price,
                "listing_id":   a.listing_id,
                "tx_hash":      a.tx_hash,
                "block_number": a.block_number,
            }
            for a in items
        ],
        "total": len(items),
    }
