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

        <div class="d-flex flex-column">
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

    <button class="btn btn-outline-danger w-100 rounded-pill mt-4" @click="$emit('reset-app')">
      重設 APP (清除設定與登出)
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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

</script>
