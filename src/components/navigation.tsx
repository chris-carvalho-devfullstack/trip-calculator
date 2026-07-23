"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Car, History, Settings, LogOut, Menu, LucideIcon, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button"; 
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logout } from "@/app/login/actions";

type RouteConfig = {
  title: string;
  href: string;
  icon: LucideIcon;
};

const routes: RouteConfig[] = [
  { title: "Simulador", href: "/", icon: Car },
  { title: "Histórico", href: "/history", icon: History },
  { title: "Configurações", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* =========================================
          VERSÃO DESKTOP: Sidebar Retrátil
          ========================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-background transition-all duration-300",
          // LARGURAS ATUALIZADAS AQUI: w-16 (64px) para recolhido e w-56 (224px) para aberto
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Cabeçalho / Logo */}
        <div className={cn(
          "h-20 flex items-center border-b transition-all",
          isCollapsed ? "justify-center px-2" : "justify-start px-4"
        )}>
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            {/* O tamanho da logo se ajusta dinamicamente para não estourar a borda */}
            <div className={cn("relative shrink-0 transition-all", isCollapsed ? "w-8 h-8" : "w-10 h-10")}>
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill
                sizes="40px"
                className="object-contain drop-shadow-sm"
                quality={100} 
                priority      
              />
            </div>
            {!isCollapsed && (
              <span className="font-black text-[17px] tracking-tight text-zinc-900">
                TRIP CASH
              </span>
            )}
          </div>
        </div>

        {/* Links de Navegação */}
        {/* Padding interno (p) ajustado dinamicamente */}
        <nav className={cn("flex-1 flex flex-col gap-2 mt-2 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
          {routes.map((route) => {
            const isActive = pathname === route.href;
            const Icon = route.icon;

            return isCollapsed ? (
              <Tooltip key={route.href}>
                <Link href={route.href} className="w-full flex justify-center">
                  <TooltipTrigger
                    className={cn(
                      buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "icon" }),
                      "w-10 h-10" // Tamanho perfeito para w-16
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </TooltipTrigger>
                </Link>
                <TooltipContent side="right">{route.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={route.href} href={route.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start h-11 font-medium text-sm", isActive && "bg-secondary/80")}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {route.title}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* =========================================
            RODAPÉ (Logout + Toggle estilo Cloudflare)
            ========================================= */}
        <div className="flex flex-col mt-auto">
          {/* Sessão de Logout */}
          <div className={cn("border-t border-zinc-100", isCollapsed ? "p-2" : "p-4")}>
            {isCollapsed ? (
              <Tooltip>
                <div className="w-full flex justify-center">
                  <TooltipTrigger 
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }), 
                      "w-10 h-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                    )}
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </TooltipTrigger>
                </div>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" className="w-full justify-start h-11 font-medium text-sm text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-3" />
                Sair da conta
              </Button>
            )}
          </div>

          {/* Botão Retrair/Expandir (Fixo no Rodapé) */}
          <div className={cn("border-t border-zinc-100 flex items-center", isCollapsed ? "p-2 justify-center" : "p-3 justify-start")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "h-10 w-10 text-zinc-400 hover:text-zinc-900 transition-colors focus:ring-0",
                !isCollapsed && "ml-1" // Alinhamento fino com os itens do menu acima
              )}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* =========================================
          VERSÃO MOBILE: Bottom Navigation Bar
          ========================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-background flex items-center justify-around z-50 pb-safe shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.05)]">
        {routes.slice(0, 2).map((route) => {
          const isActive = pathname === route.href;
          const Icon = route.icon;

          return (
            <Link key={route.href} href={route.href} className="flex-1">
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 h-full w-full",
                isActive ? "text-emerald-600" : "text-zinc-400"
              )}>
                <Icon className={cn("h-6 w-6 transition-transform duration-200", isActive && "scale-110")} />
                <span className="text-[10px] font-bold">{route.title}</span>
              </div>
            </Link>
          );
        })}

        {/* Menu Extra (Sheet) para o Mobile */}
        <Sheet>
          <SheetTrigger className="flex-1 flex flex-col items-center justify-center gap-1 h-full w-full text-zinc-400 cursor-pointer hover:text-zinc-600 bg-transparent border-0 outline-none">
            <Menu className="h-6 w-6" />
            <span className="text-[10px] font-bold">Menu</span>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-auto pb-8 rounded-t-3xl">
            <SheetHeader className="pb-6 border-b border-zinc-100 mb-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    fill
                    sizes="56px"
                    className="object-contain"
                    quality={100}
                  />
                </div>
                <SheetTitle className="text-xl font-black text-zinc-900 tracking-tight">TRIP CASH</SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="flex flex-col gap-3">
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start h-14 rounded-xl border-zinc-200 text-base font-semibold text-zinc-700">
                  <Settings className="h-5 w-5 mr-3 text-zinc-500" />
                  Configurações
                </Button>
              </Link>
              <Button variant="destructive" className="w-full justify-start h-14 rounded-xl text-base font-semibold" onClick={handleLogout}>
                <LogOut className="h-5 w-5 mr-3" />
                Sair da conta
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}