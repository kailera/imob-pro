import { notFound } from "next/navigation"
import { getContratoForEdit } from "../../../actions/getContratoForEdit"
import { ContratoIdentificationForm } from "./components/ContratoIdentificationForm"
import { ContratoPropertyForm } from "./components/ContratoPropertyForm"
import { ContratoIptuForm } from "./components/ContratoIptuForm"
import { ContratoCondominiumForm } from "./components/ContratoCondominiumForm"
import { ContratoUtilitiesForm } from "./components/ContratoUtilitiesForm"
import { ContratoPartiesSection } from "./components/ContratoPartiesSection"
import { ContratoTermsForm } from "./components/ContratoTermsForm"
import { ContratoClausesDocumentsForm } from "./components/ContratoClausesDocumentsForm"
import { EtapasCadastroNav, type EtapaStatus } from "./components/EtapasCadastroNav"
import { LeaseTermsPeriodsForm } from "./components/LeaseTermsPeriodsForm"
import { CobrancasAcordosHistory } from "@/components/locacao/CobrancasAcordosHistory"
import { ContratoGuaranteeForm } from "./components/ContratoGuaranteeForm"

type EditContratoPageProps = {
    params: Promise<{
        contratoid?: string
        contratoId?: string
    }>
}

export default async function EditContratoPage({
    params,
}: EditContratoPageProps) {
    const resolvedParams = await params
    const id = resolvedParams.contratoid || resolvedParams.contratoId

    if (!id) {
        notFound()
    }

    const contrato = await getContratoForEdit(id)

    if (!contrato) {
        notFound()
    }

    const etapas: EtapaStatus = {
        identificacao: Boolean(contrato.tipoLocacao && contrato.dataInicio),
        imovel: Boolean(contrato.imovel?.id),
        iptu: Boolean(contrato.iptu?.inscription),
        condominio: Boolean(contrato.condominium?.condoName),
        utilidades: contrato.utilities.length > 0,
        locatario: contrato.participantes.some(p => p.papel === 'TENANT'),
        locatariosSolidarios: contrato.participantes.some(p => p.papel === 'CO_TENANT'),
        garantia: Boolean(contrato.guarantee || contrato.participantes.some(p => p.papel === 'GUARANTOR')),
        locador: contrato.participantes.some(p => p.papel === 'LANDLORD'),
        controleLocaticio: Boolean(contrato.terms?.rentValue && contrato.terms.rentValue > 0),
        clausulas: contrato.clauses.length > 0,
        cobranca: Boolean(contrato.terms?.paymentDueDay),
        comissionamento: Boolean(contrato.terms?.adminFeePercentage),
        documentos: contrato.documents.length > 0,
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-6">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Cadastro de Contrato {contrato.codigo}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Preencha as seções abaixo para estruturar os dados do imóvel, partes envolvidas e controle locatício.
                    </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    contrato.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                }`}>
                    {contrato.status === 'ACTIVE' ? 'CONCLUÍDO / ATIVO' : 'EM RASCUNHO'}
                </span>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
                <div className="space-y-6">
                    {/* 1. Identificação do Contrato */}
                    <section id="identificacao">
                        <ContratoIdentificationForm
                            key={`identificacao-${contrato.version}`}
                            contrato={{
                                id: contrato.id,
                                tipoLocacao: contrato.tipoLocacao,
                                finalidade: contrato.finalidade,
                                dataInicio: contrato.dataInicio,
                                prazoMeses: contrato.prazoMeses,
                                legacyCode: contrato.legacyCode,
                                billingStartDate: contrato.billingStartDate,
                            }}
                        />
                    </section>

                    {/* 2. Imóvel & Composição */}
                    <section id="imovel">
                        <ContratoPropertyForm
                            key={`imovel-${contrato.version}-${contrato.imovel?.id ?? 'sem-imovel'}`}
                            contratoId={contrato.id}
                            property={contrato.imovel}
                        />
                    </section>

                    {/* 3. IPTU */}
                    <section id="iptu">
                        <ContratoIptuForm
                            contratoId={contrato.id}
                            iptu={contrato.iptu}
                        />
                    </section>

                    {/* 4. Condomínio */}
                    <section id="condominio">
                        <ContratoCondominiumForm
                            contratoId={contrato.id}
                            condominium={contrato.condominium}
                        />
                    </section>

                    {/* 5. Água, Luz e Gás */}
                    <section id="utilidades">
                        <ContratoUtilitiesForm
                            contratoId={contrato.id}
                            utilities={contrato.utilities}
                        />
                    </section>

                    {/* 6. Locatários, Fiadores e Locador */}
                    <section id="locatarios">
                        <ContratoPartiesSection
                            contratoId={contrato.id}
                            parties={contrato.participantes}
                        />
                    </section>

                    {/* 7. Controle Locatício & Condições */}
                    <section id="garantia">
                        <ContratoGuaranteeForm
                            contratoId={contrato.id}
                            guarantee={contrato.guarantee}
                        />
                    </section>

                    <section id="controle">
                        <ContratoTermsForm
                            contratoId={contrato.id}
                            leaseStartDate={contrato.dataInicio}
                            terms={contrato.terms}
                        />
                    </section>

                    <LeaseTermsPeriodsForm
                        leaseId={contrato.id}
                        leaseStartDate={contrato.dataInicio}
                        leaseEndDate={contrato.dataFim}
                        legacyCode={contrato.legacyCode}
                        periods={contrato.termsPeriods}
                        defaults={contrato.terms}
                    />

                    {/* 8. Cláusulas Adicionais e Documentos */}
                    <section id="documentos">
                        <ContratoClausesDocumentsForm
                            contratoId={contrato.id}
                            clauses={contrato.clauses}
                            documents={contrato.documents}
                        />
                    </section>

                    <CobrancasAcordosHistory transactions={contrato.transacoes} />
                </div>

                {/* Sidebar de Etapas do Cadastro */}
                <EtapasCadastroNav
                    contratoId={contrato.id}
                    status={contrato.status}
                    etapas={etapas}
                />
            </div>
        </main>
    )
}
