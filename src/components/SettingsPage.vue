<template>
  <div class="settings-page page-container">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <button class="btn btn-light border rounded-pill" @click="$emit('go-home')">
        <i class="bi bi-arrow-left"></i> 返回
      </button>
      <h5 class="fw-bold m-0">設定</h5>
      <div style="width: 74px;"></div>
    </div>

    <!-- 帳號綁定 Google -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-google text-danger"></i>
          <div class="fw-bold">帳號綁定</div>
        </div>
        
        <div v-if="!currentUser">
          <p class="text-muted small mb-3">連結 Google 帳號可確保資料更安全，並方便在不同裝置間登入。</p>
          <button class="btn btn-outline-dark w-100 rounded-pill d-flex align-items-center justify-content-center gap-2" @click="$emit('link-google')">
            <i class="bi bi-google"></i>
            連結 Google 帳號
          </button>
        </div>
        <div v-else>
          <div class="d-flex align-items-center gap-3 mb-3">
            <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="rounded-circle" style="width: 48px; height: 48px;">
            <div v-else class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
              {{ currentUser.email?.charAt(0).toUpperCase() }}
            </div>
            <div class="overflow-hidden">
              <div class="fw-bold text-truncate">{{ currentUser.displayName || 'Google 使用者' }}</div>
              <div class="text-muted small text-truncate">{{ currentUser.email }}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-danger rounded-pill w-100" @click="$emit('unlink-google')">
            解除綁定 (登出)
          </button>
        </div>
      </div>
    </div>



    <!-- 家庭設定 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-house-heart text-primary"></i>
          <div class="fw-bold">家庭名稱</div>
        </div>
        
        <div v-if="!isEditingFamilyName" class="d-flex justify-content-between align-items-center">
          <span class="fs-5 fw-bold">{{ familySettings.familyName }}</span>
          <button class="btn btn-sm btn-outline-secondary rounded-pill" @click="startEditFamilyName">
            <i class="bi bi-pencil"></i> 修改
          </button>
        </div>
        <div v-else class="input-group">
          <input type="text" class="form-control" v-model="editFamilyNameTemp" placeholder="輸入家庭名稱">
          <button class="btn btn-success" @click="saveFamilyName">儲存</button>
          <button class="btn btn-outline-secondary" @click="isEditingFamilyName = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 成員設定 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="bi bi-people text-primary"></i>
          <div class="fw-bold">家庭成員 ({{ familySettings.members.length }})</div>
        </div>
        <div class="text-muted small mb-3">只有您可以修改自己的名稱，修改後所有裝置會自動同步。</div>

        <div class="d-flex flex-column gap-3">
          <div v-for="member in familySettings.members" :key="member" class="member-row d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-person-circle text-secondary fs-4"></i>
              <div>
                <div class="fw-bold">{{ member }}</div>
                <div class="badge bg-primary" v-if="member === currentUserName">我</div>
              </div>
            </div>

            <button v-if="member === currentUserName" class="btn btn-sm btn-light border rounded-pill" @click="$emit('edit-user-name', member)">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本更新設定 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold"><i class="bi bi-bell text-primary me-1"></i> 版本更新通知</div>
            <div class="text-muted small">開啟後，若偵測到新版本，進入 App 會自動顯示更新資訊</div>
          </div>
          <div class="form-check form-switch m-0">
            <input 
              class="form-check-input" 
              type="checkbox" 
              id="updateNotifySwitch" 
              :checked="settings.updateNotifyEnabled"
              @change="$emit('update:settings', { ...settings, updateNotifyEnabled: $event.target.checked })"
            >
          </div>
        </div>

        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-outline-primary rounded-pill" @click="$emit('show-update-modal')">
            查看最新更新內容
          </button>
        </div>
      </div>
    </div>




    <!-- 版本資訊 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="fw-bold mb-2"><i class="bi bi-info-circle text-primary me-1"></i> 版本資訊</div>
        <div class="d-flex justify-content-between">
          <div class="text-muted">目前版本</div>
          <div class="fw-bold">{{ appVersion }}</div>
        </div>
        <div class="d-flex justify-content-between mt-1">
          <div class="text-muted">最新版本</div>
          <div class="fw-bold">{{ latestVersion }}</div>
        </div>
      </div>
    </div>

    <!-- 更新歷史 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="fw-bold mb-2"><i class="bi bi-list-check text-primary me-1"></i> 版本更新資訊</div>
        
        <div class="accordion" id="updateAccordion">
          <div class="accordion-item" v-for="log in visibleUpdateLogs" :key="log.version">
            <h2 class="accordion-header">
              <button class="accordion-button" 
                      :class="{ collapsed: expandedVersion !== log.version }" 
                      type="button" 
                      @click="expandedVersion = expandedVersion === log.version ? null : log.version">
                <div class="d-flex flex-column">
                  <div class="fw-bold">v{{ log.version }}　{{ log.title }}</div>
                  <div class="small text-muted">{{ log.date }}</div>
                </div>
              </button>
            </h2>
            <div class="accordion-collapse" :class="{ show: expandedVersion === log.version, collapse: expandedVersion !== log.version }">
              <div class="accordion-body">
                <ul class="mb-0">
                  <li v-for="c in log.changes" :key="c">{{ c }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!showAllUpdates && updateLogs.length > 3" class="text-center mt-2">
          <button class="btn btn-link text-decoration-none text-muted" @click="showAllUpdates = true">
            <i class="bi bi-chevron-down me-1"></i>顯示更多歷史紀錄 ({{ updateLogs.length - 3 }})
          </button>
        </div>
        
        <div v-if="showAllUpdates && updateLogs.length > 3" class="text-center mt-2">
          <button class="btn btn-link text-decoration-none text-muted" @click="showAllUpdates = false">
            <i class="bi bi-chevron-up me-1"></i>收起歷史紀錄
          </button>
        </div>

      </div>
    </div>

    <!-- 裝置同步與分享 -->
    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="fw-bold mb-2"><i class="bi bi-phone-flip text-primary me-1"></i> 裝置同步與分享</div>
        <div class="text-muted small mb-3">
          產生 6 位數代碼，在另一台裝置輸入即可快速同步設定。
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary flex-grow-1 rounded-pill" @click="startSync('full')">
            <i class="bi bi-arrow-repeat"></i> 快速同步
          </button>
          <button class="btn btn-outline-success flex-grow-1 rounded-pill" @click="startSync('share')">
            <i class="bi bi-share"></i> 分享家庭
          </button>
        </div>
      </div>
    </div>

    <!-- 同步 Modal (簡易覆蓋層) -->
    <div v-if="isSyncActive" class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 2000;">
      <div class="card shadow rounded-4 text-center p-4" style="width: 90%; max-width: 350px;">
        
        <div class="mb-3">
          <i class="bi bi-phone-flip fs-1 text-primary"></i>
        </div>

        <h4 class="fw-bold mb-3">{{ syncMode === 'full' ? '跨裝置同步' : '分享家庭設定' }}</h4>

        <div v-if="syncStatus === 'waiting'">
          <p class="text-muted mb-2">請在新裝置輸入以下代碼：</p>
          <div class="display-4 fw-bold letter-spacing-2 mb-3 font-monospace text-primary bg-light rounded py-2">{{ syncCode }}</div>
          
          <div class="text-danger fw-bold mb-3">
             <i class="bi bi-clock"></i> {{ syncTimer }} 秒後失效
          </div>
          
          <div class="spinner-border spinner-border-sm text-secondary mb-3" role="status"></div>
          <div class="text-muted small">等待連線中...</div>
        </div>

        <div v-else-if="syncStatus === 'connected'">
          <div class="text-success mb-3">
            <i class="bi bi-check-circle-fill display-1"></i>
          </div>
          <h5 class="fw-bold text-success">連線成功！</h5>
          <p class="text-muted">正在傳送資料...</p>
        </div>

        <div v-else-if="syncStatus === 'done'">
          <div class="text-success mb-3">
            <i class="bi bi-check-circle-fill display-1"></i>
          </div>
          <h5 class="fw-bold text-success">同步完成</h5>
        </div>

        <div v-else-if="syncStatus === 'timeout'">
          <div class="text-danger mb-3">
            <i class="bi bi-x-circle display-1"></i>
          </div>
          <h5 class="fw-bold text-danger">代碼已失效</h5>
          <p class="text-muted">請重新產生代碼</p>
        </div>

        <button class="btn btn-secondary rounded-pill w-100 mt-4" @click="closeSyncModal">
          {{ syncStatus === 'done' ? '關閉' : '取消' }}
        </button>

      </div>
    </div>

    <button class="btn btn-outline-danger w-100 rounded-pill mt-4" @click="$emit('reset-app')">
      重設 APP (清除設定與登出)
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { p2pManager } from '../utils/p2pManager'

const props = defineProps({
  familySettings: { type: Object, required: true },
  currentUserName: { type: String, required: true },
  currentUser: { type: Object, default: null },
  appVersion: { type: String, required: true },
  latestVersion: { type: String, required: true },
  updateLogs: { type: Array, required: true },
  settings: { type: Object, required: true }
})

const emit = defineEmits([
  'go-home',
  'link-google',
  'unlink-google',
  'save-family-name',
  'edit-user-name',
  'reset-app',
  'update:settings'
])

// 內部狀態
const isEditingFamilyName = ref(false)
const editFamilyNameTemp = ref('')
const showAllUpdates = ref(false)
const expandedVersion = ref(null)

// Sync State
const isSyncActive = ref(false)
const syncCode = ref('')
const syncTimer = ref(60)
const syncStatus = ref('waiting') 
const syncMode = ref('full')
let timerInterval = null
let senderPeer = null

const visibleUpdateLogs = computed(() => {
  if (showAllUpdates.value) return props.updateLogs
  return props.updateLogs.slice(0, 3)
})

const startEditFamilyName = () => {
  editFamilyNameTemp.value = props.familySettings.familyName
  isEditingFamilyName.value = true
}

const saveFamilyName = () => {
  if (!editFamilyNameTemp.value.trim()) return
  emit('save-family-name', editFamilyNameTemp.value.trim())
  isEditingFamilyName.value = false
}

// Sync Logic
const startSync = async (mode) => {
   // Reset
   if (timerInterval) clearInterval(timerInterval)
   if (senderPeer && senderPeer.cancel) senderPeer.cancel()

   syncMode.value = mode
   syncStatus.value = 'waiting'
   syncTimer.value = 60
   syncCode.value = p2pManager.generateSyncCode()
   isSyncActive.value = true

   // Prepare Payload
   const configStr = localStorage.getItem("fridge_firebase_config")
   if (!configStr) {
       alert("無法讀取設定，請重新登入")
       isSyncActive.value = false
       return
   }
   
   let config = null
   try {
     config = JSON.parse(configStr)
   } catch(e) {
     alert("設定資料損毀")
     isSyncActive.value = false
     return
   }

   const payload = {
       config,
       familyName: props.familySettings.familyName || '我的家庭',
       userName: mode === 'full' ? props.currentUserName : '',
       mode
   }

   // Timer
   timerInterval = setInterval(() => {
       syncTimer.value--
       if (syncTimer.value <= 0) {
          clearInterval(timerInterval)
          syncStatus.value = 'timeout'
          if(senderPeer && senderPeer.cancel) senderPeer.cancel()
       }
   }, 1000)

   // P2P
   try {
       const result = p2pManager.createSender(syncCode.value, payload, () => {
          // Connected
          syncStatus.value = 'connected'
          if (timerInterval) clearInterval(timerInterval)
       })
       
       senderPeer = result 
       
       await result.promise
       
       syncStatus.value = 'done'
       setTimeout(() => {
           if(isSyncActive.value && syncStatus.value === 'done') closeSyncModal()
       }, 2000)
       
   } catch (err) {
       console.error(err)
       if (syncStatus.value !== 'timeout' && isSyncActive.value) {
           // If user closed modal, ignore
           // If timeout, ignore
       }
   }
}

const closeSyncModal = () => {
    isSyncActive.value = false
    if (timerInterval) clearInterval(timerInterval)
    if (senderPeer && senderPeer.cancel) {
        senderPeer.cancel()
        senderPeer = null
    }
}

</script>
