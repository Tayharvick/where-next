import { Inter, Newsreader } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Where Next",
  description: "A relocation scout. Real towns, honest downsides, and whether you're early or too late.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body style={{ margin: 0, background: "#F9F7F4" }}>{children}</body>
    </html>
  );
}
