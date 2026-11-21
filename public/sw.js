// 독고달이 스케줄 - 백그라운드 푸시 알림용 서비스워커.
// 페이지가 꺼져 있어도(또는 아이폰이면 홈 화면 앱이 꺼져 있어도) 이 스크립트가
// 브라우저 백그라운드에서 계속 실행되면서 push 이벤트를 받아 알림을 띄운다.

self.addEventListener("push", (event) => {
  let payload = { title: "독고달이", body: "새 알림이 있습니다.", url: "dokgodali-schedule.html" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    // JSON이 아니면 기본값 그대로 사용
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "dokgodali-schedule.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
