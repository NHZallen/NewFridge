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
    deleteDoc,
    enableIndexedDbPersistence
} from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { recalculateItemFromBatches } from '../utils/inventoryUtils.js'

let appFirebase = null
let db = null
let auth = null

export function useFirebase() {
    const isConfigured = ref(false)
    const isSettingUp = ref(false)
    const inputConfigStr = ref("")
    const inputUserName = ref("")
    const currentUserName = ref("")
    const setupError = ref("")
    const isLoading = ref(false)
    const currentUser = ref(null)

    const familySettings = ref({
        familyName: "我的家庭",
        members: []
    })

    // Items state
    const items = ref([])

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
                auth = getAuth(appFirebase)

                // Auth state listener
                onAuthStateChanged(auth, (user) => {
                    currentUser.value = user
                })

                // 啟用離線持久化
                enableIndexedDbPersistence(db).catch((err) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('多個標籤頁同時開啟，持久化僅能在一個標籤頁生效')
                    } else if (err.code == 'unimplemented') {
                        console.warn('瀏覽器不支援持久化')
                    }
                });
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

    // ==================== Google Auth ====================

    const linkGoogleAccount = async () => {
        if (!auth) return
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            return true
        } catch (error) {
            console.error("Auth Error:", error)
            throw error
        }
    }

    const unlinkGoogleAccount = async () => {
        if (!auth) return
        try {
            await signOut(auth)
            return true
        } catch (error) {
            console.error("SignOut Error", error)
            throw error
        }
    }

    // ==================== Realtime Listeners ====================

    const startItemsListener = (onUpdate) => {
        if (!db) return null

        return onSnapshot(collection(db, "fridge_items"), (snapshot) => {
            items.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            isLoading.value = false
            if (onUpdate) onUpdate(items.value)
        })
    }

    const startFamilyListener = (onUpdate) => {
        if (!db) return null

        return onSnapshot(doc(db, "family_metadata", "general"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                familySettings.value.familyName = data.familyName
                familySettings.value.members = data.members || []

                if (data.latest_rename) {
                    const { from, to, at } = data.latest_rename
                    const now = Date.now()
                    if (from === currentUserName.value && (now - at < 60000)) {
                        currentUserName.value = to
                        localStorage.setItem("fridge_user_name", to)
                    }
                }

                if (onUpdate) onUpdate(familySettings.value)
            }
        })
    }

    // ==================== Items CRUD ====================

    const addItem = async (itemData) => {
        if (!db) throw new Error("Database not initialized")

        try {
            const docRef = await addDoc(collection(db, "fridge_items"), {
                ...itemData,
                createdAt: new Date()
            })
            return docRef.id
        } catch (e) {
            console.error("Add Item Error:", e)
            throw e
        }
    }

    const updateItem = async (id, itemData) => {
        if (!db) throw new Error("Database not initialized")

        try {
            await updateDoc(doc(db, "fridge_items", id), {
                ...itemData,
                updatedAt: new Date()
            })
            return true
        } catch (e) {
            console.error("Update Item Error:", e)
            throw e
        }
    }

    const deleteItem = async (id) => {
        if (!db) throw new Error("Database not initialized")

        try {
            await deleteDoc(doc(db, "fridge_items", id))
            return true
        } catch (e) {
            console.error("Delete Item Error:", e)
            throw e
        }
    }

    const takeOutItem = async (item, takeQty) => {
        if (!db || !item) return false

        const currentQty = parseInt(item.quantity)

        // 全部取出
        if (takeQty >= currentQty) {
            try {
                await updateDoc(doc(db, "fridge_items", item.id), {
                    quantity: 0,
                    batches: [],
                    storedDate: "",
                    expiryDate: "",
                    noExpiry: true,
                    updatedAt: new Date()
                })
                return true
            } catch (e) {
                console.error(e)
                return false
            }
        }

        // 部分取出
        try {
            let batches = item.batches ? [...item.batches] : [{
                storedDate: item.storedDate,
                expiryDate: item.expiryDate,
                noExpiry: item.noExpiry,
                quantity: currentQty,
                image: item.image
            }]

            // 按過期日排序
            batches.sort((a, b) => {
                const dateA = a.noExpiry ? "9999-12-31" : (a.expiryDate || "9999-12-31")
                const dateB = b.noExpiry ? "9999-12-31" : (b.expiryDate || "9999-12-31")
                if (dateA < dateB) return -1
                if (dateA > dateB) return 1
                const storeA = a.storedDate || "9999-12-31"
                const storeB = b.storedDate || "9999-12-31"
                if (storeA < storeB) return -1
                if (storeA > storeB) return 1
                return 0
            })

            let remainingToTake = takeQty
            const newBatches = []

            for (let batch of batches) {
                if (remainingToTake <= 0) {
                    newBatches.push(batch)
                    continue
                }

                let batchQty = parseInt(batch.quantity)

                if (batchQty > remainingToTake) {
                    batch.quantity = batchQty - remainingToTake
                    remainingToTake = 0
                    newBatches.push(batch)
                } else {
                    remainingToTake -= batchQty
                }
            }

            const result = recalculateItemFromBatches(newBatches, item.owners)
            await updateDoc(doc(db, "fridge_items", item.id), { ...result })

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const batchDeleteItems = async (ids) => {
        if (!db) throw new Error("Database not initialized")

        try {
            const promises = ids.map(id => deleteDoc(doc(db, "fridge_items", id)))
            await Promise.all(promises)
            return true
        } catch (e) {
            console.error("Batch Delete Error:", e)
            throw e
        }
    }

    const batchUpdateItems = async (updates) => {
        if (!db) throw new Error("Database not initialized")

        try {
            const promises = updates.map(({ id, data }) =>
                updateDoc(doc(db, "fridge_items", id), data)
            )
            await Promise.all(promises)
            return true
        } catch (e) {
            console.error("Batch Update Error:", e)
            throw e
        }
    }

    const getDb = () => db
    const getAuth = () => auth
    const getCollection = (name) => collection(db, name)
    const getDoc$ = (collectionName, docId) => doc(db, collectionName, docId)

    return {
        // State
        isConfigured,
        isSettingUp,
        inputConfigStr,
        inputUserName,
        currentUserName,
        currentUser,
        setupError,
        isLoading,
        familySettings,
        items,

        // Setup Methods
        checkConfig,
        initFirebase,
        saveInitialConfig,

        // Family Methods
        updateFamilyName,
        updateUserName,
        resetApp,

        // Google Auth
        linkGoogleAccount,
        unlinkGoogleAccount,

        // Listeners
        startItemsListener,
        startFamilyListener,

        // Items CRUD
        addItem,
        updateItem,
        deleteItem,
        takeOutItem,
        batchDeleteItems,
        batchUpdateItems,

        // Firebase utils
        getDb,
        getAuth,
        getCollection,
        getDoc: getDoc$,

        // Firestore exports for direct use
        onSnapshot,
        addDoc: addDoc,
        updateDoc: updateDoc,
        deleteDoc: deleteDoc,
        setDoc,
        getDoc: getDoc
    }
}
