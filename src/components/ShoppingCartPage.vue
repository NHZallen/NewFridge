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
      <button class="glass-icon-btn" @click="$emit('navigate', 'sidebar')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="m-0 fs-5 fw-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">購物車</h1>
      <div style="width: 40px;"></div> <!-- 佔位符保持標題置中 -->
    </header>

    <div class="bento-container">
      <!-- 如果購物車是空的 -->
      <div v-if="cartList.length === 0 && cartFilterZone === 'all'" class="bento-hero d-flex flex-column align-items-center justify-content-center py-5">
        <div class="hero-icon-box bg-secondary opacity-50">
          <span class="material-symbols-outlined text-white fs-2">shopping_basket</span>
        </div>
        <h2 class="fw-bold mb-1">購物車是空的</h2>
        <p class="text-muted small">去把東西加入清單吧！</p>
      </div>

      <div v-else>
        <!-- Hero 卡片 (總覽/分區統計) - 無論選擇哪個區域都顯示 -->
        <div class="bento-hero">
          <!-- 裝飾光暈 -->
          <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.2)); filter: blur(40px); border-radius: 50%;"></div>
          
          <div class="hero-icon-box">
            <span class="material-symbols-outlined text-white fs-1">{{ heroInfo.icon }}</span>
          </div>
          <h2 class="display-6 fw-bold mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">{{ cartList.length }} 項商品</h2>
          <p class="text-muted fw-bold small">{{ heroInfo.label }} - {{ heroInfo.sub }}</p>
        </div>

        <!-- 分類標籤與排序切換 (修改部分) -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <!-- 左側：分類篩選 (可滑動) -->
          <div class="d-flex gap-2 overflow-auto no-scrollbar pb-1 flex-grow-1 me-2">
            <button class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0" 
                    :class="cartFilterZone === 'all' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
                    style="font-size: 0.85rem;"
                    @click="cartFilterZone = 'all'">全部</button>
            <button class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0" 
                    :class="cartFilterZone === 'cold' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
                    style="font-size: 0.85rem;"
                    @click="cartFilterZone = 'cold'">冷藏</button>
            <button class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0" 
                    :class="cartFilterZone === 'frozen' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
                    style="font-size: 0.85rem;"
                    @click="cartFilterZone = 'frozen'">冷凍</button>
            <button class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0" 
                    :class="cartFilterZone === 'veggie' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
                    style="font-size: 0.85rem;"
                    @click="cartFilterZone = 'veggie'">蔬果</button>
          </div>
        </div>

        <div v-if="cartList.length === 0" class="text-center text-muted py-5">
          <p>此分類沒有商品</p>
        </div>

        <!-- 列表模式 -->
        <div class="d-flex flex-column gap-3">
          <div v-for="item in cartList" :key="item.id" 
               class="bento-card d-flex align-items-center p-3"
               @click="toggleSelection(item.id)">
            
            <!-- Checkbox -->
            <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
              <input type="checkbox" class="form-check-input border-2" 
                     :value="item.id" v-model="localSelectedIds"
                     style="cursor: pointer; border-color: #cbd5e1;" @click.stop>
            </div>

            <!-- 圖片 -->
            <div class="bento-img-box ms-3 flex-shrink-0" 
                 style="width: 64px; height: 64px; border-radius: 12px;"
                 :style="{ backgroundImage: item.image ? `url(${item.image})` : 'none' }">
                 <div v-if="!item.image" class="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                    <i class="bi bi-image fs-5"></i>
                 </div>
            </div>

            <!-- 文字資訊 -->
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
                數量: {{ item.quantity }}
              </small>
            </div>

            <!-- 存入按鈕 -->
            <button class="btn btn-dark rounded-circle d-flex align-items-center justify-content-center ms-2 flex-shrink-0"
                    style="width: 42px; height: 42px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
                    @click.stop="$emit('start-purchase', item)">
                <span class="material-symbols-outlined fs-5">input</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- 黑色懸浮島嶼底部操作列 (Action Island) -->
    <div class="action-island-container" v-if="inCartItems.length > 0">
         <div class="action-island">
            <div class="island-text ms-2">
                <div>已選擇</div>
                <div class="fs-4">{{ localSelectedIds.length }} 項</div>
            </div>
            <div class="island-controls">
                <button class="island-trash-btn" 
                        :disabled="localSelectedIds.length === 0"
                        @click="handleRemove">
                    <span class="material-symbols-outlined">delete</span>
                </button>
                 <button class="island-action-btn" 
                        :disabled="localSelectedIds.length === 0"
                        @click="handleMoveBack">
                    放回待買
                    <span class="material-symbols-outlined">shopping_cart</span>
                </button>
            </div>
         </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { getFirestore, doc, updateDoc } from 'firebase/firestore'

export default {
  name: 'ShoppingCartPage',
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  emits: ['navigate', 'start-purchase'],
  setup(props, { emit }) {
    const localSelectedIds = ref([])
    const cartFilterZone = ref('all')
    
    const inCartItems = computed(() => {
      return props.items.filter(i => i.shoppingStatus === 'inCart')
    })

    const cartList = computed(() => {
      if (cartFilterZone.value === 'all') {
        return inCartItems.value
      }
      return inCartItems.value.filter(i => (i.zone || 'cold') === cartFilterZone.value)
    })

    const heroInfo = computed(() => {
      switch(cartFilterZone.value) {
        case 'cold': 
          return { icon: 'kitchen', label: '冷藏區商品', sub: '請盡快放入冰箱冷藏' }
        case 'frozen': 
          return { icon: 'ac_unit', label: '冷凍區商品', sub: '請盡快放入冷凍庫' }
        case 'veggie': 
          return { icon: 'eco', label: '蔬果區商品', sub: '注意保鮮期限' }
        default: 
          return { icon: 'shopping_basket', label: '全部商品', sub: '已購買，準備存入冰箱' }
      }
    })

    const getZoneName = (zone) => {
      switch(zone) {
        case 'cold': return '冷藏區'
        case 'frozen': return '冷凍區'
        case 'veggie': return '蔬果區'
        default: return '冰箱庫存'
      }
    }

    const toggleSelection = (id) => {
      const idx = localSelectedIds.value.indexOf(id)
      if (idx > -1) {
        localSelectedIds.value.splice(idx, 1)
      } else {
        localSelectedIds.value.push(id)
      }
    }

    const handleRemove = async () => {
      const db = getFirestore()
      const promises = localSelectedIds.value.map(id => 
        updateDoc(doc(db, "fridge_items", id), { shoppingStatus: null })
      )
      await Promise.all(promises)
      localSelectedIds.value = []
    }

    const handleMoveBack = async () => {
      const db = getFirestore()
      const promises = localSelectedIds.value.map(id => 
        updateDoc(doc(db, "fridge_items", id), { shoppingStatus: 'toBuy' })
      )
      await Promise.all(promises)
      localSelectedIds.value = []
    }

    return {
      cartList,
      inCartItems,
      cartFilterZone,
      localSelectedIds,
      heroInfo,
      getZoneName,
      toggleSelection,
      handleRemove,
      handleMoveBack
    }
  }
}
</script>
