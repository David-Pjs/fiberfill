// Single source of truth for the demo's live nodes. The dashboard is hardcoded
// to the fresh node so the money-shot is one clean, repeatable sequence.
//
// The RPC URLs are what the deployed app (Vercel) calls, so they point at the
// nodes' public host. Set PROVIDER_RPC and FRESH_RPC in the deploy environment
// to the VPS address; they fall back to localhost for local development.

export const PROVIDER_RPC = process.env.PROVIDER_RPC ?? "http://127.0.0.1:8337";
export const FRESH_RPC = process.env.FRESH_RPC ?? "http://127.0.0.1:8357";

// Public CKB testnet RPC, used read-only to report the provider's on-chain
// balance (its capacity to fund inbound). FiberFill never signs on-chain here.
export const CKB_RPC = "https://testnet.ckbapp.dev/";

// The provider dials this address to open the channel. That dial is node-to-node
// on the same host as the provider (both nodes are co-located on the VPS), so the
// address stays loopback even in the hosted deployment. Only the RPC URLs above,
// which the app calls remotely, take the public host.
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

// A judge can pick how much inbound to request, so the demo is visibly not fixed to
// one number. The provider funds the requested amount plus a buffer that covers the
// ~99 CKB on-chain reserve; the presets stay under the provider's 500 CKB per-request
// cap. Requests are clamped to this safe range server-side.
export const WANT_PRESETS = [50, 100, 200] as const;
const MIN_WANT_CKB = 50;
const MAX_WANT_CKB = 250;
const FUND_BUFFER_CKB = 250;

export function resolveWant(raw: string | null): number {
  const n = raw == null ? WANT_CKB : Number(raw);
  if (!Number.isFinite(n)) return WANT_CKB;
  return Math.min(MAX_WANT_CKB, Math.max(MIN_WANT_CKB, Math.round(n)));
}

export const fundFor = (wantCkb: number): number => wantCkb + FUND_BUFFER_CKB;

export const shortPubkey = (pk: string): string => `${pk.slice(0, 8)}...${pk.slice(-4)}`;
