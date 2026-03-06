import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { isNoExpiry } from '../utils/itemHelpers'
import { getDays } from '../utils/dateUtils'
import { APP_PAGES } from '../utils/constants'

export const useMainStore = defineStore('main', () => {
    // === State ===
    const items = ref([])
    const familySettings = ref({
        familyName: "我的家庭",
        members: []
    })
    const currentUser = ref(null)
    const currentUserName = ref("")

    const isLoading = ref(false)
    const activeSyncs = ref(0)
    const optimisticItemsUpdateCount = ref(0)
    let queuedRemoteItems = null

    // Network Status
    const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

    // Setup network listeners (runs once when store is created)
    const handleOnline = () => { isOnline.value = true }
    const handleOffline = () => { isOnline.value = false }

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
    }

    // Cleanup network listeners when store is disposed
    const cleanupNetworkListeners = () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }

    // Infinite Scroll State
    const homeVisibleCount = ref(20)

    // UI Filters
    const searchText = ref("")
    const debouncedSearchText = ref("")
    const filterZone = ref("all")

    // Navigation / page UI
    const currentPage = ref(APP_PAGES.HOME)
    const previousPage = ref(APP_PAGES.HOME)
    const savedScrollY = ref(0)
    const showScrollTop = ref(false)
    const previewImageUrl = ref(null)
    const isSelectionMode = ref(false)
    const selectedHomeIds = ref([])

    // Debounce search: UI stays responsive, filtering delays 250ms
    let _searchTimer = null
    watch(searchText, (val) => {
        clearTimeout(_searchTimer)
        _searchTimer = setTimeout(() => {
            debouncedSearchText.value = val
        }, 250)
    })

    // === Actions ===
    const setItems = (newItems) => {
        items.value = newItems
    }

    const setFamilySettings = (settings) => {
        familySettings.value = settings
    }

    const setCurrentUser = (user) => {
        currentUser.value = user
    }

    const setCurrentUserName = (name) => {
        currentUserName.value = name || ""
    }

    const setLoading = (loading) => {
        isLoading.value = loading
    }

    const applyRemoteItems = (newItems) => {
        if (optimisticItemsUpdateCount.value > 0) {
            queuedRemoteItems = newItems
            return
        }
        items.value = newItems
    }

    const beginOptimisticItemsUpdate = () => {
        optimisticItemsUpdateCount.value++
    }

    const endOptimisticItemsUpdate = () => {
        if (optimisticItemsUpdateCount.value > 0) {
            optimisticItemsUpdateCount.value--
        }

        if (optimisticItemsUpdateCount.value === 0 && queuedRemoteItems) {
            items.value = queuedRemoteItems
            queuedRemoteItems = null
        }
    }

    const startSync = () => {
        activeSyncs.value++
    }

    const endSync = () => {
        if (activeSyncs.value > 0) activeSyncs.value--
    }

    const loadMoreItems = () => {
        homeVisibleCount.value += 20
    }

    const resetVisibleCount = () => {
        homeVisibleCount.value = 20
    }

    const setCurrentPage = (page) => {
        currentPage.value = page
    }

    const setPreviousPage = (page) => {
        previousPage.value = page
    }

    const setSavedScrollY = (y) => {
        savedScrollY.value = y
    }

    const setShowScrollTop = (show) => {
        showScrollTop.value = show
    }

    const setPreviewImageUrl = (url) => {
        previewImageUrl.value = url
    }

    const clearPreviewImage = () => {
        previewImageUrl.value = null
    }

    const setSelectionMode = (enabled) => {
        isSelectionMode.value = !!enabled
    }

    const setSelectedHomeIds = (ids) => {
        selectedHomeIds.value = Array.isArray(ids) ? [...ids] : []
    }

    const clearSelection = () => {
        isSelectionMode.value = false
        selectedHomeIds.value = []
    }

    const removeItemLocally = (id) => {
        const index = items.value.findIndex((item) => item.id === id)
        if (index === -1) return null

        const [item] = items.value.splice(index, 1)
        return { index, item }
    }

    const removeItemsLocally = (ids) => {
        const idsSet = new Set(ids)
        const removedEntries = []

        items.value = items.value.filter((item, index) => {
            if (!idsSet.has(item.id)) return true

            removedEntries.push({ index, item })
            return false
        })

        return removedEntries
    }

    const restoreRemovedItems = (removedEntries) => {
        const rollbackItems = [...items.value]

        removedEntries
            .slice()
            .sort((a, b) => a.index - b.index)
            .forEach(({ index, item }) => {
                const rollbackIndex = Math.min(Math.max(index, 0), rollbackItems.length)
                if (!rollbackItems.some((existing) => existing.id === item.id)) {
                    rollbackItems.splice(rollbackIndex, 0, item)
                }
            })

        items.value = rollbackItems
    }

    const snapshotShoppingStatuses = (ids) => {
        return ids.map((id) => {
            const item = items.value.find((entry) => entry.id === id)
            return { id, status: item ? item.shoppingStatus : null }
        })
    }

    const setShoppingStatusLocally = (ids, status) => {
        const idsSet = new Set(ids)
        items.value.forEach((item) => {
            if (idsSet.has(item.id)) {
                item.shoppingStatus = status
            }
        })
    }

    const restoreShoppingStatuses = (snapshots) => {
        snapshots.forEach(({ id, status }) => {
            const item = items.value.find((entry) => entry.id === id)
            if (item) {
                item.shoppingStatus = status
            }
        })
    }

    // === Getters (Computed) ===

    const filteredItems = computed(() => {
        const keyword = debouncedSearchText.value?.trim() || ""
        let list = items.value

        if (keyword) {
            const lowerKeyword = keyword.toLowerCase()
            list = list.filter(i => (i.name || "").toLowerCase().includes(lowerKeyword))
        }

        if (filterZone.value === 'nostock') {
            list = list.filter(i => parseInt(i.quantity) === 0)
        } else {
            list = list.filter(i => parseInt(i.quantity) > 0)

            if (filterZone.value !== 'all') {
                list = list.filter(i => (i.zone || 'cold') === filterZone.value)
            }
        }

        return [...list].sort((a, b) => {
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

    return {
        items,
        familySettings,
        currentUser,
        currentUserName,
        isLoading,
        isOnline,
        searchText,
        filterZone,
        currentPage,
        previousPage,
        savedScrollY,
        showScrollTop,
        previewImageUrl,
        isSelectionMode,
        selectedHomeIds,

        setItems,
        applyRemoteItems,
        setFamilySettings,
        setCurrentUser,
        setCurrentUserName,
        setLoading,
        beginOptimisticItemsUpdate,
        endOptimisticItemsUpdate,

        filteredItems,
        zoneStats,
        toBuyList,

        cartList,

        activeSyncs,
        startSync,
        endSync,
        isSyncing: computed(() => activeSyncs.value > 0),

        homeVisibleCount,
        loadMoreItems,
        resetVisibleCount,
        setCurrentPage,
        setPreviousPage,
        setSavedScrollY,
        setShowScrollTop,
        setPreviewImageUrl,
        clearPreviewImage,
        setSelectionMode,
        setSelectedHomeIds,
        clearSelection,
        removeItemLocally,
        removeItemsLocally,
        restoreRemovedItems,
        snapshotShoppingStatuses,
        setShoppingStatusLocally,
        restoreShoppingStatuses,

        cleanupNetworkListeners
    }
})
