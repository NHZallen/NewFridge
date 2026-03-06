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
    const instantScrollTo = (top = 0) => {
        window.scrollTo(0, top)
    }
    const hideAppDuringScrollReset = () => {
        const appEl = document.getElementById('app')
        if (!appEl) return () => {}

        const previousVisibility = appEl.style.visibility
        const previousPointerEvents = appEl.style.pointerEvents

        appEl.style.visibility = 'hidden'
        appEl.style.pointerEvents = 'none'

        return () => {
            requestAnimationFrame(() => {
                appEl.style.visibility = previousVisibility
                appEl.style.pointerEvents = previousPointerEvents
            })
        }
    }

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
        const revealApp = hideAppDuringScrollReset()

        store.setCurrentPage(APP_PAGES.HOME)
        store.clearPreviewImage()

        nextTick(() => {
            instantScrollTo(savedScrollY.value)
            revealApp()
        })
    }

    const goToPage = (page, { saveScroll = false, resetScroll = false } = {}) => {
        const revealApp = resetScroll ? hideAppDuringScrollReset() : () => {}

        if (saveScroll) {
            store.setSavedScrollY(window.scrollY)
        }

        store.setCurrentPage(page)

        if (resetScroll) {
            nextTick(() => {
                instantScrollTo(0)
                revealApp()
            })
            return
        }

        revealApp()
    }

    const selectZoneFromSidebar = (zone) => {
        const revealApp = hideAppDuringScrollReset()

        filterZone.value = zone
        store.clearSelection()
        store.setCurrentPage(APP_PAGES.HOME)
        store.clearPreviewImage()

        nextTick(() => {
            instantScrollTo(0)
            revealApp()
        })

        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const goSettingsFromSidebar = () => {
        goToPage(APP_PAGES.SETTINGS, {
            saveScroll: currentPage.value === APP_PAGES.HOME,
            resetScroll: true
        })
        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const goPageFromSidebar = (page) => {
        goToPage(page, {
            saveScroll: currentPage.value === APP_PAGES.HOME,
            resetScroll: page !== APP_PAGES.HOME
        })
        setTimeout(() => cleanupSidebar('sidebar'), 100)
    }

    const returnToSidebar = () => {
        isReturningToSidebar.value = true
        const revealApp = hideAppDuringScrollReset()
        store.setCurrentPage(APP_PAGES.HOME)

        nextTick(() => {
            instantScrollTo(0)
            revealApp()
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
            goToPage(APP_PAGES.SHOPPING_CART, { resetScroll: true })
        }
    }

    const handleNavigateFromCart = (page) => {
        if (page === 'sidebar') {
            returnToSidebar()
            return
        }

        if (page === 'to-buy') {
            goToPage(APP_PAGES.TO_BUY_LIST, { resetScroll: true })
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
