/*
 * Coletor completo e somente leitura de contratos do SICADI Web.
 *
 * Execute como Snippet na página "Meus contratos", já autenticada.
 * O script:
 * - clica uma vez em Buscar para reutilizar a autorização somente em memória;
 * - pagina a listagem usando os filtros atuais;
 * - consulta o controle locatício de cada contrato, um por vez;
 * - baixa um JSON sanitizado, sem token, conta bancária ou documentos.
 *
 * Interrompe e salva o progresso parcial diante de 401, 403, 429, CAPTCHA,
 * expiração da sessão ou erro inesperado.
 */

(async () => {
  "use strict";

  const EXPECTED_HOST = "locacao.sicadiweb.com.br";
  const PAGE_SIZE = 10;
  const LIST_INTERVAL_MS = 750;
  const CONTRACT_INTERVAL_MS = 1500;
  const AUTH_REFRESH_INTERVAL_MS = 20_000;
  const MAX_CONTRACTS = 500;
  const CAPTURE_TIMEOUT_MS = 15_000;

  if (
    window.location.hostname !== EXPECTED_HOST ||
    !window.location.pathname.includes("/cl/meus-contratos")
  ) {
    throw new Error('Abra a página "Meus contratos" antes de executar.');
  }

  const sleep = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

  function todayPart() {
    return new Date().toISOString().slice(0, 10);
  }

  async function selectPartialFile() {
    const wantsToResume = window.confirm(
      "Deseja retomar uma coleta parcial? Clique em OK e selecione o JSON parcial. Clique em Cancelar para iniciar do zero.",
    );
    if (!wantsToResume) return null;

    return await new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.display = "none";
      document.body.appendChild(input);

      input.addEventListener(
        "change",
        async () => {
          try {
            const file = input.files?.[0];
            if (!file) {
              reject(new Error("Nenhum arquivo parcial foi selecionado."));
              return;
            }
            const parsed = JSON.parse(await file.text());
            if (
              parsed?.fonte !== "SICADI_WEB" ||
              !Array.isArray(parsed?.contratos)
            ) {
              throw new Error(
                "O arquivo selecionado não é uma coleta parcial válida do SICADI.",
              );
            }
            resolve(parsed);
          } catch (error) {
            reject(error);
          } finally {
            input.remove();
          }
        },
        { once: true },
      );

      input.click();
    });
  }

  const excludedKeys = new Set([
    "arquivoId",
    "docsDigi",
    "documentosRemovidos",
    "contaCobranca",
    "cedenteId",
    "contaId",
    "convenioId",
    "codigoBanco",
  ]);

  function sanitize(value, parentKey = "") {
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item, parentKey));
    }
    if (value && typeof value === "object") {
      const clean = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        if (excludedKeys.has(key)) continue;
        clean[key] = sanitize(nestedValue, key);
      }
      return clean;
    }
    return value;
  }

  function looksLikeChallenge(response, bodyText) {
    return (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429 ||
      /captcha|acesso negado|muitas requisi[cç][oõ]es|rate limit/i.test(
        bodyText,
      )
    );
  }

  async function fetchJson(url, authorization) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      redirect: "follow",
    });
    const bodyText = await response.text();

    if (looksLikeChallenge(response, bodyText)) {
      const error = new Error(
        `Consulta interrompida com HTTP ${response.status}; nenhuma nova tentativa foi feita.`,
      );
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(
        `Consulta interrompida com HTTP ${response.status}.`,
      );
      error.status = response.status;
      throw error;
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      throw new Error("A API retornou uma resposta que não é JSON.");
    }
  }

  function findSearchButton() {
    return Array.from(document.querySelectorAll("button")).find((button) =>
      /^buscar$/i.test(
        normalizeText(
          button.getAttribute("label") ||
            button.getAttribute("aria-label") ||
            button.textContent,
        ),
      ),
    );
  }

  async function captureListRequest() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader =
      XMLHttpRequest.prototype.setRequestHeader;
    const originalSend = XMLHttpRequest.prototype.send;

    let resolveCapture;
    let rejectCapture;
    const captured = new Promise((resolve, reject) => {
      resolveCapture = resolve;
      rejectCapture = reject;
    });

    const timeoutId = window.setTimeout(
      () =>
        rejectCapture(
          new Error("A chamada da listagem não foi observada a tempo."),
        ),
      CAPTURE_TIMEOUT_MS,
    );

    XMLHttpRequest.prototype.open = function inspectedOpen(method, url) {
      this.__sicadiCollector = {
        method: String(method ?? "GET"),
        url: new URL(String(url), window.location.href).href,
        authorization: "",
      };
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function inspectedHeader(
      name,
      value,
    ) {
      if (
        this.__sicadiCollector &&
        String(name).toLowerCase() === "authorization"
      ) {
        this.__sicadiCollector.authorization = String(value);
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function inspectedSend() {
      const request = this.__sicadiCollector;
      if (
        request?.method === "GET" &&
        /\/contrato\/crud\/find\/comPalavraChave/i.test(request.url)
      ) {
        this.addEventListener(
          "loadend",
          () => {
            try {
              const body =
                this.responseType === "json"
                  ? this.response
                  : JSON.parse(this.responseText);
              resolveCapture({
                url: request.url,
                authorization: request.authorization,
                status: this.status,
                body,
              });
            } catch (error) {
              rejectCapture(error);
            }
          },
          { once: true },
        );
      }
      return originalSend.apply(this, arguments);
    };

    try {
      const searchButton = findSearchButton();
      if (!searchButton) {
        throw new Error('O botão "Buscar" não foi encontrado.');
      }
      searchButton.click();
      return await captured;
    } finally {
      window.clearTimeout(timeoutId);
      XMLHttpRequest.prototype.open = originalOpen;
      XMLHttpRequest.prototype.setRequestHeader =
        originalSetRequestHeader;
      XMLHttpRequest.prototype.send = originalSend;
    }
  }

  const partialInput = await selectPartialFile();
  const resumedContracts = Array.isArray(partialInput?.contratos)
    ? partialInput.contratos
    : [];

  const output = {
    fonte: "SICADI_WEB",
    versaoFormato: 1,
    iniciadoEm: new Date().toISOString(),
    concluidoEm: null,
    paginaLista: window.location.href,
    filtrosApi: null,
    totalInformado: 0,
    totalColetado: 0,
    parcial: true,
    retomadoDeParcial: Boolean(partialInput),
    totalPreservadoDoParcial: resumedContracts.length,
    historicoErros: partialInput?.erros ?? [],
    erros: [],
    contratos: resumedContracts,
  };

  function saveProgress(suffix) {
    output.totalColetado = output.contratos.length;
    downloadJson(
      `sicadi-contratos-detalhados-${todayPart()}-${suffix}.json`,
      output,
    );
  }

  try {
    console.info("[SICADI] Capturando a consulta da lista...");
    const seed = await captureListRequest();

    if (seed.status !== 200) {
      throw new Error(`A busca inicial retornou HTTP ${seed.status}.`);
    }
    if (!seed.authorization) {
      throw new Error(
        "A autorização da sessão não foi encontrada. Faça login novamente.",
      );
    }
    if (!Array.isArray(seed.body?.contratos)) {
      throw new Error("A resposta da listagem não contém contratos.");
    }

    let authorization = seed.authorization;
    let authorizationCapturedAt = Date.now();

    async function ensureFreshAuthorization(force = false) {
      if (
        !force &&
        authorization &&
        Date.now() - authorizationCapturedAt < AUTH_REFRESH_INTERVAL_MS
      ) {
        return authorization;
      }

      console.info("[SICADI] Renovando a autorização da sessão...");
      const renewalUrl =
        "https://api-router.sicadiweb.com.br/" +
        "IdentidadeAcesso-0.2.0/webresources/usuarios/renovarAcesso";
      const refreshed = await fetchJson(renewalUrl, authorization);
      if (!refreshed?.jwt) {
        throw new Error("A renovação da sessão não retornou um novo JWT.");
      }

      const authorizationPrefix =
        authorization.match(/^(\S+\s+)/)?.[1] ?? "";
      authorization = `${authorizationPrefix}${refreshed.jwt}`;
      authorizationCapturedAt = Date.now();
      return authorization;
    }

    // A autorização capturada pode estar perto do vencimento. Renove uma vez
    // antes de iniciar a paginação e depois em intervalos curtos.
    await ensureFreshAuthorization(true);

    const listUrl = new URL(seed.url);
    listUrl.searchParams.set("limit", String(PAGE_SIZE));
    listUrl.searchParams.set("offset", "0");
    output.filtrosApi = Object.fromEntries(
      Array.from(listUrl.searchParams.entries()).filter(
        ([key]) => !/token|authorization/i.test(key),
      ),
    );
    output.totalInformado = Number(seed.body.total ?? 0);

    if (output.totalInformado > MAX_CONTRACTS) {
      throw new Error(
        `A lista informou ${output.totalInformado} contratos, acima do limite de segurança de ${MAX_CONTRACTS}.`,
      );
    }

    const contractsById = new Map();
    for (const contract of seed.body.contratos) {
      if (contract?.contratoId) {
        contractsById.set(contract.contratoId, contract);
      }
    }

    for (
      let offset = PAGE_SIZE;
      offset < output.totalInformado;
      offset += PAGE_SIZE
    ) {
      await sleep(LIST_INTERVAL_MS);
      const pageUrl = new URL(listUrl);
      pageUrl.searchParams.set("offset", String(offset));
      pageUrl.searchParams.set("recalcularTotal", "false");
      const page = await fetchJson(
        pageUrl.href,
        await ensureFreshAuthorization(),
      );
      if (!Array.isArray(page?.contratos)) {
        throw new Error(`A página com offset ${offset} não contém contratos.`);
      }
      for (const contract of page.contratos) {
        if (contract?.contratoId) {
          contractsById.set(contract.contratoId, contract);
        }
      }
      console.info(
        `[SICADI] Lista: ${contractsById.size}/${output.totalInformado} contratos identificados.`,
      );
    }

    const contracts = Array.from(contractsById.values()).sort((left, right) =>
      String(left.codigo ?? "").localeCompare(
        String(right.codigo ?? ""),
        "pt-BR",
        { numeric: true },
      ),
    );
    const collectedIds = new Set(
      output.contratos.map((contract) => contract.contratoId).filter(Boolean),
    );

    for (let index = 0; index < contracts.length; index += 1) {
      const listContract = contracts[index];
      if (collectedIds.has(listContract.contratoId)) {
        console.info(
          `[SICADI] Preservado do parcial: ${listContract.codigo}.`,
        );
        continue;
      }
      if (index > 0) await sleep(CONTRACT_INTERVAL_MS);

      const maintenanceUrl =
        "https://api-router.sicadiweb.com.br/Locacao/webresources/" +
        `contrato/manutencao/read/${encodeURIComponent(listContract.contratoId)}`;
      let maintenance;
      try {
        maintenance = await fetchJson(
          maintenanceUrl,
          await ensureFreshAuthorization(),
        );
      } catch (error) {
        if (error?.status === 400 || error?.status === 404) {
          output.erros.push({
            quando: new Date().toISOString(),
            codigo: listContract.codigo,
            contratoId: listContract.contratoId,
            status: error.status,
            mensagem: String(error.message ?? error),
          });
          console.warn(
            `[SICADI] Contrato ${listContract.codigo} pendente (HTTP ${error.status}); seguindo para o próximo.`,
          );
          continue;
        }
        throw error;
      }

      output.contratos.push({
        contratoId: listContract.contratoId,
        codigo: listContract.codigo,
        contrato: sanitize(maintenance.contrato ?? listContract),
        controles: sanitize(maintenance.controles ?? []),
        periodosAbertos: sanitize(maintenance.periodosAbertos ?? []),
      });
      collectedIds.add(listContract.contratoId);

      console.info(
        `[SICADI] Contratos coletados: ${output.contratos.length}/${contracts.length} — ${listContract.codigo}.`,
      );
    }

    output.concluidoEm = new Date().toISOString();
    output.totalColetado = output.contratos.length;
    output.parcial = false;
    saveProgress(
      output.erros.length > 0 ? "completo-com-pendencias" : "completo",
    );
    console.info(
      `[SICADI] Concluído: ${output.totalColetado} contratos detalhados.`,
    );
  } catch (error) {
    output.erros.push({
      quando: new Date().toISOString(),
      mensagem: String(error?.message ?? error),
    });
    saveProgress("parcial");
    console.error(
      "[SICADI] Coleta interrompida. O progresso parcial foi baixado.",
      error,
    );
    throw error;
  }
})();
