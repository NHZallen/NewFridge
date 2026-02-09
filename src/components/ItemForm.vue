<template>
  <div class="page-container">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <button class="btn btn-light border rounded-pill" @click="$emit('cancel')">
            <i class="bi bi-arrow-left"></i> 取消
        </button>
        <h5 class="fw-bold m-0">{{ mode==='edit' ? '編輯物品' : '放入新物品' }}</h5>
        <div style="width: 74px;"></div>
    </div>

    <div class="card section-card">
        <div class="card-body">
            <form @submit.prevent="submitItem">
                
                <!-- 編輯模式下顯示的待購買開關 -->
                <div v-if="mode==='edit'" class="mb-4 bg-light p-3 rounded border">
                    <div v-if="formItem.shoppingStatus === 'inCart'" class="d-flex align-items-center text-warning">
                        <i class="bi bi-cart-check fs-3 me-3"></i>
                        <div>
                            <div class="fw-bold">已在購物車中</div>
                            <small class="text-muted">請至購物車進行結帳存入</small>
                        </div>
                    </div>
                    
                    <div v-else>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="form-check form-switch flex-grow-1">
                                <input class="form-check-input" type="checkbox" id="toBuySwitch" 
                                       :checked="formItem.shoppingStatus === 'toBuy'"
                                       @change="toggleToBuyStatus"
                                       style="cursor: pointer;">
                                <label class="form-check-label fw-bold d-flex align-items-center" for="toBuySwitch" style="cursor: pointer;">
                                    <i class="bi bi-cart-plus text-info me-2 fs-5"></i>
                                    加入待購買清單
                                </label>
                            </div>
                            <!-- 快速儲存按鈕 -->
                            <button type="button" class="btn btn-primary btn-sm rounded-pill px-3 ms-2" 
                                    @click="submitItem" :disabled="isUploading || isCompressing || !isOnline">
                                <i class="bi bi-check-lg me-1"></i>儲存
                            </button>
                        </div>
                        <div class="text-muted small mt-1">勾選後，此物品會出現在「待購買」列表，提醒您補貨。</div>
                    </div>
                </div>

                <!-- 物品名稱與區域 -->
                <div class="mb-3">
                    <label class="form-label fw-bold">1. 存放區域</label>
                    <div class="btn-group w-100" role="group">
                        <input type="radio" class="btn-check" name="zone" id="zone-cold" value="cold" v-model="formItem.zone" checked>
                        <label class="btn btn-outline-cold" for="zone-cold">冷藏區</label>

                        <input type="radio" class="btn-check" name="zone" id="zone-frozen" value="frozen" v-model="formItem.zone">
                        <label class="btn btn-outline-frozen" for="zone-frozen">冷凍區</label>

                        <input type="radio" class="btn-check" name="zone" id="zone-veggie" value="veggie" v-model="formItem.zone">
                        <label class="btn btn-outline-veggie" for="zone-veggie">蔬果區</label>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">2. 名稱</label>
                    <input type="text" class="form-control form-control-lg" v-model="formItem.name" placeholder="例如：鮮奶" list="nameSuggestions" required>
                    <datalist id="nameSuggestions">
                        <option v-for="name in uniqueItemNames" :key="name" :value="name"></option>
                    </datalist>
                </div>

                <!-- 偵測重複提示 -->
                <div v-if="matchedExistingItem && !dismissedExistingAlert" class="alert alert-warning d-flex align-items-start mb-3 position-relative" role="alert">
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-2" @click="dismissedExistingAlert = true" aria-label="Close"></button>
                    <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                    <div>
                        <div class="fw-bold">發現相同物品</div>
                        <div class="small">冰箱已有「{{ matchedExistingItem.name }}」(庫存 {{ matchedExistingItem.quantity }})，此操作將會把新買的加入庫存（自動建立新批次）。</div>
                    </div>
                </div>

                <!-- 跨區重複提示 -->
                <div v-if="matchedOtherZoneItem && !dismissedOtherZoneAlert" class="alert alert-info d-flex align-items-start mb-3 position-relative" role="alert">
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-2" @click="dismissedOtherZoneAlert = true" aria-label="Close"></button>
                    <i class="bi bi-info-circle-fill me-2 mt-1"></i>
                    <div>
                        <div class="fw-bold">其他區域已有此物品</div>
                        <div class="small mb-2">「{{ getZoneName(matchedOtherZoneItem.zone) }}」已有「{{ matchedOtherZoneItem.name }}」，建議切換區域以繼承照片與設定。</div>
                        <button type="button" class="btn btn-sm btn-light border-primary text-primary rounded-pill fw-bold" 
                                @click="formItem.zone = matchedOtherZoneItem.zone">
                            <i class="bi bi-arrow-repeat me-1"></i>切換至{{ getZoneName(matchedOtherZoneItem.zone) }}
                        </button>
                    </div>
                </div>

                <!-- 圖片區 -->
                <div class="mb-4">
                    <label class="form-label fw-bold fs-5">3. 物品照片</label>
                    
                    <!-- 編輯模式更換照片提示 -->
                    <div v-if="mode==='edit'" class="alert alert-info d-flex align-items-center mb-2 py-2 small" role="alert">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <div>更換照片將會同步更新此物品的所有批次。</div>
                    </div>

                    <div v-if="matchedExistingItem" class="mb-2 bg-light p-3 rounded border">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="useExistingImg" v-model="formItem.useExistingImage" style="cursor: pointer;">
                            <label class="form-check-label fw-bold" for="useExistingImg" style="cursor: pointer;">
                                沿用舊照片 (免上傳)
                                <div class="text-muted small fw-normal">本次購買將不會更新照片，直到舊的吃完才會切換。</div>
                            </label>
                        </div>
                    </div>

                    <div v-if="!formItem.useExistingImage" class="d-flex flex-column align-items-center justify-content-center border rounded bg-light p-3" style="min-height: 200px;" @click="$refs.fileInput.click()">
                        <img v-if="displayImage" :src="displayImage" class="w-100 rounded" style="max-height: 300px; object-fit: contain;">
                        <div v-else class="text-center text-muted">
                            <i class="bi bi-camera fs-1"></i>
                            <div class="mt-2">點擊選擇相機或相簿</div>
                        </div>
                    </div>
                    <div v-else-if="matchedExistingItem" class="d-flex flex-column align-items-center justify-content-center border rounded bg-light p-3 opacity-75">
                        <img :src="matchedExistingItem.image" class="w-100 rounded" style="max-height: 200px; object-fit: contain; filter: grayscale(50%);">
                        <div class="mt-2 text-muted fw-bold"><i class="bi bi-link-45deg"></i> 將使用這張舊照片</div>
                    </div>

                    <input ref="fileInput" type="file" class="d-none" accept="image/*" @change="processImage">
                    <small class="text-muted d-block mt-2 text-center" v-if="isCompressing">正在處理圖片...</small>
                </div>

                <div v-if="formItem.quantity != 0 || formItem.quantity === ''">
                    <div class="mb-3">
                        <label class="form-label fw-bold">4. 數量</label>
                        <input type="number" inputmode="numeric" class="form-control form-control-lg" v-model="formItem.quantity" placeholder="1" required>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">5. 存入日期</label>
                        <input type="date" class="form-control form-control-lg" v-model="formItem.storedDate" required>
                    </div>

                    <div class="mb-4">
                        <div v-if="!formItem.noExpiry">
                            <label class="form-label fw-bold">6. 到期日（可不填）</label>
                            <input type="date" class="form-control form-control-lg" v-model="formItem.expiryDate">
                        </div>

                        <div class="form-check form-switch mt-3">
                            <input class="form-check-input" type="checkbox" id="noExpirySwitch" v-model="formItem.noExpiry">
                            <label class="form-check-label fw-bold" for="noExpirySwitch">此物品無期限</label>
                        </div>

                        <div class="mt-3 d-flex gap-2 overflow-auto" v-if="!formItem.noExpiry">
                            <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(3)">+3天</button>
                            <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(7)">+1週</button>
                            <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(14)">+2週</button>
                            <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(30)">+1月</button>
                        </div>
                    </div>
                </div>
                
                <div class="mb-4 position-relative">
                    <label class="form-label fw-bold">{{ ownerFieldIndex }}. 物品所有人</label>
                    
                    <!-- 隱形遮罩，用來點擊外部關閉選單 -->
                    <div v-if="showOwnerDropdown" class="position-fixed top-0 start-0 w-100 h-100" style="z-index: 1040; cursor: default;" @click="showOwnerDropdown = false"></div>

                    <div class="dropdown dropup w-100">
                        <button class="btn btn-outline-dark dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center" 
                                type="button" 
                                @click="showOwnerDropdown = !showOwnerDropdown"
                                style="position: relative; z-index: 1050;">
                            <span class="text-truncate">{{ formatOwners(formItem.owners) }}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-custom shadow border-0" 
                            :class="{ show: showOwnerDropdown }"
                            style="z-index: 1051; top: auto; bottom: 100%; margin-bottom: 5px;">
                            <li>
                                <label class="dropdown-item-custom">
                                    <input type="checkbox" class="form-check-input" 
                                           :checked="formItem.owners.includes('全家')"
                                           @change="toggleOwner('全家')">
                                    <span class="fw-bold">全家 (預設)</span>
                                </label>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li v-for="member in familySettings.members" :key="member">
                                <label class="dropdown-item-custom">
                                    <input type="checkbox" class="form-check-input"
                                           :checked="formItem.owners.includes(member)"
                                           @change="toggleOwner(member)">
                                    {{ member }}
                                </label>
                            </li>
                        </ul>
                    </div>
                    <div class="form-text">您可以選擇「全家」或是指定多位成員</div>
                </div>

                <button type="submit" 
                        class="btn btn-primary w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm d-flex align-items-center justify-content-center overflow-hidden position-relative" 
                        :class="{'btn-success': isSuccess, 'btn-secondary': !isFormValid && !isSuccess}"
                        :disabled="isUploading || isCompressing || isSuccess || !isFormValid || !isOnline">
                    
                    <!-- 1. 初始狀態文字 -->
                    <span v-if="!isUploading && !isCompressing && !isSuccess">
                        {{ mode==='edit' ? '儲存變更' : '確認放入冰箱' }}
                    </span>

                    <!-- 2. 處理中 (Spinner) -->
                    <span v-else-if="(isUploading || isCompressing) && !isSuccess" class="d-flex align-items-center">
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        處理中...
                    </span>

                    <!-- 3. 成功打勾動畫 -->
                    <span v-else-if="isSuccess" class="d-flex align-items-center justify-content-center">
                        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                            <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                        <span class="ms-2">完成！</span>
                    </span>
                </button>

                <!-- 0庫存物品的永久刪除按鈕 -->
                <button v-if="mode==='edit' && formItem.quantity == 0 && formItem.quantity !== ''" 
                        type="button" 
                        class="btn btn-outline-danger w-100 mt-3 rounded-pill"
                        @click="handleDelete">
                    <i class="bi bi-trash me-1"></i> 永久刪除此物品
                </button>
            </form>
        </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onUnmounted } from 'vue'
import { doc, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../composables/useFirebase'
import { useImageCompression } from '../composables/useImageCompression.js'
import { addDaysToDate } from '../utils/dateUtils.js'
import { recalculateItemFromBatches } from '../utils/inventoryUtils.js'
import { uploadImage, deleteImage, cleanupUnusedImages } from '../utils/storageUtils.js'
import { useMainStore } from '../stores/index.js'
import { storeToRefs } from 'pinia'

export default {
  name: 'ItemForm',
  props: {
    mode: { type: String, required: true }, // 'add' or 'edit'
    initialItem: { type: Object, required: true },
    allItems: { type: Array, required: true },
    familySettings: { type: Object, required: true },
    pendingPurchaseOriginalId: { type: String, default: null }
  },
  emits: ['cancel', 'submit-success', 'delete-item', 'update-pending-id'],
  setup(props, { emit }) {
    const store = useMainStore()
    const { isOnline } = storeToRefs(store)
    
    const formItem = ref({ ...props.initialItem })
    const isCompressing = ref(false)
    const isUploading = ref(false)
    const isSuccess = ref(false)
    const showOwnerDropdown = ref(false)
    
    // Dismissible banner states
    const dismissedExistingAlert = ref(false)
    const dismissedOtherZoneAlert = ref(false)
    
    // Store the raw Blob for uploading later
    const pendingImageBlob = ref(null)
    // Store local preview URL (needs cleanup)
    const previewImageUrl = ref(null)

    // 使用 composable 取得 compressFile
    const { compressFile } = useImageCompression()

    // Clean up ObjectURL to avoid memory leaks
    onUnmounted(() => {
        if (previewImageUrl.value) {
            URL.revokeObjectURL(previewImageUrl.value)
        }
    })

    // 重置 formItem 當 prop 改變
    watch(() => props.initialItem, (newVal) => {
        formItem.value = { ...newVal }
        pendingImageBlob.value = null
        if (previewImageUrl.value) {
            URL.revokeObjectURL(previewImageUrl.value)
            previewImageUrl.value = null
        }
    }, { deep: true })

    const uniqueItemNames = computed(() => {
        return [...new Set(props.allItems.map(i => i.name))]
    })

    const matchedExistingItem = computed(() => {
        if (props.mode !== 'add') return null
        if (!formItem.value.name) return null
        // Strict match: Name AND Zone
        return props.allItems.find(i => i.name === formItem.value.name && i.zone === formItem.value.zone)
    })

    const matchedOtherZoneItem = computed(() => {
        if (props.mode !== 'add') return null
        if (!formItem.value.name) return null
        // Same name but DIFFERENT zone
        return props.allItems.find(i => i.name === formItem.value.name && i.zone !== formItem.value.zone)
    })

    const getZoneName = (zone) => {
        const map = { cold: '冷藏區', frozen: '冷凍區', veggie: '蔬果區' }
        return map[zone] || zone
    }

    // 當發現同名物品時，預設開啟「沿用舊照片」；若消失則關閉
    watch(matchedExistingItem, (newVal) => {
        if (newVal) {
            formItem.value.useExistingImage = true
        } else {
            formItem.value.useExistingImage = false
        }
    })
    
    // 計算物品所有人的題號
    const ownerFieldIndex = computed(() => {
        let q = formItem.value.quantity
        if (q === 0 || (typeof q === 'string' && q.trim() === '0')) return 4
        if (formItem.value.noExpiry) return 6
        return 7
    })
    
    // Helper to determine what to show in the UI
    const displayImage = computed(() => {
        if (previewImageUrl.value) return previewImageUrl.value
        return formItem.value.image
    })

    const addDays = (days) => {
        formItem.value.expiryDate = addDaysToDate(formItem.value.expiryDate, days)
    }

    const isFormValid = computed(() => {
        const hasName = !!formItem.value.name;
        const hasImage = formItem.value.useExistingImage || !!pendingImageBlob.value || !!formItem.value.image;
        return hasName && hasImage;
    })

    const formatOwners = (owners) => {
        if (!owners || owners.length === 0) return "全家";
        return owners.join(", ");
    }

    const toggleOwner = (name) => {
        let owners = formItem.value.owners || ['全家'];
        if (name === '全家') {
            if (owners.includes('全家')) {
                 owners = [];
            } else {
                owners = ['全家'];
            }
        } else {
            if (owners.includes('全家')) {
                owners = owners.filter(o => o !== '全家');
            }
            if (owners.includes(name)) {
                owners = owners.filter(o => o !== name);
            } else {
                owners.push(name);
            }
        }
        
        if (owners.length === 0) owners = ['全家']; 
        formItem.value.owners = owners;
    }

    const toggleToBuyStatus = () => {
        if (formItem.value.shoppingStatus === 'toBuy') {
            formItem.value.shoppingStatus = null
        } else {
            formItem.value.shoppingStatus = 'toBuy'
        }
    }

    const processImage = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        formItem.value.useExistingImage = false;
        isCompressing.value = true;
        try {
            // Compress and get a Blob
            const compressedBlob = await compressFile(file);
            pendingImageBlob.value = compressedBlob;
            
            // Create a local preview URL
            if (previewImageUrl.value) URL.revokeObjectURL(previewImageUrl.value)
            previewImageUrl.value = URL.createObjectURL(compressedBlob)
            
            // Clear the old base64/url string from formItem to ensure we know it's a new one
            // We'll rely on pendingImageBlob for the actual data
            formItem.value.image = null 
        } catch (e) {
            console.error(e)
            alert("圖片處理失敗：" + (e.message || "請嘗試選擇其他圖片或縮小圖片尺寸"));
        } finally {
            isCompressing.value = false;
        }
    }

    const handleDelete = async () => {
        if (!confirm("確定要永久刪除此物品嗎？此操作無法復原。")) return;
        
        isUploading.value = true;
        try {
            // No manual storage cleanup here. Delegating to App.vue via event.
            emit('delete-item', formItem.value.id);
        } catch(e) {
            console.error("Delete error:", e);
            alert("刪除時發生錯誤，請稍後再試");
            isUploading.value = false;
        }
    };

    const submitItem = async () => {
        // Validation
        if (!formItem.value.useExistingImage && !pendingImageBlob.value && !formItem.value.image) { 
            // if no new blob AND no existing image string (edit mode initial)
            alert("請記得拍照喔！"); return; 
        }
        
        let safeQuantity = 1;
        if (formItem.value.quantity === "" || formItem.value.quantity === null) {
            safeQuantity = (props.mode === 'add') ? 1 : 0;
        } else {
            safeQuantity = parseInt(formItem.value.quantity);
        }

        if (isNaN(safeQuantity)) safeQuantity = 0;
        
        if (safeQuantity != 0 && !formItem.value.storedDate) { 
            alert("請填存入日期"); return; 
        }

        isUploading.value = true;

        try {
            if (!db.value) return;
            let finalImageUrl = formItem.value.image; // Default to existing URL/Base64

            // Upload new image if exists
            if (!formItem.value.useExistingImage && pendingImageBlob.value) {
                // Pass item name as prefix for better organization
                finalImageUrl = await uploadImage(pendingImageBlob.value, formItem.value.name);
            }

            const expiryDateClean = formItem.value.noExpiry ? "" : (formItem.value.expiryDate || "");
            const noExpiryFinal = formItem.value.noExpiry || !expiryDateClean;
            const ownersFinal = (formItem.value.owners && formItem.value.owners.length > 0) ? formItem.value.owners : ['全家'];

            const newBatch = {
                storedDate: formItem.value.storedDate,
                expiryDate: expiryDateClean,
                noExpiry: noExpiryFinal,
                quantity: safeQuantity,
                image: finalImageUrl, 
                addedAt: Date.now()
            };

            // === TRANSACTION ROLLBACK SAFETY ===
            // We successfully uploaded the image (maybe). Now we try to write to Firestore.
            // If Firestore write fails, we MUST delete the image we just uploaded to avoid orphans.
            try {
                if (formItem.value.id) {
                    // === 編輯模式 (Edit Mode) ===
                    const oldItemRef = props.allItems.find(i => i.id === formItem.value.id);
                    let batches = oldItemRef && oldItemRef.batches ? [...oldItemRef.batches] : [];
                    
                    // Fallback for legacy items without batches
                    if (batches.length === 0 && oldItemRef && parseInt(oldItemRef.quantity) > 0) {
                        batches = [{
                            storedDate: oldItemRef.storedDate,
                            expiryDate: oldItemRef.expiryDate,
                            noExpiry: oldItemRef.noExpiry,
                            quantity: parseInt(oldItemRef.quantity),
                            image: oldItemRef.image || null,
                            addedAt: 0
                        }];
                    }

                    // === IMAGE REPLACEMENT LOGIC (Edit Mode) ===
                    // If user uploaded a new image, we apply it to ALL batches
                    const isReplacingImage = !formItem.value.useExistingImage && pendingImageBlob.value;
                    const oldImagesToDelete = new Set();
    
                    if (isReplacingImage) {
                        if (oldItemRef.image) oldImagesToDelete.add(oldItemRef.image);
                        batches.forEach(b => {
                            if (b.image) oldImagesToDelete.add(b.image);
                            b.image = finalImageUrl; // Update ALL batches to new image
                        });
                    }

                    // Calculate current total quantity from batches
                    const currentTotal = batches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
                    const targetTotal = safeQuantity;
                    const diff = targetTotal - currentTotal;

                    if (diff > 0) {
                        // === 增加數量 (Add Quantity) ===
                        const batchToAdd = {
                            ...newBatch,
                            quantity: diff 
                        };
                        batches.push(batchToAdd);

                    } else if (diff < 0) {
                         // === 減少數量 (Reduce Quantity) ===
                        batches.sort((a, b) => {
                            const dateA = a.noExpiry ? "9999-12-31" : (a.expiryDate || "9999-12-31");
                            const dateB = b.noExpiry ? "9999-12-31" : (b.expiryDate || "9999-12-31");
                            if (dateA < dateB) return -1;
                            if (dateA > dateB) return 1;
                            const storeA = a.storedDate || "9999-12-31";
                            const storeB = b.storedDate || "9999-12-31";
                            if (storeA < storeB) return -1;
                            if (storeA > storeB) return 1;
                            return 0;
                        });

                        let amountToRemove = Math.abs(diff);
                        const newBatches = [];
                        const imagesPotentiallyDeleted = new Set(); 

                        for (let batch of batches) {
                            if (amountToRemove <= 0) {
                                newBatches.push(batch);
                                continue;
                            }

                            let batchQty = parseInt(batch.quantity);
                            
                            if (batch.image) imagesPotentiallyDeleted.add(batch.image);

                            if (batchQty > amountToRemove) {
                                batch.quantity = batchQty - amountToRemove;
                                amountToRemove = 0;
                                newBatches.push(batch);
                            } else {
                                amountToRemove -= batchQty;
                            }
                        }
                        
                        batches = newBatches;
                        
                        // --- Image Cleanup Logic ---
                        // Identify images still in use
                        const remainingImages = new Set();
                        if (newBatch.image) remainingImages.add(newBatch.image); 
                        
                        batches.forEach(b => {
                            if (b.image) remainingImages.add(b.image);
                        });

                        // Delete images that are truly gone
                        imagesPotentiallyDeleted.forEach(url => {
                            if (!remainingImages.has(url)) {
                                 // If we are in "Replacing Image" mode, we will handle cleanup centrally later using oldImagesToDelete
                                 if (!isReplacingImage) {
                                      console.log("Edit Limit: Deleting unused image:", url);
                                      deleteImage(url);
                                 }
                            }
                        });

                    } else {
                        // === 數量不變 (No Quantity Change) ===
                        if (batches.length > 0) {
                             batches[0] = {
                                 ...batches[0],
                                 storedDate: newBatch.storedDate,
                                 expiryDate: newBatch.expiryDate,
                                 noExpiry: newBatch.noExpiry,
                             };
                             // Only update image if specific batch didn't get bulk updated or if we are not replacing
                             if (!isReplacingImage) {
                                batches[0].image = newBatch.image;
                             }
                        }
                    }

                    const result = recalculateItemFromBatches(batches, ownersFinal);

                    await updateDoc(doc(db.value, "fridge_items", formItem.value.id), {
                        name: formItem.value.name,
                        zone: formItem.value.zone || 'cold',
                        shoppingStatus: formItem.value.shoppingStatus,
                        ...result,
                        updatedAt: new Date()
                    });
                    
                    // === POST-UPDATE CLEANUP (Replace All) ===
                    if (isReplacingImage && oldImagesToDelete.size > 0) {
                        console.log("Image Replaced: Cleaning up old images...");
                        cleanupUnusedImages(oldImagesToDelete, [finalImageUrl]);
                    }

                } else {
                    // === 新增模式 (Add Mode) ===
                    const targetItem = matchedExistingItem.value;

                    if (targetItem) {
                        // 合併到現有物品 (Merge)
                        let batches = [];
                        // 記錄可能需要刪除的舊圖片 (待 Firestore 成功後再刪)
                        let oldImageToDelete = null;
                        
                        if (parseInt(targetItem.quantity) > 0) {
                            batches = targetItem.batches ? [...targetItem.batches] : [{
                                storedDate: targetItem.storedDate,
                                expiryDate: targetItem.expiryDate,
                                noExpiry: targetItem.noExpiry,
                                quantity: parseInt(targetItem.quantity),
                                image: targetItem.image || null,
                                addedAt: 0
                            }];
                        } else {
                            // 標記舊圖片待刪除，但不立即刪除
                            if (!formItem.value.useExistingImage && targetItem.image) {
                                oldImageToDelete = targetItem.image;
                            }
                        }

                        if (formItem.value.useExistingImage) {
                            newBatch.image = targetItem.image || null;
                        } 

                        batches.push(newBatch);
                        
                        const targetOwners = targetItem.owners || ['全家'];
                        const result = recalculateItemFromBatches(batches, targetOwners); 

                        await updateDoc(doc(db.value, "fridge_items", targetItem.id), {
                            ...result,
                            updatedAt: new Date()
                        });
                        
                        // Firestore 成功後才安全刪除舊圖片
                        if (oldImageToDelete) {
                            console.log("Restock: Deleting old archive image after success:", oldImageToDelete);
                            deleteImage(oldImageToDelete);
                        }

                    } else {
                        // 完全新增
                        const initialBatches = [newBatch];
                        const result = recalculateItemFromBatches(initialBatches, ownersFinal);

                        await addDoc(collection(db.value, "fridge_items"), {
                            name: formItem.value.name,
                            zone: formItem.value.zone || 'cold',
                            shoppingStatus: null,
                            ...result,
                            createdAt: new Date()
                        });
                    }
                }

                if (props.pendingPurchaseOriginalId) {
                    await updateDoc(doc(db.value, "fridge_items", props.pendingPurchaseOriginalId), {
                        shoppingStatus: null
                    });
                    emit('update-pending-id', null);
                }

                // Success State Transition
                isSuccess.value = true;
                
                // Wait for animation
                await new Promise(resolve => setTimeout(resolve, 1200));

                emit('submit-success');
                
            } catch (firestoreErr) {
                // !!! ROLLBACK !!!
                // If we uploaded a NEW image but Firestore failed, we must delete that image
                if (!formItem.value.useExistingImage && pendingImageBlob.value && finalImageUrl) {
                    console.warn("Firestore write failed, rolling back image upload...", finalImageUrl);
                    const deleted = await deleteImage(finalImageUrl);
                    if (!deleted) {
                        console.error("ORPHAN IMAGE WARNING: Failed to rollback image:", finalImageUrl);
                    }
                }
                throw firestoreErr; // Re-throw to trigger outer catch for UI alert
            }

        } catch (e) {
            console.error("Firebase Error:", e);
            alert("上傳/更新失敗，請檢查網路");
        } finally {
            isUploading.value = false;
        }
    }

    return {
        formItem,
        isCompressing,
        isUploading,
        isSuccess,
        isOnline,
        dismissedExistingAlert,
        dismissedOtherZoneAlert,
        uniqueItemNames,
        matchedExistingItem,
        addDays,
        isFormValid,
        formatOwners,
        toggleOwner,
        toggleToBuyStatus,
        processImage,
        submitItem,
        showOwnerDropdown,
        ownerFieldIndex,
        handleDelete,
        displayImage,
        matchedOtherZoneItem,
        getZoneName
    }
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
    stroke: #fff; /* White circle outline if desired, or make transparent */
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
