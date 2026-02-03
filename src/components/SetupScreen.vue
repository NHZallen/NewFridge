<template>
  <div class="setup-screen">
    <div class="text-center mb-4">
      <i class="bi bi-snow2 text-primary display-1"></i>
      <h2 class="fw-bold mt-3">歡迎使用智慧冰箱</h2>
      <p class="text-muted">請輸入家庭設定與您的名稱以開始使用</p>
    </div>

    <div class="card w-100 border-0 shadow-sm" style="max-width: 500px;">
      <div class="card-body">
        <form @submit.prevent="$emit('submit')">
          <div class="mb-3">
            <label class="form-label fw-bold">1. Firebase 設定碼</label>
            <textarea 
              class="form-control font-monospace small" 
              rows="5" 
              :value="inputConfigStr"
              @input="$emit('update:inputConfigStr', $event.target.value)"
              placeholder="請貼上 const firebaseConfig = { ... }" 
              required
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="form-label fw-bold">2. 您的稱呼 (家庭成員名稱)</label>
            <input 
              type="text" 
              class="form-control" 
              :value="inputUserName"
              @input="$emit('update:inputUserName', $event.target.value)"
              placeholder="例如：爸爸、媽媽" 
              required
            >
          </div>
          
          <div v-if="setupError" class="alert alert-danger py-2 mb-3">{{ setupError }}</div>

          <button type="submit" class="btn btn-primary w-100 rounded-pill py-2 fw-bold" :disabled="isSettingUp">
            {{ isSettingUp ? '處理中...' : '開始使用' }}
          </button>

          <div class="text-center mt-3 position-relative">
            <span class="bg-white px-2 text-muted small position-relative z-1">或</span>
            <hr class="position-absolute w-100 top-50 start-0 m-0 z-0">
          </div>

          <button type="button" class="btn btn-outline-primary w-100 rounded-pill py-2 mt-3" @click="openSyncModal">
            <i class="bi bi-phone-flip me-1"></i> 從舊裝置同步
          </button>
        </form>
      </div>
    </div>

    <!-- P2P 同步 Modal -->
    <div v-if="showSyncModal" class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 2000;">
      <div class="card shadow rounded-4 text-center p-4" style="width: 90%; max-width: 350px;">
        <h4 class="fw-bold mb-3">輸入同步代碼</h4>
        <p class="text-muted small mb-3">請在舊裝置上點擊「快速同步」或「分享家庭」，並輸入顯示的 6 位數代碼。</p>

        <div class="mb-3">
           <input type="text" 
                  class="form-control form-control-lg text-center font-monospace fw-bold letter-spacing-2" 
                  v-model="syncCode" 
                  placeholder="6位代碼" 
                  maxlength="6"
                  :disabled="isSyncing"
           >
        </div>

        <div v-if="syncError" class="text-danger small mb-3">{{ syncError }}</div>

        <button class="btn btn-primary rounded-pill w-100 mb-2" @click="startSync" :disabled="!syncCode || isSyncing">
          {{ isSyncing ? '連線中...' : '開始同步' }}
        </button>

        <button class="btn btn-link text-decoration-none text-muted" @click="closeSyncModal" :disabled="isSyncing">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { p2pManager } from '../utils/p2pManager'

defineProps({
  inputConfigStr: { type: String, default: '' },
  inputUserName: { type: String, default: '' },
  setupError: { type: String, default: '' },
  isSettingUp: { type: Boolean, default: false }
})

const emit = defineEmits(['submit', 'update:inputConfigStr', 'update:inputUserName'])

const showSyncModal = ref(false)
const syncCode = ref('')
const isSyncing = ref(false)
const syncError = ref('')

const openSyncModal = () => {
  showSyncModal.value = true
  syncCode.value = ''
  syncError.value = ''
}

const closeSyncModal = () => {
  showSyncModal.value = false
}

const startSync = async () => {
    if (!syncCode.value || syncCode.value.length < 6) return
    
    isSyncing.value = true
    syncError.value = ''

    try {
        const data = await p2pManager.createReceiver(syncCode.value)
        
        if (!data || !data.config) throw new Error('同步資料格式錯誤')

        // Apply Config
        const configStr = `const firebaseConfig = ${JSON.stringify(data.config, null, 2)};`
        emit('update:inputConfigStr', configStr)
        
        if (data.mode === 'full') {
             emit('update:inputUserName', data.userName || '')
             // Close modal first
             showSyncModal.value = false
             isSyncing.value = false
             // Auto-submit to enter app directly
             setTimeout(() => emit('submit'), 100)
             return
        } else {
             // Share mode: Name is empty, user needs to input
             emit('update:inputUserName', '')
        }
        
        showSyncModal.value = false
        
    } catch (e) {
        console.error(e)
        syncError.value = e.message || '同步失敗'
    } finally {
        isSyncing.value = false
    }
}
</script>
