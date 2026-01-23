<template>
  <div class="container py-3">
    <div id="app" class="container py-3" v-cloak>
    
        <!-- 圖片預覽層 -->
        <div v-if="previewImageUrl" class="image-preview-overlay" @click="closePreview">
            <button class="preview-close"><i class="bi bi-x-circle"></i></button>
            <img :src="previewImageUrl" class="preview-img" @click.stop>
        </div>
    
        <!-- 初始設定畫面 -->
        <div v-if="!isConfigured" class="setup-screen">
            <div class="text-center mb-4">
                <i class="bi bi-snow2 text-primary display-1"></i>
                <h2 class="fw-bold mt-3">歡迎使用智慧冰箱</h2>
                <p class="text-muted">請輸入家庭設定與您的名稱以開始使用</p>
            </div>
    
            <div class="card w-100 border-0 shadow-sm" style="max-width: 500px;">
                <div class="card-body">
                    <form @submit.prevent="saveInitialConfig">
                        <div class="mb-3">
                            <label class="form-label fw-bold">1. Firebase 設定碼</label>
                            <textarea class="form-control font-monospace small" rows="5" v-model="inputConfigStr" placeholder='請貼上 const firebaseConfig = { ... }' required></textarea>
                        </div>
                        <div class="mb-4">
                            <label class="form-label fw-bold">2. 您的稱呼 (家庭成員名稱)</label>
                            <input type="text" class="form-control" v-model="inputUserName" placeholder="例如：爸爸、媽媽" required>
                        </div>
                        <div v-if="setupError" class="alert alert-danger py-2 mb-3">{{ setupError }}</div>
                        <button type="submit" class="btn btn-primary w-100 rounded-pill py-2 fw-bold" :disabled="isSettingUp">
                            {{ isSettingUp ? '連線中...' : '開始使用' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    
        <!-- 主應用程式 -->
        <template v-else>
            <!-- HOME PAGE -->
            <div v-if="!isLoading && currentPage==='home'">
                <!-- 頂部列 -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-light border rounded-pill" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar">
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
                    <button class="btn btn-outline-dark btn-sm rounded-pill px-3" @click="toggleSelectionMode">
                        {{ isSelectionMode ? '取消' : '管理' }}
                    </button>
                </div>
    
                <!-- 搜尋與篩選 (非無庫存區顯示) -->
                <div class="input-group mb-4 shadow-sm" v-if="filterZone !== 'nostock'">
                    <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                    <input type="text" class="form-control border-start-0 py-2" placeholder="搜尋物品..." v-model="searchText">
                    <select class="form-select border-start-0 bg-light" v-model="filterZone" style="max-width: 110px;">
                        <option value="all">全區</option>
                        <option value="cold">冷藏區</option>
                        <option value="frozen">冷凍區</option>
                        <option value="veggie">蔬果區</option>
                    </select>
                    <button v-if="searchText" class="btn btn-light border" @click="searchText=''">清除</button>
                </div>
    
                <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                    <small class="text-muted" v-if="filterZone !== 'nostock'"><i class="bi bi-info-circle me-1"></i>長按物品可編輯</small>
                    <small class="text-muted" v-else><i class="bi bi-info-circle me-1"></i>顯示已用完的物品</small>
                </div>
    
                <!-- 物品列表 -->
                <div class="row g-3 pb-5">
                    <div class="col-6 col-md-4 col-lg-3" v-for="item in filteredItems" :key="item.id">
                        <div class="card item-card h-100" 
                             :class="getAlertClass(item)"
                             @touchstart="handleTouchStart(item)"
                             @touchend="handleTouchEnd"
                             @touchmove="handleTouchMove"
                             @click="handleCardClick(item)"
                             @contextmenu.prevent="goToEditPage(item)">
                            
                            <!-- 多選模式勾選遮罩 -->
                            <div v-if="isSelectionMode" class="selection-overlay">
                                <i class="bi bi-check-circle-fill selection-check" v-if="selectedHomeIds.includes(item.id)"></i>
                                <i class="bi bi-circle text-muted fs-1" v-else></i>
                            </div>
    
                            <div class="item-img-box" @click.stop="!isSelectionMode && openPreview(item.image)">
                                <img v-if="item.image" :src="item.image" class="item-img">
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
                                        @click.stop="item.quantity > 0 ? goToTakeOutPage(item) : goToEditPage(item)">
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
                <button v-if="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
                    <i class="bi bi-arrow-up"></i>
                </button>
    
                <!-- 一般模式的 FAB -->
                <button v-if="!isSelectionMode && filterZone !== 'nostock'" class="fab-btn" @click="goToAddPage">
                    <i class="bi bi-plus-lg"></i>
                </button>
                
                <!-- 多選模式的底部操作列 -->
                <div v-if="isSelectionMode" class="fixed-bottom p-3 bg-white border-top shadow-lg">
                     <div v-if="filterZone === 'nostock'" class="d-flex gap-2">
                        <button class="btn btn-outline-danger w-50 rounded-pill py-2" 
                                :disabled="selectedHomeIds.length === 0"
                                @click="deleteSelectedNoStock">
                            <i class="bi bi-trash me-1"></i> 永久刪除
                        </button>
                         <button class="btn btn-info text-white w-50 rounded-pill py-2 fw-bold" 
                                :disabled="selectedHomeIds.length === 0"
                                @click="addBatchToBuy">
                            <i class="bi bi-cart-plus me-1"></i> 加入待買
                        </button>
                     </div>
                     <div v-else class="d-flex gap-2">
                         <button class="btn btn-info text-white w-100 rounded-pill py-2 fw-bold" 
                                :disabled="selectedHomeIds.length === 0"
                                @click="addBatchToBuy">
                            <i class="bi bi-cart-plus me-1"></i> 加入待購買清單 ({{ selectedHomeIds.length }})
                        </button>
                     </div>
                </div>
            </div>
    
            <!-- ADD / EDIT PAGE -->
            <div v-if="!isLoading && (currentPage==='add' || currentPage==='edit')" class="page-container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <button class="btn btn-light border rounded-pill" @click="goHome">
                        <i class="bi bi-arrow-left"></i> 取消
                    </button>
                    <h5 class="fw-bold m-0">{{ currentPage==='edit' ? '編輯物品' : '放入新物品' }}</h5>
                    <div style="width: 74px;"></div>
                </div>
    
                <div class="card section-card">
                    <div class="card-body">
                        <form @submit.prevent="submitItem">
                            
                            <!-- 編輯模式下顯示的待購買開關 -->
                            <div v-if="currentPage==='edit'" class="mb-4 bg-light p-3 rounded border">
                                <div v-if="newItem.shoppingStatus === 'inCart'" class="d-flex align-items-center text-warning">
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
                                                   :checked="newItem.shoppingStatus === 'toBuy'"
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
                                    <input type="radio" class="btn-check" name="zone" id="zone-cold" value="cold" v-model="newItem.zone" checked>
                                    <label class="btn btn-outline-primary" for="zone-cold">冷藏區</label>
    
                                    <input type="radio" class="btn-check" name="zone" id="zone-frozen" value="frozen" v-model="newItem.zone">
                                    <label class="btn btn-outline-primary" for="zone-frozen">冷凍區</label>
    
                                    <input type="radio" class="btn-check" name="zone" id="zone-veggie" value="veggie" v-model="newItem.zone">
                                    <label class="btn btn-outline-primary" for="zone-veggie">蔬果區</label>
                                </div>
                            </div>
    
                            <div class="mb-3">
                                <label class="form-label fw-bold">2. 名稱</label>
                                <input type="text" class="form-control form-control-lg" v-model="newItem.name" placeholder="例如：鮮奶" list="nameSuggestions" required>
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
                                        <input class="form-check-input" type="checkbox" id="useExistingImg" v-model="newItem.useExistingImage" style="cursor: pointer;">
                                        <label class="form-check-label fw-bold" for="useExistingImg" style="cursor: pointer;">
                                            沿用舊照片 (免上傳)
                                            <div class="text-muted small fw-normal">本次購買將不會更新照片，直到舊的吃完才會切換。</div>
                                        </label>
                                    </div>
                                </div>
    
                                <div v-if="!newItem.useExistingImage" class="d-flex flex-column align-items-center justify-content-center border rounded bg-light p-3" style="min-height: 200px;" @click="$refs.fileInput.click()">
                                    <img v-if="newItem.image" :src="newItem.image" class="w-100 rounded" style="max-height: 300px; object-fit: contain;">
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
    
                            <div v-if="newItem.quantity != 0 || newItem.quantity === ''">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">4. 數量</label>
                                    <input type="number" inputmode="numeric" class="form-control form-control-lg" v-model="newItem.quantity" placeholder="1" required>
                                </div>
    
                                <div class="mb-3">
                                    <label class="form-label fw-bold">5. 存入日期</label>
                                    <input type="date" class="form-control form-control-lg" v-model="newItem.storedDate" required>
                                </div>
    
                                <div class="mb-4">
                                    <label class="form-label fw-bold">6. 到期日（可不填）</label>
                                    <input type="date" class="form-control form-control-lg" v-model="newItem.expiryDate" :disabled="newItem.noExpiry">
    
                                    <div class="form-check form-switch mt-3">
                                        <input class="form-check-input" type="checkbox" id="noExpirySwitch" v-model="newItem.noExpiry">
                                        <label class="form-check-label fw-bold" for="noExpirySwitch">此物品無期限</label>
                                    </div>
    
                                    <div class="mt-3 d-flex gap-2 overflow-auto" v-if="!newItem.noExpiry">
                                        <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(3)">+3天</button>
                                        <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(7)">+1週</button>
                                        <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(14)">+2週</button>
                                        <button type="button" class="btn btn-outline-primary rounded-pill" @click="addDays(30)">+1月</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold">{{ (newItem.quantity != 0 || newItem.quantity === '') ? '7.' : '4.' }} 物品所有人</label>
                                <div class="dropdown w-100">
                                    <button class="btn btn-outline-dark dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <span class="text-truncate">{{ formatOwners(newItem.owners) }}</span>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-custom shadow border-0">
                                        <li>
                                            <label class="dropdown-item-custom">
                                                <input type="checkbox" class="form-check-input" 
                                                       :checked="newItem.owners.includes('全家')"
                                                       @change="toggleOwner('全家')">
                                                <span class="fw-bold">全家 (預設)</span>
                                            </label>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li v-for="member in familySettings.members" :key="member">
                                            <label class="dropdown-item-custom">
                                                <input type="checkbox" class="form-check-input"
                                                       :checked="newItem.owners.includes(member)"
                                                       @change="toggleOwner(member)">
                                                {{ member }}
                                            </label>
                                        </li>
                                    </ul>
                                </div>
                                <div class="form-text">您可以選擇「全家」或是指定多位成員</div>
                            </div>
    
                            <button type="submit" class="btn btn-primary w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm" :disabled="isUploading || isCompressing">
                                {{ (isUploading || isCompressing) ? '處理中...' : (currentPage==='edit' ? '儲存變更' : '確認放入冰箱') }}
                            </button>
    
                            <!-- 0庫存物品的永久刪除按鈕 -->
                            <button v-if="currentPage==='edit' && newItem.quantity == 0 && newItem.quantity !== ''" 
                                    type="button" 
                                    class="btn btn-outline-danger w-100 mt-3 rounded-pill"
                                    @click="deleteItemPermanently(newItem.id)">
                                <i class="bi bi-trash me-1"></i> 永久刪除此物品
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- TO BUY LIST PAGE (待購買清單) -->
            <div v-if="!isLoading && currentPage==='to-buy-list'" class="bento-mode">
        
        <!-- 背景動畫層 -->
        <div class="bento-bg-layer">
            <div class="mesh-blob blob-1"></div>
            <div class="mesh-blob blob-2"></div>
            <div class="mesh-blob blob-3"></div>
        </div>
    
        <!-- 頂部導航 (透明 Header) -->
        <header class="bento-header">
            <button class="glass-icon-btn" @click="returnToSidebar">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 class="m-0 fs-5 fw-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">待購買清單</h1>
            <div style="width: 40px;"></div>
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
                         @click="toggleSelection(selectedToBuyIds, item.id)"> <!-- 點擊卡片任何地方都可以勾選 -->
                        
                        <!-- 1. Checkbox (改為左側顯示，符合清單邏輯) -->
                        <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
                            <input type="checkbox" class="form-check-input border-2" 
                                   :value="item.id" v-model="selectedToBuyIds"
                                   style="cursor: pointer; border-color: #cbd5e1;" @click.stop>
                        </div>
    
                        <!-- 2. 圖片 (圓角方形) -->
                        <div class="bento-img-box ms-3 flex-shrink-0" 
                             style="width: 64px; height: 64px; border-radius: 12px;"
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
                <div class="island-text ms-2">
                    <div>已選擇</div>
                    <div class="fs-4">{{ selectedToBuyIds.length }} 項</div>
                </div>
                <div class="island-controls">
                    <!-- 移除按鈕 -->
                    <button class="island-trash-btn" 
                            :disabled="selectedToBuyIds.length === 0"
                            @click="removeFromToBuyList">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    
                    <!-- 放入購物車按鈕 -->
                     <button class="island-action-btn" 
                            :disabled="selectedToBuyIds.length === 0"
                            @click="moveSelectedToCart">
                        放入購物車
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                    </button>
                </div>
             </div>
        </div>
    </div>
    
            <!-- SHOPPING CART PAGE (購物車) - Bento/Glassmorphism Mode -->
            <div v-if="!isLoading && currentPage==='shopping-cart'" class="bento-mode">
                
                <!-- 背景動畫層 -->
                <div class="bento-bg-layer">
                    <div class="mesh-blob blob-1"></div>
                    <div class="mesh-blob blob-2"></div>
                    <div class="mesh-blob blob-3"></div>
                </div>
    
                <!-- 頂部導航 (透明 Header) -->
                <header class="bento-header">
                    <button class="glass-icon-btn" @click="returnToSidebar">
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
                                 @click="toggleSelection(selectedCartIds, item.id)">
                                
                                <!-- Checkbox -->
                                <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
                                    <input type="checkbox" class="form-check-input border-2" 
                                           :value="item.id" v-model="selectedCartIds"
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
                                        @click.stop="startPurchase(item)">
                                    <span class="material-symbols-outlined fs-5">input</span>
                                </button>
                            </div>
                        </div>
    
                        <!-- 模式 2: List Layout (新增樣式) -->
                        <div v-else class="d-flex flex-column gap-3">
                            <div v-for="item in cartList" :key="item.id" 
                                 class="bento-card d-flex align-items-center p-3"
                                 @click="toggleSelection(selectedCartIds, item.id)">
                                
                                <!-- Checkbox -->
                                <div class="form-check m-0 d-flex align-items-center justify-content-center" style="transform: scale(1.3);">
                                    <input type="checkbox" class="form-check-input border-2" 
                                           :value="item.id" v-model="selectedCartIds"
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
    
                                <!-- 存入按鈕 (List模式專屬) -->
                                <button class="btn btn-dark rounded-circle d-flex align-items-center justify-content-center ms-2 flex-shrink-0"
                                        style="width: 42px; height: 42px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
                                        @click="startPurchase(item)">
                                    <span class="material-symbols-outlined fs-5">input</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 黑色懸浮島嶼底部操作列 (Action Island) -->
                <div class="action-island-container" v-if="items.filter(i => i.shoppingStatus === 'inCart').length > 0">
                     <div class="action-island">
                        <div class="island-text ms-2">
                            <div>已選擇</div>
                            <div class="fs-4">{{ selectedCartIds.length }} 項</div>
                        </div>
                        <div class="island-controls">
                            <button class="island-trash-btn" 
                                    :disabled="selectedCartIds.length === 0"
                                    @click="removeSelectedFromCart">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                             <button class="island-action-btn" 
                                    :disabled="selectedCartIds.length === 0"
                                    @click="moveSelectedBackToBuy">
                                放回待買
                                <span class="material-symbols-outlined">shopping_cart</span>
                            </button>
                        </div>
                     </div>
                </div>
            </div>
    
            <!-- TAKE OUT PAGE -->
            <div v-if="!isLoading && currentPage==='takeout'" class="page-container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <button class="btn btn-light border rounded-pill" @click="goHome">
                        <i class="bi bi-arrow-left"></i> 取消
                    </button>
                    <h5 class="fw-bold m-0">取出物品</h5>
                    <div style="width: 74px;"></div>
                </div>
    
                <div class="card section-card">
                    <div class="card-body text-center">
                        <div class="mb-4 d-flex justify-content-center">
                            <div class="rounded overflow-hidden shadow-sm" style="width: 150px; height: 150px;">
                                <img v-if="itemToDelete?.image" :src="itemToDelete.image" style="width: 100%; height: 100%; object-fit: cover;">
                                <div v-else class="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                                    <i class="bi bi-image fs-1 text-muted"></i>
                                </div>
                            </div>
                        </div>
    
                        <h3 class="fw-bold mb-2">{{ itemToDelete?.name }}</h3>
                        <p class="text-muted mb-4">目前庫存：{{ maxTakeOut }}</p>
    
                        <div class="text-start mb-3">
                            <label class="form-label fw-bold">請選擇要取出的數量</label>
                            <select class="form-select form-select-lg" v-model="takeOutAmount">
                                <option v-for="n in maxTakeOut" :key="n" :value="n">{{ n }} {{ n === maxTakeOut ? '(全部取出)' : '' }}</option>
                            </select>
                        </div>
    
                        <button class="btn btn-danger w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm" @click="confirmTakeOutAction">
                            {{ takeOutAmount === maxTakeOut ? '確認取出' : '確認取出' }}
                        </button>
                        <div class="text-muted small mt-2">
                            {{ takeOutAmount === maxTakeOut ? '全部取出後，物品將移動至「無庫存區」' : '' }}
                        </div>
                    </div>
                </div>
            </div>
    
            <!-- SETTINGS -->
            <div v-if="!isLoading && currentPage==='settings'" class="settings-page page-container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <button class="btn btn-light border rounded-pill" @click="goHome">
                        <i class="bi bi-arrow-left"></i> 返回
                    </button>
                    <h5 class="fw-bold m-0">設定</h5>
                    <div style="width: 74px;"></div>
                </div>
    
                <!-- 家庭設定 -->
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <i class="bi bi-house-heart text-primary"></i>
                            <div class="fw-bold">家庭名稱</div>
                        </div>
                        
                        <div v-if="!isEditingFamilyName" class="d-flex justify-content-between align-items-center">
                            <span class="fs-5 fw-bold">{{ familySettings.familyName }}</span>
                            <button class="btn btn-sm btn-outline-secondary rounded-pill" @click="startEditFamilyName">
                                <i class="bi bi-pencil"></i> 修改
                            </button>
                        </div>
                        <div v-else class="input-group">
                            <input type="text" class="form-control" v-model="editFamilyNameTemp" placeholder="輸入家庭名稱">
                            <button class="btn btn-success" @click="saveFamilyName">儲存</button>
                            <button class="btn btn-outline-secondary" @click="isEditingFamilyName = false">取消</button>
                        </div>
                    </div>
                </div>
    
                <!-- 成員設定 -->
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <i class="bi bi-people text-primary"></i>
                            <div class="fw-bold">家庭成員 ({{ familySettings.members.length }})</div>
                        </div>
                        <div class="text-muted small mb-3">只有您可以修改自己的名稱，修改後所有裝置會自動同步。</div>
    
                        <div class="d-flex flex-column">
                            <div v-for="member in familySettings.members" :key="member" class="member-row d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center gap-2">
                                    <i class="bi bi-person-circle text-secondary fs-4"></i>
                                    <div>
                                        <div class="fw-bold">{{ member }}</div>
                                        <div class="badge bg-primary" v-if="member === currentUserName">我</div>
                                    </div>
                                </div>
    
                                <button v-if="member === currentUserName" class="btn btn-sm btn-light border rounded-pill" @click="startEditUserName(member)">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 版本更新設定 -->
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold"><i class="bi bi-bell text-primary me-1"></i> 版本更新通知</div>
                                <div class="text-muted small">開啟後，若偵測到新版本，進入 App 會自動顯示更新資訊</div>
                            </div>
                            <div class="form-check form-switch m-0">
                                <input class="form-check-input" type="checkbox" id="updateNotifySwitch" v-model="settings.updateNotifyEnabled" @change="saveSettings">
                            </div>
                        </div>
    
                        <div class="mt-3 d-flex gap-2">
                            <button class="btn btn-outline-primary rounded-pill" @click="showUpdateModal(true)">
                                查看最新更新內容
                            </button>
                        </div>
                    </div>
                </div>
    
                <!-- 版本資訊 -->
                 <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="fw-bold mb-2"><i class="bi bi-info-circle text-primary me-1"></i> 版本資訊</div>
                        <div class="d-flex justify-content-between">
                            <div class="text-muted">目前版本</div>
                            <div class="fw-bold">{{ appVersion }}</div>
                        </div>
                         <div class="d-flex justify-content-between mt-1">
                            <div class="text-muted">最新版本</div>
                            <div class="fw-bold">{{ latestVersion }}</div>
                        </div>
                    </div>
                </div>
    
                <!-- 更新歷史 -->
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="fw-bold mb-2"><i class="bi bi-list-check text-primary me-1"></i> 版本更新資訊</div>
                        
                        <div class="accordion" id="updateAccordion">
                            <div class="accordion-item" v-for="log in visibleUpdateLogs" :key="log.version">
                                <h2 class="accordion-header">
                                    <button class="accordion-button" 
                                            :class="{ collapsed: expandedVersion !== log.version }" 
                                            type="button" 
                                            @click="expandedVersion = expandedVersion === log.version ? null : log.version">
                                        <div class="d-flex flex-column">
                                            <div class="fw-bold">v{{ log.version }}　{{ log.title }}</div>
                                            <div class="small text-muted">{{ log.date }}</div>
                                        </div>
                                    </button>
                                </h2>
                                <div class="accordion-collapse" :class="{ show: expandedVersion === log.version, collapse: expandedVersion !== log.version }">
                                    <div class="accordion-body">
                                        <ul class="mb-0">
                                            <li v-for="c in log.changes" :key="c">{{ c }}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <div v-if="!showAllUpdates && updateLogs.length > 3" class="text-center mt-2">
                            <button class="btn btn-link text-decoration-none text-muted" @click="showAllUpdates = true">
                                <i class="bi bi-chevron-down me-1"></i>顯示更多歷史紀錄 ({{ updateLogs.length - 3 }})
                            </button>
                        </div>
                        
                        <div v-if="showAllUpdates && updateLogs.length > 3" class="text-center mt-2">
                            <button class="btn btn-link text-decoration-none text-muted" @click="showAllUpdates = false">
                                <i class="bi bi-chevron-up me-1"></i>收起歷史紀錄
                            </button>
                        </div>
    
                    </div>
                </div>
    
                <button class="btn btn-outline-danger w-100 rounded-pill mt-4" @click="resetApp">
                    重設 APP (清除設定與登出)
                </button>
            </div>
    
            <!-- UPDATE INFO PAGE (全螢幕) -->
            <div v-if="!isLoading && currentPage==='update-info'" class="page-container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <button class="btn btn-light border rounded-pill" @click="closeUpdatePage">
                        <i class="bi bi-arrow-left"></i> 返回
                    </button>
                    <h5 class="fw-bold m-0">發現新版本</h5>
                    <div style="width: 74px;"></div>
                </div>
    
                <div class="card section-card border-primary border-2 mb-3">
                    <div class="card-body text-center py-4">
                        <i class="bi bi-stars text-primary display-1"></i>
                        <h3 class="fw-bold mt-3">v{{ latestLog?.version }} 更新囉！</h3>
                        <p class="text-muted">{{ latestLog?.title }}</p>
                    </div>
                </div>
    
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                             <div class="fw-bold fs-5">更新內容</div>
                             <small class="text-muted">{{ latestLog?.date }}</small>
                        </div>
                        
                        <ul class="list-group list-group-flush" v-if="latestLog?.changes?.length">
                            <li class="list-group-item px-0" v-for="c in latestLog.changes" :key="c">
                                <i class="bi bi-check-circle-fill text-success me-2"></i>{{ c }}
                            </li>
                        </ul>
                        <div class="text-muted" v-else>沒有更新詳細內容</div>
                    </div>
                </div>
    
                <div class="alert alert-light border small text-muted text-center mt-4">
                    按下「我知道了」後，同一版本將不會再自動彈出通知
                </div>
    
                <button class="btn btn-primary w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm mt-2" @click="closeUpdatePage">
                    我知道了
                </button>
            </div>
    
            <!-- 讀取中畫面 -->
            <div v-if="isLoading" class="loading-mask">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="text-muted fw-bold">正在同步 {{ familySettings.familyName || '家庭' }} 資料...</p>
            </div>
    
            <!-- 左側邊欄 -->
            <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebar" aria-labelledby="sidebarLabel">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title fw-bold" id="sidebarLabel"><i class="bi bi-snow2 text-primary"></i> 功能選單</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                </div>
    
                <div class="offcanvas-body d-flex flex-column">
                    <div class="sidebar-user-block">
                        <div class="text-muted small">目前使用者</div>
                        <div class="fw-bold fs-5">{{ currentUserName }}</div>
                    </div>
                    <hr class="sidebar-divider">
    
                    <!-- 採買區塊 -->
                    <div class="d-grid gap-2 mb-4">
                         <button class="btn btn-light text-start d-flex justify-content-between align-items-center" @click="goPageFromSidebar('to-buy-list')">
                            <span class="text-info fw-bold"><i class="bi bi-clipboard-check me-2"></i>待購買清單</span>
                            <span class="badge bg-info text-dark rounded-pill" v-if="toBuyList.length > 0">{{ toBuyList.length }}</span>
                        </button>
                         <button class="btn btn-light text-start d-flex justify-content-between align-items-center" @click="goPageFromSidebar('shopping-cart')">
                            <span class="text-warning fw-bold"><i class="bi bi-cart me-2"></i>購物車</span>
                            <span class="badge bg-warning text-dark rounded-pill" v-if="cartList.length > 0">{{ cartList.length }}</span>
                        </button>
                    </div>
                    
                    <hr class="sidebar-divider">
    
                    <div class="d-grid gap-2 mb-4">
                         <!-- 新增全區 -->
                        <button class="btn btn-outline-dark text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('all')" data-bs-dismiss="offcanvas">
                            <span><i class="bi bi-grid-fill me-2"></i>全區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.all.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.all.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.all.expired }}</span>
                            </div>
                        </button>
                        
                        <button class="btn btn-outline-primary text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('cold')" data-bs-dismiss="offcanvas">
                            <span><i class="bi bi-snow me-2"></i>冷藏區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.cold.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.cold.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.cold.expired }}</span>
                            </div>
                        </button>
                        <button class="btn btn-outline-frozen text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('frozen')" data-bs-dismiss="offcanvas">
                            <span><i class="bi bi-box-seam me-2"></i>冷凍區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge">{{ zoneStats.frozen.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge">{{ zoneStats.frozen.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge">{{ zoneStats.frozen.expired }}</span>
                            </div>
                        </button>
                        <button class="btn btn-outline-success text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('veggie')" data-bs-dismiss="offcanvas">
                            <span><i class="bi bi-flower1 me-2"></i>蔬果區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge">{{ zoneStats.veggie.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge">{{ zoneStats.veggie.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge">{{ zoneStats.veggie.expired }}</span>
                            </div>
                        </button>
                        <!-- 新增無庫存區 -->
                        <button class="btn btn-outline-secondary text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('nostock')" data-bs-dismiss="offcanvas">
                            <span><i class="bi bi-archive me-2"></i>無庫存區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.nostock.total }}</span>
                            </div>
                        </button>
                    </div>
                    
                    <div class="mt-auto">
                        <button class="btn btn-primary w-100 rounded-pill fw-bold" @click="goSettingsFromSidebar" data-bs-dismiss="offcanvas">
                            <i class="bi bi-gear me-1"></i> 設定
                        </button>
                        <div class="text-center text-muted small mt-3">v{{ appVersion }}</div>
                    </div>
                </div>
            </div>
    
            <!-- 編輯使用者名稱視窗 -->
            <div class="modal fade" id="editNameModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">修改我的名稱</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="text" class="form-control" v-model="editUserNameTemp" placeholder="輸入新名稱">
                            <div class="text-danger small mt-2" v-if="nameEditError">{{ nameEditError }}</div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary rounded-pill w-100" @click="confirmEditUserName">儲存修改</button>
                        </div>
                    </div>
                </div>
            </div>
            
        </template>
    
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { LATEST_VERSION, UPDATE_LOGS } from './update-logs.js'
import { APP_VERSION, ZONE_COLORS as ZONE_COLORS_CONST, ZONE_NAMES, LONG_PRESS_DURATION } from './utils/constants'
import { getTodayStr, getDays, addDaysToDate, parseLocalDate } from './utils/dateUtils'
import { useImageCompression } from './composables/useImageCompression'
import * as bootstrap from 'bootstrap'

const appVersion = APP_VERSION;

// Globals
let appFirebase;
let db;

// Composable
const { compressFile } = useImageCompression();

            // --- 狀態變數 ---
            const isConfigured = ref(false);
            const isSettingUp = ref(false);
            const inputConfigStr = ref("");
            const inputUserName = ref("");
            const currentUserName = ref("");
            const setupError = ref("");

            const items = ref([]);
            const searchText = ref("");
            const filterZone = ref("all");
            // 新增購物車頁面的分類篩選
            const cartFilterZone = ref("all");
            // 新增購物車頁面的佈局模式 ('grid' | 'list')
            const cartLayoutMode = ref('list');

            const isUploading = ref(false);
            const isCompressing = ref(false);
            const isLoading = ref(false);

            const previewImageUrl = ref(null);
            const itemToDelete = ref(null);
            const takeOutAmount = ref(1);
            const maxTakeOut = ref(1);

            const familySettings = ref({
                familyName: "我的家庭",
                members: []
            });
            const isEditingFamilyName = ref(false);
            const editFamilyNameTemp = ref("");
            const editUserNameTemp = ref("");
            const nameEditError = ref("");

            const fileInput = ref(null);
            const currentPage = ref("home");
            const previousPage = ref("home");
            
            // 優化：記錄滑動位置
            const savedScrollY = ref(0);
            
            // 回到頂部按鈕顯示狀態
            const showScrollTop = ref(false);

            // 購物相關狀態
            const selectedToBuyIds = ref([]);
            const selectedCartIds = ref([]);
            const pendingPurchaseOriginalId = ref(null);
            
            // 多選管理模式 (改名為通用 Ids)
            const isSelectionMode = ref(false);
            const selectedHomeIds = ref([]);

            let longPressTimer = null;

            const settings = ref({ updateNotifyEnabled: true });
            const updateLogs = ref(UPDATE_LOGS);
            const latestVersion = ref(LATEST_VERSION);
            const latestLog = computed(() => updateLogs.value.find(l => l.version === latestVersion.value) || updateLogs.value[0] || null);

            // --- 新增：設定頁面歷史紀錄顯示控制 ---
            const showAllUpdates = ref(false);
            const expandedVersion = ref(null);
            const visibleUpdateLogs = computed(() => {
                if (showAllUpdates.value) return updateLogs.value;
                return updateLogs.value.slice(0, 3);
            });

            // pad2 and getTodayStr removed (using utils)
            const newItem = ref({
                id: null,
                name: "",
                quantity: "1",
                storedDate: getTodayStr(),
                expiryDate: "",
                noExpiry: false,
                image: null,
                zone: "cold",
                owners: ['全家'],
                useExistingImage: false,
                shoppingStatus: null // null, 'toBuy', 'inCart'
            });

            // --- 偵測重複物品 ---
            const matchedExistingItem = computed(() => {
                if (currentPage.value !== 'add') return null;
                if (!newItem.value.name || !newItem.value.zone) return null;

                return items.value.find(i => 
                    i.name.trim() === newItem.value.name.trim() && 
                    (i.zone || 'cold') === newItem.value.zone 
                ) || null;
            });

            // 優化：自動完成名稱 (Datalist)
            const uniqueItemNames = computed(() => {
                const names = items.value.map(i => i.name).filter(n => n);
                return [...new Set(names)].sort();
            });

            // 監聽 matchedExistingItem
            watch(matchedExistingItem, (val) => {
                if (!val) {
                    newItem.value.useExistingImage = false;
                } else {
                    if (!newItem.value.image) {
                        newItem.value.useExistingImage = true;
                    }
                }
            });

            // --- 方法 ---

            const checkConfig = async () => {
                const storedConfig = localStorage.getItem("fridge_firebase_config");
                const storedUser = localStorage.getItem("fridge_user_name");

                if (storedConfig && storedUser) {
                    try {
                        const configObj = JSON.parse(storedConfig);
                        await initFirebase(configObj, storedUser);
                    } catch (e) {
                        console.error("Config load error", e);
                        localStorage.removeItem("fridge_firebase_config");
                        isConfigured.value = false;
                    }
                } else {
                    isConfigured.value = false;
                }
            };

            const initFirebase = async (config, userName) => {
                try {
                    if (!appFirebase) {
                        appFirebase = initializeApp(config);
                        db = getFirestore(appFirebase);
                    }
                    
                    currentUserName.value = userName;
                    localStorage.setItem("fridge_user_name", userName);
                    
                    isConfigured.value = true;
                    isLoading.value = true;

                    await checkAndJoinFamily(userName);
                    startListeners();
                } catch (e) {
                    throw e;
                }
            };

            const saveInitialConfig = async () => {
                setupError.value = "";
                if (!inputConfigStr.value.includes("firebaseConfig") && !inputConfigStr.value.includes("{")) {
                    setupError.value = "格式似乎不正確，請複製包含 { ... } 的完整程式碼";
                    return;
                }
                
                if (!inputUserName.value.trim()) {
                    setupError.value = "請輸入您的稱呼";
                    return;
                }

                isSettingUp.value = true;
                
                try {
                    let cleanStr = inputConfigStr.value.trim();
                    cleanStr = cleanStr.replace(/const\s+firebaseConfig\s*=\s*/, '');
                    cleanStr = cleanStr.replace(/;$/, '');
                    
                    const configObj = (new Function(`return ${cleanStr}`))();
                    if (!configObj.projectId) throw new Error("無效的設定內容");

                    await initFirebase(configObj, inputUserName.value.trim());
                    localStorage.setItem("fridge_firebase_config", JSON.stringify(configObj));
                    
                } catch (e) {
                    console.error(e);
                    setupError.value = "設定失敗，請檢查代碼是否正確或是網路連線異常";
                    appFirebase = null; 
                } finally {
                    isSettingUp.value = false;
                }
            };

            const checkAndJoinFamily = async (userName) => {
                const settingsRef = doc(db, "family_metadata", "general");
                try {
                    const docSnap = await getDoc(settingsRef);
                    if (!docSnap.exists()) {
                        await setDoc(settingsRef, {
                            familyName: "我的家庭",
                            members: [userName]
                        });
                        familySettings.value = { familyName: "我的家庭", members: [userName] };
                    } else {
                        const data = docSnap.data();
                        let members = data.members || [];
                        if (!members.includes(userName)) {
                            members.push(userName);
                            await updateDoc(settingsRef, { members: members });
                        }
                        familySettings.value = {
                            familyName: data.familyName || "我的家庭",
                            members: members
                        };
                    }
                } catch (e) {
                    console.error("Family Setup Error", e);
                }
            };

            const startListeners = () => {
                onSnapshot(collection(db, "fridge_items"), (snapshot) => {
                    items.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    isLoading.value = false;
                    showUpdateModal(false); 
                });

                onSnapshot(doc(db, "family_metadata", "general"), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        familySettings.value.familyName = data.familyName;
                        familySettings.value.members = data.members || [];
                        
                        if (data.latest_rename) {
                            const { from, to, at } = data.latest_rename;
                            const now = Date.now();
                            if (from === currentUserName.value && (now - at < 60000)) {
                                currentUserName.value = to;
                                localStorage.setItem("fridge_user_name", to);
                            }
                        }
                    }
                });
            };

            const startEditFamilyName = () => {
                editFamilyNameTemp.value = familySettings.value.familyName;
                isEditingFamilyName.value = true;
            };

            const saveFamilyName = async () => {
                if (!editFamilyNameTemp.value.trim()) return;
                try {
                    await updateDoc(doc(db, "family_metadata", "general"), {
                        familyName: editFamilyNameTemp.value.trim()
                    });
                    isEditingFamilyName.value = false;
                } catch (e) {
                    alert("更新失敗");
                }
            };

            const startEditUserName = (name) => {
                editUserNameTemp.value = name;
                nameEditError.value = "";
                const el = new bootstrap.Modal(document.getElementById('editNameModal'));
                el.show();
            };
            
            const confirmEditUserName = async () => {
                const newName = editUserNameTemp.value.trim();
                const oldName = currentUserName.value;
                if (!newName) { nameEditError.value = "名稱不能為空"; return; }
                if (newName === oldName) { bootstrap.Modal.getInstance(document.getElementById('editNameModal')).hide(); return; }
                
                try {
                    const updatedMembers = familySettings.value.members.filter(m => m !== oldName);
                    updatedMembers.push(newName);
                    await updateDoc(doc(db, "family_metadata", "general"), {
                         members: updatedMembers,
                         latest_rename: { from: oldName, to: newName, at: Date.now() }
                    });
                    currentUserName.value = newName;
                    localStorage.setItem("fridge_user_name", newName);
                    bootstrap.Modal.getInstance(document.getElementById('editNameModal')).hide();
                } catch (e) { nameEditError.value = "更新失敗"; }
            };

            const resetApp = () => {
                if(confirm("確定要重設嗎？這將會清除此裝置的登入資訊（冰箱資料會保留在雲端）。")) {
                    localStorage.removeItem("fridge_firebase_config");
                    localStorage.removeItem("fridge_user_name");
                    location.reload();
                }
            };
            
            const loadSettings = () => {
                const saved = localStorage.getItem("fridge_settings_v1");
                if (saved) {
                    try {
                        const obj = JSON.parse(saved);
                        settings.value = { ...settings.value, ...obj };
                    } catch (e) {}
                }
            };

            const saveSettings = () => {
                localStorage.setItem("fridge_settings_v1", JSON.stringify(settings.value));
            };

            const showUpdateModal = (force = false) => {
                if (force) {
                    previousPage.value = currentPage.value;
                    currentPage.value = 'update-info';
                    return;
                }
                
                if (!settings.value.updateNotifyEnabled) return;
                
                const lastSeen = localStorage.getItem("lastSeenUpdateVersion");
                
                if (lastSeen === null) {
                    localStorage.setItem("lastSeenUpdateVersion", APP_VERSION);
                    return;
                }

                if (lastSeen === APP_VERSION) return; 

                previousPage.value = currentPage.value;
                currentPage.value = 'update-info';
            };

            const closeUpdatePage = () => {
                localStorage.setItem("lastSeenUpdateVersion", latestVersion.value);
                if (previousPage.value === 'settings') {
                    currentPage.value = 'settings';
                } else {
                    currentPage.value = 'home';
                }
            };

            const isNoExpiry = (item) => {
                if (item?.noExpiry) return true;
                if (!item?.expiryDate) return true;
                return false;
            };

            // 回到頂部功能
            const scrollToTop = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            onMounted(() => {
                loadSettings();
                checkConfig();
                // 監聽滾動事件
                window.addEventListener('scroll', () => {
                    showScrollTop.value = window.scrollY > 300;
                });
            });
            
            watch(() => settings.value.updateNotifyEnabled, () => {
                saveSettings();
            });

            const processImage = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                newItem.value.useExistingImage = false;
                isCompressing.value = true;
                try {
                    const compressed = await compressFile(file);
                    newItem.value.image = compressed;
                } catch (e) {
                    alert("圖片處理失敗");
                } finally {
                    isCompressing.value = false;
                }
            };

            const toggleOwner = (name) => {
                let owners = newItem.value.owners || [];
                if (name === '全家') {
                    if (!owners.includes('全家')) { newItem.value.owners = ['全家']; } 
                    else { newItem.value.owners = []; }
                } else {
                    if (owners.includes('全家')) { owners = owners.filter(o => o !== '全家'); }
                    if (owners.includes(name)) { owners = owners.filter(o => o !== name); } 
                    else { owners.push(name); }
                    if (owners.length === 0) { owners = ['全家']; }
                    newItem.value.owners = owners;
                }
            };

            const formatOwners = (owners) => {
                if (!owners || owners.length === 0) return '全家';
                return owners.join('、');
            };

            const recalculateItemFromBatches = (batches, owners) => {
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

                const totalQty = batches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
                const firstBatch = batches[0] || {};

                return {
                    quantity: totalQty,
                    storedDate: firstBatch.storedDate || "",
                    expiryDate: firstBatch.expiryDate || "",
                    noExpiry: firstBatch.noExpiry || false,
                    image: firstBatch.image || "", 
                    owners: owners,
                    batches: batches
                };
            };

            const toggleToBuyStatus = (e) => {
                if(e.target.checked) {
                    newItem.value.shoppingStatus = 'toBuy';
                } else {
                    newItem.value.shoppingStatus = null;
                }
            };

            // --- 修正後的 submitItem 函式 (修復 undefined 錯誤) ---
            const submitItem = async () => {
                if (!newItem.value.useExistingImage && !newItem.value.image) { 
                    alert("請記得拍照喔！"); return; 
                }
                
                let safeQuantity = 1;
                if (newItem.value.quantity === "" || newItem.value.quantity === null) {
                    safeQuantity = (currentPage.value === 'add') ? 1 : 0;
                } else {
                    safeQuantity = parseInt(newItem.value.quantity);
                }

                if (isNaN(safeQuantity)) safeQuantity = 0;
                
                if (safeQuantity != 0 && !newItem.value.storedDate) { 
                    alert("請填存入日期"); return; 
                }
                
                if (!db) return;

                const expiryDateClean = newItem.value.noExpiry ? "" : (newItem.value.expiryDate || "");
                const noExpiryFinal = newItem.value.noExpiry || !expiryDateClean;
                const ownersFinal = (newItem.value.owners && newItem.value.owners.length > 0) ? newItem.value.owners : ['全家'];
                
                // 確保圖片不是 undefined
                let imageToSave = newItem.value.image || null;

                const newBatch = {
                    storedDate: newItem.value.storedDate,
                    expiryDate: expiryDateClean,
                    noExpiry: noExpiryFinal,
                    quantity: safeQuantity,
                    image: imageToSave, 
                    addedAt: Date.now()
                };

                isUploading.value = true;
                try {
                    if (newItem.value.id) {
                        // === 編輯現有物品 ===
                        const oldItemRef = items.value.find(i => i.id === newItem.value.id);
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

                        // 確保批次圖片不為 undefined
                        const finalImage = newItem.value.image || batches[0].image || null;
                        
                        batches[0] = { ...batches[0], ...newBatch, image: finalImage };
                        const result = recalculateItemFromBatches(batches, ownersFinal);

                        await updateDoc(doc(db, "fridge_items", newItem.value.id), {
                            name: newItem.value.name,
                            zone: newItem.value.zone || 'cold',
                            shoppingStatus: newItem.value.shoppingStatus,
                            ...result,
                            updatedAt: new Date()
                        });

                    } else {
                        // === 新增物品 ===
                        const targetItem = matchedExistingItem.value;

                        if (targetItem) {
                            // --- 合併到現有物品 (偵測到重複) ---
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

                            if (newItem.value.useExistingImage) {
                                newBatch.image = targetItem.image || null;
                            } else {
                                newBatch.image = newItem.value.image || null; 
                            }

                            batches.push(newBatch);
                            
                            // 如果舊資料沒有 owners 欄位，給予預設值
                            const targetOwners = targetItem.owners || ['全家'];
                            const result = recalculateItemFromBatches(batches, targetOwners); 

                            await updateDoc(doc(db, "fridge_items", targetItem.id), {
                                ...result,
                                updatedAt: new Date()
                            });

                        } else {
                            // --- 完全新增一個新物品 ---
                            const initialBatches = [newBatch];
                            const result = recalculateItemFromBatches(initialBatches, ownersFinal);

                            await addDoc(collection(db, "fridge_items"), {
                                name: newItem.value.name,
                                zone: newItem.value.zone || 'cold',
                                shoppingStatus: null,
                                ...result,
                                createdAt: new Date()
                            });
                        }
                    }

                    if (pendingPurchaseOriginalId.value) {
                        await updateDoc(doc(db, "fridge_items", pendingPurchaseOriginalId.value), {
                            shoppingStatus: null
                        });
                        pendingPurchaseOriginalId.value = null;
                    }

                    goHome();
                } catch (e) {
                    console.error("Firebase Error:", e);
                    alert("上傳/更新失敗，請檢查網路");
                } finally {
                    isUploading.value = false;
                }
            };

            const openPreview = (url) => { previewImageUrl.value = url; };
            const closePreview = () => { previewImageUrl.value = null; };

            const handleTouchStart = (item) => {
                if (isSelectionMode.value) return; 
                longPressTimer = setTimeout(() => { goToEditPage(item); }, LONG_PRESS_DURATION);
            };
            const handleTouchEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
            const handleTouchMove = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };

            const handleCardClick = (item) => {
                if (isSelectionMode.value) {
                    const idx = selectedHomeIds.value.indexOf(item.id);
                    if (idx > -1) {
                        selectedHomeIds.value.splice(idx, 1);
                    } else {
                        selectedHomeIds.value.push(item.id);
                    }
                }
            };

            const goToTakeOutPage = (item) => {
                savedScrollY.value = window.scrollY;
                
                itemToDelete.value = item;
                const qty = parseInt(item.quantity);
                maxTakeOut.value = (!isNaN(qty) && qty > 0) ? qty : 1;
                takeOutAmount.value = 1;
                currentPage.value = "takeout";
                
                // 優化：強制瞬間移動到頂部 (無動畫)
                nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            };

            const confirmTakeOutAction = async () => {
                if (!db || !itemToDelete.value) return;

                const takeQty = parseInt(takeOutAmount.value);
                const currentQty = parseInt(itemToDelete.value.quantity);

                if (takeQty >= currentQty) {
  try {
    await updateDoc(doc(db, "fridge_items", itemToDelete.value.id), {
      quantity: 0,

      // 重點：吃完就不要留批次
      batches: [],

      // 無庫存不需要這些顯示用欄位，清掉可減少資料與避免過期警示干擾
      storedDate: "",
      expiryDate: "",
      noExpiry: true,

      updatedAt: new Date()
    });

    goHome();
  } catch (e) {
    alert("更新失敗");
  }
  return;
}

                try {
                    let batches = itemToDelete.value.batches ? [...itemToDelete.value.batches] : [{
                        storedDate: itemToDelete.value.storedDate,
                        expiryDate: itemToDelete.value.expiryDate,
                        noExpiry: itemToDelete.value.noExpiry,
                        quantity: currentQty,
                        image: itemToDelete.value.image
                    }];

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

                    let remainingToTake = takeQty;
                    const newBatches = [];

                    for (let batch of batches) {
                        if (remainingToTake <= 0) {
                            newBatches.push(batch);
                            continue;
                        }

                        let batchQty = parseInt(batch.quantity);
                        
                        if (batchQty > remainingToTake) {
                            batch.quantity = batchQty - remainingToTake;
                            remainingToTake = 0;
                            newBatches.push(batch);
                        } else {
                            remainingToTake -= batchQty;
                        }
                    }

                    const result = recalculateItemFromBatches(newBatches, itemToDelete.value.owners);
                    await updateDoc(doc(db, "fridge_items", itemToDelete.value.id), { ...result });
                    
                    goHome();
                } catch(e) { 
                    console.error(e);
                    alert("更新失敗"); 
                }
            };

            // 永久刪除 (單一)
            const deleteItemPermanently = async (id) => {
                if(confirm("確定要永久刪除此物品嗎？此操作無法復原。")) {
                    await deleteDoc(doc(db, "fridge_items", id));
                    if(currentPage.value === 'edit') goHome();
                }
            };

            // 永久刪除 (多選)
            const deleteSelectedNoStock = async () => {
                if(confirm(`確定要永久刪除選取的 ${selectedHomeIds.value.length} 項物品嗎？`)) {
                    const promises = selectedHomeIds.value.map(id => deleteDoc(doc(db, "fridge_items", id)));
                    await Promise.all(promises);
                    selectedHomeIds.value = [];
                    isSelectionMode.value = false;
                }
            };

            // 移出待購買清單
            const removeFromToBuyList = async () => {
                 const promises = selectedToBuyIds.value.map(id => 
                    updateDoc(doc(db, "fridge_items", id), { shoppingStatus: null })
                );
                await Promise.all(promises);
                selectedToBuyIds.value = [];
            };

            // 批次加入待買
            const addBatchToBuy = async () => {
                 const promises = selectedHomeIds.value.map(id => 
                    updateDoc(doc(db, "fridge_items", id), { shoppingStatus: 'toBuy' })
                );
                await Promise.all(promises);
                alert("已加入待購買清單");
                selectedHomeIds.value = [];
                isSelectionMode.value = false;
            };



            const addDays = (days) => {
                newItem.value.expiryDate = addDaysToDate(newItem.value.expiryDate, days);
            };

            const getAlertClass = (item) => {
                if (parseInt(item.quantity) === 0) return ""; // 無庫存不顯示警示
                if (isNoExpiry(item)) return "";
                const d = getDays(item.expiryDate);
                if (d === null) return "";
                if (d < 0) return "alert-red"; 
                if (d <= 7) return "alert-yellow";
                return "";
            };

            const getBorderClass = (item) => {
                if (parseInt(item.quantity) === 0) return ""; // 無庫存不顯示框線警示
                if (isNoExpiry(item)) return "";
                const d = getDays(item.expiryDate);
                if (d === null) return "";
                if (d < 0) return "border-red"; 
                if (d <= 7) return "border-yellow";
                return "";
            };

            const getZoneName = (zone) => {
                switch(zone) {
                    case 'all': return '全區';
                    case 'cold': return '冷藏區';
                    case 'frozen': return '冷凍區';
                    case 'veggie': return '蔬果區';
                    case 'nostock': return '無庫存區';
                    default: return '冰箱庫存';
                }
            };

            const getZoneColor = (zone) => {
                const z = zone || 'cold';
                switch(z) {
                    case 'cold': return '#80aaff';
                    case 'frozen': return '#002266';
                    case 'veggie': return '#29a329';
                    default: return '#80aaff';
                }
            };

            const zoneStats = computed(() => {
                const stats = {
                    // 修改這裡：全區也要有 warning 和 expired
                    all: { total: 0, warning: 0, expired: 0 },
                    cold: { total: 0, warning: 0, expired: 0 },
                    frozen: { total: 0, warning: 0, expired: 0 },
                    veggie: { total: 0, warning: 0, expired: 0 },
                    nostock: { total: 0 } 
                };

                items.value.forEach(item => {
                    // 無庫存不計入統計
                    if (parseInt(item.quantity) === 0) {
                        stats.nostock.total++;
                        return; 
                    }

                    // 1. 全區總數 +1
                    stats.all.total++;
                    
                    const z = item.zone || 'cold';
                    
                    // 2. 該分區總數 +1
                    if (stats[z]) stats[z].total++;
                    
                    // 3. 計算過期與警告狀態
                    if (!isNoExpiry(item)) {
                        const days = getDays(item.expiryDate);
                        if (days !== null) {
                            if (days < 0) {
                                // 過期：全區+1，該區+1
                                stats.all.expired++;
                                if (stats[z]) stats[z].expired++;
                            } else if (days <= 7) {
                                // 警告：全區+1，該區+1
                                stats.all.warning++;
                                if (stats[z]) stats[z].warning++;
                            }
                        }
                    }
                });
                return stats;
            });

            // 通用列表勾選切換
            const toggleSelection = (list, id) => {
                const idx = list.indexOf(id);
                if (idx > -1) {
                    list.splice(idx, 1);
                } else {
                    list.push(id);
                }
            };

            // 強制關閉側邊欄並清理所有狀態
            const closeSidebarCompletely = () => {
                const el = document.getElementById("sidebar");
                if (!el) return;
                
                // 強制移除 show class
                el.classList.remove('show', 'showing');
                el.removeAttribute('aria-modal');
                el.removeAttribute('role');
                el.setAttribute('aria-hidden', 'true');
                
                // 移除所有 backdrop
                document.querySelectorAll('.offcanvas-backdrop').forEach(b => b.remove());
                
                // 清理 body 樣式
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // 銷毀現有實例
                const inst = bootstrap.Offcanvas.getInstance(el);
                if (inst) {
                    try { inst.dispose(); } catch(e) {}
                }
            };

            const selectZoneFromSidebar = (zone) => {
                closeSidebarCompletely();
                filterZone.value = zone;
                isSelectionMode.value = false;
                selectedHomeIds.value = [];
                goHome();
            };

            const goToAddPage = () => {
                // 優化：記錄位置並重置到頂端 (無動畫)
                savedScrollY.value = window.scrollY;

                newItem.value = {
                    id: null,
                    name: "",
                    quantity: "1",
                    storedDate: getTodayStr(),
                    expiryDate: "",
                    noExpiry: false,
                    image: null,
                    zone: "cold",
                    owners: ['全家'],
                    useExistingImage: false,
                    shoppingStatus: null
                };
                pendingPurchaseOriginalId.value = null; 
                currentPage.value = "add";

                nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            };

            const goToEditPage = (item) => {
                if(longPressTimer) clearTimeout(longPressTimer);
                
                // 優化：記錄位置並重置到頂端 (無動畫)
                savedScrollY.value = window.scrollY;

                newItem.value = {
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    storedDate: item.storedDate,
                    expiryDate: item.expiryDate,
                    noExpiry: item.noExpiry,
                    image: item.image,
                    zone: item.zone || 'cold',
                    owners: item.owners || ['全家'],
                    useExistingImage: false,
                    shoppingStatus: item.shoppingStatus || null
                };
                currentPage.value = "edit";
                
                nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            };

            const goSettingsFromSidebar = () => {
                closeSidebarCompletely();
                currentPage.value = "settings";
                // 確保設定頁可以滑動
                document.body.style.overflow = '';
            };
            
            const goPageFromSidebar = (page) => {
                closeSidebarCompletely();
                selectedToBuyIds.value = [];
                selectedCartIds.value = [];
                currentPage.value = page;
            };

            const returnToSidebar = () => {
                currentPage.value = 'home';
                setTimeout(() => {
                    const el = document.getElementById("sidebar");
                    const inst = bootstrap.Offcanvas.getOrCreateInstance(el);
                    inst.show();
                }, 50);
            };

            const toggleSelectionMode = () => {
                isSelectionMode.value = !isSelectionMode.value;
                selectedHomeIds.value = [];
            };

            const goHome = () => {
                currentPage.value = "home";
                previewImageUrl.value = null;
                // 優化：返回時恢復滾動位置 (強制無動畫)
                nextTick(() => {
                    window.scrollTo({ top: savedScrollY.value, behavior: 'instant' });
                });
            };

            const filteredItems = computed(() => {
                const keyword = searchText.value?.trim() || "";
                let list = items.value;
                
                // 搜尋過濾
                if (keyword) list = list.filter(i => String(i.name || "").includes(keyword));
                
                // 區域與庫存過濾邏輯
                if (filterZone.value === 'nostock') {
                    // 無庫存區：只顯示數量為 0
                    list = list.filter(i => parseInt(i.quantity) === 0);
                } else {
                    // 其他區：只顯示數量 > 0
                    list = list.filter(i => parseInt(i.quantity) > 0);
                    
                    if (filterZone.value !== 'all') {
                        list = list.filter(i => (i.zone || 'cold') === filterZone.value);
                    }
                }
                
                // 排序
                const toSortKey = (it) => {
                    const noExp = isNoExpiry(it);
                    const exp = (!noExp && it.expiryDate) ? it.expiryDate : "9999-12-31";
                    const stored = it.storedDate || "9999-12-31";
                    return { exp, stored };
                };

                return [...list].sort((a, b) => {
                    const ka = toSortKey(a);
                    const kb = toSortKey(b);
                    if (ka.exp < kb.exp) return -1;
                    if (ka.exp > kb.exp) return 1;
                    if (ka.stored < kb.stored) return -1;
                    if (ka.stored > kb.stored) return 1;
                    return 0;
                });
            });

            // --- 購物清單邏輯 ---
            const toBuyList = computed(() => {
                return items.value.filter(i => i.shoppingStatus === 'toBuy');
            });

            // 修改 computed 屬性，加入分類過濾
            const cartList = computed(() => {
                let list = items.value.filter(i => i.shoppingStatus === 'inCart');
                
                if (cartFilterZone.value !== 'all') {
                    list = list.filter(i => (i.zone || 'cold') === cartFilterZone.value);
                }
                
                return list;
            });

            // 新增：Hero 卡片顯示邏輯
            const heroInfo = computed(() => {
                switch(cartFilterZone.value) {
                    case 'cold': 
                        return { icon: 'kitchen', label: '冷藏區商品', sub: '請盡快放入冰箱冷藏' };
                    case 'frozen': 
                        return { icon: 'ac_unit', label: '冷凍區商品', sub: '請盡快放入冷凍庫' };
                    case 'veggie': 
                        return { icon: 'eco', label: '蔬果區商品', sub: '注意保鮮期限' };
                    default: 
                        return { icon: 'shopping_basket', label: '全部商品', sub: '已購買，準備存入冰箱' };
                }
            });

            const moveSelectedToCart = async () => {
                const promises = selectedToBuyIds.value.map(id => 
                    updateDoc(doc(db, "fridge_items", id), { shoppingStatus: 'inCart' })
                );
                await Promise.all(promises);
                selectedToBuyIds.value = [];
                goPageFromSidebar('shopping-cart'); // 跳轉到購物車
            };

            const removeSelectedFromCart = async () => {
                const promises = selectedCartIds.value.map(id => 
                    updateDoc(doc(db, "fridge_items", id), { shoppingStatus: null })
                );
                await Promise.all(promises);
                selectedCartIds.value = [];
            };

            const moveSelectedBackToBuy = async () => {
                 const promises = selectedCartIds.value.map(id => 
                    updateDoc(doc(db, "fridge_items", id), { shoppingStatus: 'toBuy' })
                );
                await Promise.all(promises);
                selectedCartIds.value = [];
            };

            const startPurchase = (item) => {
                pendingPurchaseOriginalId.value = item.id;
                
                // 優化：記錄位置並重置到頂端 (無動畫)
                savedScrollY.value = window.scrollY;

                newItem.value = {
                    id: null,
                    name: item.name,
                    quantity: "1",
                    storedDate: getTodayStr(),
                    expiryDate: "",
                    noExpiry: false,
                    image: null, 
                    zone: item.zone || 'cold',
                    owners: item.owners || ['全家'],
                    useExistingImage: false, 
                    shoppingStatus: null
                };
                currentPage.value = "add";

                nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            };

</script>
