import { ref, nextTick } from 'vue'
import * as bootstrap from 'bootstrap'

/**
 * Bootstrap UI 元件控制的 composable
 */
export function useBootstrap() {
    // Toast 狀態
    const toastMessage = ref("")
    const toastEl = ref(null)

    /**
     * 顯示 Toast 訊息
     */
    const showToast = (msg) => {
        toastMessage.value = msg
        nextTick(() => {
            if (toastEl.value) {
                const t = bootstrap.Toast.getOrCreateInstance(toastEl.value)
                t.show()
            }
        })
    }

    /**
     * 顯示 Modal
     */
    const showModal = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const modal = new bootstrap.Modal(el)
            modal.show()
        }
    }

    /**
     * 隱藏 Modal
     */
    const hideModal = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const inst = bootstrap.Modal.getInstance(el)
            if (inst) inst.hide()
        }
    }

    /**
     * 切換 Offcanvas
     */
    const toggleOffcanvas = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const inst = bootstrap.Offcanvas.getOrCreateInstance(el)
            inst.toggle()
        }
    }

    /**
     * 顯示 Offcanvas
     */
    const showOffcanvas = (id) => {
        const el = document.getElementById(id)
        if (el) {
            const inst = bootstrap.Offcanvas.getOrCreateInstance(el)
            inst.show()
        }
    }

    /**
     * 強力清理所有殘留 backdrop 與鎖定狀態
     */
    const cleanupBackdrops = () => {
        // 移除所有 backdrop 元素
        document.querySelectorAll('.offcanvas-backdrop').forEach(el => el.remove())
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove())

        // 解鎖 body
        document.body.classList.remove('modal-open')
        document.body.style.removeProperty('overflow')
        document.body.style.removeProperty('padding-right')
    }

    /**
     * 清理特定 sidebar 的狀態
     */
    const cleanupSidebar = (sidebarId = 'sidebar') => {
        cleanupBackdrops()

        const sidebarEl = document.getElementById(sidebarId)
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

    return {
        // Toast
        toastMessage,
        toastEl,
        showToast,

        // Modal
        showModal,
        hideModal,

        // Offcanvas
        toggleOffcanvas,
        showOffcanvas,

        // Cleanup
        cleanupBackdrops,
        cleanupSidebar
    }
}
