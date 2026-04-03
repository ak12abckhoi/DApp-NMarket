import asyncio
import httpx
from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.indexer.handlers import handle_listed, handle_sale, handle_bid, handle_cancelled, handle_settled

# Event signatures tính bằng keccak256 từ ABI thực tế
EVENTS = {
    "0x6b80181ea62ee2c8c297f02b357cd29ba27b3aa019e7a116e5d817b8386cf6a1": "Listed",
    "0xc0e076a004e59b819c1099b4799386d7feaa928662e5f3f95af4db1a1502520d": "Sale",
    "0x0e54eff26401bf69b81b26f60bd85ef47f5d85275c1d268d84f68d6897431c47": "BidPlaced",
    "0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99": "AuctionSettled",
    "0x411aee90354c51b1b04cd563fcab2617142a9d50da19232d888547c8a1b7fd8a": "ListingCancelled",
}

async def get_logs(from_block: int, to_block: int) -> list:
    async with httpx.AsyncClient() as client:
        res = await client.post(settings.RPC_URL, json={
            "jsonrpc": "2.0",
            "method": "eth_getLogs",
            "params": [{
                "address": settings.NFT_MARKETPLACE,
                "fromBlock": hex(from_block),
                "toBlock": hex(to_block),
            }],
            "id": 1
        })
        return res.json().get("result", [])

async def get_block_number() -> int:
    async with httpx.AsyncClient() as client:
        res = await client.post(settings.RPC_URL, json={
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": 1
        })
        result = res.json().get("result", "0x0")
        return int(result, 16)

async def process_log(log: dict, db):
    topics = log.get("topics", [])
    if not topics:
        return
    sig   = topics[0]
    event = EVENTS.get(sig)
    if not event:
        return

    # listingId luôn là indexed param đầu tiên → topics[1]
    if len(topics) < 2:
        return
    listing_id = int(topics[1], 16)
    print(f"[INDEXER] Event: {event} listingId={listing_id}")

    if event == "Listed":
        await handle_listed(listing_id, db)
    elif event == "Sale":
        await handle_sale(listing_id, db)
    elif event == "BidPlaced":
        await handle_bid(listing_id, db)
    elif event == "ListingCancelled":
        await handle_cancelled(listing_id, db)
    elif event == "AuctionSettled":
        await handle_settled(listing_id, db)

async def run_indexer():
    print("[INDEXER] Starting event listener...")
    last_block = max(0, await get_block_number() - 1)
    while True:
        try:
            current = await get_block_number()
            if current > last_block:
                logs = await get_logs(last_block + 1, current)
                if logs:
                    async with AsyncSessionLocal() as db:
                        for log in logs:
                            await process_log(log, db)
                last_block = current
        except Exception as e:
            print(f"[INDEXER] Error: {e}")
        await asyncio.sleep(3)