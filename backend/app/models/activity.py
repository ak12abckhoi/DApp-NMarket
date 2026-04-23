from sqlalchemy import Column, Integer, String, BigInteger
from app.db.database import Base

class NFTActivity(Base):
    __tablename__ = "nft_activities"

    id           = Column(Integer, primary_key=True, index=True)
    action       = Column(String, index=True)        # mint | list | sale | cancel | settle | bid
    user_address = Column(String, index=True)        # lowercase
    token_id     = Column(Integer, default=0)
    nft_contract = Column(String, default="")
    price        = Column(String, default="0")       # wei string
    listing_id   = Column(Integer, default=-1)
    tx_hash      = Column(String, default="")
    block_number = Column(BigInteger, default=0)
