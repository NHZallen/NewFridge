import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

// Singleton state
const appFirebase = ref(null)
const db = ref(null)
const storage = ref(null)
const auth = ref(null)
const currentUser = ref(null)
const isConfigured = ref(false)

// Named exports for non-composable usage
export { db, storage, auth, currentUser, isConfigured }

export function useFirebase() {

    const initFirebase = async (config) => {
        try {
            if (!appFirebase.value) {
                console.log("Initializing Firebase with project:", config.projectId)
                appFirebase.value = initializeApp(config)
                db.value = getFirestore(appFirebase.value)

                // Enable Offline Persistence
                try {
                    await enableIndexedDbPersistence(db.value)
                    console.log("Firebase Offline Persistence Enabled")
                } catch (err) {
                    if (err.code == 'failed-precondition') {
                        console.warn("Persistence failed: Multiple tabs open")
                    } else if (err.code == 'unimplemented') {
                        console.warn("Persistence not supported by browser")
                    }
                }

                // Initialize Storage only if storageBucket exists
                if (config.storageBucket) {
                    try {
                        storage.value = getStorage(appFirebase.value)
                        console.log("Storage initialized")
                    } catch (storageErr) {
                        console.error("Storage Init Failed:", storageErr)
                    }
                } else {
                    console.warn("Storage Bucket missing in config")
                }

                try {
                    auth.value = getAuth(appFirebase.value)
                    onAuthStateChanged(auth.value, (user) => {
                        currentUser.value = user
                    })
                } catch (authErr) {
                    console.error("Auth Init Failed:", authErr)
                }
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
