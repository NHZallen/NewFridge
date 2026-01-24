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
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  inputConfigStr: { type: String, default: '' },
  inputUserName: { type: String, default: '' },
  setupError: { type: String, default: '' },
  isSettingUp: { type: Boolean, default: false }
})

defineEmits(['submit', 'update:inputConfigStr', 'update:inputUserName'])
</script>
