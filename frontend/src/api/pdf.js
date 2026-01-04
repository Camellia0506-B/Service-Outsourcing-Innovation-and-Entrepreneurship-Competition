// src/api/pdf.js
import http from './http'

export function uploadPdfAPI(formData) {
    return http.post('/pdf/upload', formData) // ✅ FormData，header 由 http.js 放行
}

export function chatPdfAPI({ session_id, question }) {
    return http.post('/pdf/chat', { session_id, question })
}

export function clearPdfSessionAPI(session_id) {
    return http.post('/pdf/clear', { session_id })
}
