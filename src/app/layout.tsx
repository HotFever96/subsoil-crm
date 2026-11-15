import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { ChatProvider } from "@/lib/chat-context";
import { BusinessProvider } from "@/lib/business-context";

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
    <html lang="ru" className="h-full">
      <body className="min-h-screen selection:bg-sky-500/20 selection:text-sky-500 font-sans">
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
