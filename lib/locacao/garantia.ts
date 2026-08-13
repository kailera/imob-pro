import type { LeaseAttachment } from './anexos'
import { parseLeaseAttachmentsFormValue } from './anexos'

export const leaseGuaranteeTypes = [
  'CASH_DEPOSIT',
  'CAR_COLLATERAL',
  'MOTORCYCLE_COLLATERAL',
  'LOFT_RENT_GUARANTEE',
] as const

export type LeaseGuaranteeType = (typeof leaseGuaranteeTypes)[number]

export type LeaseGuaranteeDetails = Record<string, string | number | boolean | LeaseAttachment[]>

export function isLeaseGuaranteeType(value: unknown): value is LeaseGuaranteeType {
  return typeof value === 'string' && leaseGuaranteeTypes.includes(value as LeaseGuaranteeType)
}

export function parseLeaseGuaranteeDetails(value: unknown): LeaseGuaranteeDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const details: LeaseGuaranteeDetails = {}
  for (const [key, item] of Object.entries(source)) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      details[key] = item
    }
  }

  if (Array.isArray(source.attachments)) {
    details.attachments = source.attachments.filter(isLeaseAttachment)
  }
  return details
}

export function guaranteeAttachmentsFromDetails(value: unknown): LeaseAttachment[] {
  const attachments = parseLeaseGuaranteeDetails(value).attachments
  return Array.isArray(attachments) ? attachments : []
}

export function guaranteeDetailsFromForm(
  type: LeaseGuaranteeType,
  formData: FormData,
  storagePrefix: string,
): LeaseGuaranteeDetails {
  const common = compactDetails({
    status: text(formData, 'status', 40),
    notes: text(formData, 'notes', 3_000),
  })
  const attachments = parseLeaseAttachmentsFormValue(
    formData.get('guaranteeAttachments'),
    storagePrefix,
  )

  const specific = type === 'CASH_DEPOSIT'
    ? compactDetails({
        amount: numberValue(formData, 'cashAmount'),
        depositDate: dateValue(formData, 'cashDepositDate'),
        financialInstitution: text(formData, 'cashInstitution', 160),
        savingsAccountHolder: text(formData, 'cashSavingsHolder', 180),
        savingsAccountReference: text(formData, 'cashSavingsReference', 180),
        receiptNumber: text(formData, 'cashReceiptNumber', 120),
      })
    : type === 'CAR_COLLATERAL' || type === 'MOTORCYCLE_COLLATERAL'
      ? compactDetails({
          ownerName: text(formData, 'vehicleOwnerName', 180),
          ownerDocument: text(formData, 'vehicleOwnerDocument', 30),
          makeModel: text(formData, 'vehicleMakeModel', 180),
          manufactureYear: text(formData, 'vehicleManufactureYear', 20),
          color: text(formData, 'vehicleColor', 60),
          plate: text(formData, 'vehiclePlate', 20).toUpperCase(),
          renavam: text(formData, 'vehicleRenavam', 30),
          chassis: text(formData, 'vehicleChassis', 50).toUpperCase(),
          appraisedValue: numberValue(formData, 'vehicleAppraisedValue'),
          appraisalDate: dateValue(formData, 'vehicleAppraisalDate'),
          registryOffice: text(formData, 'vehicleRegistryOffice', 200),
          registryNumber: text(formData, 'vehicleRegistryNumber', 120),
          registrationDate: dateValue(formData, 'vehicleRegistrationDate'),
        })
      : compactDetails({
          proposalNumber: text(formData, 'loftProposalNumber', 120),
          guaranteeId: text(formData, 'loftGuaranteeId', 120),
          loftStatus: text(formData, 'loftStatus', 60),
          planName: text(formData, 'loftPlanName', 160),
          approvalDate: dateValue(formData, 'loftApprovalDate'),
          effectiveFrom: dateValue(formData, 'loftEffectiveFrom'),
          effectiveTo: dateValue(formData, 'loftEffectiveTo'),
          rentalPackageAmount: numberValue(formData, 'loftRentalPackageAmount'),
          contractedTotalValue: numberValue(formData, 'loftContractedTotalValue'),
          feeAmount: numberValue(formData, 'loftFeeAmount'),
          paymentMethod: text(formData, 'loftPaymentMethod', 80),
          renewalDate: dateValue(formData, 'loftRenewalDate'),
          mandatoryClauseIncluded: formData.get('loftMandatoryClauseIncluded') === 'true',
          documentsSentDate: dateValue(formData, 'loftDocumentsSentDate'),
          lastUpdateDate: dateValue(formData, 'loftLastUpdateDate'),
          coverageNotes: text(formData, 'loftCoverageNotes', 3_000),
        })

  return {
    ...common,
    ...specific,
    ...(attachments.length ? { attachments } : {}),
  }
}

function compactDetails(values: Record<string, string | number | boolean | null>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== ''),
  ) as Record<string, string | number | boolean>
}

function text(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function dateValue(formData: FormData, name: string) {
  const value = text(formData, name, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function numberValue(formData: FormData, name: string) {
  const raw = text(formData, name, 80)
  if (!raw) return null
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw
  const value = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(2)) : null
}

function isLeaseAttachment(value: unknown): value is LeaseAttachment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.fileName === 'string'
    && typeof item.url === 'string'
    && typeof item.mimeType === 'string'
}
