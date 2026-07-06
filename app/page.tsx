"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export default function Page() {
  const [node, setNode] = useState<NodeState | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [display, setDisplay] = useState(0);
  const [landed, setLanded] = useState(false);
  const rafRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    const data: NodeState = await res.json();
    setNode(data);
    if (!running) {
      setDisplay(data.held ?? 0);
      setLanded(Boolean(data.canReceive?.ok));
    }
  }, [running]);

  useEffect(() => {
    loadState();
  }, [loadState]);

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

    const es = new EventSource("/api/run");
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
  }, [countTo, loadState]);

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
    }
  }, []);

  if (!node) {
    return (
      <main className="shell">
        <p className="hint">reading the fresh node...</p>
      </main>
    );
  }

  const provider = node.providers?.[0];
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

            <div className="actions">
              <button onClick={run} disabled={running || resetting || !canRunFromEmpty}>
                {running ? "opening channel, live..." : `Request ${node.want} CKB inbound`}
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

          {provider && (
            <>
              <hr className="rule" />
              <p className="provider">
                <span>
                  Provider <span className="name">{provider.label}</span>
                </span>
                <span>
                  {provider.online ? "online" : "offline"}, offers up to {provider.maxOfferCkb} CKB
                </span>
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
