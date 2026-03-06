import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '../stores'
import { APP_PAGES } from '../utils/constants'

export function useNavigation({ cleanupSidebar, toggleOffcanvas, showOffcanvas }) {
    const store = useMainStore()
    const {
        currentPage,
        previousPage,
        savedScrollY,
        showScrollTop,
        previewImageUrl,
        isSelectionMode,
        selectedHomeIds,
        filterZone
    } = storeToRefs(store)

    const isReturningToSidebar = ref(false)

    const onScrollHandler = () => {
        store.setShowScrollTop(window.scrollY > 300)
    }

    const initScrollListener = () => {
        window.addEventListener('scroll', onScrollHandler)
    }

    const disposeScrollListener = () => {
        window.removeEventListener('scroll', onScrollHandler)
    }

    watch(currentPage, () => {
        if (isReturningToSidebar.value) return

        cleanupSidebar('sidebar')
        setTimeout(() => cleanupSidebar('sidebar'), 350)
    })

    const toggleSidebar = () => toggleOffcanvas('sidebar')
    const openSidebarSafe = () => showOffcanvas('sidebar')

    const openPreview = (url) => {
        store.setPreviewImageUrl(url)
    }

    const closePreview = () => {
        store.clearPreviewImage()
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const goHome = () => {
        store.setCurrentPage(APP_PAGES.HOME)
        store.clearPreviewImage()

        nextTick(() => {
            window.scrollTo({ top: savedScrollY.value, behavior: 'auto' })
        })
    }

    const goToPage = (page, { saveScroll = false, resetScroll = false } = {}) => {
        if (saveScroll) {
            store.setSavedScrollY(window.scrollY)
        }

        store.setCurrentPage(page)

        if (resetScroll) {
            nextTick(() => {
                window.scrollTo({ top: 0, behavior: 'auto' })
            })
        }
    }

    const selectZoneFromSidebar = (zone) => {
        filterZone.value = zone
        store.clearSelection()
        goHome()
        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const goSettingsFromSidebar = () => {
        store.setCurrentPage(APP_PAGES.SETTINGS)
        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const goPageFromSidebar = (page) => {
        store.setCurrentPage(page)
        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const returnToSidebar = () => {
        isReturningToSidebar.value = true
        store.setCurrentPage(APP_PAGES.HOME)

        nextTick(() => {
            setTimeout(() => {
                openSidebarSafe()
                setTimeout(() => {
                    isReturningToSidebar.value = false
                }, 500)
            }, 50)
        })
    }

    const handleNavigateFromToBuyList = (page) => {
        if (page === 'sidebar') {
            returnToSidebar()
            return
        }

        if (page === 'shopping-cart') {
            store.setCurrentPage(APP_PAGES.SHOPPING_CART)
        }
    }

    const handleNavigateFromCart = (page) => {
        if (page === 'sidebar') {
            returnToSidebar()
            return
        }

        if (page === 'to-buy') {
            store.setCurrentPage(APP_PAGES.TO_BUY_LIST)
        }
    }

    return {
        pages: APP_PAGES,
        currentPage,
        previousPage,
        savedScrollY,
        showScrollTop,
        previewImageUrl,
        isSelectionMode,
        selectedHomeIds,
        toggleSidebar,
        openPreview,
        closePreview,
        scrollToTop,
        initScrollListener,
        disposeScrollListener,
        goHome,
        goToPage,
        selectZoneFromSidebar,
        goSettingsFromSidebar,
        goPageFromSidebar,
        handleNavigateFromToBuyList,
        handleNavigateFromCart
    }
}
