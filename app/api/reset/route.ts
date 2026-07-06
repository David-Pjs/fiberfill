import { NextResponse } from "next/server";
import { FiberRpc } from "@/src/rpc";
import { FRESH_RPC } from "@/src/nodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cooperatively closes the fresh node's live channels so it returns to zero
// inbound, ready to run the empty-to-paid sequence again from a true start.
export async function POST() {
  const fresh = new FiberRpc(FRESH_RPC);
  try {
    const info = await fresh.nodeInfo();
    const closeScript = info.default_funding_lock_script;
    if (!closeScript) throw new Error("fresh node has no default lock script to close into");

    const { channels } = await fresh.listChannels();
    const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
    const closing: string[] = [];
    for (const ch of ready) {
      await fresh.shutdownChannel(ch.channel_id, closeScript, 1000n);
      closing.push(ch.channel_id);
    }
    return NextResponse.json({ ok: true, closing });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
