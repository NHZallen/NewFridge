import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc
} from 'firebase/firestore'

let appFirebase = null
let db = null

export function useFirebase() {
    const isConfigured = ref(false)
    const isSettingUp = ref(false)
    const inputConfigStr = ref("")
    const inputUserName = ref("")
    const currentUserName = ref("")
    const setupError = ref("")
    const isLoading = ref(false)

    const familySettings = ref({
        familyName: "我的家庭",
        members: []
    })

    const checkConfig = async () => {
        const storedConfig = localStorage.getItem("fridge_firebase_config")
        const storedUser = localStorage.getItem("fridge_user_name")

        if (storedConfig && storedUser) {
            try {
                const configObj = JSON.parse(storedConfig)
                await initFirebase(configObj, storedUser)
            } catch (e) {
                console.error("Config load error", e)
                localStorage.removeItem("fridge_firebase_config")
                isConfigured.value = false
            }
        } else {
            isConfigured.value = false
        }
    }

    const initFirebase = async (config, userName) => {
        try {
            if (!appFirebase) {
                appFirebase = initializeApp(config)
                db = getFirestore(appFirebase)
            }

            currentUserName.value = userName
            localStorage.setItem("fridge_user_name", userName)

            isConfigured.value = true
            isLoading.value = true

            await checkAndJoinFamily(userName)
        } catch (e) {
            throw e
        }
    }

    const saveInitialConfig = async () => {
        setupError.value = ""
        if (!inputConfigStr.value.includes("firebaseConfig") && !inputConfigStr.value.includes("{")) {
            setupError.value = "格式似乎不正確，請複製包含 { ... } 的完整程式碼"
            return
        }

        if (!inputUserName.value.trim()) {
            setupError.value = "請輸入您的稱呼"
            return
        }

        isSettingUp.value = true

        try {
            let cleanStr = inputConfigStr.value.trim()
            cleanStr = cleanStr.replace(/const\s+firebaseConfig\s*=\s*/, '')
            cleanStr = cleanStr.replace(/;$/, '')

            const configObj = (new Function(`return ${cleanStr}`))()
            if (!configObj.projectId) throw new Error("無效的設定內容")

            await initFirebase(configObj, inputUserName.value.trim())
            localStorage.setItem("fridge_firebase_config", JSON.stringify(configObj))

        } catch (e) {
            console.error(e)
            setupError.value = "設定失敗，請檢查代碼是否正確或是網路連線異常"
            appFirebase = null
        } finally {
            isSettingUp.value = false
        }
    }

    const checkAndJoinFamily = async (userName) => {
        const settingsRef = doc(db, "family_metadata", "general")
        try {
            const docSnap = await getDoc(settingsRef)
            if (!docSnap.exists()) {
                await setDoc(settingsRef, {
                    familyName: "我的家庭",
                    members: [userName]
                })
                familySettings.value = { familyName: "我的家庭", members: [userName] }
            } else {
                const data = docSnap.data()
                let members = data.members || []
                if (!members.includes(userName)) {
                    members.push(userName)
                    await updateDoc(settingsRef, { members: members })
                }
                familySettings.value = {
                    familyName: data.familyName || "我的家庭",
                    members: members
                }
            }
        } catch (e) {
            console.error("Family Setup Error", e)
        }
    }

    const updateFamilyName = async (newName) => {
        if (!newName.trim()) return
        try {
            await updateDoc(doc(db, "family_metadata", "general"), {
                familyName: newName.trim()
            })
        } catch (e) {
            throw e
        }
    }

    const updateUserName = async (oldName, newName) => {
        if (!newName.trim()) throw new Error("名稱不能為空")
        if (newName === oldName) return

        try {
            const updatedMembers = familySettings.value.members.filter(m => m !== oldName)
            updatedMembers.push(newName)
            await updateDoc(doc(db, "family_metadata", "general"), {
                members: updatedMembers,
                latest_rename: { from: oldName, to: newName, at: Date.now() }
            })
            currentUserName.value = newName
            localStorage.setItem("fridge_user_name", newName)
        } catch (e) {
            throw e
        }
    }

    const resetApp = () => {
        if (confirm("確定要重置所有設定嗎？所有資料都會保留在雲端。")) {
            localStorage.removeItem("fridge_firebase_config")
            localStorage.removeItem("fridge_user_name")
            location.reload()
        }
    }

    const getDb = () => db
    const getCollection = (name) => collection(db, name)
    const getDoc$ = (collectionName, docId) => doc(db, collectionName, docId)

    return {
        // State
        isConfigured,
        isSettingUp,
        inputConfigStr,
        inputUserName,
        currentUserName,
        setupError,
        isLoading,
        familySettings,

        // Methods
        checkConfig,
        initFirebase,
        saveInitialConfig,
        updateFamilyName,
        updateUserName,
        resetApp,

        // Firebase utils
        getDb,
        getCollection,
        getDoc: getDoc$,

        // Firestore exports for direct use
        onSnapshot,
        addDoc,
        updateDoc: updateDoc,
        deleteDoc,
        setDoc,
        getDoc: getDoc
    }
}
