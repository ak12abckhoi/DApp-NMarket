import asyncio
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.services.rpc import get_nft_total_supply, get_owner_of, get_token_uri, get_total_listings, get_listing

router = APIRouter(prefix="/nfts", tags=["nfts"])


@router.get("/owned/{address}")
async def get_owned_nfts(address: str):
    """
    Trả về NFT thuộc về `address`:
    - Token đang trong ví (ownerOf == address) → chưa list, hiện nút List for Sale
    - Token đang list trên marketplace bởi address (đọc thẳng on-chain) → hiện badge Listed
    """
    nft_contract = settings.NFT_COLLECTION
    if not nft_contract:
        return {"owned": [], "total": 0}

    addr = address.lower()

    # 1. Quét ví: ownerOf(tokenId) == address
    total_supply = await get_nft_total_supply(nft_contract)

    async def check_wallet(token_id: int):
        owner = await get_owner_of(nft_contract, token_id)
        if owner != addr:
            return None
        uri = await get_token_uri(nft_contract, token_id)
        return {
            "token_id":     token_id,
            "token_uri":    uri,
            "nft_contract": nft_contract,
            "listed":       False,
        }

    wallet_results = await asyncio.gather(*[check_wallet(i) for i in range(total_supply)])
    wallet_tokens: dict[int, dict] = {r["token_id"]: r for r in wallet_results if r is not None}

    # 2. Quét marketplace on-chain: listing nào seller == address và còn active
    total_listings = await get_total_listings()

    async def check_listing(listing_id: int):
        lst = await get_listing(listing_id)
        if lst is None:
            return None
        if lst["status"] != 0:          # chỉ lấy active
            return None
        if lst["seller"].lower() != addr:
            return None
        if lst["nft_contract"].lower() != nft_contract.lower():
            return None
        return lst

    listing_results = await asyncio.gather(*[check_listing(i) for i in range(total_listings)])

    for lst in listing_results:
        if lst is None:
            continue
        tid = lst["token_id"]
        if tid not in wallet_tokens:
            uri = await get_token_uri(nft_contract, tid)
            wallet_tokens[tid] = {
                "token_id":     tid,
                "token_uri":    uri,
                "nft_contract": nft_contract,
                "listed":       True,
                "listing_id":   lst["listing_id"],
                "price":        lst["price"],
            }

    owned = sorted(wallet_tokens.values(), key=lambda x: x["token_id"])
    return {"address": addr, "owned": owned, "total": len(owned)}
