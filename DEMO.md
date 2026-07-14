# Running the FiberFill demo

This is the operator and judge guide for the live money-shot: an empty node, unable
to receive a payment, made payable on demand and then paid, live on CKB testnet with
nothing mocked.

## What the judge needs

Nothing. No node, no wallet, no testnet coins. The demo runs entirely against the
operator's two nodes. The provider node already holds the on-chain balance that funds
the channel, so the judge only opens the page and clicks one button.

(FiberFill is a toolkit other nodes embed, so a judge can optionally point their own
node at the provider to request liquidity for real. That is the product path, not the
demo path. The dashboard is the self-contained demo.)

## What the operator does (before the judging window)

The judging window is notified in advance, so the nodes do not need to run 24/7. Bring
everything up a few minutes before, and do one warm-up run so the judge sees the fast
path.

1. Start the two nodes the demo uses (commands in `../fiber-lab/NODES.md`):
   - provider, RPC `8337`
   - fresh, RPC `8357`
   Confirm both answer:
   ```
   curl -s -X POST http://127.0.0.1:8337 -H 'content-type: application/json' \
     -d '{"id":1,"jsonrpc":"2.0","method":"node_info","params":[]}'
   ```
2. Start the dashboard: `npm run dev` (it uses port 3001 if 3000 is taken).
3. Fund the provider if it is low. Its on-chain balance is its capacity to offer; each
   run spends ~300 CKB of it. The dashboard's provider panel shows the live balance and
   the address, or use the testnet faucet.
4. **Warm-up run (important).** Open the dashboard, click **Request 50 CKB inbound**,
   let it reach "Ready to receive", then click **Reset to empty**. This leaves the
   provider and fresh node peered, so the judge's run takes the fast path instead of the
   slow cold-start reconnect.

## The judge flow

1. Open the dashboard URL.
2. The node reads **"Cannot receive yet"** with a balance of **0.00 CKB**. This is the
   whole point: a fresh node cannot receive a payment because no channel points inbound
   capacity toward it.
3. Click **Request 50 CKB inbound**.
4. Watch the live timeline under "What happens": the provider connects to the node and
   opens a funded channel, which moves through `NegotiatingFunding`,
   `CollaboratingFundingTx`, `AwaitingTxSignatures`, and finally `ChannelReady`. Then an
   invoice is raised and the provider pays it.
5. The verdict flips to **"Ready to receive"** and the balance counts up to **50.00
   CKB**. The node that could not be paid has now been paid, live.
6. To run it again from a true zero, click **Reset to empty** and repeat.

## What to expect on timing

The channel is opened and confirmed on-chain on live testnet, so this takes time. It is
not instant and it is not hung.

- **Warm** (peer link already up, e.g. right after the warm-up run): about 60 to 90
  seconds end to end.
- **Cold** (a freshly reset, genuinely empty node): about 150 seconds. A node with no
  channels does not hold its peer link, so the toolkit spends the first ~45 seconds
  re-establishing the connection (shown as `HandshakingPeer`) before the channel opens.
  This is expected and self-healing; do the warm-up run to avoid it during judging.

## If something looks stuck

- **Sitting on `HandshakingPeer`**: the empty node's peer link is being rebuilt. It
  retries for up to two minutes and then proceeds on its own. The warm-up run prevents
  this.
- **`provider ... offline`** in the provider panel: the provider node is not running or
  not reachable on `8337`. Restart it (see `../fiber-lab/NODES.md`).
- **Open channel fails after the full window**: confirm both nodes are up and the
  provider has enough on-chain balance to fund ~300 CKB.

## What is real

Everything. Two real `fnn` nodes on CKB testnet, real channels opened and confirmed
on-chain, a real invoice and a real payment. FiberFill holds no keys and signs nothing
on-chain: the only privileged action is the provider opening a channel it chooses to
open. Nothing in the path is mocked.
