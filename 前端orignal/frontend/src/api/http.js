// src/api/http.js - 符合 API 文档 0.1~0.4：/api/v1、JSON、统一响应、Bearer 认证
import axios from 'axios'

const http = axios.create({
    baseURL: '/api', // vue proxy 将 /api 转发并重写为 /api/v1
    timeout: 30000
})

// 请求拦截：FormData 不设 Content-Type；非 FormData 设 application/json；带 Token
http.interceptors.request.use(
    config => {
        const isFormData = config.data instanceof FormData

        if (isFormData) {
            if (config.headers) {
                delete config.headers['Content-Type']
                delete config.headers['content-type']
            }
        } else {
            config.headers = config.headers || {}
            if (
                !config.headers['Content-Type'] &&
                !config.headers['content-type']
            ) {
                config.headers['Content-Type'] = 'application/json'
            }
        }

        // 符合 API 文档：带认证的请求使用 Authorization: Bearer ${token}
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
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

        // 符合API文档：200表示成功，其他为错误
        if (body.code === 200) return body

        // ❗关键：把 response 挂回 error，方便你在页面里拿到 status/data
        const e = new Error(body.msg || '请求失败')
        e.response = res
        return Promise.reject(e)
    },
    err => {
        // 处理网络错误和服务器错误
        if (err.response) {
            const status = err.response.status
            let message = '请求失败'
            
            // 根据API文档错误码说明
            switch (status) {
                case 400:
                    message = '客户端参数错误'
                    break
                case 401:
                    message = '未授权或Token失效，请重新登录'
                    // 清除本地token并跳转到登录页
                    localStorage.removeItem('token')
                    localStorage.removeItem('user_id')
                    localStorage.removeItem('user_info')
                    window.location.href = '/login'
                    break
                case 403:
                    message = '无权限访问'
                    break
                case 404:
                    message = '资源不存在'
                    break
                case 500:
                    message = '服务器内部错误，请稍后重试'
                    break
                default:
                    message = `请求失败 (${status})`
            }
            
            err.message = message
        } else if (err.request) {
            err.message = '网络连接失败，请检查网络'
        }
        
        return Promise.reject(err)
    }
)

export default http
