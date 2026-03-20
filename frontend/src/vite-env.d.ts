/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_JWT:        string;
  readonly VITE_PINATA_GATEWAY:    string;
  readonly VITE_SEPOLIA_RPC_URL:   string;
  readonly VITE_MAINNET_RPC_URL:   string;
  readonly VITE_WALLETCONNECT_ID:  string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}