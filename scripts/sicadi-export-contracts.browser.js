/*
 * Exportador local de contratos do SICADI Web.
 *
 * Como executar:
 * 1. Abra a lista "Meus contratos" já autenticada no SICADI.
 * 2. Abra o DevTools (F12), acesse "Console" e cole este arquivo inteiro.
 * 3. Aguarde o download de sicadi-contratos-AAAA-MM-DD.json e .csv.
 *
 * O script usa somente a sessão já aberta, não lê nem exporta cookies e para
 * diante de login, CAPTCHA, HTTP 403 ou HTTP 429.
 */

(async () => {
  "use strict";

  const EXPECTED_HOST = "locacao.sicadiweb.com.br";
  const PAGE_SIZE = 10;
  const REQUEST_INTERVAL_MS = 1500;
  const MAX_PAGES = 200;

  if (window.location.hostname !== EXPECTED_HOST) {
    throw new Error(`Abra o SICADI Web (${EXPECTED_HOST}) antes de executar.`);
  }

  if (!window.location.pathname.includes("/cl/meus-contratos")) {
    throw new Error('Abra a página "Meus contratos" antes de executar.');
  }

  const sleep = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();

  const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

  function findContractContainers(root) {
    const candidates = Array.from(root.querySelectorAll("article, li, tr, div"))
      .filter((element) => {
        const text = normalizeText(element.textContent);
        return (
          /Contrato:\s*[0-9]+/i.test(text) &&
          /Locat[aá]rio:/i.test(text) &&
          /Locador:/i.test(text)
        );
      });

    // Mantém o menor contêiner que reúne os dados do contrato. Isso evita
    // capturar também os contêineres pais da lista inteira.
    return candidates.filter(
      (candidate) =>
        !candidates.some(
          (other) => other !== candidate && candidate.contains(other),
        ),
    );
  }

  function parsePersonLine(text, labelPattern) {
    const match = text.match(
      new RegExp(
        `${labelPattern}:\\s*(.+?)(?:\\s*-\\s*CPF:\\s*([0-9.\\/-]+))?(?:\\n|$)`,
        "i",
      ),
    );

    return {
      nome: normalizeText(match?.[1] ?? ""),
      cpfCnpj: onlyDigits(match?.[2] ?? ""),
    };
  }

  function parseContract(container, pageUrl) {
    const text = normalizeText(container.textContent);
    const codeMatch = text.match(/Contrato:\s*([0-9]+)/i);
    const tenant = parsePersonLine(text, "Locat[aá]rio");
    const landlord = parsePersonLine(text, "Locador");

    const reservedLabels = /^(Contrato|Locat[aá]rio|Locador):/i;
    const propertyLine =
      text
        .split("\n")
        .map(normalizeText)
        .find(
          (line) =>
            line.includes(":") &&
            !reservedLabels.test(line) &&
            !/^CPF:/i.test(line),
        ) ?? "";
    const propertySeparator = propertyLine.indexOf(":");

    const links = Array.from(container.querySelectorAll("a[href]"))
      .map((anchor) => ({
        url: new URL(anchor.getAttribute("href"), pageUrl).href,
        titulo: normalizeText(
          anchor.getAttribute("aria-label") ||
            anchor.getAttribute("title") ||
            anchor.textContent,
        ),
      }))
      .filter(
        (link, index, all) =>
          all.findIndex((candidate) => candidate.url === link.url) === index,
      );

    return {
      codigoContrato: codeMatch?.[1] ?? "",
      locatario: tenant,
      locador: landlord,
      imovel: {
        tipo:
          propertySeparator >= 0
            ? normalizeText(propertyLine.slice(0, propertySeparator))
            : "",
        endereco:
          propertySeparator >= 0
            ? normalizeText(propertyLine.slice(propertySeparator + 1))
            : propertyLine,
      },
      links,
      paginaOrigem: pageUrl,
      textoOriginal: text,
    };
  }

  function detectTotal(root) {
    const text = normalizeText(root.body?.textContent ?? root.textContent);
    const match = text.match(/([0-9]+)\s+contratos?\s+encontrados?/i);
    return match ? Number(match[1]) : null;
  }

  function pageLooksBlocked(root, responseUrl) {
    const text = normalizeText(root.body?.textContent ?? root.textContent);
    const redirectedToLogin =
      /login|entrar|autentica/i.test(new URL(responseUrl).pathname);
    const challenge =
      /captcha|acesso negado|muitas requisi[cç][oõ]es|rate limit/i.test(text);
    return redirectedToLogin || challenge;
  }

  function escapeCsv(value) {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value ?? "");
    return `"${serialized.replace(/"/g, '""')}"`;
  }

  function download(filename, content, type) {
    const blob = new Blob(["\ufeff", content], { type });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  const initialUrl = new URL(window.location.href);
  initialUrl.searchParams.set("limit", String(PAGE_SIZE));
  initialUrl.searchParams.set("offset", "0");

  const contractsByCode = new Map();
  let expectedTotal = null;

  console.info("[SICADI] Iniciando exportação local dos contratos.");

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const pageUrl = new URL(initialUrl);
    pageUrl.searchParams.set("offset", String(pageIndex * PAGE_SIZE));

    const response = await fetch(pageUrl, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml" },
    });

    if (response.status === 403 || response.status === 429) {
      throw new Error(
        `[SICADI] Exportação interrompida com HTTP ${response.status}. Nenhuma nova tentativa foi feita.`,
      );
    }
    if (!response.ok) {
      throw new Error(
        `[SICADI] Exportação interrompida com HTTP ${response.status}.`,
      );
    }

    const html = await response.text();
    const parsedPage = new DOMParser().parseFromString(html, "text/html");

    if (pageLooksBlocked(parsedPage, response.url)) {
      throw new Error(
        "[SICADI] A sessão expirou ou a página solicitou verificação. Faça login e tente novamente mais tarde.",
      );
    }

    expectedTotal ??= detectTotal(parsedPage);
    const containers = findContractContainers(parsedPage);
    const pageContracts = containers
      .map((container) => parseContract(container, response.url))
      .filter((contract) => contract.codigoContrato);

    if (pageContracts.length === 0) {
      if (pageIndex === 0) {
        throw new Error(
          "[SICADI] Nenhum contrato foi reconhecido. O layout pode ter mudado.",
        );
      }
      break;
    }

    for (const contract of pageContracts) {
      contractsByCode.set(contract.codigoContrato, contract);
    }

    console.info(
      `[SICADI] Página ${pageIndex + 1}: ${pageContracts.length} contratos; ${contractsByCode.size} únicos.`,
    );

    if (
      (expectedTotal !== null && contractsByCode.size >= expectedTotal) ||
      pageContracts.length < PAGE_SIZE
    ) {
      break;
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  const contracts = Array.from(contractsByCode.values()).sort((left, right) =>
    left.codigoContrato.localeCompare(right.codigoContrato, "pt-BR", {
      numeric: true,
    }),
  );

  if (contracts.length === 0) {
    throw new Error("[SICADI] A exportação terminou sem contratos.");
  }

  const exportedAt = new Date();
  const datePart = exportedAt.toISOString().slice(0, 10);
  const result = {
    fonte: "SICADI_WEB",
    pagina: window.location.href,
    exportadoEm: exportedAt.toISOString(),
    totalInformadoPeloSicadi: expectedTotal,
    totalExportado: contracts.length,
    contratos: contracts,
  };

  const csvHeader = [
    "codigoContrato",
    "locatarioNome",
    "locatarioCpfCnpj",
    "locadorNome",
    "locadorCpfCnpj",
    "tipoImovel",
    "enderecoImovel",
    "links",
  ];
  const csvRows = contracts.map((contract) =>
    [
      contract.codigoContrato,
      contract.locatario.nome,
      contract.locatario.cpfCnpj,
      contract.locador.nome,
      contract.locador.cpfCnpj,
      contract.imovel.tipo,
      contract.imovel.endereco,
      contract.links,
    ]
      .map(escapeCsv)
      .join(";"),
  );

  download(
    `sicadi-contratos-${datePart}.json`,
    JSON.stringify(result, null, 2),
    "application/json;charset=utf-8",
  );
  download(
    `sicadi-contratos-${datePart}.csv`,
    [csvHeader.map(escapeCsv).join(";"), ...csvRows].join("\r\n"),
    "text/csv;charset=utf-8",
  );

  console.info(
    `[SICADI] Concluído: ${contracts.length} contratos exportados em JSON e CSV.`,
  );
})();
