"use client";

import React, { useEffect, useMemo, useState } from "react";
import { US, STATES, FINDS } from "@/lib/data";

const KEY = "where-next:v7";

const C = {
  ink: "#11130F",
  charcoal: "#1A1D18",
  cream: "#F3F0E8",
  paper: "#FAF8F2",
  card: "#FFFFFF",
  text: "#1D211B",
  soft: "#6B7067",
  faint: "#9B9F96",
  rule: "#E2DED4",
  pine: "#315D48",
  sage: "#6E8875",
  amber: "#C58B45",
  rust: "#A8573E",
  gold: "#D8B06A",
};

const DISPLAY = "Georgia,'Times New Roman',serif";
const BODY = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=88";

const SCENES = {
  early:
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=84",
  heating:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=84",
  late:
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=84",
};

const STAGE = {
  early: {
    c: C.pine,
    label: "Still early",
    blurb: "Cheap because nobody is looking, not because it is broken.",
  },
  heating: {
    c: C.amber,
    label: "Heating up",
    blurb: "Found. Not finished. There is still a window.",
  },
  late: {
    c: C.rust,
    label: "Priced in",
    blurb: "The first movers already made their money.",
  },
};

const EXAMPLES = [
  "Small town, near a beach, near Disney, $400k",
  "Mountains, lakes, small town",
  "College town, walkable, no car needed",
  "Warm, low taxes, good hospital, retiring soon",
];

const LOADING_STEPS = [
  "Reading housing listings",
  "Checking local employers",
  "Scanning local news",
  "Comparing hidden costs",
  "Ranking the strongest matches",
];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const under = (price, budget) =>
  Math.max(0, Math.min(1, (budget - num(price)) / (budget * 0.4) + 0.5));

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
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY) || window.localStorage.getItem("where-next:v6");
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

  useEffect(() => {
    if (busy !== "search") {
      setLoadingStep(0);
      return;
    }
    const timer = window.setInterval(
      () => setLoadingStep((n) => (n + 1) % LOADING_STEPS.length),
      2300
    );
    return () => window.clearInterval(timer);
  }, [busy]);

  const save = (next) => {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ wts, marks, found, search, q, budget, ...next })
      );
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
    (S.criteria || []).forEach((k) => {
      out[k.id] = num(saved[k.id] ?? 3);
    });
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
        crit.forEach((k) => {
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
    const fromSearch = (search?.towns || []).map((t) => ({ ...t, st: "" }));
    return [...fromStates, ...fromSearch, ...FINDS.map((f) => ({ ...f, st: "" }))];
  }, [ALL_STATES, search]);

  const shortlist = everyTown.filter((t) => marks[t.id] === "yes");
  const doneCount = Object.keys(ALL_STATES).length;

  if (!ready) return <div style={{ background: C.ink, minHeight: "100vh" }} />;

  return (
    <div className="app-shell">
      <style>{`
        *{box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{margin:0;background:${C.cream};color:${C.text}}
        button,input,a{font:inherit}
        .app-shell{font-family:${BODY};background:${C.cream};min-height:100vh;color:${C.text}}
        .page{max-width:1180px;margin:0 auto;padding-left:24px;padding-right:24px}
        .eyebrow{font-family:${MONO};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint}}
        .hero-wrap{position:relative;min-height:690px;color:#fff;background-image:linear-gradient(180deg,rgba(8,12,9,.42),rgba(8,12,9,.72)),url("${HERO_IMAGE}");background-size:cover;background-position:center}
        .hero-wrap:after{content:"";position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(transparent,${C.cream})}
        .nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding-top:24px}
        .brand{font-family:${DISPLAY};font-size:27px;font-weight:700;letter-spacing:-.03em}
        .nav-links{display:flex;gap:26px;align-items:center}
        .nav-link{background:transparent;border:0;color:rgba(255,255,255,.72);cursor:pointer;font-size:13px;padding:8px 0}
        .nav-link[data-on="1"]{color:#fff;border-bottom:1px solid ${C.gold}}
        .hero-content{position:relative;z-index:2;max-width:900px;padding-top:118px}
        .hero-title{font-family:${DISPLAY};font-size:clamp(54px,8vw,96px);line-height:.94;letter-spacing:-.045em;margin:0;max-width:900px;text-wrap:balance}
        .hero-copy{font-size:18px;line-height:1.65;color:rgba(255,255,255,.8);max-width:660px;margin:24px 0 0}
        .search-panel{margin-top:42px;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.4);border-radius:22px;padding:14px;display:flex;gap:12px;box-shadow:0 24px 70px rgba(0,0,0,.28);max-width:920px}
        .search-input{flex:1;min-width:0;border:0;background:transparent;color:${C.text};font-size:18px;padding:15px 16px;outline:none}
        .search-input::placeholder{color:#8A8D85}
        .search-button{border:0;background:${C.pine};color:#fff;border-radius:14px;padding:16px 24px;font-weight:700;cursor:pointer;white-space:nowrap}
        .search-button:hover{background:#274C3B}
        .search-button:disabled{opacity:.52;cursor:default}
        .examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .example{border:1px solid rgba(255,255,255,.28);background:rgba(17,19,15,.22);color:rgba(255,255,255,.85);border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;backdrop-filter:blur(7px)}
        .example:hover{background:rgba(255,255,255,.15)}
        .loading{margin-top:22px;display:flex;align-items:center;gap:12px;color:#fff;font-size:14px}
        .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.28);border-top-color:${C.gold};border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .content{position:relative;z-index:3;margin-top:-42px;padding-bottom:90px}
        .toolbar{background:${C.paper};border:1px solid rgba(70,70,60,.08);border-radius:18px;padding:12px;box-shadow:0 16px 50px rgba(22,26,20,.08);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .tab{border:0;background:transparent;color:${C.soft};border-radius:12px;padding:11px 15px;font-size:13px;cursor:pointer}
        .tab[data-on="1"]{background:${C.ink};color:#fff}
        .count{margin-left:auto;font-family:${MONO};font-size:11px;color:${C.faint};padding:0 8px}
        .intro{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;margin:50px 0 26px}
        .intro-title{font-family:${DISPLAY};font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-.035em;margin:0;max-width:780px}
        .intro-copy{color:${C.soft};font-size:15px;line-height:1.7;max-width:690px;margin:14px 0 0}
        .budget-card{background:${C.paper};border:1px solid ${C.rule};border-radius:18px;padding:18px 20px;margin-bottom:24px}
        .budget-row{display:flex;align-items:center;gap:18px}
        .budget-value{font-family:${DISPLAY};font-size:28px;min-width:90px;text-align:right}
        .tune-button{width:100%;border:0;border-top:1px solid ${C.rule};background:transparent;margin-top:16px;padding:14px 0 0;display:flex;justify-content:space-between;color:${C.soft};cursor:pointer}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;background:${C.rule}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${C.pine};cursor:pointer;box-shadow:0 0 0 4px rgba(49,93,72,.12)}
        .town-card{background:${C.card};border:1px solid ${C.rule};border-radius:24px;overflow:hidden;margin-bottom:24px;box-shadow:0 10px 35px rgba(28,34,25,.06);transition:transform .2s,box-shadow .2s}
        .town-card:hover{transform:translateY(-2px);box-shadow:0 18px 50px rgba(28,34,25,.1)}
        .town-visual{position:relative;min-height:330px;background-size:cover;background-position:center;display:flex;align-items:flex-end}
        .town-visual:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,15,11,.08),rgba(10,15,11,.82))}
        .town-overlay{position:relative;z-index:1;width:100%;padding:34px;color:#fff}
        .rank{font-family:${MONO};font-size:12px;color:rgba(255,255,255,.62);margin-bottom:10px}
        .town-name{font-family:${DISPLAY};font-size:clamp(40px,6vw,68px);letter-spacing:-.045em;line-height:.98;margin:0}
        .town-sub{margin-top:9px;color:rgba(255,255,255,.68);font-size:13px}
        .stage-pill{position:absolute;z-index:2;top:24px;right:24px;border-radius:999px;color:#fff;padding:8px 13px;font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase}
        .fit-ring{position:absolute;z-index:2;right:28px;bottom:28px;width:90px;height:90px;border-radius:50%;display:grid;place-items:center;background:rgba(12,17,13,.72);border:1px solid rgba(255,255,255,.34);backdrop-filter:blur(8px)}
        .fit-num{font-family:${DISPLAY};font-size:30px;line-height:1}
        .fit-label{font-family:${MONO};font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-top:3px;text-align:center}
        .town-summary{padding:26px 30px 24px;cursor:pointer;border:0;background:transparent;width:100%;text-align:left}
        .hook{font-family:${DISPLAY};font-size:24px;line-height:1.45;margin:0;max-width:850px}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:24px}
        .stat{background:${C.paper};border-radius:15px;padding:16px}
        .stat-value{font-family:${DISPLAY};font-size:25px;line-height:1.1}
        .stat-label{font-family:${MONO};font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:${C.faint};margin-top:7px}
        .note{color:${C.soft};font-size:13px;line-height:1.6;border-top:1px solid ${C.rule};padding-top:16px;margin-top:20px}
        .expanded{border-top:1px solid ${C.rule};padding:8px 30px 30px}
        .section{padding-top:26px}
        .section-label{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.faint};margin-bottom:10px}
        .section-title{font-family:${DISPLAY};font-size:24px;line-height:1.45;margin:0}
        .split{display:grid;grid-template-columns:1fr 1fr;gap:34px}
        .body-copy{font-size:15px;line-height:1.72;color:${C.text};margin:0}
        .bullets{list-style:none;padding:0;margin:0}
        .bullets li{display:flex;gap:10px;font-size:14px;line-height:1.6;margin-bottom:8px}
        .catch{margin-top:26px;background:#FBF2EC;border:1px solid #E8C7B8;border-radius:18px;padding:22px}
        .catch-title{font-family:${DISPLAY};font-size:27px;margin:0 0 12px;color:${C.rust}}
        .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px}
        .chip{border:1px solid ${C.rule};background:#fff;color:${C.soft};border-radius:999px;padding:10px 14px;cursor:pointer}
        .chip[data-on="1"]{background:${C.pine};border-color:${C.pine};color:#fff}
        .listing-link{display:inline-block;background:${C.ink};color:#fff;text-decoration:none;border-radius:12px;padding:11px 15px;font-size:13px}
        .state-grid{display:flex;flex-wrap:wrap;gap:7px;margin:26px 0}
        .state-button{width:44px;height:36px;border-radius:10px;background:transparent;font-family:${MONO};font-size:11px;cursor:pointer}
        .unmapped{background:${C.paper};border:1px solid ${C.rule};border-radius:22px;padding:48px 30px;text-align:center}
        .shortlist{margin-top:34px;background:${C.ink};color:#fff;border-radius:22px;padding:24px}
        .shortlist-items{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .shortlist-pill{border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 13px;font-size:13px}
        .footer-card{margin-top:38px;background:${C.ink};color:#fff;border-radius:24px;padding:30px}
        .footer-list{list-style:none;padding:0;margin:16px 0 0}
        .footer-list li{display:flex;gap:14px;color:rgba(255,255,255,.72);line-height:1.65;margin-bottom:12px}
        @media(max-width:760px){
          .page{padding-left:16px;padding-right:16px}
          .hero-wrap{min-height:720px}
          .nav-links{display:none}
          .hero-content{padding-top:105px}
          .search-panel{flex-direction:column;border-radius:18px}
          .search-button{width:100%}
          .content{margin-top:-28px}
          .intro{display:block}
          .split{grid-template-columns:1fr}
          .stats{grid-template-columns:1fr}
          .fit-ring{width:74px;height:74px;right:18px;bottom:18px}
          .town-overlay{padding:26px 22px}
          .town-summary,.expanded{padding-left:20px;padding-right:20px}
          .budget-row{flex-wrap:wrap}
          .count{display:none}
        }
      `}</style>

      <section className="hero-wrap">
        <div className="page">
          <nav className="nav">
            <div className="brand">Where Next</div>
            <div className="nav-links">
              <button className="nav-link" data-on={isSearch ? "1" : "0"} onClick={() => go("search")}>Discover</button>
              <button className="nav-link" data-on={isState ? "1" : "0"} onClick={() => go(lastState)}>Explore states</button>
              <button className="nav-link" data-on={isFind ? "1" : "0"} onClick={() => go("find")}>Hidden finds</button>
            </div>
          </nav>

          <div className="hero-content">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,.65)", marginBottom: 18 }}>
              Your honest relocation scout
            </div>
            <h1 className="hero-title">Find where your next life begins.</h1>
            <p className="hero-copy">
              
Describe your ideal life. We'll find the towns you've never considered, show you what your budget really buys, explain why people are moving there, and tell you the trade-offs before you pack a box. 
            </p>

            <div className="search-panel">
              <input
                className="search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && runSearch()}
                placeholder="Mountains, lakes, small town, under $400k..."
              />
              <button className="search-button" disabled={!!busy || !q.trim()} onClick={runSearch}>
                {busy === "search" ? "Searching..." : "Find my towns"}
              </button>
            </div>

            <div className="examples">
              {EXAMPLES.map((e) => (
                <button key={e} className="example" onClick={() => setQ(e)}>{e}</button>
              ))}
            </div>

            {busy === "search" && (
              <div className="loading">
                <span className="spinner" />
                <span>{LOADING_STEPS[loadingStep]}...</span>
              </div>
            )}
            {err && !busy && (
              <p style={{ color: "#FFD1C4", marginTop: 18, fontSize: 14 }}>{err}</p>
            )}
          </div>
        </div>
      </section>

      <main className="page content">
        <div className="toolbar">
          <button className="tab" data-on={isSearch ? "1" : "0"} onClick={() => go("search")}>Your search</button>
          <button className="tab" data-on={isState ? "1" : "0"} onClick={() => go(lastState)}>By state</button>
          <button className="tab" data-on={isFind ? "1" : "0"} onClick={() => go("find")}>Never heard of it</button>
          <span className="count">{doneCount}/50 states researched</span>
        </div>

        {isSearch && !search && !busy && (
          <div className="intro">
            <div>
              <h2 className="intro-title">Not another “best places to live” list.</h2>
              <p className="intro-copy">
                Say what you actually want. Where Next will find five towns that fit, explain why they are changing,
                and tell you exactly what is wrong with each one.
              </p>
            </div>
          </div>
        )}

        {isState && (
          <div className="state-grid">
            {Object.keys(US).map((k) => {
              const done = !!ALL_STATES[k];
              const on = tab === k;
              return (
                <button
                  key={k}
                  className="state-button"
                  onClick={() => go(k)}
                  title={US[k]}
                  style={{
                    border: `1px solid ${on ? C.ink : done ? C.pine : C.rule}`,
                    background: on ? C.ink : done ? "rgba(49,93,72,.08)" : C.paper,
                    color: on ? "#fff" : done ? C.pine : C.faint,
                    fontWeight: done ? 700 : 400,
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        )}

        {isState && !S && (
          <div className="unmapped">
            <div className="eyebrow">Unmapped state</div>
            <h2 className="intro-title" style={{ fontSize: 44, marginTop: 12 }}>{US[tab]}</h2>
            <p className="intro-copy" style={{ margin: "14px auto 24px", maxWidth: 560 }}>
              Nobody has asked for it yet. Send the scout out and it will research prices, employers,
              carrying costs, and the honest reasons not to move there.
            </p>
            <button className="search-button" disabled={!!busy} onClick={() => researchState(tab)}>
              {busy === tab ? `Researching ${US[tab]}...` : `Research ${US[tab]}`}
            </button>
          </div>
        )}

        {S && (
          <>
            <div className="intro">
              <div>
                <div className="eyebrow">Your relocation brief</div>
                <h2 className="intro-title" style={{ marginTop: 12 }}>{S.blurb}</h2>
              </div>
            </div>

            <div className="budget-card">
              <div className="budget-row">
                <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>Your budget</span>
                <input
                  type="range"
                  min="120000"
                  max="900000"
                  step="10000"
                  value={budget}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBudget(v);
                    save({ budget: v });
                  }}
                />
                <span className="budget-value">${Math.round(budget / 1000)}k</span>
              </div>
              <button className="tune-button" onClick={() => setTuning(!tuning)}>
                <span className="eyebrow">What matters most</span>
                <span>{tuning ? "Hide" : "Adjust"}</span>
              </button>
              {tuning && (
                <div style={{ paddingTop: 8 }}>
                  {[{ id: "price", label: "Under budget" }, ...(S.criteria || [])].map((k) => (
                    <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                      <span style={{ width: 170, fontSize: 13 }}>{k.label}</span>
                      <input type="range" min="0" max="5" value={w[k.id]} onChange={(e) => setWeight(k.id, e.target.value)} />
                      <span style={{ fontFamily: MONO, width: 16, textAlign: "right" }}>{w[k.id]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {ranked.map((t, i) => (
              <Card
                key={t.id}
                t={t}
                st={isState ? tab : ""}
                rank={i + 1}
                score={t.score}
                open={open === t.id}
                toggle={() => setOpen(open === t.id ? null : t.id)}
                mark={mark}
                marks={marks}
                budget={budget}
              />
            ))}

            <Footer notes={S.footer} live={isSearch || !!found[tab]} label={isSearch ? "This search" : US[tab]} data={S} />
          </>
        )}

        {isFind && (
          <>
            <div className="intro">
              <div>
                <div className="eyebrow">Discovery timing</div>
                <h2 className="intro-title" style={{ marginTop: 12 }}>
                  The difference between a find and a mistake is usually timing.
                </h2>
              </div>
            </div>

            {["early", "heating", "late"].map((s) => {
              const rows = everyTown.filter((t) => t.stage === s);
              if (!rows.length) return null;
              return (
                <section key={s} style={{ marginBottom: 42 }}>
                  <div style={{ borderTop: `4px solid ${STAGE[s].c}`, paddingTop: 14, marginBottom: 20 }}>
                    <h3 style={{ fontFamily: DISPLAY, fontSize: 32, margin: 0, color: STAGE[s].c }}>{STAGE[s].label}</h3>
                    <p style={{ color: C.soft, margin: "6px 0 0" }}>{STAGE[s].blurb}</p>
                  </div>
                  {rows.map((t) => (
                    <Card
                      key={t.id + t.st}
                      t={t}
                      st={t.st}
                      open={open === t.id + t.st}
                      toggle={() => setOpen(open === t.id + t.st ? null : t.id + t.st)}
                      mark={mark}
                      marks={marks}
                      budget={budget}
                    />
                  ))}
                </section>
              );
            })}
          </>
        )}

        {shortlist.length > 0 && (
          <div className="shortlist">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,.5)" }}>Your shortlist</div>
            <div className="shortlist-items">
              {shortlist.map((t) => (
                <span key={t.id + t.st} className="shortlist-pill">
                  {t.name} <span style={{ color: "rgba(255,255,255,.5)", marginLeft: 5 }}>{t.priceLabel}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ t, st, rank, score, open, toggle, mark, marks, budget }) {
  const m = marks[t.id];
  const stage = STAGE[t.stage] || STAGE.heating;
  const over = t.price && t.price > budget;
  const image = t.image || SCENES[t.stage] || SCENES.heating;

  return (
    <article className="town-card" style={{ borderColor: m === "yes" ? C.pine : C.rule }}>
      <div className="town-visual" style={{ backgroundImage: `url("${image}")` }}>
        <span className="stage-pill" style={{ background: stage.c }}>{stage.label}</span>
        <div className="town-overlay">
          {rank && <div className="rank">{String(rank).padStart(2, "0")} / BEST MATCHES</div>}
          <h3 className="town-name">{t.name}</h3>
          <div className="town-sub">{t.sub}</div>
        </div>
        {Number.isFinite(score) && (
          <div className="fit-ring">
            <div>
              <div className="fit-num">{Math.round(score * 100)}</div>
              <div className="fit-label">Fit score</div>
            </div>
          </div>
        )}
      </div>

      <button className="town-summary" onClick={toggle}>
        <p className="hook">{t.hook}</p>
        <div className="stats">
          <div className="stat">
            <div className="stat-value" style={{ color: over ? C.rust : C.text }}>{t.priceLabel}</div>
            <div className="stat-label">Typical home</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ fontSize: 20 }}>{t.delta}</div>
            <div className="stat-label">Market direction</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: stage.c }}>{stage.label}</div>
            <div className="stat-label">Discovery timing</div>
          </div>
        </div>
        {t.note && <div className="note">{t.note}</div>}
      </button>

      {open && (
        <div className="expanded">
          {t.verified === false && (
            <p style={{ color: C.rust, fontSize: 13, lineHeight: 1.6 }}>
              Too few sales for a reliable median. Treat this as a starting point and check live listings.
            </p>
          )}

          <Section label="Why you have never heard of it">
            <p className="section-title">{t.never}</p>
          </Section>

          <div className="split">
            <div>
              <Section label="History"><p className="body-copy">{t.history}</p></Section>
              <Section label="Why it is turning"><Bullets items={t.why} /></Section>
            </div>
            <div>
              <Section label="Who is hiring"><p className="body-copy">{t.jobs}</p></Section>
              <Section label="What your money buys">
                <p className="body-copy">{t.get}</p>
                {t.cost && <p className="body-copy" style={{ color: C.soft, marginTop: 10, fontSize: 13 }}>{t.cost}</p>}
              </Section>
            </div>
          </div>

          {t.doing && <Section label="Things to do"><Bullets items={t.doing} /></Section>}

          <div className="catch">
            <div className="eyebrow" style={{ color: C.rust }}>Before you move here</div>
            <h4 className="catch-title">The Catch</h4>
            <Bullets items={t.watch} color={C.rust} />
          </div>

          <Section label="See what is actually for sale">
            <Listings t={t} st={st} budget={budget} />
          </Section>

          <div className="actions">
            <button className="chip" data-on={m === "yes" ? "1" : "0"} onClick={() => mark(t.id, "yes")}>
              ♥ Save town
            </button>
            <button className="chip" data-on={m === "no" ? "1" : "0"} onClick={() => mark(t.id, "no")}>
              Not for me
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginLeft: "auto" }}>
              {(t.sources || []).join(" · ")}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function Listings({ t, st, budget }) {
  const cap = Math.round(budget / 1000) + "000";
  const query = encodeURIComponent(`${t.name} ${st || (t.sub || "").split("·")[0]}`);
  const links = [
    { name: "Zillow", url: `https://www.zillow.com/${t.z}/` },
    { name: "Realtor.com", url: `https://www.realtor.com/realestateandhomes-search/${t.r}/price-na-${cap}` },
    { name: "Redfin", url: `https://www.redfin.com/search?q=${query}` },
  ];

  return (
    <div>
      <p className="body-copy" style={{ color: C.soft, fontSize: 13, marginBottom: 14 }}>
        Live listings in {t.name}, capped at ${Math.round(budget / 1000)}k. Get the real insurance quote
        and the real tax bill on the real house before anything else.
      </p>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {links.map((l) => (
          <a key={l.name} className="listing-link" href={l.url} target="_blank" rel="noopener noreferrer">
            {l.name} →
          </a>
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
    <div className="footer-card">
      <div className="eyebrow" style={{ color: "rgba(255,255,255,.45)" }}>
        What nobody puts in the listing
      </div>
      <ul className="footer-list">
        {(notes || []).map((n, i) => (
          <li key={i}>
            <span style={{ color: C.gold, fontFamily: MONO }}>{String(i + 1).padStart(2, "0")}</span>
            <span>{n}</span>
          </li>
        ))}
      </ul>
      {live && (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {label} was researched live and is saved in your browser only. Check the numbers, then paste it
            into <code>lib/data.js</code> to make it permanent for everyone.
          </p>
          <button className="chip" onClick={copy} style={{ marginTop: 12, background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>
            {copied ? "Copied" : "Copy as JSON"}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <section className="section">
      <div className="section-label">{label}</div>
      {children}
    </section>
  );
}

function Bullets({ items, color }) {
  return (
    <ul className="bullets">
      {(items || []).map((text, i) => (
        <li key={i}>
          <span style={{ color: color || C.pine }}>—</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
