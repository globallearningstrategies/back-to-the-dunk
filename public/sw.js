/* Service worker for The Work — receives daily reminder pushes. */
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || "The Work", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const url = (e.notification.data && e.notification.data.url) || "/";
      // Reuse an open window, moving it to the notification's page (e.g. /?log=game).
      for (const c of list) {
        if ("focus" in c) return (url !== "/" && "navigate" in c ? c.navigate(url) : Promise.resolve(c)).then(w => (w || c).focus());
      }
      return clients.openWindow(url);
    })
  );
});
