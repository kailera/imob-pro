// components/ContratoPropertyForm.tsx

'use client'

import { updateContratoProperty, type PropertyActionState } from '@/app/(admin)/locacao/actions/updateContratoProperty'
import { useActionState, useEffect, useRef, useState } from 'react'

type PropertyData = {
  id?: string
  codigo?: string
  tipo?: string | null
  logradouro?: string | null
  numero?: number | string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  uf?: string | null
  cep?: string | number | null
}

type Property = PropertyData | null

type Props = {
  contratoId: string
  property: Property
}

const initialState: PropertyActionState = {
  success: false,
  message: null,
  errors: {},
}

function formatCep(value: string | number | null | undefined, padStoredValue = false) {
  const rawDigits = String(value ?? '').replace(/\D/g, '')
  if (!rawDigits || (padStoredValue && Number(rawDigits) === 0)) return ''

  const digits = (padStoredValue ? rawDigits.padStart(8, '0') : rawDigits).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export function ContratoPropertyForm({
  contratoId,
  property,
}: Props) {
  const [propertyType, setPropertyType] = useState(property?.tipo || 'CASA')
  const [formDataState, setFormDataState] = useState({
    cep: formatCep(property?.cep, true),
    logradouro: property?.logradouro || '',
    numero: property?.numero?.toString() || '',
    complemento: property?.complemento || '',
    bairro: property?.bairro || '',
    cidade: property?.cidade || '',
    estado: property?.estado || property?.uf || '',
  })
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [cepMessage, setCepMessage] = useState<string | null>(null)
  const numeroInputRef = useRef<HTMLInputElement>(null)

  const action = updateContratoProperty.bind(
    null,
    contratoId,
  )

  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const normalizedValue = name === 'cep'
      ? formatCep(value)
      : name === 'estado' ? value.toUpperCase().slice(0, 2) : value
    if (name === 'cep' && normalizedValue.replace(/\D/g, '').length !== 8) {
      setCepMessage(null)
    }
    setFormDataState(prev => ({
      ...prev,
      [name]: normalizedValue,
    }))
  }

  const handleCepFocus = () => {
    if (formDataState.cep.replace(/\D/g, '') !== '00000000') return
    setCepMessage(null)
    setFormDataState(previous => ({ ...previous, cep: '' }))
  }

  useEffect(() => {
    const cleanCep = formDataState.cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      return
    }

    let active = true
    const fetchCep = async () => {
      setIsFetchingCep(true)
      setCepMessage(null)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        if (!response.ok) throw new Error('Não foi possível consultar o CEP.')
        const data = await response.json()
        if (!active) return
        if (data.erro) {
          setCepMessage('CEP não encontrado.')
          return
        }
        setFormDataState(current => ({
          ...current,
          logradouro: data.logradouro || current.logradouro,
          bairro: data.bairro || current.bairro,
          cidade: data.localidade || current.cidade,
          estado: data.uf || current.estado,
        }))
        setCepMessage('Endereço encontrado.')
        window.setTimeout(() => numeroInputRef.current?.focus(), 50)
      } catch {
        if (active) setCepMessage('Não foi possível buscar o CEP. Preencha o endereço manualmente.')
      } finally {
        if (active) setIsFetchingCep(false)
      }
    }
    void fetchCep()
    return () => {
      active = false
    }
  }, [formDataState.cep])

  return (
    <form
      action={formAction}
      className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="text-lg">🏠</span> Imóvel e Endereço
        </h3>
      </div>

      <div className="space-y-4 text-xs">
        <input type="hidden" name="propertyId" value={property?.id ?? ''} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor="propertyType" className="block font-medium text-gray-700 mb-1">
              Tipo do imóvel*
            </label>
            <select
              id="propertyType"
              name="tipo"
              value={propertyType}
              onChange={event => setPropertyType(event.target.value)}
              className="w-full min-h-11 px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#004777]"
            >
              <option value="CASA">Casa</option>
              <option value="CONDOMINIO">Condomínio</option>
              <option value="LOTE">Lote</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="RURAL">Rural</option>
              <option value="KITNET">Kitnet</option>
            </select>
            <FieldErrors errors={state.errors?.tipo} />
          </div>
        </div>

        {/* Campos de Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label htmlFor="property-cep" className="block font-medium text-gray-700 mb-1">CEP:</label>
            <input
              id="property-cep"
              type="text"
              name="cep"
              placeholder="00000-000"
              value={formDataState.cep}
              onChange={handleChange}
              onFocus={handleCepFocus}
              inputMode="numeric"
              maxLength={9}
              aria-describedby="property-cep-status"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <p id="property-cep-status" className={`mt-1 text-[11px] ${
              cepMessage?.includes('encontrado.') && !cepMessage.startsWith('Não') ? 'text-emerald-600' : 'text-gray-500'
            }`}>
              {isFetchingCep ? 'Buscando endereço...' : cepMessage}
            </p>
            <FieldErrors errors={state.errors?.cep} />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-gray-700 mb-1">Logradouro / Rua:</label>
            <input
              type="text"
              name="logradouro"
              placeholder="Logradouro"
              value={formDataState.logradouro}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.logradouro} />
          </div>

          <div className="md:col-span-1">
            <label className="block font-medium text-gray-700 mb-1">Número:</label>
            <input
              ref={numeroInputRef}
              type="text"
              name="numero"
              placeholder="Número"
              value={formDataState.numero}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.numero} />
          </div>

          <div className="md:col-span-1">
            <label className="block font-medium text-gray-700 mb-1">Complemento:</label>
            <input
              type="text"
              name="complemento"
              placeholder="Complemento"
              value={formDataState.complemento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.complemento} />
          </div>

          <div className="md:col-span-1">
            <label className="block font-medium text-gray-700 mb-1">Bairro:</label>
            <input
              type="text"
              name="bairro"
              placeholder="Bairro"
              value={formDataState.bairro}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.bairro} />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-gray-700 mb-1">Cidade:</label>
            <input
              type="text"
              name="cidade"
              placeholder="Cidade"
              value={formDataState.cidade}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.cidade} />
          </div>

          <div className="md:col-span-1">
            <label className="block font-medium text-gray-700 mb-1">Estado (UF):</label>
            <input
              type="text"
              name="estado"
              placeholder="Estado"
              value={formDataState.estado}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#004777]"
            />
            <FieldErrors errors={state.errors?.estado} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 text-xs">
        <button
          type="submit"
          disabled={pending}
          className="py-2.5 px-6 bg-[#004777] hover:bg-[#003355] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {pending
            ? 'Salvando...'
            : property?.id ? 'Salvar imóvel' : 'Criar imóvel'}
        </button>

        {state.message && (
          <p
            role="status"
            className={`text-xs font-medium ${
              state.success ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {state.message}
          </p>
        )}
      </div>

    </form>
  )
}

function FieldErrors({
  errors,
}: {
  errors?: string[]
}) {
  if (!errors?.length) {
    return null
  }

  return (
    <div role="alert" className="mt-1 space-y-0.5">
      {errors.map(error => (
        <p key={error} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ))}
    </div>
  )
}
