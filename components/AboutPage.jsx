"use client";

import { C, DISPLAY, BODY, MONO } from "@/lib/designTokens";
import { SiteNavBar, SitePageStyles } from "@/components/SiteNav";

const DIFFERENTIATORS = [
  {
    title: "Places you may have missed",
    copy: "We look beyond the cities and towns that appear on every relocation list.",
  },
  {
    title: "The catch is part of the report",
    copy: "Every place has a drawback. Where Next explains it clearly instead of hiding it beneath promotional language.",
  },
  {
    title: "Research before listings",
    copy: "The site helps users understand a place first, then connects them to live housing options when they are ready.",
  },
];

export default function AboutPage() {
  return (
    <div className={`site-page about-page site-page--standalone`}>
      <SitePageStyles />
      <style>{`
        .about-hero{padding:72px 0 56px;max-width:760px}
        .about-eyebrow{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.olive};font-weight:500;margin-bottom:18px}
        .about-title{font-family:${DISPLAY};font-size:clamp(36px,5vw,56px);line-height:1.08;letter-spacing:-.03em;margin:0 0 28px;font-weight:500;color:${C.ink}}
        .about-intro{font-size:clamp(17px,2vw,19px);line-height:1.72;color:${C.text};margin:0 0 48px;max-width:680px}
        .about-prose{max-width:680px;margin-bottom:64px}
        .about-prose p{font-size:16px;line-height:1.78;color:${C.soft};margin:0 0 20px}
        .about-prose p:last-child{margin-bottom:0}
        .about-prose .about-emphasis{color:${C.text};font-family:${DISPLAY};font-size:22px;line-height:1.45;letter-spacing:-.02em;margin:28px 0 20px;font-weight:500}
        .about-section{margin:80px 0}
        .about-section-label{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.olive};font-weight:500;margin-bottom:24px}
        .about-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .about-card{border:1px solid ${C.rule};border-radius:18px;background:${C.paper};padding:28px 30px;transition:border-color .25s,box-shadow .25s,transform .25s}
        .about-card:hover{border-color:rgba(92,107,90,.22);box-shadow:0 8px 28px rgba(0,0,0,.05);transform:translateY(-2px)}
        .about-card-title{font-family:${DISPLAY};font-size:20px;line-height:1.3;letter-spacing:-.015em;margin:0 0 12px;font-weight:500;color:${C.ink}}
        .about-card-copy{font-size:14px;line-height:1.7;color:${C.soft};margin:0}
        .about-close{margin:88px 0 100px;padding-top:48px;border-top:1px solid ${C.rule};max-width:640px}
        .about-close-title{font-family:${DISPLAY};font-size:clamp(26px,3.2vw,34px);line-height:1.2;letter-spacing:-.02em;margin:0 0 16px;font-weight:500}
        .about-close-copy{font-size:16px;line-height:1.75;color:${C.soft};margin:0}
        @media(max-width:1024px){.about-grid{grid-template-columns:1fr}}
        @media(max-width:760px){
          .about-hero{padding:48px 0 40px}
          .about-section{margin:56px 0}
          .about-close{margin:64px 0 72px}
        }
      `}</style>

      <div className="site-wrap">
        <SiteNavBar activeKey="about" />

        <header className="about-hero">
          <div className="about-eyebrow">About Where Next</div>
          <h1 className="about-title">A relocation scout built to tell you the whole story.</h1>
          <p className="about-intro">
            Where Next helps people discover places they may never have considered—and understand what living
            there would actually mean before making a move.
          </p>
        </header>

        <div className="about-prose">
          <p>
            Most &ldquo;best places to live&rdquo; lists tell you what is charming, affordable, or growing. They
            rarely tell you what could make a place difficult to live in.
          </p>
          <p className="about-emphasis">Where Next looks deeper.</p>
          <p>
            We examine housing, employment, cost of living, schools, healthcare, climate, insurance,
            infrastructure, growth, risk, and the trade-offs that shape everyday life. The goal is not to sell
            every town. It is to help people recognize which places genuinely fit the life they want.
          </p>
        </div>

        <section className="about-section" aria-labelledby="about-different-title">
          <div className="about-section-label" id="about-different-title">
            What makes it different
          </div>
          <div className="about-grid">
            {DIFFERENTIATORS.map((item) => (
              <article key={item.title} className="about-card">
                <h2 className="about-card-title">{item.title}</h2>
                <p className="about-card-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-close" aria-labelledby="about-close-title">
          <h2 id="about-close-title" className="about-close-title">
            Find the place that fits—not just the place that photographs well.
          </h2>
          <p className="about-close-copy">
            Where Next is beginning with U.S. towns and regions, with international relocation research planned
            for the future.
          </p>
        </section>
      </div>
    </div>
  );
}
