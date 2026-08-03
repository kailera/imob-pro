import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

const ADMIN_HOST = "imobpro.euatendo.online";

const PUBLIC_HOSTS = new Set([
  "scatolinimoveis.com.br",
  "www.scatolinimoveis.com.br",
]);

const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  pathname.startsWith("/busca") ||
  pathname.startsWith("/loteamentos") ||
  pathname.startsWith("/vistoria-publica/");



// `/vistorias/ficha-vistoria/<id>`, precisam obrigatoriamente de sessão.
function isLegacyPublicInspection(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "vistorias";
}

export default clerkMiddleware(async (auth, request) => {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const pathname = request.nextUrl.pathname;

  // Domínio público tentando acessar rota administrativa
  if (PUBLIC_HOSTS.has(hostname) && !isPublicPath(pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  // Domínio desconhecido
  if (hostname !== ADMIN_HOST && !PUBLIC_HOSTS.has(hostname)) {
    return new Response("Not Found", { status: 404 });
  }

  // Domínio administrativo
  if (hostname === ADMIN_HOST) {
    // Login, webhooks e links públicos de vistoria não podem exigir uma
    // sessão; proteger o próprio /sign-in cria um redirecionamento infinito.
    if (isPublicRoute(request) || isLegacyPublicInspection(pathname)) {
      return;
    }

    const session = await auth();

    if (!session.userId) {
      return session.redirectToSignIn();
    }

    const autorizado =
      session.orgId &&
      (
        session.has({ role: "org:admin" }) ||
        session.has({ role: "org:corretor" }) ||
        session.has({ role: "org:operador" })
      );

    if (!autorizado) {
      return new Response("Not Found", { status: 404 });
    }
  }
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
