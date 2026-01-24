# ❄️ 智慧冰箱管理系統 (Fridge App)

![Version](https://img.shields.io/badge/version-1.9.3-blue.svg)
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

### 首次配置說明

首次開啟應用後，系統會引導您進行 Firebase 設定：
1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立專案。
2. 啟動 **Firestore Database** 並設置安全性規則。
3. 複製 Web 設定碼 (firebaseConfig)，直接貼入應用程式的初始畫面中即可自動連接。

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

*   **v1.9.3**: 大規模組件化重構，導入 `v-memo` 優化長列表效能，修復側邊欄 Backdrop 噴發異常。
*   **v1.9.0**: 引進 Bento 設計語彙，實作導航列與側邊欄手動控制邏輯，提升操作穩定性。
*   **v1.8.0**: 引入動作懸浮島 (Action Island)，強化購物車管理體驗。
*   **v1.5.0**: 完善採買流程與無庫存管理機制。

---

## 📜 授權

本專案採 MIT License 授權。

---

> 💻 開發者：**NHZallen**   
> 📅 最後更新日期：2026-01-24
