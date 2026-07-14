export const metadata = {
  title: "Where Next",
  description: "A relocation scout. Real towns, honest downsides, and whether you're early or too late.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAFAF8" }}>{children}</body>
    </html>
  );
}
