import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip"; 
import { AppLayoutWrapper } from "@/components/app-layout-wrapper"; // <-- Importamos o Wrapper

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trip Cash",
  description: "Calcule rotas, custos e lucros de forma inteligente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Mudamos min-h-full para h-full para o layout ocupar exatamente 100% da tela */}
      <body className="h-full flex flex-col overflow-hidden">
        <TooltipProvider>
          {/* O Wrapper vai decidir se mostra o Menu ou não baseado na rota */}
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
        </TooltipProvider>
        
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}