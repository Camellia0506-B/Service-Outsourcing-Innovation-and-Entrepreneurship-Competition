// src/api/profile.js - 符合 API 文档 2：个人档案模块 (Profile)

import http from './http'

/** 2.1 获取个人档案 POST /profile/info，请求体 { user_id } */
export function getProfileInfoAPI(user_id) {
    return http.post('/profile/info', { user_id: Number(user_id) })
}

/** 2.2 更新个人档案 POST /profile/update，请求体见文档 */
export function updateProfileAPI(payload) {
    return http.post('/profile/update', payload)
}

/** 2.3 上传简历 POST /profile/upload-resume，multipart: user_id, resume_file */
export function uploadResumeAPI(user_id, resumeFile) {
    const fd = new FormData()
    fd.append('user_id', Number(user_id))
    fd.append('resume_file', resumeFile)
    return http.post('/profile/upload-resume', fd)
}

/** 2.4 获取简历解析结果 POST /profile/resume-parse-result，请求体 { user_id, task_id } */
export function getResumeParseResultAPI(user_id, task_id) {
    return http.post('/profile/resume-parse-result', {
        user_id: Number(user_id),
        task_id
    })
}
