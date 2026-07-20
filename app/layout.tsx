import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/shared/PWAProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Imob Pro",
  description: "Sistema web imobiliário moderno e limpo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  }>) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR" className="h-full antialiased">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#004777" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Imob Pro" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className={`${inter.className} min-h-full flex flex-col bg-[#EEEEF3] text-[#280003]`}>
          <PWAProvider>
            {children}
          </PWAProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}


