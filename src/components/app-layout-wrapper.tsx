"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./navigation";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Verifica se a rota atual é a de login
  const isLoginPage = pathname === "/login";

  // Se for login, renderiza apenas o conteúdo da página sem o menu
  if (isLoginPage) {
    return <main className="flex-1 flex flex-col h-full">{children}</main>;
  }

  // Se não for login, renderiza a estrutura com o Menu
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* O nosso componente de navegação que criamos no passo anterior */}
      <Navigation />
      
      {/* A área onde o conteúdo das páginas (Simulador, Histórico, etc) vai aparecer */}
      {/* Adicionamos um padding bottom (pb-16) no mobile para o conteúdo não ficar escondido atrás da barra inferior */}
      <main className="flex-1 flex flex-col overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}