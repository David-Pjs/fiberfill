import { FiberRpc, ckb, shannonsToCkb } from "@/src/rpc";
import { requestLiquidity } from "@/src/core";
import { PROVIDER_RPC, FRESH_RPC, FRESH, resolveWant, fundFor } from "@/src/nodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function freshHeld(fresh: FiberRpc): Promise<number> {
  const { channels } = await fresh.listChannels();
  const ready = channels.filter((c) => c.state.state_name === "ChannelReady");
  return ready.reduce((sum, c) => sum + shannonsToCkb(c.local_balance), 0);
}

export async function GET(request: Request) {
  const wantCkb = resolveWant(new URL(request.url).searchParams.get("want"));
  const fundCkb = fundFor(wantCkb);
  const provider = new FiberRpc(PROVIDER_RPC);
  const fresh = new FiberRpc(FRESH_RPC);
  const encoder = new TextEncoder();
  const start = Date.now();
  const elapsed = (): number => Date.now() - start;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>): void =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        send({ phase: "connect", elapsedMs: 0 });
        const heldBefore = await freshHeld(fresh);

        const result = await requestLiquidity(
          provider,
          { pubkey: FRESH.pubkey, address: FRESH.address, amount: ckb(fundCkb) },
          { onState: (state) => send({ phase: "state", state, elapsedMs: elapsed() }) },
        );
        send({
          phase: "ready",
          channelId: result.channelId,
          inboundAdded: result.inboundAdded,
          elapsedMs: elapsed(),
        });

        send({ phase: "invoice", elapsedMs: elapsed() });
        const invoice = await fresh.newInvoice(ckb(wantCkb), "fiberfill dashboard");

        send({ phase: "paying", elapsedMs: elapsed() });
        const pay = await provider.sendPayment(invoice.invoice_address);
        let status = pay.status;
        const deadline = Date.now() + 120000;
        while (status !== "Success" && Date.now() < deadline) {
          await sleep(2500);
          status = (await provider.getPayment(pay.payment_hash)).status;
          if (status === "Failed") break;
        }
        if (status !== "Success") throw new Error(`payment did not settle (status ${status})`);

        await sleep(2000);
        const heldAfter = await freshHeld(fresh);
        send({
          phase: "paid",
          held: Math.round(heldAfter * 100) / 100,
          gained: Math.round((heldAfter - heldBefore) * 100) / 100,
          want: wantCkb,
          elapsedMs: elapsed(),
        });
        send({ phase: "done", elapsedMs: elapsed() });
      } catch (err) {
        send({ phase: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
