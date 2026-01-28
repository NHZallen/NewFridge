# ❄️ 智慧冰箱管理系統 (Fridge App)

![Version](https://img.shields.io/badge/version-1.14.0-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.4-4fc08d.svg)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.7-ffca28.svg)

> **極致美感的 Bento 風格冰箱管家，讓食材管理變得優雅、直覺。**

這是一個基於 **Vue 3 + Vite + Firebase** 構建的現代化 Web 應用程式，旨在幫助家庭輕鬆管理冰箱存貨、追蹤食材到期日，並整合完整的採買流程。

---

## ✨ 核心特色

### 🎨 現代化視覺設計 (Bento & Glassmorphism)
*   **Bento 佈局**: 採用靈動的格子介面（Bento Grid），平衡資訊密度與閱讀舒適感。
*   **玻璃擬態 (Glassmorphism)**: 柔和的磨砂背景與流體背景動畫，營造沉浸式的操作體驗。
*   **動態島底部選單**: 黑色懸浮操作島（Action Island），將多選統計與操作聚合在拇指可及之處。

### 🧠 智慧食材管理
*   **批次追蹤 (FIFO)**: 支援同一物品多個批次管理，取出時自動優先扣除「最早到期」的庫存。
*   **自動合併機制**: 智慧偵測同名同分區物品並自動合併，避免資料重複建檔。
*   **無庫存區**: 食材用完後自動移入無庫存區，方便下次採買時快速加入清單。

### 🛒 完整採買工作流
*   **待購買清單**: 記錄缺少的物資，支援手動新增或從庫存紀錄快速回購。
*   **雲端購物車**: 採買時實時勾選轉入購物車，狀態全家同步。
*   **一鍵存入補貨**: 買回家後直接點擊存入，自動繼承歷史照片並建立新批次。

### 📊 效能與穩定性
*   **極速渲染**: 運用 `v-memo` 與 `contain: content` 最佳化長列表滾動，即便有上百件品項依然絲滑順暢。
*   **PWA 支援**: 支援離線快取，可像原生 App 一樣安裝至手機桌面，秒開體驗。
*   **Firebase 即時同步**: 採用 Firestore 監聽機制，多人並行操作時數據秒速更新。
*   **🔐 雲端身分同步**: 與 Google 帳號深度整合，自動同步您的身分與偏好設定，換機免重設。

---

## 🛠️ 技術棧

*   **核心框架**: [Vue 3.4](https://vuejs.org/) (Setup API)
*   **開發工具**: [Vite 5](https://vitejs.dev/)
*   **樣式系統**: [Bootstrap 5.3](https://getbootstrap.com/) + Custom Vanilla CSS
*   **後端服務**: [Firebase](https://firebase.google.com/) (Firestore)
*   **靜態資源**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
*   **圖標系統**: Bootstrap Icons & Material Symbols

---

## 🚀 快速開始

### 本地開發環境設置

```bash
# 1. 複製專案
git clone https://github.com/NHZallen/NewFridge.git
cd NewFridge

# 2. 安裝依賴
npm install

# 3. 啟動開發伺服器
npm run dev
```

### 🔥 Firebase 詳細建置教學 (必讀)

本專案深度依賴 Firebase 服務，請務必按照以下步驟完整建置，確保功能正常運作。

#### 1. 建立專案 (Create Project)
1.  前往 [Firebase Console](https://console.firebase.google.com/)。
2.  點擊「新增專案」，輸入專案名稱 (例如 `Fridge-Manager`)。
3.  **Google Analytics**: 可選擇關閉 (測試用不需開啟)，點擊「建立專案」。

#### 2. 啟用 Blaze 付費方案 (⚠️ 重要)
**本系統部分功能可能達到免費額度上限或使用特定擴充，強烈建議啟用 Blaze 方案以避免服務中斷。**
1.  在左下角點擊「升級 (Upgrade)」。
2.  選擇 **Blaze (隨用隨付)** 方案。
3.  設定預算快訊 (例如 $1 USD) 以避免意外支出。

#### 3. 註冊應用程式 (Register App)
1.  在專案總覽頁面，點擊 **Web** 圖示 (`</>`)。
2.  輸入應用程式暱稱 (例如 `Web App`)。
3.  不需要勾選 Firebase Hosting。
4.  點擊「註冊應用程式」。
5.  複製 `firebaseConfig` 物件中的內容 (稍後啟動 App 時會用到)。

#### 4. 設定驗證 (Authentication)
1.  左側選單進入 **Build > Authentication**。
2.  點擊「開始使用」。
3.  **登入方式 (Sign-in method)**:
    *   **Google**: 啟用，並設定專案支援電子郵件。
    *   **電子郵件/密碼**: (如果您需要) 啟用。
4.  前往 **Settings > 網域 (Authorized domains)**，確保您的網域 (如 `localhost`, `vercel.app`) 已在清單中。

#### 5. 建立 Firestore 資料庫 (Firestore Database)
1.  左側選單進入 **Build > Firestore Database**。
2.  點擊「建立資料庫」。
3.  **位置**: 建議選擇 **`asia-east1`** (台灣) 或鄰近節點以降低延遲。
4.  **安全規則**: 選擇 **「以生產模式啟動 (Start in production mode)」**。
5.  設定完成後，前往 **規則 (Rules)** 分頁，將規則修改為以下**安全設定** (僅允許登入用戶存取)：
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if request.auth != null;
        }
      }
    }
    ```
6.  點擊「發布」。

#### 6. 建立 Storage 儲存槽 (Storage)
1.  左側選單進入 **Build > Storage**。
2.  點擊「開始使用」。
3.  **安全規則**: 選擇 **「以生產模式啟動 (Start in production mode)」**。
4.  **位置**: 跟隨預設或設定為 `asia-east1`。
5.  設定完成後，前往 **規則 (Rules)** 分頁，修改為：
    ```javascript
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        match /{allPaths=**} {
          allow read, write: if request.auth != null;
        }
      }
    }
    ```
6.  點擊「發布」。

---

### 🔑 啟動與連線
完成上述步驟後，回到本專案網頁：
1.  啟動網頁 (`npm run dev` 或部署後網址)。
2.  在初始設定畫面貼上 **步驟 3** 取得的 `firebaseConfig`。
3.  點擊連線，系統即可正常運作！

---

## 📦 部署

本專案經過優化，可完美部署於 Vercel 或 GitHub Pages。

### 部署到 Vercel (推薦)
1. 在 Vercel 連結 GitHub 儲存庫。
2. Framework Preset 選擇 **Vite**。
3. Build Command: `npm run build`
4. Output Directory: `dist`

---

## 📅 更新日誌 (精華摘要)

*   **v1.14.0**: 安全性更新與功能躍進。實作 Google 快速登入與雲端身分同步，並移除公開原始碼中的 API 金鑰以符合開源規範。
*   **v1.9.3**: 大規模組件化重構，導入 `v-memo` 優化長列表效能，修復側邊欄 Backdrop 噴發異常。
*   **v1.9.0**: 引進 Bento 設計語彙，實作導航列與側邊欄手動控制邏輯，提升操作穩定性。
*   **v1.8.0**: 引入動作懸浮島 (Action Island)，強化購物車管理體驗。
*   **v1.5.0**: 完善採買流程與無庫存管理機制。

---

## 📜 授權

本專案採 MIT License 授權。

---

> 💻 開發者：**NHZallen**   
> 📅 最後更新日期：2026-01-28
