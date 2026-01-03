// src/api/user.js
import http from './http'

export function userInfoAPI(user_id) {
    return http.post('/user/info', { user_id })
}

export function userPostsAPI(user_id) {
    return http.post('/user/posts', { user_id })
}

export function userResourcesAPI(user_id) {
    return http.post('/user/resources', { user_id })
}

// PUT + multipart/form-data（更新头像/昵称）
export function updateProfileAPI({ user_id, nickname, avatarFile }) {
    const fd = new FormData()
    fd.append('user_id', String(user_id))
    fd.append('nickname', nickname)
    if (avatarFile) fd.append('avatar', avatarFile)

    return http.put('/user/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}
