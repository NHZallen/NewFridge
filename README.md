# 智慧冰箱管理系統

基於 Vue 3 + Vite + Firebase 的智慧冰箱管理應用。

## 功能特色

- 📱 PWA 支援，可安裝為手機 App
- 🔥 Firebase 即時同步，多裝置共用
- 📸 圖片壓縮與上傳
- 🛒 購物清單與購物車管理
- ⏰ 到期日提醒與警示
- 👨‍👩‍👧‍👦 家庭成員管理

## 技術棧

- **前端框架**: Vue 3.4 (Composition API)
- **建置工具**: Vite 5
- **UI 框架**: Bootstrap 5.3
- **資料庫**: Firebase Firestore
- **PWA**: vite-plugin-pwa

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 部署到 Vercel

### 方法 1: 使用 Vercel CLI

```bash
npm install -g vercel
vercel
```

### 方法 2: 透過 Git 部署

1. 將專案推送到 GitHub
2. 前往 [Vercel](https://vercel.com)
3. 點擊 "Import Project"
4. 選擇你的 GitHub repository
5. Vercel 會自動偵測 Vite 專案並配置

部署設定：
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Firebase 設定

首次使用需要設定 Firebase：

1. 建立 Firebase 專案
2. 啟用 Firestore Database
3. 複製專案設定碼
4. 開啟應用後貼上設定碼

## 授權

MIT License
