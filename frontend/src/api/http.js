// src/api/http.js
import axios from 'axios'

const http = axios.create({
    baseURL: '/api', // 走 vue proxy: /api -> /api/v1
    timeout: 15000
    // ✅ 不要在这里写死 Content-Type
})

// ✅ 请求拦截：FormData 放行；非 FormData 才设 JSON
http.interceptors.request.use(
    config => {
        const isFormData = config.data instanceof FormData

        if (isFormData) {
            // 让浏览器自动生成 multipart boundary
            if (config.headers) {
                delete config.headers['Content-Type']
                delete config.headers['content-type']
            }
        } else {
            config.headers = config.headers || {}
            // 只对普通 JSON 请求设置
            if (
                !config.headers['Content-Type'] &&
                !config.headers['content-type']
            ) {
                config.headers['Content-Type'] = 'application/json'
            }
        }

        return config
    },
    err => Promise.reject(err)
)

// ✅ 响应拦截：保留错误里的 response，别丢 status/data
http.interceptors.response.use(
    res => {
        const body = res.data

        // 非标准 {code,...} 直接原样返回
        if (!body || typeof body !== 'object' || !('code' in body)) return body

        if (body.code === 200) return body

        // ❗关键：把 response 挂回 error，方便你在页面里拿到 status/data
        const e = new Error(body.msg || '请求失败')
        e.response = res
        return Promise.reject(e)
    },
    err => Promise.reject(err)
)

export default http
