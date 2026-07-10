import FinancialFilterBar from "@/components/FinancialFilterBar";
import FinancialSummary from "@/components/FinancialSummary";
import FinancialTable from "@/components/FinancialTable";

interface ICobrancaTabContent {
    cobrancaTotals: any;
    cobrancas: any;
    activeTab: string;

}

export default function CobrancasTabContent({ activeTab, cobrancaTotals, cobrancas }: ICobrancaTabContent) {

    return (<>
        {
            activeTab === 'cobrancas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-[#280003]">Cobranças de Aluguéis</h2>
                            <p className="text-sm text-gray-500 mt-1">Gerencie os recebimentos, boletos e repasses dos aluguéis ativos</p>
                        </div>
                    </div>
                    <FinancialFilterBar />
                    <FinancialSummary totals={cobrancaTotals} />
                    <FinancialTable data={cobrancas} />
                </div>
            )
        }
    </>)
}