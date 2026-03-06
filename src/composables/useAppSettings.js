import { computed, ref, watch } from 'vue'
import { LATEST_VERSION, UPDATE_LOGS } from '../update-logs'
import { APP_VERSION, APP_PAGES } from '../utils/constants'

export function useAppSettings({ currentPage, previousPage, setCurrentPage, setPreviousPage }) {
    const settings = ref({ updateNotifyEnabled: true })
    const updateLogs = ref(UPDATE_LOGS)
    const latestVersion = ref(LATEST_VERSION)

    const latestLog = computed(() => {
        return updateLogs.value.find((entry) => entry.version === latestVersion.value)
            || updateLogs.value[0]
            || null
    })

    const loadSettings = () => {
        const saved = localStorage.getItem("fridge_settings_v1")
        if (!saved) return

        try {
            const parsed = JSON.parse(saved)
            settings.value = { ...settings.value, ...parsed }
        } catch {
            // Ignore malformed local state and continue with defaults.
        }
    }

    const saveSettings = () => {
        localStorage.setItem("fridge_settings_v1", JSON.stringify(settings.value))
    }

    const handleSettingsChange = (newSettings) => {
        settings.value = newSettings
        saveSettings()
    }

    const showUpdateModal = (force = false) => {
        if (force) {
            setPreviousPage(currentPage.value)
            setCurrentPage(APP_PAGES.UPDATE_INFO)
            return
        }

        if (!settings.value.updateNotifyEnabled) return

        const lastSeen = localStorage.getItem("lastSeenUpdateVersion")

        if (lastSeen === null) {
            localStorage.setItem("lastSeenUpdateVersion", APP_VERSION)
            return
        }

        if (lastSeen === APP_VERSION) return

        setPreviousPage(currentPage.value)
        setCurrentPage(APP_PAGES.UPDATE_INFO)
    }

    const closeUpdatePage = () => {
        localStorage.setItem("lastSeenUpdateVersion", latestVersion.value)
        setCurrentPage(
            previousPage.value === APP_PAGES.SETTINGS
                ? APP_PAGES.SETTINGS
                : APP_PAGES.HOME
        )
    }

    watch(() => settings.value.updateNotifyEnabled, saveSettings)

    return {
        settings,
        updateLogs,
        latestVersion,
        latestLog,
        loadSettings,
        handleSettingsChange,
        showUpdateModal,
        closeUpdatePage
    }
}
