from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.listing import Listing
from app.models.activity import NFTActivity
from app.services.rpc import get_listing


def _log_meta(log: dict) -> tuple[str, int]:
    tx_hash = log.get("transactionHash", "")
    block_number = int(log.get("blockNumber", "0x0"), 16)
    return tx_hash, block_number


def _decode_address(hex32: str) -> str:
    """Lấy address từ 32-byte hex (có hoặc không có 0x prefix)."""
    s = hex32.lstrip("0x") if hex32.startswith("0x") else hex32
    return ("0x" + s[-40:]).lower()


async def handle_minted(log: dict, db: AsyncSession):
    topics = log.get("topics", [])
    if len(topics) < 3:
        return
    tx_hash, block_number = _log_meta(log)
    to_address = _decode_address(topics[1])
    token_id   = int(topics[2], 16)
    nft_contract = log.get("address", "").lower()

    db.add(NFTActivity(
        action="mint",
        user_address=to_address,
        token_id=token_id,
        nft_contract=nft_contract,
        price="0",
        listing_id=-1,
        tx_hash=tx_hash,
        block_number=block_number,
    ))
    await db.commit()
    print(f"[INDEXER] Minted token #{token_id} → {to_address}")


async def handle_listed(listing_id: int, log: dict, db: AsyncSession):
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

    tx_hash, block_number = _log_meta(log)
    db.add(NFTActivity(
        action="list",
        user_address=data["seller"].lower(),
        token_id=data["token_id"],
        nft_contract=data["nft_contract"].lower(),
        price=data["price"],
        listing_id=listing_id,
        tx_hash=tx_hash,
        block_number=block_number,
    ))
    await db.commit()
    print(f"[INDEXER] Listed #{listing_id}")


async def handle_sale(listing_id: int, log: dict, db: AsyncSession):
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()

    tx_hash, block_number = _log_meta(log)

    # Decode buyer address và price từ log data (non-indexed)
    # Sale(uint256 indexed listingId, address buyer, uint256 price)
    # data = 32 bytes buyer (padded) + 32 bytes price
    raw_data = log.get("data", "0x").lstrip("0x")
    buyer_address = ""
    sale_price = "0"
    if len(raw_data) >= 128:
        buyer_address = ("0x" + raw_data[24:64]).lower()   # bytes 0-31 → address ở 12 bytes cuối
        sale_price    = str(int(raw_data[64:128], 16))

    if listing:
        listing.status = 1  # Sold
        # Ghi activity cho seller
        db.add(NFTActivity(
            action="sale",
            user_address=listing.seller.lower(),
            token_id=listing.token_id,
            nft_contract=listing.nft_contract.lower(),
            price=sale_price or listing.price,
            listing_id=listing_id,
            tx_hash=tx_hash,
            block_number=block_number,
        ))
        # Ghi activity cho buyer nếu decode được
        if buyer_address and buyer_address != "0x" + "0"*40:
            db.add(NFTActivity(
                action="buy",
                user_address=buyer_address,
                token_id=listing.token_id,
                nft_contract=listing.nft_contract.lower(),
                price=sale_price or listing.price,
                listing_id=listing_id,
                tx_hash=tx_hash,
                block_number=block_number,
            ))
    await db.commit()
    print(f"[INDEXER] Sold #{listing_id}")


async def handle_bid(listing_id: int, log: dict, db: AsyncSession):
    data = await get_listing(listing_id)
    if not data:
        return
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.highest_bid    = data["highest_bid"]
        listing.highest_bidder = data["highest_bidder"]

    tx_hash, block_number = _log_meta(log)
    # BidPlaced(uint256 indexed listingId, address bidder, uint256 amount)
    raw_data = log.get("data", "0x").lstrip("0x")
    bidder_address = ""
    bid_amount = "0"
    if len(raw_data) >= 128:
        bidder_address = ("0x" + raw_data[24:64]).lower()
        bid_amount     = str(int(raw_data[64:128], 16))

    if bidder_address and listing:
        db.add(NFTActivity(
            action="bid",
            user_address=bidder_address,
            token_id=listing.token_id if listing else 0,
            nft_contract=listing.nft_contract.lower() if listing else "",
            price=bid_amount,
            listing_id=listing_id,
            tx_hash=tx_hash,
            block_number=block_number,
        ))
    await db.commit()
    print(f"[INDEXER] Bid on #{listing_id}")


async def handle_cancelled(listing_id: int, log: dict, db: AsyncSession):
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.status = 2  # Cancelled

    tx_hash, block_number = _log_meta(log)
    if listing:
        db.add(NFTActivity(
            action="cancel",
            user_address=listing.seller.lower(),
            token_id=listing.token_id,
            nft_contract=listing.nft_contract.lower(),
            price=listing.price,
            listing_id=listing_id,
            tx_hash=tx_hash,
            block_number=block_number,
        ))
    await db.commit()
    print(f"[INDEXER] Cancelled #{listing_id}")


async def handle_settled(listing_id: int, log: dict, db: AsyncSession):
    existing = await db.execute(select(Listing).where(Listing.listing_id == listing_id))
    listing = existing.scalar_one_or_none()
    if listing:
        listing.status = 1  # Sold

    tx_hash, block_number = _log_meta(log)
    # AuctionSettled(uint256 indexed listingId, address winner, uint256 amount)
    raw_data = log.get("data", "0x").lstrip("0x")
    winner_address = ""
    settle_price = "0"
    if len(raw_data) >= 128:
        winner_address = ("0x" + raw_data[24:64]).lower()
        settle_price   = str(int(raw_data[64:128], 16))

    if listing:
        db.add(NFTActivity(
            action="settle",
            user_address=listing.seller.lower(),
            token_id=listing.token_id,
            nft_contract=listing.nft_contract.lower(),
            price=settle_price or listing.price,
            listing_id=listing_id,
            tx_hash=tx_hash,
            block_number=block_number,
        ))
        if winner_address and winner_address != "0x" + "0"*40:
            db.add(NFTActivity(
                action="buy",
                user_address=winner_address,
                token_id=listing.token_id,
                nft_contract=listing.nft_contract.lower(),
                price=settle_price or listing.price,
                listing_id=listing_id,
                tx_hash=tx_hash,
                block_number=block_number,
            ))
    await db.commit()
    print(f"[INDEXER] Settled #{listing_id}")
