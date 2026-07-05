// Unattended end-to-end proof: a genuinely fresh node with zero inbound is made
// payable by the FiberFill toolkit, then receives a real testnet payment.
//
// Nothing here is mocked. It talks to three live fnn nodes:
//   provider (8337) - the LSP that funds inbound capacity
//   fresh    (8357) - a brand new node, zero channels, funded on-chain only for its own reserve
// The fresh node cannot receive a payment until the provider opens a channel toward it.
//
// Run: npm run harden

import { FiberRpc, ckb, toCkb, shannonsToCkb } from "./rpc";
import { requestLiquidity, canReceive } from "./core";

const provider = new FiberRpc("http://127.0.0.1:8337");
const fresh = new FiberRpc("http://127.0.0.1:8357");

const FRESH = {
  pubkey: "03646eac7cf511d1bb9b84b2fb9a4cca85cf689b726e8501f5e26bed9a3328529f",
  address: "/ip4/127.0.0.1/tcp/8358/p2p/QmXW8eMcVQGUXxKdWgJThZNnqNKAoPYDSyzJuYWM4SZ9pk",
};

const WANT = ckb(50);
const FUND = ckb(300);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`\nFAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ok: ${msg}`);
}

async function freshInbound(): Promise<number> {
  const { channels } = await fresh.listChannels();
  const ready = channels.filter((c) => c.enabled && c.state.state_name === "ChannelReady");
  return ready.reduce((sum, c) => sum + shannonsToCkb(c.remote_balance), 0);
}

async function freshHeld(): Promise<number> {
  const { channels } = await fresh.listChannels();
  const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
  return ready.reduce((sum, c) => sum + shannonsToCkb(c.local_balance), 0);
}

console.log("FiberFill hardening run - fresh zero-inbound node, live testnet, no mocks\n");

console.log("1. starting state of the fresh node");
const start = await canReceive(fresh, WANT);
assert(!start.ok, `fresh node cannot receive ${toCkb(WANT)} CKB yet (${start.reason})`);

console.log(`\n2. provider funds ${toCkb(FUND)} CKB of inbound toward the fresh node`);
const result = await requestLiquidity(
  provider,
  { pubkey: FRESH.pubkey, address: FRESH.address, amount: FUND },
  { onState: (s) => console.log(`  state -> ${s}`) },
);
console.log(`  channel ${result.channelId.slice(0, 12)}... reached ${result.state}`);

console.log("\n3. the fresh node can now receive");
const after = await canReceive(fresh, WANT);
assert(after.ok, `fresh node can now receive ${toCkb(WANT)} CKB (${after.reason})`);

console.log("\n4. fresh node raises a real invoice, provider pays it");
const heldBefore = await freshHeld();
const invoice = await fresh.newInvoice(WANT, "fiberfill hardening proof");
const pay = await provider.sendPayment(invoice.invoice_address);

let status = pay.status;
const deadline = Date.now() + 120000;
while (status !== "Success" && Date.now() < deadline) {
  await sleep(3000);
  status = (await provider.getPayment(pay.payment_hash)).status;
  console.log(`  payment -> ${status}`);
  if (status === "Failed") break;
}
assert(status === "Success", `payment of ${toCkb(WANT)} CKB settled (status ${status})`);

console.log("\n5. the money actually landed on the fresh node");
await sleep(3000);
const heldAfter = await freshHeld();
const gained = Math.round((heldAfter - heldBefore) * 100) / 100;
console.log(`  fresh node held ${heldBefore} CKB before, ${heldAfter} CKB after (+${gained})`);
assert(gained >= toCkb(WANT) - 0.01, `fresh node received about ${toCkb(WANT)} CKB`);

console.log(
  `\nPASS: an empty node went from unable-to-receive to paid, driven entirely by the toolkit. inbound=${await freshInbound()} CKB`,
);
