import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "topupbuzz // control",
  description: "Telegram automation control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scan-line" />
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
