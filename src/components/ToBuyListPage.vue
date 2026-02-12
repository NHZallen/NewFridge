<template>
  <div class="bento-mode">
    <!-- 背景動畫層 -->
    <div class="bento-bg-layer">
      <div class="mesh-blob blob-1"></div>
      <div class="mesh-blob blob-2"></div>
      <div class="mesh-blob blob-3"></div>
    </div>

    <!-- 頂部導航 (透明 Header) -->
    <header class="bento-header">
      <button class="glass-icon-btn" @click="$emit('navigate', 'sidebar')" aria-label="返回功能選單">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="m-0 fs-5 fw-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">待購買清單</h1>
      <div style="width: 40px;" aria-hidden="true"></div>
    </header>

    <div class="bento-container">
      <!-- 空狀態 -->
      <div v-if="toBuyList.length === 0" class="bento-hero d-flex flex-column align-items-center justify-content-center py-5">
        <div class="hero-icon-box bg-info bg-opacity-50">
          <span class="material-symbols-outlined text-white fs-2">playlist_add_check</span>
        </div>
        <h2 class="fw-bold mb-1">清單是空的</h2>
        <p class="text-muted small">冰箱缺什麼了嗎？快去新增吧！</p>
      </div>

      <div v-else>
        <!-- Hero 卡片 (總覽) -->
        <div class="bento-hero">
          <!-- 裝飾光暈 -->
          <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2)); filter: blur(40px); border-radius: 50%;"></div>
          
          <div class="hero-icon-box" style="background: linear-gradient(135deg, #0891b2, #155e75);">
            <span class="material-symbols-outlined text-white fs-1">list_alt</span>
          </div>
          <h2 class="display-6 fw-bold mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">{{ toBuyList.length }} 項待買</h2>
          <p class="text-muted fw-bold small">採買前記得確認喔！</p>
        </div>

        <!-- 條列式清單 (List Layout) -->
        <div class="d-flex flex-column gap-3">
          <div v-for="item in toBuyList" :key="item.id" 
               class="bento-card d-flex align-items-center p-3"
               role="button"
               tabindex="0"
               :aria-pressed="localSelectedIds.includes(item.id)"
               :aria-label="`${item.name}，${localSelectedIds.includes(item.id) ? '已選取' : '未選取'}`"
               @click="toggleSelection(item.id)"
               @keydown.enter.prevent="toggleSelection(item.id)"
               @keydown.space.prevent="toggleSelection(item.id)">
            
            <!-- 1. Checkbox (改為左側顯示，符合清單邏輯) -->
            <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
              <input type="checkbox" class="form-check-input border-2" 
                     :value="item.id" v-model="localSelectedIds"
                     :aria-label="`選取 ${item.name}`"
                     style="cursor: pointer; border-color: #cbd5e1;" @click.stop>
            </div>

            <!-- 2. 圖片 (圓角方形) -->
            <div class="bento-img-box ms-3 flex-shrink-0" 
                 style="width: 64px; height: 64px; border-radius: 12px;"
                 role="img"
                 :aria-label="item.image ? `${item.name} 的照片` : `${item.name}（無照片）`"
                 :style="{ backgroundImage: item.image ? `url(${item.image})` : 'none' }">
                 <div v-if="!item.image" class="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                    <i class="bi bi-image fs-5"></i>
                 </div>
            </div>

            <!-- 3. 文字資訊 -->
            <div class="ms-3 flex-grow-1 min-w-0">
              <div class="d-flex align-items-center mb-1">
                <span class="zone-tag mb-0 me-2" :class="{
                    'zone-cold': item.zone === 'cold',
                    'zone-frozen': item.zone === 'frozen',
                    'zone-veggie': item.zone === 'veggie'
                }">{{ getZoneName(item.zone) }}</span>
              </div>
              <h3 class="fw-bold fs-6 text-truncate mb-0">{{ item.name }}</h3>
              <small class="text-secondary fw-bold" style="font-size: 0.75rem;">
                目前庫存: {{ item.quantity }}
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 黑色懸浮島嶼底部操作列 (Action Island) -->
    <div class="action-island-container" v-if="toBuyList.length > 0">
         <div class="action-island">
            <div class="island-text ms-2" aria-live="polite">
                <div>已選擇</div>
                <div class="fs-4">{{ localSelectedIds.length }} 項</div>
            </div>
            <div class="island-controls">
                <!-- 移除按鈕 -->
                <button class="island-trash-btn" 
                        :disabled="localSelectedIds.length === 0 || !isOnline"
                        @click="handleRemove"
                        aria-label="將選取項目從待買清單移除">
                    <span class="material-symbols-outlined">delete</span>
                </button>
                
                <!-- 放入購物車按鈕 -->
                 <button class="island-action-btn" 
                        :disabled="localSelectedIds.length === 0 || !isOnline"
                        aria-label="將選取項目放入購物車"
                        @click="handleMoveToCart">
                    放入購物車
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            </div>
         </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../composables/useFirebase'
import { getZoneName } from '../utils/itemHelpers.js'
import { useMainStore } from '../stores/index.js'
import { storeToRefs } from 'pinia'

export default {
  name: 'ToBuyListPage',
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  emits: ['navigate', 'show-error'],
  setup(props, { emit }) {
    const store = useMainStore()
    const { isOnline } = storeToRefs(store)
    const localSelectedIds = ref([])
    
    const toBuyList = computed(() => {
      return props.items.filter(i => i.shoppingStatus === 'toBuy')
    })



    const toggleSelection = (id) => {
      const idx = localSelectedIds.value.indexOf(id)
      if (idx > -1) {
        localSelectedIds.value.splice(idx, 1)
      } else {
        localSelectedIds.value.push(id)
      }
    }

    const handleRemove = async () => {
      store.startSync()
      try {
        const promises = localSelectedIds.value.map(id => 
          updateDoc(doc(db.value, "fridge_items", id), { shoppingStatus: null })
        )
        await Promise.all(promises)
        localSelectedIds.value = []
      } catch (e) {
        console.error('Remove failed:', e)
        emit('show-error', '操作失敗，請檢查網路連線後再試')
      } finally {
        store.endSync()
      }
    }

    const handleMoveToCart = async () => {
      store.startSync()
      try {
        const promises = localSelectedIds.value.map(id => 
          updateDoc(doc(db.value, "fridge_items", id), { shoppingStatus: 'inCart' })
        )
        await Promise.all(promises)
        localSelectedIds.value = []
        emit('navigate', 'shopping-cart')
      } catch (e) {
        console.error('Move to cart failed:', e)
        emit('show-error', '操作失敗，請檢查網路連線後再試')
      } finally {
        store.endSync()
      }
    }

    return {
      toBuyList,
      localSelectedIds,
      isOnline,
      getZoneName,
      toggleSelection,
      handleRemove,
      handleMoveToCart
    }
  }
}
</script>
