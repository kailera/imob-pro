const CACHE_NAME = "imob-pro-cache-v1";

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

  // Ignora requisições de hot reloading de desenvolvimento (_next/webpack-hmr, etc.)
  if (url.pathname.includes("_next/webpack-hmr") || url.pathname.includes("hot-update")) {
    return;
  }

  // 1. Estratégia para Páginas HTML (Rotas do App): Network First (Rede Primeiro)
  // Tenta rede primeiro para ter dados atualizados. Se falhar (offline), busca no cache.
  if (request.mode === "navigate" || url.pathname.startsWith("/vistorias")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva uma cópia da página atualizada no cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Em caso de falha de rede (offline), busca no cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback genérico se a rota não estiver no cache
            return caches.match("/vistorias");
          });
        })
    );
    return;
  }

  // 2. Estratégia para Arquivos Estáticos (CSS, JS, Imagens, Fontes): Cache First / Stale-While-Revalidate
  // Next.js usa hashes nos nomes dos arquivos estáticos, então se mudarem, a URL muda.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
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
