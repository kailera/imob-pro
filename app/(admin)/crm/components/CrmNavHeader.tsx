"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Sparkles } from "lucide-react";

export function CrmNavHeader() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Funil de Vendas & Leads",
      href: "/crm",
      exact: true,
      icon: LayoutDashboard,
    },
    {
      name: "Editor do Site",
      href: "/crm/site",
      exact: false,
      icon: Globe,
    },
  ];

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-text flex items-center gap-2">
            Gestão CRM & Site
            <Sparkles className="w-5 h-5 text-brand-accent-gold" />
          </h1>
          <p className="text-brand-text/60 text-xs mt-0.5">
            Gerencie o funil de leads, propostas e personalize os serviços e conteúdos exibidos no seu site público.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
