import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.title,
  description: `קביעת פגישה עם ${BRAND.name}`,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <header className="bg-brand text-brand-ink">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <a href={BRAND.site} className="flex items-baseline gap-3" aria-label={BRAND.name}>
              <span className="text-xl font-bold tracking-wide">{BRAND.name}</span>
              <span className="hidden text-xs uppercase tracking-[0.25em] opacity-70 sm:inline" dir="ltr">
                {BRAND.nameEn}
              </span>
            </a>
            <a href={`tel:${BRAND.phone}`} className="text-sm opacity-90 hover:opacity-100" dir="ltr">
              {BRAND.phone}
            </a>
          </div>
        </header>
        {children}
        <footer className="mt-12 border-t border-line">
          <div className="mx-auto grid max-w-3xl gap-1 px-4 py-8 text-sm text-muted">
            <div className="font-semibold text-ink">
              {BRAND.name}
              <span className="ms-3 text-xs font-normal uppercase tracking-[0.2em] text-muted" dir="ltr">
                {BRAND.tagline}
              </span>
            </div>
            <div>{BRAND.address}</div>
            <div>
              משרד: <a href={`tel:${BRAND.phone}`} dir="ltr">{BRAND.phone}</a> · מוקד שירות: <span dir="ltr">{BRAND.hotline}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
