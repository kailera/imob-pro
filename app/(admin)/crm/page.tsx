import { getLeads } from "@/app/actions/leadActions";
import { CrmKanbanBoard } from "./CrmKanbanBoard";

export const metadata = {
  title: "CRM | Funil de Vendas - Imob Pro",
  description: "Gerencie os leads originados pelo site da imobiliária e acompanhe as negociações.",
};

export default async function CrmPage() {
  // Buscar leads diretamente do banco de dados (Server-Side)
  const initialLeads = await getLeads();

  return (
    <div className="space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-text">Funil de Vendas (CRM)</h1>
        <p className="text-brand-text/60 mt-1 text-sm">
          Acompanhe o progresso de novos interessados do site, desde a simulação até a assinatura do contrato.
        </p>
      </div>

      {/* Renderiza o Componente Client-Side do Kanban */}
      <CrmKanbanBoard initialLeads={initialLeads} />
    </div>
  );
}
