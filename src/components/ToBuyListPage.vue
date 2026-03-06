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
      <h1 class="m-0 fs-5 fw-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">待購清單</h1>
      <div style="width: 40px;" aria-hidden="true"></div>
    </header>

    <div class="bento-container">
      <div v-if="toBuyList.length === 0" class="bento-hero d-flex flex-column align-items-center justify-content-center py-5">
        <div class="hero-icon-box bg-info bg-opacity-50">
          <span class="material-symbols-outlined text-white fs-2">playlist_add_check</span>
        </div>
        <h2 class="fw-bold mb-1">目前沒有待購項目</h2>
        <p class="text-muted small">從首頁加入待購後，這裡會集中顯示。</p>
      </div>

      <div v-else>
        <div class="bento-hero">
          <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2)); filter: blur(40px); border-radius: 50%;"></div>
          <div class="hero-icon-box" style="background: linear-gradient(135deg, #0891b2, #155e75);">
            <span class="material-symbols-outlined text-white fs-1">list_alt</span>
          </div>
          <h2 class="display-6 fw-bold mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">{{ toBuyList.length }} 項待購</h2>
          <p class="text-muted fw-bold small">選取後可移除，或加入購物車。</p>
        </div>

        <div class="d-flex flex-column gap-3">
          <div
            v-for="item in toBuyList"
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
          </div>
        </div>
      </div>
    </div>

    <div class="action-island-container" v-if="toBuyList.length > 0">
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
            aria-label="移除選取的待購項目"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>

          <button
            class="island-action-btn"
            :disabled="localSelectedIds.length === 0 || !isOnline"
            @click="handleMoveToCart"
            aria-label="把選取項目加入購物車"
          >
            加入購物車
            <span class="material-symbols-outlined">add_shopping_cart</span>
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
    const { updateShoppingStatus } = useInventoryActions({
      showToast: (message) => emit('show-error', message)
    })
    const localSelectedIds = ref([])

    const toBuyList = computed(() => {
      return props.items.filter((item) => item.shoppingStatus === 'toBuy')
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

    const handleMoveToCart = async () => {
      const success = await updateShoppingStatus({
        ids: [...localSelectedIds.value],
        nextStatus: 'inCart',
        errorMessage: '加入購物車失敗，請稍後再試'
      })

      if (success) {
        localSelectedIds.value = []
        emit('navigate', 'shopping-cart')
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
