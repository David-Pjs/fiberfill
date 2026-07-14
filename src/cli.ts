// FiberFill CLI. Built judge-first: `demo` runs the whole empty-to-paid proof with
// plain narration, and every command checks the nodes are reachable first and tells
// you exactly how to start them if they are not, so no one wastes time guessing.
//
//   npm run demo            the guided money-shot (default 50 CKB)
//   npm run demo -- 200     request a different amount
//   npm run cli -- doctor   check the nodes are up
//   npm run cli -- check    can the node receive yet
//   npm run cli -- providers  the provider directory
//
// Or, once linked: fiberfill demo / doctor / check / providers

import { FiberRpc, ckb, toCkb, shannonsToCkb, type Script } from "./rpc";
import { requestLiquidity, canReceive } from "./core";
import { listProviders } from "./providers";
import { PROVIDER_RPC, FRESH_RPC, FRESH, resolveWant, fundFor } from "./nodes";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const provider = new FiberRpc(PROVIDER_RPC);
const fresh = new FiberRpc(FRESH_RPC);

function line(msg = ""): void {
  process.stdout.write(`${msg}\n`);
}

// Assistive guidance: if a node is unreachable, say exactly what to run.
async function reachable(rpc: FiberRpc, label: string, dir: string): Promise<boolean> {
  try {
    await rpc.nodeInfo();
    line(`  ok    ${label} node is up`);
    return true;
  } catch {
    line(`  DOWN  ${label} node is not reachable`);
    line(`        start it:  cd ../fiber-lab/${dir} && \\`);
    line(`          FIBER_SECRET_KEY_PASSWORD='<your pw>' RUST_LOG='info' ./fnn.exe -c config.yml -d .`);
    return false;
  }
}

async function doctor(): Promise<boolean> {
  line("Checking the FiberFill nodes...\n");
  const p = await reachable(provider, "provider", "provider");
  const f = await reachable(fresh, "fresh", "fresh");
  line();
  if (p && f) {
    line("All set. Run:  npm run demo");
    return true;
  }
  line("Start the node(s) above, then run this again. Full setup: ../fiber-lab/NODES.md");
  return false;
}

async function check(amountCkb: number): Promise<void> {
  const cr = await canReceive(fresh, ckb(amountCkb));
  line(cr.ok ? `YES  ${cr.reason}` : `NO   ${cr.reason}`);
}

async function providers(): Promise<void> {
  const list = await listProviders();
  if (list.length === 0) {
    line("No providers in the directory.");
    return;
  }
  for (const p of list) {
    const status = p.online ? "online" : "offline";
    line(`${p.label} - ${status} - offers up to ${p.maxOfferCkb} CKB - channels=${p.channelCount}`);
  }
}

async function resetFresh(): Promise<void> {
  const { channels } = await fresh.listChannels();
  const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
  if (ready.length === 0) return;
  const info = await fresh.nodeInfo();
  const closeScript = info.default_funding_lock_script as Script | undefined;
  if (!closeScript) return;
  for (const ch of ready) await fresh.shutdownChannel(ch.channel_id, closeScript, 1000n);
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    await sleep(3000);
    if (!(await canReceive(fresh, ckb(1))).ok) return;
  }
}

async function freshHeld(): Promise<number> {
  const { channels } = await fresh.listChannels();
  return channels
    .filter((c) => c.state.state_name === "ChannelReady")
    .reduce((sum, c) => sum + shannonsToCkb(c.local_balance), 0);
}

async function demo(wantCkb: number): Promise<void> {
  const fundCkb = fundFor(wantCkb);
  line(`FiberFill demo - make an empty node payable, then pay it. Live testnet, no mocks.\n`);

  line("0. returning the node to a true zero-inbound start");
  await resetFresh();

  line("\n1. right now the node cannot receive");
  const before = await canReceive(fresh, ckb(wantCkb));
  line(`   ${before.reason}`);

  line(`\n2. requesting ${wantCkb} CKB of inbound (provider funds ${fundCkb} CKB)`);
  const result = await requestLiquidity(
    provider,
    { pubkey: FRESH.pubkey, address: FRESH.address, amount: ckb(fundCkb) },
    { onState: (s) => line(`   -> ${s}`) },
  );
  line(`   channel ready, +${result.inboundAdded} CKB inbound`);

  line("\n3. the node can now receive");
  const after = await canReceive(fresh, ckb(wantCkb));
  line(`   ${after.reason}`);

  line(`\n4. the node raises a ${wantCkb} CKB invoice and the provider pays it`);
  const heldBefore = await freshHeld();
  const invoice = await fresh.newInvoice(ckb(wantCkb), "fiberfill cli demo");
  const pay = await provider.sendPayment(invoice.invoice_address);
  let status = pay.status;
  const deadline = Date.now() + 120000;
  while (status !== "Success" && Date.now() < deadline) {
    await sleep(3000);
    status = (await provider.getPayment(pay.payment_hash)).status;
    if (status === "Failed") break;
  }
  if (status !== "Success") {
    line(`   payment did not settle (status ${status})`);
    process.exit(1);
  }
  await sleep(2000);
  const gained = Math.round((await freshHeld()) - heldBefore);
  line(`   paid. the node held +${gained} CKB it could not have received a minute ago.`);
  line(`\nDone. An empty node went from unpayable to paid, driven entirely by FiberFill.`);
}

function help(): void {
  line("FiberFill CLI");
  line("");
  line("  npm run demo             guided empty-to-paid money-shot (50 CKB)");
  line("  npm run demo -- 200      request a different amount (50, 100, 200)");
  line("  npm run cli -- doctor    check the nodes are reachable");
  line("  npm run cli -- check     can the node receive yet");
  line("  npm run cli -- providers list the provider directory");
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  const want = resolveWant(arg ?? null);

  if (cmd === "doctor") {
    process.exit((await doctor()) ? 0 : 1);
  }
  if (cmd === "demo") {
    if (!(await doctor())) process.exit(1);
    line();
    await demo(want);
    return;
  }
  if (cmd === "check") return check(want);
  if (cmd === "providers") return providers();
  help();
}

main().catch((err) => {
  line(`\nerror: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
