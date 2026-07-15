# FiberFill demo video script

Target length: 90 seconds to 2 minutes. Structure: problem, then the live money-shot,
then one line on impact. The demo is the argument, so most of the runtime is the live
screen.

## Before you record

1. Bring up the provider (8337) and target (8357) nodes and `npm run dev`.
2. Do one warm-up run (Request, reach "Ready to receive", then Reset to empty). This
   keeps the peer link warm so the recorded open takes the fast path, about 60 to 90
   seconds, not the cold 150.
3. Have the page on "Cannot receive yet / 0.00 CKB" before you hit record.
4. In editing, you can speed-ramp the `AwaitingTxSignatures` wait (the on-chain funding
   confirmation) so the video stays tight. Never cut it entirely; the point is that it is
   real and on-chain.

---

## The script

**[0:00 - 0:12] The problem. On screen: the dashboard at "Cannot receive yet", 0.00 CKB.**

> "This is a brand new node on the CKB Fiber Network. It cannot receive a single payment.
> Not because of a bug, but because on a payment channel network, you can only be paid
> through a channel someone else has already funded toward you. A fresh node has none. So
> the network has no way to pay it."

**[0:12 - 0:25] What FiberFill is. On screen: stay on the verdict, hover the Request button.**

> "FiberFill fixes that on demand. It is a toolkit that lets a node ask for inbound
> capacity, and a provider opens and funds a channel toward it, live. Nothing here is
> mocked. These are two real nodes on testnet."

**[0:25 - 1:20] The live money-shot. On screen: click Request, let the timeline run.**

> "I click Request. FiberFill connects to the provider and opens a funded channel toward
> this node."
>
> (as the states appear)
> "You can watch it happen: negotiating the funding, collaborating on the funding
> transaction, then awaiting signatures while that transaction confirms on-chain. This is
> a real channel forming on real testnet, which is why it takes about a minute."
>
> (at ChannelReady)
> "Channel ready. The provider just funded around 200 CKB of inbound capacity toward a
> node that a minute ago could receive nothing."

**[1:20 - 1:40] The payment lands. On screen: verdict flips green, balance counts to 50.00.**

> "Now the node raises a real invoice and the provider pays it. The verdict flips to Ready
> to receive, and the balance moves from zero to fifty CKB. A node that structurally could
> not be paid has just been paid, on demand."

**[1:40 - 2:00] Trust and impact. On screen: scroll to the provider panel.**

> "FiberFill holds no keys and signs nothing on-chain. The only privileged action is the
> provider opening a channel it chooses to open. Anything that wants to be paid over Fiber
> on day one needs this: wallets, merchant tools, agent frameworks. It is the inbound
> liquidity layer the ecosystem is missing, and it is built to be embedded. That is
> FiberFill."

---

## Optional closing line (if you have room)

> "And why open a channel instead of a submarine swap? Because channel-open gives a brand
> new node inbound instantly, with no existing channel and no on-chain swap round trip.
> Swap-based rebalancing is for nodes that already have liquidity. That is on the roadmap."

## Delivery notes

- Read it plainly. The design is calm and honest; match that. No hype voice.
- Let the silence breathe during the on-chain wait rather than filling it. The real wait
  is part of the credibility.
- Say the exact numbers on screen (200 CKB inbound, 0 to 50 CKB). Precision reads as
  truth.
