# NFT Marketplace dApp

Ứng dụng NFT Marketplace phi tập trung chạy trên **Oasis Sapphire Testnet** (token: TEST).  
Cho phép mint, list, mua bán và đấu giá NFT trực tiếp trên blockchain.

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Frontend | React 19, Vite, Wagmi v2, Viem v2, TailwindCSS |
| Backend | FastAPI, SQLAlchemy, Python 3.x |
| Lưu trữ | IPFS (Pinata) |
| Mạng | Oasis Sapphire Testnet (chainId: 23295, token: TEST) |

---

## Cấu trúc dự án

```
nft-marketplace/
├── contracts/                          # Smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── NFTCollection.sol           # ERC-721 với whitelist, royalty
│   │   ├── NFTMarketplace.sol          # Mua bán + đấu giá on-chain (escrow)
│   │   └── NFTFactory.sol              # Factory tạo collection mới
│   ├── scripts/
│   │   ├── deploy.ts                   # Deploy → tự lưu deployments/<network>.json + sync frontend
│   │   ├── seed.ts                     # Mint 6 NFT mẫu + tạo listings
│   │   └── start-node.js               # Khởi động local Hardhat node + auto deploy & seed
│   ├── deployments/
│   │   ├── localhost.json              # Địa chỉ contracts local
│   │   └── oasis_sapphire_testnet.json # Địa chỉ contracts Oasis
│   ├── hardhat.config.ts
│   └── package.json
│
├── frontend/                           # React dApp
│   ├── src/
│   │   ├── main.tsx                    # Entry point
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/Navbar.tsx           # Nav + connect wallet + auto switch network
│   │   │   └── nft/NFTCard.tsx         # Card NFT với countdown đấu giá
│   │   ├── pages/
│   │   │   ├── MarketplacePage.tsx     # Explore: filter + sort + tìm kiếm NFT
│   │   │   ├── MintPage.tsx            # Upload IPFS + mint ERC-721
│   │   │   ├── NFTDetailPage.tsx       # Chi tiết NFT: mua / đặt bid / settle đấu giá
│   │   │   └── ProfilePage.tsx         # My Collection + list for sale + withdraw
│   │   ├── hooks/
│   │   │   └── useMarketplace.ts       # Wagmi hooks (đọc/ghi contract, bypass simulateContract)
│   │   ├── config/
│   │   │   ├── web3.ts                 # Wagmi config + chain Oasis Sapphire + ABIs
│   │   │   └── contracts.json          # Địa chỉ contracts (tự cập nhật sau deploy)
│   │   └── utils/
│   │       ├── ipfs.ts                 # Upload file/metadata lên IPFS qua Pinata
│   │       └── placeholder.ts          # Ảnh placeholder SVG
│   └── package.json
│
└── backend/                            # FastAPI indexer + REST API
    ├── app/
    │   ├── api/
    │   │   ├── listings.py             # GET /listings
    │   │   ├── nfts.py                 # GET /nfts/owned/<addr> — đọc thẳng on-chain
    │   │   ├── activity.py             # GET /activity
    │   │   └── stats.py                # GET /stats
    │   ├── indexer/
    │   │   ├── listener.py             # Lắng nghe events blockchain (polling)
    │   │   └── handlers.py             # Xử lý events → ghi DB
    │   ├── models/                     # SQLAlchemy ORM models
    │   └── services/
    │       └── rpc.py                  # Web3 RPC client kết nối Oasis
    ├── main.py
    └── requirements.txt
```

---

## Contracts đã deploy — Oasis Sapphire Testnet

| Contract | Địa chỉ |
|----------|---------|
| NFTCollection | `0xbAD6a56C82776364AA4Db83B3d2d2FC3693eba7A` |
| NFTMarketplace | `0xaC831023BDEBc7876Fdb71602F149d89D8E54504` |
| NFTFactory | `0xab56D1258e3666f8d315db1cfd49F8f402d995Ec` |
| Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |

Explorer: https://testnet.explorer.sapphire.oasis.io

---

## Cài đặt từ đầu

### Yêu cầu hệ thống

- **Node.js 18–22** (Hardhat chưa hỗ trợ v24+)
- **Python 3.10+**
- **PostgreSQL**
- **MetaMask** đã cài trong trình duyệt

### Thêm Oasis Sapphire Testnet vào MetaMask

| Trường | Giá trị |
|--------|---------|
| Network Name | Oasis Sapphire Testnet |
| RPC URL | `https://testnet.sapphire.oasis.io` |
| Chain ID | `23295` |
| Currency Symbol | `TEST` |
| Block Explorer | `https://testnet.explorer.sapphire.oasis.io` |

Lấy TEST token miễn phí: **https://faucet.testnet.oasis.io/?paratime=sapphire**

---

### 1. Clone & cài dependencies

```bash
git clone <repo-url>
cd nft-marketplace

# Contracts
cd contracts && npm install

# Frontend
cd ../frontend && npm install

# Backend
cd ../backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

### 2. Cấu hình file .env

**`contracts/.env`**
```env
PRIVATE_KEY=<private_key_ví_deployer_không_có_tiền_tố_0x>
OASIS_RPC_URL=https://testnet.sapphire.oasis.io
```

**`frontend/.env`**
```env
VITE_PINATA_JWT=<jwt_token_từ_pinata.cloud>
VITE_PINATA_GATEWAY=https://ipfs.io/ipfs
VITE_OASIS_RPC_URL=https://testnet.sapphire.oasis.io
```

**`backend/.env`**
```env
RPC_URL=https://testnet.sapphire.oasis.io
NFT_COLLECTION=0xbAD6a56C82776364AA4Db83B3d2d2FC3693eba7A
NFT_MARKETPLACE=0xaC831023BDEBc7876Fdb71602F149d89D8E54504
DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/nft_marketplace
```

### 3. Deploy & Seed (chỉ cần chạy 1 lần)

```bash
cd contracts

# Đảm bảo ví deployer có TEST từ faucet trước
npm run deploy:oasis    # Deploy 3 contracts → tự sync frontend/src/config/contracts.json
npm run seed:oasis      # Mint 6 NFT mẫu + tạo listings
```

---

## Chạy dự án hàng ngày

Mở **2 terminal song song**:

**Terminal 1 — Backend**
```bash
cd backend
venv\Scripts\activate     # Windows
python main.py
# API docs: http://localhost:8000/docs
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# Truy cập: http://localhost:5173
```

---

## Tất cả lệnh contracts

```bash
cd contracts

# ── Oasis Sapphire Testnet ──────────────────────
npm run deploy:oasis      # Deploy contracts mới lên Oasis
npm run seed:oasis        # Seed 6 NFT mẫu + listings lên Oasis

# ── Local development (offline) ─────────────────
npm run node              # Hardhat node + auto deploy + auto seed
npm run node:reset        # Reset chain + deploy + seed lại từ đầu
npm run deploy            # Deploy lên localhost
npm run seed              # Seed localhost
```

---

## Deploy lên Production (Free)

### Tổng quan

| Phần | Service | Ghi chú |
|------|---------|---------|
| Frontend | **Vercel** | Free, CDN toàn cầu, auto-deploy từ GitHub |
| Backend | **Render** | Free 750h/tháng, ngủ sau 15 phút không dùng |
| Database | **Supabase** | Free 500MB PostgreSQL, không expire |

> Smart contracts đã deploy trên Oasis Sapphire Testnet, không cần làm lại.

---

### Bước 1 — Push code lên GitHub

```bash
git add .
git commit -m "prepare for production"
git push
```

### Bước 2 — Tạo Database trên Supabase

1. Vào **supabase.com** → New project
2. **Settings → Database → Connection string → URI** → copy URL
3. URL có dạng: `postgres://postgres:[password]@db.xxx.supabase.co:5432/postgres`
   *(backend tự convert sang asyncpg, không cần sửa)*

### Bước 3 — Deploy Backend trên Render

1. Vào **render.com** → New → Web Service → Connect repo GitHub
2. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Thêm Environment Variables:
   ```
   RPC_URL         = https://testnet.sapphire.oasis.io
   NFT_COLLECTION  = 0xbAD6a56C82776364AA4Db83B3d2d2FC3693eba7A
   NFT_MARKETPLACE = 0xaC831023BDEBc7876Fdb71602F149d89D8E54504
   DATABASE_URL    = <URL Supabase từ bước 2>
   ALLOWED_ORIGINS = http://localhost:5173
   ```
4. Deploy → copy URL Render (vd: `https://nft-api.onrender.com`)

### Bước 4 — Deploy Frontend trên Vercel

1. Vào **vercel.com** → New Project → Import repo → chọn đúng repo
2. Cấu hình:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
3. Thêm Environment Variables:
   ```
   VITE_PINATA_JWT     = <jwt của bạn>
   VITE_PINATA_GATEWAY = https://ipfs.io/ipfs
   VITE_OASIS_RPC_URL  = https://testnet.sapphire.oasis.io
   VITE_API_URL        = <URL Render từ bước 3>
   ```
4. Deploy → copy URL Vercel (vd: `https://nft-marketplace.vercel.app`)

### Bước 5 — Cập nhật CORS trên Render

Vào Render → Environment → sửa `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS = http://localhost:5173,https://nft-marketplace.vercel.app
```
Render tự restart. Xong!

---

## Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| Mint NFT | Upload ảnh lên IPFS (Pinata), mint ERC-721 on-chain với giá 0.01 TEST |
| Fixed Price | List NFT với giá cố định, người khác mua ngay |
| Auction | Đấu giá có thời hạn, đặt bid, settle khi hết giờ |
| My Collection | Xem NFT trong ví + NFT đang list, hover để list for sale, withdraw earnings |
| Explore | Tìm kiếm, lọc theo loại/giá, sắp xếp, ẩn NFT của mình |
| Network Guard | Navbar tự phát hiện sai mạng, auto switch sang Oasis Sapphire |
| Explorer links | Xem transaction trên Oasis Sapphire Testnet Explorer |

---

## Ghi chú kỹ thuật

### Oasis Sapphire & wagmi

Sapphire là confidential EVM — từ chối `eth_estimateGas` và `eth_call` cho write functions nếu không được encrypt đúng cách. Wagmi v2 mặc định gọi `simulateContract` (eth_call) trước khi mở MetaMask → lỗi.

**Giải pháp:** Tất cả write calls dùng `walletClient.writeContract` trực tiếp (lấy qua `getWalletClient` từ `wagmi/actions`) thay vì qua wagmi's write flow. Trước mỗi lần ghi, tự động `switchChain` sang Oasis Sapphire để tránh lỗi chain mismatch.

### Gas thủ công

Đặt `gas` cố định để bỏ qua `eth_estimateGas`:

| Hàm | Gas limit |
|-----|-----------|
| mint | 500,000 |
| listNFT | 300,000 |
| buyNFT / placeBid / settleAuction | 200,000 |
| approve / withdraw | 100,000 |

### Marketplace Escrow

Khi list NFT, contract gọi `transferFrom(seller, marketplace, tokenId)` ngay lúc đó — NFT chuyển vào tay marketplace. Người bán vẫn được coi là "sở hữu" vì có thể cancel listing để lấy lại. My Collection hiển thị cả hai loại:
- NFT trong ví (chưa list) → nút **List for Sale**
- NFT đang escrow trong marketplace (đã list) → badge **Listed**

### My Collection — đọc on-chain

Backend endpoint `/nfts/owned/{address}` đọc thẳng từ blockchain (không phụ thuộc DB indexer):
1. Quét `ownerOf(tokenId)` cho tất cả token → tìm token trong ví
2. Quét `getListing(id)` cho tất cả listing → tìm listing đang active của địa chỉ này

### Deploy tự động sync

`scripts/deploy.ts` sau khi deploy sẽ tự:
- Lưu địa chỉ vào `deployments/<network>.json`
- Cập nhật `frontend/src/config/contracts.json` với chainId tương ứng
