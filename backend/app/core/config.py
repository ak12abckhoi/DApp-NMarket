from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RPC_URL:          str = "http://127.0.0.1:8545"
    NFT_COLLECTION:   str = ""
    NFT_MARKETPLACE:  str = ""
    DATABASE_URL:     str = "postgresql+asyncpg://postgres:123@localhost:5432/nft_marketplace"
    PINATA_GATEWAY:   str = "https://gateway.pinata.cloud/ipfs"
    # Origins được phép gọi API — cách nhau bằng dấu phẩy
    ALLOWED_ORIGINS:  str = "http://localhost:5173"

    @property
    def db_url(self) -> str:
        # Supabase/Neon trả về "postgresql://" — cần đổi sang asyncpg
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env"}

settings = Settings()
