import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Calendar from 'primevue/calendar'
import axios from 'axios'

const app = createApp(App)

app.config.globalProperties.$message = ElMessage

app.config.warnHandler = (msg, instance, trace) => {
    if (
        typeof msg === 'string' &&
        (msg.includes('made a reactive object') ||
            msg.includes('markRaw') ||
            msg.includes('shallowRef instead of `ref`'))
    ) {
        return
    }
    console.warn(msg + trace)
}

app.use(ElementPlus)
    .use(PrimeVue, { ripple: true })
    .component('Calendar', Calendar)
    .use(router)
    .mount('#app')

// axios 不应该 app.use(axios)，一般做成全局属性
app.config.globalProperties.$axios = axios

window.addEventListener(
    'error',
    e => {
        if (
            String(e.message || '')
                .toLowerCase()
                .includes('resizeobserver')
        ) {
            e.preventDefault()
        }
    },
    { capture: true }
)
