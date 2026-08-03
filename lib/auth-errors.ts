export function isAuthenticationError(message?: string | null) {
  const normalized = message?.trim().toLocaleLowerCase("pt-BR") || "";
  return normalized === "não autorizado." || normalized === "não autenticado.";
}
