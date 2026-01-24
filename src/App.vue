<template>
  <div class="container-fluid px-3 py-3" v-cloak>
    
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
            <HomeView
                v-if="!isLoading && currentPage==='home'"
                :filtered-items="filteredItems"
                v-model:filter-zone="filterZone"
                v-model:search-text="searchText"
                :family-settings="familySettings"
                v-model:is-selection-mode="isSelectionMode"
                v-model:selected-home-ids="selectedHomeIds"
                :show-scroll-top="showScrollTop"
                @edit="goToEditPage"
                @take-out="goToTakeOutPage"
                @delete-selected="deleteSelectedNoStock"
                @add-batch-to-buy="addBatchToBuy"
                @add-page="goToAddPage"
                @open-preview="openPreview"
                @scroll-to-top="scrollToTop"
                @toggle-sidebar="toggleSidebar"
            />
    
            <!-- ADD / EDIT PAGE -->
            <ItemForm
                v-if="!isLoading && (currentPage==='add' || currentPage==='edit')"
                :mode="currentPage"
                :initial-item="newItem"
                :all-items="items"
                :family-settings="familySettings"
                :pending-purchase-original-id="pendingPurchaseOriginalId"
                @cancel="goHome"
                @submit-success="goHome"
                @delete-item="deleteItemPermanently"
                @update-pending-id="(val) => pendingPurchaseOriginalId = val"
            />
            
            <!-- TO BUY LIST PAGE (待購買清單) -->
            <ToBuyListPage
                v-if="!isLoading && currentPage==='to-buy-list'"
                :items="items"
                @navigate="handleNavigateFromToBuyList"
            />
    
            <!-- SHOPPING CART PAGE (購物車) - Bento/Glassmorphism Mode -->
            <ShoppingCartPage
                v-if="!isLoading && currentPage==='shopping-cart'"
                :items="items"
                @navigate="handleNavigateFromCart"
                @start-purchase="startPurchase"
            />
    
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
    
                <!-- 帳號綁定 Google -->
                <div class="card section-card mb-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <i class="bi bi-google text-danger"></i>
                            <div class="fw-bold">帳號綁定</div>
                        </div>
                        
                        <div v-if="!currentUser">
                            <p class="text-muted small mb-3">連結 Google 帳號可確保資料更安全，並方便在不同裝置間登入。</p>
                            <button class="btn btn-outline-dark w-100 rounded-pill d-flex align-items-center justify-content-center gap-2" @click="linkGoogleAccount">
                                <i class="bi bi-google"></i>
                                連結 Google 帳號
                            </button>
                        </div>
                        <div v-else>
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="rounded-circle" style="width: 48px; height: 48px;">
                                <div v-else class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                    {{ currentUser.email?.charAt(0).toUpperCase() }}
                                </div>
                                <div class="overflow-hidden">
                                    <div class="fw-bold text-truncate">{{ currentUser.displayName || 'Google 使用者' }}</div>
                                    <div class="text-muted small text-truncate">{{ currentUser.email }}</div>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline-danger rounded-pill w-100" @click="unlinkGoogleAccount">
                                解除綁定 (登出)
                            </button>
                        </div>
                    </div>
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
            <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebar" aria-labelledby="sidebarLabel" data-bs-backdrop="true" data-bs-scroll="false">
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
                        <button class="btn btn-outline-dark text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('all')">
                            <span><i class="bi bi-grid-fill me-2"></i>全區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.all.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.all.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.all.expired }}</span>
                            </div>
                        </button>
                        
                        <button class="btn btn-outline-primary text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('cold')">
                            <span><i class="bi bi-snow me-2"></i>冷藏區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge" title="總數">{{ zoneStats.cold.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge" title="7日警告">{{ zoneStats.cold.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge" title="已過期">{{ zoneStats.cold.expired }}</span>
                            </div>
                        </button>
                        <button class="btn btn-outline-frozen text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('frozen')">
                            <span><i class="bi bi-box-seam me-2"></i>冷凍區</span>
                            <div class="d-flex gap-1">
                                <span class="badge bg-secondary zone-stat-badge">{{ zoneStats.frozen.total }}</span>
                                <span class="badge bg-warning text-dark zone-stat-badge">{{ zoneStats.frozen.warning }}</span>
                                <span class="badge bg-danger zone-stat-badge">{{ zoneStats.frozen.expired }}</span>
                            </div>
                        </button>
                        <button class="btn btn-outline-success text-start d-flex justify-content-between align-items-center" @click="selectZoneFromSidebar('veggie')">
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

            <!-- Toast Notification -->
            <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" style="z-index: 1090">
                <div id="liveToast" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" ref="toastEl">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="bi bi-check-circle-fill me-2"></i>{{ toastMessage }}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            </div>
            
        </template>
    
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { LATEST_VERSION, UPDATE_LOGS } from './update-logs.js'
import { APP_VERSION, ZONE_COLORS as ZONE_COLORS_CONST, ZONE_NAMES, LONG_PRESS_DURATION } from './utils/constants'
import { getTodayStr, getDays, addDaysToDate, parseLocalDate } from './utils/dateUtils'
import { useImageCompression } from './composables/useImageCompression'
import ToBuyListPage from './components/ToBuyListPage.vue'
import ShoppingCartPage from './components/ShoppingCartPage.vue'
import HomeView from './components/HomeView.vue'
import ItemForm from './components/ItemForm.vue'
import { recalculateItemFromBatches } from './utils/inventoryUtils.js'
import * as bootstrap from 'bootstrap'

const appVersion = APP_VERSION;

// Globals
let appFirebase;
let db;
let auth; // Firebase Auth instance

// Composable
const { compressFile } = useImageCompression();

            // --- 狀態變數 ---
            const isConfigured = ref(false);
            const isSettingUp = ref(false);
            const inputConfigStr = ref("");
            const inputUserName = ref("");
            const currentUserName = ref("");
            const setupError = ref("");
            // Auth State
            const currentUser = ref(null);

            const items = ref([]);
// ... (lines 472-575 match original context, skipping for brevity in replacement search) ... 
            const initFirebase = async (config, userName) => {
                try {
                    if (!appFirebase) {
                        appFirebase = initializeApp(config);
                        db = getFirestore(appFirebase);
                        auth = getAuth(appFirebase);
                        
                        // 監聽登入狀態
                        onAuthStateChanged(auth, (user) => {
                            currentUser.value = user;
                        });
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
            const searchText = ref("");
            const filterZone = ref("all");


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

            const pendingPurchaseOriginalId = ref(null);
            
            // 多選管理模式 (改名為通用 Ids)
            const isSelectionMode = ref(false);
            const selectedHomeIds = ref([]);
            
            const toastMessage = ref("");
            const toastEl = ref(null);
            const showToast = (msg) => {
                toastMessage.value = msg;
                nextTick(() => {
                    if (toastEl.value) {
                         const t = bootstrap.Toast.getOrCreateInstance(toastEl.value);
                         t.show();
                    }
                });
            };

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

            // Google 登入綁定
            const linkGoogleAccount = async () => {
                if (!auth) return;
                const provider = new GoogleAuthProvider();
                try {
                    await signInWithPopup(auth, provider);
                    showToast("綁定成功！");
                } catch (error) {
                    console.error("Auth Error:", error);
                    alert("綁定失敗：" + error.message);
                }
            };

            // 解除綁定 (登出)
            const unlinkGoogleAccount = async () => {
                if (!auth) return;
                try {
                    await signOut(auth);
                    showToast("已解除綁定");
                } catch (error) {
                    console.error("SignOut Error", error);
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


            // 強力清理所有殘留 backdrop 與鎖定狀態
            const cleanupBackdrops = () => {
                // 1. 移除所有 backdrop 元素
                document.querySelectorAll('.offcanvas-backdrop').forEach(el => el.remove());
                
                // 2. 解鎖 body
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');

                // 3. 確保側邊欄實例狀態正確 (如果 DOM 還在)
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl) {
                    const inst = bootstrap.Offcanvas.getInstance(sidebarEl);
                    if (inst) {
                        try {
                            inst.hide();
                        } catch (e) {
                            // 忽略隱藏錯誤
                        }
                    }
                    sidebarEl.classList.remove('show');
                    sidebarEl.setAttribute('aria-hidden', 'true');
                    sidebarEl.removeAttribute('aria-modal');
                    sidebarEl.removeAttribute('role');
                }
            };
            onMounted(() => {
                loadSettings();
                checkConfig();
                // 監聽滾動事件
                window.addEventListener('scroll', () => {
                    showScrollTop.value = window.scrollY > 300;
                });
            });

            // 監聽設定完成狀態
            watch(isConfigured, (newVal) => {
                // 不需要額外綁定事件，Bootstrap 原生行為已經足夠
                // 我們只在 currentPage 變化時強制介入清理
            });
            
            watch(() => settings.value.updateNotifyEnabled, () => {
                saveSettings();
            });


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
                showToast("已加入待購買清單");
                selectedHomeIds.value = [];
                isSelectionMode.value = false;
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

            // 強力清理所有殘留 backdrop 與鎖定狀態


            const isReturningToSidebar = ref(false);

            // 全局監聽頁面切換，一旦切換立即執行清理
            watch(currentPage, () => {
                // 如果是正在返回側邊欄的操作，不要執行清理，否則會把剛打開的側邊欄關掉
                if (isReturningToSidebar.value) return;

                // 立即清理
                cleanupBackdrops();
                // 稍微延遲再清理一次，防止動畫殘留
                setTimeout(cleanupBackdrops, 350);
            });

            // 確保每次打開側邊欄時，狀態是乾淨的
            const openSidebarSafe = () => {
                const el = document.getElementById("sidebar");
                if(el) {
                    const inst = bootstrap.Offcanvas.getOrCreateInstance(el);
                    inst.show();
                }
            };
            
            // 手動切換側邊欄 (解決 Bootstrap 與 Vue 衝突導致的開啟即關閉問題)
            const toggleSidebar = () => {
                const el = document.getElementById("sidebar");
                if(el) {
                    const inst = bootstrap.Offcanvas.getOrCreateInstance(el);
                    inst.toggle();
                }
            };

            const selectZoneFromSidebar = (zone) => {
                // 不等待動畫，直接切換狀態，依賴 watcher 清理
                filterZone.value = zone;
                isSelectionMode.value = false;
                selectedHomeIds.value = [];
                goHome();
                // 手動觸發一次清理確保萬一
                setTimeout(cleanupBackdrops, 100); 
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
                currentPage.value = "settings";
                setTimeout(cleanupBackdrops, 100);
            };
            
            const goPageFromSidebar = (page) => {
                currentPage.value = page;
                setTimeout(cleanupBackdrops, 100);
            };

            const returnToSidebar = () => {
                isReturningToSidebar.value = true;
                currentPage.value = 'home';
                nextTick(() => {
                    setTimeout(() => {
                        openSidebarSafe();
                        // 延遲重置，確保 watcher 已經跑完且側邊欄已打開
                        setTimeout(() => { isReturningToSidebar.value = false; }, 500);
                    }, 50);
                });
            };

            const handleNavigateFromToBuyList = (page) => {
                if (page === 'sidebar') {
                    returnToSidebar();
                } else if (page === 'shopping-cart') {
                    currentPage.value = 'shopping-cart';
                }
            };

            const handleNavigateFromCart = (page) => {
                 if (page === 'sidebar') {
                    returnToSidebar();
                 } else if (page === 'to-buy') {
                    currentPage.value = 'to-buy-list';
                 }
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
                if (keyword) {
                    const lowerKeyword = keyword.toLowerCase();
                    list = list.filter(i => (i.name || "").toLowerCase().includes(lowerKeyword));
                }
                
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
                
                // 排序 (提取出 helper 避免在 sort 中重複宣告)
                // 優化：直接比較字串，減少物件建立
                return [...list].sort((a, b) => {
                    const getSortDate = (it) => {
                         if (isNoExpiry(it)) return "9999-12-31";
                         return it.expiryDate || "9999-12-31";
                    };
                    
                    const dateA = getSortDate(a);
                    const dateB = getSortDate(b);
                    
                    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
                    
                    const storeA = a.storedDate || "9999-12-31";
                    const storeB = b.storedDate || "9999-12-31";
                    
                    if (storeA !== storeB) return storeA < storeB ? -1 : 1;
                    
                    return 0;
                });
            });

            // 側邊欄需要這兩個 computed (顯示徽章數量)
            const toBuyList = computed(() => {
                return items.value.filter(i => i.shoppingStatus === 'toBuy');
            });

            const cartList = computed(() => {
                return items.value.filter(i => i.shoppingStatus === 'inCart');
            });





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
