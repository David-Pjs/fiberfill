import { NextResponse } from "next/server";
import { FiberRpc, ckb, shannonsToCkb } from "@/src/rpc";
import { canReceive } from "@/src/core";
import { listProviders } from "@/src/providers";
import { FRESH_RPC, FRESH, shortPubkey, resolveWant } from "@/src/nodes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const wantCkb = resolveWant(new URL(request.url).searchParams.get("want"));
  const fresh = new FiberRpc(FRESH_RPC);
  try {
    const info = await fresh.nodeInfo();
    const cr = await canReceive(fresh, ckb(wantCkb));
    const { channels } = await fresh.listChannels();
    const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
    const held = ready.reduce((sum, c) => sum + shannonsToCkb(c.local_balance), 0);
    const providers = await listProviders().catch(() => []);
    return NextResponse.json({
      online: true,
      pubkey: FRESH.pubkey,
      pubkeyShort: shortPubkey(FRESH.pubkey),
      channelCount: Number(BigInt(info.channel_count)),
      want: wantCkb,
      canReceive: cr,
      held: Math.round(held * 100) / 100,
      providers,
    });
  } catch (err) {
    return NextResponse.json({
      online: false,
      pubkey: FRESH.pubkey,
      pubkeyShort: shortPubkey(FRESH.pubkey),
      want: wantCkb,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
