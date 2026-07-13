"use client";

import React, { useState, useEffect, useMemo } from "react";
import { US, STATES, FINDS } from "@/lib/data";

const KEY = "where-next:v6";

const C = {
  ink: "#12100E",
  paper: "#EFEDE6",
  card: "#FFFFFF",
  text: "#191714",
  soft: "#6E6961",
  faint: "#A09A91",
  rule: "#DAD6CC",
  pine: "#1E6B54",
  amber: "#C08A1E",
  rust: "#A8412A",
};

const DISPLAY = "'Futura','Avenir Next','Century Gothic','Trebuchet MS',sans-serif";
const BODY = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const STAGE = {
  early: { c: C.pine, label: "Still early", blurb: "Cheap because nobody's looking, not because it's broken." },
  heating: { c: C.amber, label: "Heating up", blurb: "Found. Not finished. There's a window." },
  late: { c: C.rust, label: "Priced in", blurb: "The first movers already made their money." },
};

const EXAMPLES = [
  "Small town, near a beach, near Disney, $400k",
  "Mountains, remote work, under $300k",
  "College town, walkable, no car needed",
  "Warm, low taxes, good hospital, retiring soon",
];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const under = (price, budget) => Math.max(0, Math.min(1, (budget - num(price)) / (budget * 0.4) + 0.5));

export default function WhereNext() {
  const [tab, setTab] = useState("search");
  const [lastState, setLastState] = useState("FL");
  const [budget, setBudget] = useState(400000);
  const [wts, setWts] = useState({});
  const [marks, setMarks] = useState({});
  const [found, setFound] = useState({});
  const [search, setSearch] = useState(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [tuning, setTuning] = useState(false);
  const [busy, setBusy] = useState("");
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
        setSearch(d.search || null);
        if (d.q) setQ(d.q);
        if (d.budget) setBudget(d.budget);
      }
    } catch {}
    setReady(true);
  }, []);

  const save = (next) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ wts, marks, found, search, q, budget, ...next }));
    } catch {}
  };

  const ALL_STATES = useMemo(() => ({ ...STATES, ...found }), [found]);
  const isSearch = tab === "search";
  const isFind = tab === "find";
  const isState = !isSearch && !isFind;
  const S = isSearch ? search : isState ? ALL_STATES[tab] : null;
  const key = isSearch ? "__search" : tab;

  const w = useMemo(() => {
    if (!S) return null;
    const saved = wts[key] || {};
    const out = { price: num(saved.price ?? 4) };
    (S.criteria || []).forEach((k) => { out[k.id] = num(saved[k.id] ?? 3); });
    return out;
  }, [S, wts, key]);

  const setWeight = (id, v) => {
    const next = { ...wts, [key]: { ...w, [id]: num(v) } };
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
    if (t !== "find" && t !== "search") setLastState(t);
    setOpen(null);
    setErr("");
  };

  const ask = async (body, label) => {
    setBusy(label);
    setErr("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      setErr(e.message);
      return null;
    } finally {
      setBusy("");
    }
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    const data = await ask({ want: q }, "search");
    if (data) {
      setSearch(data);
      setTab("search");
      setOpen(null);
      save({ search: data, q });
    }
  };

  const researchState = async (abbr) => {
    const data = await ask({ abbr }, abbr);
    if (data) {
      const next = { ...found, [abbr]: data };
      setFound(next);
      save({ found: next });
    }
  };

  const ranked = useMemo(() => {
    if (!S || !w) return [];
    const crit = S.criteria || [];
    const total = num(w.price) + crit.reduce((a, k) => a + num(w[k.id]), 0);
    return (S.towns || [])
      .map((t) => {
        if (total <= 0) return { ...t, score: 0 };
        let sum = under(t.price, budget) * num(w.price);
        crit.forEach((k) => { sum += (num(t.scores?.[k.id]) / 5) * num(w[k.id]); });
        return { ...t, score: sum / total };
      })
      .sort((a, b) => b.score - a.score);
  }, [S, w, budget]);

  const everyTown = useMemo(() => {
    const fromStates = Object.entries(ALL_STATES).flatMap(([k, s]) =>
      (s.towns || []).map((t) => ({ ...t, st: k }))
    );
    const fromSearch = (search?.towns || []).map((t) => ({ ...t, st: "" }));
    return [...fromStates, ...fromSearch, ...FINDS.map((f) => ({ ...f, st: "" }))];
  }, [ALL_STATES, search]);

  const shortlist = everyTown.filter((t) => marks[t.id] === "yes");
  const doneCount = Object.keys(ALL_STATES).length;

  if (!ready) return <div style={{ background: C.ink, minHeight: "100vh" }} />;

  return (
    <div style={{ fontFamily: BODY, background: C.paper, color: C.text, minHeight: "100vh" }}>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0}
        .lbl{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.faint}}
        .tab{background:transparent;border:0;color:rgba(255,255,255,.42);font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:14px 0;margin-right:28px;cursor:pointer;font-family:${BODY};position:relative}
        .tab[data-on="1"]{color:#fff}
        .tab[data-on="1"]:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:${C.amber}}
        .hero{width:100%;background:transparent;border:0;border-bottom:2px solid rgba(255,255,255,.25);color:#fff;font-family:${DISPLAY};font-size:26px;padding:12px 0;outline:none}
        .hero::placeholder{color:rgba(255,255,255,.28)}
        .hero:focus{border-bottom-color:${C.amber}}
        .find{background:${C.amber};border:0;color:${C.ink};font-weight:600;font-size:15px;padding:14px 26px;border-radius:2px;cursor:pointer;white-space:nowrap;font-family:${BODY}}
        .find:disabled{opacity:.45;cursor:default}
        .eg{background:transparent;border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.5);font-size:12px;padding:6px 11px;border-radius:99px;cursor:pointer;font-family:${BODY}}
        .eg:hover{border-color:rgba(255,255,255,.45);color:#fff}
        .st{font-family:${MONO};font-size:11px;padding:7px 0;width:38px;cursor:pointer;border-radius:2px;background:transparent}
        .card{background:${C.card};border:1px solid ${C.rule};border-radius:3px;margin-bottom:14px;overflow:hidden;transition:box-shadow .15s,transform .15s}
        .card:hover{box-shadow:0 8px 30px rgba(18,16,14,.10);transform:translateY(-1px)}
        .head{display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;font-family:${BODY};padding:0}
        .chip{background:transparent;border:1px solid ${C.rule};color:${C.soft};font-size:12px;padding:8px 13px;border-radius:99px;cursor:pointer;font-family:${BODY}}
        .chip[data-on="1"]{background:${C.ink};color:#fff;border-color:${C.ink}}
        .go{display:inline-block;padding:10px 15px;border-radius:2px;background:${C.ink};color:#fff;font-size:13px;text-decoration:none}
        button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid ${C.amber};outline-offset:2px}
        input[type=range]{-webkit-appearance:none;appearance:none;height:2px;background:${C.rule};border-radius:2px;width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${C.ink};cursor:pointer}
        input[type=range]::-moz-range-thumb{width:16px;height:16px;border:0;border-radius:50%;background:${C.ink};cursor:pointer}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        .working{animation:pulse 1.4s ease-in-out infinite}
        @media (max-width:640px){ .split{grid-template-columns:1fr !important} .hero{font-size:20px} }
      `}</style>

      <div style={{ background: C.ink, color: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "34px 20px 0" }}>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 46, margin: 0, letterSpacing: "-.015em", lineHeight: 1 }}>Where Next</h1>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: "12px 0 30px", maxWidth: 500, lineHeight: 1.55 }}>
            Zillow tells you what's for sale. This tells you whether you should want it — and whether you're already too late.
          </p>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="lbl" style={{ color: "rgba(255,255,255,.4)", marginBottom: 6 }}>What are you looking for?</div>
              <input
                className="hero"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && runSearch()}
                placeholder="Small town, near a beach, near Disney, $400k"
              />
            </div>
            <button className="find" disabled={!!busy || !q.trim()} onClick={runSearch}>
              {busy === "search" ? "Searching…" : "Find towns"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
            {EXAMPLES.map((e) => (
              <button key={e} className="eg" onClick={() => setQ(e)}>{e}</button>
            ))}
          </div>

          {busy === "search" && (
            <p className="working" style={{ fontSize: 13, color: C.amber, marginTop: 18 }}>
              Reading listings, local news and hiring pages across the country. Give it a minute — it's doing real searches.
            </p>
          )}
          {err && !busy && <p style={{ fontSize: 13, color: "#E8907E", marginTop: 18, lineHeight: 1.5 }}>{err}</p>}

          <div style={{ display: "flex", marginTop: 26, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
            <button className="tab" data-on={isSearch ? "1" : "0"} onClick={() => go("search")}>Your search</button>
            <button className="tab" data-on={isState ? "1" : "0"} onClick={() => go(lastState)}>By state</button>
            <button className="tab" data-on={isFind ? "1" : "0"} onClick={() => go("find")}>Never heard of it</button>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,.3)", padding: "14px 0" }}>{doneCount}/50</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 20px 70px" }}>
        {isSearch && !search && !busy && (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <p style={{ fontFamily: DISPLAY, fontSize: 25, color: C.soft, margin: "0 auto", maxWidth: 470, lineHeight: 1.45 }}>
              Say what you actually want. It'll find five towns that fit — and tell you what's wrong with each one.
            </p>
          </div>
        )}

        {isState && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 26 }}>
            {Object.keys(US).map((k) => {
              const done = !!ALL_STATES[k];
              const on = tab === k;
              return (
                <button key={k} className="st" onClick={() => go(k)} title={US[k]}
                  style={{
                    border: `1px solid ${on ? C.ink : done ? C.pine : "transparent"}`,
                    background: on ? C.ink : done ? "rgba(30,107,84,.08)" : "transparent",
                    color: on ? "#fff" : done ? C.pine : C.faint,
                    fontWeight: done ? 700 : 400,
                  }}>
                  {k}
                </button>
              );
            })}
          </div>
        )}

        {isState && !S && (
          <div style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "40px 28px", textAlign: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, marginBottom: 12 }}>{US[tab]}, unmapped</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: C.soft, maxWidth: 450, margin: "0 auto 24px" }}>
              Nobody's asked for it yet. Send it out and it'll find five towns — real prices, who's actually hiring, the carrying cost
              this state has that nobody quotes you, and the honest reasons not to move there.
            </p>
            <button className="find" disabled={!!busy} onClick={() => researchState(tab)} style={{ background: C.ink, color: "#fff" }}>
              {busy === tab ? `Researching ${US[tab]}…` : `Research ${US[tab]}`}
            </button>
            <div className="lbl" style={{ marginTop: 16 }}>Takes a minute. It's doing real searches.</div>
            {err && <p style={{ color: C.rust, fontSize: 13, marginTop: 20, lineHeight: 1.5 }}>{err}</p>}
          </div>
        )}

        {S && (
          <>
            <p style={{ fontFamily: DISPLAY, fontSize: 23, lineHeight: 1.4, margin: "0 0 24px", maxWidth: 640 }}>{S.blurb}</p>

            <div style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3, marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px" }}>
                <span className="lbl" style={{ whiteSpace: "nowrap" }}>Budget</span>
                <input type="range" min="120000" max="900000" step="10000" value={budget}
                  onChange={(e) => { const v = Number(e.target.value); setBudget(v); save({ budget: v }); }}
                  style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 19, minWidth: 62, textAlign: "right" }}>${Math.round(budget / 1000)}k</span>
              </div>
              <div style={{ borderTop: `1px solid ${C.rule}` }}>
                <button onClick={() => setTuning(!tuning)}
                  style={{ width: "100%", background: "transparent", border: 0, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: BODY }}>
                  <span className="lbl">What matters most</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>{tuning ? "Hide" : "Adjust"}</span>
                </button>
                {tuning && (
                  <div style={{ padding: "0 16px 16px" }}>
                    {[{ id: "price", label: "Under budget" }, ...(S.criteria || [])].map((k) => (
                      <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0" }}>
                        <span style={{ width: 165, fontSize: 13, color: w[k.id] === 0 ? C.faint : C.text }}>{k.label}</span>
                        <input type="range" min="0" max="5" value={w[k.id]} onChange={(e) => setWeight(k.id, e.target.value)} style={{ flex: 1 }} />
                        <span style={{ fontFamily: MONO, fontSize: 12, width: 12, textAlign: "right", color: w[k.id] === 0 ? C.rule : C.text }}>{w[k.id]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {ranked.map((t, i) => (
              <Card key={t.id} t={t} st={isState ? tab : ""} rank={i + 1} score={t.score} open={open === t.id}
                toggle={() => setOpen(open === t.id ? null : t.id)} mark={mark} marks={marks} budget={budget} />
            ))}

            <Footer notes={S.footer} live={isSearch || !!found[tab]} label={isSearch ? "This search" : US[tab]} data={S} />
          </>
        )}

        {isFind && (
          <>
            <p style={{ fontFamily: DISPLAY, fontSize: 23, lineHeight: 1.4, margin: "0 0 28px", maxWidth: 640 }}>
              Every town found so far, sorted by how early you'd be. The difference between a find and a mistake is usually just timing.
            </p>
            {["early", "heating", "late"].map((s) => {
              const rows = everyTown.filter((t) => t.stage === s);
              if (!rows.length) return null;
              return (
                <div key={s} style={{ marginBottom: 36 }}>
                  <div style={{ borderTop: `3px solid ${STAGE[s].c}`, paddingTop: 12, marginBottom: 16 }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 21, color: STAGE[s].c }}>{STAGE[s].label}</div>
                    <div style={{ fontSize: 13, color: C.soft, marginTop: 3 }}>{STAGE[s].blurb}</div>
                  </div>
                  {rows.map((t) => (
                    <Card key={t.id + t.st} t={t} st={t.st} open={open === t.id + t.st}
                      toggle={() => setOpen(open === t.id + t.st ? null : t.id + t.st)} mark={mark} marks={marks} budget={budget} />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {shortlist.length > 0 && (
          <div style={{ marginTop: 36, background: C.ink, borderRadius: 3, padding: "20px 22px" }}>
            <div className="lbl" style={{ color: "rgba(255,255,255,.42)", marginBottom: 12 }}>Your shortlist</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {shortlist.map((t) => (
                <span key={t.id + t.st} style={{ border: "1px solid rgba(255,255,255,.22)", color: "#fff", borderRadius: 99, padding: "7px 14px", fontSize: 13 }}>
                  {t.name} <span style={{ fontFamily: MONO, color: "rgba(255,255,255,.45)", marginLeft: 5 }}>{t.priceLabel}</span>
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
    <div className="card" style={{ borderColor: m === "yes" ? C.pine : C.rule }}>
      <div style={{ display: "flex" }}>
        <div style={{ width: 6, background: stage.c, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button className="head" onClick={toggle} style={{ padding: "20px 20px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  {rank && <span style={{ fontFamily: MONO, fontSize: 13, color: C.faint }}>{String(rank).padStart(2, "0")}</span>}
                  <span style={{ fontFamily: DISPLAY, fontSize: 29, letterSpacing: "-.015em" }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{t.sub}</div>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase",
                color: "#fff", background: stage.c, borderRadius: 99, padding: "6px 11px", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {stage.label}
              </span>
            </div>

            <p style={{ fontSize: 16, lineHeight: 1.55, margin: "14px 0 18px", maxWidth: 580 }}>{t.hook}</p>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 28, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "-.02em", color: over ? C.rust : C.text, lineHeight: 1 }}>
                  {t.priceLabel}
                </div>
                <div className="lbl" style={{ marginTop: 6 }}>Typical home</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 14, color: C.soft, lineHeight: 1.3, maxWidth: 190 }}>{t.delta}</div>
                <div className="lbl" style={{ marginTop: 6 }}>Direction</div>
              </div>
              {Number.isFinite(score) && (
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontFamily: MONO, fontSize: 21, lineHeight: 1 }}>{Math.round(score * 100)}</div>
                  <div className="lbl" style={{ marginTop: 6 }}>Fit</div>
                  <div style={{ height: 3, width: 76, background: C.paper, marginTop: 7, borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${Math.max(0, Math.min(100, score * 100))}%`, background: stage.c }} />
                  </div>
                </div>
              )}
            </div>

            {t.note && (
              <div style={{ fontSize: 13, color: C.soft, marginTop: 16, lineHeight: 1.5, paddingTop: 13, borderTop: `1px solid ${C.paper}` }}>
                {t.note}
              </div>
            )}
          </button>

          {open && (
            <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.rule}` }}>
              {t.verified === false && (
                <p style={{ fontSize: 13, color: C.rust, paddingTop: 14, margin: 0, lineHeight: 1.5 }}>
                  Too few sales for a reliable median. Treat the figure as a starting point and check real listings.
                </p>
              )}

              <Sec label="Why you've never heard of it">
                <p style={{ fontFamily: DISPLAY, fontSize: 19, lineHeight: 1.5, margin: 0 }}>{t.never}</p>
              </Sec>

              <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <div>
                  <Sec label="History"><p style={P}>{t.history}</p></Sec>
                  <Sec label="Why it's turning"><Bullets items={t.why} /></Sec>
                </div>
                <div>
                  <Sec label="Who's hiring"><p style={P}>{t.jobs}</p></Sec>
                  <Sec label="What you get">
                    <p style={P}>{t.get}</p>
                    {t.cost && <p style={{ ...P, color: C.soft, marginTop: 8, fontSize: 13 }}>{t.cost}</p>}
                  </Sec>
                </div>
              </div>

              {t.doing && <Sec label="Things to do"><Bullets items={t.doing} /></Sec>}

              <div style={{ background: "rgba(168,65,42,.05)", border: "1px solid rgba(168,65,42,.22)", borderRadius: 2, padding: "14px 16px", marginTop: 18 }}>
                <div className="lbl" style={{ color: C.rust, marginBottom: 9 }}>But —</div>
                <Bullets items={t.watch} color={C.rust} />
              </div>

              <Sec label="What's for sale right now"><Listings t={t} st={st} budget={budget} /></Sec>

              <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
                <button className="chip" data-on={m === "yes" ? "1" : "0"} onClick={() => mark(t.id, "yes")}>Contender</button>
                <button className="chip" data-on={m === "no" ? "1" : "0"} onClick={() => mark(t.id, "no")}>Not for me</button>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginLeft: "auto" }}>{(t.sources || []).join(" · ")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Listings({ t, st, budget }) {
  const cap = Math.round(budget / 1000) + "000";
  const q = encodeURIComponent(`${t.name} ${st || (t.sub || "").split("·")[0]}`);
  const links = [
    { name: "Zillow", url: `https://www.zillow.com/${t.z}/` },
    { name: "Realtor.com", url: `https://www.realtor.com/realestateandhomes-search/${t.r}/price-na-${cap}` },
    { name: "Redfin", url: `https://www.redfin.com/search?q=${q}` },
  ];
  return (
    <div>
      <p style={{ ...P, color: C.soft, fontSize: 13, marginBottom: 12 }}>
        Live listings in {t.name}, capped at ${Math.round(budget / 1000)}k. Get the real insurance quote and the real tax bill on the
        real house before anything else.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {links.map((l) => (
          <a key={l.name} className="go" href={l.url} target="_blank" rel="noopener noreferrer">{l.name} →</a>
        ))}
      </div>
    </div>
  );
}

function Footer({ notes, live, label, data }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div style={{ marginTop: 36, background: C.ink, borderRadius: 3, padding: "26px 24px", color: "#fff" }}>
      <div className="lbl" style={{ color: "rgba(255,255,255,.42)", marginBottom: 16 }}>What nobody puts in the listing</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {(notes || []).map((n, i) => (
          <li key={i} style={{ display: "flex", gap: 14, fontSize: 14, lineHeight: 1.6, marginBottom: 13, color: "rgba(255,255,255,.74)" }}>
            <span style={{ color: C.amber, fontFamily: MONO, fontSize: 12, paddingTop: 3 }}>{String(i + 1).padStart(2, "0")}</span>
            <span>{n}</span>
          </li>
        ))}
      </ul>
      {live && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.13)" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)", margin: 0, lineHeight: 1.55 }}>
            {label} was researched live and is saved in your browser only. Check the numbers, then paste it into <code>lib/data.js</code> to make it permanent for everyone.
          </p>
          <button onClick={copy}
            style={{ marginTop: 12, background: "transparent", border: "1px solid rgba(255,255,255,.28)", color: "#fff", borderRadius: 99, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: BODY }}>
            {copied ? "Copied" : "Copy as JSON"}
          </button>
        </div>
      )}
    </div>
  );
}

const P = { fontSize: 14, lineHeight: 1.6, color: C.text, margin: 0 };

function Sec({ label, children }) {
  return (
    <div style={{ paddingTop: 18 }}>
      <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Bullets({ items, color }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {(items || []).map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.55, marginBottom: 7 }}>
          <span style={{ color: color || C.pine, flexShrink: 0 }}>—</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
