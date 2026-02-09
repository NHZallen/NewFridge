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

        <button class="btn btn-danger w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm d-flex align-items-center justify-content-center overflow-hidden position-relative" 
                :class="{'btn-success': isSuccess}"
                @click="confirmTakeOut"
                :disabled="isProcessing || isSuccess">
          
          <!-- 1. 初始狀態 -->
          <span v-if="!isProcessing && !isSuccess">
             確認取出
          </span>

          <!-- 2. 處理中 -->
          <span v-else-if="isProcessing && !isSuccess" class="d-flex align-items-center">
             <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
             處理中...
          </span>

          <!-- 3. 成功 -->
          <span v-else-if="isSuccess" class="d-flex align-items-center justify-content-center">
              <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <span class="ms-2">完成！</span>
          </span>
        </button>

        <div class="text-muted small mt-2">
          {{ takeOutAmount === maxTakeOut ? '全部取出後，物品將移動至「無庫存區」' : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../composables/useFirebase'
import { cleanupUnusedImages } from '../utils/storageUtils.js'
import { recalculateItemFromBatches } from '../utils/inventoryUtils.js'
import { useMainStore } from '../stores/index.js'
import { storeToRefs } from 'pinia'

const store = useMainStore()
const { isOnline } = storeToRefs(store)

const props = defineProps({
  item: { type: Object, default: null },
  maxTakeOut: { type: Number, default: 1 },
  takeOutAmount: { type: Number, default: 1 }
})

const emit = defineEmits(['cancel', 'submit-success', 'update:takeOutAmount'])

const isProcessing = ref(false)
const isSuccess = ref(false)

const confirmTakeOut = async () => {
  if (!isOnline.value) {
    alert("目前處於離線狀態，無法執行取出操作。");
    return;
  }
  if (!db.value || !props.item) return;

  isProcessing.value = true
  
  try {
      const takeQty = parseInt(props.takeOutAmount)
      const currentQty = parseInt(props.item.quantity)
      const targetId = props.item.id
      const originalState = JSON.parse(JSON.stringify(props.item))

      let updateData = {}
      let imageCleanupTask = null

      if (takeQty >= currentQty) {
        // === CASE 1: FULL TAKE OUT ===
        
        // --- Image Cleanup Plan ---
        const allImages = new Set();
        if (originalState.image) allImages.add(originalState.image);
        if (originalState.batches) {
            originalState.batches.forEach(b => {
                if (b.image) allImages.add(b.image);
            });
        }

        let imageToKeep = originalState.image;
        if (originalState.batches && originalState.batches.length > 0) {
            const sortedBatches = [...originalState.batches].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
            const latestBatch = sortedBatches.find(b => b.image);
            if (latestBatch) imageToKeep = latestBatch.image;
        }
        
        const keepingImages = imageToKeep ? [imageToKeep] : [];
        imageCleanupTask = () => cleanupUnusedImages(allImages, keepingImages);

        updateData = {
            quantity: 0,
            batches: [],
            storedDate: "",
            expiryDate: "",
            noExpiry: true,
            image: imageToKeep || null,
            updatedAt: new Date()
        }

      } else {
         // === CASE 2: PARTIAL TAKE OUT ===
         let batches = originalState.batches ? [...originalState.batches] : [{
              storedDate: originalState.storedDate,
              expiryDate: originalState.expiryDate,
              noExpiry: originalState.noExpiry,
              quantity: currentQty,
              image: originalState.image
         }]

         // Sort logic
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
                // Clone batch to avoid reference issues
                const newBatch = { ...batch } 
                newBatch.quantity = batchQty - remainingToTake
                remainingToTake = 0
                newBatches.push(newBatch)
              } else {
                remainingToTake -= batchQty
              }
         }
         
         const result = recalculateItemFromBatches(newBatches, originalState.owners)
         updateData = { ...result }

         // --- Image Cleanup Plan ---
         const oldImages = new Set();
         if (originalState.batches) {
             originalState.batches.forEach(b => { if (b.image) oldImages.add(b.image); });
         }
         const keepingImages = new Set();
         if (result.image) keepingImages.add(result.image);
         newBatches.forEach(b => { if (b.image) keepingImages.add(b.image); });
         
         imageCleanupTask = () => cleanupUnusedImages(oldImages, keepingImages);
      }

      // 4. PERFORM REMOTE UPDATE
      if (imageCleanupTask) await imageCleanupTask();
      await updateDoc(doc(db.value, "fridge_items", targetId), updateData)

      // Success Animation
      isProcessing.value = false
      isSuccess.value = true
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      emit('submit-success')

  } catch (e) {
      console.error("Take Out Failed", e)
      alert("取出失敗，請檢查網路")
      isProcessing.value = false
  }
}
</script>

<style scoped>
/* Checkmark Animation */
.checkmark {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: block;
    stroke-width: 3;
    stroke: #fff;
    stroke-miterlimit: 10;
    box-shadow: inset 0px 0px 0px #7ac142;
    animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
}

.checkmark__circle {
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    stroke-width: 2;
    stroke-miterlimit: 10;
    stroke: #fff;
    fill: none;
    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark__check {
    transform-origin: 50% 50%;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
}

@keyframes stroke {
    100% {
        stroke-dashoffset: 0;
    }
}
</style>
