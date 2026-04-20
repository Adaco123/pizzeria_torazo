import './assets/main.css'
import './global.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

async function bootstrap() {
	const authStore = useAuthStore()
	await authStore.init()
	app.mount('#app')
}

bootstrap()
