import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "GEONEDRA | Корпоративная CRM-платформа недропользования",
  description: "Интеллектуальная система управления лицензиями, смарт-перепиской с госорганами и нормативной документацией",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-screen bg-[#0a1019] text-slate-100 antialiased selection:bg-[#b8860b]/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
