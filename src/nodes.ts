// Single source of truth for the demo's live nodes. The dashboard is hardcoded
// to the fresh node so the money-shot is one clean, repeatable sequence.

export const PROVIDER_RPC = "http://127.0.0.1:8337";
export const FRESH_RPC = "http://127.0.0.1:8357";

// Public CKB testnet RPC, used read-only to report the provider's on-chain
// balance (its capacity to fund inbound). FiberFill never signs on-chain here.
export const CKB_RPC = "https://testnet.ckbapp.dev/";

export const FRESH = {
  label: "fresh",
  pubkey: "03646eac7cf511d1bb9b84b2fb9a4cca85cf689b726e8501f5e26bed9a3328529f",
  address: "/ip4/127.0.0.1/tcp/8358/p2p/QmXW8eMcVQGUXxKdWgJThZNnqNKAoPYDSyzJuYWM4SZ9pk",
} as const;

// The provider's on-chain testnet address. Shown read-only in the operator view
// so an operator can fund it to raise capacity, without ever leaving the app for
// a CLI. Funding itself is a wallet action (faucet on testnet), never handled here.
export const PROVIDER = {
  label: "fiber-lab provider",
  address:
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtjg5lg5zegxp9es0mc8udpuacy0npl02sqwfhx9",
  faucet: "https://faucet.nervos.org",
} as const;

// The amount the fresh node wants to be able to receive, and the inbound the
// provider funds toward it. Provider funds more than WANT because roughly 99 CKB
// of any channel is locked as the on-chain commitment reserve.
export const WANT_CKB = 50;
export const FUND_CKB = 300;

export const shortPubkey = (pk: string): string => `${pk.slice(0, 8)}...${pk.slice(-4)}`;
