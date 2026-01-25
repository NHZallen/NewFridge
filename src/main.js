import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import './assets/styles/main.css'

// Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Initialize Vercel Analytics
inject()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
