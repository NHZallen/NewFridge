<template>
  <div class="home-view">
    <!-- 頂部列 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-light border rounded-pill" @click="$emit('toggle-sidebar')" aria-controls="sidebar">
          <i class="bi bi-list"></i>
        </button>
        <div class="d-flex flex-column">
          <h4 class="fw-bold m-0">
            <i class="bi bi-snow2 text-primary" v-if="filterZone !== 'nostock'"></i>
            <i class="bi bi-archive text-secondary" v-else></i>
            {{ getZoneName(filterZone) }}
          </h4>
          <small class="text-muted" style="font-size: 0.8rem;">{{ familySettings.familyName }}</small>
        </div>
      </div>
      
      <!-- 管理模式按鈕 -->
      <button class="btn btn-outline-dark btn-sm rounded-pill px-3" @click="$emit('update:isSelectionMode', !isSelectionMode)">
        {{ isSelectionMode ? '取消' : '管理' }}
      </button>
    </div>

    <!-- 搜尋與篩選 (非無庫存區顯示) -->
    <div class="input-group mb-4 shadow-sm" v-if="filterZone !== 'nostock'">
      <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
      <input type="text" 
             class="form-control border-start-0 py-2" 
             placeholder="搜尋物品..." 
             :value="searchText"
             @input="$emit('update:searchText', $event.target.value)">
      <select class="form-select border-start-0 bg-light" 
              :value="filterZone"
              @change="$emit('update:filterZone', $event.target.value)"
              style="max-width: 110px;">
        <option value="all">全區</option>
        <option value="cold">冷藏區</option>
        <option value="frozen">冷凍區</option>
        <option value="veggie">蔬果區</option>
      </select>
      <button v-if="searchText" class="btn btn-light border" @click="$emit('update:searchText', '')">清除</button>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-2 px-1">
      <small class="text-muted" v-if="filterZone !== 'nostock'"><i class="bi bi-info-circle me-1"></i>長按物品可編輯</small>
      <small class="text-muted" v-else><i class="bi bi-info-circle me-1"></i>顯示已用完的物品</small>
    </div>

    <!-- 物品列表 -->
    <div class="row g-3 pb-5">
      <div 
        class="col-6 col-md-4 col-lg-3" 
        v-for="item in filteredItems" 
        :key="item.id"
        v-memo="[item.name, item.quantity, item.image, item.shoppingStatus, item.zone, item.storedDate, item.expiryDate, item.owners, isSelectionMode, selectedHomeIds.includes(item.id)]"
      >
        <div class="card item-card h-100" 
             :class="getAlertClass(item)"
             @touchstart="handleTouchStart(item)"
             @touchend="handleTouchEnd"
             @touchmove="handleTouchMove"
             @click="handleCardClick(item)"
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

            <div class="item-img-box" @click.stop="!isSelectionMode && $emit('open-preview', item.image)">
                <img v-if="item.image" :src="item.image" class="item-img" loading="lazy">
                <div v-else class="text-muted"><i class="bi bi-image fs-1"></i></div>
                <div class="zone-bar" :style="{ backgroundColor: getZoneColor(item.zone) }"></div>
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

                <!-- 購物狀態顯示 -->
                <div class="mb-2" v-if="item.shoppingStatus === 'toBuy'">
                    <span class="badge bg-info text-dark w-100"><i class="bi bi-cart-plus me-1"></i>待購買</span>
                </div>
                <div class="mb-2" v-else-if="item.shoppingStatus === 'inCart'">
                    <span class="badge bg-warning text-dark w-100"><i class="bi bi-cart-check me-1"></i>購物車中</span>
                </div>

                <div v-if="filterZone !== 'nostock'">
                    <div class="mb-2">
                        <small class="text-muted" v-if="item.storedDate">存入: {{ item.storedDate }}</small>
                        <small class="text-muted" v-else>存入: 未填</small>
                    </div>
                    <div v-if="isNoExpiry(item)" class="badge bg-light text-secondary border w-100 mb-2">無期限</div>
                    <template v-else>
                        <div v-if="getDays(item.expiryDate) < 0" class="badge bg-danger w-100 mb-2">已過期 ({{ item.expiryDate }})</div>
                        <div v-else-if="getDays(item.expiryDate) <= 3" class="badge bg-danger w-100 mb-2">剩 {{ getDays(item.expiryDate) }} 天!</div>
                        <div v-else-if="getDays(item.expiryDate) <= 7" class="badge bg-warning text-dark w-100 mb-2">剩 {{ getDays(item.expiryDate) }} 天</div>
                        <div v-else class="badge bg-light text-secondary border w-100 mb-2">{{ item.expiryDate }}</div>
                    </template>
                </div>

                <button v-if="!isSelectionMode" 
                        class="btn btn-sm mt-auto w-100 rounded-pill"
                        :class="item.quantity > 0 ? 'btn-outline-danger' : 'btn-outline-secondary'"
                        @click.stop="item.quantity > 0 ? $emit('take-out', item) : $emit('edit', item)">
                    {{ item.quantity > 0 ? '取出 / 吃掉' : '查看詳情' }}
                </button>
            </div>
        </div>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="text-center text-muted mt-5 pt-5">
      <i class="bi bi-box2 display-1 opacity-25"></i>
      <p class="mt-3">該區域是空的</p>
    </div>

    <!-- 回到頂部按鈕 -->
    <button v-if="showScrollTop" class="scroll-top-btn" @click="$emit('scroll-to-top')">
      <i class="bi bi-arrow-up"></i>
    </button>

    <!-- 一般模式的 FAB -->
    <button v-if="!isSelectionMode && filterZone !== 'nostock'" class="fab-btn" @click="$emit('add-page')">
      <i class="bi bi-plus-lg"></i>
    </button>
    
    <!-- 多選模式的底部操作列 -->
    <div v-if="isSelectionMode" class="fixed-bottom p-3 bg-white border-top shadow-lg">
         <div v-if="filterZone === 'nostock'" class="d-flex gap-2">
            <button class="btn btn-outline-danger w-50 rounded-pill py-2" 
                    :disabled="selectedHomeIds.length === 0"
                    @click="$emit('delete-selected')">
                <i class="bi bi-trash me-1"></i> 永久刪除
            </button>
             <button class="btn btn-info text-white w-50 rounded-pill py-2 fw-bold" 
                    :disabled="selectedHomeIds.length === 0"
                    @click="$emit('add-batch-to-buy')">
                <i class="bi bi-cart-plus me-1"></i> 加入待買
            </button>
         </div>
         <div v-else class="d-flex gap-2">
             <button class="btn btn-info text-white w-100 rounded-pill py-2 fw-bold" 
                    :disabled="selectedHomeIds.length === 0"
                    @click="$emit('add-batch-to-buy')">
                <i class="bi bi-cart-plus me-1"></i> 加入待購買清單 ({{ selectedHomeIds.length }})
            </button>
         </div>
    </div>
  </div>
</template>

<script>
import { getDays } from '../utils/dateUtils.js'
import { LONG_PRESS_DURATION } from '../utils/constants.js'

export default {
  name: 'HomeView',
  props: {
    filteredItems: { type: Array, required: true },
    filterZone: { type: String, required: true },
    searchText: { type: String, required: true },
    familySettings: { type: Object, required: true },
    isSelectionMode: { type: Boolean, required: true },
    selectedHomeIds: { type: Array, required: true },
    showScrollTop: { type: Boolean, default: false }
  },
  emits: [
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
    'scroll-to-top'
  ],
  setup(props, { emit }) {
    let longPressTimer = null

    const isNoExpiry = (item) => {
      return item.noExpiry || !item.expiryDate
    }

    const getZoneName = (zone) => {
        switch(zone) {
            case 'all': return '全區';
            case 'cold': return '冷藏區';
            case 'frozen': return '冷凍區';
            case 'veggie': return '蔬果區';
            case 'nostock': return '無庫存區';
            default: return '冰箱庫存';
        }
    }

    const getZoneColor = (zone) => {
        const z = zone || 'cold';
        switch(z) {
            case 'cold': return '#80aaff';
            case 'frozen': return '#002266';
            case 'veggie': return '#29a329';
            default: return '#80aaff';
        }
    }

    const formatOwners = (owners) => {
        if (!owners || owners.length === 0) return "全家";
        return owners.join(", ");
    }

    const getAlertClass = (item) => {
        if (parseInt(item.quantity) === 0) return ""; 
        if (isNoExpiry(item)) return "";
        const d = getDays(item.expiryDate);
        if (d === null) return "";
        if (d < 0) return "alert-red"; 
        if (d <= 7) return "alert-yellow";
        return "";
    }

    const handleTouchStart = (item) => {
        if (props.isSelectionMode) return; 
        longPressTimer = setTimeout(() => { emit('edit', item); }, LONG_PRESS_DURATION);
    }
    
    const handleTouchEnd = () => { 
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } 
    }
    
    const handleTouchMove = () => { 
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } 
    }

    const handleCardClick = (item) => {
        if (props.isSelectionMode) {
            // 防止重複加入：已在待買或購物車的不能選
            if (item.shoppingStatus === 'toBuy' || item.shoppingStatus === 'inCart') return;

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

    return {
      getDays,
      isNoExpiry,
      getZoneName,
      getZoneColor,
      formatOwners,
      getAlertClass,
      handleTouchStart,
      handleTouchEnd,
      handleTouchMove,
      handleCardClick
    }
  }
}
</script>

<style scoped>
/* 簡單的 CSS 優化 */
.item-card {
  contain: content; /* 告訴瀏覽器這個元素的內容不會影響外部 */
}
</style>
