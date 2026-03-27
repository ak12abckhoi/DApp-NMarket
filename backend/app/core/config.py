from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RPC_URL: str = "http://127.0.0.1:8545"
    NFT_COLLECTION: str = ""
    NFT_MARKETPLACE: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./nft_marketplace.db"

    model_config = {"env_file": ".env"}

settings = Settings()