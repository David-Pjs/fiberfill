# FiberFill

On-demand inbound liquidity for CKB Fiber Network. A brand new node cannot receive a payment until someone funds inbound capacity toward it. FiberFill is the toolkit that fixes that: a node asks for liquidity, a provider opens and funds a channel toward it, and it can receive.

Built for the "Gone in 60ms: Fiber Network Infrastructure Hackathon" (Category 3: Merchant, Liquidity, LSP, Multi-Asset).

## Status

Day 1. Typed RPC client over the Fiber node, smoke-tested live on testnet. Core mechanic (provider opens a funded channel on demand, target gains inbound capacity, payment lands) proven live, no mocks.

## The gap it fills

Fiber's own docs propose an LSP plus submarine swap approach to liquidity, but the developer tooling is unbuilt. FiberFill builds the on-demand inbound liquidity half: request, auto-open, provider directory. It does not touch the core team's agent-payment protocol (issue nervosnetwork/fiber#1255), which explicitly leaves liquidity provisioning out of scope.

## Quickstart

Coming as the toolkit lands. Requires a running Fiber node (fnn) on testnet.

## License

MIT
