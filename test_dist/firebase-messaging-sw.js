importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ⚠️ 重要：背景通知 (Background Notification) 必須在這裡設定您的 Firebase Config
// 請將您的設定複製貼上到下方，取代原本的 "REPLACE_WITH_..."
/*
  範例：
  const firebaseConfig = {
    apiKey: "AIzaSx...",
    authDomain: "你的專案.firebaseapp.com",
    projectId: "你的專案",
    storageBucket: "你的專案.appspot.com",
    messagingSenderId: "123456...",
    appId: "1:123456..."
  };
  firebase.initializeApp(firebaseConfig);
*/

// TODO: 請填寫您的設定
firebase.initializeApp({
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
    storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
