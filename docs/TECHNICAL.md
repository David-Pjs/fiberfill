# FiberFill technical breakdown

FiberFill is a thin, honest layer over the Fiber node RPC. It adds no consensus, no
custody, and no on-chain contract of its own. Its value is in sequencing a set of Fiber
RPC calls correctly and handling the behaviours that are not in any quickstart.

## System shape

```
@fiberfill/core (src/)          the toolkit: typed RPC client + LSP logic, no UI
  rpc.ts        FiberRpc: typed wrapper over the node JSON-RPC
  core.ts       requestLiquidity, canReceive
  providers.ts  listProviders (registry + live cross-check)
  nodes.ts      the demo's node config, env-overridable for a hosted deploy

dashboard (app/)                Next.js App Router, server-rendered
  api/state     live verdict + balance + provider directory
  api/run       Server-Sent Events: channel states + payment, streamed as they happen
  api/provider  provider on-chain capacity + committed inbound
  api/reset     cooperative channel close, returns a node to zero inbound
  page.tsx      one editorial screen, hardcoded to the target node for a clean sequence
```

Node RPC is only ever called server-side. The browser talks to the API routes, never to
a Fiber node directly, so no node RPC endpoint is exposed to the client.

## The Fiber RPC surface wrapped

`FiberRpc` (src/rpc.ts) wraps the calls the LSP flow needs, each returning typed results:
`node_info`, `list_channels`, `connect_peer`, `open_channel`, `new_invoice`,
`send_payment`, `get_payment`, `shutdown_channel`. Amounts cross the wire as `0x` hex
shannons; 1 CKB is 100,000,000 shannons.

## canReceive

The pre-check. It reads the target's channels and sums `remote_balance` across the ones
that are both `enabled` and in state `ChannelReady`, then compares that to the requested
amount.

The subtlety is which side of the channel to read. `remote_balance` is the
counterparty's stake, which is exactly the capacity that can flow **toward** this node,
so it is the true measure of what the node can receive. Summing `local_balance` instead
would answer the opposite question. The call returns `{ ok, inbound, needed, shortfall,
reason }` so a caller gets a clean yes or no and the exact gap.

## requestLiquidity

The heart. Given a provider node and a request `{ pubkey, address, amount }`:

1. Snapshot the provider's current channel ids, so the new channel can be identified by
   the id that was not there before.
2. Open the channel to the target, retrying through the peer-handshake window (see
   below).
3. Poll `list_channels` until the new channel reaches `ChannelReady`, emitting each state
   transition to an `onState` callback as it happens.
4. Return `{ channelId, state, inboundAdded }`, where `inboundAdded` is the provider's
   `local_balance` on the new channel, which is the inbound the target gained.

`open_channel` takes the target's node `pubkey` (not its peer id) plus `funding_amount`
as hex shannons. It returns before the channel has formed, so its returned id cannot be
trusted; the snapshot-diff plus polling to the exact `ChannelReady` state is the reliable
signal.

## The empty-node peer-drop behaviour, and the fix

This is the non-obvious part, learned by running it.

A Fiber node that has **zero channels** does not hold a manually opened peer connection.
`connect_peer` returns as soon as the connection is initiated, the Init handshake (the
feature-bit exchange) completes a few seconds later, and then, with no channel to anchor
the session, the link **drops** within about a minute. A node with an open channel keeps
its peer link alive automatically because the channel requires it.

This bites precisely the scenario FiberFill exists for: the target is empty by
definition, so at the moment you need to open the first channel to it, the peer link is
the least stable it will ever be. `open_channel` against a dropped link fails with
`Invalid parameter: Peer ...'s feature not found, waiting for peer to send Init message`.

The fix, in `requestLiquidity`, is to treat that error as transient and, on every retry,
**re-issue `connect_peer` before re-attempting `open_channel`**. Each iteration rebuilds
the dropped link and tries to open a channel in the brief window while it is up, until
one attempt lands (default window 120s). A failed open at this stage is a parameter
rejection, so no channel is created and nothing leaks. From a genuinely cold, empty
target this takes about 45 seconds of reconnect attempts before the channel opens; from a
warm peer it proceeds immediately. The operator warm-up run in [../DEMO.md](../DEMO.md)
keeps the link warm so a judge sees the fast path.

## Reserve economics

A Fiber channel acceptor must lock roughly 99 CKB of its own as the on-chain
commitment-cell reserve, even for a one-way channel. So a literally empty node cannot
even hold a channel side, and the target must hold that reserve before it can accept.

This reframes what FiberFill provides. It is not money for a broke node, because every
node needs that reserve just to exist. What it provides is the **inbound capacity**, the
receivable side that only a counterparty can fund. Funding a 300 CKB channel leaves the
provider about 201 CKB of local balance pointing at the target after the reserve, which
is the 201 CKB of inbound the target gains. The relationship is direct and predictable:
provider funds X, target receives roughly X minus the reserve of inbound.

## Channel state machine and timing

The observed path for an on-demand open is `NegotiatingFunding`,
`CollaboratingFundingTx`, `AwaitingTxSignatures`, `ChannelReady`. The trap is acting on a
near-miss state; the channel is not usable until the exact `ChannelReady`. The long leg
is `AwaitingTxSignatures`, where the funding transaction confirms on-chain, about a
minute on testnet. End to end an open plus payment is roughly 60 to 90 seconds warm, and
about 150 seconds cold because of the reconnect window above.

## Provider capacity, read-only

`/api/provider` reports what a provider can still offer versus what it has already
committed, using two different reads. On-chain capacity, the funds it can still deploy,
comes from the public CKB indexer's `get_cells_capacity` against the provider's funding
lock script. Committed inbound, what it has already handed out, comes from summing
`local_balance` across its `ChannelReady` channels. Both are read-only; FiberFill never
signs anything on-chain.

## Reset

`/api/reset` cooperatively closes the target's `ChannelReady` channels with
`shutdown_channel`, settling their balances on-chain and returning the node to zero
inbound so the empty-to-paid sequence can run again from a true start. This is what makes
the demo repeatable.

## Trust model

FiberFill custodies nothing and signs nothing on-chain. It reads public chain and node
state, and the single state-changing action is the provider opening a channel it elects
to open, funded from its own balance. A node embedding the toolkit runs its own RPC; the
toolkit never asks for a key.
