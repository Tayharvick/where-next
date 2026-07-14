"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { US, STATES, FINDS } from "@/lib/data";
import { HERO_IMAGE, getTownImage, getTownImageChain, getTownImageFallback, US_FALLBACK_IMAGE } from "@/lib/images";
import { getTownFactsDisplay } from "@/lib/townFacts";

const KEY = "where-next:v7";

const C = {
  ink: "#1A1A1A",
  charcoal: "#2D2D2D",
  cream: "#FAFAF8",
  paper: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1A1A1A",
  soft: "#717171",
  faint: "#B0B0B0",
  rule: "rgba(0,0,0,0.08)",
  pine: "#1E4D45",
  sage: "#3D6B62",
  amber: "#C17F3A",
  rust: "#B84A3A",
  gold: "#C9A962",
  accent: "#1E4D45",
};

const DISPLAY = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif";
const BODY = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

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
        .app-shell{font-family:${BODY};background:${C.cream};min-height:100vh;color:${C.text};-webkit-font-smoothing:antialiased}
        .page{max-width:1180px;margin:0 auto;padding-left:24px;padding-right:24px}
        .eyebrow{font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};font-weight:500}
        .hero-wrap{position:relative;min-height:690px;color:#fff;background-image:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55)),url("${HERO_IMAGE}");background-size:cover;background-position:center}
        .hero-wrap:after{content:"";position:absolute;left:0;right:0;bottom:0;height:140px;background:linear-gradient(transparent,${C.cream})}
        .nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding-top:28px}
        .brand{font-family:${DISPLAY};font-size:26px;font-weight:600;letter-spacing:-.03em}
        .nav-links{display:flex;gap:28px;align-items:center}
        .nav-link{background:transparent;border:0;color:rgba(255,255,255,.75);cursor:pointer;font-size:14px;padding:8px 0;font-weight:500;transition:color .2s}
        .nav-link:hover{color:#fff}
        .nav-link[data-on="1"]{color:#fff;border-bottom:2px solid #fff}
        .hero-content{position:relative;z-index:2;max-width:900px;padding-top:112px}
        .hero-title{font-family:${DISPLAY};font-size:clamp(48px,7vw,88px);line-height:1.02;letter-spacing:-.04em;margin:0;max-width:900px;text-wrap:balance;font-weight:600}
        .hero-copy{font-size:17px;line-height:1.65;color:rgba(255,255,255,.82);max-width:620px;margin:22px 0 0;font-weight:400}
        .search-panel{margin-top:40px;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.6);border-radius:16px;padding:8px 8px 8px 20px;display:flex;gap:8px;box-shadow:0 8px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);max-width:720px}
        .search-input{flex:1;min-width:0;border:0;background:transparent;color:${C.text};font-size:16px;padding:14px 0;outline:none}
        .search-input::placeholder{color:${C.faint}}
        .search-button{border:0;background:${C.ink};color:#fff;border-radius:12px;padding:14px 22px;font-weight:600;font-size:15px;cursor:pointer;white-space:nowrap;transition:background .2s,transform .15s}
        .search-button:hover{background:${C.charcoal}}
        .search-button:active{transform:scale(.98)}
        .search-button:disabled{opacity:.45;cursor:default;transform:none}
        .examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
        .example{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:rgba(255,255,255,.9);border-radius:999px;padding:8px 14px;font-size:13px;cursor:pointer;backdrop-filter:blur(8px);transition:background .2s}
        .example:hover{background:rgba(255,255,255,.2)}
        .loading{margin-top:22px;display:flex;align-items:center;gap:12px;color:#fff;font-size:14px}
        .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .content{position:relative;z-index:3;margin-top:-48px;padding-bottom:100px}
        .toolbar{background:${C.paper};border:1px solid ${C.rule};border-radius:14px;padding:6px;box-shadow:0 1px 3px rgba(0,0,0,.04);display:flex;align-items:center;gap:4px;flex-wrap:wrap}
        .tab{border:0;background:transparent;color:${C.soft};border-radius:10px;padding:10px 16px;font-size:14px;cursor:pointer;font-weight:500;transition:background .2s,color .2s}
        .tab[data-on="1"]{background:${C.ink};color:#fff}
        .count{margin-left:auto;font-family:${MONO};font-size:11px;color:${C.faint};padding:0 12px}
        .intro{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;margin:48px 0 28px}
        .intro-title{font-family:${DISPLAY};font-size:clamp(32px,4.5vw,52px);line-height:1.08;letter-spacing:-.03em;margin:0;max-width:780px;font-weight:600}
        .intro-copy{color:${C.soft};font-size:16px;line-height:1.65;max-width:640px;margin:12px 0 0}
        .budget-card{background:${C.paper};border:1px solid ${C.rule};border-radius:16px;padding:20px 22px;margin-bottom:28px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .budget-row{display:flex;align-items:center;gap:18px}
        .budget-value{font-family:${DISPLAY};font-size:26px;min-width:90px;text-align:right;font-weight:600;letter-spacing:-.02em}
        .tune-button{width:100%;border:0;border-top:1px solid ${C.rule};background:transparent;margin-top:18px;padding:14px 0 0;display:flex;justify-content:space-between;color:${C.soft};cursor:pointer}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;background:${C.rule}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:${C.ink};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}
        .town-card{background:${C.card};border:1px solid ${C.rule};border-radius:20px;overflow:hidden;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04);transition:transform .25s ease,box-shadow .25s ease}
        .town-card:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(0,0,0,.06),0 16px 40px rgba(0,0,0,.08)}
        .town-visual{position:relative;min-height:340px;background-color:#2a2a2a;display:flex;align-items:flex-end;overflow:hidden;transition:transform .4s ease}
        .town-visual-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0}
        .town-card:hover .town-visual{transform:scale(1.01)}
        .town-visual-wrap{overflow:hidden}
        .town-visual:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.72) 100%)}
        .town-overlay{position:relative;z-index:1;width:100%;padding:32px 34px;color:#fff}
        .rank{font-family:${MONO};font-size:11px;color:rgba(255,255,255,.6);margin-bottom:8px;letter-spacing:.1em}
        .town-name{font-family:${DISPLAY};font-size:clamp(36px,5.5vw,60px);letter-spacing:-.04em;line-height:1;font-weight:600;margin:0}
        .town-sub{margin-top:10px;color:rgba(255,255,255,.72);font-size:14px;font-weight:400}
        .stage-pill{position:absolute;z-index:2;top:20px;right:20px;border-radius:999px;color:#fff;padding:7px 14px;font-family:${MONO};font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,.15)}
        .fit-ring{position:absolute;z-index:2;right:24px;bottom:24px;width:88px;height:88px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.35);backdrop-filter:blur(12px)}
        .fit-num{font-family:${DISPLAY};font-size:28px;line-height:1;font-weight:600}
        .fit-label{font-family:${MONO};font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-top:2px;text-align:center}
        .town-summary{padding:28px 32px 26px;cursor:pointer;border:0;background:transparent;width:100%;text-align:left}
        .hook{font-family:${DISPLAY};font-size:22px;line-height:1.45;margin:0;max-width:820px;font-weight:500;letter-spacing:-.02em}
        .town-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:22px;padding-top:22px;border-top:1px solid ${C.rule}}
        .fact-item{background:${C.cream};border-radius:12px;padding:12px 14px;min-height:68px;display:flex;flex-direction:column;justify-content:flex-start;gap:6px}
        .fact-head{display:flex;align-items:center;gap:7px}
        .fact-icon{display:flex;align-items:center;justify-content:center;color:${C.soft};flex-shrink:0}
        .fact-label{font-size:11px;color:${C.faint};font-weight:500;line-height:1.2}
        .fact-value{font-size:14px;font-weight:600;color:${C.text};line-height:1.3;letter-spacing:-.01em}
        .fact-value[data-pending="1"]{color:${C.faint};font-weight:500;font-size:13px}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}
        .stat{background:${C.cream};border-radius:12px;padding:16px 18px}
        .stat-value{font-family:${DISPLAY};font-size:24px;line-height:1.1;font-weight:600;letter-spacing:-.02em}
        .stat-label{font-family:${MONO};font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};margin-top:6px;font-weight:500}
        .note{color:${C.soft};font-size:13px;line-height:1.6;border-top:1px solid ${C.rule};padding-top:16px;margin-top:20px}
        .expanded{border-top:1px solid ${C.rule};padding:8px 32px 32px}
        .section{padding-top:28px}
        .section-label{font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-bottom:10px;font-weight:500}
        .section-title{font-family:${DISPLAY};font-size:22px;line-height:1.45;margin:0;font-weight:500;letter-spacing:-.02em}
        .split{display:grid;grid-template-columns:1fr 1fr;gap:36px}
        .body-copy{font-size:15px;line-height:1.7;color:${C.text};margin:0}
        .bullets{list-style:none;padding:0;margin:0}
        .bullets li{display:flex;gap:10px;font-size:14px;line-height:1.65;margin-bottom:8px}
        .catch{margin-top:28px;background:#FDF8F6;border:1px solid rgba(184,74,58,.15);border-radius:16px;padding:24px}
        .catch-title{font-family:${DISPLAY};font-size:24px;margin:0 0 12px;color:${C.rust};font-weight:600;letter-spacing:-.02em}
        .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:24px}
        .chip{border:1px solid ${C.rule};background:#fff;color:${C.soft};border-radius:999px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:500;transition:background .2s,border-color .2s,color .2s}
        .chip:hover{border-color:${C.faint}}
        .chip[data-on="1"]{background:${C.ink};border-color:${C.ink};color:#fff}
        .listing-link{display:inline-block;background:${C.ink};color:#fff;text-decoration:none;border-radius:10px;padding:11px 16px;font-size:13px;font-weight:500;transition:background .2s}
        .listing-link:hover{background:${C.charcoal}}
        .state-grid{display:flex;flex-wrap:wrap;gap:6px;margin:24px 0}
        .state-button{width:44px;height:36px;border-radius:8px;background:transparent;font-family:${MONO};font-size:11px;cursor:pointer;transition:background .2s,border-color .2s}
        .unmapped{background:${C.paper};border:1px solid ${C.rule};border-radius:20px;padding:48px 32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .shortlist{margin-top:36px;background:${C.ink};color:#fff;border-radius:20px;padding:26px 28px}
        .shortlist-items{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .shortlist-pill{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 14px;font-size:13px}
        .footer-card{margin-top:40px;background:${C.ink};color:#fff;border-radius:20px;padding:32px}
        .footer-list{list-style:none;padding:0;margin:16px 0 0}
        .footer-list li{display:flex;gap:14px;color:rgba(255,255,255,.72);line-height:1.65;margin-bottom:12px;font-size:15px}
        @media(max-width:760px){
          .page{padding-left:16px;padding-right:16px}
          .hero-wrap{min-height:720px}
          .nav-links{display:none}
          .hero-content{padding-top:100px}
          .search-panel{flex-direction:column;border-radius:14px;padding:12px}
          .search-button{width:100%}
          .content{margin-top:-32px}
          .intro{display:block}
          .split{grid-template-columns:1fr}
          .stats{grid-template-columns:1fr}
          .town-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
          .fit-ring{width:76px;height:76px;right:18px;bottom:18px}
          .town-overlay{padding:24px 20px}
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
            <div className="eyebrow" style={{ color: "rgba(255,255,255,.65)", marginBottom: 16 }}>
              Your honest relocation scout
            </div>
            <h1 className="hero-title">Find where your next life begins.</h1>
            <p className="hero-copy">
              Describe your ideal life. We&apos;ll find the towns you&apos;ve never considered, show you what your
              budget really buys, explain why people are moving there, and tell you the trade-offs before you pack a box.
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
                    background: on ? C.ink : done ? "rgba(30,77,69,.06)" : C.paper,
                    color: on ? "#fff" : done ? C.pine : C.faint,
                    fontWeight: done ? 600 : 400,
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
                  <div style={{ borderTop: `3px solid ${STAGE[s].c}`, paddingTop: 14, marginBottom: 20 }}>
                    <h3 style={{ fontFamily: DISPLAY, fontSize: 30, margin: 0, color: STAGE[s].c, fontWeight: 600, letterSpacing: "-.02em" }}>{STAGE[s].label}</h3>
                    <p style={{ color: C.soft, margin: "6px 0 0", fontSize: 15 }}>{STAGE[s].blurb}</p>
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

function Icon({ name }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "school":
      return <svg {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></svg>;
    case "shield":
      return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "people":
      return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "income":
      return <svg {...props}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case "walk":
      return <svg {...props}><circle cx="13" cy="4" r="2" /><path d="M7 21l3-6 3 2 4-8" /><path d="M10 21h6" /></svg>;
    case "wifi":
      return <svg {...props}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>;
    case "weather":
      return <svg {...props}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>;
    case "tax":
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    default:
      return null;
  }
}

function TownFacts({ t }) {
  const rows = getTownFactsDisplay(t);
  return (
    <div className="town-facts">
      {rows.map(({ key, label, icon, value, pending }) => (
        <div key={key} className="fact-item">
          <div className="fact-head">
            <span className="fact-icon"><Icon name={icon} /></span>
            <span className="fact-label">{label}</span>
          </div>
          <div className="fact-value" data-pending={pending ? "1" : "0"}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function TownVisual({ town, stateAbbr, stage, rank, score }) {
  const [src, setSrc] = useState(() => getTownImage(town, stateAbbr));
  const failedUrls = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setSrc(getTownImage(town, stateAbbr));
    failedUrls.current = new Set();

    (async () => {
      try {
        const res = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            town: { id: town.id, name: town.name, sub: town.sub, image: town.image },
            stateAbbr,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.image) setSrc(data.image);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [town.id, town.name, town.sub, town.image, stateAbbr]);

  const resolveFromApi = async (skipUrl) => {
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          town: { id: town.id, name: town.name, sub: town.sub, image: town.image },
          stateAbbr,
          skipUrl,
        }),
      });
      const data = await res.json();
      if (data.image) {
        setSrc(data.image);
        return;
      }
    } catch {}
    setSrc(getTownImageFallback(town, skipUrl, stateAbbr));
  };

  const handleError = () => {
    setSrc((prev) => {
      if (!failedUrls.current.has(prev)) {
        failedUrls.current.add(prev);
        resolveFromApi(prev);
      } else {
        setSrc(US_FALLBACK_IMAGE);
      }
      return prev;
    });
  };

  const placeholder = getTownImageChain(town, stateAbbr).at(-1) || US_FALLBACK_IMAGE;

  return (
    <div className="town-visual-wrap">
      <div
        className="town-visual"
        style={{
          backgroundImage: `url("${placeholder}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <img
          className="town-visual-img"
          src={src}
          alt=""
          decoding="async"
          onError={handleError}
        />
        <span className="stage-pill" style={{ background: stage.c }}>{stage.label}</span>
        <div className="town-overlay">
          {rank && <div className="rank">{String(rank).padStart(2, "0")} / BEST MATCHES</div>}
          <h3 className="town-name">{town.name}</h3>
          <div className="town-sub">{town.sub}</div>
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
    </div>
  );
}

function Card({ t, st, rank, score, open, toggle, mark, marks, budget }) {
  const m = marks[t.id];
  const stage = STAGE[t.stage] || STAGE.heating;
  const over = t.price && t.price > budget;

  return (
    <article className="town-card" style={{ borderColor: m === "yes" ? C.pine : C.rule }}>
      <TownVisual town={t} stateAbbr={st} stage={stage} rank={rank} score={score} />

      <button className="town-summary" onClick={toggle}>
        <p className="hook">{t.hook}</p>
        <TownFacts t={t} />
        <div className="stats">
          <div className="stat">
            <div className="stat-value" style={{ color: over ? C.rust : C.text }}>{t.priceLabel}</div>
            <div className="stat-label">Typical home</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ fontSize: 19 }}>{t.delta}</div>
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
