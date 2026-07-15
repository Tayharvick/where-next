"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { STATES, FINDS, US } from "@/lib/data";
import { getStateListingsUrl } from "@/lib/stateListings";
import { HERO_IMAGE, getTownImageChain, getTownImageFallback, isModernHeroPhoto, isValidImageUrl, US_FALLBACK_IMAGE } from "@/lib/images";
import { getTownFactsDisplay } from "@/lib/townFacts";

const KEY = "where-next:v7";

const C = {
  ink: "#2C2C2C",
  charcoal: "#2C2C2C",
  cream: "#F9F7F4",
  paper: "#FFFFFF",
  card: "#FFFFFF",
  text: "#2C2C2C",
  soft: "#6B6B6B",
  faint: "#A8A8A8",
  rule: "rgba(0,0,0,0.06)",
  pine: "#1E4D45",
  sage: "#5C6B5A",
  olive: "#5C6B5A",
  amber: "#C17F3A",
  rust: "#B84A3A",
  gold: "#C9A962",
  accent: "#5C6B5A",
};

const REPORT_LABEL = "#5C5C5C";
const REPORT_BODY = "#2D2D2D";

const DISPLAY = "var(--font-display),Georgia,'Times New Roman',serif";
const BODY = "var(--font-body),system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const STAGE = {
  early: {
    c: C.pine,
    label: "Still Early",
    blurb: "Cheap because nobody is looking, not because it is broken.",
  },
  heating: {
    c: C.amber,
    label: "Heating Up",
    blurb: "Found. Not finished. There is still a window.",
  },
  late: {
    c: C.rust,
    label: "Already Hot",
    blurb: "The first movers already made their money.",
  },
};

const SCOUT_STAGE = {
  early: { c: C.pine, label: "Still Early" },
  heating: { c: C.amber, label: "Heating Up" },
  late: { c: C.rust, label: "Last Chance" },
};

const SCOUT_EDITORIAL = {
  coolidge: { headline: "Arizona's forgotten boomtown.", cta: "Meet Coolidge →" },
  johnsoncity: { headline: "The Appalachian town everyone is suddenly searching.", cta: "Why Johnson City? →" },
  wildwood: { headline: "Florida's fastest-growing secret.", cta: "See why we picked it →" },
  tontitown: { headline: "An Ozark village the boom finally found.", cta: "Meet Tontitown →" },
  hoschton: { headline: "When Atlanta's sprawl reaches the village.", cta: "Why Hoschton? →" },
};

const LIFESTYLE_CHIPS = [
  "Beach Town",
  "Mountains",
  "Lake Life",
  "Historic Downtown",
  "Walkable",
  "College Town",
  "Dog Friendly",
  "Wine Country",
  "Small Town",
  "Near National Parks",
];

const WHY_WHERE_NEXT = [
  {
    title: "Researched like a local",
    copy: "We read the listings, scan the news, and check what's actually changing — not just what a ranking site says.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
  {
    title: "The good, the bad, the catch",
    copy: "Every town gets the honest version — what's drawing people, what's wrong, and what nobody mentions until after you've moved.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    title: "What your money actually buys",
    copy: "Median prices are a starting point. We show what your budget gets you in each town — house, land, and trade-offs included.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 9l9-6 9 6v11H3V9z" />
        <path d="M9 20V12h6v8" />
      </svg>
    ),
  },
  {
    title: "Are you still early?",
    copy: "Some towns are cheap because nobody's looking. Others are already hot. We tell you which window you're in.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
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

function apiErrorMessage(data, status) {
  const err = data?.error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return `Search failed (${status}). Please try again.`;
}

function isValidSearchResult(data) {
  return Boolean(data && Array.isArray(data.towns) && data.towns.length > 0);
}

const STATE_LIST = Object.entries(US)
  .map(([abbr, name]) => ({ abbr, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function WhereNext() {
  const [tab, setTab] = useState("search");
  const [budget, setBudget] = useState(400000);
  const [wts, setWts] = useState({});
  const [marks, setMarks] = useState({});
  const [found, setFound] = useState({});
  const [search, setSearch] = useState(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [browseState, setBrowseState] = useState(null);
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
        JSON.stringify({ wts, marks, found, budget, ...next })
      );
    } catch {}
  };

  const ALL_STATES = useMemo(() => ({ ...STATES, ...found }), [found]);
  const isSearch = tab === "search";
  const isFind = tab === "find";
  const isStates = tab === "states";
  const S = isSearch ? search : null;
  const key = "__search";

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
    setOpen(null);
    setBrowseState(null);
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

      const rawText = await res.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        console.error("[WhereNext] /api/research non-JSON response", {
          status: res.status,
          body: rawText.slice(0, 1000),
        });
        throw new Error(
          `Search failed (${res.status}). The server returned an unexpected response.`
        );
      }

      console.log("[WhereNext] /api/research response", {
        status: res.status,
        ok: res.ok,
        body: data,
      });

      if (!res.ok) {
        throw new Error(apiErrorMessage(data, res.status));
      }

      if (data?.error) {
        throw new Error(apiErrorMessage(data, res.status));
      }

      if (!isValidSearchResult(data)) {
        throw new Error("Search completed but returned no towns. Please try again.");
      }

      return data;
    } catch (e) {
      const message = e?.message || "Search failed. Please try again.";
      setErr(message);
      return null;
    } finally {
      setBusy("");
    }
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    const data = await ask({ want: q }, "search");
    if (isValidSearchResult(data)) {
      setSearch(data);
      setTab("search");
      setOpen(null);
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

  const hiddenFinds = useMemo(() => FINDS.map((f) => ({ ...f, st: "" })), []);

  const hiddenFindsFlat = useMemo(
    () => ["early", "heating", "late"].flatMap((s) => hiddenFinds.filter((t) => t.stage === s)),
    [hiddenFinds]
  );

  const scoutPub = useMemo(() => getScoutPublication(), []);
  const homepageFeaturedFind = useMemo(
    () => getFeaturedFind(hiddenFindsFlat),
    [hiddenFindsFlat]
  );
  const featuredFind = hiddenFindsFlat[0] || null;
  const restFinds = hiddenFindsFlat.slice(1);
  const openFind = hiddenFindsFlat.find((t) => open === t.id + t.st) || null;

  const stateTowns = useMemo(() => {
    if (!browseState) return [];
    return ALL_STATES[browseState]?.towns || [];
  }, [browseState, ALL_STATES]);

  const browseStateName = browseState ? US[browseState] || browseState : "";
  const browseStateListingsUrl = browseState ? getStateListingsUrl(browseState) : null;
  const openStateTown = stateTowns.find((t) => open === t.id + browseState) || null;

  const shortlist = everyTown.filter((t) => marks[t.id] === "yes");

  if (!ready) return <div style={{ background: C.cream, minHeight: "100vh" }} />;

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
        .hero-wrap{position:relative;min-height:100vh;color:#fff;background-color:#1c1916;background-image:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),linear-gradient(180deg,rgba(0,0,0,.2) 0%,rgba(0,0,0,.12) 45%,rgba(0,0,0,.28) 100%),url("${HERO_IMAGE}");background-size:cover;background-position:center 42%}
        .hero-wrap:after{content:"";position:absolute;left:0;right:0;bottom:0;height:140px;background:linear-gradient(transparent,${C.cream});pointer-events:none}
        .nav{position:relative;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;padding-top:32px;gap:24px}
        .brand-block{display:flex;flex-direction:column;gap:4px}
        .brand{font-family:${DISPLAY};font-size:15px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#fff}
        .brand-sub{font-family:${BODY};font-size:12px;letter-spacing:.04em;color:rgba(255,255,255,.55);font-weight:400}
        .nav-links{display:flex;gap:32px;align-items:center;padding-top:2px}
        .nav-link{background:transparent;border:0;color:rgba(255,255,255,.65);cursor:pointer;font-size:13px;padding:6px 0;font-weight:500;letter-spacing:.02em;transition:color .2s}
        .nav-link:hover{color:#fff}
        .nav-link[data-on="1"]{color:#fff;border-bottom:1px solid rgba(255,255,255,.7)}
        .hero-content{position:relative;z-index:2;max-width:700px;margin:0 auto;text-align:center;padding-top:clamp(72px,12vh,128px);padding-bottom:56px}
        .hero-title{font-family:${DISPLAY};font-size:clamp(47px,6.5vw,83px);line-height:1.04;letter-spacing:-.03em;margin:0;font-weight:400;text-wrap:balance}
        .hero-copy{font-family:${BODY};font-size:clamp(14px,1.55vw,16px);line-height:1.8;color:rgba(255,255,255,.68);max-width:480px;margin:40px auto 0;font-weight:400;letter-spacing:.015em}
        .search-panel{margin:52px auto 0;background:#fff;backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,.85);border-radius:100px;padding:12px 12px 12px 36px;display:flex;gap:12px;box-shadow:0 32px 80px rgba(0,0,0,.22),0 12px 32px rgba(0,0,0,.12);max-width:600px}
        .search-input{flex:1;min-width:0;border:0;background:transparent;color:${C.text};font-size:18px;padding:20px 0;outline:none;letter-spacing:.01em}
        .search-input::placeholder{color:${C.faint}}
        .search-button{border:0;background:${C.charcoal};color:#fff;border-radius:100px;padding:20px 38px;font-weight:500;font-size:16px;cursor:pointer;white-space:nowrap;letter-spacing:.02em;transition:background .2s,transform .15s,box-shadow .2s;box-shadow:0 4px 14px rgba(0,0,0,.18)}
        .search-button:hover{background:#1a1a1a}
        .search-button:active{transform:scale(.98)}
        .search-button:disabled{opacity:.45;cursor:default;transform:none}
        .search-error{margin-top:18px;color:#FFD1C4;font-size:14px;line-height:1.55;max-width:600px;margin-left:auto;margin-right:auto}
        .lifestyle-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:36px;max-width:720px;margin-left:auto;margin-right:auto}
        .lifestyle-chip{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:rgba(255,255,255,.88);border-radius:999px;padding:9px 16px;font-size:13px;cursor:pointer;backdrop-filter:blur(8px);transition:background .2s,border-color .2s;font-weight:400}
        .lifestyle-chip:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35)}
        .loading{margin-top:22px;display:flex;align-items:center;justify-content:center;gap:12px;color:#fff;font-size:14px}
        .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .content{position:relative;z-index:3;margin-top:-56px;padding-bottom:120px}
        .toolbar{background:${C.paper};border:1px solid ${C.rule};border-radius:999px;padding:5px;box-shadow:0 2px 12px rgba(0,0,0,.04);display:flex;align-items:center;gap:2px;flex-wrap:wrap}
        .tab{flex:1;border:0;background:transparent;color:${C.soft};border-radius:999px;padding:12px 20px;font-size:13px;cursor:pointer;font-weight:500;letter-spacing:.01em;transition:background .25s,color .25s,box-shadow .25s;min-width:0;text-align:center}
        .tab[data-on="1"]{background:${C.charcoal};color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .tab:hover:not([data-on="1"]){color:${C.text}}
        .count{margin-left:auto;font-family:${MONO};font-size:11px;color:${C.faint};padding:0 12px}
        .home-section{margin:80px 0;animation:fadeInUp .7s ease both}
        .home-section:nth-child(2){animation-delay:.08s}
        .home-section:nth-child(3){animation-delay:.16s}
        .home-section:nth-child(4){animation-delay:.24s}
        .home-section:nth-child(5){animation-delay:.32s}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .section-eyebrow{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.olive};font-weight:500;margin-bottom:16px}
        .intro{display:block;margin:0}
        .intro:not(.home-section){margin:48px 0 28px}
        .intro-title{font-family:${DISPLAY};font-size:clamp(32px,4.5vw,52px);line-height:1.12;letter-spacing:-.02em;margin:0;max-width:720px;font-weight:500}
        .intro-copy{color:${C.soft};font-size:17px;line-height:1.75;max-width:600px;margin:20px 0 0}
        .landing .intro .intro-title{max-width:100%;font-size:clamp(30px,3.75vw,48px);letter-spacing:-.025em;margin:0 0 40px}
        .landing .intro .intro-copy{max-width:680px;margin:0}
        .why-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:40px}
        .why-card{background:${C.paper};border:1px solid ${C.rule};border-radius:20px;padding:32px 28px;transition:border-color .25s,box-shadow .25s,transform .25s}
        .why-card:hover{border-color:rgba(92,107,90,.25);box-shadow:0 8px 28px rgba(0,0,0,.05);transform:translateY(-2px)}
        .why-icon{color:${C.olive};margin-bottom:20px;display:flex}
        .why-title{font-family:${DISPLAY};font-size:20px;line-height:1.3;letter-spacing:-.01em;margin:0 0 12px;font-weight:500;color:${C.text}}
        .why-copy{font-size:14px;line-height:1.7;color:${C.soft};margin:0}
        .landing{padding-bottom:100px}
        .landing .home-section:first-child{margin-top:72px}
        .finds-preview-cta{display:inline-flex;margin-top:40px;border:0;background:${C.charcoal};color:#fff;border-radius:14px;padding:16px 32px;font-size:15px;font-weight:500;letter-spacing:.02em;cursor:pointer;transition:background .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(0,0,0,.1);font-family:${BODY}}
        .finds-preview-cta:hover{background:#1a1a1a;box-shadow:0 6px 24px rgba(0,0,0,.14)}
        .home-section-featured{margin:80px 0}
        .featured-scout{background:${C.paper};border:1px solid ${C.rule};border-radius:28px;overflow:hidden;box-shadow:0 12px 56px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.03);transition:box-shadow .4s ease}
        .featured-scout:hover{box-shadow:0 20px 72px rgba(0,0,0,.09),0 4px 16px rgba(0,0,0,.04)}
        .featured-scout-layout{display:grid;grid-template-columns:1.25fr 1fr;min-height:min(520px,52vh)}
        .featured-scout-visual{position:relative;min-height:360px;background:#2a2a2a;overflow:hidden}
        .featured-scout-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .8s ease}
        .featured-scout:hover .featured-scout-img{transform:scale(1.03)}
        .featured-scout-body{padding:clamp(36px,5vw,56px) clamp(32px,4vw,52px);display:flex;flex-direction:column;justify-content:center}
        .featured-scout-badge{display:inline-block;align-self:flex-start;font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${C.olive};border:1px solid rgba(92,107,90,.25);background:rgba(92,107,90,.06);border-radius:999px;padding:7px 14px;font-weight:600;margin-bottom:28px}
        .featured-scout-name{font-family:${DISPLAY};font-size:clamp(40px,5vw,64px);line-height:1.04;letter-spacing:-.03em;margin:0;font-weight:400}
        .featured-scout-location{font-family:${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin:12px 0 0;font-weight:500}
        .featured-scout-deck{font-size:clamp(16px,1.8vw,18px);line-height:1.75;color:${C.soft};margin:28px 0 0;max-width:440px}
        .featured-scout-btn{align-self:flex-start;margin-top:36px;border:0;background:${C.charcoal};color:#fff;border-radius:14px;padding:18px 36px;font-size:15px;font-weight:500;letter-spacing:.02em;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s;box-shadow:0 4px 16px rgba(0,0,0,.12);font-family:${BODY}}
        .featured-scout-btn:hover{background:#1a1a1a;box-shadow:0 6px 24px rgba(0,0,0,.16)}
        .featured-scout-btn:active{transform:scale(.98)}
        .featured-scout-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid ${C.rule};background:${C.cream}}
        .featured-scout-stat{padding:28px 32px;border-right:1px solid ${C.rule}}
        .featured-scout-stat:last-child{border-right:0}
        .featured-scout-stat-label{font-family:${MONO};font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-bottom:10px;font-weight:500}
        .featured-scout-stat-value{font-family:${DISPLAY};font-size:clamp(17px,1.8vw,20px);line-height:1.35;font-weight:400;color:${C.text};letter-spacing:-.015em}
        .finds-preview-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:36px}
        .finds-preview-title{font-family:${DISPLAY};font-size:clamp(28px,3.5vw,36px);line-height:1.15;letter-spacing:-.02em;margin:0;font-weight:500}
        .finds-preview-link{border:0;background:transparent;color:${C.olive};font-size:14px;font-weight:500;cursor:pointer;padding:0;transition:color .2s;white-space:nowrap}
        .finds-preview-link:hover{color:${C.charcoal}}
        .finds-preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
        .finds-preview-card{display:flex;flex-direction:column;border:0;background:transparent;padding:0;cursor:pointer;text-align:left;transition:transform .3s}
        .finds-preview-card:hover{transform:translateY(-3px)}
        .finds-preview-visual{position:relative;aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:#2a2a2a;margin-bottom:18px;box-shadow:0 2px 16px rgba(0,0,0,.05);transition:box-shadow .3s}
        .finds-preview-card:hover .finds-preview-visual{box-shadow:0 10px 32px rgba(0,0,0,.1)}
        .finds-preview-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
        .finds-preview-card:hover .finds-preview-img{transform:scale(1.03)}
        .finds-preview-stage{position:absolute;top:14px;left:14px;z-index:1;border-radius:999px;color:#fff;padding:6px 11px;font-family:${MONO};font-size:8px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
        .finds-preview-name{font-family:${DISPLAY};font-size:22px;letter-spacing:-.02em;margin:0 0 6px;font-weight:500;line-height:1.15}
        .finds-preview-sub{font-family:${MONO};font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};margin-bottom:8px}
        .finds-preview-hook{font-size:14px;line-height:1.6;color:${C.soft};margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .state-explore{margin:56px 0 32px}
        .state-explore-title{font-family:${DISPLAY};font-size:clamp(28px,3.5vw,36px);line-height:1.15;letter-spacing:-.02em;margin:0 0 32px;font-weight:500}
        .state-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px}
        .state-card{display:block;border:1px solid ${C.rule};background:${C.paper};border-radius:16px;padding:18px 20px;text-align:left;color:inherit;cursor:pointer;transition:border-color .25s,box-shadow .25s,transform .25s;width:100%;font:inherit}
        .state-card:hover{border-color:rgba(92,107,90,.3);box-shadow:0 6px 20px rgba(0,0,0,.05);transform:translateY(-2px)}
        .state-card-name{font-family:${DISPLAY};font-size:18px;line-height:1.2;font-weight:500;letter-spacing:-.01em;margin:0 0 6px;color:${C.text}}
        .state-card-abbr{font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint}}
        .state-back{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:${C.soft};font-size:14px;font-weight:500;cursor:pointer;padding:0;margin:56px 0 24px;transition:color .2s}
        .state-back:hover{color:${C.text}}
        .state-detail-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:32px}
        .state-listings-btn{display:inline-block;border:1px solid ${C.rule};background:${C.paper};color:${C.text};text-decoration:none;border-radius:999px;padding:12px 20px;font-size:14px;font-weight:500;transition:border-color .25s,background .25s,box-shadow .25s}
        .state-listings-btn:hover{border-color:rgba(92,107,90,.3);background:${C.cream};box-shadow:0 4px 16px rgba(0,0,0,.04)}
        .state-empty{color:${C.soft};font-size:16px;line-height:1.65;margin:0}
        .budget-card{background:${C.paper};border:1px solid ${C.rule};border-radius:16px;padding:20px 22px;margin-bottom:28px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .budget-row{display:flex;align-items:center;gap:18px}
        .budget-value{font-family:${DISPLAY};font-size:26px;min-width:90px;text-align:right;font-weight:600;letter-spacing:-.02em}
        .tune-button{width:100%;border:0;border-top:1px solid ${C.rule};background:transparent;margin-top:18px;padding:14px 0 0;display:flex;justify-content:space-between;color:${C.soft};cursor:pointer}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;background:${C.rule}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:${C.ink};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}
        .town-card{background:${C.card};border:1px solid ${C.rule};border-radius:20px;overflow:hidden;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04);transition:transform .25s ease,box-shadow .25s ease}
        .town-card-open{box-shadow:0 4px 16px rgba(0,0,0,.06),0 20px 48px rgba(0,0,0,.1)}
        .town-card:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(0,0,0,.06),0 16px 40px rgba(0,0,0,.08)}
        .town-card-open:hover{transform:none}
        .town-visual{position:relative;min-height:340px;background-color:#2a2a2a;display:flex;align-items:flex-end;overflow:hidden;transition:transform .4s ease}
        .town-visual-detail{min-height:min(72vh,560px);align-items:flex-end}
        .town-visual-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0}
        .town-card:hover .town-visual{transform:scale(1.01)}
        .town-visual-wrap{overflow:hidden}
        .town-visual:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.72) 100%)}
        .town-overlay{position:relative;z-index:1;width:100%;padding:32px 34px;color:#fff}
        .town-overlay-detail{padding:40px 40px 44px}
        .rank{font-family:${MONO};font-size:11px;color:rgba(255,255,255,.6);margin-bottom:8px;letter-spacing:.1em}
        .town-name{font-family:${DISPLAY};font-size:clamp(36px,5.5vw,60px);letter-spacing:-.04em;line-height:1;font-weight:600;margin:0}
        .town-name-detail{font-size:clamp(42px,6vw,72px)}
        .town-sub{margin-top:10px;color:rgba(255,255,255,.72);font-size:14px;font-weight:400}
        .town-hero-summary{margin:18px 0 0;font-family:${DISPLAY};font-size:clamp(18px,2.5vw,24px);line-height:1.45;font-weight:500;letter-spacing:-.02em;max-width:720px;color:rgba(255,255,255,.92)}
        .hero-actions{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}
        .hero-btn{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;backdrop-filter:blur(10px);transition:background .2s,border-color .2s}
        .hero-btn:hover{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.55)}
        .hero-btn[data-on="1"]{background:#fff;border-color:#fff;color:${C.ink}}
        .detail-collapse{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:${C.soft};font-size:14px;font-weight:500;cursor:pointer;padding:0;margin-bottom:8px}
        .detail-collapse:hover{color:${C.text}}
        .town-detail{padding:48px 48px 56px;color:${REPORT_BODY}}
        .town-detail .section-label{color:${REPORT_LABEL};font-weight:600;letter-spacing:.16em;margin-bottom:14px}
        .town-detail .body-copy{color:${REPORT_BODY};font-size:16px;line-height:1.75}
        .town-detail .article-lede{color:${REPORT_BODY}}
        .town-detail .bullets li{color:${REPORT_BODY}}
        .town-detail .report-close-copy{color:${REPORT_BODY}}
        .scout-verdict{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding-bottom:44px;margin-bottom:44px;border-bottom:1px solid ${C.rule}}
        .scout-verdict-label{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${REPORT_LABEL};margin-bottom:16px;font-weight:600}
        .scout-verdict-copy{font-family:${DISPLAY};font-size:clamp(21px,2.8vw,27px);line-height:1.55;letter-spacing:-.025em;margin:0;font-weight:500;color:${C.ink};max-width:720px}
        .scout-score-block{flex-shrink:0;text-align:left;min-width:248px;max-width:280px;padding:24px 28px;border:1px solid ${C.rule};border-radius:16px;background:${C.cream}}
        .scout-score-header{text-align:center;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid ${C.rule}}
        .scout-score-label{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${REPORT_LABEL};font-weight:600}
        .scout-score-num{font-family:${DISPLAY};font-size:48px;line-height:1;font-weight:600;letter-spacing:-.04em;color:${C.ink};margin:10px 0 6px}
        .scout-score-rating{font-family:${DISPLAY};font-size:14px;line-height:1.35;font-weight:500;color:${REPORT_BODY};margin:0 0 4px}
        .scout-score-out{font-family:${MONO};font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${REPORT_LABEL}}
        .scout-score-breakdown{display:flex;flex-direction:column;gap:14px}
        .scout-score-row-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
        .scout-score-row-label{font-family:${BODY};font-size:11px;line-height:1.3;color:${REPORT_LABEL};font-weight:500}
        .scout-score-row-val{font-family:${MONO};font-size:11px;color:${C.ink};font-weight:600;flex-shrink:0}
        .scout-score-bar{height:3px;background:${C.rule};border-radius:2px;overflow:hidden}
        .scout-score-bar-fill{height:100%;background:${C.ink};border-radius:2px;opacity:.82}
        .scout-score-prov{font-family:${MONO};font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:${REPORT_LABEL};margin-top:5px;display:block}
        .scout-score-how{margin-top:18px;padding-top:14px;border-top:1px solid ${C.rule}}
        .scout-score-how summary{font-family:${MONO};font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:${REPORT_LABEL};cursor:pointer;list-style:none;font-weight:600}
        .scout-score-how summary::-webkit-details-marker{display:none}
        .scout-score-how p{font-size:11px;line-height:1.6;color:${REPORT_LABEL};margin:10px 0 0}
        .facts-strip{display:flex;flex-wrap:wrap;gap:0;margin-bottom:52px;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule}}
        .facts-strip-item{flex:1 1 140px;padding:26px 32px 26px 0;border-right:1px solid ${C.rule};min-width:120px}
        .facts-strip-item:last-child{border-right:0;padding-right:0}
        .facts-strip-label{font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${REPORT_LABEL};margin-bottom:10px;font-weight:600}
        .facts-strip-value{font-family:${DISPLAY};font-size:22px;line-height:1.15;font-weight:600;letter-spacing:-.025em;color:${C.ink}}
        .fit-editorial{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:56px;padding-bottom:56px;border-bottom:1px solid ${C.rule}}
        .fit-editorial-col-label{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${REPORT_LABEL};margin-bottom:16px;font-weight:600;padding-bottom:12px;border-bottom:1px solid ${C.rule}}
        .fit-editorial-col-label-warn{color:${REPORT_LABEL}}
        .fit-editorial .bullets li{font-size:16px;line-height:1.75;margin-bottom:12px;color:${REPORT_BODY}}
        .fit-summary{display:grid;grid-template-columns:1fr 1fr;gap:28px;background:${C.cream};border:1px solid ${C.rule};border-radius:16px;padding:28px 30px;margin-bottom:40px}
        .fit-col-label{font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-bottom:12px;font-weight:600}
        .fit-col-label-skip{color:${C.rust}}
        .article-section{border-top:1px solid ${C.rule};padding-top:56px;margin-top:56px}
        .article-section:first-of-type{border-top:0;padding-top:0;margin-top:0}
        .article-heading{font-family:${DISPLAY};font-size:clamp(26px,3vw,34px);line-height:1.15;letter-spacing:-.03em;margin:0 0 16px;font-weight:600;color:${C.ink}}
        .article-lede{font-family:${DISPLAY};font-size:20px;line-height:1.55;margin:0;font-weight:500;letter-spacing:-.02em;color:${C.ink}}
        .report-close{background:${C.cream};border:1px solid ${C.rule};border-radius:16px;padding:36px 40px;margin-top:56px}
        .report-close-copy{font-size:16px;line-height:1.8;color:${REPORT_BODY};margin:16px 0 0}
        .detail-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:40px}
        .similar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px}
        .similar-card{border:1px solid ${C.rule};background:${C.paper};border-radius:14px;padding:18px 20px;text-align:left;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s}
        .similar-card:hover{border-color:${C.faint};box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-2px)}
        .similar-name{font-family:${DISPLAY};font-size:20px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}
        .similar-hook{font-size:13px;line-height:1.55;color:${C.soft};margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .similar-meta{font-family:${MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.faint}}
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
        .shortlist{margin-top:36px;background:${C.ink};color:#fff;border-radius:20px;padding:26px 28px}
        .shortlist-items{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .shortlist-pill{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 14px;font-size:13px}
        .find-badge{display:inline-block;border:1px solid ${C.rule};background:${C.cream};color:${C.soft};border-radius:999px;padding:5px 12px;font-family:${MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;margin-bottom:12px}
        .scout-masthead{text-align:center;padding:64px 0 56px}
        .scout-masthead-rule{height:1px;background:${C.rule};max-width:100px;margin:0 auto}
        .scout-masthead-brand{font-family:${DISPLAY};font-size:clamp(36px,5.5vw,60px);letter-spacing:-.04em;font-weight:600;margin:32px 0 16px;line-height:1.05}
        .scout-masthead-tagline{color:${C.soft};font-size:18px;line-height:1.55;max-width:480px;margin:0 auto 24px;font-weight:400;letter-spacing:-.01em}
        .scout-masthead-meta{font-family:${MONO};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint}}
        .scout-masthead-dot{margin:0 12px;color:${C.rule}}
        .scout-label{font-family:${MONO};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint};font-weight:500;margin-bottom:20px}
        .scout-section-label{font-family:${MONO};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint};font-weight:500;text-align:center;margin:64px 0 32px;padding-top:56px;border-top:1px solid ${C.rule}}
        .scout-cover{display:block;width:100%;border:0;background:transparent;padding:0;margin:0 0 64px;cursor:pointer;text-align:left}
        .scout-cover-bleed{position:relative;width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);min-height:min(76vh,680px);overflow:hidden;background:#1a1a1a}
        .scout-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .8s ease}
        .scout-cover:hover .scout-cover-img{transform:scale(1.02)}
        .scout-cover-gradient{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,.82) 100%)}
        .scout-cover-body{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:56px max(28px,calc((100vw - 1180px)/2 + 28px)) 64px;color:#fff}
        .scout-kicker{font-family:${MONO};font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:20px}
        .scout-stage-pill{display:inline-block;align-self:flex-start;border-radius:999px;color:#fff;padding:8px 15px;font-family:${MONO};font-size:9px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:22px}
        .scout-stage-pill-sm{padding:6px 11px;font-size:8px;margin-bottom:0;letter-spacing:.12em}
        .scout-cover-headline{font-family:${DISPLAY};font-size:clamp(36px,5.5vw,64px);letter-spacing:-.04em;line-height:1.08;margin:0;font-weight:600;max-width:820px;text-wrap:balance}
        .scout-cover-byline{margin-top:18px;font-family:${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
        .scout-cover-deck{margin:20px 0 0;font-size:clamp(17px,2.2vw,21px);line-height:1.55;font-weight:400;letter-spacing:-.01em;max-width:640px;color:rgba(255,255,255,.82)}
        .scout-cover-cta{margin-top:32px;font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);transition:color .2s}
        .scout-cover:hover .scout-cover-cta{color:rgba(255,255,255,.85)}
        .scout-pick{margin:0 0 72px;padding:48px 0;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule}}
        .scout-pick-list{list-style:none;padding:0;margin:0}
        .scout-pick-list li{display:flex;gap:14px;font-size:16px;line-height:1.7;color:${C.text};margin-bottom:16px}
        .scout-pick-list li:last-child{margin-bottom:0}
        .scout-pick-list li span:first-child{color:${C.faint};flex-shrink:0}
        .scout-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:36px;margin-bottom:80px}
        .scout-card{display:flex;flex-direction:column;border:0;background:transparent;padding:0;cursor:pointer;text-align:left}
        .scout-card-visual{position:relative;aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:#1a1a1a;margin-bottom:22px;box-shadow:0 2px 16px rgba(0,0,0,.06);transition:box-shadow .35s ease,transform .35s ease}
        .scout-card:hover .scout-card-visual{box-shadow:0 12px 36px rgba(0,0,0,.1);transform:translateY(-4px)}
        .scout-card-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
        .scout-card:hover .scout-card-img{transform:scale(1.04)}
        .scout-card-visual .scout-stage-pill{position:absolute;top:16px;left:16px;z-index:1}
        .scout-card-name{font-family:${DISPLAY};font-size:28px;letter-spacing:-.03em;margin:0 0 8px;font-weight:600;line-height:1.12}
        .scout-card-state{font-family:${MONO};font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-bottom:12px}
        .scout-card-teaser{font-size:15px;line-height:1.65;color:${C.soft};margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .footer-card{margin-top:40px;background:${C.ink};color:#fff;border-radius:20px;padding:32px}
        .footer-list{list-style:none;padding:0;margin:16px 0 0}
        .footer-list li{display:flex;gap:14px;color:rgba(255,255,255,.72);line-height:1.65;margin-bottom:12px;font-size:15px}
        @media(max-width:760px){
          .page{padding-left:16px;padding-right:16px}
          .hero-wrap{min-height:100vh;background-position:center 38%}
          .nav-links{display:none}
          .hero-content{padding-top:88px;padding-bottom:40px}
          .hero-title{font-size:clamp(36px,9vw,47px)}
          .hero-copy{margin-top:28px;font-size:14px}
          .search-panel{flex-direction:column;border-radius:28px;padding:14px;max-width:100%;margin-top:40px}
          .search-input{padding:14px 4px;text-align:center}
          .search-button{width:100%;border-radius:16px;padding:16px 28px}
          .lifestyle-chips{gap:6px}
          .lifestyle-chip{font-size:12px;padding:8px 12px}
          .content{margin-top:-40px}
          .toolbar{border-radius:16px}
          .tab{padding:10px 12px;font-size:12px}
          .home-section{margin:56px 0}
          .why-grid{grid-template-columns:1fr;gap:14px}
          .home-section-featured{margin:40px 0 64px}
          .featured-scout-layout{grid-template-columns:1fr;min-height:0}
          .featured-scout-visual{min-height:280px}
          .featured-scout-body{padding:32px 24px 36px}
          .featured-scout-btn{width:100%;max-width:none;text-align:center}
          .featured-scout-stats{grid-template-columns:1fr 1fr}
          .featured-scout-stat{padding:20px 24px}
          .featured-scout-stat:nth-child(2){border-right:0}
          .featured-scout-stat:nth-child(1),.featured-scout-stat:nth-child(2){border-bottom:1px solid ${C.rule}}
          .featured-scout-stat:nth-child(odd){border-right:1px solid ${C.rule}}
          .finds-preview-grid{grid-template-columns:1fr;gap:24px}
          .finds-preview-head{flex-direction:column;align-items:flex-start}
          .split{grid-template-columns:1fr}
          .stats{grid-template-columns:1fr}
          .town-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
          .fit-ring{width:76px;height:76px;right:18px;bottom:18px}
          .town-overlay{padding:24px 20px}
          .town-overlay-detail{padding:28px 20px 32px}
          .town-detail{padding:28px 20px 36px}
          .scout-verdict{flex-direction:column;gap:24px}
          .fit-editorial{grid-template-columns:1fr;gap:36px}
          .facts-strip-item{flex:1 1 100%;border-right:0;border-bottom:1px solid ${C.rule};padding:16px 0}
          .facts-strip-item:last-child{border-bottom:0}
          .fit-summary{grid-template-columns:1fr}
          .similar-grid{grid-template-columns:1fr}
          .scout-cover-body{padding:32px 20px 40px}
          .scout-grid{grid-template-columns:1fr}
          .scout-masthead{padding:40px 0 32px}
          .town-summary,.expanded{padding-left:20px;padding-right:20px}
          .budget-row{flex-wrap:wrap}
        }
        @media(min-width:761px) and (max-width:1024px){
          .why-grid{grid-template-columns:repeat(2,1fr)}
          .finds-preview-grid{grid-template-columns:repeat(2,1fr)}
          .featured-scout-stats{grid-template-columns:repeat(2,1fr)}
          .featured-scout-stat:nth-child(2){border-right:0}
          .featured-scout-stat:nth-child(1),.featured-scout-stat:nth-child(2){border-bottom:1px solid ${C.rule}}
        }
      `}</style>

      <section className="hero-wrap">
        <div className="page">
          <nav className="nav">
            <div className="brand-block">
              <div className="brand">Where Next</div>
              <div className="brand-sub">A Relocation Scout</div>
            </div>
            <div className="nav-links">
              <button className="nav-link" data-on={isSearch ? "1" : "0"} onClick={() => go("search")}>Your Search</button>
              <button className="nav-link" data-on={isFind ? "1" : "0"} onClick={() => go("find")}>Hidden Finds</button>
            </div>
          </nav>

          <div className="hero-content">
            <h1 className="hero-title">Find where your next life begins.</h1>
            <p className="hero-copy">
              Describe your ideal life. We&apos;ll find towns you&apos;ve probably never considered, explain why people are
              moving there, show what your budget really buys, and tell you the trade-offs before you pack a box.
            </p>

            <div className="search-panel">
              <input
                className="search-input"
                value={q}
                onChange={(e) => {
                  const value = e.target.value;
                  setQ(value);
                  if (!value.trim()) {
                    setSearch(null);
                    setOpen(null);
                    setTuning(false);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && !busy && runSearch()}
                placeholder="Mountains, lakes, small town, under $400k..."
              />
              <button className="search-button" disabled={!!busy || !q.trim()} onClick={runSearch}>
                {busy === "search" ? "Searching..." : "Find My Towns"}
              </button>
            </div>

            {err && !busy && (
              <p className="search-error" role="alert">{err}</p>
            )}

            <div className="lifestyle-chips">
              {LIFESTYLE_CHIPS.map((chip) => (
                <button key={chip} type="button" className="lifestyle-chip" onClick={() => setQ(chip)}>
                  {chip}
                </button>
              ))}
            </div>

            <div className="toolbar">
              <button className="tab" data-on={isSearch ? "1" : "0"} onClick={() => go("search")}>Your Search</button>
              <button className="tab" data-on={isFind ? "1" : "0"} onClick={() => go("find")}>Hidden Finds</button>
              <button className="tab" data-on={isStates ? "1" : "0"} onClick={() => go("states")}>Explore by State</button>
            </div>

            {busy === "search" && (
              <div className="loading">
                <span className="spinner" />
                <span>{LOADING_STEPS[loadingStep]}...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {isSearch && !search && !busy && (
        <div className="page landing">
          <section className="home-section intro">
            <div className="section-eyebrow">Why Where Next</div>
            <h2 className="intro-title">Not another &ldquo;Best Places to Live&rdquo; list.</h2>
            <p className="intro-copy">
              Every town has a story. We dig deeper than rankings and cost-of-living charts to uncover what actually
              matters: why people are moving there, what your money buys, what&apos;s changing, and what nobody tells
              you until after you&apos;ve moved.
            </p>
          </section>

          <section className="home-section home-section-featured">
            {homepageFeaturedFind && (
              <FeaturedScoutTeaser
                town={homepageFeaturedFind}
                st={homepageFeaturedFind.st}
                onRead={() => {
                  go("find");
                  setOpen(homepageFeaturedFind.id + homepageFeaturedFind.st);
                }}
              />
            )}
          </section>

          <section className="home-section">
            <h2 className="finds-preview-title">Hidden Finds</h2>
            <div className="finds-preview-grid">
              {hiddenFindsFlat.slice(0, 4).map((t, i) => (
                <FindPreviewCard
                  key={t.id + t.st}
                  town={t}
                  st={t.st}
                  loadDelay={i * 300}
                  onOpen={() => {
                    go("find");
                    setOpen(t.id + t.st);
                  }}
                />
              ))}
            </div>
            <button type="button" className="finds-preview-cta" onClick={() => go("find")}>
              See all Hidden Finds →
            </button>
          </section>
        </div>
      )}

      <main className="page content">
        {isSearch && S && (
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
                st=""
                townKey={t.id}
                peerTowns={ranked}
                rank={i + 1}
                score={t.score}
                loadDelay={i * 600}
                open={open === t.id}
                toggle={() => setOpen(open === t.id ? null : t.id)}
                onNavigate={(key) => setOpen(key)}
                mark={mark}
                marks={marks}
                budget={budget}
              />
            ))}

            <Footer notes={S.footer} live label="This search" data={S} />
          </>
        )}

        {isFind && (
          <>
            <ScoutMasthead weekLabel={scoutPub.weekLabel} issue={scoutPub.issue} />

            {!hiddenFinds.length ? (
              <p className="intro-copy">No hidden finds are available yet.</p>
            ) : openFind ? (
              <Card
                key={openFind.id + openFind.st}
                t={openFind}
                st={openFind.st}
                townKey={openFind.id + openFind.st}
                peerTowns={hiddenFindsFlat}
                open
                toggle={() => setOpen(null)}
                onNavigate={(key) => setOpen(key)}
                mark={mark}
                marks={marks}
                budget={budget}
                findBadge={hiddenFindBadge(openFind)}
              />
            ) : (
              <>
                <ScoutCoverStory
                  town={featuredFind}
                  st={featuredFind.st}
                  onOpen={() => setOpen(featuredFind.id + featuredFind.st)}
                />

                {featuredFind.why?.length > 0 && (
                  <section className="scout-pick">
                    <div className="scout-label">Why it&apos;s this week&apos;s pick</div>
                    <ul className="scout-pick-list">
                      {featuredFind.why.slice(0, 5).map((item, i) => (
                        <li key={i}>
                          <span>—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {restFinds.length > 0 && (
                  <>
                    <div className="scout-section-label">Also This Week</div>
                    <div className="scout-grid">
                      {restFinds.map((t, i) => (
                        <ScoutEditorialCard
                          key={t.id + t.st}
                          town={t}
                          st={t.st}
                          loadDelay={(i + 1) * 400}
                          onOpen={() => setOpen(t.id + t.st)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {isStates && (
          <>
            {!browseState ? (
              <StateExploreGrid
                onSelectState={(abbr) => {
                  setBrowseState(abbr);
                  setOpen(null);
                }}
              />
            ) : openStateTown ? (
              <>
                <button
                  type="button"
                  className="state-back"
                  onClick={() => {
                    setBrowseState(null);
                    setOpen(null);
                  }}
                >
                  ← Back to all states
                </button>
                <Card
                  key={openStateTown.id + browseState}
                  t={openStateTown}
                  st={browseState}
                  townKey={openStateTown.id + browseState}
                  peerTowns={stateTowns.map((town) => ({ ...town, st: browseState }))}
                  open
                  toggle={() => setOpen(null)}
                  onNavigate={(key) => setOpen(key)}
                  mark={mark}
                  marks={marks}
                  budget={budget}
                />
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="state-back"
                  onClick={() => {
                    setBrowseState(null);
                    setOpen(null);
                  }}
                >
                  ← Back to all states
                </button>
                <div className="state-detail-head">
                  <h2 className="state-explore-title" style={{ margin: 0 }}>{browseStateName}</h2>
                  {browseStateListingsUrl && (
                    <a
                      className="state-listings-btn"
                      href={browseStateListingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View homes in {browseStateName} →
                    </a>
                  )}
                </div>
                {stateTowns.length === 0 ? (
                  <p className="state-empty">No town reports published yet.</p>
                ) : (
                  stateTowns.map((t, i) => (
                    <Card
                      key={t.id + browseState}
                      t={t}
                      st={browseState}
                      townKey={t.id + browseState}
                      peerTowns={stateTowns.map((town) => ({ ...town, st: browseState }))}
                      open={false}
                      toggle={() => setOpen(t.id + browseState)}
                      onNavigate={(key) => setOpen(key)}
                      mark={mark}
                      marks={marks}
                      budget={budget}
                      loadDelay={i * 400}
                    />
                  ))
                )}
              </>
            )}
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
  const rows = getTownFactsDisplay(t).filter((row) => !row.pending);
  if (!rows.length) return null;
  return (
    <div className="town-facts">
      {rows.map(({ key, label, icon, value }) => (
        <div key={key} className="fact-item">
          <div className="fact-head">
            <span className="fact-icon"><Icon name={icon} /></span>
            <span className="fact-label">{label}</span>
          </div>
          <div className="fact-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

function TownFactsStrip({ t, stage, over }) {
  const rows = getTownFactsDisplay(t).filter((row) => !row.pending);
  const items = [];

  if (t.priceLabel) {
    items.push({ key: "price", label: "Typical home", value: t.priceLabel, color: over ? C.rust : C.text });
  }
  if (t.delta) {
    items.push({ key: "delta", label: "Market direction", value: t.delta });
  }
  if (stage?.label) {
    items.push({ key: "stage", label: "Discovery stage", value: stage.label, color: stage.c });
  }
  for (const row of rows) {
    items.push({ key: row.key, label: row.label, value: row.value });
  }

  if (!items.length) return null;

  return (
    <div className="facts-strip">
      {items.map((item) => (
        <div key={item.key} className="facts-strip-item">
          <div className="facts-strip-label">{item.label}</div>
          <div className="facts-strip-value" style={item.color ? { color: item.color } : undefined}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function scoutClamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function parseTownPrice(t) {
  if (Number.isFinite(t.price) && t.price > 0) return t.price;
  const m = (t.priceLabel || "").replace(/[,~]/g, "").match(/\$?\s*([\d.]+)\s*k/i);
  if (m) return parseFloat(m[1]) * 1000;
  return null;
}

function townTextBlob(t) {
  return [
    t.jobs, t.get, t.cost, t.hook, t.never, t.history,
    ...(t.why || []), ...(t.watch || []),
  ].join(" ").toLowerCase();
}

function scoreJobMarket(t) {
  if (Number.isFinite(t.scores?.jobs)) {
    return { score: scoutClamp((t.scores.jobs / 5) * 100), provisional: false };
  }
  const j = (t.jobs || "").toLowerCase();
  if (!j) return { score: 55, provisional: true };

  let score = 55;
  if (/semiconductor|manufacturing|aerospace|defense|health|university|diversified|strongest|hq|walmart|tyson|hunt|space|anchor|employer/.test(j)) score += 20;
  if (/spillover|corridor|ecosystem|steady|refill|private space/.test(j)) score += 10;
  if (/thin|one-industry|tourism only|hospitality only|remote-work|forty minutes up the road/.test(j)) score -= 15;
  if (/construction.*retail|serving the retirement|almost all of it serving/.test(j)) score -= 10;

  return { score: scoutClamp(score), provisional: true };
}

function scoreHousingAffordability(t, budget = 400000) {
  const price = parseTownPrice(t);
  const blob = townTextBlob(t);
  let provisional = !price;
  let score = 60;

  if (price) {
    const ratio = price / budget;
    if (ratio <= 0.65) score = 92;
    else if (ratio <= 0.75) score = 85;
    else if (ratio <= 0.85) score = 78;
    else if (ratio <= 1.0) score = 68;
    else if (ratio <= 1.15) score = 55;
    else score = 42;
    provisional = false;
  }

  const delta = t.delta || "";
  if (/[−-]\d/.test(delta)) score += 8;
  const upMatch = delta.match(/\+([\d.]+)/);
  if (upMatch && parseFloat(upMatch[1]) > 7) score -= 10;
  if (/cheap|afford|below.*median|under the national|growth on sale|discount|20% under/.test(blob)) score += 6;
  if (/priced|closing|expensive|priciest|cheapest window is closing/.test(blob)) score -= 12;

  return { score: scoutClamp(score), provisional };
}

function scoreGrowthPotential(t) {
  const stageBase = { early: 82, heating: 68, late: 48 };
  let score = stageBase[t.stage] || 65;
  const blob = townTextBlob(t);
  let provisional = !t.why?.length && !t.hook;

  if (/doubled|fastest-growing|jumped from|grew \d+%|net migration|approach 80,000|population.*between/.test(blob)) score += 10;
  if (/ranked.*relocation|most-searched|still a window|expanding straight/.test(blob)) score += 6;
  if (/closing|priced out|listings up|already hot|first movers|discount is closing/.test(blob)) score -= 12;

  const delta = t.delta || "";
  const upMatch = delta.match(/\+([\d.]+)/);
  if (upMatch) {
    const pct = parseFloat(upMatch[1]);
    if (pct > 8) score -= 8;
    else if (pct > 0) score += 4;
  }
  if (/[−-]\d/.test(delta)) score += 6;

  return { score: scoutClamp(score), provisional };
}

function scoreCostOfLiving(t) {
  const blob = townTextBlob(t);
  const cost = (t.cost || "").toLowerCase();
  const hasSignal = cost || /below national|no state income tax|cheaper insurance|under the national|nearer \$5,500/.test(blob);

  if (!hasSignal) return { score: 58, provisional: true };

  let score = 62;
  if (/no state income tax|below national|under the national|cheaper insurance|inland.*cheaper|nearer \$5,500|part of the draw/.test(blob)) score += 18;
  if (/budget high|premium|8,460|11,000|dearer|expensive|rules apply|show up in your premium/.test(blob)) score -= 12;

  return { score: scoutClamp(score), provisional: !cost };
}

function scoreLifestyleAmenities(t) {
  const scores = t.scores || {};
  const lifestyleKeys = Object.keys(scores).filter((k) => k !== "jobs" && k !== "risk");
  if (lifestyleKeys.length > 0) {
    const avg = lifestyleKeys.reduce((s, k) => s + num(scores[k]), 0) / lifestyleKeys.length;
    return { score: scoutClamp((avg / 5) * 100), provisional: false };
  }

  const walk = t.facts?.walkability;
  if (walk) {
    const w = walk.toLowerCase();
    const score = w.includes("walkable") ? 78 : w.includes("mixed") ? 62 : 45;
    return { score: scoutClamp(score), provisional: false };
  }

  const blob = townTextBlob(t);
  let score = 55;
  if (/walkable|main street|university town|appalachian|ozark|beach|mountain|college|grape festival|real main street|things to do/.test(blob)) score += 15;
  if (/drive through|crossroads|exit sign|nothing else|retirement development|strain everything/.test(blob)) score -= 10;

  return { score: scoutClamp(score), provisional: true };
}

function scoreClimate(t) {
  const watch = (t.watch || []).join(" ").toLowerCase();
  const cost = (t.cost || "").toLowerCase();
  const weather = (t.facts?.weather || "").toLowerCase();
  const climateText = `${watch} ${cost} ${weather}`;

  if (!/(heat|113|humid|wildfire|hurricane|flood|storm|climate|weather|insurance)/.test(climateText)) {
    return { score: 62, provisional: true };
  }

  let score = 72;
  const hazards = climateText.match(/heat|113|wildfire|hurricane|flood|humid/g);
  if (hazards) score -= Math.min(28, hazards.length * 8);
  if (/heat|wildfire/.test(cost)) score -= 10;
  if (/mild|four seasons|foothill/.test(climateText)) score += 10;

  return { score: scoutClamp(score), provisional: !weather && !/(heat|wildfire|hurricane|113|humid)/.test(watch + cost) };
}

function scoreRisk(t) {
  const watch = t.watch || [];
  if (watch.length === 0) return { score: 65, provisional: true };

  let score = 78;
  score -= watch.length * 8;
  const blob = watch.join(" ").toLowerCase();
  if (/157%|major|doubling.*strains|one-industry|insurance|too few sales|closing while you read/.test(blob)) score -= 10;
  if (t.stage === "late") score -= 12;
  if (t.verified === false) score -= 8;

  return { score: scoutClamp(score), provisional: true };
}

function scoutRatingLabel(overall) {
  if (overall >= 90) return "Exceptional Opportunity";
  if (overall >= 80) return "Buy Early";
  if (overall >= 70) return "Worth Watching";
  if (overall >= 60) return "Mixed Outlook";
  return "Proceed Carefully";
}

function buildScoutScorecard(t, budget = 400000) {
  const categories = [
    { id: "jobs", label: "Job Market", weight: 0.2, ...scoreJobMarket(t) },
    { id: "housing", label: "Housing Affordability", weight: 0.2, ...scoreHousingAffordability(t, budget) },
    { id: "growth", label: "Growth Potential", weight: 0.15, ...scoreGrowthPotential(t) },
    { id: "cost", label: "Cost of Living", weight: 0.15, ...scoreCostOfLiving(t) },
    { id: "lifestyle", label: "Lifestyle & Amenities", weight: 0.1, ...scoreLifestyleAmenities(t) },
    { id: "climate", label: "Climate", weight: 0.1, ...scoreClimate(t) },
    { id: "risk", label: "Risk", weight: 0.1, ...scoreRisk(t) },
  ];

  const overall = scoutClamp(categories.reduce((sum, c) => sum + c.score * c.weight, 0));

  return { overall, rating: scoutRatingLabel(overall), categories };
}

function ScoutScorecard({ t, budget }) {
  const card = useMemo(() => buildScoutScorecard(t, budget), [t, budget]);

  return (
    <div className="scout-score-block">
      <div className="scout-score-header">
        <div className="scout-score-label">Scout Score</div>
        <div className="scout-score-num">{card.overall}</div>
        <div className="scout-score-rating">{card.rating}</div>
        <div className="scout-score-out">Out of 100</div>
      </div>

      <div className="scout-score-breakdown">
        {card.categories.map((c) => (
          <div key={c.id} className="scout-score-row">
            <div className="scout-score-row-head">
              <span className="scout-score-row-label">{c.label}</span>
              <span className="scout-score-row-val">{c.score}</span>
            </div>
            <div className="scout-score-bar">
              <div className="scout-score-bar-fill" style={{ width: `${c.score}%` }} />
            </div>
            {c.provisional && <span className="scout-score-prov">Provisional</span>}
          </div>
        ))}
      </div>

      <details className="scout-score-how">
        <summary>How we score</summary>
        <p>
          Scout Score measures relocation potential using jobs, housing, growth, cost of living, lifestyle,
          climate, and local risks. The score is intended to explain opportunity and trade-offs, not simply
          rank popularity.
        </p>
      </details>
    </div>
  );
}

function lowerFirst(s) {
  if (!s) return "";
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function scoutVerdictText(t, stage) {
  const n = t.name;

  const line1 = (() => {
    const affordWhy = (t.why || []).find((w) => /cheap|afford|below|under|last|sale|rare|overlook|quietly|forgotten/i.test(w));
    if (affordWhy) {
      const clause = affordWhy.replace(/\.$/, "");
      return `${n} is ${lowerFirst(clause)}.`;
    }
    if (t.get) {
      return `${n} is the kind of place where ${lowerFirst(t.get.replace(/\.$/, ""))}.`;
    }
    if (t.never) {
      const clause = t.never.split(".")[0];
      return `${n} is still under the radar — ${lowerFirst(clause)}.`;
    }
    return t.hook;
  })();

  const blob = [t.jobs, t.get, ...(t.why || []), ...(t.watch || [])].join(" ");
  const buyFor = /semiconductor|manufacturing|job|growth|momentum|university|appreciation|population|doubled|grew/i.test(blob)
    ? "long-term appreciation"
    : "the underlying thesis";

  const notFor = (() => {
    const w = t.watch?.[0] || "";
    if (/heat|climate|wildfire|113|humid/i.test(w)) return "climate comfort";
    if (/commute|drive|hour|car/i.test(w)) return "a painless commute";
    if (/priced|late|26\.|9\.7|closing|expensive/i.test(w) || t.stage === "late") return "chasing a bargain";
    if (/job|industry|thin|health|one-industry/i.test(w)) return "career optionality";
    if (t.cost) return lowerFirst(t.cost.replace(/\.$/, "").split(".")[0]);
    return "picture-postcard living";
  })();

  let line2;
  if (t.stage === "late") {
    const caveat = t.watch?.[0] || stage.blurb;
    line2 = `We would only recommend ${n} if you understand the tradeoffs — ${lowerFirst(caveat.replace(/\.$/, ""))}.`;
  } else if (t.stage === "early") {
    line2 = `We would buy here for ${buyFor}, not ${notFor}.`;
  } else {
    line2 = `We would move with intent — ${buyFor} still wins, if you can live with ${notFor}.`;
  }

  return `${line1} ${line2}`;
}

function wouldWeMoveSummary(t, stage) {
  const lead = t.why?.[0] || t.hook;
  const caveat = t.watch?.[0];
  if (t.stage === "late") {
    return `We would proceed carefully. ${lead}${caveat ? ` The biggest concern: ${caveat}` : ""}`;
  }
  if (t.stage === "early") {
    return `Yes — if you can live with the tradeoffs. ${lead}${caveat ? ` Just know: ${caveat}` : ""}`;
  }
  return `Conditionally yes. ${lead}${caveat ? ` Watch for: ${caveat}` : ""} ${stage?.blurb ? stage.blurb : ""}`.trim();
}

function getFeaturedFind(finds, now = new Date()) {
  if (!finds.length) return null;
  const { issue } = getScoutPublication(now);
  const week = Math.max(0, parseInt(issue, 10) - 1);
  return finds[week % finds.length];
}

function featuredScoutStatsFor(town) {
  const stage = scoutStageFor(town);
  return [
    { label: "The Catch", value: town.watch?.[0] || town.never || "—" },
    { label: "Typical Home", value: town.priceLabel || "—" },
    { label: "What You Get", value: town.get || "—" },
    { label: "Discovery Stage", value: stage.label },
  ];
}

function getScoutPublication(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + monOffset);
  monday.setHours(0, 0, 0, 0);

  const weekLabel = `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekOfYear = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);

  return { weekLabel, issue: String(weekOfYear).padStart(3, "0") };
}

function scoutEditorialFor(t) {
  const ed = SCOUT_EDITORIAL[t.id];
  if (ed) return { headline: ed.headline, deck: t.hook, cta: ed.cta };
  return {
    headline: t.hook,
    deck: t.never || t.hook,
    cta: `Meet ${t.name} →`,
  };
}

function scoutStageFor(t) {
  return SCOUT_STAGE[t.stage] || SCOUT_STAGE.heating;
}

function StateExploreGrid({ onSelectState }) {
  return (
    <section className="state-explore">
      <h2 className="state-explore-title">Explore by State</h2>
      <div className="state-grid">
        {STATE_LIST.map(({ abbr, name }) => (
          <button
            key={abbr}
            type="button"
            className="state-card"
            onClick={() => onSelectState(abbr)}
          >
            <div className="state-card-name">{name}</div>
            <div className="state-card-abbr">{abbr}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function FeaturedScoutTeaser({ town, st, onRead }) {
  const stats = featuredScoutStatsFor(town);
  return (
    <article className="featured-scout">
      <div className="featured-scout-layout">
        <div className="featured-scout-visual">
          <ScoutImage town={town} st={st} className="featured-scout-img" />
        </div>
        <div className="featured-scout-body">
          <span className="featured-scout-badge">Scout Pick</span>
          <h2 className="featured-scout-name">{town.name}</h2>
          <div className="featured-scout-location">{parseTownLocation(town, st)}</div>
          <p className="featured-scout-deck">{town.hook}</p>
          <button type="button" className="featured-scout-btn" onClick={onRead}>
            Read Scout Report →
          </button>
        </div>
      </div>
      <div className="featured-scout-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="featured-scout-stat">
            <div className="featured-scout-stat-label">{stat.label}</div>
            <div className="featured-scout-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

function FindPreviewCard({ town, st, onOpen, loadDelay = 0 }) {
  const stage = scoutStageFor(town);
  const { headline } = scoutEditorialFor(town);
  return (
    <button type="button" className="finds-preview-card" onClick={onOpen}>
      <div className="finds-preview-visual">
        <ScoutImage town={town} st={st} className="finds-preview-img" loadDelay={loadDelay} />
        <span className="finds-preview-stage" style={{ background: stage.c }}>{stage.label}</span>
      </div>
      <h3 className="finds-preview-name">{town.name}</h3>
      <div className="finds-preview-sub">{parseTownLocation(town, st)}</div>
      <p className="finds-preview-hook">{headline}</p>
    </button>
  );
}

function ScoutMasthead({ weekLabel, issue }) {
  return (
    <header className="scout-masthead">
      <div className="scout-masthead-rule" />
      <div className="scout-masthead-brand">The Scout Report</div>
      <p className="scout-masthead-tagline">Finding tomorrow&apos;s hometowns before everyone else does.</p>
      <div className="scout-masthead-meta">
        <span>{weekLabel}</span>
        <span className="scout-masthead-dot">·</span>
        <span>Issue No. {issue}</span>
      </div>
      <div className="scout-masthead-rule" style={{ marginTop: 32 }} />
    </header>
  );
}

function ScoutImage({ town, st, className, loadDelay = 0 }) {
  const chain = useMemo(
    () => getTownImageChain(town, st),
    [town.id, town.name, town.sub, town.image, st]
  );
  const [src, setSrc] = useState(() => chain[0] || US_FALLBACK_IMAGE);
  const failedUrls = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setSrc(chain[0] || US_FALLBACK_IMAGE);
    failedUrls.current = new Set();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            town: { id: town.id, name: town.name, sub: town.sub, image: town.image },
            stateAbbr: st,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.image && isValidImageUrl(data.image) && isModernHeroPhoto(data.image)) {
          setSrc(data.image);
        } else if (!cancelled) {
          failedUrls.current.add(data.image);
          setSrc(getTownImageFallback(town, data.image, st, failedUrls.current));
        }
      } catch {}
    }, loadDelay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [town.id, town.name, town.sub, town.image, st, loadDelay, chain]);

  const handleError = () => {
    setSrc((prev) => {
      failedUrls.current.add(prev);
      return getTownImageFallback(town, prev, st, failedUrls.current);
    });
  };

  return (
    <img
      className={className}
      src={src}
      alt=""
      decoding="async"
      onError={handleError}
    />
  );
}

function ScoutCoverStory({ town, st, onOpen }) {
  const stage = scoutStageFor(town);
  const { headline, deck, cta } = scoutEditorialFor(town);
  return (
    <button type="button" className="scout-cover" onClick={onOpen}>
      <div className="scout-cover-bleed">
        <ScoutImage town={town} st={st} className="scout-cover-img" />
        <div className="scout-cover-gradient" />
        <div className="scout-cover-body">
          <span className="scout-stage-pill" style={{ background: stage.c }}>{stage.label}</span>
          <div className="scout-kicker">Cover Story</div>
          <h2 className="scout-cover-headline">{headline}</h2>
          <div className="scout-cover-byline">
            {town.name} · {parseTownLocation(town, st)}
          </div>
          <p className="scout-cover-deck">{deck}</p>
          <div className="scout-cover-cta">{cta}</div>
        </div>
      </div>
    </button>
  );
}

function ScoutEditorialCard({ town, st, onOpen, loadDelay = 0 }) {
  const stage = scoutStageFor(town);
  const { headline } = scoutEditorialFor(town);
  return (
    <button type="button" className="scout-card" onClick={onOpen}>
      <div className="scout-card-visual">
        <ScoutImage town={town} st={st} className="scout-card-img" loadDelay={loadDelay} />
        <span className="scout-stage-pill scout-stage-pill-sm" style={{ background: stage.c }}>{stage.label}</span>
      </div>
      <h3 className="scout-card-name">{town.name}</h3>
      <div className="scout-card-state">{parseTownLocation(town, st)}</div>
      <p className="scout-card-teaser">{headline}</p>
    </button>
  );
}

function TownVisual({
  town,
  stateAbbr,
  stage,
  rank,
  score,
  loadDelay = 0,
  detail = false,
  hook,
  saved,
  onSave,
  onShare,
  shareLabel = "Share",
}) {
  const chain = useMemo(
    () => getTownImageChain(town, stateAbbr),
    [town.id, town.name, town.sub, town.image, stateAbbr]
  );
  const [src, setSrc] = useState(() => chain[0] || US_FALLBACK_IMAGE);
  const failedUrls = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setSrc(chain[0] || US_FALLBACK_IMAGE);
    failedUrls.current = new Set();

    const cacheKey = `wn-img:${town.id || town.name}:${stateAbbr || ""}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached && isValidImageUrl(cached) && isModernHeroPhoto(cached)) {
        setSrc(cached);
      }
    } catch {}

    const timer = setTimeout(async () => {
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
        if (!cancelled && data.image && isValidImageUrl(data.image) && isModernHeroPhoto(data.image)) {
          setSrc(data.image);
          try {
            sessionStorage.setItem(cacheKey, data.image);
          } catch {}
        } else if (!cancelled && data.image) {
          failedUrls.current.add(data.image);
          setSrc(getTownImageFallback(town, data.image, stateAbbr, failedUrls.current));
        }
      } catch {}
    }, loadDelay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [town.id, town.name, town.sub, town.image, stateAbbr, loadDelay, chain]);

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
      if (data.image && isValidImageUrl(data.image) && isModernHeroPhoto(data.image)) {
        setSrc(data.image);
        return;
      }
      if (data.image) failedUrls.current.add(data.image);
    } catch {}
    setSrc(getTownImageFallback(town, skipUrl, stateAbbr, failedUrls.current));
  };

  const handleError = () => {
    setSrc((prev) => {
      failedUrls.current.add(prev);
      const next = getTownImageFallback(town, prev, stateAbbr, failedUrls.current);
      if (next !== prev) return next;
      resolveFromApi(prev);
      return US_FALLBACK_IMAGE;
    });
  };

  const placeholder = chain[chain.length - 1] || US_FALLBACK_IMAGE;

  return (
    <div className="town-visual-wrap">
      <div
        className={`town-visual${detail ? " town-visual-detail" : ""}`}
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
        <div className={`town-overlay${detail ? " town-overlay-detail" : ""}`}>
          {rank && !detail && <div className="rank">{String(rank).padStart(2, "0")} / BEST MATCHES</div>}
          <h3 className={`town-name${detail ? " town-name-detail" : ""}`}>{town.name}</h3>
          <div className="town-sub">{detail ? parseTownLocation(town, stateAbbr) : town.sub}</div>
          {detail && hook && <p className="town-hero-summary">{hook}</p>}
          {detail && (
            <div className="hero-actions">
              <button
                type="button"
                className="hero-btn"
                data-on={saved ? "1" : "0"}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
              >
                {saved ? "♥ Saved" : "♥ Save"}
              </button>
              <button
                type="button"
                className="hero-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.();
                }}
              >
                {shareLabel}
              </button>
            </div>
          )}
        </div>
        {Number.isFinite(score) && !detail && (
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

function parseTownLocation(t, st) {
  if (st && US[st]) return US[st];
  if (t.sub) {
    const part = t.sub.split("·")[0].trim();
    if (part) return part;
  }
  return t.sub || "";
}

function getSimilarTowns(t, pool, limit = 3) {
  const others = (pool || []).filter((x) => x.id !== t.id);
  const sameStage = others.filter((x) => x.stage === t.stage);
  const rest = others.filter((x) => x.stage !== t.stage);
  return [...sameStage, ...rest].slice(0, limit);
}

function hiddenFindBadge(t) {
  const text = [
    t.sub, t.hook, t.never, t.history,
    ...(t.why || []), t.jobs, t.get, t.cost,
    ...(t.watch || []),
  ].join(" ").toLowerCase();

  if (/coastal|gulf|beach|ocean|seashore|atlantic|pacific/.test(text)) return "Coastal Secret";
  if (/ozark|appalachian|foothill|mountain/.test(text)) return "Mountain Escape";
  if (/walkable/.test(text)) return "Walkable";
  if ((t.delta && /[−-]/.test(t.delta)) || (t.stage === "early" && /cheap|afford/.test(text))) return "Still Affordable";
  if (/under the national|below.*median|cost of living still under|20% below/.test(text)) return "Great Value";
  if (/strongest job|semiconductor|walmart hq|tyson|job market in the country/.test(text)) return "Job Growth";
  if (t.stage === "heating" || (t.delta && /\+/.test(t.delta)) || /fastest-growing|doubled|grew \d+%|population.*jump/.test(text)) return "On the Rise";

  return "Worth Watching";
}

function Card({
  t,
  st,
  townKey,
  peerTowns,
  rank,
  score,
  open,
  toggle,
  onNavigate,
  mark,
  marks,
  budget,
  loadDelay = 0,
  findBadge,
}) {
  const m = marks[t.id];
  const stage = STAGE[t.stage] || STAGE.heating;
  const over = t.price && t.price > budget;
  const [shared, setShared] = useState(false);
  const similar = useMemo(() => getSimilarTowns(t, peerTowns), [t.id, t.stage, peerTowns]);

  const handleShare = async () => {
    const loc = parseTownLocation(t, st);
    const text = `${t.name}${loc ? `, ${loc}` : ""} — ${t.hook}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${t.name} on Where Next`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {}
  };

  const getPeerKey = (peer) => peer.id + (peer.st || "");

  if (open) {
    return (
      <article className="town-card town-card-open" style={{ borderColor: m === "yes" ? C.pine : C.rule }}>
        <TownVisual
          town={t}
          stateAbbr={st}
          stage={stage}
          loadDelay={loadDelay}
          detail
          hook={t.hook}
          saved={m === "yes"}
          onSave={() => mark(t.id, "yes")}
          onShare={handleShare}
          shareLabel={shared ? "Copied!" : "Share"}
        />

        <div className="town-detail">
          <button type="button" className="detail-collapse" onClick={toggle}>
            ← Collapse
          </button>

          <section className="scout-verdict">
            <div>
              <div className="scout-verdict-label">Scout Verdict</div>
              <p className="scout-verdict-copy">{scoutVerdictText(t, stage)}</p>
            </div>
            <ScoutScorecard t={t} budget={budget} />
          </section>

          <TownFactsStrip t={t} stage={stage} over={over} />

          {(t.why?.length > 0 || t.watch?.length > 0) && (
            <div className="fit-editorial">
              {t.why?.length > 0 && (
                <div className="fit-editorial-col">
                  <div className="fit-editorial-col-label">Perfect for</div>
                  <Bullets items={t.why.slice(0, 2)} />
                </div>
              )}
              {t.watch?.length > 0 && (
                <div className="fit-editorial-col">
                  <div className="fit-editorial-col-label fit-editorial-col-label-warn">Skip if</div>
                  <Bullets items={t.watch.slice(0, 2)} color={C.soft} />
                </div>
              )}
            </div>
          )}

          {t.verified === false && (
            <p style={{ color: C.rust, fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
              Too few sales for a reliable median. Treat this as a starting point and check live listings.
            </p>
          )}

          <section className="article-section">
            <div className="section-label">Why it matters</div>
            <p className="article-lede">{t.never}</p>
          </section>

          {t.why?.length > 0 && (
            <section className="article-section">
              <div className="section-label">Why it&apos;s rising</div>
              <Bullets items={t.why} />
            </section>
          )}

          {(t.get || t.cost) && (
            <section className="article-section">
              <div className="section-label">Buying power</div>
              {t.get && <p className="body-copy">{t.get}</p>}
              {t.cost && <p className="body-copy" style={{ color: REPORT_LABEL, marginTop: t.get ? 14 : 0, fontSize: 15 }}>{t.cost}</p>}
            </section>
          )}

          {t.jobs && (
            <section className="article-section">
              <div className="section-label">Who&apos;s hiring</div>
              <p className="body-copy">{t.jobs}</p>
            </section>
          )}

          {t.history && (
            <section className="article-section">
              <div className="section-label">History</div>
              <p className="body-copy">{t.history}</p>
            </section>
          )}

          {t.doing && (
            <section className="article-section">
              <div className="section-label">Things to do</div>
              <Bullets items={t.doing} />
            </section>
          )}

          {t.watch?.length > 0 && (
            <section className="article-section">
              <div className="section-label">Before you move</div>
              <Bullets items={t.watch} color={C.rust} />
            </section>
          )}

          <section className="report-close">
            <div className="section-label">Would we move here?</div>
            <p className="report-close-copy">{wouldWeMoveSummary(t, stage)}</p>
          </section>

          {similar.length > 0 && onNavigate && (
            <section className="article-section similar-towns">
              <div className="section-label">Similar towns you might like</div>
              <div className="similar-grid">
                {similar.map((peer) => (
                  <button
                    key={getPeerKey(peer)}
                    type="button"
                    className="similar-card"
                    onClick={() => onNavigate(getPeerKey(peer))}
                  >
                    <div className="similar-name">{peer.name}</div>
                    <p className="similar-hook">{peer.hook}</p>
                    <div className="similar-meta">
                      {[peer.priceLabel, STAGE[peer.stage]?.label].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="article-section">
            <Section label="See what is actually for sale">
              <Listings t={t} st={st} budget={budget} />
            </Section>
          </section>

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
      </article>
    );
  }

  return (
    <article className="town-card" style={{ borderColor: m === "yes" ? C.pine : C.rule }}>
      <TownVisual town={t} stateAbbr={st} stage={stage} rank={rank} score={score} loadDelay={loadDelay} />

      <button type="button" className="town-summary" onClick={toggle}>
        {findBadge && <span className="find-badge">{findBadge}</span>}
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
            <div className="stat-label">Discovery stage</div>
          </div>
        </div>
        {t.note && <div className="note">{t.note}</div>}
      </button>
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
