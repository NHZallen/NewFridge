import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

export async function setupFCM(app, db, userId, vapidKey) {
    if (!vapidKey) return null;

    try {
        const messaging = getMessaging(app);

        // 請求權限
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // 取得 Token
        const currentToken = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.ready
        });

        if (currentToken) {
            console.log('FCM Token:', currentToken);

            // 將 Token 存入 Firestore (關聯到家庭或使用者)
            const settingsRef = doc(db, "family_metadata", "general");

            // 先讀取舊的，把跟目前一樣 Token 的移除 (避免重複但時間不同)
            const docSnap = await getDoc(settingsRef);
            let currentTokens = [];

            if (docSnap.exists() && docSnap.data().fcmTokens) {
                currentTokens = docSnap.data().fcmTokens;
                // 移除已存在的此 Token (無論舊的使用者是誰，都視為更新)
                currentTokens = currentTokens.filter(t => t.token !== currentToken);
            }

            // 加入新的
            currentTokens.push({
                token: currentToken,
                userId: userId,
                updatedAt: new Date().toISOString(),
                device: navigator.userAgent
            });

            await updateDoc(settingsRef, {
                fcmTokens: currentTokens
            });

            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
}

export function onForegroundMessage(app, callback) {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        if (callback) callback(payload);
    });
}
