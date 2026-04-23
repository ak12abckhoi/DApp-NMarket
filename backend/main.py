import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api import listings, stats, activity, nfts
# import models so init_db creates all tables
import app.models.listing        # noqa: F401
import app.models.activity       # noqa: F401
import app.models.indexer_state  # noqa: F401


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    asyncio.create_task(start_indexer())
    yield


async def start_indexer():
    try:
        from app.indexer.listener import run_indexer
        await run_indexer()
    except Exception as e:
        print(f"[INDEXER] Failed to start: {e}")


app = FastAPI(title="NFT Marketplace API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings.router)
app.include_router(stats.router)
app.include_router(activity.router)
app.include_router(nfts.router)


@app.get("/")
async def root():
    return {"message": "NFT Marketplace API", "version": "1.0.0"}


@app.get("/debug/rpc")
async def debug_rpc():
    from app.services.rpc import rpc_call, get_block_number
    from app.core.config import settings
    block = await get_block_number()
    code = await rpc_call("eth_getCode", [settings.NFT_MARKETPLACE, "latest"])
    raw = await rpc_call("eth_call", [{
        "to": settings.NFT_MARKETPLACE,
        "data": "0xc78b616c"
    }, "latest"])
    return {
        "block": block,
        "raw": raw,
        "code_length": len(code) if code else 0,
        "marketplace": settings.NFT_MARKETPLACE
    }
