import type { RepasseCompany, RepasseItem } from "@/lib/financeiro/repasse-types";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

const escapeHtml = (value: string | null | undefined) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleDateString("pt-BR")
  : "—";

const competenceLabel = (competence: string) => {
  const [year, month] = competence.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .toUpperCase();
};

export function printRepasseReceipt(item: RepasseItem, company: RepasseCompany) {
  const popup = window.open("", "_blank", "width=900,height=1050");
  if (!popup) throw new Error("Permita a abertura de pop-ups para imprimir o recibo.");

  const selectedDeductions = item.deductions.filter((deduction) => deduction.selected);
  const deductionRows = [
    ...selectedDeductions.map((deduction) => `
      <tr><td>${escapeHtml(deduction.description)}</td><td class="negative">− ${currency(deduction.value)}</td></tr>
    `),
    ...item.otherDeductions.map((deduction) => `
      <tr><td>${escapeHtml(deduction.description)}</td><td class="negative">− ${currency(deduction.value)}</td></tr>
    `),
  ].join("");
  const additionRows = item.otherAdditions.map((addition) => `
      <tr><td>${escapeHtml(addition.description)}</td><td class="positive">+ ${currency(addition.value)}</td></tr>
    `).join("");
  const bankDetails = [
    item.owner.bankName,
    item.owner.bankAgency ? `Ag. ${item.owner.bankAgency}` : null,
    item.owner.bankAccount ? `Conta ${item.owner.bankAccount}` : null,
    item.owner.pixKey ? `PIX: ${item.owner.pixKey}` : null,
  ].filter(Boolean).join(" · ");

  popup.document.write(`<!doctype html>
  <html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo de repasse — ${escapeHtml(item.owner.name)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #280003; font-family: Arial, Helvetica, sans-serif; background: #eeeef3; }
    .sheet { width: 100%; max-width: 794px; margin: 24px auto; background: white; padding: 42px 48px; box-shadow: 0 12px 40px rgba(40,0,3,.12); }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 3px solid #004777; }
    .logo { max-width: 180px; max-height: 76px; object-fit: contain; }
    .brand { font-size: 26px; font-weight: 800; color: #004777; }
    .company { text-align: right; color: #5f6368; font-size: 11px; line-height: 1.55; }
    h1 { margin: 30px 0 4px; font-size: 21px; text-align: center; letter-spacing: .04em; }
    .competence { text-align: center; color: #6b7280; font-weight: 700; font-size: 12px; text-transform: uppercase; }
    .info-grid { margin: 26px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .info { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
    .info.full { grid-column: 1 / -1; }
    .label { color: #6b7280; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 12px; font-weight: 700; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    th { background: #004777; color: white; padding: 11px 13px; text-align: left; }
    th:last-child, td:last-child { text-align: right; width: 170px; }
    td { padding: 11px 13px; border-bottom: 1px solid #e5e7eb; }
    .negative { color: #b42318; }
    .positive { color: #177245; }
    .net { margin-top: 18px; background: #eaf4f1; border-left: 5px solid #708d81; border-radius: 8px; padding: 17px 18px; display: flex; justify-content: space-between; align-items: center; }
    .net span { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #52665e; }
    .net strong { color: #174c3c; font-size: 24px; }
    .declaration { margin-top: 30px; font-size: 12px; line-height: 1.7; color: #4b5563; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 62px; }
    .signature { border-top: 1px solid #280003; padding-top: 8px; text-align: center; font-size: 10px; }
    footer { margin-top: 44px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 9px; text-align: center; }
    .actions { position: fixed; right: 22px; bottom: 22px; }
    button { border: 0; background: #004777; color: white; border-radius: 10px; padding: 12px 18px; font-weight: 700; cursor: pointer; }
    @media print { body { background: white; } .sheet { margin: 0; box-shadow: none; padding: 24px 30px; } .actions { display: none; } }
  </style></head><body>
    <main class="sheet">
      <header>
        <div>${company.logoUrl ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)}">` : `<div class="brand">${escapeHtml(company.name)}</div>`}</div>
        <div class="company"><strong>${escapeHtml(company.legalName || company.name)}</strong><br>${company.cnpj ? `CNPJ ${escapeHtml(company.cnpj)}<br>` : ""}${company.creci ? `CRECI ${escapeHtml(company.creci)}<br>` : ""}${escapeHtml(company.address)}${company.phone ? `<br>${escapeHtml(company.phone)}` : ""}${company.email ? ` · ${escapeHtml(company.email)}` : ""}</div>
      </header>
      <h1>DEMONSTRATIVO DE REPASSE AO PROPRIETÁRIO</h1>
      <div class="competence">Competência ${escapeHtml(competenceLabel(item.competence))}</div>
      <section class="info-grid">
        <div class="info"><div class="label">Proprietário</div><div class="value">${escapeHtml(item.owner.name)}<br>${escapeHtml(item.owner.cpfCnpj || "Documento não informado")}</div></div>
        <div class="info"><div class="label">Dados para transferência</div><div class="value">${escapeHtml(bankDetails || "Dados bancários não informados")}</div></div>
        <div class="info full"><div class="label">Imóvel / contrato</div><div class="value">${escapeHtml(item.propertyCode)} — ${escapeHtml(item.propertyTitle)}<br>${escapeHtml(item.propertyAddress)}<br>Contrato ${escapeHtml(item.contractCode)}${item.tenantNames.length ? ` · Locatário: ${escapeHtml(item.tenantNames.join(", "))}` : ""}</div></div>
      </section>
      <table><thead><tr><th>Descrição</th><th>Valor</th></tr></thead><tbody>
        <tr><td>Aluguel / valor bruto recebido</td><td>${currency(item.grossValue)}</td></tr>
        ${additionRows}
        <tr><td>Taxa de administração (${item.adminFeePercent.toLocaleString("pt-BR")}% sobre ${currency(item.rentValue)})</td><td class="negative">− ${currency(item.adminFeeValue)}</td></tr>
        ${deductionRows || `<tr><td>Manutenções e outros descontos</td><td>${currency(0)}</td></tr>`}
      </tbody></table>
      <div class="net"><span>Total líquido do proprietário</span><strong>${currency(item.netValue)}</strong></div>
      <p class="declaration">${item.status === "PAGO" ? `Declaro o recebimento do valor líquido acima em ${formatDate(item.paidAt)}, referente ao repasse da competência indicada.` : `Demonstrativo preparado para conferência. Recebimento do aluguel: ${formatDate(item.receivedAt)}. Previsão de repasse: ${formatDate(item.transferDueDate)}.`}</p>
      <section class="signatures"><div class="signature">${escapeHtml(company.name)}<br>Administradora</div><div class="signature">${escapeHtml(item.owner.name)}<br>Proprietário(a)</div></section>
      <footer>Documento gerado eletronicamente em ${new Date().toLocaleString("pt-BR")} · Referência ${escapeHtml(item.repasseId || item.key)}</footer>
    </main>
    <div class="actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  </body></html>`);
  popup.document.close();
  popup.focus();
}
