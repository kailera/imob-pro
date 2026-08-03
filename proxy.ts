import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  isAdminHost,
  isInterWebhookHost,
  isPublicHost,
  isPublicSitePath,
  normalizeHostname,
} from "@/lib/host-routing";

const isPublicRoute = createRouteMatcher([
  "/",
  "/busca(.*)",
  "/loteamentos(.*)",
  "/vistorias/acesso(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/inter(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.json",
  "/favicon.ico",
  "/sw.js",
]);

// Mantém compatibilidade apenas com o link público legado
// `/vistorias/<token>`. Rotas administrativas mais profundas, como
// `/vistorias/ficha-vistoria/<id>`, precisam obrigatoriamente de sessão.
function isLegacyPublicInspection(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "vistorias";
}

export default clerkMiddleware(async (auth, request) => {
  const hostname = normalizeHostname(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.hostname,
  );
  const pathname = request.nextUrl.pathname;

  // O endpoint bancário possui hostname dedicado e não pode cair no bloqueio
  // de domínios desconhecidos.
  if (isInterWebhookHost(hostname)) {
    if (pathname === "/api/webhooks/inter") return;
    return new Response("Not Found", { status: 404 });
  }

  // O domínio público expõe somente a vitrine e acessos públicos de vistoria.
  if (isPublicHost(hostname)) {
    if (isPublicSitePath(pathname)) return;
    return new Response("Not Found", { status: 404 });
  }

  // Domínio administrativo
  if (isAdminHost(hostname)) {
    // Login, webhooks e links públicos de vistoria não podem exigir uma
    // sessão; proteger o próprio /sign-in cria um redirecionamento infinito.
    if (isPublicRoute(request) || isLegacyPublicInspection(pathname)) {
      return;
    }

    await auth.protect();
    return;
  }

  // Nenhum hostname não cadastrado pode alcançar a aplicação.
  return new Response("Not Found", { status: 404 });
}, {
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
