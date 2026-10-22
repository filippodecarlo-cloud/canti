// Rende l'app installabile e utilizzabile anche senza connessione.
const CACHE = "canti-v2";
const BASE = ["./", "index.html", "app.js", "stile.css", "manifest.webmanifest",
  "icone/icona-192.png", "icone/icona-512.png", "icone/copertina.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname === "api.github.com") return;  // salvataggi: sempre dalla rete

  // pagina, codice e canti: prima la rete (così gli aggiornamenti arrivano subito), la copia se offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request.url, { cache: "no-cache" })
        .then(res => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copia));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // pentagramma (abcjs) e suoni del pianoforte: non cambiano, basta scaricarli una volta
  if (/cdn\.jsdelivr\.net|paulrosen\.github\.io/.test(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const salvata = await c.match(e.request);
        if (salvata) return salvata;
        const res = await fetch(e.request);
        if (res.ok || res.type === "opaque") c.put(e.request, res.clone());
        return res;
      })
    );
  }
});
