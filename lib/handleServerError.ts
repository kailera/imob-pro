/**
 * Helper para verificar e tratar erros de Server Action desatualizada (Build mismatch)
 */
export function isServerActionMismatchError(error: any): boolean {
  const msg = String(error?.message || error || "");
  return (
    msg.includes("was not found on the server") ||
    msg.includes("failed-to-find-server-action") ||
    (msg.includes("Server Action") && msg.includes("not found"))
  );
}

export function handleActionError(
  error: any,
  fallbackTitle: string = "Erro ao executar ação"
) {
  if (isServerActionMismatchError(error)) {
    alert("O sistema foi atualizado para uma nova versão. A página será atualizada agora.");
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return;
  }

  const message = error?.message || String(error || "Erro desconhecido");
  alert(`${fallbackTitle}: ${message}`);
}
