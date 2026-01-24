import { ref, nextTick } from 'vue'
import * as bootstrap from 'bootstrap'

/**
 * 頁面導航和 Bootstrap UI 控制的 composable
 */
export function useNavigation() {
    // 頁面狀態
    const currentPage = ref("home")
    const previousPage = ref("home")
    const savedScrollY = ref(0)
    const showScrollTop = ref(false)
    const isReturningToSidebar = ref(false)

    // ==================== Bootstrap 清理 ====================

    const cleanupBackdrops = () => {
        document.querySelectorAll('.offcanvas-backdrop').forEach(el => el.remove())
        document.body.classList.remove('modal-open')
        document.body.style.removeProperty('overflow')
        document.body.style.removeProperty('padding-right')

        const sidebarEl = document.getElementById('sidebar')
        if (sidebarEl) {
            const inst = bootstrap.Offcanvas.getInstance(sidebarEl)
            if (inst) {
                try { inst.hide() } catch (e) { }
            }
            sidebarEl.classList.remove('show')
            sidebarEl.setAttribute('aria-hidden', 'true')
            sidebarEl.removeAttribute('aria-modal')
            sidebarEl.removeAttribute('role')
        }
    }

    // ==================== Sidebar 控制 ====================

    const toggleSidebar = () => {
        const el = document.getElementById("sidebar")
        if (el) {
            const inst = bootstrap.Offcanvas.getOrCreateInstance(el)
            inst.toggle()
        }
    }

    const openSidebarSafe = () => {
        const el = document.getElementById("sidebar")
        if (el) {
            const inst = bootstrap.Offcanvas.getOrCreateInstance(el)
            inst.show()
        }
    }

    // ==================== Modal 控制 ====================

    const showModal = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const modal = new bootstrap.Modal(el)
            modal.show()
        }
    }

    const hideModal = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const inst = bootstrap.Modal.getInstance(el)
            if (inst) inst.hide()
        }
    }

    // ==================== 導航方法 ====================

    const goHome = () => {
        currentPage.value = "home"
        nextTick(() => {
            window.scrollTo({ top: savedScrollY.value, behavior: 'instant' })
        })
    }

    const goToPage = (page, saveScroll = true) => {
        if (saveScroll) {
            savedScrollY.value = window.scrollY
        }
        currentPage.value = page
        nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    }

    const goPageFromSidebar = (page) => {
        currentPage.value = page
        setTimeout(cleanupBackdrops, 100)
    }

    const goSettingsFromSidebar = () => {
        currentPage.value = "settings"
        setTimeout(cleanupBackdrops, 100)
    }

    const returnToSidebar = () => {
        isReturningToSidebar.value = true
        currentPage.value = 'home'
        nextTick(() => {
            setTimeout(() => {
                openSidebarSafe()
                setTimeout(() => { isReturningToSidebar.value = false }, 500)
            }, 50)
        })
    }

    // ==================== Scroll ====================

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const initScrollListener = () => {
        window.addEventListener('scroll', () => {
            showScrollTop.value = window.scrollY > 300
        })
    }

    return {
        // State
        currentPage,
        previousPage,
        savedScrollY,
        showScrollTop,
        isReturningToSidebar,

        // Bootstrap
        cleanupBackdrops,
        toggleSidebar,
        openSidebarSafe,
        showModal,
        hideModal,

        // Navigation
        goHome,
        goToPage,
        goPageFromSidebar,
        goSettingsFromSidebar,
        returnToSidebar,

        // Scroll
        scrollToTop,
        initScrollListener
    }
}
