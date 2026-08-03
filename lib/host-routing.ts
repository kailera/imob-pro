const ADMIN_HOST = "imobpro.euatendo.online";
const INTER_WEBHOOK_HOST = "inter-webhook.euatendo.online";

const PUBLIC_HOSTS = new Set([
  "scatolinimoveis.com.br",
  "www.scatolinimoveis.com.br",
]);

export function normalizeHostname(value: string | null | undefined) {
  const firstHost = value?.split(",", 1)[0]?.trim().toLowerCase() ?? "";
  return firstHost.replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isAdminHost(hostname: string) {
  return hostname === ADMIN_HOST;
}

export function isPublicHost(hostname: string) {
  return PUBLIC_HOSTS.has(hostname);
}

export function isInterWebhookHost(hostname: string) {
  return hostname === INTER_WEBHOOK_HOST;
}

export function isPublicSitePath(pathname: string) {
  if (
    pathname === "/" ||
    pathname.startsWith("/busca") ||
    pathname.startsWith("/loteamentos") ||
    pathname.startsWith("/vistorias/acesso/") ||
    pathname.startsWith("/vistoria-publica/")
  ) {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "vistorias";
}
