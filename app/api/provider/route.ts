import { NextResponse } from "next/server";
import { FiberRpc, shannonsToCkb, type Script } from "@/src/rpc";
import { listProviders } from "@/src/providers";
import { PROVIDER_RPC, CKB_RPC, PROVIDER } from "@/src/nodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Reads the provider's on-chain balance (its capacity to fund inbound) from the
// public CKB indexer. Read-only: no keys, no signing.
async function onchainCapacity(lock: Script): Promise<number> {
  const res = await fetch(CKB_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "get_cells_capacity",
      params: [{ script: lock, script_type: "lock" }],
    }),
  });
  const json = (await res.json()) as { result?: { capacity: string }; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return Number(BigInt(json.result!.capacity)) / 1e8;
}

export async function GET() {
  const provider = new FiberRpc(PROVIDER_RPC);
  try {
    const info = await provider.nodeInfo();
    const lock = info.default_funding_lock_script;
    const onchain = lock ? await onchainCapacity(lock).catch(() => null) : null;

    const { channels } = await provider.listChannels();
    const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
    const committed = ready.reduce((sum, c) => sum + shannonsToCkb(c.local_balance), 0);

    const dir = await listProviders().catch(() => []);
    const maxOfferCkb = dir[0]?.maxOfferCkb ?? null;

    return NextResponse.json({
      online: true,
      label: PROVIDER.label,
      address: PROVIDER.address,
      faucet: PROVIDER.faucet,
      onchainCkb: onchain === null ? null : Math.round(onchain * 100) / 100,
      committedInboundCkb: Math.round(committed * 100) / 100,
      openChannels: ready.length,
      maxOfferCkb,
    });
  } catch (err) {
    return NextResponse.json({
      online: false,
      label: PROVIDER.label,
      address: PROVIDER.address,
      faucet: PROVIDER.faucet,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
