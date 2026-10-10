import "./globals.css";
import type { Metadata } from "next";
import ToastHost from "@/components/Toast";

export const metadata: Metadata = {
  title: "topupbuzz // control",
  description: "Telegram automation platform",
};

const themeInit = `
try {
  // default dark unless user explicitly toggled
  var t = localStorage.getItem('theme_pref') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  // clean up old key
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
        <div id="app-root">{children}</div>
        <ToastHost />
      </body>
    </html>
  );
}
