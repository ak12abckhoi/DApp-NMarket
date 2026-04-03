from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RPC_URL:         str = "http://127.0.0.1:8545"
    NFT_COLLECTION:  str = ""
    NFT_MARKETPLACE: str = ""
    DATABASE_URL:    str = "postgresql+asyncpg://postgres:123@localhost:5432/nft_marketplace"
    PINATA_GATEWAY:  str = "https://gateway.pinata.cloud/ipfs"

    model_config = {"env_file": ".env"}

settings = Settings()