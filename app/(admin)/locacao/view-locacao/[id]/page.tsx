import { Fiador, Locador, Locatario, TransacaoFinanceira } from "@/generated/prisma"
import { getCompleteContratoLocacao } from "../../actions"
import Link from "next/link"
import { 
    Home, 
    User, 
    Shield, 
    FileText, 
    ClipboardList, 
    DollarSign, 
    Calendar, 
    ArrowLeft, 
    Mail, 
    Phone, 
    MapPin, 
    File, 
    TrendingUp,
    Clock,
    UserCheck,
    CheckCircle
} from "lucide-react"
import { TelefoneContato, EnderecoDetalhado, DocumentoUpload } from "@/lib/interfaces"

// Safe JSON parsing helpers
const parseTelefones = (field: any): TelefoneContato[] => {
    if (!field) return []
    if (typeof field === "string") {
        try { return JSON.parse(field) } catch { return [] }
    }
    if (Array.isArray(field)) return field as unknown as TelefoneContato[]
    return []
}

const parseEndereco = (field: any): EnderecoDetalhado | null => {
    if (!field) return null
    if (typeof field === "string") {
        try { return JSON.parse(field) } catch { return null }
    }
    if (typeof field === "object" && !Array.isArray(field)) return field as unknown as EnderecoDetalhado
    return null
}

const parseDocumentos = (field: any): DocumentoUpload[] => {
    if (!field) return []
    if (typeof field === "string") {
        try { return JSON.parse(field) } catch { return [] }
    }
    if (Array.isArray(field)) return field as unknown as DocumentoUpload[]
    return []
}

export default async function ViewLocacao({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const contrato = await getCompleteContratoLocacao(id)

    if (!contrato) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-[#EEEEF3]">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
                    <TrendingUp className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800">Contrato não encontrado</h2>
                    <p className="text-sm text-gray-500 mt-2">O contrato solicitado não existe ou foi removido do sistema.</p>
                    <Link href="/locacao" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#280003] text-white rounded-xl hover:bg-[#3d0005] transition-all">
                        <ArrowLeft className="w-4 h-4" /> Voltar para locações
                    </Link>
                </div>
            </div>
        )
    }

    const { imovel, locatarios, fiadors, transacaoFinanceiras } = contrato

    // Encontra os detalhes de locação específicos deste contrato
    const imovelLocacao = imovel?.imovelLocacaos?.find(
        (loc) => loc.id === contrato.imovelLocacaoId
    )
    const locadores = imovelLocacao?.locadors || []
    const vistorias = imovel?.vistorias || []

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined) return "R$ 0,00"
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return "-"
        return new Date(date).toLocaleDateString("pt-BR")
    }

    return (
        <div className="flex-1 bg-[#EEEEF3] p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Botão Voltar e Cabeçalho */}
                <div className="flex flex-col gap-2">
                    <Link href="/locacao" className="inline-flex items-center gap-2 text-xs font-bold text-[#280003]/80 hover:text-[#280003] transition-all w-fit">
                        <ArrowLeft className="w-3.5 h-3.5" /> VOLTAR PARA LISTAGEM
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl lg:text-3xl font-bold text-[#280003]">Detalhes do Contrato</h1>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Ativo
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">ID do Contrato: {contrato.id}</p>
                        </div>
                    </div>
                </div>

                {/* Dashboard Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Aluguel Mensal</span>
                            <span className="text-lg font-black text-[#280003]">{formatCurrency(imovelLocacao?.valorAluguel)}</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total com Taxas</span>
                            <span className="text-lg font-black text-[#280003]">{formatCurrency(imovelLocacao?.valorTotal)}</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vigência</span>
                            <span className="text-xs font-bold text-[#280003] block mt-0.5">
                                {formatDate(imovelLocacao?.dataInicio)} até {formatDate(imovelLocacao?.dataFim)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Locatários</span>
                            <span className="text-xs font-bold text-[#280003] block truncate max-w-[150px]">
                                {locatarios.length > 0 ? locatarios[0].nome : "Nenhum cadastrado"}
                                {locatarios.length > 1 && ` (+${locatarios.length - 1})`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left & Center Columns (2/3 of space) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Imóvel */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Home className="w-4 h-4 text-amber-600" />
                                Dados do Imóvel
                            </h2>
                            {imovel ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-700">
                                    <div className="space-y-1">
                                        <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">Código</span>
                                        <span className="text-brand-dark font-bold">{imovel.codigo}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">Tipo de Imóvel</span>
                                        <span className="text-brand-dark font-bold">{imovel.tipo}</span>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">Endereço</span>
                                        <span className="text-brand-dark font-bold flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            {imovel.bairro}, {imovel.cidade} - {imovel.uf}, CEP: {imovel.cep} (Nº {imovel.numero})
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 md:col-span-2 pt-2 border-t border-dashed border-gray-100">
                                        <div>
                                            <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">Condomínio</span>
                                            <span className="text-brand-dark font-bold">{formatCurrency(imovel.valorCondominio)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">IPTU</span>
                                            <span className="text-brand-dark font-bold">{formatCurrency(imovel.valorIPTU)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider">Aluguel Base</span>
                                            <span className="text-brand-dark font-bold">{formatCurrency(imovel.valorAluguel)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Nenhum imóvel vinculado.</p>
                            )}
                        </div>

                        {/* Locadores (Proprietários) */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <User className="w-4 h-4 text-blue-600" />
                                Locadores (Proprietários)
                            </h2>
                            {locadores.length > 0 ? (
                                <div className="space-y-6">
                                    {locadores.map((locador: Locador) => {
                                        const telefones = parseTelefones(locador.telefone)
                                        const endereco = parseEndereco(locador.endereco)
                                        const documentos = parseDocumentos(locador.documentoUrl)
                                        return (
                                            <div key={locador.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-xs text-gray-800">{locador.nome}</h3>
                                                        <p className="text-[10px] text-gray-400 font-semibold">{locador.cpfCnpj} • {locador.profissao} ({locador.nacionalidade})</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[8px] font-bold uppercase">
                                                        {locador.genero}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{locador.email}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {telefones.map((tel, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{tel.telefone} ({tel.qualificacao}) {tel.observacao && ` - ${tel.observacao}`}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {endereco && (
                                                    <div className="text-[10px] text-gray-500 pt-2 border-t border-dashed border-gray-200">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400">Endereço Residencial</span>
                                                        {endereco.logradouro}, {endereco.numero} {endereco.complemento && `(${endereco.complemento})`}, {endereco.bairro} - {endereco.municipio}/{endereco.estado}, CEP {endereco.cep}
                                                    </div>
                                                )}

                                                {documentos.length > 0 && (
                                                    <div className="pt-2">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400 mb-1">Documentos</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {documentos.map((doc, idx) => (
                                                                <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline bg-white px-2 py-1 border border-gray-150 rounded-lg">
                                                                    <File className="w-3.5 h-3.5 text-blue-500" />
                                                                    {doc.nome}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Nenhum locador cadastrado.</p>
                            )}
                        </div>

                        {/* Locatários */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                Locatários (Inquilinos)
                            </h2>
                            {locatarios.length > 0 ? (
                                <div className="space-y-6">
                                    {locatarios.map((locatario: Locatario) => {
                                        const telefones = parseTelefones(locatario.telefone)
                                        const endereco = parseEndereco(locatario.endereco)
                                        const documentos = parseDocumentos(locatario.documentoUrl)
                                        return (
                                            <div key={locatario.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-xs text-gray-800">{locatario.nome}</h3>
                                                        <p className="text-[10px] text-gray-400 font-semibold">{locatario.cpfCnpj} • {locatario.profissao} ({locatario.nacionalidade})</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-emerald-55/10 text-emerald-700 border border-emerald-100 rounded-md text-[8px] font-bold uppercase">
                                                        {locatario.genero}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{locatario.email}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {telefones.map((tel, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{tel.telefone} ({tel.qualificacao}) {tel.observacao && ` - ${tel.observacao}`}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {endereco && (
                                                    <div className="text-[10px] text-gray-500 pt-2 border-t border-dashed border-gray-200">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400">Endereço</span>
                                                        {endereco.logradouro}, {endereco.numero} {endereco.complemento && `(${endereco.complemento})`}, {endereco.bairro} - {endereco.municipio}/{endereco.estado}, CEP {endereco.cep}
                                                    </div>
                                                )}

                                                {documentos.length > 0 && (
                                                    <div className="pt-2">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400 mb-1">Documentos</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {documentos.map((doc, idx) => (
                                                                <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline bg-white px-2 py-1 border border-gray-150 rounded-lg">
                                                                    <File className="w-3.5 h-3.5 text-emerald-500" />
                                                                    {doc.nome}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Nenhum locatário cadastrado.</p>
                            )}
                        </div>

                        {/* Fiadores */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Shield className="w-4 h-4 text-purple-600" />
                                Fiadores
                            </h2>
                            {fiadors.length > 0 ? (
                                <div className="space-y-6">
                                    {fiadors.map((fiador: Fiador) => {
                                        const telefones = parseTelefones(fiador.telefone)
                                        const endereco = parseEndereco(fiador.endereco)
                                        const documentos = parseDocumentos(fiador.documentoUrl)
                                        return (
                                            <div key={fiador.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-xs text-gray-800">{fiador.nome}</h3>
                                                        <p className="text-[10px] text-gray-400 font-semibold">{fiador.cpfCnpj} • {fiador.profissao} ({fiador.nacionalidade})</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-[8px] font-bold uppercase">
                                                        {fiador.genero}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{fiador.email}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {telefones.map((tel, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{tel.telefone} ({tel.qualificacao}) {tel.observacao && ` - ${tel.observacao}`}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {endereco && (
                                                    <div className="text-[10px] text-gray-500 pt-2 border-t border-dashed border-gray-200">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400">Endereço</span>
                                                        {endereco.logradouro}, {endereco.numero} {endereco.complemento && `(${endereco.complemento})`}, {endereco.bairro} - {endereco.municipio}/{endereco.estado}, CEP {endereco.cep}
                                                    </div>
                                                )}

                                                {documentos.length > 0 && (
                                                    <div className="pt-2">
                                                        <span className="font-bold uppercase block text-[8px] text-gray-400 mb-1">Documentos</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {documentos.map((doc, idx) => (
                                                                <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:underline bg-white px-2 py-1 border border-gray-150 rounded-lg">
                                                                    <File className="w-3.5 h-3.5 text-purple-500" />
                                                                    {doc.nome}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Nenhum fiador cadastrado para este contrato.</p>
                            )}
                        </div>

                    </div>

                    {/* Right Column (1/3 of space) */}
                    <div className="space-y-6">
                        
                        {/* Detalhes do Contrato */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <FileText className="w-4 h-4 text-gray-600" />
                                Dados de Vigência
                            </h2>
                            <div className="space-y-3 text-xs font-semibold text-gray-700">
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                                    <span className="text-gray-400 text-[10px] uppercase font-bold">Data de Início</span>
                                    <span>{formatDate(imovelLocacao?.dataInicio)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                                    <span className="text-gray-400 text-[10px] uppercase font-bold">Data de Término</span>
                                    <span>{formatDate(imovelLocacao?.dataFim)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                                    <span className="text-gray-400 text-[10px] uppercase font-bold">Has Condomínio</span>
                                    <span className={imovelLocacao?.hasCondominio ? "text-emerald-600" : "text-gray-400"}>
                                        {imovelLocacao?.hasCondominio ? "Sim" : "Não"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-gray-400 text-[10px] uppercase font-bold">Has IPTU</span>
                                    <span className={imovelLocacao?.hasIPTU ? "text-emerald-600" : "text-gray-400"}>
                                        {imovelLocacao?.hasIPTU ? "Sim" : "Não"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Histórico de Vistorias */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <ClipboardList className="w-4 h-4 text-[#280003]" />
                                Vistorias
                            </h2>
                            {vistorias.length > 0 ? (
                                <div className="space-y-3">
                                    {vistorias.map((vis) => {
                                        const statusColors: Record<string, string> = {
                                            NAO_INICIADA: "bg-gray-100 text-gray-700",
                                            EM_ANDAMENTO: "bg-blue-50 text-blue-700 border-blue-100",
                                            AGUARDANDO_APROVACAO: "bg-amber-50 text-amber-700 border-amber-100",
                                            CONCLUIDA: "bg-emerald-50 text-emerald-700 border-emerald-100",
                                            CONTESTADA: "bg-rose-50 text-rose-700 border-rose-100",
                                            CANCELADA: "bg-red-100 text-red-800"
                                        }
                                        return (
                                            <div key={vis.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 hover:border-gray-300 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-xs text-brand-dark">{vis.codigo}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusColors[vis.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {vis.status.replace("_", " ")}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-550 font-semibold">
                                                    <span>Tipo: {vis.tipo}</span>
                                                    <span>Data: {formatDate(vis.data)}</span>
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-medium pt-1 border-t border-dashed border-gray-200">
                                                    Vistoriador: {vis.vistoriador.firstName} | Operador: {vis.operador.firstName}
                                                </div>
                                                <Link href={`/vistorias/ficha-vistoria/${vis.id}`} className="mt-2 block text-center text-[10px] font-bold text-[#280003] hover:underline bg-white py-1 border border-gray-150 rounded-lg">
                                                    Ver Ficha de Vistoria
                                                </Link>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    Nenhuma vistoria registrada para este imóvel.
                                </p>
                            )}
                        </div>

                        {/* Histórico de Cobranças */}
                        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
                            <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                Cobranças (Financeiro)
                            </h2>
                            {transacaoFinanceiras.length > 0 ? (
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {transacaoFinanceiras.map((tx: TransacaoFinanceira) => {
                                        const isPaid = tx.status === "LIQUIDADO"
                                        return (
                                            <div key={tx.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-bold text-xs text-gray-800 leading-tight block truncate max-w-[120px]" title={tx.descricao}>
                                                        {tx.descricao}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                                                        isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                        {isPaid ? "Liquidado" : "Pendente"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-550 font-bold">
                                                    <span>{formatCurrency(tx.valor)}</span>
                                                    <span className="flex items-center gap-1 font-semibold text-gray-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDate(tx.dataVencimento)}
                                                    </span>
                                                </div>
                                                {tx.dataPagamento && (
                                                    <div className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1 pt-1.5 border-t border-dashed border-gray-200">
                                                        <CheckCircle className="w-3 h-3" /> Pagamento em: {formatDate(tx.dataPagamento)}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    Nenhuma cobrança gerada para este contrato.
                                </p>
                            )}
                        </div>

                    </div>

                </div>

            </div>
        </div>
    )
}