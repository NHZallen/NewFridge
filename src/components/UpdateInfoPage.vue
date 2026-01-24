<template>
  <div class="page-container">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <button class="btn btn-light border rounded-pill" @click="$emit('close')">
        <i class="bi bi-arrow-left"></i> 返回
      </button>
      <h5 class="fw-bold m-0">發現新版本</h5>
      <div style="width: 74px;"></div>
    </div>

    <div class="card section-card border-primary border-2 mb-3">
      <div class="card-body text-center py-4">
        <i class="bi bi-stars text-primary display-1"></i>
        <h3 class="fw-bold mt-3">v{{ latestLog?.version }} 更新囉！</h3>
        <p class="text-muted">{{ latestLog?.title }}</p>
      </div>
    </div>

    <div class="card section-card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="fw-bold fs-5">更新內容</div>
          <small class="text-muted">{{ latestLog?.date }}</small>
        </div>
        
        <ul class="list-group list-group-flush" v-if="latestLog?.changes?.length">
          <li class="list-group-item px-0" v-for="c in latestLog.changes" :key="c">
            <i class="bi bi-check-circle-fill text-success me-2"></i>{{ c }}
          </li>
        </ul>
        <div class="text-muted" v-else>沒有更新詳細內容</div>
      </div>
    </div>

    <div class="alert alert-light border small text-muted text-center mt-4">
      按下「我知道了」後，同一版本將不會再自動彈出通知
    </div>

    <button class="btn btn-primary w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm mt-2" @click="$emit('close')">
      我知道了
    </button>
  </div>
</template>

<script setup>
defineProps({
  latestLog: { type: Object, default: null }
})

defineEmits(['close'])
</script>
