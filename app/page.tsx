"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WANT_PRESETS } from "@/src/nodes";

type Provider = {
  label: string;
  online: boolean;
  maxOfferCkb: number;
};

type NodeState = {
  online: boolean;
  pubkeyShort: string;
  want: number;
  canReceive?: { ok: boolean; inbound: number; needed: number; shortfall: number; reason: string };
  held?: number;
  channelCount?: number;
  providers?: Provider[];
  error?: string;
};

type EventKind = "muted" | "pending" | "win" | "normal";
type TimelineEvent = { id: string; name: string; sub?: string; time: string; kind: EventKind };

type ProviderView = {
  online: boolean;
  label: string;
  address: string;
  faucet: string;
  onchainCkb?: number | null;
  committedInboundCkb?: number;
  openChannels?: number;
  maxOfferCkb?: number | null;
  error?: string;
};

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export default function Page() {
  const [node, setNode] = useState<NodeState | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [display, setDisplay] = useState(0);
  const [landed, setLanded] = useState(false);
  const [pv, setPv] = useState<ProviderView | null>(null);
  const [copied, setCopied] = useState(false);
  const [want, setWant] = useState<number>(WANT_PRESETS[0]);
  const rafRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    const res = await fetch(`/api/state?want=${want}`, { cache: "no-store" });
    const data: NodeState = await res.json();
    setNode(data);
    if (!running) {
      setDisplay(data.held ?? 0);
      setLanded(Boolean(data.canReceive?.ok));
    }
  }, [running, want]);

  const loadProvider = useCallback(async () => {
    const res = await fetch("/api/provider", { cache: "no-store" });
    setPv((await res.json()) as ProviderView);
  }, []);

  useEffect(() => {
    loadState();
    loadProvider();
  }, [loadState, loadProvider]);

  const copyAddress = useCallback(async () => {
    if (!pv) return;
    try {
      await navigator.clipboard.writeText(pv.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [pv]);

  const countTo = useCallback((target: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round((from + (target - from) * eased) * 100) / 100);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const run = useCallback(() => {
    setEvents([]);
    setDisplay(0);
    setLanded(false);
    setRunning(true);
    setPhase("running");

    const es = new EventSource(`/api/run?want=${want}`);
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data) as Record<string, unknown>;
      const phaseName = e.phase as string;
      const at = secs((e.elapsedMs as number) ?? 0);

      if (phaseName === "connect") {
        push({ id: "connect", name: "connect to provider", time: at, kind: "muted" });
      } else if (phaseName === "state") {
        const state = e.state as string;
        if (state === "ChannelReady") return;
        push({ id: `s-${state}`, name: state, time: at, kind: "pending" });
      } else if (phaseName === "ready") {
        push({
          id: "ready",
          name: "ChannelReady",
          sub: `+${e.inboundAdded} CKB inbound`,
          time: at,
          kind: "win",
        });
      } else if (phaseName === "invoice") {
        push({ id: "invoice", name: "fresh node raises an invoice", time: at, kind: "muted" });
      } else if (phaseName === "paying") {
        push({ id: "paying", name: "provider pays", time: at, kind: "pending" });
      } else if (phaseName === "paid") {
        push({ id: "paid", name: "paid", sub: `+${e.gained} CKB received`, time: at, kind: "win" });
        setLanded(true);
        countTo(e.held as number);
      } else if (phaseName === "done") {
        es.close();
        setRunning(false);
        setPhase("done");
        loadState();
        loadProvider();
      } else if (phaseName === "error") {
        es.close();
        setRunning(false);
        setPhase("error");
        push({ id: "error", name: `stopped: ${e.message as string}`, time: at, kind: "normal" });
      }
    };
    es.onerror = () => {
      es.close();
      setRunning(false);
      setPhase((p) => (p === "done" ? p : "error"));
    };
  }, [countTo, loadState, loadProvider, want]);

  useEffect(() => {
    if (!running && !resetting) loadState();
  }, [want, running, resetting, loadState]);

  const push = (ev: TimelineEvent): void =>
    setEvents((prev) => (prev.some((p) => p.id === ev.id) ? prev : [...prev, ev]));

  const reset = useCallback(async () => {
    setResetting(true);
    setEvents([]);
    try {
      await fetch("/api/reset", { method: "POST" });
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        const res = await fetch("/api/state", { cache: "no-store" });
        const data: NodeState = await res.json();
        setNode(data);
        if (data.canReceive && !data.canReceive.ok) {
          setDisplay(0);
          setLanded(false);
          setPhase("idle");
          break;
        }
      }
    } finally {
      setResetting(false);
      loadProvider();
    }
  }, [loadProvider]);

  if (!node) {
    return (
      <main className="shell">
        <p className="hint">reading the fresh node...</p>
      </main>
    );
  }

  const able = node.canReceive?.ok ?? false;
  const canRunFromEmpty = node.online && !able;

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1 className="wordmark">FiberFill</h1>
          <p className="tagline">On-demand inbound liquidity for the CKB Fiber Network</p>
        </div>
        <span className="status">
          <span className={`dot ${node.online ? "" : "off"}`} />
          {node.online ? "testnet, fresh node live" : "fresh node offline"}
        </span>
      </header>

      <hr className="rule" />

      {!node.online ? (
        <div className="notice">
          The fresh node is not reachable. Start it with the command in fiber-lab/NODES.md, then reload.
        </div>
      ) : (
        <>
          <section>
            <p className="eyebrow">
              The node
              <span className="who">
                {node.pubkeyShort}
              </span>
            </p>
            <p className={`verdict ${able ? "able" : ""}`}>
              {able ? "Ready to receive" : "Cannot receive yet"}
            </p>
            <p className="verdict-note">{node.canReceive?.reason}</p>

            {canRunFromEmpty && !running && (
              <div className="amounts" role="group" aria-label="Amount to request">
                {WANT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    className={`chip ${want === preset ? "on" : ""}`}
                    onClick={() => setWant(preset)}
                    disabled={resetting}
                  >
                    {preset} CKB
                  </button>
                ))}
              </div>
            )}

            <div className="actions">
              <button onClick={run} disabled={running || resetting || !canRunFromEmpty}>
                {running ? "opening channel, live..." : `Request ${want} CKB inbound`}
              </button>
              {able && (
                <button className="ghost" onClick={reset} disabled={running || resetting}>
                  {resetting ? "closing channel, returning to empty..." : "Reset to empty"}
                </button>
              )}
            </div>
            {able && !running && (
              <p className="hint">
                This node already has inbound from an earlier run. Reset to empty to watch the
                whole sequence from a true zero.
              </p>
            )}
          </section>

          {(events.length > 0 || phase !== "idle") && (
            <>
              <hr className="rule" />
              <section>
                <p className="eyebrow">What happens</p>
                <div className="timeline">
                  {events.map((ev) => (
                    <div key={ev.id} className={`event ${ev.kind}`}>
                      <span className="marker">{ev.kind === "win" ? "✓" : "·"}</span>
                      <span className="name">
                        {ev.name}
                        {ev.sub && <span className="sub">{ev.sub}</span>}
                      </span>
                      <span className="time">{ev.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <hr className="rule" />
          <section className="balance-wrap">
            <p className="eyebrow">Balance held by the fresh node</p>
            <p className={`balance ${landed ? "landed" : ""}`}>
              {display.toFixed(2)}
              <span className="unit">CKB</span>
            </p>
          </section>

          {pv && (
            <>
              <hr className="rule" />
              <section className="operator">
                <p className="eyebrow">
                  The provider
                  <span className="who">
                    {pv.label}, {pv.online ? "online" : "offline"}
                  </span>
                </p>

                {pv.online ? (
                  <>
                    <div className="op-figure">
                      <span className="op-num">
                        {pv.onchainCkb != null ? pv.onchainCkb.toLocaleString() : "unknown"}
                      </span>
                      <span className="op-unit">CKB on-chain</span>
                    </div>
                    <p className="op-meta">
                      capacity to offer, funding {pv.committedInboundCkb} CKB of inbound across{" "}
                      {pv.openChannels} channel(s)
                      {pv.maxOfferCkb != null && `, offers up to ${pv.maxOfferCkb} CKB per request`}
                    </p>

                    <div className="fund">
                      <p className="fund-label">Fund the provider</p>
                      <div className="fund-row">
                        <code className="addr">{pv.address}</code>
                        <button className="ghost small" onClick={copyAddress}>
                          {copied ? "copied" : "copy"}
                        </button>
                      </div>
                      <p className="hint">
                        Send testnet CKB to this address to raise capacity, then it updates here. No
                        CLI, no keys held by FiberFill.{" "}
                        <a href={pv.faucet} target="_blank" rel="noreferrer">
                          Testnet faucet
                        </a>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="notice">The provider node is not reachable right now.</div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
