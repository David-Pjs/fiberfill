# FiberFill

## Register
product

## Product purpose
FiberFill is an on-demand inbound liquidity toolkit (an LSP, Liquidity Service Provider layer) for the CKB Fiber Network. A brand new Fiber node cannot receive a single payment, because on a payment channel network you can only be paid through a channel that someone else has already funded with capacity pointing toward you. A fresh merchant has no such channel, so the network has no path to deliver money to them. FiberFill closes that gap on demand: a node asks whether it can receive, a provider auto-opens a funded channel toward it, and it can be paid immediately.

The dashboard exists to make that invisible mechanic visible in one screen: a node that structurally cannot be paid, made payable while you watch, then actually paid, all against live testnet nodes with nothing mocked.

## Users
- Fiber and CKB developers evaluating whether this belongs in their stack
- Wallet and merchant-tool builders who need their users to receive on day one
- Liquidity providers who want to offer inbound capacity as a service
- For the hackathon: judges deciding if FiberFill is real infrastructure, in under three minutes

## The money-shot flow (the reason the dashboard exists)
1. A fresh node is shown as unable to receive (zero inbound capacity)
2. Request Liquidity is triggered
3. A provider opens a funded channel toward the fresh node, and its state advances live: NegotiatingFunding, CollaboratingFundingTx, AwaitingTxSignatures, AwaitingChannelReady, ChannelReady
4. The node can now receive
5. A real invoice is raised and paid, and the balance moves from 0 to 50 CKB

## Tone and voice
Precise, infrastructural, honest. It reads like a well-set technical document that happens to be alive. No hype, no crypto-bro register, no growth-marketing language. State what is true. Technical values (pubkeys, channel ids, states, balances) are shown as exact truth, not decorated.

## Brand direction
Warm paper. The surface feels like heavy off-white stock under daylight, not a dark trading terminal. Editorial restraint: typography and spacing carry it, decoration is earned. Fraunces as the display serif for framing and the balance figure; a clean body face and a monospace for technical truth. One reserved accent for the single beat that matters, the moment capacity arrives and the payment lands.

## Anti-references (do not look like these)
- Crypto dashboards: neon on black, glowing charts, ticker strips
- SaaS landing template: centered hero, gradient blob, three stat tiles, one CTA
- Glassmorphism cards and floating orbs
- Dashboard-by-numbers: sidebar plus uniform card grid plus donut charts with no point of view
- Inter or system-ui as the display font
- Fake or placeholder data. Everything shown is read from live nodes.

## Strategic principles
- The demo is the argument. The screen must earn belief in under three minutes.
- Nothing mocked. Every value is live from a real testnet node. If a node is offline, say so honestly.
- Simple, not simplistic. One screen, one clear sequence, no feature sprawl.
- No em dashes anywhere, in UI copy, code, or docs.
