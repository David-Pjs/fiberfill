import { FiberRpc, shannonsToCkb, toCkb } from "./rpc";

export interface LiquidityRequest {
  pubkey: string;
  address: string;
  amount: bigint;
}

export interface LiquidityResult {
  channelId: string;
  state: string;
  inboundAdded: number;
}

export interface RequestOptions {
  pollMs?: number;
  timeoutMs?: number;
  connectTimeoutMs?: number;
  onState?: (state: string) => void;
}

const READY = "ChannelReady";
// connect_peer returns before the Fiber Init handshake finishes, and open_channel
// rejects with this message until the peer's feature bits have been exchanged.
const HANDSHAKE_PENDING = /Init message|feature bit not found/i;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function requestLiquidity(
  provider: FiberRpc,
  req: LiquidityRequest,
  opts: RequestOptions = {},
): Promise<LiquidityResult> {
  const pollMs = opts.pollMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 180000;
  const connectTimeoutMs = opts.connectTimeoutMs ?? 120000;

  const before = new Set((await provider.listChannels()).channels.map((c) => c.channel_id));

  // A node with zero channels does not hold a manually opened peer connection: it
  // handshakes, then drops the link within about a minute because no channel
  // anchors it. open_channel needs the link live, so re-issue connect_peer on
  // every attempt to rebuild a dropped session, then try to open in the window
  // while it is up. A failed open here is a parameter rejection, so no channel
  // is created to leak.
  const connectDeadline = Date.now() + connectTimeoutMs;
  for (;;) {
    try {
      await provider.connectPeer(req.address);
      await provider.openChannel(req.pubkey, req.amount);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!HANDSHAKE_PENDING.test(msg) || Date.now() >= connectDeadline) throw err;
      opts.onState?.("HandshakingPeer");
      await sleep(pollMs);
    }
  }

  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const { channels } = await provider.listChannels();
    const fresh = channels.find((c) => !before.has(c.channel_id));
    if (!fresh) continue;
    if (fresh.state.state_name !== last) {
      last = fresh.state.state_name;
      opts.onState?.(last);
    }
    if (fresh.state.state_name === READY) {
      return {
        channelId: fresh.channel_id,
        state: fresh.state.state_name,
        inboundAdded: shannonsToCkb(fresh.local_balance),
      };
    }
  }
  throw new Error("requestLiquidity: channel did not reach ChannelReady before timeout");
}

export interface CanReceiveResult {
  ok: boolean;
  inbound: number;
  needed: number;
  shortfall: number;
  reason: string;
}

export async function canReceive(rpc: FiberRpc, amount: bigint): Promise<CanReceiveResult> {
  const { channels } = await rpc.listChannels();
  const usable = channels.filter((c) => c.enabled && c.state.state_name === READY);
  const inbound = usable.reduce((sum, c) => sum + BigInt(c.remote_balance), 0n);
  const ok = inbound >= amount;
  const shortfall = ok ? 0n : amount - inbound;
  return {
    ok,
    inbound: toCkb(inbound),
    needed: toCkb(amount),
    shortfall: toCkb(shortfall),
    reason: ok
      ? `has ${toCkb(inbound)} CKB inbound across ${usable.length} channel(s)`
      : `short ${toCkb(shortfall)} CKB (has ${toCkb(inbound)}, wants ${toCkb(amount)})`,
  };
}
