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
                        <label class="btn btn-outline-primary" for="zone-cold">冷藏區</label>

                        <input type="radio" class="btn-check" name="zone" id="zone-frozen" value="frozen" v-model="formItem.zone">
                        <label class="btn btn-outline-primary" for="zone-frozen">冷凍區</label>

                        <input type="radio" class="btn-check" name="zone" id="zone-veggie" value="veggie" v-model="formItem.zone">
                        <label class="btn btn-outline-primary" for="zone-veggie">蔬果區</label>
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
                        <img v-if="formItem.image" :src="formItem.image" class="w-100 rounded" style="max-height: 300px; object-fit: contain;">
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
                        <label class="form-label fw-bold">6. 到期日（可不填）</label>
                        <input type="date" class="form-control form-control-lg" v-model="formItem.expiryDate" :disabled="formItem.noExpiry">

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
                
                <div class="mb-4">
                    <label class="form-label fw-bold">{{ (formItem.quantity != 0 || formItem.quantity === '') ? '7.' : '4.' }} 物品所有人</label>
                    <div class="dropdown w-100">
                        <button class="btn btn-outline-dark dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="text-truncate">{{ formatOwners(formItem.owners) }}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-custom shadow border-0">
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
                        @click="$emit('delete-item', formItem.id)">
                    <i class="bi bi-trash me-1"></i> 永久刪除此物品
                </button>
            </form>
        </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { getFirestore, doc, collection, addDoc, updateDoc } from 'firebase/firestore'
import { compressFile } from '../composables/useImageCompression.js'
import { addDaysToDate } from '../utils/dateUtils.js'
import { recalculateItemFromBatches } from '../utils/inventoryUtils.js'

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

    // 重置 formItem 當 prop 改變
    watch(() => props.initialItem, (newVal) => {
        formItem.value = { ...newVal }
    }, { deep: true })

    const uniqueItemNames = computed(() => {
        return [...new Set(props.allItems.map(i => i.name))]
    })

    const matchedExistingItem = computed(() => {
        if (props.mode !== 'add') return null
        if (!formItem.value.name) return null
        return props.allItems.find(i => i.name === formItem.value.name)
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
            const compressed = await compressFile(file);
            formItem.value.image = compressed;
        } catch (e) {
            alert("圖片處理失敗");
        } finally {
            isCompressing.value = false;
        }
    }

    const submitItem = async () => {
        if (!formItem.value.useExistingImage && !formItem.value.image) { 
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

        const db = getFirestore()
        
        const expiryDateClean = formItem.value.noExpiry ? "" : (formItem.value.expiryDate || "");
        const noExpiryFinal = formItem.value.noExpiry || !expiryDateClean;
        const ownersFinal = (formItem.value.owners && formItem.value.owners.length > 0) ? formItem.value.owners : ['全家'];
        let imageToSave = formItem.value.image || null;

        const newBatch = {
            storedDate: formItem.value.storedDate,
            expiryDate: expiryDateClean,
            noExpiry: noExpiryFinal,
            quantity: safeQuantity,
            image: imageToSave, 
            addedAt: Date.now()
        };

        isUploading.value = true;
        try {
            if (formItem.value.id) {
                // === 編輯 ===
                const oldItemRef = props.allItems.find(i => i.id === formItem.value.id);
                let batches = oldItemRef && oldItemRef.batches ? [...oldItemRef.batches] : [];
                
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

                const finalImage = formItem.value.image || (batches[0] ? batches[0].image : null) || null;
                if (batches[0]) {
                    batches[0] = { ...batches[0], ...newBatch, image: finalImage };
                } else {
                    batches.push({ ...newBatch, image: finalImage });
                }

                const result = recalculateItemFromBatches(batches, ownersFinal);

                await updateDoc(doc(db, "fridge_items", formItem.value.id), {
                    name: formItem.value.name,
                    zone: formItem.value.zone || 'cold',
                    shoppingStatus: formItem.value.shoppingStatus,
                    ...result,
                    updatedAt: new Date()
                });

            } else {
                // === 新增 ===
                const targetItem = matchedExistingItem.value;

                if (targetItem) {
                    // 合併
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
                    } else {
                        newBatch.image = formItem.value.image || null; 
                    }

                    batches.push(newBatch);
                    const targetOwners = targetItem.owners || ['全家'];
                    const result = recalculateItemFromBatches(batches, targetOwners); 

                    await updateDoc(doc(db, "fridge_items", targetItem.id), {
                        ...result,
                        updatedAt: new Date()
                    });

                } else {
                    // 完全新增
                    const initialBatches = [newBatch];
                    const result = recalculateItemFromBatches(initialBatches, ownersFinal);

                    await addDoc(collection(db, "fridge_items"), {
                        name: formItem.value.name,
                        zone: formItem.value.zone || 'cold',
                        shoppingStatus: null,
                        ...result,
                        createdAt: new Date()
                    });
                }
            }

            if (props.pendingPurchaseOriginalId) {
                await updateDoc(doc(db, "fridge_items", props.pendingPurchaseOriginalId), {
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
        submitItem
    }
  }
}
</script>
