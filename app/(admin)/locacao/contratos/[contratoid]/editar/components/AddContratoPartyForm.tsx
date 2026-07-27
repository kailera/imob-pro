'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { addContratoParty, type AddPartyActionState } from '../../../../actions/contratoPartiesSection'
import { findPersonByCpfCnpj, type PersonDocumentResult } from '@/app/(admin)/locacao/actions/searchActions'

const initialState: AddPartyActionState = {
    success: false,
    message: null,
    errors: {},
}

type PhoneItem = {
    id: string
    type: string
    phone: string
    observation: string
}

export type EditableContratoParty = {
    id: string
    papel: string
    responsavelSolidario: boolean
    pessoa: {
        id: string
        nome: string
        cpfCnpj: string
        email: string | null
        emailSecundario?: string | null
        categoria?: 'FISICA' | 'JURIDICA'
        rg?: string | null
        orgaoEmissor?: string | null
        dataNascimento?: string
        nacionalidade?: string | null
        profissao?: string | null
        estadoCivil?: string | null
        genero?: string | null
        rendaMensal?: number | null
        rne?: string | null
        inscricaoEstadual?: string | null
        inscricaoMunicipal?: string | null
        atividade?: string | null
        tipoContribuinteIcms?: string | null
        optanteSimples?: boolean | null
        representanteNome?: string | null
        representanteCpf?: string | null
        representanteRg?: string | null
        representanteOrgaoEmissor?: string | null
        representanteEmail?: string | null
        representanteCelular?: string | null
        representanteCelularDescricao?: string | null
        representanteFixo?: string | null
        representanteFixoDescricao?: string | null
        financeiroNome?: string | null
        financeiroEmail?: string | null
        financeiroCelular?: string | null
        financeiroCelularDescricao?: string | null
        financeiroFixo?: string | null
        financeiroFixoDescricao?: string | null
        telefones?: Array<{ id: string; tipo: string; numero: string; observacao: string | null }>
        endereco?: {
            cep: string
            logradouro: string
            numero: string
            complemento: string | null
            bairro: string
            municipio: string
            estado: string
        } | null
    }
}

type Props = {
    contratoId: string
    party?: EditableContratoParty | null
    onSaved?: () => void
    onCancelEdit?: () => void
}

const emptyPhone = (): PhoneItem => ({
    id: 'phone-1',
    type: 'Comercial',
    phone: '',
    observation: '',
})

export function AddContratoPartyForm({ contratoId, party, onSaved, onCancelEdit }: Props) {
    const formRef = useRef<HTMLFormElement>(null)
    const [category, setCategory] = useState<'FISICA' | 'JURIDICA'>(party?.pessoa.categoria ?? 'FISICA')
    const [phones, setPhones] = useState<PhoneItem[]>(
        party?.pessoa.telefones?.length
            ? party.pessoa.telefones.map(phone => ({
                id: phone.id,
                type: phone.tipo,
                phone: phone.numero,
                observation: phone.observacao ?? '',
            }))
            : [emptyPhone()],
    )

    // Endereço CEP Auto-fill
    const [cep, setCep] = useState(party?.pessoa.endereco?.cep ?? '')
    const [logradouro, setLogradouro] = useState(party?.pessoa.endereco?.logradouro ?? '')
    const [bairro, setBairro] = useState(party?.pessoa.endereco?.bairro ?? '')
    const [municipio, setMunicipio] = useState(party?.pessoa.endereco?.municipio ?? '')
    const [estado, setEstado] = useState(party?.pessoa.endereco?.estado ?? '')
    const [isLoadingCep, setIsLoadingCep] = useState(false)
    const [documentMessage, setDocumentMessage] = useState<string | null>(null)
    const [isSearchingDocument, startDocumentSearch] = useTransition()

    const applyPerson = (person: PersonDocumentResult) => {
        setCategory(person.category)
        setPhones(person.phones.length ? person.phones : [emptyPhone()])
        setCep(person.address?.cep ?? '')
        setLogradouro(person.address?.logradouro ?? '')
        setBairro(person.address?.bairro ?? '')
        setMunicipio(person.address?.municipio ?? '')
        setEstado(person.address?.estado ?? '')

        window.setTimeout(() => {
            const form = formRef.current
            if (!form) return
            Object.entries({
                ...person.values,
                numero: person.address?.numero ?? '',
                complemento: person.address?.complemento ?? '',
            }).forEach(([name, value]) => {
                const control = form.elements.namedItem(name)
                if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
                    control.value = value
                }
            })
        }, 0)
    }

    const handleDocumentBlur = (value: string) => {
        const document = value.replace(/\D/g, '')
        if (document.length !== 11 && document.length !== 14) return

        startDocumentSearch(async () => {
            const person = await findPersonByCpfCnpj(document)
            if (!person) {
                setDocumentMessage('Nenhuma pessoa cadastrada com este CPF/CNPJ.')
                return
            }
            applyPerson(person)
            setDocumentMessage('Dados da pessoa cadastrada foram preenchidos.')
        })
    }

    const handleCepBlur = async () => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length === 8) {
            setIsLoadingCep(true)
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                const data = await res.json()
                if (!data.erro) {
                    setLogradouro(data.logradouro || '')
                    setBairro(data.bairro || '')
                    setMunicipio(data.localidade || '')
                    setEstado(data.uf || '')
                }
            } catch (err) {
                console.warn('Erro ao buscar CEP:', err)
            } finally {
                setIsLoadingCep(false)
            }
        }
    }

    const addPhone = () => {
        setPhones(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'Celular', phone: '', observation: '' }
        ])
    }

    const removePhone = (id: string) => {
        if (phones.length > 1) {
            setPhones(prev => prev.filter(p => p.id !== id))
        }
    }

    const updatePhone = (id: string, field: keyof PhoneItem, value: string) => {
        setPhones(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const action = addContratoParty.bind(null, contratoId)
    const [state, formAction, pending] = useActionState(action, initialState)

    useEffect(() => {
        if (!state.success) return
        formRef.current?.reset()
        onSaved?.()
    }, [onSaved, state.success])

    return (
        <form ref={formRef} action={formAction} className="space-y-6 text-xs bg-gray-50 p-5 rounded-xl border border-gray-200">
            <input type="hidden" name="partyId" value={party?.id ?? ''} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="phonesJson" value={JSON.stringify(phones)} />

            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-gray-900">
                        {party ? `Editando ${party.pessoa.nome}` : 'Novo participante'}
                    </h3>
                    <p className="mt-1 text-[11px] text-gray-500">
                        {party ? 'Altere os dados e salve para atualizar o participante.' : 'O formulário começa vazio para cada participante.'}
                    </p>
                </div>
                {party && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="min-h-11 rounded-lg border border-gray-200 px-4 font-semibold text-gray-600 hover:bg-white"
                    >
                        Cancelar edição
                    </button>
                )}
            </div>

            {/* Papel e Responsabilidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <div>
                    <label htmlFor="role" className="block font-medium text-gray-700 mb-1">
                        Papel no Contrato *
                    </label>
                    <select
                        id="role"
                        name="role"
                        required
                        defaultValue={party?.papel ?? 'TENANT'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#004777] outline-none"
                    >
                        <option value="TENANT">Locatário principal</option>
                        <option value="CO_TENANT">Locatário adicional / solidário</option>
                        <option value="LANDLORD">Locador (Proprietário)</option>
                        <option value="GUARANTOR">Fiador</option>
                        <option value="SPOUSE">Cônjuge</option>
                    </select>
                </div>

                <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input
                            type="checkbox"
                            name="jointlyLiable"
                            value="true"
                            defaultChecked={party?.responsavelSolidario ?? false}
                            className="rounded border-gray-300 text-[#004777] focus:ring-[#004777]"
                        />
                        <span>Responsável solidário</span>
                    </label>
                </div>
            </div>

            {/* Alternância de Abas PF / PJ */}
            <div>
                <label className="block font-medium text-gray-700 mb-2">Pessoa física ou jurídica</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-200 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setCategory('FISICA')}
                        className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            category === 'FISICA'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Pessoa física
                    </button>
                    <button
                        type="button"
                        onClick={() => setCategory('JURIDICA')}
                        className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            category === 'JURIDICA'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Pessoa jurídica
                    </button>
                </div>
            </div>

            {/* Identificação Principal (PF / PJ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block font-medium text-gray-700 mb-1">
                        {category === 'FISICA' ? 'CPF*' : 'CNPJ*'}
                    </label>
                    <input
                        type="text"
                        name="cpfCnpj"
                        required
                        defaultValue={party?.pessoa.cpfCnpj ?? ''}
                        onBlur={event => handleDocumentBlur(event.target.value)}
                        placeholder={category === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                    {(isSearchingDocument || documentMessage) && (
                        <p role="status" className={`mt-1 text-[11px] ${documentMessage?.startsWith('Dados') ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {isSearchingDocument ? 'Buscando pessoa cadastrada...' : documentMessage}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">
                        {category === 'FISICA' ? 'Nome*' : 'Nome / Razão Social*'}
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        defaultValue={party?.pessoa.nome ?? ''}
                        placeholder="Nome completo ou Razão social"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">E-mail*</label>
                    <input
                        type="email"
                        name="email"
                        required
                        defaultValue={party?.pessoa.email ?? ''}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">E-mail secundário</label>
                    <input
                        type="email"
                        name="secondaryEmail"
                        defaultValue={party?.pessoa.emailSecundario ?? ''}
                        placeholder="opcional@exemplo.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
                    />
                </div>
            </div>

            {/* Lista Dinâmica de Telefones */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800">Telefones</h4>
                {phones.map(phone => (
                    <div key={phone.id} className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_40px] gap-2 items-center">
                        <select
                            value={phone.type}
                            onChange={e => updatePhone(phone.id, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                        >
                            <option value="Comercial">Comercial</option>
                            <option value="Celular">Celular</option>
                            <option value="Residencial">Residencial</option>
                        </select>

                        <input
                            type="text"
                            value={phone.phone}
                            onChange={e => updatePhone(phone.id, 'phone', e.target.value)}
                            placeholder="Número: (00) 00000-0000"
                            className="px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />

                        <input
                            type="text"
                            value={phone.observation}
                            onChange={e => updatePhone(phone.id, 'observation', e.target.value)}
                            placeholder="Observação"
                            className="px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />

                        {phones.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removePhone(phone.id)}
                                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addPhone}
                    className="py-1.5 px-3 bg-[#004777] hover:bg-[#003355] text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                    + Adicionar outro telefone
                </button>
            </div>

            {/* Endereço */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">CEP*</label>
                        <input
                            type="text"
                            name="cep"
                            value={cep}
                            onChange={e => setCep(e.target.value)}
                            onBlur={handleCepBlur}
                            placeholder="00000-000"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                        {isLoadingCep && <span className="text-[10px] text-gray-500">Buscando CEP...</span>}
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Logradouro*</label>
                        <input
                            type="text"
                            name="logradouro"
                            value={logradouro}
                            onChange={e => setLogradouro(e.target.value)}
                            placeholder="Rua / Avenida"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Número*</label>
                        <input
                            type="text"
                            name="numero"
                            defaultValue={party?.pessoa.endereco?.numero ?? ''}
                            placeholder="Ex: 535"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Complemento</label>
                        <input
                            type="text"
                            name="complemento"
                            defaultValue={party?.pessoa.endereco?.complemento ?? ''}
                            placeholder="Apto, Bloco, etc."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Bairro*</label>
                        <input
                            type="text"
                            name="bairro"
                            value={bairro}
                            onChange={e => setBairro(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Município*</label>
                        <input
                            type="text"
                            name="municipio"
                            value={municipio}
                            onChange={e => setMunicipio(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Estado*</label>
                        <input
                            type="text"
                            name="estado"
                            value={estado}
                            onChange={e => setEstado(e.target.value)}
                            placeholder="SP"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Dados Complementares - Pessoa Física */}
            {category === 'FISICA' && (
                <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800">Dados complementares de Pessoa Física</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Data de nascimento</label>
                            <input type="date" name="birthDate" defaultValue={party?.pessoa.dataNascimento ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">RG</label>
                            <input type="text" name="rg" defaultValue={party?.pessoa.rg ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Órgão emissor</label>
                            <input type="text" name="issuingAgency" defaultValue={party?.pessoa.orgaoEmissor ?? ''} placeholder="SSP/SP" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Gênero*</label>
                            <select name="gender" defaultValue={party?.pessoa.genero ?? 'Feminino'} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none">
                                <option value="Feminino">Feminino</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Estado civil*</label>
                            <select name="maritalStatus" defaultValue={party?.pessoa.estadoCivil ?? 'Solteiro'} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none">
                                <option value="Solteiro">Solteiro(a)</option>
                                <option value="Casado">Casado(a)</option>
                                <option value="Divorciado">Divorciado(a)</option>
                                <option value="Viuvo">Viúvo(a)</option>
                                <option value="UniaoEstavel">União Estável</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Profissão</label>
                            <input type="text" name="profession" defaultValue={party?.pessoa.profissao ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Nacionalidade</label>
                            <input type="text" name="nationality" defaultValue={party?.pessoa.nacionalidade ?? 'Brasileira'} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Renda mensal (R$)</label>
                            <input type="number" step="0.01" name="monthlyIncome" defaultValue={party?.pessoa.rendaMensal ?? ''} placeholder="Ex: 5000.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">RNE (Estrangeiro)</label>
                            <input type="text" name="rne" defaultValue={party?.pessoa.rne ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Dados Complementares - Pessoa Jurídica */}
            {category === 'JURIDICA' && (
                <div className="space-y-5">
                    {/* Dados societários */}
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800">Dados complementares de Pessoa Jurídica</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Inscrição estadual</label>
                                <input type="text" name="stateRegistration" defaultValue={party?.pessoa.inscricaoEstadual ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Inscrição municipal</label>
                                <input type="text" name="municipalRegistration" defaultValue={party?.pessoa.inscricaoMunicipal ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Atividade</label>
                                <input type="text" name="activity" defaultValue={party?.pessoa.atividade ?? ''} placeholder="Comércio varejista..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Tipo contribuinte ICMS</label>
                                <select name="icmsTaxpayerType" defaultValue={party?.pessoa.tipoContribuinteIcms ?? 'Contribuinte isento'} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none">
                                    <option value="Contribuinte isento">Contribuinte isento</option>
                                    <option value="Contribuinte ICMS">Contribuinte ICMS</option>
                                    <option value="Nao contribuinte">Não contribuinte</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Optante pelo SIMPLES nacional</label>
                                <select name="optantSimples" defaultValue={party?.pessoa.optanteSimples === false ? 'Nao' : 'Sim'} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none">
                                    <option value="Sim">Sim</option>
                                    <option value="Nao">Não</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Responsável pela Pessoa Jurídica */}
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800">Responsável pela Pessoa Jurídica (Representante Legal)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">CPF*</label>
                                <input type="text" name="legalRepCpf" defaultValue={party?.pessoa.representanteCpf ?? ''} placeholder="000.000.000-00" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Nome*</label>
                                <input type="text" name="legalRepName" defaultValue={party?.pessoa.representanteNome ?? ''} placeholder="Nome do sócio / representante" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">RG</label>
                                <input type="text" name="legalRepRg" defaultValue={party?.pessoa.representanteRg ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Órgão emissor</label>
                                <input type="text" name="legalRepIssuingAgency" defaultValue={party?.pessoa.representanteOrgaoEmissor ?? ''} placeholder="SSP/SP" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">E-mail</label>
                                <input type="email" name="legalRepEmail" defaultValue={party?.pessoa.representanteEmail ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Telefone celular do responsável</label>
                                <input type="text" name="legalRepPhoneMobile" defaultValue={party?.pessoa.representanteCelular ?? ''} placeholder="(18) 98114-9900" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Descrição celular</label>
                                <input type="text" name="legalRepPhoneMobileDesc" defaultValue={party?.pessoa.representanteCelularDescricao ?? ''} placeholder="Ex: Celular Sócio" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Telefone fixo do responsável</label>
                                <input type="text" name="legalRepPhoneLandline" defaultValue={party?.pessoa.representanteFixo ?? ''} placeholder="(18) 9811-4990" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Descrição fixo</label>
                                <input type="text" name="legalRepPhoneLandlineDesc" defaultValue={party?.pessoa.representanteFixoDescricao ?? ''} placeholder="Ex: Fixo Empresa" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Financeiro da Pessoa Jurídica */}
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800">Financeiro da Pessoa Jurídica</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Nome</label>
                                <input type="text" name="financialName" defaultValue={party?.pessoa.financeiroNome ?? ''} placeholder="Nome do contato financeiro" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">E-mail</label>
                                <input type="email" name="financialEmail" defaultValue={party?.pessoa.financeiroEmail ?? ''} placeholder="financeiro@empresa.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Telefone celular do financeiro</label>
                                <input type="text" name="financialPhoneMobile" defaultValue={party?.pessoa.financeiroCelular ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Descrição celular</label>
                                <input type="text" name="financialPhoneMobileDesc" defaultValue={party?.pessoa.financeiroCelularDescricao ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Telefone fixo do financeiro</label>
                                <input type="text" name="financialPhoneLandline" defaultValue={party?.pessoa.financeiroFixo ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Descrição fixo</label>
                                <input type="text" name="financialPhoneLandlineDesc" defaultValue={party?.pessoa.financeiroFixoDescricao ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botão de Submissão */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={pending}
                    className="py-2.5 px-6 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {pending ? 'Salvando Participante...' : 'Salvar Participante'}
                </button>
            </div>

            {state.message && (
                <p role="status" className={`text-xs font-medium ${state.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {state.message}
                </p>
            )}
        </form>
    )
}
