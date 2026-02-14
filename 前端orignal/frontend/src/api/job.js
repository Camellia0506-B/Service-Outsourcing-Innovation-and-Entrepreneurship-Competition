// src/api/job.js - 符合 API 文档 4：岗位画像模块 (Job Profile)

import http from './http'

/** 4.1 获取岗位画像列表 POST /job/profiles，请求体 { page, size?, keyword?, industry?, level? } */
export function getJobProfilesAPI(params) {
    return http.post('/job/profiles', params)
}

/** 4.2 获取岗位详细画像 POST /job/profile/detail，请求体 { job_id } */
export function getJobProfileDetailAPI(job_id) {
    return http.post('/job/profile/detail', { job_id })
}

/** 4.3 获取岗位关联图谱 POST /job/relation-graph，请求体 { job_id, graph_type?: 'vertical'|'transfer'|'all' } */
export function getJobRelationGraphAPI(job_id, graph_type = 'all') {
    return http.post('/job/relation-graph', { job_id, graph_type })
}

/** 4.4 AI生成岗位画像 POST /job/ai-generate-profile */
export function aiGenerateJobProfileAPI(payload) {
    return http.post('/job/ai-generate-profile', payload)
}

/** 4.5 获取AI生成结果 POST /job/ai-generate-result，请求体 { task_id } */
export function getAiGenerateJobResultAPI(task_id) {
    return http.post('/job/ai-generate-result', { task_id })
}
