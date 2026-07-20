"use server";

import { prisma } from "@/lib/prisma";

export interface ClienteRecord {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  perfil: "Proprietário" | "Inquilino" | "Fiador" | "Comprador";
  detalhes?: string;
}

function fixEncoding(str: string): string {
  if (!str) return "";
  return str
    .replace(/C´┐¢sar/g, "César")
    .replace(/Jo´┐¢o/g, "João")
    .replace(/Vin´┐¢cius/g, "Vinícius")
    .replace(/Gon´┐¢alves/g, "Gonçalves")
    .replace(/In´┐¢s/g, "Inês")
    .replace(/Ant´┐¢nio/g, "Antônio")
    .replace(/An´┐¢sia/g, "Anésia")
    .replace(/ARA´┐¢JO/g, "ARAÚJO")
    .replace(/´┐¢/g, "")
    .trim();
}

function formatPhone(val: any): string {
  if (!val) return "-";
  if (typeof val === "string") return val.trim() || "-";
  if (Array.isArray(val)) {
    const list = val
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && item.numero) return item.numero;
        return "";
      })
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : "-";
  }
  if (typeof val === "object" && val !== null) {
    if (val.telefone) return String(val.telefone);
    if (val.numero) return String(val.numero);
  }
  return "-";
}

export async function getClientes() {
  try {
    const clientes: ClienteRecord[] = [];

    // 1. Buscar Locadores (Proprietários)
    const locadores = await prisma.locador.findMany({
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
        imovelLocacao: {
          select: {
            imovel: {
              select: {
                codigo: true,
                bairro: true,
              },
            },
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    const uniqueLocadores = new Map<string, ClienteRecord>();
    for (const loc of locadores) {
      const cleanNome = fixEncoding(loc.nome);
      if (!cleanNome) continue;
      const key = (cleanNome + "_" + (loc.cpfCnpj || "")).toLowerCase();
      
      if (!uniqueLocadores.has(key)) {
        const codigoImovel = loc.imovelLocacao?.imovel?.codigo;
        uniqueLocadores.set(key, {
          id: loc.id,
          nome: cleanNome,
          documento: loc.cpfCnpj || "-",
          telefone: formatPhone(loc.telefone),
          email: loc.email || "-",
          perfil: "Proprietário",
          detalhes: codigoImovel ? `Imóvel ${codigoImovel}` : undefined,
        });
      }
    }
    clientes.push(...Array.from(uniqueLocadores.values()));

    // 2. Buscar Locatários (Inquilinos)
    const locatarios = await prisma.locatario.findMany({
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
      },
      orderBy: { nome: "asc" },
    });

    const uniqueLocatarios = new Map<string, ClienteRecord>();
    for (const loc of locatarios) {
      const cleanNome = fixEncoding(loc.nome);
      if (!cleanNome) continue;
      const key = (cleanNome + "_" + (loc.cpfCnpj || "")).toLowerCase();

      if (!uniqueLocatarios.has(key)) {
        uniqueLocatarios.set(key, {
          id: loc.id,
          nome: cleanNome,
          documento: loc.cpfCnpj || "-",
          telefone: formatPhone(loc.telefone),
          email: loc.email || "-",
          perfil: "Inquilino",
        });
      }
    }
    clientes.push(...Array.from(uniqueLocatarios.values()));

    // 3. Buscar Fiadores
    const fiadores = await prisma.fiador.findMany({
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
      },
      orderBy: { nome: "asc" },
    });

    const uniqueFiadores = new Map<string, ClienteRecord>();
    for (const f of fiadores) {
      const cleanNome = fixEncoding(f.nome);
      if (!cleanNome) continue;
      const key = (cleanNome + "_" + (f.cpfCnpj || "")).toLowerCase();

      if (!uniqueFiadores.has(key)) {
        uniqueFiadores.set(key, {
          id: f.id,
          nome: cleanNome,
          documento: f.cpfCnpj || "-",
          telefone: formatPhone(f.telefone),
          email: f.email || "-",
          perfil: "Fiador",
        });
      }
    }
    clientes.push(...Array.from(uniqueFiadores.values()));

    // 4. Buscar Leads (Compradores / Interessados)
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
      },
      orderBy: { nome: "asc" },
    });

    for (const l of leads) {
      const cleanNome = fixEncoding(l.nome);
      if (!cleanNome) continue;
      clientes.push({
        id: l.id,
        nome: cleanNome,
        documento: "-",
        telefone: formatPhone(l.telefone),
        email: l.email || "-",
        perfil: "Comprador",
      });
    }

    return { success: true, data: clientes };
  } catch (error: any) {
    console.error("Erro ao carregar clientes do banco:", error);
    return { success: false, error: error.message || "Erro ao carregar clientes." };
  }
}
