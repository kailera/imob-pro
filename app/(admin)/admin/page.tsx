import Link from "next/link";
import { ClipboardCheck, Building, Key, Users, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const cards = [
    {
      title: "Vistorias",
      description: "Gerencie as vistorias de entrada e saída dos imóveis.",
      href: "/vistorias",
      icon: ClipboardCheck,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Imóveis",
      description: "Cadastre e edite a carteira de imóveis da imobiliária.",
      href: "/imoveis",
      icon: Building,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Locação & Contratos",
      description: "Acompanhe os contratos de aluguel e pagamentos.",
      href: "/locacao",
      icon: Key,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Clientes",
      description: "Administre proprietários, inquilinos e interessados.",
      href: "/clientes",
      icon: Users,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#280003]">Painel Administrativo</h1>
        <p className="text-[#280003]/70 mt-2">
          Bem-vindo ao Imob Pro. Escolha uma das áreas abaixo para gerenciar a operação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="flex flex-col justify-between p-6 bg-white rounded-xl border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all group"
          >
            <div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border text-[#004777] bg-blue-50 border-blue-100">
                <card.icon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold mt-4 text-[#280003]">{card.title}</h2>
              <p className="text-sm text-[#280003]/70 mt-2">{card.description}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#004777] mt-6 group-hover:underline">
              Acessar Módulo
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
