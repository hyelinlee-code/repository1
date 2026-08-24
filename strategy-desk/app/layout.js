import "./globals.css";

export const metadata = {
  title: "Strategy Desk — Vendor Brief",
  description:
    "Generate the vendor section of the ServiceNow Corporate Strategy brief for any date window and topic set, sourced live with the Exa API.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f100e" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
