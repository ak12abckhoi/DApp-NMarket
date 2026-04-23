import httpx
from app.core.config import settings

async def rpc_call(method: str, params: list = []):
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.post(settings.RPC_URL, json={
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        })
        data = res.json()
        return data.get("result")

async def get_block_number() -> int:
    result = await rpc_call("eth_blockNumber")
    return int(result, 16) if result else 0

async def get_total_listings() -> int:
    result = await rpc_call("eth_call", [{
        "to": settings.NFT_MARKETPLACE,
        "data": "0xc78b616c"
    }, "latest"])
    print(f"[DEBUG] totalListings raw result: {result}")
    return int(result, 16) if result and result != "0x" else 0

def _decode_abi_string(hex_data: str) -> str:
    """Decode ABI-encoded string returned by eth_call."""
    data = hex_data[2:] if hex_data.startswith("0x") else hex_data
    if len(data) < 128:
        return ""
    try:
        length = int(data[64:128], 16)
        string_hex = data[128: 128 + length * 2]
        return bytes.fromhex(string_hex).decode("utf-8", errors="replace")
    except Exception:
        return ""


async def get_nft_total_supply(nft_contract: str) -> int:
    """totalSupply() → nextTokenId on NFTCollection."""
    result = await rpc_call("eth_call", [{"to": nft_contract, "data": "0x18160ddd"}, "latest"])
    return int(result, 16) if result and result != "0x" else 0


async def get_owner_of(nft_contract: str, token_id: int) -> str:
    """ownerOf(uint256) → address."""
    padded = hex(token_id)[2:].zfill(64)
    result = await rpc_call("eth_call", [{"to": nft_contract, "data": "0x6352211e" + padded}, "latest"])
    if not result or result == "0x" or len(result) < 42:
        return ""
    return ("0x" + result[-40:]).lower()


async def get_token_uri(nft_contract: str, token_id: int) -> str:
    """tokenURI(uint256) → string."""
    padded = hex(token_id)[2:].zfill(64)
    result = await rpc_call("eth_call", [{"to": nft_contract, "data": "0xc87b56dd" + padded}, "latest"])
    if not result or result == "0x":
        return ""
    return _decode_abi_string(result)


async def get_listing(listing_id: int) -> dict | None:
    # selector của getListing(uint256)
    padded = hex(listing_id)[2:].zfill(64)
    result = await rpc_call("eth_call", [{
        "to": settings.NFT_MARKETPLACE,
        "data": "0x107a274a" + padded
    }, "latest"])

    if not result or result == "0x":
        return None

    data = result[2:]
    chunks = [data[i:i+64] for i in range(0, len(data), 64)]
    if len(chunks) < 10:
        return None

    return {
        "listing_id":     int(chunks[0], 16),
        "nft_contract":   "0x" + chunks[1][-40:],
        "token_id":       int(chunks[2], 16),
        "seller":         "0x" + chunks[3][-40:],
        "price":          str(int(chunks[4], 16)),
        "end_time":       int(chunks[5], 16),
        "highest_bidder": "0x" + chunks[6][-40:],
        "highest_bid":    str(int(chunks[7], 16)),
        "listing_type":   int(chunks[8], 16),
        "status":         int(chunks[9], 16),
    }
