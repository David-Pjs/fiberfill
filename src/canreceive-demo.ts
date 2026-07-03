import { FiberRpc, ckb, toCkb } from "./rpc";
import { canReceive } from "./core";

const merchant = new FiberRpc("http://127.0.0.1:8347");

for (const amount of [ckb(50), ckb(5000)]) {
  const r = await canReceive(merchant, amount);
  console.log(`can merchant receive ${toCkb(amount)} CKB?  ${r.ok ? "YES" : "NO"}  - ${r.reason}`);
}
