import "./globals.css";
import type { Metadata } from "next";
import ToastHost from "@/components/Toast";

export const metadata: Metadata = {
  title: "topupbuzz // control",
  description: "Telegram automation platform",
};

const themeInit = `
try {
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme_pref', 'dark');
  localStorage.removeItem('theme');
} catch(e){}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <div className="bg-anim">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>
        <div className="bg-grid" />
        <div id="app-root">{children}</div>
        <ToastHost />
      </body>
    </html>
  );
}
