import httpx
from app.core.config import settings

GATEWAY = getattr(settings, "PINATA_GATEWAY", "https://gateway.pinata.cloud/ipfs")

def resolve_ipfs(uri: str) -> str:
    if not uri:
        return ""
    if uri.startswith("ipfs://"):
        return f"{GATEWAY}/{uri.replace('ipfs://', '')}"
    return uri

async def fetch_metadata(token_uri: str) -> dict | None:
    try:
        url = resolve_ipfs(token_uri)
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
            if res.status_code == 200:
                return res.json()
    except Exception as e:
        print(f"[IPFS] fetch_metadata error: {e}")
    return None