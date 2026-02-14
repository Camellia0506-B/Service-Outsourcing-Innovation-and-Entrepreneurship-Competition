// src/api/matching.js - 符合 API 文档 6：人岗匹配模块 (Job Matching)

import http from './http'

/** 6.1 获取推荐岗位 POST /matching/recommend-jobs，请求体 { user_id, top_n?, filters? } */
export function getRecommendJobsAPI(user_id, top_n = 10, filters = {}) {
    return http.post('/matching/recommend-jobs', {
        user_id: Number(user_id),
        top_n,
        filters
    })
}

/** 6.2 获取单个岗位匹配分析 POST /matching/analyze，请求体 { user_id, job_id } */
export function getMatchingAnalyzeAPI(user_id, job_id) {
    return http.post('/matching/analyze', {
        user_id: Number(user_id),
        job_id
    })
}

/** 6.3 批量匹配分析 POST /matching/batch-analyze，请求体 { user_id, job_ids } */
export function batchAnalyzeAPI(user_id, job_ids) {
    return http.post('/matching/batch-analyze', {
        user_id: Number(user_id),
        job_ids
    })
}
