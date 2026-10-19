import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { ChatProvider } from "@/lib/chat-context";
import { BusinessProvider } from "@/lib/business-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Geo AI & Чайка-Сервис | Интеллектуальная CRM-платформа",
  description: "B2B CRM-система для управления недропользованием и автосервисом (СТО)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-screen antialiased selection:bg-sky-500/20 selection:text-sky-500">
        <BusinessProvider>
          <ThemeProvider>
            <AuthProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </AuthProvider>
          </ThemeProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
