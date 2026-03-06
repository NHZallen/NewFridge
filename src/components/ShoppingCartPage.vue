<template>
  <div class="bento-mode">
    <div class="bento-bg-layer">
      <div class="mesh-blob blob-1"></div>
      <div class="mesh-blob blob-2"></div>
      <div class="mesh-blob blob-3"></div>
    </div>

    <header class="bento-header">
      <button class="glass-icon-btn" @click="$emit('navigate', 'sidebar')" aria-label="返回側邊欄">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="m-0 fs-5 fw-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">購物車</h1>
      <div style="width: 40px;" aria-hidden="true"></div>
    </header>

    <div class="bento-container">
      <div v-if="cartList.length === 0 && cartFilterZone === 'all'" class="bento-hero d-flex flex-column align-items-center justify-content-center py-5">
        <div class="hero-icon-box bg-secondary opacity-50">
          <span class="material-symbols-outlined text-white fs-2">shopping_basket</span>
        </div>
        <h2 class="fw-bold mb-1">購物車目前是空的</h2>
        <p class="text-muted small">把待購項目加入購物車後，會在這裡集中管理。</p>
      </div>

      <div v-else>
        <div class="bento-hero">
          <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.2)); filter: blur(40px); border-radius: 50%;"></div>
          <div class="hero-icon-box">
            <span class="material-symbols-outlined text-white fs-1">{{ heroInfo.icon }}</span>
          </div>
          <h2 class="display-6 fw-bold mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">{{ cartList.length }} 項商品</h2>
          <p class="text-muted fw-bold small">{{ heroInfo.label }} - {{ heroInfo.sub }}</p>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-4">
          <div class="d-flex gap-2 overflow-auto no-scrollbar pb-1 flex-grow-1 me-2">
            <button
              class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0"
              :class="cartFilterZone === 'all' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
              style="font-size: 0.85rem;"
              :aria-pressed="cartFilterZone === 'all'"
              @click="cartFilterZone = 'all'"
            >全部</button>
            <button
              class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0"
              :class="cartFilterZone === 'cold' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
              style="font-size: 0.85rem;"
              :aria-pressed="cartFilterZone === 'cold'"
              @click="cartFilterZone = 'cold'"
            >冷藏</button>
            <button
              class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0"
              :class="cartFilterZone === 'frozen' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
              style="font-size: 0.85rem;"
              :aria-pressed="cartFilterZone === 'frozen'"
              @click="cartFilterZone = 'frozen'"
            >冷凍</button>
            <button
              class="btn rounded-pill px-3 py-1 fw-bold border-0 shadow-sm flex-shrink-0"
              :class="cartFilterZone === 'veggie' ? 'chip-active' : 'btn-light bg-white bg-opacity-50 text-secondary'"
              style="font-size: 0.85rem;"
              :aria-pressed="cartFilterZone === 'veggie'"
              @click="cartFilterZone = 'veggie'"
            >蔬果</button>
          </div>
        </div>

        <div v-if="cartList.length === 0" class="text-center text-muted py-5">
          <p>這個分區目前沒有項目。</p>
        </div>

        <div class="d-flex flex-column gap-3">
          <div
            v-for="item in cartList"
            :key="item.id"
            class="bento-card d-flex align-items-center p-3"
            role="button"
            tabindex="0"
            :aria-pressed="localSelectedIds.includes(item.id)"
            :aria-label="`${item.name}，${localSelectedIds.includes(item.id) ? '已選取' : '未選取'}`"
            @click="toggleSelection(item.id)"
            @keydown.enter.prevent="toggleSelection(item.id)"
            @keydown.space.prevent="toggleSelection(item.id)"
          >
            <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
              <input
                v-model="localSelectedIds"
                type="checkbox"
                class="form-check-input border-2"
                :value="item.id"
                :aria-label="`選取 ${item.name}`"
                style="cursor: pointer; border-color: #cbd5e1;"
                @click.stop
              >
            </div>

            <div
              class="bento-img-box ms-3 flex-shrink-0"
              style="width: 64px; height: 64px; border-radius: 12px;"
              role="img"
              :aria-label="item.image ? `${item.name} 的照片` : `${item.name} 沒有照片`"
              :style="{ backgroundImage: item.image ? `url(${item.image})` : 'none' }"
            >
              <div v-if="!item.image" class="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                <i class="bi bi-image fs-5"></i>
              </div>
            </div>

            <div class="ms-3 flex-grow-1 min-w-0">
              <div class="d-flex align-items-center mb-1">
                <span
                  class="zone-tag mb-0 me-2"
                  :class="{
                    'zone-cold': item.zone === 'cold',
                    'zone-frozen': item.zone === 'frozen',
                    'zone-veggie': item.zone === 'veggie'
                  }"
                >{{ getZoneName(item.zone) }}</span>
              </div>
              <h3 class="fw-bold fs-6 text-truncate mb-0">{{ item.name }}</h3>
              <small class="text-secondary fw-bold" style="font-size: 0.75rem;">
                數量：{{ item.quantity }}
              </small>
            </div>

            <button
              class="btn btn-dark rounded-circle d-flex align-items-center justify-content-center ms-2 flex-shrink-0"
              style="width: 42px; height: 42px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
              :aria-label="`把 ${item.name} 帶回冰箱`"
              @click.stop="$emit('start-purchase', item)"
            >
              <span class="material-symbols-outlined fs-5">input</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="action-island-container" v-if="inCartItems.length > 0">
      <div class="action-island">
        <div class="island-text ms-2" aria-live="polite">
          <div>已選取</div>
          <div class="fs-4">{{ localSelectedIds.length }} 項</div>
        </div>
        <div class="island-controls">
          <button
            class="island-trash-btn"
            :disabled="localSelectedIds.length === 0 || !isOnline"
            @click="handleRemove"
            aria-label="從購物車移除選取項目"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>

          <button
            class="island-action-btn"
            :disabled="localSelectedIds.length === 0 || !isOnline"
            @click="handleMoveBack"
            aria-label="把選取項目移回待購"
          >
            移回待購
            <span class="material-symbols-outlined">shopping_cart</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getZoneName } from '../utils/itemHelpers.js'
import { useInventoryActions } from '../composables/useInventoryActions'
import { useMainStore } from '../stores/index.js'

export default {
  name: 'ShoppingCartPage',
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  emits: ['navigate', 'start-purchase', 'show-error'],
  setup(props, { emit }) {
    const store = useMainStore()
    const { isOnline } = storeToRefs(store)
    const { updateShoppingStatus } = useInventoryActions({
      showToast: (message) => emit('show-error', message)
    })
    const localSelectedIds = ref([])
    const cartFilterZone = ref('all')

    const inCartItems = computed(() => {
      return props.items.filter((item) => item.shoppingStatus === 'inCart')
    })

    const cartList = computed(() => {
      if (cartFilterZone.value === 'all') {
        return inCartItems.value
      }

      return inCartItems.value.filter((item) => (item.zone || 'cold') === cartFilterZone.value)
    })

    const heroInfo = computed(() => {
      switch (cartFilterZone.value) {
        case 'cold':
          return { icon: 'kitchen', label: '冷藏分區', sub: '準備放回冰箱的冷藏品項' }
        case 'frozen':
          return { icon: 'ac_unit', label: '冷凍分區', sub: '準備放回冰箱的冷凍品項' }
        case 'veggie':
          return { icon: 'eco', label: '蔬果分區', sub: '準備放回冰箱的蔬果品項' }
        default:
          return { icon: 'shopping_basket', label: '全部商品', sub: '已加入購物車、等待購入的項目' }
      }
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
      const success = await updateShoppingStatus({
        ids: [...localSelectedIds.value],
        nextStatus: null,
        errorMessage: '移除失敗，請稍後再試'
      })

      if (success) {
        localSelectedIds.value = []
      }
    }

    const handleMoveBack = async () => {
      const success = await updateShoppingStatus({
        ids: [...localSelectedIds.value],
        nextStatus: 'toBuy',
        errorMessage: '移回待購失敗，請稍後再試'
      })

      if (success) {
        localSelectedIds.value = []
      }
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
      handleMoveBack,
      isOnline
    }
  }
}
</script>
