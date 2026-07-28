import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import type {
  SicadiCollectedContract,
  SicadiCollection,
} from "../lib/locacao/sicadi-import.js";

type ApplyContract = {
  sicadiCode: string;
  status: string;
  leaseId?: string;
};

type ApplyReport = {
  mode: string;
  contracts: ApplyContract[];
};

type AddressValue = {
  logradouro: string;
  numero: number;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: number;
};

type AddressReportItem = {
  sicadiCode: string;
  leaseId: string;
  propertyId?: string;
  status:
    | "READY"
    | "UNCHANGED"
    | "CONFLICT"
    | "NO_PROPERTY"
    | "INVALID_SOURCE"
    | "DUPLICATE_PROPERTY_CONFLICT";
  current?: Record<string, unknown>;
  source?: AddressValue;
  changedFields?: Array<keyof AddressValue>;
  reason?: string;
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseJsonFile<T>(fileName: string): T {
  return JSON.parse(
    fs.readFileSync(path.resolve(fileName), "utf8").replace(/^\uFEFF/, ""),
  ) as T;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function isPlaceholder(field: keyof AddressValue, value: unknown): boolean {
  const text = normalize(value);
  if (field === "numero" || field === "cep") {
    return !Number.isInteger(Number(value)) || Number(value) <= 0;
  }
  if (field === "complemento") return !text;
  if (!text) return true;
  if (field === "logradouro") {
    return ["rua nao informada", "endereco nao informado"].includes(text);
  }
  if (field === "bairro") {
    return ["importado via csv", "nao informado", "indefinido"].includes(text);
  }
  if (field === "cidade") {
    return ["indefinida", "nao informada", "nao informado"].includes(text);
  }
  return false;
}

function same(field: keyof AddressValue, left: unknown, right: unknown): boolean {
  if (field === "numero" || field === "cep") {
    return Number(left) === Number(right);
  }
  return normalize(left) === normalize(right);
}

function parseSourceAddress(
  collected: SicadiCollectedContract,
): { address?: AddressValue; reason?: string } {
  const source = collected.contrato?.imovel?.endereco;
  if (!source) return { reason: "Endereço do imóvel ausente no SICADI." };

  const rawNumber = String(source.numero ?? "").trim();
  const numberMatch = /^(\d+)(?:\s*[-/]\s*(.+))?$/.exec(rawNumber);
  const cepDigits = String(source.cep ?? "").replace(/\D/g, "");
  const logradouro = String(source.logradouro ?? "").trim();
  const bairro = String(source.bairro ?? "").trim();
  const cidade = String(source.municipio ?? "").trim();
  const uf = String(source.uf ?? "").trim().toUpperCase();

  if (
    !numberMatch ||
    !logradouro ||
    !bairro ||
    !cidade ||
    !/^[A-Z]{2}$/.test(uf) ||
    !/^\d{8}$/.test(cepDigits)
  ) {
    return {
      reason: `Endereço SICADI incompleto ou inválido: ${JSON.stringify(source)}.`,
    };
  }

  const numberSuffix = numberMatch[2]?.trim();
  const sourceComplement = String(source.complemento ?? "").trim();
  const complemento = [numberSuffix, sourceComplement]
    .filter(Boolean)
    .join(", ") || null;

  return {
    address: {
      logradouro,
      numero: Number(numberMatch[1]),
      complemento,
      bairro,
      cidade,
      uf,
      cep: Number(cepDigits),
    },
  };
}

async function main() {
  const sourceFile = argument("--file");
  const applyReportFile = argument("--apply-report");
  const outputFile =
    argument("--report") || "sicadi-property-addresses-dry-run.json";
  const apply = process.argv.includes("--apply");

  if (!sourceFile || !applyReportFile) {
    throw new Error(
      "Use --file <coleta.json> --apply-report <relatorio.json> [--apply] [--report <arquivo.json>].",
    );
  }
  if (
    apply &&
    process.env.SICADI_ADDRESS_IMPORT_CONFIRM !==
      "ATUALIZAR_ENDERECOS_SICADI_REVISADOS"
  ) {
    throw new Error(
      "Para aplicar, defina SICADI_ADDRESS_IMPORT_CONFIRM=ATUALIZAR_ENDERECOS_SICADI_REVISADOS.",
    );
  }

  const collection = parseJsonFile<SicadiCollection>(sourceFile);
  const applyReport = parseJsonFile<ApplyReport>(applyReportFile);
  if (applyReport.mode !== "APPLY") {
    throw new Error("O relatório informado não é de uma importação aplicada.");
  }

  const sourceByCode = new Map(
    collection.contratos.map((contract) => [contract.codigo, contract]),
  );
  const imported = applyReport.contracts.filter(
    (contract) => contract.status === "READY" && contract.leaseId,
  );

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const items: AddressReportItem[] = [];

  try {
    const leases = await prisma.lease.findMany({
      where: { id: { in: imported.map((contract) => contract.leaseId!) } },
      select: {
        id: true,
        propertyId: true,
        property: {
          select: {
            id: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true,
          },
        },
      },
    });
    const leaseById = new Map(leases.map((lease) => [lease.id, lease]));
    const candidates = new Map<
      string,
      { item: AddressReportItem; address: AddressValue }
    >();

    for (const importedContract of imported) {
      const leaseId = importedContract.leaseId!;
      const collected = sourceByCode.get(importedContract.sicadiCode);
      const lease = leaseById.get(leaseId);
      if (!collected) {
        items.push({
          sicadiCode: importedContract.sicadiCode,
          leaseId,
          status: "INVALID_SOURCE",
          reason: "Contrato não encontrado no arquivo de coleta.",
        });
        continue;
      }
      if (!lease?.property) {
        items.push({
          sicadiCode: importedContract.sicadiCode,
          leaseId,
          status: "NO_PROPERTY",
          reason: "Contrato não possui imóvel vinculado.",
        });
        continue;
      }

      const parsed = parseSourceAddress(collected);
      if (!parsed.address) {
        items.push({
          sicadiCode: importedContract.sicadiCode,
          leaseId,
          propertyId: lease.property.id,
          status: "INVALID_SOURCE",
          reason: parsed.reason,
        });
        continue;
      }

      const current = lease.property;
      const fields = Object.keys(parsed.address) as Array<keyof AddressValue>;
      const conflictingFields = fields.filter(
        (field) =>
          !isPlaceholder(field, current[field]) &&
          !same(field, current[field], parsed.address![field]),
      );
      if (conflictingFields.length > 0) {
        items.push({
          sicadiCode: importedContract.sicadiCode,
          leaseId,
          propertyId: current.id,
          status: "CONFLICT",
          current: { ...current },
          source: parsed.address,
          reason: `Campos existentes diferentes do SICADI: ${conflictingFields.join(", ")}.`,
        });
        continue;
      }

      const changedFields = fields.filter(
        (field) =>
          isPlaceholder(field, current[field]) &&
          !same(field, current[field], parsed.address![field]),
      );
      const item: AddressReportItem = {
        sicadiCode: importedContract.sicadiCode,
        leaseId,
        propertyId: current.id,
        status: changedFields.length ? "READY" : "UNCHANGED",
        current: { ...current },
        source: parsed.address,
        changedFields,
      };

      const prior = candidates.get(current.id);
      if (
        prior &&
        JSON.stringify(prior.address) !== JSON.stringify(parsed.address)
      ) {
        prior.item.status = "DUPLICATE_PROPERTY_CONFLICT";
        prior.item.reason =
          "O mesmo imóvel está ligado a contratos SICADI com endereços diferentes.";
        item.status = "DUPLICATE_PROPERTY_CONFLICT";
        item.reason = prior.item.reason;
      } else if (changedFields.length) {
        candidates.set(current.id, { item, address: parsed.address });
      }
      items.push(item);
    }

    const ready = items.filter((item) => item.status === "READY");
    if (apply) {
      await prisma.$transaction(
        ready.map((item) => {
          const candidate = candidates.get(item.propertyId!);
          const data = Object.fromEntries(
            (item.changedFields ?? []).map((field) => [
              field,
              candidate!.address[field],
            ]),
          );
          return prisma.imovel.update({
            where: { id: item.propertyId! },
            data,
          });
        }),
      );
    }

    const counts = items.reduce<Record<string, number>>((result, item) => {
      result[item.status] = (result[item.status] ?? 0) + 1;
      return result;
    }, {});
    const report = {
      mode: apply ? "APPLY" : "DRY_RUN",
      generatedAt: new Date().toISOString(),
      sourceFile: path.resolve(sourceFile),
      applyReportFile: path.resolve(applyReportFile),
      counts,
      updatedProperties: apply ? ready.length : 0,
      safety:
        "Somente campos de endereço vazios/genéricos são preenchidos. IDs, relações e vistorias não são alterados.",
      items,
    };
    fs.writeFileSync(
      path.resolve(outputFile),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
