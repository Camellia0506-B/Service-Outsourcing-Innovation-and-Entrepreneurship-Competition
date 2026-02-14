// src/api/auth.js - 符合 API 文档 1.1~1.3：Auth 模块

import http from './http'

/** 1.2 用户登录 POST /auth/login，请求体 JSON { username, password } */
export function loginAPI(payload) {
    return http.post('/auth/login', payload)
}

/** 1.1 用户注册 POST /auth/register，multipart/form-data：username, password, nickname, avatar(可选) */
export function registerAPI({ username, password, nickname, avatarFile }) {
    const fd = new FormData()
    fd.append('username', username)
    fd.append('password', password)
    fd.append('nickname', nickname)
    if (avatarFile) fd.append('avatar', avatarFile)
    return http.post('/auth/register', fd)
}

/** 1.3 退出登录 POST /auth/logout，请求体 JSON { user_id } */
export function logoutAPI(user_id) {
    return http.post('/auth/logout', { user_id: Number(user_id) })
}
