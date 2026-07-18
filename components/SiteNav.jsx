"use client";

import Link from "next/link";
import { SITE_NAV_ITEMS } from "@/lib/siteNav";
import { SITE_PAGE_STYLES } from "@/lib/sitePageStyles";

export function SitePageStyles() {
  return <style>{SITE_PAGE_STYLES}</style>;
}

export function SiteNavHero({ activeKey }) {
  return (
    <div className="nav-links" role="navigation" aria-label="Primary">
      {SITE_NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="nav-link"
          data-on={activeKey === item.key ? "1" : "0"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function SubpageShell({ activeKey, children }) {
  return (
    <>
      <SitePageStyles />
      <div className="site-page">
        <div className="site-wrap">
          <SiteNavBar activeKey={activeKey} />
          <main className="content-subpage">{children}</main>
        </div>
      </div>
    </>
  );
}

export function SiteNavBar({ activeKey }) {
  return (
    <nav className="site-nav-bar" aria-label="Primary">
      <Link href="/" className="site-nav-brand">
        <span className="site-nav-brand-title">Where Next</span>
        <span className="site-nav-brand-sub">A Relocation Scout</span>
      </Link>
      <div className="site-nav-bar-links">
        {SITE_NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="site-nav-bar-link"
            data-on={activeKey === item.key ? "1" : "0"}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
