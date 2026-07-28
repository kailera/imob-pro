import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

function cleanCpfCnpj(val: string | null | undefined): string {
    if (!val) return ''
    return val.replace(/\D/g, '')
}

async function migrateLegacyToPersonLease() {
    if (process.env.MIGRATE_LEGACY_CONFIRM !== 'true') {
        throw new Error(
            'Migração bloqueada. Defina MIGRATE_LEGACY_CONFIRM=true para executá-la.'
        )
    }

    console.log('🚀 Iniciando script de migração ETL de dados legados para Person/Lease...')

    let personsCreated = 0
    let personsReused = 0
    let leasesCreated = 0
    let leasesReused = 0
    let leasePartiesCreated = 0

    // 1. Obter imobiliária padrão ou iterar sobre imobs
    const imobs = await prisma.imob.findMany()
    if (imobs.length === 0) {
        console.log('⚠️ Nenhuma imobiliária (Imob) encontrada no banco.')
        return
    }

    const mapPersonByCpf = new Map<string, string>() // key: `${imobId}:${cleanedCpf}`, value: personId

    // Carregar pessoas existentes no modelo Person
    const existingPersons = await prisma.person.findMany({
        select: { id: true, imobId: true, cpfCnpj: true }
    })
    for (const p of existingPersons) {
        const cleaned = cleanCpfCnpj(p.cpfCnpj)
        if (cleaned) {
            mapPersonByCpf.set(`${p.imobId}:${cleaned}`, p.id)
        }
    }

    // Helper para upsert/deduplicar Person
    async function getOrCreatePerson(params: {
        imobId: string
        type: 'LOCADOR' | 'LOCATARIO' | 'FIADOR'
        name: string
        cpfCnpj: string
        rg?: string | null
        issuingAgency?: string | null
        birthDateStr?: string | null
        nationality?: string | null
        profession?: string | null
        maritalStatus?: string | null
        gender?: string | null
        email?: string | null
        monthlyIncome?: number | null
        phoneJson?: any
        addressJson?: any
    }): Promise<string> {
        const cleanedCpf = cleanCpfCnpj(params.cpfCnpj)
        const key = `${params.imobId}:${cleanedCpf}`

        if (cleanedCpf && mapPersonByCpf.has(key)) {
            personsReused++
            return mapPersonByCpf.get(key)!
        }

        let birthDate: Date | null = null
        if (params.birthDateStr) {
            const d = new Date(params.birthDateStr)
            if (!isNaN(d.getTime())) birthDate = d
        }

        const person = await prisma.person.create({
            data: {
                imobId: params.imobId,
                type: params.type,
                name: params.name || 'Sem nome',
                cpfCnpj: cleanedCpf || params.cpfCnpj || '00000000000',
                rg: params.rg,
                issuingAgency: params.issuingAgency,
                birthDate,
                nationality: params.nationality,
                profession: params.profession,
                maritalStatus: params.maritalStatus,
                gender: params.gender,
                email: params.email,
                monthlyIncome: params.monthlyIncome ? params.monthlyIncome : null,
            }
        })

        personsCreated++
        if (cleanedCpf) {
            mapPersonByCpf.set(key, person.id)
        }

        // Processar Telefones JSON
        if (params.phoneJson) {
            try {
                const phonesArray = Array.isArray(params.phoneJson) ? params.phoneJson : [params.phoneJson]
                for (const item of phonesArray) {
                    const phoneNum = typeof item === 'string' ? item : item?.numero || item?.telefone || ''
                    if (phoneNum) {
                        await prisma.personPhone.create({
                            data: {
                                personId: person.id,
                                phone: phoneNum,
                                type: item?.tipo || 'CELULAR',
                                observation: item?.observacao || null
                            }
                        })
                    }
                }
            } catch (err) {
                console.warn(`Erro ao migrar telefone da pessoa ${person.id}:`, err)
            }
        }

        // Processar Endereço JSON
        if (params.addressJson && typeof params.addressJson === 'object') {
            try {
                const addr = params.addressJson
                if (addr.logradouro || addr.bairro || addr.cep) {
                    await prisma.personAddress.create({
                        data: {
                            personId: person.id,
                            cep: addr.cep || '',
                            logradouro: addr.logradouro || '',
                            numero: addr.numero || 'S/N',
                            complemento: addr.complemento || null,
                            bairro: addr.bairro || '',
                            municipio: addr.municipio || addr.cidade || '',
                            estado: addr.estado || addr.uf || ''
                        }
                    })
                }
            } catch (err) {
                console.warn(`Erro ao migrar endereço da pessoa ${person.id}:`, err)
            }
        }

        return person.id
    }

    // MAP de vinculação legada: Locador ID -> Person ID, Locatario ID -> Person ID, Fiador ID -> Person ID
    const locadorToPersonMap = new Map<string, string>()
    const locatarioToPersonMap = new Map<string, string>()
    const fiadorToPersonMap = new Map<string, string>()

    // A. Migrar Locadores
    const locadores = await prisma.locador.findMany({
        include: { imovelLocacao: { include: { imovel: true } } }
    })
    console.log(`📋 Encontrados ${locadores.length} locadores legados.`)

    for (const loc of locadores) {
        const defaultImobId = loc.imovelLocacao?.imovel?.imobId || imobs[0].id
        const personId = await getOrCreatePerson({
            imobId: defaultImobId,
            type: 'LOCADOR',
            name: loc.nome,
            cpfCnpj: loc.cpfCnpj,
            rg: loc.rg,
            issuingAgency: loc.orgaoEmissor,
            birthDateStr: loc.dataNasc,
            nationality: loc.nacionalidade,
            profession: loc.profissao,
            maritalStatus: loc.estadoCivil,
            gender: loc.genero,
            email: loc.email,
            phoneJson: loc.telefone,
            addressJson: loc.endereco
        })
        locadorToPersonMap.set(loc.id, personId)
    }

    // B. Migrar Locatários (e cônjuges)
    const locatarios = await prisma.locatario.findMany({
        include: { contrato: true }
    })
    console.log(`📋 Encontrados ${locatarios.length} locatários legados.`)

    for (const loc of locatarios) {
        const defaultImobId = loc.contrato?.imobId || imobs[0].id
        const personId = await getOrCreatePerson({
            imobId: defaultImobId,
            type: 'LOCATARIO',
            name: loc.nome,
            cpfCnpj: loc.cpfCnpj,
            rg: loc.rg,
            issuingAgency: loc.orgaoEmissor,
            birthDateStr: loc.dataNasc,
            nationality: loc.nacionalidade,
            profession: loc.profissao,
            maritalStatus: loc.estadoCivil,
            gender: loc.genero,
            email: loc.email,
            monthlyIncome: loc.rendaMensal,
            phoneJson: loc.telefone,
            addressJson: loc.endereco
        })
        locatarioToPersonMap.set(loc.id, personId)

        // Cônjuge
        if (loc.conjugeNome && loc.conjugeCpf) {
            await getOrCreatePerson({
                imobId: defaultImobId,
                type: 'LOCATARIO',
                name: loc.conjugeNome,
                cpfCnpj: loc.conjugeCpf,
                rg: loc.conjugeRg,
                issuingAgency: loc.conjugeOrgaoEmissor,
                birthDateStr: loc.conjugeDataNasc,
                nationality: loc.conjugeNacionalidade,
                profession: loc.conjugeProfissao,
                gender: undefined,
                email: loc.conjugeEmail,
                monthlyIncome: loc.conjugeRendaMensal,
                phoneJson: loc.conjugeTelefone
            })
        }
    }

    // C. Migrar Fiadores
    const fiadores = await prisma.fiador.findMany({
        include: { contrato: true }
    })
    console.log(`📋 Encontrados ${fiadores.length} fiadores legados.`)

    for (const f of fiadores) {
        const defaultImobId = f.contrato?.imobId || imobs[0].id
        const personId = await getOrCreatePerson({
            imobId: defaultImobId,
            type: 'FIADOR',
            name: f.nome,
            cpfCnpj: f.cpfCnpj,
            rg: f.rg,
            issuingAgency: f.orgaoEmissor,
            birthDateStr: f.dataNasc,
            nationality: f.nacionalidade,
            profession: f.profissao,
            maritalStatus: f.estadoCivil,
            gender: f.genero,
            email: f.email,
            phoneJson: f.telefone,
            addressJson: f.endereco
        })
        fiadorToPersonMap.set(f.id, personId)
    }

    // D. Migrar Contratos (`ContratoImovelLocacao` + `ImovelLocacao`) para `Lease`
    const contratosLegados = await prisma.contratoImovelLocacao.findMany({
        include: {
            imovelLocacao: { include: { locadors: true } },
            imovel: true,
            locatarios: true,
            fiadors: true
        }
    })
    console.log(`📋 Encontrados ${contratosLegados.length} contratos de locação legados.`)

    for (const c of contratosLegados) {
        const tenantId = c.imobId || imobs[0].id
        const startDate = c.imovelLocacao?.dataInicio || new Date()
        const endDate = c.imovelLocacao?.dataFim || new Date()

        // A chave de origem torna a operação segura para repetir: um contrato
        // legado já migrado é reutilizado, sem criar outra Lease.
        const legacySystem = 'IMOB_PRO_LEGACY'
        const leaseFromSameLegacyRecord = await prisma.lease.findUnique({
            where: {
                tenantId_legacySystem_legacyCode: {
                    tenantId,
                    legacySystem,
                    legacyCode: c.id,
                },
            },
        })
        const tenantPersonIds = c.locatarios
            .map(loc => locatarioToPersonMap.get(loc.id))
            .filter((personId): personId is string => Boolean(personId))
        const completeLeaseForSameContract = leaseFromSameLegacyRecord
            ? null
            : await prisma.lease.findFirst({
                where: {
                    tenantId,
                    propertyId: c.imovelId,
                    status: 'ACTIVE',
                    parties: {
                        some: {
                            role: 'TENANT',
                            personId: { in: tenantPersonIds },
                        },
                    },
                    termsPeriods: {
                        some: {},
                        every: { reviewStatus: 'REVIEWED' },
                    },
                },
            })
        const existingLease =
            leaseFromSameLegacyRecord ?? completeLeaseForSameContract

        const lease = existingLease ?? await prisma.lease.create({
            data: {
                tenantId,
                code: `LEGACY-${c.id}`,
                status: 'ACTIVE',
                rentalType: 'RESIDENTIAL',
                propertyId: c.imovelId,
                startDate,
                endDate,
                legacySystem,
                legacyCode: c.id,
                migratedAt: new Date(),
            }
        })

        if (existingLease) {
            leasesReused++
        } else {
            leasesCreated++
        }

        // Vincular Locatários
        for (const loc of c.locatarios) {
            const pId = locatarioToPersonMap.get(loc.id)
            if (pId) {
                await prisma.leaseParty.upsert({
                    where: {
                        leaseId_personId_role: {
                            leaseId: lease.id,
                            personId: pId,
                            role: 'TENANT'
                        }
                    },
                    create: {
                        leaseId: lease.id,
                        personId: pId,
                        role: 'TENANT',
                        isPrimary: true
                    },
                    update: {}
                })
                leasePartiesCreated++
            }
        }

        // Vincular Fiadores
        for (const f of c.fiadors) {
            const pId = fiadorToPersonMap.get(f.id)
            if (pId) {
                await prisma.leaseParty.upsert({
                    where: {
                        leaseId_personId_role: {
                            leaseId: lease.id,
                            personId: pId,
                            role: 'GUARANTOR'
                        }
                    },
                    create: {
                        leaseId: lease.id,
                        personId: pId,
                        role: 'GUARANTOR',
                        jointlyLiable: true
                    },
                    update: {}
                })
                leasePartiesCreated++
            }
        }

        // Vincular Locadores do ImovelLocacao
        if (c.imovelLocacao?.locadors) {
            for (const locador of c.imovelLocacao.locadors) {
                const pId = locadorToPersonMap.get(locador.id)
                if (pId) {
                    await prisma.leaseParty.upsert({
                        where: {
                            leaseId_personId_role: {
                                leaseId: lease.id,
                                personId: pId,
                                role: 'LANDLORD'
                            }
                        },
                        create: {
                            leaseId: lease.id,
                            personId: pId,
                            role: 'LANDLORD'
                        },
                        update: {}
                    })
                    leasePartiesCreated++
                }
            }
        }
    }

    console.log('\n✅ Migração de Dados Concluída com Sucesso!')
    console.log(`- Pessoas criadas: ${personsCreated}`)
    console.log(`- Pessoas reaproveitadas (deduplicadas): ${personsReused}`)
    console.log(`- Contratos Lease criados: ${leasesCreated}`)
    console.log(`- Contratos Lease já existentes: ${leasesReused}`)
    console.log(`- Vínculos LeaseParty criados: ${leasePartiesCreated}`)
}

migrateLegacyToPersonLease()
    .catch((err) => {
        console.error('❌ Erro durante a migração:', err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
