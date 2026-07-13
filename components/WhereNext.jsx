"use client";

import React, { useState, useEffect, useMemo } from "react";
import { US, STATES, FINDS } from "@/lib/data";

const KEY = "where-next:v5";

const C = {
  paper: "#EDEEEA", card: "#FFFFFF", ink: "#1C2B26", soft: "#5F6E68",
  rule: "#CFD4CC", pine: "#2E6B5E", clay: "#9C5A3C", sun: "#B08D2E",
};
const DISPLAY = "Futura,'Avenir Next','Century Gothic','Trebuchet MS',sans-serif";
const BODY = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const STAGE = {
  early: { c: C.pine, label: "Still early", note: "Cheap because nobody's looking, not because it's broken." },
  heating: { c: C.sun, label: "Heating up", note: "Found. Not finished. There's a window." },
  late: { c: C.clay, label: "Priced in", note: "The first movers already made their money." },
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const under = (price, budget) => Math.max(0, Math.min(1, (budget - num(price)) / (budget * 0.4) + 0.5));

export default function WhereNext() {
  const [tab, setTab] = useState("FL");
  const [lastState, setLastState] = useState("FL");
  const [budget, setBudget] = useState(400000);
  const [wts, setWts] = useState({});
  const [marks, setMarks] = useState({});
  const [found, setFound] = useState({});   // states researched live
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setWts(d.wts || {});
        setMarks(d.marks || {});
        setFound(d.found || {});
        if (d.budget) setBudget(d.budget);
      }
    } catch {}
    setReady(true);
  }, []);

  const save = (next) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ wts, marks, found, budget, ...next }));
    } catch {}
  };

  const ALL_STATES = useMemo(() => ({ ...STATES, ...found }), [found]);
  const isState = tab !== "find";
  const S = isState ? ALL_STATES[tab] : null;

  const w = useMemo(() => {
    if (!S) return null;
    const saved = wts[tab] || {};
    const out = { price: num(saved.price ?? 4) };
    S.criteria.forEach((k) => { out[k.id] = num(saved[k.id] ?? 3); });
    return out;
  }, [S, wts, tab]);

  const setWeight = (id, v) => {
    const next = { ...wts, [tab]: { ...w, [id]: num(v) } };
    setWts(next);
    save({ wts: next });
  };
  const mark = (id, v) => {
    const next = { ...marks, [id]: marks[id] === v ? null : v };
    setMarks(next);
    save({ marks: next });
  };
  const go = (t) => {
    setTab(t);
    if (t !== "find") setLastState(t);
    setOpen(null);
    setErr("");
  };

  const research = async (abbr) => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abbr }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const next = { ...found, [abbr]: data };
      setFound(next);
      save({ found: next });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const ranked = useMemo(() => {
    if (!S || !w) return [];
    const total = num(w.price) + S.criteria.reduce((a, k) => a + num(w[k.id]), 0);
    return (S.towns || [])
      .map((t) => {
        if (total <= 0) return { ...t, score: 0 };
        let sum = under(t.price, budget) * num(w.price);
        S.criteria.forEach((k) => {
          sum += (num(t.scores?.[k.id]) / 5) * num(w[k.id]);
        });
        return { ...t, score: sum / total };
      })
      .sort((a, b) => b.score - a.score);
  }, [S, w, budget]);

  const everyTown = useMemo(() => {
    const fromStates = Object.entries(ALL_STATES).flatMap(([k, s]) =>
      (s.towns || []).map((t) => ({ ...t, st: k }))
    );
    return [...fromStates, ...FINDS.map((f) => ({ ...f, st: "" }))];
  }, [ALL_STATES]);

  const shortlist = everyTown.filter((t) => marks[t.id] === "yes");
  const doneCount = Object.keys(ALL_STATES).length;
  const shell = { fontFamily: BODY, background: C.paper, color: C.ink, minHeight: "100vh", padding: "22px 16px 48px" };

  if (!ready) return <div style={{ ...shell, color: C.soft }}>Loading…</div>;

  return (
    <div style={shell}>
      <style>{`
        .chip{background:transparent;border:1px solid ${C.rule};color:${C.soft};font-family:${BODY};font-size:12px;padding:7px 11px;border-radius:2px;cursor:pointer}
        .chip[data-on="1"]{background:${C.ink};color:${C.paper};border-color:${C.ink}}
        .tab{background:transparent;border:0;border-bottom:2px solid transparent;color:${C.soft};font-size:12px;letter-spacing:.09em;text-transform:uppercase;padding:9px 0;margin-right:20px;cursor:pointer;font-family:${BODY};white-space:nowrap}
        .tab[data-on="1"]{color:${C.ink};border-bottom-color:${C.ink}}
        .btn{background:${C.ink};border:1px solid ${C.ink};color:${C.paper};font-family:${BODY};font-size:14px;padding:13px 18px;border-radius:2px;cursor:pointer}
        .btn:disabled{opacity:.45;cursor:default}
        button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid ${C.pine};outline-offset:2px}
        .lbl{font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.soft}}
        input[type=range]{-webkit-appearance:none;appearance:none;height:2px;background:${C.rule};border-radius:2px;width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${C.ink};cursor:pointer}
        input[type=range]::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:50%;background:${C.ink};cursor:pointer}
      `}</style>

      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 30, margin: 0, letterSpacing: ".02em" }}>Where next</h1>

        <div style={{ borderBottom: `1px solid ${C.rule}`, margin: "14px 0", display: "flex" }}>
          <button className="tab" data-on={isState ? "1" : "0"} onClick={() => go(lastState)}>By state</button>
          <button className="tab" data-on={tab === "find" ? "1" : "0"} onClick={() => go("find")}>Never heard of it</button>
        </div>

        {isState && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span className="lbl">Pick a state</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.soft }}>{doneCount} of 50 researched</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.keys(US).map((k) => {
                const done = !!ALL_STATES[k];
                const on = tab === k;
                return (
                  <button key={k} onClick={() => go(k)} title={US[k]}
                    style={{
                      fontFamily: MONO, fontSize: 11, padding: "6px 8px", cursor: "pointer", borderRadius: 2, minWidth: 34,
                      border: `1px solid ${on ? C.ink : done ? C.pine : C.rule}`,
                      background: on ? C.ink : "transparent",
                      color: on ? C.paper : done ? C.pine : "#B9BFB8",
                      fontWeight: done ? 600 : 400,
                    }}>
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isState && !S && (
          <div style={{ background: C.card, border: `1px dashed ${C.rule}`, borderRadius: 3, padding: "26px 18px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, marginBottom: 8 }}>{US[tab]} hasn't been researched yet</div>
            <p style={{ ...P, color: C.soft, maxWidth: 470 }}>
              Nobody's asked for it. Tap below and it'll go and find five towns — real prices, who's actually hiring, the hidden
              carrying cost this state has that nobody quotes you, and the honest reasons not to move there.
            </p>
            <p style={{ ...P, color: C.soft, marginTop: 10, fontSize: 13 }}>Takes a minute or two. It's doing real searches.</p>
            <button className="btn" disabled={busy} onClick={() => research(tab)} style={{ marginTop: 16 }}>
              {busy ? `Researching ${US[tab]}…` : `Research ${US[tab]}`}
            </button>
            {err && (
              <p style={{ ...P, color: C.clay, marginTop: 14, fontSize: 13 }}>{err}</p>
            )}
          </div>
        )}

        {isState && S && (
          <>
            <p style={{ color: C.soft, fontSize: 13, margin: "0 0 18px", lineHeight: 1.55, maxWidth: 510 }}>{S.blurb}</p>

            <div style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3, padding: 14, marginBottom: 22 }}>
              <div className="lbl" style={{ marginBottom: 8 }}>Budget</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <input type="range" min="120000" max="900000" step="10000" value={budget}
                  onChange={(e) => { const v = Number(e.target.value); setBudget(v); save({ budget: v }); }} />
                <span style={{ fontFamily: MONO, fontSize: 17, minWidth: 56, textAlign: "right" }}>${Math.round(budget / 1000)}k</span>
              </div>

              <div className="lbl" style={{ margin: "18px 0 4px" }}>What matters</div>
              {[{ id: "price", label: "Under budget" }, ...S.criteria].map((k) => (
                <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, margin: "9px 0" }}>
                  <span style={{ width: 150, fontSize: 13 }}>{k.label}</span>
                  <input type="range" min="0" max="5" value={w[k.id]} onChange={(e) => setWeight(k.id, e.target.value)} style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 12, width: 14, textAlign: "right", color: w[k.id] === 0 ? C.rule : C.ink }}>{w[k.id]}</span>
                </div>
              ))}
            </div>

            {ranked.map((t, i) => (
              <Card key={t.id} t={t} st={tab} rank={i + 1} score={t.score} open={open === t.id}
                toggle={() => setOpen(open === t.id ? null : t.id)} mark={mark} marks={marks} budget={budget} />
            ))}

            <Footer notes={S.footer} live={!!found[tab]} state={US[tab]} data={S} />
          </>
        )}

        {!isState && (
          <>
            <p style={{ color: C.soft, fontSize: 13, margin: "0 0 20px", lineHeight: 1.55, maxWidth: 510 }}>
              Every town on every board, sorted by how early you'd be. The difference between a find and a mistake is usually just timing.
            </p>
            {["early", "heating", "late"].map((s) => (
              <div key={s} style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STAGE[s].c }} />
                  <span className="lbl" style={{ color: STAGE[s].c }}>{STAGE[s].label}</span>
                  <span style={{ fontSize: 12, color: C.soft }}>{STAGE[s].note}</span>
                </div>
                {everyTown.filter((t) => t.stage === s).map((t) => (
                  <Card key={t.id + t.st} t={t} st={t.st} open={open === t.id + t.st}
                    toggle={() => setOpen(open === t.id + t.st ? null : t.id + t.st)} mark={mark} marks={marks} budget={budget} />
                ))}
              </div>
            ))}
          </>
        )}

        {shortlist.length > 0 && (
          <div style={{ marginTop: 28, borderTop: `1px solid ${C.rule}`, paddingTop: 16 }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Your shortlist</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {shortlist.map((t) => (
                <span key={t.id + t.st} style={{ border: `1px solid ${C.pine}`, color: C.pine, borderRadius: 20, padding: "5px 12px", fontSize: 13 }}>
                  {t.name} · {t.priceLabel}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ t, st, rank, score, open, toggle, mark, marks, budget }) {
  const m = marks[t.id];
  const stage = STAGE[t.stage] || STAGE.heating;
  const over = t.price && t.price > budget;
  return (
    <div style={{ background: C.card, border: `1px solid ${m === "yes" ? C.pine : C.rule}`, borderLeft: `3px solid ${stage.c}`, borderRadius: 3, marginBottom: 10 }}>
      <button onClick={toggle} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 15, cursor: "pointer", fontFamily: BODY }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          {rank && <span style={{ fontFamily: MONO, fontSize: 12, color: C.soft }}>{String(rank).padStart(2, "0")}</span>}
          <span style={{ fontFamily: DISPLAY, fontSize: 21 }}>{t.name}</span>
          <span style={{ fontSize: 12, color: C.soft }}>{t.sub}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: stage.c, marginLeft: "auto" }}>{stage.label}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, margin: "8px 0 10px" }}>{t.hook}</div>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <Fig v={t.priceLabel} l="typical home" warn={over} strong />
          <Fig v={t.delta} l="direction" />
          {Number.isFinite(score) && <Fig v={Math.round(score * 100)} l="fit" strong />}
        </div>
        {t.note && <div style={{ fontSize: 12, color: C.soft, marginTop: 8, lineHeight: 1.4 }}>{t.note}</div>}
        {Number.isFinite(score) && (
          <div style={{ height: 3, background: C.paper, marginTop: 12 }}>
            <div style={{ height: 3, width: `${Math.max(0, Math.min(100, score * 100))}%`, background: C.ink }} />
          </div>
        )}
      </button>

      {open && (
        <div style={{ padding: "0 15px 15px", borderTop: `1px solid ${C.rule}` }}>
          {t.verified === false && (
            <p style={{ ...P, color: C.clay, paddingTop: 12 }}>
              Too few sales for a reliable median. Treat the figure as a starting point and check real listings.
            </p>
          )}
          <Sec label="Why you've never heard of it"><p style={P}>{t.never}</p></Sec>
          <Sec label="History"><p style={P}>{t.history}</p></Sec>
          <Sec label="Why it's turning"><Bullets items={t.why} /></Sec>
          <Sec label="Who's hiring"><p style={P}>{t.jobs}</p></Sec>
          <Sec label="What you get">
            <p style={P}>{t.get}</p>
            {t.cost && <p style={{ ...P, color: C.soft, marginTop: 6, fontSize: 13 }}>{t.cost}</p>}
          </Sec>
          {t.doing && <Sec label="Things to do"><Bullets items={t.doing} /></Sec>}
          <Sec label="Watch out"><Bullets items={t.watch} color={C.clay} /></Sec>
          <Sec label="What's for sale right now"><Listings t={t} st={st} budget={budget} /></Sec>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
            <button className="chip" data-on={m === "yes" ? "1" : "0"} onClick={() => mark(t.id, "yes")}>Contender</button>
            <button className="chip" data-on={m === "no" ? "1" : "0"} onClick={() => mark(t.id, "no")}>Not for me</button>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.soft, marginLeft: "auto" }}>{(t.sources || []).join(" · ")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Listings({ t, st, budget }) {
  const cap = Math.round(budget / 1000) + "000";
  const links = [
    { name: "Zillow", url: `https://www.zillow.com/${t.z}/` },
    { name: "Realtor.com", url: `https://www.realtor.com/realestateandhomes-search/${t.r}/price-na-${cap}` },
    { name: "Redfin", url: `https://www.redfin.com/search?q=${encodeURIComponent(`${t.name} ${st}`)}` },
  ];
  return (
    <div>
      <p style={{ ...P, color: C.soft, marginBottom: 10 }}>
        Opens the live market in {t.name}, capped at ${Math.round(budget / 1000)}k. Get the actual insurance quote and the actual
        tax bill on the actual house.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {links.map((l) => (
          <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "9px 14px", border: `1px solid ${C.ink}`, borderRadius: 2, background: C.ink, color: C.paper, fontSize: 13, textDecoration: "none" }}>
            {l.name} →
          </a>
        ))}
      </div>
    </div>
  );
}

function Footer({ notes, live, state, data }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div style={{ borderTop: `1px solid ${C.rule}`, marginTop: 24, paddingTop: 16 }}>
      <div className="lbl" style={{ marginBottom: 8 }}>What nobody puts in the listing</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {(notes || []).map((n, i) => (
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.55, marginBottom: 8, color: C.soft }}>
            <span style={{ color: C.clay }}>—</span>
            <span>{n}</span>
          </li>
        ))}
      </ul>
      {live && (
        <div style={{ marginTop: 14, padding: 12, border: `1px solid ${C.rule}`, borderRadius: 2 }}>
          <p style={{ ...P, fontSize: 13, color: C.soft, margin: 0 }}>
            {state} was researched live and is saved in your browser only. Check it, then paste it into <code>lib/data.js</code> to
            make it permanent for everyone.
          </p>
          <button className="chip" onClick={copy} style={{ marginTop: 10 }}>
            {copied ? "Copied" : "Copy this state as JSON"}
          </button>
        </div>
      )}
    </div>
  );
}

function Fig({ v, l, warn, strong }) {
  const shown = v == null || (typeof v === "number" && !Number.isFinite(v)) ? "—" : String(v);
  // The researcher sometimes writes a sentence where a figure belongs. Don't let it wreck the row.
  const long = shown.length > 22;
  return (
    <div style={{ minWidth: 0, flex: long ? "1 1 100%" : "0 0 auto" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: long ? 12 : strong ? 15 : 13,
          color: warn ? C.clay : C.ink,
          whiteSpace: long ? "normal" : "nowrap",
          lineHeight: 1.35,
        }}
      >
        {shown}
      </div>
      <div style={{ fontSize: 10, color: C.soft, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 1, whiteSpace: "nowrap" }}>{l}</div>
    </div>
  );
}

const P = { fontSize: 14, lineHeight: 1.55, color: C.ink, margin: 0 };

function Sec({ label, children }) {
  return (
    <div style={{ padding: "13px 0", borderBottom: `1px solid ${C.rule}` }}>
      <div className="lbl" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Bullets({ items, color }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {(items || []).map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 8, fontSize: 14, lineHeight: 1.5, marginBottom: 5 }}>
          <span style={{ color: color || C.pine }}>—</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
