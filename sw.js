/* 다꾸 체험단 모음 - 오프라인/빠른 실행용 서비스워커 */
const V = "dakku-v258";
const CORE = ["./", "index.html", "style.css", "simple.css", "app.js", "manifest.webmanifest", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(p => new Request(p, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // 숙소 사진: 캐시 우선
  if (u.pathname.includes("/images/") || u.pathname.includes("/icons/")) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)); return res; })));
    return;
  }
  // 그 외(목록 data.json, 페이지): 네트워크 우선, 오프라인이면 캐시
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(e.request.url.split("?")[0], cp)); return res; })
    .catch(() => caches.match(e.request.url.split("?")[0]).then(r => r || caches.match("index.html"))));
});

// 웹 푸시 알림 (scripts/send_push.js 가 보냄)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "다꾸체험단", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "다꾸체험단", { body: d.body || "", icon: d.icon || "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || "dakku", image: d.image || undefined, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (w.url.startsWith(self.registration.scope) && "focus" in w) { w.navigate(url); return w.focus(); } }
    return clients.openWindow(url);
  }));
});
