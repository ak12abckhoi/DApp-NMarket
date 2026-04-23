import asyncio
import httpx
from sqlalchemy import delete
from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.listing import Listing
from app.models.activity import NFTActivity
from app.models.indexer_state import IndexerState
from app.indexer.handlers import (
    handle_minted, handle_listed, handle_sale,
    handle_bid, handle_cancelled, handle_settled,
)

MARKETPLACE_EVENTS = {
    "0x6b80181ea62ee2c8c297f02b357cd29ba27b3aa019e7a116e5d817b8386cf6a1": "Listed",
    "0xc0e076a004e59b819c1099b4799386d7feaa928662e5f3f95af4db1a1502520d": "Sale",
    "0x0e54eff26401bf69b81b26f60bd85ef47f5d85275c1d268d84f68d6897431c47": "BidPlaced",
    "0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99": "AuctionSettled",
    "0x411aee90354c51b1b04cd563fcab2617142a9d50da19232d888547c8a1b7fd8a": "ListingCancelled",
}

# keccak256("Minted(address,uint256,string)")
MINTED_SIG    = "0xe7cd4ce7f2a465edc730269a1305e8a48bad821e8fb7e152ec413829c01a53c4"
COLLECTION_EVENTS = {MINTED_SIG: "Minted"}


# ── RPC helpers ──────────────────────────────────────────────────────────────

async def _rpc(method: str, params: list) -> any:
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.post(settings.RPC_URL, json={
            "jsonrpc": "2.0", "method": method, "params": params, "id": 1
        })
        return res.json().get("result")


async def get_block_number() -> int:
    r = await _rpc("eth_blockNumber", [])
    return int(r, 16) if r else 0


async def get_logs(address: str, from_block: int, to_block: int) -> list:
    r = await _rpc("eth_getLogs", [{
        "address": address,
        "fromBlock": hex(from_block),
        "toBlock": hex(to_block),
    }])
    return r or []


# ── State helpers ────────────────────────────────────────────────────────────

async def _get_last_block(db) -> int:
    from sqlalchemy import select
    row = (await db.execute(select(IndexerState).where(IndexerState.id == 1))).scalar_one_or_none()
    return row.last_block if row else 0


async def _set_last_block(db, block: int):
    from sqlalchemy import select
    row = (await db.execute(select(IndexerState).where(IndexerState.id == 1))).scalar_one_or_none()
    if row:
        row.last_block = block
    else:
        db.add(IndexerState(id=1, last_block=block))
    await db.commit()


async def _clear_db(db):
    """Wipe indexed data when chain has been reset."""
    await db.execute(delete(Listing))
    await db.execute(delete(NFTActivity))
    await db.execute(delete(IndexerState))
    await db.commit()
    print("[INDEXER] Chain reset detected — DB cleared, resyncing from block 0")


# ── Log processors ───────────────────────────────────────────────────────────

async def process_marketplace_log(log: dict, db):
    topics = log.get("topics", [])
    if not topics or len(topics) < 2:
        return
    event = MARKETPLACE_EVENTS.get(topics[0])
    if not event:
        return
    listing_id = int(topics[1], 16)
    print(f"[INDEXER] {event} listingId={listing_id}")
    if event == "Listed":            await handle_listed(listing_id, log, db)
    elif event == "Sale":            await handle_sale(listing_id, log, db)
    elif event == "BidPlaced":       await handle_bid(listing_id, log, db)
    elif event == "ListingCancelled":await handle_cancelled(listing_id, log, db)
    elif event == "AuctionSettled":  await handle_settled(listing_id, log, db)


async def process_collection_log(log: dict, db):
    topics = log.get("topics", [])
    if not topics:
        return
    if COLLECTION_EVENTS.get(topics[0]) == "Minted":
        await handle_minted(log, db)


# ── Main loop ────────────────────────────────────────────────────────────────

CHUNK = 500   # blocks per batch when catching up


async def run_indexer():
    print("[INDEXER] Starting...")
    while True:
        try:
            current = await get_block_number()
            async with AsyncSessionLocal() as db:
                last = await _get_last_block(db)

                # Chain was reset (e.g. hardhat restarted without --state)
                if last > current:
                    await _clear_db(db)
                    last = 0

                if current <= last:
                    await asyncio.sleep(3)
                    continue

                # Process in chunks to avoid huge requests
                from_b = last + 1
                while from_b <= current:
                    to_b = min(from_b + CHUNK - 1, current)

                    mp_logs  = await get_logs(settings.NFT_MARKETPLACE, from_b, to_b)
                    col_logs = await get_logs(settings.NFT_COLLECTION, from_b, to_b) \
                               if settings.NFT_COLLECTION else []

                    if mp_logs or col_logs:
                        async with AsyncSessionLocal() as db2:
                            for log in mp_logs:
                                await process_marketplace_log(log, db2)
                            for log in col_logs:
                                await process_collection_log(log, db2)

                    # Save progress after each chunk
                    async with AsyncSessionLocal() as db3:
                        await _set_last_block(db3, to_b)

                    from_b = to_b + 1

        except Exception as e:
            print(f"[INDEXER] Error: {e}")

        await asyncio.sleep(3)
