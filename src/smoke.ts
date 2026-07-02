import { FiberRpc, shannonsToCkb } from "./rpc";

const provider = new FiberRpc("http://127.0.0.1:8337");
const merchant = new FiberRpc("http://127.0.0.1:8347");

async function report(name: string, rpc: FiberRpc): Promise<void> {
  const info = await rpc.nodeInfo();
  const { channels } = await rpc.listChannels();
  console.log(`\n[${name}] peers=${BigInt(info.peers_count)} channels=${BigInt(info.channel_count)}`);
  for (const ch of channels) {
    console.log(
      `  ${ch.channel_id.slice(0, 12)}... ${ch.state.state_name} local=${shannonsToCkb(ch.local_balance)} CKB enabled=${ch.enabled}`,
    );
  }
}

await report("provider", provider);
await report("merchant", merchant);
console.log("\nsmoke ok: typed RPC client reached both live nodes.");
