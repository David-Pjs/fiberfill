// Single source of truth for the demo's live nodes. The dashboard is hardcoded
// to the fresh node so the money-shot is one clean, repeatable sequence.

export const PROVIDER_RPC = "http://127.0.0.1:8337";
export const FRESH_RPC = "http://127.0.0.1:8357";

export const FRESH = {
  label: "fresh",
  pubkey: "03646eac7cf511d1bb9b84b2fb9a4cca85cf689b726e8501f5e26bed9a3328529f",
  address: "/ip4/127.0.0.1/tcp/8358/p2p/QmXW8eMcVQGUXxKdWgJThZNnqNKAoPYDSyzJuYWM4SZ9pk",
} as const;

// The amount the fresh node wants to be able to receive, and the inbound the
// provider funds toward it. Provider funds more than WANT because roughly 99 CKB
// of any channel is locked as the on-chain commitment reserve.
export const WANT_CKB = 50;
export const FUND_CKB = 300;

export const shortPubkey = (pk: string): string => `${pk.slice(0, 8)}...${pk.slice(-4)}`;
