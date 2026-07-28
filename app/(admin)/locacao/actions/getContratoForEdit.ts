import 'server-only'

import { prisma } from '@/lib/prisma'
import { requireUserContext } from '@/lib/auth'
import { parseLeaseAttachments } from '@/lib/locacao/anexos'

export async function getContratoForEdit(
  contratoId: string,
) {
  const context = await requireUserContext()

  const lease = await prisma.lease.findFirst({
    where: {
      id: contratoId,
      tenantId: context.tenantId,
    },
    include: {
      property: {
        select: {
          id: true,
          codigo: true,
          tipo: true,
          logradouro: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          uf: true,
          cep: true,
        },
      },
      parties: {
        include: {
          person: {
            include: {
              phones: true,
              addresses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      terms: true,
      termsPeriods: {
        orderBy: {
          effectiveFrom: 'asc',
        },
      },
      charges: true,
      guarantee: true,
      clauses: true,
      documents: true,
      iptu: true,
      utilities: true,
      condominium: true,
    },
  })

  if (!lease) {
    return null
  }

  const startDateStr = lease.startDate ? lease.startDate.toISOString().slice(0, 10) : ''
  const endDateStr = lease.endDate ? lease.endDate.toISOString().slice(0, 10) : ''
  let prazoMeses = ''
  if (lease.startDate && lease.endDate) {
    const diffMonths = (lease.endDate.getFullYear() - lease.startDate.getFullYear()) * 12 + (lease.endDate.getMonth() - lease.startDate.getMonth())
    prazoMeses = Math.max(0, diffMonths).toString()
  }

  return {
    id: lease.id,
    version: lease.version,
    codigo: lease.code,
    status: lease.status,
    tipoLocacao: lease.rentalType === 'RESIDENTIAL'
      ? 'RESIDENCIAL'
      : lease.rentalType === 'COMMERCIAL' ? 'COMERCIAL' : '',
    finalidade: lease.purpose ?? '',
    dataInicio: startDateStr,
    dataFim: endDateStr,
    prazoMeses,
    legacyCode: lease.legacyCode ?? '',
    legacySystem: lease.legacySystem,
    migratedAt: lease.migratedAt?.toISOString() ?? null,
    reviewedAt: lease.reviewedAt?.toISOString() ?? null,
    billingStartDate: lease.billingStartDate ? lease.billingStartDate.toISOString().slice(0, 10) : '',
    imovel: lease.property,
    participantes: lease.parties.map(item => ({
      id: item.id,
      papel: item.role,
      responsavelSolidario: item.jointlyLiable,
      pessoa: {
        id: item.person.id,
        nome: item.person.name,
        cpfCnpj: item.person.cpfCnpj,
        email: item.person.email,
        emailSecundario: item.person.secondaryEmail,
        categoria: item.person.category,
        rg: item.person.rg,
        orgaoEmissor: item.person.issuingAgency,
        dataNascimento: item.person.birthDate ? item.person.birthDate.toISOString().slice(0, 10) : '',
        nacionalidade: item.person.nationality,
        profissao: item.person.profession,
        estadoCivil: item.person.maritalStatus,
        genero: item.person.gender,
        rendaMensal: item.person.monthlyIncome ? Number(item.person.monthlyIncome) : null,
        rne: item.person.rne,
        inscricaoEstadual: item.person.stateRegistration,
        inscricaoMunicipal: item.person.municipalRegistration,
        atividade: item.person.activity,
        tipoContribuinteIcms: item.person.icmsTaxpayerType,
        optanteSimples: item.person.optantSimples,
        representanteNome: item.person.legalRepName,
        representanteCpf: item.person.legalRepCpf,
        representanteRg: item.person.legalRepRg,
        representanteOrgaoEmissor: item.person.legalRepIssuingAgency,
        representanteEmail: item.person.legalRepEmail,
        representanteCelular: item.person.legalRepPhoneMobile,
        representanteCelularDescricao: item.person.legalRepPhoneMobileDesc,
        representanteFixo: item.person.legalRepPhoneLandline,
        representanteFixoDescricao: item.person.legalRepPhoneLandlineDesc,
        financeiroNome: item.person.financialName,
        financeiroEmail: item.person.financialEmail,
        financeiroCelular: item.person.financialPhoneMobile,
        financeiroCelularDescricao: item.person.financialPhoneMobileDesc,
        financeiroFixo: item.person.financialPhoneLandline,
        financeiroFixoDescricao: item.person.financialPhoneLandlineDesc,
        telefones: item.person.phones.map(phone => ({
          id: phone.id,
          tipo: phone.type,
          numero: phone.phone,
          observacao: phone.observation,
        })),
        endereco: item.person.addresses[0]
          ? {
              cep: item.person.addresses[0].cep,
              logradouro: item.person.addresses[0].logradouro,
              numero: item.person.addresses[0].numero,
              complemento: item.person.addresses[0].complemento,
              bairro: item.person.addresses[0].bairro,
              municipio: item.person.addresses[0].municipio,
              estado: item.person.addresses[0].estado,
            }
          : null,
      },
    })),
    terms: lease.terms
      ? {
          contractMonths: lease.terms.contractMonths ?? 30,
          contractPenaltyValue: lease.terms.contractPenaltyValue ? Number(lease.terms.contractPenaltyValue) : null,
          contractPenaltyType: lease.terms.contractPenaltyType ?? 'PERCENT',
          penaltyBeforeDate: lease.terms.penaltyBeforeDate ? lease.terms.penaltyBeforeDate.toISOString().slice(0, 10) : '',
          readjustmentPeriodM: lease.terms.readjustmentPeriodM ?? 12,
          readjustmentIndex: lease.terms.readjustmentIndex ?? 'IGP-M',
          rentValue: lease.terms.rentValue ? Number(lease.terms.rentValue) : null,
          paymentDueDay: lease.terms.paymentDueDay ?? 10,
          firstPeriodStartDate: lease.terms.firstPeriodStartDate ? lease.terms.firstPeriodStartDate.toISOString().slice(0, 10) : '',
          firstPeriodEndDay: lease.terms.firstPeriodEndDay ?? '',
          firstPeriodDueDate: lease.terms.firstPeriodDueDate ? lease.terms.firstPeriodDueDate.toISOString().slice(0, 10) : '',
          nextReadjustmentDate: lease.terms.nextReadjustmentDate ? lease.terms.nextReadjustmentDate.toISOString().slice(0, 10) : '',
          earlyPaymentDiscount: lease.terms.earlyPaymentDiscount ? Number(lease.terms.earlyPaymentDiscount) : null,
          discountType: lease.terms.discountType ?? 'PERCENT',
          discountDaysBefore: lease.terms.discountDaysBefore ?? 1,
          lateFeePercentage: lease.terms.lateFeePercentage ? Number(lease.terms.lateFeePercentage) : 10,
          lateFeeDays: lease.terms.lateFeeDays ?? 1,
          lateInterestMonthly: lease.terms.lateInterestMonthly ? Number(lease.terms.lateInterestMonthly) : 1,
          lateInterestDays: lease.terms.lateInterestDays ?? 1,
          lawyerFeePercentage: lease.terms.lawyerFeePercentage ? Number(lease.terms.lawyerFeePercentage) : 100,
          lawyerFeeGraceDays: lease.terms.lawyerFeeGraceDays ?? 90,
          transferGraceDays: lease.terms.transferGraceDays ?? 10,
          guaranteedPeriod: lease.terms.guaranteedPeriod ?? 'Não garantir',
          guaranteeScope: lease.terms.guaranteeScope ?? 'Somente o aluguel',
          adminFeePercentage: lease.terms.adminFeePercentage ? Number(lease.terms.adminFeePercentage) : 10,
          adminFeeFinesPercentage: lease.terms.adminFeeFinesPercentage ? Number(lease.terms.adminFeeFinesPercentage) : 50,
          brokerageFeePercentage: lease.terms.brokerageFeePercentage ? Number(lease.terms.brokerageFeePercentage) : 100,
          irrfRetentionResponsibility: lease.terms.irrfRetentionResponsibility ?? 'LOCATARIO',
          billingMethod: lease.terms.billingMethod ?? 'NONE',
        }
      : null,
    termsPeriods: lease.termsPeriods.map(period => ({
      id: period.id,
      effectiveFrom: period.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: period.effectiveTo
        ? new Date(period.effectiveTo.getTime() - 86_400_000).toISOString().slice(0, 10)
        : '',
      rentAmount: Number(period.rentAmount),
      paymentDueDay: period.paymentDueDay,
      adjustmentIndex: period.adjustmentIndex ?? '',
      adjustmentPercentage: period.adjustmentPercentage ? Number(period.adjustmentPercentage) : null,
      previousRentAmount: period.previousRentAmount ? Number(period.previousRentAmount) : null,
      earlyPaymentDiscount: period.earlyPaymentDiscount ? Number(period.earlyPaymentDiscount) : null,
      discountType: period.discountType ?? 'PERCENT',
      discountDaysBefore: period.discountDaysBefore,
      lateFeePercentage: period.lateFeePercentage ? Number(period.lateFeePercentage) : null,
      lateFeeDays: period.lateFeeDays,
      lateInterestMonthly: period.lateInterestMonthly ? Number(period.lateInterestMonthly) : null,
      lateInterestDays: period.lateInterestDays,
      lawyerFeePercentage: period.lawyerFeePercentage ? Number(period.lawyerFeePercentage) : null,
      lawyerFeeGraceDays: period.lawyerFeeGraceDays,
      transferGraceDays: period.transferGraceDays,
      guaranteedPeriod: period.guaranteedPeriod ?? '',
      guaranteeScope: period.guaranteeScope ?? '',
      adminFeePercentage: period.adminFeePercentage ? Number(period.adminFeePercentage) : null,
      adminFeeFinesPercentage: period.adminFeeFinesPercentage ? Number(period.adminFeeFinesPercentage) : null,
      brokerageFeePercentage: period.brokerageFeePercentage ? Number(period.brokerageFeePercentage) : null,
      source: period.source,
      reviewStatus: period.reviewStatus,
      notes: period.notes ?? '',
    })),
    clauses: lease.clauses.map(c => ({
      id: c.id,
      title: c.title,
      content: c.content,
    })),
    documents: lease.documents.map(d => ({
      id: d.id,
      name: d.name,
      url: d.url,
      type: d.type,
    })),
    iptu: lease.iptu ? {
      inscription: lease.iptu.inscription ?? '',
      sequentialNumber: lease.iptu.sequentialNumber ?? '',
      bookletHolder: lease.iptu.bookletHolder ?? '',
      responsibleParty: lease.iptu.responsibleParty ?? '',
      lastCheckedDate: lease.iptu.lastCheckedDate ? lease.iptu.lastCheckedDate.toISOString().slice(0, 10) : '',
      amount: lease.iptu.amount ? Number(lease.iptu.amount) : null,
      paymentStartDate: lease.iptu.paymentStartDate
        ? lease.iptu.paymentStartDate.toISOString().slice(0, 10)
        : '',
      installments: lease.iptu.installments ?? '',
      attachments: parseLeaseAttachments(lease.iptu.documentUrl),
    } : null,
    utilities: lease.utilities.map(u => ({
      type: u.type,
      identification: u.identification ?? '',
      lastCheckedDate: u.lastCheckedDate ? u.lastCheckedDate.toISOString().slice(0, 10) : '',
      observation: u.observation ?? '',
      attachments: parseLeaseAttachments(u.documentUrl),
    })),
    condominium: lease.condominium ? {
      amount: lease.condominium.amount ? Number(lease.condominium.amount) : null,
      condoName: lease.condominium.condoName ?? '',
      adminName: lease.condominium.adminName ?? '',
      adminPhone: lease.condominium.adminPhone ?? '',
      adminEmail: lease.condominium.adminEmail ?? '',
      adminWebsite: lease.condominium.adminWebsite ?? '',
      syndicName: lease.condominium.syndicName ?? '',
      syndicPhone: lease.condominium.syndicPhone ?? '',
      responsibleParty: lease.condominium.responsibleParty ?? '',
      lastCheckedDate: lease.condominium.lastCheckedDate ? lease.condominium.lastCheckedDate.toISOString().slice(0, 10) : '',
      attachments: parseLeaseAttachments(lease.condominium.documentUrl),
    } : null,
  }
}
