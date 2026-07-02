import { FiberRpc, shannonsToCkb } from "./rpc";

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
  onState?: (state: string) => void;
}

const READY = "ChannelReady";
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function requestLiquidity(
  provider: FiberRpc,
  req: LiquidityRequest,
  opts: RequestOptions = {},
): Promise<LiquidityResult> {
  const pollMs = opts.pollMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 180000;

  await provider.connectPeer(req.address);

  const before = new Set((await provider.listChannels()).channels.map((c) => c.channel_id));
  await provider.openChannel(req.pubkey, req.amount);

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
