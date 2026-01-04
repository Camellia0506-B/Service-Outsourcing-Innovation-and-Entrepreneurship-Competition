// src/api/auth.js

import http from './http'

// 登录：JSON
export function loginAPI(payload) {
    return http.post('/auth/login', payload)
}

// 注册：multipart/form-data（avatar 可选）
export function registerAPI({ username, password, nickname, avatarFile }) {
    const fd = new FormData()
    fd.append('username', username)
    fd.append('password', password)
    fd.append('nickname', nickname)
    if (avatarFile) fd.append('avatar', avatarFile)

    return http.post('/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}
