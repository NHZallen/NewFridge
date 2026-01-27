<template>
  <div class="container-fluid px-3 py-3" v-cloak>
    
    <!-- 圖片預覽層 -->
    <div v-if="previewImageUrl" class="image-preview-overlay" @click="closePreview">
      <button class="preview-close"><i class="bi bi-x-circle"></i></button>
      <img :src="previewImageUrl" class="preview-img" @click.stop>
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
      <!-- HOME PAGE -->
      <HomeView
        v-if="!isLoading && currentPage==='home'"
        :filtered-items="filteredItems"
        v-model:filter-zone="filterZone"
        v-model:search-text="searchText"
        :family-settings="familySettings"
        v-model:is-selection-mode="isSelectionMode"
        v-model:selected-home-ids="selectedHomeIds"
        :show-scroll-top="showScrollTop"
        @edit="goToEditPage"
        @take-out="goToTakeOutPage"
        @delete-selected="deleteSelectedNoStock"
        @add-batch-to-buy="addBatchToBuy"
        @add-page="goToAddPage"
        @open-preview="openPreview"
        @scroll-to-top="scrollToTop"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- ADD / EDIT PAGE -->
      <ItemForm
        v-if="!isLoading && (currentPage==='add' || currentPage==='edit')"
        :mode="currentPage"
        :initial-item="newItem"
        :all-items="items"
        :family-settings="familySettings"
        :pending-purchase-original-id="pendingPurchaseOriginalId"
        @cancel="goHome"
        @submit-success="goHome"
        @delete-item="deleteItemPermanently"
        @update-pending-id="(val) => pendingPurchaseOriginalId = val"
      />
      
      <!-- TO BUY LIST PAGE -->
      <ToBuyListPage
        v-if="!isLoading && currentPage==='to-buy-list'"
        :items="items"
        @navigate="handleNavigateFromToBuyList"
      />

      <!-- SHOPPING CART PAGE -->
      <ShoppingCartPage
        v-if="!isLoading && currentPage==='shopping-cart'"
        :items="items"
        @navigate="handleNavigateFromCart"
        @start-purchase="startPurchase"
      />

      <!-- TAKE OUT PAGE -->
      <TakeOutPage
        v-if="!isLoading && currentPage==='takeout'"
        :item="itemToDelete"
        :maxTakeOut="maxTakeOut"
        v-model:takeOutAmount="takeOutAmount"
        @cancel="goHome"
        @confirm="confirmTakeOutAction"
      />

      <!-- SETTINGS PAGE -->
      <SettingsPage
        v-if="!isLoading && currentPage==='settings'"
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
      />

      <!-- UPDATE INFO PAGE -->
      <UpdateInfoPage
        v-if="!isLoading && currentPage==='update-info'"
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
        <div id="liveToast" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" ref="toastEl">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi bi-check-circle-fill me-2"></i>{{ toastMessage }}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>
      
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { deleteImage, cleanupUnusedImages } from './utils/storageUtils.js'
import { storeToRefs } from 'pinia'

import { LATEST_VERSION, UPDATE_LOGS } from './update-logs.js'
import { APP_VERSION } from './utils/constants'
import { getTodayStr, getDays } from './utils/dateUtils'
import { isNoExpiry } from './utils/itemHelpers'
import { recalculateItemFromBatches } from './utils/inventoryUtils.js'
import { initSecurity } from './utils/security'

// Composables
import { useBootstrap } from './composables/useBootstrap'
import { useFirebase } from './composables/useFirebase'
import { useFamilyData } from './composables/useFamilyData'
import { useMainStore } from './stores/index.js'

// Components
import HomeView from './components/HomeView.vue'
import SidebarMenu from './components/SidebarMenu.vue'

import LoadingSpinner from './components/LoadingSpinner.vue'

// Helper for Async Components with Loading State
const asyncOptions = (loader) => ({
  loader,
  loadingComponent: LoadingSpinner,
  delay: 200, // Show loading spinner if loading takes more than 200ms
  timeout: 10000 // Timeout after 10000ms
})

// Components - Async Imports for Performance
const SetupScreen = defineAsyncComponent(asyncOptions(() => import('./components/SetupScreen.vue')))
const ItemForm = defineAsyncComponent(asyncOptions(() => import('./components/ItemForm.vue')))
const TakeOutPage = defineAsyncComponent(asyncOptions(() => import('./components/TakeOutPage.vue')))
const UpdateInfoPage = defineAsyncComponent(asyncOptions(() => import('./components/UpdateInfoPage.vue')))

const ToBuyListPage = defineAsyncComponent(asyncOptions(() => import('./components/ToBuyListPage.vue')))
const ShoppingCartPage = defineAsyncComponent(asyncOptions(() => import('./components/ShoppingCartPage.vue')))
const SettingsPage = defineAsyncComponent(asyncOptions(() => import('./components/SettingsPage.vue')))

// Init Composables & Store
const store = useMainStore()
const {
  items, 
  familySettings, 
  currentUser: storeCurrentUser,
  isLoading,
  searchText,
  filterZone,
  filteredItems,
  zoneStats,
  toBuyList,
  cartList
} = storeToRefs(store)

const { 
  toastMessage, 
  toastEl, 
  showToast, 
  showModal, 
  hideModal, 
  toggleOffcanvas, 
  showOffcanvas,
  cleanupSidebar 
} = useBootstrap()

const {
  db,
  currentUser,
  isConfigured,
  initFirebase,
  checkConfig,
  linkGoogleAccount: firebaseLinkGoogle,
  unlinkGoogleAccount: firebaseUnlinkGoogle,
  resetApp
} = useFirebase()

const {
  items: rawItems,
  familySettings: rawFamilySettings,
  isLoading: rawIsLoading,
  currentUserName,
  setupError,
  isSettingUp,
  initFamilyData,
  updateFamilyName,
  updateUserName
} = useFamilyData()

// Sync Composables -> Store
watch(rawItems, (val) => { store.setItems(val) }, { deep: true, immediate: true })
watch(rawFamilySettings, (val) => { store.setFamilySettings(val) }, { deep: true, immediate: true })
watch(currentUser, (val) => { store.setCurrentUser(val) }, { immediate: true })
watch(rawIsLoading, (val) => { store.setLoading(val) }, { immediate: true })

const appVersion = APP_VERSION

// ==================== 狀態變數 ====================

// 設定相關
const inputConfigStr = ref("")
const inputUserName = ref("")

// UI 狀態
const currentPage = ref("home")
const previousPage = ref("home")
const savedScrollY = ref(0)
const showScrollTop = ref(false)
const previewImageUrl = ref(null)

// 篩選
// const searchText = ref("")
// const filterZone = ref("all")

// 取出物品
const itemToDelete = ref(null)
const takeOutAmount = ref(1)
const maxTakeOut = ref(1)

// 編輯表單
const newItem = ref({
  id: null,
  name: "",
  quantity: "1",
  storedDate: getTodayStr(),
  expiryDate: "",
  noExpiry: false,
  image: null,
  zone: "cold",
  owners: ['全家'],
  useExistingImage: false,
  shoppingStatus: null
})
const pendingPurchaseOriginalId = ref(null)

// 多選模式
const isSelectionMode = ref(false)
const selectedHomeIds = ref([])

// 設定頁面
const editUserNameTemp = ref("")
const nameEditError = ref("")
const settings = ref({ updateNotifyEnabled: true })
const updateLogs = ref(UPDATE_LOGS)
const latestVersion = ref(LATEST_VERSION)
const latestLog = computed(() => updateLogs.value.find(l => l.version === latestVersion.value) || updateLogs.value[0] || null)

// ==================== 方法 ====================

// 初始化流程
onMounted(async () => {
    initSecurity()
    loadSettings()
    showUpdateModal()
    
    window.addEventListener('scroll', () => {
      showScrollTop.value = window.scrollY > 300
    })

    const config = await checkConfig()
    
    if (config) {
        // 已有設定，初始化 Firebase
        try {
            await initFirebase(config)
            
            // 讀取 User Name
            const storedUser = localStorage.getItem("fridge_user_name")
            if (storedUser) {
                await initFamilyData(storedUser)
            }
        } catch (e) {
             console.error("Init Failed", e)
             isConfigured.value = false
        }
    }
})

// 保存初始設定 (SetupScreen)
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

    await initFirebase(configObj)
    await initFamilyData(inputUserName.value.trim())
    
    localStorage.setItem("fridge_firebase_config", JSON.stringify(configObj))
    
  } catch (e) {
    console.error(e)
    setupError.value = "設定失敗：" + (e.message || "請檢查代碼格式或網路連線");
  } finally {
    isSettingUp.value = false
  }
}

// Google Auth Wrappers
const linkGoogleAccount = async () => {
    const res = await firebaseLinkGoogle()
    if (res.success) showToast("綁定成功！")
    else alert("綁定失敗：" + res.error)
}

const unlinkGoogleAccount = async () => {
    const res = await firebaseUnlinkGoogle()
    if (res.success) showToast("已解除綁定")
    else alert("解除綁定失敗")
}

// Rename Wrappers
const saveFamilyName = async (newName) => {
    const success = await updateFamilyName(newName)
    if (!success) alert("更新失敗")
}

const startEditUserName = (name) => {
  editUserNameTemp.value = name
  nameEditError.value = ""
  showModal('editNameModal')
}

const confirmEditUserName = async () => {
  const newName = editUserNameTemp.value.trim()
  const oldName = currentUserName.value
  
  if (!newName) { nameEditError.value = "名稱不能為空"; return }
  if (newName === oldName) { hideModal('editNameModal'); return }
  
  const success = await updateUserName(oldName, newName)
  if (success) {
      hideModal('editNameModal')
  } else {
      nameEditError.value = "更新失敗"
  }
}


// Settings Logic
const handleSettingsChange = (newSettings) => {
  settings.value = newSettings
  saveSettings()
}

const loadSettings = () => {
  const saved = localStorage.getItem("fridge_settings_v1")
  if (saved) {
    try {
      const obj = JSON.parse(saved)
      settings.value = { ...settings.value, ...obj }
    } catch (e) {}
  }
}

const saveSettings = () => {
  localStorage.setItem("fridge_settings_v1", JSON.stringify(settings.value))
}


// 版本更新
const showUpdateModal = (force = false) => {
  if (force) {
    previousPage.value = currentPage.value
    currentPage.value = 'update-info'
    return
  }
  
  if (!settings.value.updateNotifyEnabled) return
  
  const lastSeen = localStorage.getItem("lastSeenUpdateVersion")
  
  if (lastSeen === null) {
    localStorage.setItem("lastSeenUpdateVersion", APP_VERSION)
    return
  }

  if (lastSeen === APP_VERSION) return

  previousPage.value = currentPage.value
  currentPage.value = 'update-info'
}

const closeUpdatePage = () => {
  localStorage.setItem("lastSeenUpdateVersion", latestVersion.value)
  if (previousPage.value === 'settings') {
    currentPage.value = 'settings'
  } else {
    currentPage.value = 'home'
  }
}

// 導航
const isReturningToSidebar = ref(false)

watch(currentPage, () => {
  if (isReturningToSidebar.value) return
  cleanupSidebar('sidebar')
  setTimeout(() => cleanupSidebar('sidebar'), 350)
})

const toggleSidebar = () => toggleOffcanvas('sidebar')
const openSidebarSafe = () => showOffcanvas('sidebar')

const selectZoneFromSidebar = (zone) => {
  filterZone.value = zone
  isSelectionMode.value = false
  selectedHomeIds.value = []
  goHome()
  setTimeout(() => cleanupSidebar('sidebar'), 100)
}

const goSettingsFromSidebar = () => {
  currentPage.value = "settings"
  setTimeout(() => cleanupSidebar('sidebar'), 100)
}

const goPageFromSidebar = (page) => {
  currentPage.value = page
  setTimeout(() => cleanupSidebar('sidebar'), 100)
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

const handleNavigateFromToBuyList = (page) => {
  if (page === 'sidebar') {
    returnToSidebar()
  } else if (page === 'shopping-cart') {
    currentPage.value = 'shopping-cart'
  }
}

const handleNavigateFromCart = (page) => {
  if (page === 'sidebar') {
    returnToSidebar()
  } else if (page === 'to-buy') {
    currentPage.value = 'to-buy-list'
  }
}

const goHome = () => {
  currentPage.value = "home"
  previewImageUrl.value = null
  nextTick(() => {
    window.scrollTo({ top: savedScrollY.value, behavior: 'instant' })
  })
}

const goToAddPage = () => {
  savedScrollY.value = window.scrollY
  newItem.value = {
    id: null,
    name: "",
    quantity: "1",
    storedDate: getTodayStr(),
    expiryDate: "",
    noExpiry: false,
    image: null,
    zone: "cold",
    owners: ['全家'],
    useExistingImage: false,
    shoppingStatus: null
  }
  pendingPurchaseOriginalId.value = null
  currentPage.value = "add"
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

const goToEditPage = (item) => {
  savedScrollY.value = window.scrollY
  newItem.value = {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    storedDate: item.storedDate,
    expiryDate: item.expiryDate,
    noExpiry: item.noExpiry,
    image: item.image,
    zone: item.zone || 'cold',
    owners: item.owners || ['全家'],
    useExistingImage: false,
    shoppingStatus: item.shoppingStatus || null
  }
  currentPage.value = "edit"
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

const goToTakeOutPage = (item) => {
  savedScrollY.value = window.scrollY
  itemToDelete.value = item
  const qty = parseInt(item.quantity)
  maxTakeOut.value = (!isNaN(qty) && qty > 0) ? qty : 1
  takeOutAmount.value = 1
  currentPage.value = "takeout"
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

// 取出物品
const confirmTakeOutAction = async () => {
  if (!db.value || !itemToDelete.value) return

  const takeQty = parseInt(takeOutAmount.value)
  const currentQty = parseInt(itemToDelete.value.quantity)

  if (takeQty >= currentQty) {
    try {
      // --- Image Cleanup (Full Take Out) ---
      // Collect ALL images associated with this item
      const allImages = new Set();
      if (itemToDelete.value.image) allImages.add(itemToDelete.value.image);
      if (itemToDelete.value.batches) {
        itemToDelete.value.batches.forEach(b => {
          if (b.image) allImages.add(b.image);
        });
      }

      // Default to current main image
      let imageToKeep = itemToDelete.value.image;

      // Find the LATEST image from batches to be the new "Archive Photo"
      if (itemToDelete.value.batches && itemToDelete.value.batches.length > 0) {
          // Sort by addedAt desc (newest first)
          const sortedBatches = [...itemToDelete.value.batches].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
          const latestBatch = sortedBatches.find(b => b.image);
          
          if (latestBatch) {
              imageToKeep = latestBatch.image;
          }
      }
      
      const keepingImages = imageToKeep ? [imageToKeep] : [];
      await cleanupUnusedImages(allImages, keepingImages);
      // -------------------------------------
      // -------------------------------------

      await updateDoc(doc(db.value, "fridge_items", itemToDelete.value.id), {
        quantity: 0,
        batches: [],
        storedDate: "",
        expiryDate: "",
        noExpiry: true,
        image: imageToKeep || null, // Explicitly update the image to the latest one
        updatedAt: new Date()
      })
      goHome()
    } catch (e) {
      alert("更新失敗")
    }
    return
  }

  try {
    let batches = itemToDelete.value.batches ? [...itemToDelete.value.batches] : [{
      storedDate: itemToDelete.value.storedDate,
      expiryDate: itemToDelete.value.expiryDate,
      noExpiry: itemToDelete.value.noExpiry,
      quantity: currentQty,
      image: itemToDelete.value.image
    }]

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

    const result = recalculateItemFromBatches(newBatches, itemToDelete.value.owners)
    
    // --- Image Cleanup Logic ---
    // 1. Identify images in the OLD (original) batches
    const oldImages = new Set();
    itemToDelete.value.batches.forEach(b => {
        if (b.image) oldImages.add(b.image);
    });

    // 2. Identify images in the NEW (remaining) batches + Result Main Image
    const keepingImages = new Set();
    if (result.image) keepingImages.add(result.image);
    newBatches.forEach(b => {
        if (b.image) keepingImages.add(b.image);
    });

    // 3. Delete unused
    await cleanupUnusedImages(oldImages, keepingImages);
    // ---------------------------

    await updateDoc(doc(db.value, "fridge_items", itemToDelete.value.id), { ...result })
    
    goHome()
  } catch(e) {
    console.error(e)
    alert("更新失敗")
  }
}

// 刪除
const deleteItemPermanently = async (id) => {
  if(confirm("確定要永久刪除此物品嗎？此操作無法復原。")) {
    // --- Image Cleanup (Delete) ---
    const item = items.value.find(i => i.id === id);
    if (item) {
        const allImages = new Set();
        if (item.image) allImages.add(item.image);
        if (item.batches) {
            item.batches.forEach(b => {
                if (b.image) allImages.add(b.image);
            });
        }
        // Delete everything (keep nothing)
        await cleanupUnusedImages(allImages, []);
    }
    // ------------------------------

    await deleteDoc(doc(db.value, "fridge_items", id))
    if(currentPage.value === 'edit') goHome()
  }
}

const deleteSelectedNoStock = async () => {
  if(confirm(`確定要永久刪除選取的 ${selectedHomeIds.value.length} 項物品嗎？`)) {
    
    // --- Image Cleanup (Batch Delete) ---
    for (const id of selectedHomeIds.value) {
        const item = items.value.find(i => i.id === id);
        if (item) {
            const allImages = new Set();
            if (item.image) allImages.add(item.image);
            if (item.batches) {
                item.batches.forEach(b => {
                    if (b.image) allImages.add(b.image);
                });
            }
            // Fire and forget individually to avoid super long await if selection is huge, 
            // OR await all. Await all is safer.
            await cleanupUnusedImages(allImages, []);
        }
    }
    // ------------------------------------

    const promises = selectedHomeIds.value.map(id => deleteDoc(doc(db.value, "fridge_items", id)))
    await Promise.all(promises)
    selectedHomeIds.value = []
    isSelectionMode.value = false
  }
}

// 批次加入待買
const addBatchToBuy = async () => {
  const promises = selectedHomeIds.value.map(id => 
    updateDoc(doc(db.value, "fridge_items", id), { shoppingStatus: 'toBuy' })
  )
  await Promise.all(promises)
  showToast("已加入待購買清單")
  selectedHomeIds.value = []
  isSelectionMode.value = false
}

// 購物
const startPurchase = (item) => {
  pendingPurchaseOriginalId.value = item.id
  savedScrollY.value = window.scrollY
  newItem.value = {
    id: null,
    name: item.name,
    quantity: "1",
    storedDate: getTodayStr(),
    expiryDate: "",
    noExpiry: false,
    image: null,
    zone: item.zone || 'cold',
    owners: item.owners || ['全家'],
    useExistingImage: false,
    shoppingStatus: null
  }
  currentPage.value = "add"
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

// 預覽
const openPreview = (url) => { previewImageUrl.value = url }
const closePreview = () => { previewImageUrl.value = null }
const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }) }

watch(() => settings.value.updateNotifyEnabled, () => {
  saveSettings()
})
</script>
