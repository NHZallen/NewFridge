import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import './assets/styles/main.css'

// Initialize Vercel Analytics
inject()

const app = createApp(App)

// === Global Error Handling ===
const reportGlobalError = (source, error, meta = {}) => {
    const payload = {
        source,
        message: error?.message || String(error || 'Unknown error'),
        stack: error?.stack || null,
        meta,
        timestamp: Date.now()
    }

    // 統一輸出入口（之後可接 Sentry / Logging backend）
    console.error('[GlobalError]', payload)

    // 提供給 App 端可選擇監聽並顯示 UI 提示
    window.dispatchEvent(new CustomEvent('app-global-error', { detail: payload }))
}

app.config.errorHandler = (err, instance, info) => {
    reportGlobalError('vue', err, {
        info,
        componentName: instance?.type?.name || 'AnonymousComponent'
    })
}

window.addEventListener('error', (event) => {
    reportGlobalError('window', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    })
})

window.addEventListener('unhandledrejection', (event) => {
    reportGlobalError('promise', event.reason)
})

app.use(createPinia())
app.mount('#app')
