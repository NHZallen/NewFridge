import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isNoExpiry } from '../utils/itemHelpers'
import { getDays } from '../utils/dateUtils'

export const useMainStore = defineStore('main', () => {
    // === State ===
    const items = ref([])
    const familySettings = ref({
        familyName: "我的家庭",
        members: []
    })
    const currentUser = ref(null)

    const isLoading = ref(false)
    const activeSyncs = ref(0)

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
    const filterZone = ref("all")

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

    const setLoading = (loading) => {
        isLoading.value = loading
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

    // === Getters (Computed) ===

    const filteredItems = computed(() => {
        const keyword = searchText.value?.trim() || ""
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
        isLoading,
        isOnline,
        searchText,
        filterZone,

        setItems,
        setFamilySettings,
        setCurrentUser,
        setLoading,

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

        cleanupNetworkListeners
    }
})
