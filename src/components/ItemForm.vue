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
                                    @click="submitItem" :disabled="isUploading || isCompressing">
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
                <div v-if="matchedExistingItem" class="alert alert-warning d-flex align-items-start mb-3" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                    <div>
                        <div class="fw-bold">發現相同物品</div>
                        <div class="small">冰箱已有「{{ matchedExistingItem.name }}」(庫存 {{ matchedExistingItem.quantity }})，此操作將會把新買的加入庫存（自動建立新批次）。</div>
                    </div>
                </div>

                <!-- 圖片區 -->
                <div class="mb-4">
                    <label class="form-label fw-bold fs-5">3. 物品照片</label>
                    
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
                    <div v-else class="d-flex flex-column align-items-center justify-content-center border rounded bg-light p-3 opacity-75">
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

                <button type="submit" class="btn btn-primary w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm" :disabled="isUploading || isCompressing">
                    {{ (isUploading || isCompressing) ? '處理中...' : (mode==='edit' ? '儲存變更' : '確認放入冰箱') }}
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
import { uploadImage, deleteImage } from '../utils/storageUtils.js'

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
    const formItem = ref({ ...props.initialItem })
    const isCompressing = ref(false)
    const isUploading = ref(false)
    const showOwnerDropdown = ref(false)
    
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
        return props.allItems.find(i => i.name === formItem.value.name)
    })

    // 當發現同名物品時，預設開啟「沿用舊照片」
    watch(matchedExistingItem, (newVal) => {
        if (newVal) {
            formItem.value.useExistingImage = true
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
            alert("圖片處理失敗");
        } finally {
            isCompressing.value = false;
        }
    }

    const handleDelete = async () => {
        if (!confirm("確定要永久刪除此物品嗎？此操作無法復原。")) return;
        
        isUploading.value = true; // Use uploading flag to disable buttons
        try {
            // 1. Clean up images from Storage
            const itemToDelete = props.allItems.find(i => i.id === formItem.value.id);
            if (itemToDelete && itemToDelete.batches) {
                const uniqueImages = new Set();
                
                // Add main image if exists
                 if (itemToDelete.image) uniqueImages.add(itemToDelete.image);
                 
                // Add batch images
                itemToDelete.batches.forEach(b => {
                    if (b.image) uniqueImages.add(b.image);
                });

                // Delete all unique Storage images
                const deletePromises = Array.from(uniqueImages).map(url => deleteImage(url));
                await Promise.all(deletePromises);
            }
            
            // 2. Delete document from Firestore
            // Note: We use the logic from parent if we just emit, but here we can do it directly or emit.
            // Original code emitted 'delete-item', which presumably handles Firestore delete.
            // But to ensure we don't leave orphan files if the parent implementation changed, 
            // we handled storage deletion here first.
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
                finalImageUrl = await uploadImage(pendingImageBlob.value);
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

                // Calculate current total quantity from batches
                const currentTotal = batches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
                const targetTotal = safeQuantity;
                const diff = targetTotal - currentTotal;

                if (diff > 0) {
                     // === 增加數量 (Add Quantity) ===
                     // Simply add a new batch with the difference
                     const batchToAdd = {
                        ...newBatch,
                        quantity: diff // Override the quantity with the difference
                     };
                     batches.push(batchToAdd);

                } else if (diff < 0) {
                    // === 減少數量 (Reduce Quantity) ===
                     // We need to remove 'abs(diff)' from existing batches
                     // Logic similar to "Take Out": remove from oldest/first batches
                     
                     // Sort batches first (Expiry -> Stored) to ensure we remove from the "front"
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
                    const imagesPotentiallyDeleted = new Set(); // Track images from removed/reduced batches

                    for (let batch of batches) {
                        if (amountToRemove <= 0) {
                            newBatches.push(batch);
                            continue;
                        }

                        let batchQty = parseInt(batch.quantity);
                        
                        // Track image for potential cleanup analysis
                        if (batch.image) imagesPotentiallyDeleted.add(batch.image);

                        if (batchQty > amountToRemove) {
                            // Partial reduce
                            batch.quantity = batchQty - amountToRemove;
                            amountToRemove = 0;
                            newBatches.push(batch);
                        } else {
                            // Full remove of this batch
                            amountToRemove -= batchQty;
                            // Do not push to newBatches
                        }
                    }
                    
                    batches = newBatches;
                    
                    // --- Image Cleanup Logic (similar to App.vue) ---
                    // Identify images still in use
                    const remainingImages = new Set();
                    if (newBatch.image) remainingImages.add(newBatch.image); // The "new" image from form is definitely in use if we kept it? 
                    // Wait, newBatch is only used if we ADDED, but here we reduced. 
                    // However, the recalculate function will pick a new main image.
                    
                    batches.forEach(b => {
                        if (b.image) remainingImages.add(b.image);
                    });

                    // Check which images are truly gone
                    imagesPotentiallyDeleted.forEach(url => {
                        if (!remainingImages.has(url)) {
                             console.log("Edit Limit: Deleting unused image:", url);
                             deleteImage(url);
                        }
                    });

                } else {
                    // === 數量不變 (No Quantity Change) ===
                    // Just update the metadata of the FIRST batch or Main Item?
                    // User might want to update the "image" or "expiry" of the *current* items.
                    // Reasonable approach: Update the first batch's details to match form.
                    if (batches.length > 0) {
                         // We only update non-quantity fields here because quantity is total
                         batches[0] = {
                             ...batches[0],
                             storedDate: newBatch.storedDate,
                             expiryDate: newBatch.expiryDate,
                             noExpiry: newBatch.noExpiry,
                             image: newBatch.image // Update image if changed
                         };
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

            } else {
                // === 新增模式 (Add Mode) ===
                const targetItem = matchedExistingItem.value;

                if (targetItem) {
                    // 合併到現有物品 (Merge)
                    let batches = [];
                    if (parseInt(targetItem.quantity) > 0) {
                        batches = targetItem.batches ? [...targetItem.batches] : [{
                            storedDate: targetItem.storedDate,
                            expiryDate: targetItem.expiryDate,
                            noExpiry: targetItem.noExpiry,
                            quantity: parseInt(targetItem.quantity),
                            image: targetItem.image || null,
                            addedAt: 0
                        }];
                    }

                    if (formItem.value.useExistingImage) {
                        newBatch.image = targetItem.image || null;
                    } 
                    // else newBatch.image is already finalImageUrl

                    // In "Add Mode" with "Merge", the user input quantity is *additional* quantity.
                    // The UI logic:
                    // If mode='add', safeQuantity IS the quantity to add.
                    // So we just push it.
                    batches.push(newBatch);
                    
                    const targetOwners = targetItem.owners || ['全家'];
                    const result = recalculateItemFromBatches(batches, targetOwners); 

                    await updateDoc(doc(db.value, "fridge_items", targetItem.id), {
                        ...result,
                        updatedAt: new Date()
                    });

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

            emit('submit-success');
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
        uniqueItemNames,
        matchedExistingItem,
        addDays,
        formatOwners,
        toggleOwner,
        toggleToBuyStatus,
        processImage,
        submitItem,
        showOwnerDropdown,
        ownerFieldIndex,
        handleDelete,
        displayImage
    }
  }
}
</script>
