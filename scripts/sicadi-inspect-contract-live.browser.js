/*
 * Diagnóstico ao vivo de um contrato do SICADI Web (Angular).
 *
 * Execute como Snippet do Chrome DevTools na página "Meus contratos".
 * O script abre "Controles contratuais" do PRIMEIRO contrato, visita somente
 * Imóvel, Identificação e Controle locatício e baixa um JSON com os campos e
 * as chamadas de consulta observadas. Não envia formulários nem salva dados.
 */

(async () => {
  "use strict";

  const EXPECTED_HOST = "locacao.sicadiweb.com.br";
  const TARGET_SECTIONS = [
    { key: "imovel", pattern: /^\s*im[oó]vel\s*$/i },
    { key: "identificacao", pattern: /identifica[cç][aã]o/i },
    { key: "controleLocaticio", pattern: /controle\s+locat[ií]cio/i },
  ];
  const MAX_RESPONSE_LENGTH = 1_000_000;

  if (window.location.hostname !== EXPECTED_HOST) {
    throw new Error(`Abra o SICADI Web (${EXPECTED_HOST}) antes de executar.`);
  }

  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();

  const sleep = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function attributesOf(element) {
    return Object.fromEntries(
      Array.from(element.attributes ?? []).map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
    );
  }

  function controlText(element) {
    return normalizeText(
      element.getAttribute?.("aria-label") ||
        element.getAttribute?.("ptooltip") ||
        element.getAttribute?.("title") ||
        element.textContent,
    );
  }

  function findContractContainers() {
    const candidates = Array.from(
      document.querySelectorAll("article, li, tr, div"),
    ).filter((element) => {
      const text = normalizeText(element.textContent);
      return (
        /Contrato:\s*[0-9]+/i.test(text) &&
        /Locat[aá]rio:/i.test(text) &&
        /Locador:/i.test(text)
      );
    });

    return candidates.filter(
      (candidate) =>
        !candidates.some(
          (other) => other !== candidate && candidate.contains(other),
        ),
    );
  }

  function findControl(root, pattern) {
    return Array.from(
      root.querySelectorAll(
        "a, button, [role='button'], [role='menuitem'], li, .p-menuitem-link",
      ),
    ).find((element) => pattern.test(controlText(element)));
  }

  function collectFields() {
    return Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((field) => {
        const type = String(field.getAttribute("type") ?? "").toLowerCase();
        return !["hidden", "password", "submit", "button"].includes(type);
      })
      .map((field) => {
        const id = field.getAttribute("id");
        const label = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
          : field.closest("label");
        return {
          tag: field.tagName.toLowerCase(),
          type: field.getAttribute("type"),
          id,
          name: field.getAttribute("name"),
          label: normalizeText(label?.textContent),
          value: field.value ?? field.getAttribute("value") ?? "",
          selectedText:
            field.tagName === "SELECT"
              ? normalizeText(field.selectedOptions?.[0]?.textContent)
              : null,
          checked:
            typeof field.checked === "boolean" ? field.checked : undefined,
          disabled: Boolean(field.disabled),
          readonly: Boolean(field.readOnly),
        };
      });
  }

  function collectTables() {
    return Array.from(document.querySelectorAll("table")).map((table) =>
      Array.from(table.querySelectorAll("tr"))
        .map((row) =>
          Array.from(row.querySelectorAll("th, td")).map((cell) =>
            normalizeText(cell.textContent),
          ),
        )
        .filter((row) => row.some(Boolean)),
    );
  }

  function capturePage() {
    return {
      url: window.location.href,
      titulo: normalizeText(document.title),
      campos: collectFields(),
      tabelas: collectTables(),
      controles: Array.from(
        document.querySelectorAll(
          "a, button, [role='button'], [role='menuitem'], .p-menuitem-link",
        ),
      )
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          texto: controlText(element),
          atributos: attributesOf(element),
        }))
        .filter((control) => control.texto)
        .slice(0, 500),
      texto: normalizeText(document.body?.innerText).slice(0, 100_000),
    };
  }

  async function waitForChange(previousUrl, previousText, timeoutMs = 15_000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      await sleep(250);
      const currentText = normalizeText(document.body?.innerText);
      if (
        window.location.href !== previousUrl ||
        currentText !== previousText
      ) {
        await sleep(1500);
        return;
      }
    }
    await sleep(1000);
  }

  function safeResponseBody(value) {
    let serialized;
    if (typeof value === "string") {
      serialized = value;
    } else {
      try {
        serialized = JSON.stringify(value);
      } catch {
        serialized = String(value);
      }
    }
    return serialized.slice(0, MAX_RESPONSE_LENGTH);
  }

  function downloadJson(filename, value) {
    const blob = new Blob(
      ["\ufeff", JSON.stringify(value, null, 2)],
      { type: "application/json;charset=utf-8" },
    );
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  const network = [];
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  window.fetch = async function inspectedFetch(input, init) {
    const method = init?.method ?? "GET";
    const url =
      typeof input === "string" ? input : input?.url ?? String(input);
    const response = await originalFetch.apply(this, arguments);
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (/json|text|html/i.test(contentType)) {
        const body = await response.clone().text();
        network.push({
          transport: "fetch",
          method,
          url: new URL(url, window.location.href).href,
          status: response.status,
          contentType,
          body: safeResponseBody(body),
        });
      }
    } catch (error) {
      network.push({
        transport: "fetch",
        method,
        url,
        captureError: String(error),
      });
    }
    return response;
  };

  XMLHttpRequest.prototype.open = function inspectedOpen(method, url) {
    this.__sicadiInspection = {
      method: String(method ?? "GET"),
      url: new URL(String(url), window.location.href).href,
    };
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function inspectedSend() {
    this.addEventListener(
      "loadend",
      () => {
        try {
          const contentType = this.getResponseHeader("content-type") ?? "";
          if (!/json|text|html/i.test(contentType)) return;
          const responseBody =
            this.responseType === "json" ? this.response : this.responseText;
          network.push({
            transport: "xhr",
            method: this.__sicadiInspection?.method ?? "GET",
            url: this.__sicadiInspection?.url ?? "",
            status: this.status,
            contentType,
            body: safeResponseBody(responseBody),
          });
        } catch (error) {
          network.push({
            transport: "xhr",
            method: this.__sicadiInspection?.method ?? "GET",
            url: this.__sicadiInspection?.url ?? "",
            captureError: String(error),
          });
        }
      },
      { once: true },
    );
    return originalXhrSend.apply(this, arguments);
  };

  const originalPage = window.location.href;
  const firstContract = findContractContainers()[0];
  if (!firstContract) {
    throw new Error("Nenhum contrato foi reconhecido na página atual.");
  }

  const contractText = normalizeText(firstContract.textContent);
  const code = contractText.match(/Contrato:\s*([0-9]+)/i)?.[1] ?? "sem-codigo";
  const contractControl = findControl(
    firstContract,
    /controles\s+contratuais/i,
  );
  if (!contractControl) {
    throw new Error(
      'O botão "Controles contratuais" não foi encontrado no primeiro contrato.',
    );
  }

  const result = {
    fonte: "SICADI_WEB",
    inspecionadoEm: new Date().toISOString(),
    contrato: code,
    paginaLista: originalPage,
    cartaoContrato: contractText,
    paginaControlesContratuais: null,
    secoes: {},
    rede: network,
    observacoes: [],
  };

  try {
    let previousUrl = window.location.href;
    let previousText = normalizeText(document.body?.innerText);
    contractControl.click();
    await waitForChange(previousUrl, previousText);
    result.paginaControlesContratuais = capturePage();

    for (const section of TARGET_SECTIONS) {
      const control = findControl(document, section.pattern);
      if (!control) {
        result.secoes[section.key] = {
          encontrada: false,
          motivo: "Controle de navegação não encontrado.",
        };
        continue;
      }

      previousUrl = window.location.href;
      previousText = normalizeText(document.body?.innerText);
      control.click();
      await waitForChange(previousUrl, previousText);
      result.secoes[section.key] = {
        encontrada: true,
        pagina: capturePage(),
        chamadasDeRedeAteAqui: network.length,
      };
    }
  } finally {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;
  }

  downloadJson(`sicadi-inspecao-completa-${code}.json`, result);
  console.info(
    `[SICADI] Inspeção completa do contrato ${code}. Envie o JSON baixado.`,
  );
})();
