import axios from 'axios'

const pdfHttp = axios.create({
    baseURL: '/api',
    timeout: 120000 // ✅ chat 给 2 分钟
})

// 如果你其它接口用 http.js 的拦截器，这里也可以复制同样的 response 拦截逻辑
pdfHttp.interceptors.response.use(
    res => {
        const body = res.data
        if (!body || typeof body !== 'object' || !('code' in body)) return body
        if (body.code === 200) return body
        return Promise.reject(new Error(body.msg || '请求失败'))
    },
    err => Promise.reject(err)
)

export function uploadPdfAPI(formData) {
    return pdfHttp.post('/pdf/upload', formData)
}

export function chatPdfAPI({ session_id, question }) {
    return pdfHttp.post('/pdf/chat', { session_id, question })
}

export function clearPdfSessionAPI(session_id) {
    return pdfHttp.post('/pdf/clear', { session_id })
}
