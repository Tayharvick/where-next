"use client";

import { INTERNATIONAL_COUNTRIES, INTERNATIONAL_REPORT_TOPICS } from "@/lib/internationalCountries";
import { C, DISPLAY, BODY, MONO } from "@/lib/designTokens";
import { SiteNavBar, SitePageStyles } from "@/components/SiteNav";

export default function InternationalPage() {
  return (
    <div className="intl-page site-page site-page--standalone">
      <SitePageStyles />
      <style>{`
        .intl-page{font-family:${BODY};background:${C.cream};color:${C.text};min-height:100vh;-webkit-font-smoothing:antialiased}
        .intl-page *{box-sizing:border-box}
        .intl-page a{text-decoration:none;color:inherit}
        .intl-wrap,.site-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
        .intl-hero{padding:72px 0 64px;max-width:760px}
        .intl-eyebrow{font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${C.olive};font-weight:500;margin-bottom:18px}
        .intl-title{font-family:${DISPLAY};font-size:clamp(36px,5vw,56px);line-height:1.08;letter-spacing:-.03em;margin:0 0 28px;font-weight:500;color:${C.ink}}
        .intl-lede{font-size:clamp(17px,2vw,19px);line-height:1.72;color:${C.text};margin:0 0 20px;max-width:680px}
        .intl-support{font-size:16px;line-height:1.75;color:${C.soft};margin:0 0 24px;max-width:680px}
        .intl-status{display:inline-block;font-family:${MONO};font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${C.olive};border:1px solid rgba(92,107,90,.22);background:rgba(92,107,90,.06);border-radius:999px;padding:8px 14px;font-weight:600}
        .intl-section{margin:80px 0}
        .intl-section-head{margin-bottom:36px;max-width:640px}
        .intl-section-title{font-family:${DISPLAY};font-size:clamp(28px,3.5vw,36px);line-height:1.15;letter-spacing:-.02em;margin:0 0 14px;font-weight:500}
        .intl-section-copy{font-size:16px;line-height:1.7;color:${C.soft};margin:0}
        .intl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .intl-card{border:1px solid ${C.rule};border-radius:18px;background:${C.paper};padding:0;overflow:hidden;transition:border-color .25s,box-shadow .25s,transform .25s;cursor:default}
        .intl-card:hover{border-color:rgba(92,107,90,.22);box-shadow:0 8px 28px rgba(0,0,0,.05);transform:translateY(-2px)}
        .intl-card-visual{position:relative;height:clamp(100px,14vw,128px);overflow:hidden;background:#2a2a2a;border-radius:17px 17px 0 0}
        .intl-card-img{width:100%;height:100%;object-fit:cover;object-position:center 42%;display:block;transition:transform .65s ease;transform:scale(1)}
        .intl-card:hover .intl-card-img{transform:scale(1.025)}
        .intl-card-visual-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(12,11,9,.06) 0%,rgba(12,11,9,.32) 100%);pointer-events:none}
        .intl-card-body{padding:24px 26px 26px}
        .intl-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
        .intl-card-name{font-family:${DISPLAY};font-size:22px;line-height:1.2;letter-spacing:-.02em;margin:0;font-weight:500;color:${C.ink}}
        .intl-card-code{font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};border:1px solid ${C.rule};border-radius:6px;padding:5px 8px;flex-shrink:0}
        .intl-card-region{font-family:${MONO};font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};margin-bottom:12px}
        .intl-card-badge{display:inline-block;font-family:${MONO};font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:${C.soft};border:1px solid ${C.rule};border-radius:999px;padding:5px 10px;margin-bottom:14px;font-weight:600}
        .intl-card-teaser{font-size:14px;line-height:1.65;color:${C.soft};margin:0}
        .intl-callout{margin:88px 0;padding:48px 52px;border:1px solid ${C.rule};border-radius:24px;background:${C.paper}}
        .intl-callout-title{font-family:${DISPLAY};font-size:clamp(24px,3vw,32px);line-height:1.2;letter-spacing:-.02em;margin:0 0 18px;font-weight:500;max-width:720px}
        .intl-callout-copy{font-size:16px;line-height:1.75;color:${C.soft};margin:0;max-width:760px}
        .intl-topics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 28px}
        .intl-topic{font-size:14px;line-height:1.55;color:${C.text};padding:12px 0;border-bottom:1px solid ${C.rule}}
        .intl-close{margin:88px 0 100px;padding-top:48px;border-top:1px solid ${C.rule};max-width:640px}
        .intl-close-title{font-family:${DISPLAY};font-size:clamp(26px,3.2vw,34px);line-height:1.2;letter-spacing:-.02em;margin:0 0 16px;font-weight:500}
        .intl-close-copy{font-size:16px;line-height:1.75;color:${C.soft};margin:0 0 24px}
        .intl-close-label{display:inline-block;font-family:${MONO};font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};font-weight:500}
        @media(max-width:1024px){
          .intl-grid{grid-template-columns:repeat(2,1fr)}
          .intl-topics{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:760px){
          .intl-wrap,.site-wrap{padding:0 16px}
          .intl-hero{padding:48px 0 40px}
          .intl-section{margin:56px 0}
          .intl-grid{grid-template-columns:1fr}
          .intl-card-visual{height:112px}
          .intl-card-body{padding:20px 22px 22px}
          .intl-topics{grid-template-columns:1fr}
          .intl-callout{margin:64px 0;padding:32px 24px}
          .intl-close{margin:64px 0 72px}
        }
      `}</style>

      <div className="site-wrap">
        <SiteNavBar activeKey="international" />

        <header className="intl-hero">
          <div className="intl-eyebrow">Beyond the U.S.</div>
          <h1 className="intl-title">Where next, internationally?</h1>
          <p className="intl-lede">
            We&apos;re expanding the same honest relocation research beyond the United States—helping you understand
            not only where looks beautiful, but where you could realistically build a life.
          </p>
          <p className="intl-support">
            Future international Scout Reports will examine housing, residency and visa pathways, taxes, healthcare,
            employment, schools, transportation, climate, safety, language, infrastructure, and the realities of
            everyday life.
          </p>
          <span className="intl-status">International research coming soon</span>
        </header>

        <section className="intl-section" aria-labelledby="intl-countries-title">
          <div className="intl-section-head">
            <h2 id="intl-countries-title" className="intl-section-title">
              Countries we&apos;re watching
            </h2>
            <p className="intl-section-copy">
              A first look at destinations that may eventually join the Where Next research library.
            </p>
          </div>
          <div className="intl-grid">
            {INTERNATIONAL_COUNTRIES.map((country) => (
              <article key={country.code} className="intl-card" aria-label={`${country.name} — research coming soon`}>
                <div className="intl-card-visual">
                  <img
                    src={country.image}
                    srcSet={country.imageSrcSet}
                    sizes="(max-width:760px) 100vw, (max-width:1024px) 50vw, 33vw"
                    alt={country.imageAlt}
                    className="intl-card-img"
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={320}
                  />
                  <div className="intl-card-visual-overlay" aria-hidden="true" />
                </div>
                <div className="intl-card-body">
                  <div className="intl-card-top">
                    <h3 className="intl-card-name">{country.name}</h3>
                    <span className="intl-card-code" aria-hidden="true">
                      {country.code}
                    </span>
                  </div>
                  <div className="intl-card-region">{country.region}</div>
                  <span className="intl-card-badge">Research Coming Soon</span>
                  <p className="intl-card-teaser">{country.teaser}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="intl-callout" aria-labelledby="intl-callout-title">
          <h2 id="intl-callout-title" className="intl-callout-title">
            A beautiful destination is not automatically a practical move.
          </h2>
          <p className="intl-callout-copy">
            International relocation requires more than finding an affordable home. Visa eligibility, taxation,
            healthcare access, employment rights, language, banking, transportation, and local bureaucracy can
            determine whether a destination works in real life. Where Next will bring those realities into the same
            report—not bury them in the fine print.
          </p>
        </section>

        <section className="intl-section" aria-labelledby="intl-report-title">
          <div className="intl-section-head">
            <h2 id="intl-report-title" className="intl-section-title">
              What an International Scout Report will cover
            </h2>
          </div>
          <div className="intl-topics">
            {INTERNATIONAL_REPORT_TOPICS.map((topic) => (
              <div key={topic} className="intl-topic">
                {topic}
              </div>
            ))}
          </div>
        </section>

        <section className="intl-close" aria-labelledby="intl-close-title">
          <h2 id="intl-close-title" className="intl-close-title">
            The world is on the roadmap.
          </h2>
          <p className="intl-close-copy">
            Where Next is beginning with the United States, but the name was never meant to stop at the border.
          </p>
          <span className="intl-close-label">International reports are in development</span>
        </section>
      </div>
    </div>
  );
}
