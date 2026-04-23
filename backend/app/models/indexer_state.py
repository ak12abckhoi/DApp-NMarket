from sqlalchemy import Column, Integer, BigInteger
from app.db.database import Base

class IndexerState(Base):
    __tablename__ = "indexer_state"

    id         = Column(Integer, primary_key=True)   # always row id=1
    last_block = Column(BigInteger, default=0)
