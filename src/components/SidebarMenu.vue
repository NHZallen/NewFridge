<template>
  <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebar" aria-labelledby="sidebarLabel" data-bs-backdrop="true" data-bs-scroll="false">
    <div class="offcanvas-header">
      <h5 class="offcanvas-title fw-bold" id="sidebarLabel"><i class="bi bi-snow2 text-primary"></i> 功能選單</h5>
      <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
    </div>

    <div class="offcanvas-body d-flex flex-column">
      <div class="sidebar-user-block">
        <div class="text-muted small">目前使用者</div>
        <div class="fw-bold fs-5">{{ currentUserName }}</div>
      </div>
      <hr class="sidebar-divider">

      <!-- 採買區塊 -->
      <div class="d-grid gap-2 mb-4">
        <button class="btn btn-light text-start d-flex justify-content-between align-items-center" @click="$emit('go-to-page', 'to-buy-list')">
          <span class="text-info fw-bold"><i class="bi bi-clipboard-check me-2"></i>待購買清單</span>
          <span class="badge bg-info text-dark rounded-pill" v-if="toBuyCount > 0">{{ toBuyCount }}</span>
        </button>
        <button class="btn btn-light text-start d-flex justify-content-between align-items-center" @click="$emit('go-to-page', 'shopping-cart')">
          <span class="text-warning fw-bold"><i class="bi bi-cart me-2"></i>購物車</span>
          <span class="badge bg-warning text-dark rounded-pill" v-if="cartCount > 0">{{ cartCount }}</span>
        </button>
        <button class="btn btn-light text-start d-flex justify-content-between align-items-center" @click="$emit('go-to-page', 'recipes')">
          <span class="text-success fw-bold"><i class="bi bi-lightbulb me-2"></i>食譜靈感</span>
          <i class="bi bi-chevron-right small text-muted"></i>
        </button>
      </div>
      
      <hr class="sidebar-divider">

      <div class="d-grid gap-2 mb-4">
        <button class="btn btn-outline-dark text-start d-flex justify-content-between align-items-center" @click="$emit('select-zone', 'all')">
          <span><i class="bi bi-grid-fill me-2"></i>全區</span>
          <div class="d-flex gap-1">
            <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.all.total }}</span>
            <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.all.warning }}</span>
            <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.all.expired }}</span>
          </div>
        </button>
        
        <button class="btn btn-outline-primary text-start d-flex justify-content-between align-items-center" @click="$emit('select-zone', 'cold')">
          <span><i class="bi bi-snow me-2"></i>冷藏區</span>
          <div class="d-flex gap-1">
            <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.cold.total }}</span>
            <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.cold.warning }}</span>
            <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.cold.expired }}</span>
          </div>
        </button>
        <button class="btn btn-outline-frozen text-start d-flex justify-content-between align-items-center" @click="$emit('select-zone', 'frozen')">
          <span><i class="bi bi-box-seam me-2"></i>冷凍區</span>
          <div class="d-flex gap-1">
            <span class="badge bg-secondary zone-stat-badge">{{ zoneStats.frozen.total }}</span>
            <span class="badge bg-warning text-dark zone-stat-badge">{{ zoneStats.frozen.warning }}</span>
            <span class="badge bg-danger zone-stat-badge">{{ zoneStats.frozen.expired }}</span>
          </div>
        </button>
        <button class="btn btn-outline-success text-start d-flex justify-content-between align-items-center" @click="$emit('select-zone', 'veggie')">
          <span><i class="bi bi-flower1 me-2"></i>蔬果區</span>
          <div class="d-flex gap-1">
            <span class="badge bg-secondary zone-stat-badge">{{ zoneStats.veggie.total }}</span>
            <span class="badge bg-warning text-dark zone-stat-badge">{{ zoneStats.veggie.warning }}</span>
            <span class="badge bg-danger zone-stat-badge">{{ zoneStats.veggie.expired }}</span>
          </div>
        </button>
        <button class="btn btn-outline-secondary text-start d-flex justify-content-between align-items-center" @click="$emit('select-zone', 'nostock')" data-bs-dismiss="offcanvas">
          <span><i class="bi bi-archive me-2"></i>無庫存區</span>
          <div class="d-flex gap-1">
            <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.nostock.total }}</span>
          </div>
        </button>
      </div>
      
      <div class="mt-auto">
        <button class="btn btn-primary w-100 rounded-pill fw-bold" @click="$emit('go-settings')" data-bs-dismiss="offcanvas">
          <i class="bi bi-gear me-1"></i> 設定
        </button>
        <div class="text-center text-muted small mt-3">v{{ appVersion }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentUserName: { type: String, required: true },
  zoneStats: { type: Object, required: true },
  toBuyCount: { type: Number, default: 0 },
  cartCount: { type: Number, default: 0 },
  appVersion: { type: String, required: true }
})

defineEmits(['select-zone', 'go-to-page', 'go-settings'])
</script>
