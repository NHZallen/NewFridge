<template>
  <div class="page-container">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <button class="btn btn-light border rounded-pill" @click="$emit('cancel')">
        <i class="bi bi-arrow-left"></i> 取消
      </button>
      <h5 class="fw-bold m-0">取出物品</h5>
      <div style="width: 74px;"></div>
    </div>

    <div class="card section-card">
      <div class="card-body text-center">
        <div class="mb-4 d-flex justify-content-center">
          <div class="rounded overflow-hidden shadow-sm" style="width: 150px; height: 150px;">
            <img v-if="item?.image" :src="item.image" style="width: 100%; height: 100%; object-fit: cover;">
            <div v-else class="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
              <i class="bi bi-image fs-1 text-muted"></i>
            </div>
          </div>
        </div>

        <h3 class="fw-bold mb-2">{{ item?.name }}</h3>
        <p class="text-muted mb-4">目前庫存：{{ maxTakeOut }}</p>

        <div class="text-start mb-3">
          <label class="form-label fw-bold">請選擇要取出的數量</label>
          <select class="form-select form-select-lg" :value="takeOutAmount" @change="$emit('update:takeOutAmount', Number($event.target.value))">
            <option v-for="n in maxTakeOut" :key="n" :value="n">{{ n }} {{ n === maxTakeOut ? '(全部取出)' : '' }}</option>
          </select>
        </div>

        <button class="btn btn-danger w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm" @click="$emit('confirm')">
          確認取出
        </button>
        <div class="text-muted small mt-2">
          {{ takeOutAmount === maxTakeOut ? '全部取出後，物品將移動至「無庫存區」' : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  item: { type: Object, default: null },
  maxTakeOut: { type: Number, default: 1 },
  takeOutAmount: { type: Number, default: 1 }
})

defineEmits(['cancel', 'confirm', 'update:takeOutAmount'])
</script>
