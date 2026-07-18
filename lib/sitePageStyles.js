import { C, DISPLAY, BODY } from "@/lib/designTokens";

export const SITE_PAGE_STYLES = `
  .site-page{font-family:${BODY};background:${C.cream};color:${C.text};-webkit-font-smoothing:antialiased}
  .site-page--standalone{min-height:100vh}
  .site-page *{box-sizing:border-box}
  .site-page a{text-decoration:none;color:inherit}
  .site-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
  .site-nav-bar{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:28px 0 20px;border-bottom:1px solid ${C.rule}}
  .site-nav-brand{display:flex;flex-direction:column;gap:4px}
  .site-nav-brand-title{font-family:${DISPLAY};font-size:15px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:${C.ink}}
  .site-nav-brand-sub{font-size:12px;letter-spacing:.04em;color:${C.soft};font-weight:400}
  .site-nav-bar-links{display:flex;flex-wrap:wrap;gap:28px;align-items:center;padding-top:2px;justify-content:flex-end}
  .site-nav-bar-link{font-size:13px;padding:6px 0;font-weight:500;letter-spacing:.02em;color:${C.soft};transition:color .2s;border-bottom:1px solid transparent}
  .site-nav-bar-link:hover{color:${C.ink}}
  .site-nav-bar-link[data-on="1"]{color:${C.ink};border-bottom-color:${C.ink}}
  .content-subpage{padding:32px 0 120px}
  .content-subpage .scout-masthead{padding:0}
  .content-subpage .state-explore{margin:0 0 32px}
  @media(max-width:760px){
    .site-wrap{padding:0 16px}
    .site-nav-bar{flex-direction:column;align-items:stretch;padding:24px 0 20px}
    .site-nav-bar-links{gap:2px;border:1px solid ${C.rule};border-radius:16px;padding:5px;background:${C.paper};box-shadow:0 2px 12px rgba(0,0,0,.04);justify-content:stretch}
    .site-nav-bar-link{flex:1 1 calc(50% - 2px);min-width:0;text-align:center;padding:10px 10px;font-size:11px;border-bottom:0;border-radius:12px}
    .site-nav-bar-link[data-on="1"]{background:${C.charcoal};color:#fff;border-bottom-color:transparent}
    .content-subpage{padding:20px 0 80px}
    .content-subpage .scout-masthead{padding:0}
  }
`;
