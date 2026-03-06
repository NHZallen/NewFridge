<template>
  <div class="container-fluid px-3 py-3" v-cloak>
    
    <!-- 圖片預覽層 -->
    <div v-if="previewImageUrl" class="image-preview-overlay" @click="closePreview">
      <button class="preview-close"><i class="bi bi-x-circle"></i></button>
      <img :src="previewImageUrl" class="preview-img" @click.stop loading="lazy">
    </div>

    <!-- 初始設定畫面 -->
    <SetupScreen 
      v-if="!isConfigured"
      v-model:inputConfigStr="inputConfigStr"
      v-model:inputUserName="inputUserName"
      :setupError="setupError"
      :isSettingUp="isSettingUp"
      @submit="saveInitialConfig"
    />

    <!-- 主應用程式 -->
    <template v-else>
      <!-- 離線警告橫幅 -->
      <div v-if="!isOnline" class="offline-banner">
        <i class="bi bi-wifi-off me-2"></i>
        目前無網路連線，部分功能已停用
      </div>

      <!-- 登入提示 (Login Prompt) -->
      <div v-if="!currentUser && !isLoading" class="d-flex flex-column align-items-center justify-content-center vh-100 text-center p-4">
          <div class="mb-4">
              <i class="bi bi-shield-lock display-1 text-primary"></i>
          </div>
          <h2 class="mb-3 fw-bold">存取權限驗證</h2>
          <p class="text-muted mb-4 lead">
              為了保護您的資料安全，我們已升級安全規則。<br>
              請登入您的 Google 帳號以繼續使用。
          </p>
          <button class="btn btn-lg btn-primary rounded-pill px-5 py-3 shadow-lg" @click="linkGoogleAccount">
              <i class="bi bi-google me-2"></i> 使用 Google 帳號登入
          </button>
          <div class="mt-4 text-muted small">
              <i class="bi bi-info-circle me-1"></i> 僅用於驗證身分，不會存取您的個人資料
          </div>
      </div>

      <!-- HOME PAGE -->
      <HomeView
        v-else-if="!isLoading && currentPage===pages.HOME"
        :filtered-items="filteredItems"
        v-model:filter-zone="filterZone"
        v-model:search-text="searchText"
        :family-settings="familySettings"
        v-model:is-selection-mode="isSelectionMode"
        v-model:selected-home-ids="selectedHomeIds"
        :show-scroll-top="showScrollTop"
        @edit="goToEditPage"
        @take-out="goToTakeOutPage"
        @delete-selected="handleDeleteSelectedNoStock"
        @add-batch-to-buy="addBatchToBuy"
        @add-page="goToAddPage"
        @open-preview="openPreview"
        @scroll-to-top="scrollToTop"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- ADD / EDIT PAGE -->
      <ItemForm
        v-if="!isLoading && (currentPage===pages.ADD || currentPage===pages.EDIT)"
        :mode="currentPage"
        :initial-item="newItem"
        :all-items="items"
        :family-settings="familySettings"
        :pending-purchase-original-id="pendingPurchaseOriginalId"
        @cancel="goHome"
        @submit-success="goHome"
        @delete-item="handleDeleteItem"
        @update-pending-id="updatePendingPurchaseId"
        @show-error="showToast($event, 'error')"
      />
      
      <!-- TO BUY LIST PAGE -->
      <ToBuyListPage
        v-if="!isLoading && currentPage===pages.TO_BUY_LIST"
        :items="items"
        @navigate="handleNavigateFromToBuyList"
        @show-error="showToast($event, 'error')"
      />

      <!-- SHOPPING CART PAGE -->
      <ShoppingCartPage
        v-if="!isLoading && currentPage===pages.SHOPPING_CART"
        :items="items"
        @navigate="handleNavigateFromCart"
        @start-purchase="startPurchase"
        @show-error="showToast($event, 'error')"
      />

      <!-- TAKE OUT PAGE -->
      <TakeOutPage
        v-if="!isLoading && currentPage===pages.TAKE_OUT"
        :item="itemToDelete"
        :maxTakeOut="maxTakeOut"
        v-model:takeOutAmount="takeOutAmount"
        @cancel="goHome"
        @submit-success="goHome"
        @show-error="showToast($event, 'error')"
      />

      <!-- SETTINGS PAGE -->
      <SettingsPage
        v-if="!isLoading && currentPage===pages.SETTINGS"
        :familySettings="familySettings"
        :currentUserName="currentUserName"
        :currentUser="currentUser"
        :appVersion="appVersion"
        :latestVersion="latestVersion"
        :updateLogs="updateLogs"
        :settings="settings"
        @go-home="goHome"
        @link-google="linkGoogleAccount"
        @unlink-google="unlinkGoogleAccount"
        @save-family-name="saveFamilyName"
        @edit-user-name="startEditUserName"
        @show-update-modal="showUpdateModal(true)"
        @reset-app="resetApp"
        @update:settings="handleSettingsChange"
        @show-error="showToast($event, 'error')"
      />

      <!-- UPDATE INFO PAGE -->
      <UpdateInfoPage
        v-if="!isLoading && currentPage===pages.UPDATE_INFO"
        :latestLog="latestLog"
        @close="closeUpdatePage"
      />

      <!-- 讀取中畫面 -->
      <div v-if="isLoading" class="loading-mask">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p class="text-muted fw-bold">正在同步 {{ familySettings.familyName || '家庭' }} 資料...</p>
      </div>

      <!-- 左側邊欄 -->
      <SidebarMenu
        :currentUserName="currentUserName"
        :zoneStats="zoneStats"
        :toBuyCount="toBuyList.length"
        :cartCount="cartList.length"
        :appVersion="appVersion"
        @select-zone="selectZoneFromSidebar"
        @go-to-page="goPageFromSidebar"
        @go-settings="goSettingsFromSidebar"
      />

      <!-- 編輯使用者名稱視窗 -->
      <div class="modal fade" id="editNameModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">修改我的名稱</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="text" class="form-control" v-model="editUserNameTemp" placeholder="輸入新名稱">
              <div class="text-danger small mt-2" v-if="nameEditError">{{ nameEditError }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary rounded-pill w-100" @click="confirmEditUserName">儲存修改</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" style="z-index: 1090">
        <div id="liveToast" 
             class="toast align-items-center border-0 shadow-lg" 
             :class="{
               'bg-success text-white': toastType === 'success',
               'bg-warning text-dark': toastType === 'warning',
               'bg-danger text-white': toastType === 'error'
             }"
             role="alert" aria-live="assertive" aria-atomic="true" ref="toastEl" data-bs-delay="2500">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi me-2" :class="{
                'bi-check-circle-fill': toastType === 'success',
                'bi-exclamation-triangle-fill': toastType === 'warning',
                'bi-x-circle-fill': toastType === 'error'
              }"></i>{{ toastMessage }}
            </div>
            <button type="button" 
                    class="btn-close me-2 m-auto" 
                    :class="{'btn-close-white': toastType !== 'warning'}"
                    data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>
      
    </template>

  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { APP_VERSION } from './utils/constants.js'
import { useBootstrap } from './composables/useBootstrap'
import { useFirebase } from './composables/useFirebase'
import { useFamilyData } from './composables/useFamilyData'
import { useNavigation } from './composables/useNavigation'
import { useAppSettings } from './composables/useAppSettings'
import { useInventoryActions } from './composables/useInventoryActions'
import { useMainStore } from './stores/index.js'
import { createDraftFromItem, createEmptyItemDraft, createPurchaseDraft } from './utils/itemDrafts'

import HomeView from './components/HomeView.vue'
import SidebarMenu from './components/SidebarMenu.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'

const asyncOptions = (loader) => ({
  loader,
  loadingComponent: LoadingSpinner,
  delay: 50,
  timeout: 10000
})

const SetupScreen = defineAsyncComponent(asyncOptions(() => import('./components/SetupScreen.vue')))
const ItemForm = defineAsyncComponent(asyncOptions(() => import('./components/ItemForm.vue')))
const TakeOutPage = defineAsyncComponent(asyncOptions(() => import('./components/TakeOutPage.vue')))
const UpdateInfoPage = defineAsyncComponent(asyncOptions(() => import('./components/UpdateInfoPage.vue')))
const ToBuyListPage = defineAsyncComponent(asyncOptions(() => import('./components/ToBuyListPage.vue')))
const ShoppingCartPage = defineAsyncComponent(asyncOptions(() => import('./components/ShoppingCartPage.vue')))
const SettingsPage = defineAsyncComponent(asyncOptions(() => import('./components/SettingsPage.vue')))

const store = useMainStore()
const {
  items,
  familySettings,
  currentUser,
  currentUserName,
  isLoading,
  isOnline,
  searchText,
  filterZone,
  filteredItems,
  zoneStats,
  toBuyList,
  cartList
} = storeToRefs(store)

const {
  toastMessage,
  toastType,
  toastEl,
  showToast,
  showModal,
  hideModal,
  toggleOffcanvas,
  showOffcanvas,
  cleanupSidebar
} = useBootstrap()

const {
  isConfigured,
  initFirebase,
  checkConfig,
  linkGoogleAccount: firebaseLinkGoogle,
  unlinkGoogleAccount: firebaseUnlinkGoogle,
  resetApp
} = useFirebase()

const {
  setupError,
  isSettingUp,
  initFamilyData,
  updateFamilyName,
  updateUserName,
  stopListeners
} = useFamilyData()

const {
  pages,
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
} = useNavigation({
  cleanupSidebar,
  toggleOffcanvas,
  showOffcanvas
})

const {
  settings,
  updateLogs,
  latestVersion,
  latestLog,
  loadSettings,
  handleSettingsChange,
  showUpdateModal,
  closeUpdatePage
} = useAppSettings({
  currentPage,
  previousPage,
  setCurrentPage: store.setCurrentPage,
  setPreviousPage: store.setPreviousPage
})

const {
  deleteItemPermanently,
  deleteSelectedNoStock,
  addSelectedToBuy
} = useInventoryActions({ showToast })

const appVersion = APP_VERSION
const inputConfigStr = ref("")
const inputUserName = ref("")
const itemToDelete = ref(null)
const takeOutAmount = ref(1)
const maxTakeOut = ref(1)
const newItem = ref(createEmptyItemDraft())
const pendingPurchaseOriginalId = ref(null)
const editUserNameTemp = ref("")
const nameEditError = ref("")

const prefetchComponents = () => {
  const components = [
    () => import('./components/SetupScreen.vue'),
    () => import('./components/ItemForm.vue'),
    () => import('./components/TakeOutPage.vue'),
    () => import('./components/UpdateInfoPage.vue'),
    () => import('./components/ToBuyListPage.vue'),
    () => import('./components/ShoppingCartPage.vue'),
    () => import('./components/SettingsPage.vue')
  ]

  const startPrefetch = () => {
    components.forEach((importFn) => {
      importFn().catch(() => {})
    })
  }

  if (window.requestIdleCallback) {
    window.requestIdleCallback(startPrefetch, { timeout: 5000 })
  } else {
    setTimeout(startPrefetch, 3000)
  }
}

const saveInitialConfig = async () => {
  setupError.value = ""

  if (!inputConfigStr.value.trim()) {
    setupError.value = "請輸入設定內容"
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

    const jsonMatch = cleanStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanStr = jsonMatch[0]
    }

    let configObj
    try {
      configObj = JSON.parse(cleanStr)
    } catch {
      try {
        let processed = cleanStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        processed = processed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        processed = processed.replace(/'/g, '"')
        processed = processed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
        configObj = JSON.parse(processed)
      } catch {
        throw new Error("無法解析設定內容，請確保格式接近 JSON")
      }
    }

    if (!configObj?.projectId) {
      throw new Error("無效的設定內容，請確認格式為 JSON")
    }

    await initFirebase(configObj)
    await initFamilyData(inputUserName.value.trim())
    localStorage.setItem("fridge_firebase_config", JSON.stringify(configObj))
  } catch (error) {
    console.error(error)
    setupError.value = `設定失敗：${error.message || "請檢查代碼格式(建議使用標準 JSON)"}`
  } finally {
    isSettingUp.value = false
  }
}

const linkGoogleAccount = async () => {
  const result = await firebaseLinkGoogle()
  if (result.success) {
    showToast("綁定成功！")
    return
  }

  showToast(`綁定失敗：${result.error}`, 'error')
}

const unlinkGoogleAccount = async () => {
  const result = await firebaseUnlinkGoogle()
  if (result.success) {
    showToast("已解除綁定")
    return
  }

  showToast("解除綁定失敗", 'error')
}

const saveFamilyName = async (newName) => {
  const success = await updateFamilyName(newName)
  if (!success) {
    showToast("更新失敗", 'error')
  }
}

const startEditUserName = (name) => {
  editUserNameTemp.value = name
  nameEditError.value = ""
  showModal('editNameModal')
}

const confirmEditUserName = async () => {
  const newName = editUserNameTemp.value.trim()
  const oldName = currentUserName.value

  if (!newName) {
    nameEditError.value = "名稱不能為空"
    return
  }

  if (newName === oldName) {
    hideModal('editNameModal')
    return
  }

  const success = await updateUserName(oldName, newName)
  if (success) {
    hideModal('editNameModal')
  } else {
    nameEditError.value = "更新失敗"
  }
}

const goToAddPage = () => {
  newItem.value = createEmptyItemDraft()
  pendingPurchaseOriginalId.value = null
  goToPage(pages.ADD, { saveScroll: true, resetScroll: true })
}

const goToEditPage = (item) => {
  newItem.value = createDraftFromItem(item)
  goToPage(pages.EDIT, { saveScroll: true, resetScroll: true })
}

const goToTakeOutPage = (item) => {
  itemToDelete.value = item
  maxTakeOut.value = Math.max(Number.parseInt(item.quantity, 10) || 0, 1)
  takeOutAmount.value = 1
  goToPage(pages.TAKE_OUT, { saveScroll: true, resetScroll: true })
}

const handleDeleteItem = async (id) => {
  await deleteItemPermanently(id, {
    onDeleted: () => {
      if (currentPage.value === pages.EDIT) {
        goHome()
      }
    }
  })
}

const handleDeleteSelectedNoStock = async () => {
  if (!selectedHomeIds.value.length) return

  if (!confirm(`確定要永久刪除選取的 ${selectedHomeIds.value.length} 項物品嗎？`)) {
    return
  }

  await deleteSelectedNoStock()
}

const addBatchToBuy = async () => {
  await addSelectedToBuy()
}

const updatePendingPurchaseId = (value) => {
  pendingPurchaseOriginalId.value = value
}

const startPurchase = (item) => {
  pendingPurchaseOriginalId.value = item.id
  newItem.value = createPurchaseDraft(item)
  goToPage(pages.ADD, { saveScroll: true, resetScroll: true })
}

onMounted(async () => {
  initScrollListener()
  loadSettings()
  showUpdateModal()

  const config = await checkConfig()
  if (config) {
    try {
      await initFirebase(config)
      const storedUser = localStorage.getItem("fridge_user_name")
      if (storedUser) {
        await initFamilyData(storedUser)
      }
    } catch (error) {
      console.error("Init Failed", error)
      isConfigured.value = false
    }
  }

  prefetchComponents()
})

onUnmounted(() => {
  disposeScrollListener()
  stopListeners()
  store.cleanupNetworkListeners()
})

watch(currentUser, async (user) => {
  if (!user) return

  const storedUser = localStorage.getItem("fridge_user_name")
  if (!storedUser) return

  try {
    await initFamilyData(storedUser)
  } catch (error) {
    console.error("Data init retry failed", error)
  }
}, { immediate: true })
</script>
