import { FiberRpc, ckb } from "./rpc";
import { requestLiquidity } from "./core";

const provider = new FiberRpc("http://127.0.0.1:8337");

const merchant = {
  pubkey: "034005ffbdaff26ba0d4cfd03ee94f1c0fbef8c4d23221cc27ef3681f6076a34f6",
  address: "/ip4/127.0.0.1/tcp/8348/p2p/Qmf3FRHHporGFi3eMsHtcPSZatev3BX1jpo8M1HfbBEtap",
  amount: ckb(200),
};

console.log("requesting 200 CKB inbound liquidity for the merchant...\n");
const result = await requestLiquidity(provider, merchant, {
  onState: (s) => console.log(`  state -> ${s}`),
});
console.log(`\nchannel ${result.channelId.slice(0, 12)}... ${result.state}`);
console.log(`inbound added: ${result.inboundAdded} CKB`);
console.log("\nrequestLiquidity ok: opened a funded channel on demand, live.");
