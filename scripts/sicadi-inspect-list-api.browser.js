/*
 * Descobre a chamada de API usada pela lista "Meus contratos".
 *
 * Execute como Snippet na página /cl/meus-contratos. O script observa as
 * chamadas, clica uma vez em "Buscar" e baixa um JSON técnico. Cabeçalhos de
 * autenticação são sempre ocultados e nenhum token é gravado no arquivo.
 */

(async () => {
  "use strict";

  if (
    window.location.hostname !== "locacao.sicadiweb.com.br" ||
    !window.location.pathname.includes("/cl/meus-contratos")
  ) {
    throw new Error('Abra a página "Meus contratos" antes de executar.');
  }

  const MAX_BODY_LENGTH = 2_000_000;
  const calls = [];
  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const sleep = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function redactHeaders(headers) {
    return Object.fromEntries(
      Object.entries(headers ?? {}).map(([name, value]) => [
        name,
        /authorization|token|cookie|secret|key/i.test(name)
          ? "[OCULTO]"
          : String(value),
      ]),
    );
  }

  function serializeHeaders(headers) {
    if (!headers) return {};
    if (headers instanceof Headers) return Object.fromEntries(headers.entries());
    if (Array.isArray(headers)) return Object.fromEntries(headers);
    return { ...headers };
  }

  function safeBody(value) {
    if (value === undefined || value === null) return null;
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
    return serialized.slice(0, MAX_BODY_LENGTH);
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

  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSetRequestHeader =
    XMLHttpRequest.prototype.setRequestHeader;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  window.fetch = async function inspectedFetch(input, init) {
    const url =
      typeof input === "string" ? input : input?.url ?? String(input);
    const response = await originalFetch.apply(this, arguments);
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (/json|text|html/i.test(contentType)) {
        calls.push({
          transport: "fetch",
          method: init?.method ?? "GET",
          url: new URL(url, window.location.href).href,
          requestHeaders: redactHeaders(serializeHeaders(init?.headers)),
          requestBody: safeBody(init?.body),
          status: response.status,
          contentType,
          responseBody: safeBody(await response.clone().text()),
        });
      }
    } catch (error) {
      calls.push({ transport: "fetch", url, error: String(error) });
    }
    return response;
  };

  XMLHttpRequest.prototype.open = function inspectedOpen(method, url) {
    this.__sicadiListInspection = {
      method: String(method ?? "GET"),
      url: new URL(String(url), window.location.href).href,
      headers: {},
    };
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function inspectedHeader(
    name,
    value,
  ) {
    if (this.__sicadiListInspection) {
      this.__sicadiListInspection.headers[String(name)] = String(value);
    }
    return originalXhrSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function inspectedSend(body) {
    const request = this.__sicadiListInspection ?? {
      method: "GET",
      url: "",
      headers: {},
    };
    this.addEventListener(
      "loadend",
      () => {
        try {
          const contentType = this.getResponseHeader("content-type") ?? "";
          if (!/json|text|html/i.test(contentType)) return;
          const responseBody =
            this.responseType === "json" ? this.response : this.responseText;
          calls.push({
            transport: "xhr",
            method: request.method,
            url: request.url,
            requestHeaders: redactHeaders(request.headers),
            requestBody: safeBody(body),
            status: this.status,
            contentType,
            responseBody: safeBody(responseBody),
          });
        } catch (error) {
          calls.push({
            transport: "xhr",
            method: request.method,
            url: request.url,
            error: String(error),
          });
        }
      },
      { once: true },
    );
    return originalXhrSend.apply(this, arguments);
  };

  try {
    const searchButton = Array.from(document.querySelectorAll("button")).find(
      (button) =>
        /^buscar$/i.test(
          normalizeText(
            button.getAttribute("label") ||
              button.getAttribute("aria-label") ||
              button.textContent,
          ),
        ),
    );
    if (!searchButton) {
      throw new Error('O botão "Buscar" não foi encontrado.');
    }

    searchButton.click();
    await sleep(5000);
  } finally {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.setRequestHeader =
      originalXhrSetRequestHeader;
    XMLHttpRequest.prototype.send = originalXhrSend;
  }

  const relevantCalls = calls.filter(
    (call) =>
      /api-router\.sicadiweb\.com\.br/i.test(call.url ?? "") &&
      !/renovarAcesso|indicereajuste/i.test(call.url ?? ""),
  );

  downloadJson("sicadi-inspecao-api-lista.json", {
    fonte: "SICADI_WEB",
    inspecionadoEm: new Date().toISOString(),
    pagina: window.location.href,
    chamadas: relevantCalls,
  });

  console.info(
    `[SICADI] Inspeção da lista concluída: ${relevantCalls.length} chamadas relevantes.`,
  );
})();
