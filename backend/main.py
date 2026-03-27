from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api import listings, stats
import webbrowser
import threading

app = FastAPI(title="NFT Marketplace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings.router)
app.include_router(stats.router)

@app.on_event("startup")
async def startup():
    await init_db()

@app.get("/")
async def root():
    return {"message": "NFT Marketplace API", "version": "1.0.0"}

@app.get("/debug/rpc")
async def debug_rpc():
    from app.services.rpc import rpc_call, get_total_listings, get_block_number
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

def open_browser():
    webbrowser.open("http://127.0.0.1:8000/docs")

threading.Timer(1.5, open_browser).start()