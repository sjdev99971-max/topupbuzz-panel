import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "topupbuzz // control",
  description: "Telegram automation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <div className="scan-line" />
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
