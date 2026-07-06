# FiberFill Design

## Theme
Light. The scene: a Fiber developer at a desk in daylight, reading FiberFill like a piece of technical documentation that happens to be live, deciding whether to trust it. Warm paper under daylight forces light, and it deliberately rejects the crypto-dark reflex that this category defaults to.

## Color strategy
Restrained. Warm tinted neutrals carry the whole surface, with a single accent reserved for the one beat that matters: capacity arriving and the payment landing. OKLCH throughout. No pure black or white; every neutral is tinted warm.

### Tokens (OKLCH)
- `--paper`: oklch(97% 0.012 85)        warm off-white background, the stock
- `--paper-sunk`: oklch(94.5% 0.014 85) recessed panel, slightly deeper paper
- `--ink`: oklch(24% 0.02 60)           warm near-black text
- `--ink-soft`: oklch(45% 0.02 60)      secondary text
- `--ink-faint`: oklch(62% 0.015 65)    tertiary, labels, meta
- `--rule`: oklch(87% 0.014 80)         hairline borders and dividers
- `--accent`: oklch(58% 0.13 150)       the arrival beat: ChannelReady and paid. A considered, slightly desaturated green, not a neon signal green
- `--accent-soft`: oklch(92% 0.04 150)  accent wash for the success surface
- `--pending`: oklch(70% 0.09 75)       in-flight channel states, a warm amber, quieter than the accent

Accent stays under about 10 percent of the surface. It appears only on the live/success beat, never as decoration.

## Typography
- Display: Fraunces (variable serif). Used for the page title, section framing, and the large balance figure. High optical size, real character. Weight and size carry hierarchy.
- Body: a clean humanist sans for prose and labels. Keep it quiet so Fraunces and the mono do the talking.
- Mono: a monospace for technical truth: pubkeys, channel ids, channel states, shannon and CKB values. Technical values are always mono so they read as exact.
- Scale contrast at least 1.25 between steps. The balance figure is deliberately large; labels are deliberately small and set in the faint ink.

## Layout
- One screen. No sidebar, no tabs, no card grid. An editorial single column with deliberate asymmetry, not centered SaaS symmetry.
- The node in focus reads like a document header: who it is (pubkey, short), and its current verdict (cannot receive / can receive).
- The empty-to-paid sequence is a vertical progression that fills in live, not a row of identical cards. Each stage is a line in a timeline with its own state and timestamp.
- Vary spacing for rhythm. Generous space around the balance figure and the verdict; tighter around technical rows.
- Monospace technical rows sit on the sunk paper panel to separate live truth from framing prose.

## Motion
- Channel states advance through the timeline as they arrive from the live node. Each new state eases in (ease-out-expo), the prior one settles to a resolved style.
- The balance counts up from 0 to its landed value once the payment settles, over about 600ms, ease-out-quart.
- The accent arrives, it does not pulse or glow. One clean transition at ChannelReady and one at paid.
- No animation of layout properties. Transform and opacity only. Respect prefers-reduced-motion: states still update, they just do not animate.

## Components
- Verdict line: the node's current receivability, in Fraunces, with a mono sub-line of the exact shortfall or inbound figure.
- Live timeline: the channel-opening stages, each a row with state name (mono), a small state marker, and elapsed time.
- Balance figure: large Fraunces numeral, mono unit, counts up on settle.
- Provider row: from the directory, shown as a plain labeled line with online status, not a card.
- Honest offline state: if a node or provider is unreachable, the UI says so plainly rather than faking data.

## Bans (in addition to the shared laws)
- No em dashes in any copy.
- No neon, no glow, no dark terminal styling.
- No stat-tile hero row, no donut charts, no glassmorphism.
- No placeholder or seeded-fake values. Live only, honest offline states.
