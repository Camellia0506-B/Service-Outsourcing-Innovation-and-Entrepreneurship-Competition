// src/api/student.js - 符合 API 文档 5：学生能力画像模块 (Student Profile)

import http from './http'

/** 5.1 获取学生能力画像 POST /student/ability-profile，请求体 { user_id } */
export function getAbilityProfileAPI(user_id) {
    return http.post('/student/ability-profile', { user_id: Number(user_id) })
}

/** 5.2 AI生成学生能力画像 POST /student/ai-generate-profile，请求体 { user_id, data_source?: 'profile'|'resume' } */
export function aiGenerateStudentProfileAPI(user_id, data_source = 'profile') {
    return http.post('/student/ai-generate-profile', {
        user_id: Number(user_id),
        data_source
    })
}

/** 5.3 更新能力画像 POST /student/update-profile，请求体 { user_id, updates } */
export function updateAbilityProfileAPI(payload) {
    return http.post('/student/update-profile', {
        ...payload,
        user_id: Number(payload.user_id)
    })
}
