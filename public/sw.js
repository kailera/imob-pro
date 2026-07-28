const CACHE_NAME = "imob-pro-cache-v2";

// Arquivos críticos a serem pré-cacheados no início
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico"
];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Instalando e pré-cacheando recursos...");
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});


// Ativação do Service Worker (Limpeza de caches antigos)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepção de requisições
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Apenas intercepta requisições GET para nossa própria origem
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Bundles do Next/Clerk e rotas de autenticação precisam sempre passar pela
  // rede/navegador. Guardá-los aqui pode combinar HTML e JavaScript de builds
  // diferentes e causar um ciclo infinito de atualização antes do login abrir.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__clerk/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  // O suporte offline de navegação é restrito ao módulo de vistorias.
  // Não armazena redirecionamentos de autenticação como se fossem a página pedida.
  if (request.mode === "navigate" && url.pathname.startsWith("/vistorias")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.redirected && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Em caso de falha de rede (offline), busca no cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const fallback = await caches.match("/vistorias");
          if (fallback) {
            return fallback;
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        })
    );
    return;
  }

  // Recursos públicos estáveis podem continuar disponíveis offline. CSS e JS
  // ficam deliberadamente fora para evitar incompatibilidade entre builds.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Opcional: atualiza em background (Stale-While-Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* silencia erros de rede em background */ });

          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede e guarda no cache
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
