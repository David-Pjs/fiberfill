# FiberFill

On-demand inbound liquidity for the CKB Fiber Network.

A brand new Fiber node cannot receive a single payment. Not because of a bug, but
because of how payment channels work: to be paid, someone else must have already opened
a channel with capacity pointing toward you. A fresh node has no such channel, so the
network has no path to deliver money to it. FiberFill closes that gap on demand. A node
asks whether it can receive, a provider auto-opens a funded channel toward it, and it
can be paid immediately.

Built for the "Gone in 60ms: Fiber Network Infrastructure Hackathon", Category 3
(Merchant, Liquidity, LSP, Multi-Asset). MIT licensed. Nothing in the demo is mocked.

## The gap it fills

Fiber's own material points at a Liquidity Service Provider (LSP) plus submarine-swap
direction for liquidity, but the developer tooling for it is unbuilt. FiberFill builds
the on-demand inbound-liquidity half: a request-liquidity call, a provider that
auto-opens a funded channel, a pre-check that answers "can this node receive X yet", and
a provider directory.

This is deliberately the lane the core team left open. Issue
[nervosnetwork/fiber#1255](https://github.com/nervosnetwork/fiber/issues/1255) (the
Fiber Native Agent Protocol) explicitly lists liquidity provisioning, LSP models, and
inbound channel funding as **out** of its scope and tells agent builders to avoid it.
FiberFill is infrastructure for exactly that carve-out, so it composes with the agent
protocol rather than colliding with it. See [docs/GAP.md](docs/GAP.md) for the full
writeup.

## What it is

A small toolkit other nodes and wallets embed, plus a dashboard that makes the invisible
mechanic visible in one screen.

```
@fiberfill/core          typed Fiber RPC client + the LSP logic
  canReceive(rpc, amount)          reads live channels, returns yes/no + exact shortfall
  requestLiquidity(provider, req)  connect_peer -> open_channel -> poll to ChannelReady,
                                   returns { channelId, inboundAdded }
  listProviders()                  provider directory, cross-checked against live nodes

dashboard (Next.js)      the money-shot: pick a node, watch it go from
                         "cannot receive" to a funded channel to a landed payment, live

server API routes        wrap the toolkit so node RPC stays server-side
  /api/state    live verdict + balance + provider directory
  /api/run      SSE stream of channel states and the payment as they happen
  /api/provider provider on-chain capacity + committed inbound
  /api/reset    cooperatively closes channels to return a node to zero inbound
```

FiberFill holds no keys and signs nothing on-chain. The only privileged action in the
whole system is the provider opening a channel it chooses to open.

## Quickstart

Requires two running `fnn` nodes on CKB testnet (a provider and a target). Full node
setup is in [../fiber-lab/NODES.md](../fiber-lab/NODES.md); the demo run itself, with
timing and the warm-up step, is in [DEMO.md](DEMO.md).

```bash
npm install

# point the toolkit at your nodes (defaults to localhost:8337 / :8357)
export PROVIDER_RPC=http://127.0.0.1:8337
export FRESH_RPC=http://127.0.0.1:8357

# verify the toolkit reaches the nodes
npm run smoke

# the LSP calls, each against live nodes
npm run canreceive     # can this node receive X yet?
npm run providers      # the provider directory
npm run request        # request liquidity: provider opens a funded channel

# the full unattended proof: empty node -> funded -> real payment lands
npm run harden

# the dashboard
npm run dev            # http://localhost:3000 (or :3001 if 3000 is taken)
```

## How the money-shot works

1. A fresh node is shown as unable to receive: zero inbound capacity.
2. Request Liquidity is triggered.
3. The provider connects to the node and opens a funded channel toward it. Its state
   advances live: `NegotiatingFunding`, `CollaboratingFundingTx`, `AwaitingTxSignatures`,
   `ChannelReady`.
4. The node can now receive. FiberFill re-checks and confirms.
5. A real invoice is raised and the provider pays it. The balance moves from 0 to 50 CKB.

Everything is read from and written to real testnet nodes. If a node is offline, the UI
says so rather than faking data.

## Why auto channel-open instead of submarine swap

Channel-open gives a brand new node inbound capacity instantly, with no existing channel
and no on-chain swap round trip. Submarine swaps rebalance liquidity a node already has,
which a fresh node does not, so they solve a later problem. Channel-open is the
bootstrap; swap-based rebalancing is on the roadmap for nodes that are already running.

## Architecture and technical breakdown

See [docs/TECHNICAL.md](docs/TECHNICAL.md) for the RPC surface, the internals of each
call, the reserve economics, the channel state machine, and the hard-won node behaviours
(including why an empty node drops its peer link and how the toolkit handles it).

## Roadmap

FiberFill's scope is deliberately the bootstrap mechanic, done well. The rest is
sequenced after the hackathon:

- **Pricing and quotes.** A provider sets a price for inbound capacity; `requestLiquidity`
  negotiates and settles the fee.
- **Provider reputation.** Track uptime, fill rate, and channel longevity so a node can
  choose a provider it can trust, not just one that is online.
- **Submarine-swap rebalancing.** For nodes that already have channels, rebalance
  liquidity without opening a new one.
- **Multi-asset.** Extend beyond CKB to UDT-denominated inbound capacity.
- **Decentralized discovery.** Move the provider directory from a registry file to
  on-graph announcements so discovery needs no central list.

## AI allowance

Built with AI assistance under a human-driven loop: every piece was specified before it
was written, tested live against real nodes with no mocks, and explained back before it
was committed. The author can account for every file and every design decision.

## License

MIT. Fully open, embed it freely.
