'use client'

import { useActionState, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { updateLeaseGuarantee, type GuaranteeActionState } from '@/app/(admin)/locacao/actions/updateLeaseGuarantee'
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput'
import type { LeaseAttachment } from '@/lib/locacao/anexos'
import type { LeaseGuaranteeDetails, LeaseGuaranteeType } from '@/lib/locacao/garantia'
import { LeaseAttachmentsField } from './LeaseAttachmentsField'

const initialState: GuaranteeActionState = { success: false, message: null, errors: {} }
type GuaranteeFormType = LeaseGuaranteeType | 'NONE'

type Props = {
  contratoId: string
  guarantee?: { type: string; details: LeaseGuaranteeDetails } | null
}

export function ContratoGuaranteeForm({ contratoId, guarantee }: Props) {
  const initialType = isFormType(guarantee?.type) ? guarantee.type : 'NONE'
  const [type, setType] = useState<GuaranteeFormType>(initialType)
  const details = guarantee?.details ?? {}
  const [cashAmount, setCashAmount] = useState(numberText(details.amount))
  const [vehicleValue, setVehicleValue] = useState(numberText(details.appraisedValue))
  const [loftPackage, setLoftPackage] = useState(numberText(details.rentalPackageAmount))
  const [loftTotal, setLoftTotal] = useState(numberText(details.contractedTotalValue))
  const [loftFee, setLoftFee] = useState(numberText(details.feeAmount))
  const [state, formAction, pending] = useActionState(updateLeaseGuarantee.bind(null, contratoId), initialState)
  const attachments = Array.isArray(details.attachments) ? details.attachments as LeaseAttachment[] : []

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 text-xs">
      <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#004777]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">Garantia locatícia</h2>
          <p className="mt-1 text-[11px] text-gray-500">Escolha somente uma modalidade por contrato. Todos os dados complementares são opcionais.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Modalidade da garantia" htmlFor="guarantee-type">
          <select id="guarantee-type" name="type" value={type} onChange={event => setType(event.target.value as GuaranteeFormType)} className={inputClass}>
            <option value="NONE">Sem garantia cadastrada</option>
            <option value="CASH_DEPOSIT">Caução em dinheiro</option>
            <option value="CAR_COLLATERAL">Caução de carro</option>
            <option value="MOTORCYCLE_COLLATERAL">Caução de moto</option>
            <option value="LOFT_RENT_GUARANTEE">Loft — Fiança Aluguel</option>
          </select>
        </Field>
        {type !== 'NONE' && (
          <Field label="Situação da garantia" htmlFor="guarantee-status">
            <select id="guarantee-status" name="status" defaultValue={stringValue(details.status)} className={inputClass}>
              <option value="">Não informada</option><option value="PENDING">Pendente</option><option value="ACTIVE">Ativa</option>
              <option value="SUSPENDED">Suspensa</option><option value="RELEASED">Liberada / devolvida</option><option value="ENDED">Encerrada</option>
            </select>
          </Field>
        )}
      </div>

      {type === 'CASH_DEPOSIT' && (
        <GuaranteeBox tone="emerald" title="Caução em dinheiro" description="O limite legal é de três aluguéis e o depósito deve ficar em caderneta de poupança, com rendimentos em benefício do locatário.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Valor depositado" error={state.errors.cashAmount}>
              <FormattedNumberInput name="cashAmount" value={cashAmount} onValueChange={setCashAmount} format="currency" placeholder="R$ 0,00" className={inputClass} />
            </Field>
            <Input label="Data do depósito" name="cashDepositDate" type="date" value={details.depositDate} />
            <Input label="Instituição financeira" name="cashInstitution" value={details.financialInstitution} placeholder="Banco da poupança" />
            <Input label="Titular da poupança" name="cashSavingsHolder" value={details.savingsAccountHolder} />
            <Input label="Referência da conta/poupança" name="cashSavingsReference" value={details.savingsAccountReference} placeholder="Agência e conta ou identificador" />
            <Input label="Número do recibo" name="cashReceiptNumber" value={details.receiptNumber} />
          </div>
        </GuaranteeBox>
      )}

      {(type === 'CAR_COLLATERAL' || type === 'MOTORCYCLE_COLLATERAL') && (
        <GuaranteeBox tone="amber" title={type === 'CAR_COLLATERAL' ? 'Caução de carro' : 'Caução de moto'} description="Identifique o bem e o registro da caução no Cartório de Títulos e Documentos.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Input label="Proprietário do veículo" name="vehicleOwnerName" value={details.ownerName} />
            <Input label="CPF/CNPJ do proprietário" name="vehicleOwnerDocument" value={details.ownerDocument} />
            <Input label="Marca e modelo" name="vehicleMakeModel" value={details.makeModel} />
            <Input label="Ano de fabricação/modelo" name="vehicleManufactureYear" value={details.manufactureYear} placeholder="Ex.: 2022/2023" />
            <Input label="Cor" name="vehicleColor" value={details.color} /><Input label="Placa" name="vehiclePlate" value={details.plate} />
            <Input label="RENAVAM" name="vehicleRenavam" value={details.renavam} /><Input label="Chassi" name="vehicleChassis" value={details.chassis} />
            <Field label="Valor de avaliação"><FormattedNumberInput name="vehicleAppraisedValue" value={vehicleValue} onValueChange={setVehicleValue} format="currency" placeholder="R$ 0,00" className={inputClass} /></Field>
            <Input label="Data da avaliação" name="vehicleAppraisalDate" type="date" value={details.appraisalDate} />
            <Input label="Cartório de Títulos e Documentos" name="vehicleRegistryOffice" value={details.registryOffice} />
            <Input label="Número do registro da caução" name="vehicleRegistryNumber" value={details.registryNumber} />
            <Input label="Data do registro" name="vehicleRegistrationDate" type="date" value={details.registrationDate} />
          </div>
        </GuaranteeBox>
      )}

      {type === 'LOFT_RENT_GUARANTEE' && (
        <GuaranteeBox tone="sky" title="Loft — Fiança Aluguel" description="Registre a contratação e os limites aceitos na plataforma da Loft. A cláusula obrigatória e os documentos enviados são essenciais para a validade da cobertura.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Input label="Número da proposta" name="loftProposalNumber" value={details.proposalNumber} /><Input label="ID da garantia na Loft" name="loftGuaranteeId" value={details.guaranteeId} />
            <Field label="Status na Loft" htmlFor="loft-status"><select id="loft-status" name="loftStatus" defaultValue={stringValue(details.loftStatus)} className={inputClass}><option value="">Não informado</option><option value="IN_ANALYSIS">Em análise</option><option value="APPROVED">Aprovada</option><option value="ACTIVE">Ativa</option><option value="SUSPENDED">Suspensa</option><option value="ENDED">Encerrada</option></select></Field>
            <Input label="Modalidade/plano contratado" name="loftPlanName" value={details.planName} /><Input label="Data da aprovação" name="loftApprovalDate" type="date" value={details.approvalDate} />
            <Input label="Início da vigência" name="loftEffectiveFrom" type="date" value={details.effectiveFrom} /><Input label="Fim da vigência" name="loftEffectiveTo" type="date" value={details.effectiveTo} />
            <Field label="Pacote locatício informado"><FormattedNumberInput name="loftRentalPackageAmount" value={loftPackage} onValueChange={setLoftPackage} format="currency" placeholder="Aluguel + encargos" className={inputClass} /></Field>
            <Field label="Valor total contratado/limite"><FormattedNumberInput name="loftContractedTotalValue" value={loftTotal} onValueChange={setLoftTotal} format="currency" placeholder="R$ 0,00" className={inputClass} /></Field>
            <Field label="Taxa Loft"><FormattedNumberInput name="loftFeeAmount" value={loftFee} onValueChange={setLoftFee} format="currency" placeholder="R$ 0,00" className={inputClass} /></Field>
            <Field label="Forma de pagamento da taxa" htmlFor="loft-payment-method"><select id="loft-payment-method" name="loftPaymentMethod" defaultValue={stringValue(details.paymentMethod)} className={inputClass}><option value="">Não informada</option><option value="DIRECT_TO_LOFT">Direto à Loft</option><option value="PVI">Via imobiliária (PVI)</option></select></Field>
            <Input label="Próxima renovação" name="loftRenewalDate" type="date" value={details.renewalDate} /><Input label="Documentos enviados em" name="loftDocumentsSentDate" type="date" value={details.documentsSentDate} />
            <Input label="Última atualização na Loft" name="loftLastUpdateDate" type="date" value={details.lastUpdateDate} />
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 font-medium text-gray-700">
            <input type="checkbox" name="loftMandatoryClauseIncluded" value="true" defaultChecked={details.mandatoryClauseIncluded === true} className="h-4 w-4 rounded border-gray-300 text-[#004777] focus:ring-[#004777]" />
            Cláusula obrigatória da Loft incluída integralmente no contrato
          </label>
          <Field label="Resumo da cobertura e observações"><textarea name="loftCoverageNotes" defaultValue={stringValue(details.coverageNotes)} rows={3} className={inputClass} placeholder="Encargos cobertos, add-ons, restrições ou observações da proposta" /></Field>
        </GuaranteeBox>
      )}

      {type !== 'NONE' && <>
        <Field label="Observações gerais"><textarea name="notes" defaultValue={stringValue(details.notes)} rows={3} className={inputClass} placeholder="Informações adicionais sobre constituição, substituição ou liberação da garantia" /></Field>
        <LeaseAttachmentsField leaseId={contratoId} name="guaranteeAttachments" title="Comprovantes da garantia" description="Anexe recibos, comprovantes de depósito, CRLV, avaliação, registro em cartório, proposta ou aceite da Loft." initialAttachments={attachments} />
      </>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-[#004777] px-5 font-semibold text-white hover:bg-[#003355] disabled:opacity-60">{pending ? 'Salvando...' : type === 'NONE' ? 'Salvar sem garantia' : 'Salvar garantia'}</button>
        {state.message && <p role="status" className={`font-medium ${state.success ? 'text-emerald-700' : 'text-red-600'}`}>{state.message}</p>}
      </div>
    </form>
  )
}

function Input({ label, name, value, type = 'text', placeholder }: { label: string; name: string; value?: unknown; type?: string; placeholder?: string }) {
  return <Field label={label} htmlFor={name}><input id={name} name={name} type={type} defaultValue={stringValue(value)} placeholder={placeholder} className={inputClass} /></Field>
}
function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string[]; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-1 block font-medium text-gray-700">{label}</label>{children}{error?.map(message => <p key={message} className="mt-1 text-red-600">{message}</p>)}</div>
}
function GuaranteeBox({ tone, title, description, children }: { tone: 'emerald' | 'amber' | 'sky'; title: string; description: string; children: React.ReactNode }) {
  const tones = { emerald: 'border-emerald-100 bg-emerald-50/30', amber: 'border-amber-100 bg-amber-50/30', sky: 'border-sky-100 bg-sky-50/40' }
  return <div className={`space-y-4 rounded-xl border p-4 ${tones[tone]}`}><div><h3 className="font-bold text-gray-900">{title}</h3><p className="mt-1 text-[11px] text-gray-600">{description}</p></div>{children}</div>
}
function stringValue(value: unknown) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }
function numberText(value: unknown) { return typeof value === 'number' ? value.toFixed(2).replace('.', ',') : '' }
function isFormType(value: unknown): value is GuaranteeFormType { return value === 'CASH_DEPOSIT' || value === 'CAR_COLLATERAL' || value === 'MOTORCYCLE_COLLATERAL' || value === 'LOFT_RENT_GUARANTEE' }
const inputClass = 'min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#004777]/20'
