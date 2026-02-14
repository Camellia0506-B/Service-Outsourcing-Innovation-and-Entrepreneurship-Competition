// src/api/assessment.js - 符合 API 文档 3：职业测评模块 (Assessment)

import http from './http'

/** 3.1 获取测评问卷 POST /assessment/questionnaire，请求体 { user_id, assessment_type?: 'comprehensive'|'quick' } */
export function getQuestionnaireAPI(user_id, assessment_type = 'comprehensive') {
    return http.post('/assessment/questionnaire', {
        user_id: Number(user_id),
        assessment_type
    })
}

/** 3.2 提交测评答案 POST /assessment/submit，请求体 { user_id, assessment_id, answers, time_spent } */
export function submitAssessmentAPI(payload) {
    return http.post('/assessment/submit', {
        ...payload,
        user_id: Number(payload.user_id)
    })
}

/** 3.3 获取测评报告 POST /assessment/report，请求体 { user_id, report_id } */
export function getAssessmentReportAPI(user_id, report_id) {
    return http.post('/assessment/report', {
        user_id: Number(user_id),
        report_id
    })
}
