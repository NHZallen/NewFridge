<template>
  <div class="home-view">
    <!-- 頂部列 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-light border rounded-pill" @click="$emit('toggle-sidebar')" aria-controls="sidebar" aria-label="開啟功能選單">
          <i class="bi bi-list"></i>
        </button>
        <div class="d-flex flex-column">
          <h4 class="fw-bold m-0">
            <i class="bi bi-snow2 text-primary" v-if="filterZone !== 'nostock'"></i>
          <i class="bi bi-archive text-secondary" v-else></i>
            {{ getZoneName(filterZone) }}
            <span v-if="isSyncing" class="ms-2 text-primary spinner-border spinner-border-sm" role="status" aria-hidden="true" style="animation-duration: 0.5s;"></span>
          </h4>
          <small class="text-muted" style="font-size: 0.8rem;">
            {{ familySettings.familyName }}
            <span v-if="isSyncing" class="ms-1 text-primary fade-in-out">
               <i class="bi bi-cloud-arrow-up-fill"></i> 同步中...
            </span>
          </small>
        </div>
      </div>
      
      <!-- 管理模式按鈕 -->
      <button class="btn btn-outline-dark btn-sm rounded-pill px-3"
              :aria-pressed="isSelectionMode"
              aria-label="切換管理模式"
              @click="$emit('update:isSelectionMode', !isSelectionMode)">
        {{ isSelectionMode ? '取消' : '管理' }}
      </button>
    </div>

    <!-- 搜尋與篩選 (全區顯示) - 現代化膠囊設計 -->
    <div class="modern-search-container mb-4 shadow-sm">
      <div class="modern-search-bar">
        <span class="search-icon"><i class="bi bi-search"></i></span>
        <input type="text" 
               class="modern-search-input" 
               placeholder="搜尋物品..." 
               aria-label="搜尋物品"
               :value="searchText"
               @input="$emit('update:searchText', $event.target.value)">
               
        <!-- 清除按鈕 -->
        <button v-if="searchText" 
                class="modern-clear-btn" 
                aria-label="清除搜尋文字" 
                @click="$emit('update:searchText', '')">
          <i class="bi bi-x-circle-fill"></i>
        </button>
        
        <!-- 分隔線 -->
        <div class="modern-divider" v-if="filterZone !== 'nostock'"></div>

        <!-- 區域篩選 -->
        <select v-if="filterZone !== 'nostock'"
                class="modern-filter-select" 
                aria-label="篩選冰箱區域"
                :value="filterZone"
                @change="$emit('update:filterZone', $event.target.value)">
          <option value="all">全區</option>
          <option value="cold">冷藏區</option>
          <option value="frozen">冷凍區</option>
          <option value="veggie">蔬果區</option>
        </select>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-2 px-1">
      <small class="text-muted" v-if="filterZone !== 'nostock'"><i class="bi bi-info-circle me-1"></i>長按物品可編輯</small>
      <small class="text-muted" v-else><i class="bi bi-info-circle me-1"></i>顯示已用完的物品</small>
    </div>

    <!-- 物品列表 -->
    <div class="row g-3 pb-5">
      <div 
        class="col-6 col-md-4 col-lg-3" 
        v-for="item in visibleItems" 
        :key="item.id"
        v-memo="[item, isSelectionMode, selectedHomeIds.includes(item.id)]"
      >
        <div class="card item-card h-100" 
             :class="getAlertClass(item)"
             :role="isSelectionMode ? 'button' : undefined"
             :tabindex="isSelectionMode ? 0 : undefined"
             :aria-label="isSelectionMode ? `${item.name}，${selectedHomeIds.includes(item.id) ? '已選取' : '未選取'}` : undefined"
             @touchstart="handleTouchStart(item)"
             @touchend="handleTouchEnd"
             @touchmove="handleTouchMove"
             @click="handleCardClick(item)"
             @keydown.enter.prevent="isSelectionMode && handleCardClick(item)"
             @keydown.space.prevent="isSelectionMode && handleCardClick(item)"
             @contextmenu.prevent="$emit('edit', item)">
            
            <!-- 多選模式勾選遮罩 -->
            <div v-if="isSelectionMode" class="selection-overlay">
                <template v-if="item.shoppingStatus === 'toBuy' || item.shoppingStatus === 'inCart'">
                    <!-- 已在清單中的物品禁止選擇 -->
                    <i class="bi bi-cart-check-fill text-secondary fs-1 opacity-50"></i>
                </template>
                <template v-else>
                    <i class="bi bi-check-circle-fill selection-check" v-if="selectedHomeIds.includes(item.id)"></i>
                    <i class="bi bi-circle text-muted fs-1" v-else></i>
                </template>
            </div>

            <div class="item-img-box"
                 :role="!isSelectionMode && item.image ? 'button' : undefined"
                 :tabindex="!isSelectionMode && item.image ? 0 : undefined"
                 :aria-label="!isSelectionMode && item.image ? `預覽 ${item.name} 的照片` : undefined"
                 @click.stop="!isSelectionMode && $emit('open-preview', item.image)"
                 @keydown.enter.stop.prevent="!isSelectionMode && item.image && $emit('open-preview', item.image)"
                 @keydown.space.stop.prevent="!isSelectionMode && item.image && $emit('open-preview', item.image)">
                <img v-if="item.image" :src="item.image" class="item-img" :alt="`${item.name} 的照片`" loading="lazy">
                <div v-else class="text-muted" role="img" :aria-label="`${item.name}（無照片）`"><i class="bi bi-image fs-1"></i></div>
                <div class="zone-bar" :style="{ backgroundColor: getZoneColor(item.zone) }"></div>
                
                <!-- 狀態懸浮標籤 (方案一) -->
                <div class="status-badge to-buy" v-if="item.shoppingStatus === 'toBuy'">
                    <i class="bi bi-cart-plus me-1"></i>待買
                </div>
                <div class="status-badge in-cart" v-else-if="item.shoppingStatus === 'inCart'">
                    <i class="bi bi-cart-check me-1"></i>已拿
                </div>
            </div>

            <div class="card-body p-2 d-flex flex-column">
                <h6 class="card-title fw-bold text-truncate mb-1">{{ item.name }}</h6>

                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">數量: {{ item.quantity }}</small>
                </div>
                
                <div class="mb-1 text-truncate">
                    <small class="text-primary" style="font-size: 0.75rem;">
                        <i class="bi bi-person-fill me-1"></i>{{ formatOwners(item.owners) }}
                    </small>
                </div>



                <div v-if="filterZone !== 'nostock'">
                    <div class="mb-2">
                        <small class="text-muted" v-if="item.storedDate">存入: {{ item.storedDate }}</small>
                        <small class="text-muted" v-else>存入: 未填</small>
                    </div>
                    <div v-if="isNoExpiry(item)" class="badge bg-light text-secondary border w-100 mb-2">無期限</div>
                    <template v-else>
                        <div v-if="getItemDaysToExpiry(item.id) <= 0" class="badge bg-danger w-100 mb-2">
                            {{ getItemDaysToExpiry(item.id) === 0 ? '今天到期' : `已過期 (${item.expiryDate})` }}
                        </div>
                        <div v-else-if="getItemDaysToExpiry(item.id) <= 7" class="badge bg-warning text-dark w-100 mb-2">剩 {{ getItemDaysToExpiry(item.id) }} 天</div>
                        <div v-else class="badge bg-light text-secondary border w-100 mb-2">{{ item.expiryDate }}</div>
                    </template>
                </div>

                <button v-if="!isSelectionMode" 
                        class="btn btn-sm mt-auto w-100 rounded-pill"
                        :class="item.quantity > 0 ? 'btn-outline-danger' : 'btn-outline-secondary'"
                        :disabled="item.quantity > 0 && !isOnline"
                        :aria-label="item.quantity > 0 ? `取出 ${item.name}` : `查看 ${item.name} 詳情`"
                        @click.stop="item.quantity > 0 ? $emit('take-out', item) : $emit('edit', item)">
                    {{ item.quantity > 0 ? '取出 / 吃掉' : '查看詳情' }}
                </button>
            </div>
        </div>
      </div>
      
      <!-- Infinite Scroll Sentinel -->
      <div v-if="homeVisibleCount < filteredItems.length" ref="scrollSentinel" class="col-12 text-center py-4">
        <div class="spinner-border text-muted spinner-border-sm" role="status">
          <span class="visually-hidden">載入更多物品中</span>
        </div>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="text-center text-muted mt-5 pt-5">
      <i class="bi bi-box2 display-1 opacity-25"></i>
      <p class="mt-3">該區域是空的</p>
    </div>

    <!-- 回到頂部按鈕 -->
    <button v-if="showScrollTop" class="scroll-top-btn" @click="$emit('scroll-to-top')" aria-label="回到頁面頂部">
      <i class="bi bi-arrow-up"></i>
    </button>

    <!-- 一般模式的 FAB -->
    <button v-if="!isSelectionMode && filterZone !== 'nostock'" 
            class="fab-btn" 
            :class="{ 'opacity-50': !isOnline }"
            :disabled="!isOnline"
            aria-label="新增物品"
            @click="$emit('add-page')">
      <i class="bi bi-plus-lg"></i>
    </button>

    <!-- Sync Indicator Floating (Optional, if header one is not enough) -->
    <div v-if="isSyncing" class="position-fixed bottom-0 end-0 mb-5 me-3 p-2 bg-white rounded-pill shadow-sm border d-flex align-items-center" style="z-index: 1060; transform: translateY(-70px);">
        <div class="spinner-border text-primary spinner-border-sm me-2" role="status">
          <span class="visually-hidden">雲端同步中</span>
        </div>
        <small class="fw-bold text-primary">雲端同步中...</small>
    </div>
    
    <!-- 多選模式的底部操作列 -->
    <div class="action-island-container" v-if="isSelectionMode">
         <div class="action-island">
            <div class="island-text ms-2" aria-live="polite">
                <div>已選擇</div>
                <div class="fs-4">{{ selectedHomeIds.length }} 項</div>
            </div>
            
            <div class="island-controls" v-if="filterZone === 'nostock'">
                <!-- 移除按鈕 -->
                <button class="island-trash-btn" 
                        :disabled="selectedHomeIds.length === 0 || !isOnline"
                        @click="$emit('delete-selected')"
                        aria-label="永久刪除選取物品">
                    <span class="material-symbols-outlined">delete</span>
                </button>
                
                <!-- 加入待買按鈕 -->
                 <button class="island-action-btn" 
                        :disabled="selectedHomeIds.length === 0 || !isOnline"
                        aria-label="將選取物品加入待買清單"
                        @click="$emit('add-batch-to-buy')">
                    加入待買
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            </div>
            
            <div class="island-controls" v-else>
                 <button class="island-action-btn w-100" 
                        :disabled="selectedHomeIds.length === 0 || !isOnline"
                        aria-label="將選取物品加入待購買清單"
                        @click="$emit('add-batch-to-buy')">
                    加入待購買清單
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            </div>
         </div>
    </div>
  </div>
</template>

<script setup>
import { getDays } from '../utils/dateUtils.js'
import { isNoExpiry, getZoneName, getZoneColor, getAlertClass } from '../utils/itemHelpers.js'

import { LONG_PRESS_DURATION } from '../utils/constants.js'
import { useMainStore } from '../stores/index.js'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const store = useMainStore()
const { isSyncing, homeVisibleCount, isOnline } = storeToRefs(store)
const { loadMoreItems, resetVisibleCount } = store

const props = defineProps({
  filteredItems: { type: Array, required: true },
  filterZone: { type: String, required: true },
  searchText: { type: String, required: true },
  familySettings: { type: Object, required: true },
  isSelectionMode: { type: Boolean, required: true },
  selectedHomeIds: { type: Array, required: true },
  showScrollTop: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:filterZone',
  'update:searchText',
  'update:isSelectionMode',
  'update:selectedHomeIds',
  'edit',
  'take-out',
  'delete-selected',
  'add-batch-to-buy',
  'add-page',
  'open-preview',
  'scroll-to-top',
  'toggle-sidebar'
])

let longPressTimer = null

const formatOwners = (owners) => {
  if (!owners || owners.length === 0) return "全家"
  return owners.join(", ")
}

const handleTouchStart = (item) => {
  if (props.isSelectionMode) return
  longPressTimer = setTimeout(() => { emit('edit', item) }, LONG_PRESS_DURATION)
}

const handleTouchEnd = () => { 
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null } 
}

const handleTouchMove = () => { 
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null } 
}

const handleCardClick = (item) => {
  if (props.isSelectionMode) {
    // 防止重複加入：已在待買或購物車的不能選
    if (item.shoppingStatus === 'toBuy' || item.shoppingStatus === 'inCart') return

    const list = [...props.selectedHomeIds]
    const idx = list.indexOf(item.id)
    if (idx > -1) {
      list.splice(idx, 1)
    } else {
      list.push(item.id)
    }
    emit('update:selectedHomeIds', list)
  }
}

// === Infinite Scroll Logic ===
// visibleCount moved to store to persist scroll position
const scrollSentinel = ref(null)
let observer = null

const visibleItems = computed(() => {
  return props.filteredItems.slice(0, homeVisibleCount.value)
})

const visibleItemDaysMap = computed(() => {
  const daysMap = new Map()
  visibleItems.value.forEach((item) => {
    const rawDays = getDays(item.expiryDate)
    daysMap.set(item.id, Number.isFinite(rawDays) ? rawDays : 9999)
  })
  return daysMap
})

const getItemDaysToExpiry = (itemId) => visibleItemDaysMap.value.get(itemId) ?? 9999

// Reset visible count ONLY when filter keys change, not when data updates
watch([() => props.searchText, () => props.filterZone], () => {
    resetVisibleCount()
    // Optional: Scroll to top when filter changes to show top results
    window.scrollTo({ top: 0, behavior: 'instant' })
})

onMounted(() => {
  const options = {
    root: null,
    rootMargin: '200px', // Load more before reaching actual bottom
    threshold: 0.1
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (homeVisibleCount.value < props.filteredItems.length) {
          loadMoreItems() // Load next batch via store
        }
      }
    })
  }, options)

  // Watch sentinel ref
  watch(scrollSentinel, (el, oldEl) => {
    if (oldEl) observer.unobserve(oldEl)
    if (el) observer.observe(el)
  }, { immediate: true })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
/* 簡單的 CSS 優化 */
.item-card {
  contain: content; /* 告訴瀏覽器這個元素的內容不會影響外部 */
}

/* 狀態懸浮標籤樣式 */
.item-img-box {
    position: relative; /* 確保 absolute 子元素定位正確 */
}

.status-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
    color: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    backdrop-filter: blur(4px);
    z-index: 2;
}

.status-badge.to-buy {
    background-color: rgba(13, 202, 240, 0.9); /* Bootstrap info color */
    color: #000;
}

.status-badge.in-cart {
    background-color: rgba(255, 193, 7, 0.9); /* Bootstrap warning color */
    color: #000;
}

/* 現代化搜尋欄樣式 */
.modern-search-container {
  border-radius: 50rem;
  background-color: #fff;
  transition: box-shadow 0.2s ease-in-out;
}

.modern-search-container:focus-within {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

.modern-search-bar {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  height: 48px;
}

.search-icon {
  color: #6c757d;
  padding: 0 0.75rem;
  font-size: 1.1rem;
}

.modern-search-input {
  flex-grow: 1;
  border: none;
  background: transparent;
  padding: 0.5rem 0;
  outline: none;
  min-width: 0; /* 避免 flex-item 溢出 */
}

.modern-search-input::placeholder {
  color: #adb5bd;
}

.modern-clear-btn {
  background: transparent;
  border: none;
  color: #ced4da;
  padding: 0 0.5rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s;
}

.modern-clear-btn:hover {
  color: #6c757d;
}

.modern-divider {
  width: 1px;
  height: 24px;
  background-color: #dee2e6;
  margin: 0 0.5rem;
}

.modern-filter-select {
  border: none;
  background-color: transparent;
  padding: 0.5rem 1.5rem 0.5rem 0.5rem;
  font-weight: 600;
  color: #495057;
  cursor: pointer;
  outline: none;
  max-width: 110px;
  
  /* 自訂箭頭樣式 */
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 12px;
}

.modern-filter-select:hover {
  color: #212529;
}
</style>
