export const SITE_NAV_ITEMS = [
  { key: "home", label: "Home", href: "/" },
  { key: "finds", label: "Hidden Finds", href: "/hidden-finds" },
  { key: "states", label: "Explore by State", href: "/explore-by-state" },
  { key: "international", label: "International", href: "/international" },
  { key: "about", label: "About", href: "/about" },
];

export function resolveNavActive(pathname) {
  if (pathname === "/international") return "international";
  if (pathname === "/about") return "about";
  if (pathname === "/hidden-finds") return "finds";
  if (pathname === "/explore-by-state") return "states";
  return "home";
}
