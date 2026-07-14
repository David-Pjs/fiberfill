# The Fiber gap FiberFill fills

## The problem

A payment channel network can only deliver money to you through a channel that already
has capacity pointing toward you. That capacity is called inbound liquidity, and a brand
new node has none of it. So a fresh Fiber node cannot receive a single payment, no matter
how correctly it is configured or how much of its own money it holds.

This is not an edge case. It is the first thing that happens to every new participant:
every merchant, every wallet user, every service that wants to be paid over Fiber hits it
on day one. It is the on-ramp problem for the entire network, and it is structural, not a
bug that gets fixed in a release.

It also fails visibly. At a Lagos meetup an exhibitor's audience could not pay his Fiber
demo, because none of them had nodes with channels funded toward it. The mechanic was
fine; there was simply no inbound path. That is the exact gap this toolkit closes.

## Why the reserve is not the answer

It is tempting to think the fix is giving a new node some coins. It is not. Every Fiber
node, funded or empty, must lock roughly 99 CKB of its own as the channel reserve just to
hold a channel side. Having your own money still does not let you receive, because
receiving needs capacity pointed **at** you, which only a counterparty can create. The
missing thing is never the node's own balance; it is the inbound side of a channel that
someone else has to fund. That is what an LSP provides, and it is what FiberFill
automates.

## Why this lane is open

The Fiber core team is building the Fiber Native Agent Protocol, tracked in
[nervosnetwork/fiber#1255](https://github.com/nervosnetwork/fiber/issues/1255). That
issue explicitly places liquidity provisioning, LSP models, and inbound channel funding
**out of scope** and tells agent builders to avoid that direction. The material also
gestures at an LSP-plus-submarine-swap approach to liquidity, but the developer tooling
for it does not exist yet.

So the inbound-liquidity bootstrap is both fundamental and unclaimed: the core team has
said it is not theirs to build, and no tooling fills it. FiberFill takes exactly that
lane. It does not compete with the agent protocol; it provides the liquidity layer that
protocol assumes but does not supply, so the two compose.

## What FiberFill contributes

- **requestLiquidity**: a node asks a provider for inbound capacity and the provider
  auto-opens a funded channel toward it, on demand, no manual RPC choreography.
- **canReceive**: a pre-check that answers "can this node receive X yet" so a caller
  only requests liquidity when it actually needs to.
- **listProviders**: a provider directory so a node can find who to ask in the first
  place, which is the one piece a manual proof always did by hand.
- **A live dashboard**: the empty-to-paid moment made visible against real testnet
  nodes, so the gap and its fix can be seen, not just described.

## Why it becomes part of the stack

Anything that wants to be paid over Fiber on day one needs this: wallets onboarding
users, merchant tools, agent frameworks that assume their agents can receive. It is not a
consumer app on top of Fiber; it is infrastructure other builders embed so their own
users can receive from the start. That is the definition of the category, and it is the
axis this hackathon rewards: does it become part of the stack.
