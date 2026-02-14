// src/api/planning.js - 符合 API 文档 3-7：职业测评、岗位画像、学生画像、人岗匹配、职业规划

import http from './http'

// 3. 职业测评模块 (Assessment)

/** 3.1 获取测评问卷 */
export function getQuestionnaireAPI(user_id, assessment_type = 'comprehensive') {
    return http.post('/assessment/questionnaire', {
        user_id: Number(user_id),
        assessment_type
    })
}

/** 3.2 提交测评答案 */
export function submitAssessmentAPI(payload) {
    return http.post('/assessment/submit', {
        ...payload,
        user_id: Number(payload.user_id)
    })
}

/** 3.3 获取测评报告 */
export function getAssessmentReportAPI(user_id, report_id) {
    return http.post('/assessment/report', {
        user_id: Number(user_id),
        report_id
    })
}

// 4. 岗位画像模块 (Job Profile)

/** 4.1 获取岗位画像列表 */
export function getJobProfilesAPI(params) {
    return http.post('/job/profiles', params)
}

/** 4.2 获取岗位详细画像 */
export function getJobProfileDetailAPI(job_id) {
    return http.post('/job/profile/detail', { job_id })
}

/** 4.3 获取岗位关联图谱 */
export function getJobRelationGraphAPI(job_id, graph_type = 'all') {
    return http.post('/job/relation-graph', { job_id, graph_type })
}

/** 4.4 AI生成岗位画像 */
export function aiGenerateJobProfileAPI(payload) {
    return http.post('/job/ai-generate-profile', payload)
}

/** 4.5 获取AI生成结果 */
export function getAiGenerateJobResultAPI(task_id) {
    return http.post('/job/ai-generate-result', { task_id })
}

// 5. 学生能力画像模块 (Student Profile)

/** 5.1 获取学生能力画像 */
export function getAbilityProfileAPI(user_id) {
    return http.post('/student/ability-profile', { user_id: Number(user_id) })
}

/** 5.2 AI生成学生能力画像 */
export function aiGenerateStudentProfileAPI(user_id, data_source = 'profile') {
    return http.post('/student/ai-generate-profile', {
        user_id: Number(user_id),
        data_source
    })
}

/** 5.3 更新能力画像 */
export function updateAbilityProfileAPI(payload) {
    return http.post('/student/update-profile', {
        ...payload,
        user_id: Number(payload.user_id)
    })
}

// 6. 人岗匹配模块 (Job Matching)

/** 6.1 获取推荐岗位 */
export function getRecommendJobsAPI(user_id, top_n = 10, filters = {}) {
    return http.post('/matching/recommend-jobs', {
        user_id: Number(user_id),
        top_n,
        filters
    })
}

/** 6.2 获取单个岗位匹配分析 */
export function getMatchingAnalyzeAPI(user_id, job_id) {
    return http.post('/matching/analyze', {
        user_id: Number(user_id),
        job_id
    })
}

/** 6.3 批量匹配分析 */
export function batchAnalyzeAPI(user_id, job_ids) {
    return http.post('/matching/batch-analyze', {
        user_id: Number(user_id),
        job_ids
    })
}

// 7. 职业规划报告模块 (Career Report)

/** 7.1 生成职业规划报告 */
export function generateReportAPI(user_id, options = {}) {
    return http.post('/career/generate-report', {
        user_id: Number(user_id),
        ...options
    })
}

/** 7.2 获取职业规划报告 */
export function getCareerReportAPI(user_id, report_id) {
    return http.post('/career/report', {
        user_id: Number(user_id),
        report_id
    })
}

/** 7.3 编辑职业规划报告 */
export function editCareerReportAPI(payload) {
    return http.post('/career/edit-report', payload)
}

/** 7.4 AI优化报告 */
export function aiPolishReportAPI(report_id, polish_options = {}) {
    return http.post('/career/ai-polish-report', {
        report_id,
        polish_options
    })
}

/** 7.5 导出职业规划报告 */
export function exportReportAPI(report_id, format = 'pdf', options = {}) {
    return http.post('/career/export-report', {
        report_id,
        format,
        ...options
    })
}

/** 7.6 获取报告完整性检查 */
export function checkReportCompletenessAPI(report_id) {
    return http.post('/career/check-completeness', { report_id })
}

/** 7.7 获取历史报告列表 */
export function getReportHistoryAPI(user_id, page = 1, size = 10) {
    return http.post('/career/report-history', {
        user_id: Number(user_id),
        page,
        size
    })
}

// 8. 院校库模块 (University)

/** 8.1 获取院校列表 */
export function universitiesAPI(params) {
    return http.post('/universities', params)
}

/** 8.2 获取院校通知 */
export function univNoticesAPI(params) {
    return http.post('/university/notices', params)
}

/** 8.3 获取院校动态 */
export function univPostsAPI(params) {
    return http.post('/university/posts', params)
}

// 9. RAG知识库模块 (Knowledge)

/** 9.1 知识库搜索 */
export function knowledgeSearchAPI(user_id, query, top_k = 5) {
    return http.post('/rag/search', {
        user_id: Number(user_id),
        query,
        top_k
    })
}