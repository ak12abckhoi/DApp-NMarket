from sqlalchemy import Column, Integer, String, Float, Boolean
from app.db.database import Base

class Listing(Base):
    __tablename__ = "listings"

    id             = Column(Integer, primary_key=True, index=True)
    listing_id     = Column(Integer, unique=True, index=True)
    nft_contract   = Column(String)
    token_id       = Column(Integer)
    seller         = Column(String, index=True)
    price          = Column(String)        # lưu dạng wei string
    end_time       = Column(Integer, default=0)
    highest_bidder = Column(String, default="")
    highest_bid    = Column(String, default="0")
    listing_type   = Column(Integer, default=0)  # 0=fixed, 1=auction
    status         = Column(Integer, default=0)  # 0=active, 1=sold, 2=cancelled
    tx_hash        = Column(String, default="")