import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = process.env.SITE_TITLE || "קביעת פגישה";

export const metadata: Metadata = { title, description: "קביעת מועד לפגישה" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
