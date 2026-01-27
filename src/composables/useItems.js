import { ref, computed } from 'vue'
import { collection, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { getTodayStr, getDays } from '../utils/dateUtils'
import { isNoExpiry } from '../utils/itemHelpers'
import { recalculateItemFromBatches } from '../utils/inventoryUtils'

/**
 * 物品管理的 composable
 * @param {Function} getDb - 取得 Firestore db 實例的函數
 */
export function useItems(getDb) {
    // 物品列表
    const items = ref([])

    // 篩選狀態
    const searchText = ref("")
    const filterZone = ref("all")

    // 多選模式
    const isSelectionMode = ref(false)
    const selectedHomeIds = ref([])

    // ==================== Firebase 監聽 ====================

    const startItemsListener = () => {
        const db = getDb()
        if (!db) return

        onSnapshot(collection(db, "fridge_items"), (snapshot) => {
            items.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        })
    }

    // ==================== Computed ====================

    // 1. 區域過濾 (Zone Filter) - 依賴 items
    const zonedItems = computed(() => {
        let list = items.value

        if (filterZone.value === 'nostock') {
            list = list.filter(i => parseInt(i.quantity) === 0)
        } else {
            // 確保顯示的都是有庫存
            list = list.filter(i => parseInt(i.quantity) > 0)

            if (filterZone.value !== 'all') {
                list = list.filter(i => (i.zone || 'cold') === filterZone.value)
            }
        }
        return list
    })

    // 2. 搜尋過濾 (Search Filter) - 依賴 zonedItems
    // 分離此層可大幅減少輸入時的計算量
    const searchedItems = computed(() => {
        const keyword = searchText.value?.trim() || ""
        if (!keyword) return zonedItems.value

        const lowerKeyword = keyword.toLowerCase()
        return zonedItems.value.filter(i => (i.name || "").toLowerCase().includes(lowerKeyword))
    })

    // 3. 排序 (Sorting) - 依賴 searchedItems
    // 只對最終結果進行排序
    const filteredItems = computed(() => {
        return [...searchedItems.value].sort((a, b) => {
            const getSortDate = (it) => {
                if (isNoExpiry(it)) return "9999-12-31"
                return it.expiryDate || "9999-12-31"
            }

            const dateA = getSortDate(a)
            const dateB = getSortDate(b)

            if (dateA !== dateB) return dateA < dateB ? -1 : 1

            const storeA = a.storedDate || "9999-12-31"
            const storeB = b.storedDate || "9999-12-31"

            if (storeA !== storeB) return storeA < storeB ? -1 : 1

            return 0
        })
    })

    const zoneStats = computed(() => {
        const stats = {
            all: { total: 0, warning: 0, expired: 0 },
            cold: { total: 0, warning: 0, expired: 0 },
            frozen: { total: 0, warning: 0, expired: 0 },
            veggie: { total: 0, warning: 0, expired: 0 },
            nostock: { total: 0 }
        }

        items.value.forEach(item => {
            if (parseInt(item.quantity) === 0) {
                stats.nostock.total++
                return
            }

            stats.all.total++

            const z = item.zone || 'cold'

            if (stats[z]) stats[z].total++

            if (!isNoExpiry(item)) {
                const days = getDays(item.expiryDate)
                if (days !== null) {
                    if (days < 0) {
                        stats.all.expired++
                        if (stats[z]) stats[z].expired++
                    } else if (days <= 7) {
                        stats.all.warning++
                        if (stats[z]) stats[z].warning++
                    }
                }
            }
        })
        return stats
    })

    const toBuyList = computed(() => {
        return items.value.filter(i => i.shoppingStatus === 'toBuy')
    })

    const cartList = computed(() => {
        return items.value.filter(i => i.shoppingStatus === 'inCart')
    })

    // ==================== CRUD 操作 ====================

    /**
     * 取出物品
     */
    const takeOutItem = async (item, takeQty) => {
        const db = getDb()
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

    /**
     * 永久刪除物品
     */
    const deleteItem = async (id) => {
        const db = getDb()
        if (!db) return false

        try {
            await deleteDoc(doc(db, "fridge_items", id))
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    /**
     * 批次刪除選取的物品
     */
    const deleteSelectedItems = async () => {
        const db = getDb()
        if (!db) return false

        try {
            const promises = selectedHomeIds.value.map(id => deleteDoc(doc(db, "fridge_items", id)))
            await Promise.all(promises)
            selectedHomeIds.value = []
            isSelectionMode.value = false
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    /**
     * 批次加入待購買清單
     */
    const addBatchToBuy = async () => {
        const db = getDb()
        if (!db) return false

        try {
            const promises = selectedHomeIds.value.map(id =>
                updateDoc(doc(db, "fridge_items", id), { shoppingStatus: 'toBuy' })
            )
            await Promise.all(promises)
            selectedHomeIds.value = []
            isSelectionMode.value = false
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    /**
     * 重置多選模式
     */
    const resetSelection = () => {
        isSelectionMode.value = false
        selectedHomeIds.value = []
    }

    /**
     * 切換篩選區域
     */
    const selectZone = (zone) => {
        filterZone.value = zone
        resetSelection()
    }

    return {
        // State
        items,
        searchText,
        filterZone,
        isSelectionMode,
        selectedHomeIds,

        // Computed
        filteredItems,
        zoneStats,
        toBuyList,
        cartList,

        // Listener
        startItemsListener,

        // CRUD
        takeOutItem,
        deleteItem,
        deleteSelectedItems,
        addBatchToBuy,

        // Selection
        resetSelection,
        selectZone
    }
}
