import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

// Singleton state
const appFirebase = ref(null)
const db = ref(null)
const storage = ref(null)
const auth = ref(null)
const currentUser = ref(null)
const isConfigured = ref(false)
let authUnsubscribe = null

// Named exports for non-composable usage
export { db, storage, auth, currentUser, isConfigured }

export function useFirebase() {

    const initFirebase = async (config) => {
        try {
            if (!appFirebase.value) {

                appFirebase.value = initializeApp(config)
                db.value = getFirestore(appFirebase.value)



                // Initialize Storage only if storageBucket exists
                if (config.storageBucket) {
                    try {
                        storage.value = getStorage(appFirebase.value)

                    } catch (storageErr) {
                        console.error("Storage Init Failed:", storageErr)
                    }
                } else {
                    console.warn("Storage Bucket missing in config")
                }

                try {
                    auth.value = getAuth(appFirebase.value)
                } catch (authErr) {
                    console.error("Auth Init Failed:", authErr)
                }
            }

            // Auth listener — 只在尚未註冊且 auth 可用時綁定
            if (!authUnsubscribe && auth.value) {
                authUnsubscribe = onAuthStateChanged(auth.value, (user) => {
                    currentUser.value = user
                })
            }

            isConfigured.value = true
            return true
        } catch (e) {
            console.error("Firebase Init Error:", e)
            throw new Error(e.message || "Firebase 初始化失敗");
        }
    }

    const checkConfig = async () => {
        const storedConfig = localStorage.getItem("fridge_firebase_config")

        if (storedConfig) {
            try {
                const configObj = JSON.parse(storedConfig)
                // We just return the config here, let the consumer call initFirebase
                // or we could init here. Better to separate for clarity.
                return configObj
            } catch (e) {
                console.error("Config load error", e)
                localStorage.removeItem("fridge_firebase_config")
                isConfigured.value = false
                return null
            }
        } else {
            isConfigured.value = false
            return null
        }
    }

    const linkGoogleAccount = async () => {
        if (!auth.value) return { success: false, error: "No Auth" }
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth.value, provider)
            return { success: true }
        } catch (error) {
            console.error("Auth Error:", error)
            return { success: false, error: error.message }
        }
    }

    const unlinkGoogleAccount = async () => {
        if (!auth.value) return { success: false }
        try {
            await signOut(auth.value)
            return { success: true }
        } catch (error) {
            console.error("SignOut Error", error)
            return { success: false, error }
        }
    }

    const resetApp = () => {
        localStorage.removeItem("fridge_firebase_config")
        localStorage.removeItem("fridge_user_name")
        location.reload()
    }

    return {
        appFirebase,
        db,
        storage,
        auth,
        currentUser,
        isConfigured,
        initFirebase,
        checkConfig,
        linkGoogleAccount,
        unlinkGoogleAccount,
        resetApp
    }
}
