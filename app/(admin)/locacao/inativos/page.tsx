import Link from 'next/link'
import { Archive, ArrowLeft, ShieldCheck } from 'lucide-react'
import { getContratosLocacao } from '../actions/actions'
import ContratosTabContent from '../components/ContratosTabContent'

export const dynamic = 'force-dynamic'

export default async function ContratosInativosPage() {
    const result = await getContratosLocacao({ onlyInactive: true })
    const contratos = result.success && result.data ? result.data : []

    return (
        <main className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-3 flex items-center gap-2 text-[#004777]">
                            <Archive className="h-5 w-5" />
                            <span className="text-xs font-extrabold uppercase tracking-[0.18em]">Locação</span>
                        </div>
                        <h1 className="text-2xl font-black text-[#280003] sm:text-3xl">Contratos inativos</h1>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Consulte contratos preservados que não participam mais da geração de novas cobranças.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                        <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                            <ShieldCheck className="h-5 w-5 text-[#004777]" />
                            <span><strong className="text-[#280003]">{contratos.length}</strong> contrato(s) preservado(s)</span>
                        </div>
                        <Link
                            href="/locacao"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#004777] transition-colors hover:bg-[#004777]/5"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para locação
                        </Link>
                    </div>
                </div>
            </section>

            {!result.success && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {result.error}
                </div>
            )}

            <ContratosTabContent
                contratos={contratos}
                title="Lista de contratos inativos"
                searchPlaceholder="Buscar inativo por contrato, inquilino ou imóvel..."
            />
        </main>
    )
}
