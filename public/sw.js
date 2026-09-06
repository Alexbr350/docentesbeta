// Service Worker de ENSFA+
//
// Objetivo: lo mínimo necesario para que Chrome considere la app
// "instalable" (Android) y para que, si se pierde la conexión un momento,
// la app no se quede en blanco — no busca ser una app 100% offline (los
// datos vienen de Firestore en tiempo real, así que no tendría sentido
// cachear publicaciones ni nada dinámico).
//
// Estrategia:
//  - Assets estáticos (JS/CSS con hash de Next.js, íconos, el logo):
//    "cache first" — son inmutables, así que si ya están en caché se sirven
//    directo (rápido) y de paso quedan disponibles sin conexión.
//  - Navegación (las páginas en sí, ej. "/"): "network first" — siempre se
//    intenta traer la versión más reciente (esta es una app social con
//    datos en vivo), y solo si no hay red se cae a lo último que quedó en
//    caché, para no dejar una pantalla en blanco.
//
// Se sube de versión el nombre del caché (CACHE_VERSION) cada vez que se
// quiera invalidar lo guardado — el activate() se encarga de borrar las
// versiones viejas.

const CACHE_VERSION = "ensfa-v1";
const APP_SHELL = ["/", "/manifest.json", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET; todo lo demás (POST a Firestore/APIs propias, etc.) pasa de largo.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptar peticiones a otros orígenes (Firestore, Cloudinary, Google
  // Fonts, la API de Gemini, etc.) — que las maneje la red normal siempre.
  if (url.origin !== self.location.origin) return;

  // Navegación entre páginas: network-first con respaldo en caché.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
          return respuesta;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Assets estáticos de Next.js y del logo/íconos: cache-first.
  const esEstatico =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.png" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico";

  if (esEstatico) {
    event.respondWith(
      caches.match(request).then(
        (cacheado) =>
          cacheado ||
          fetch(request).then((respuesta) => {
            const copia = respuesta.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
            return respuesta;
          })
      )
    );
  }
});
