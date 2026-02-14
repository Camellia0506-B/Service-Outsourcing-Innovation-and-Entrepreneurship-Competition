// src/api/career.js - 符合 API 文档 7：职业规划报告模块 (Career Report)

import http from './http'

/** 7.1 生成职业规划报告 POST /career/generate-report */
export function generateReportAPI(user_id, options = {}) {
    return http.post('/career/generate-report', {
        user_id: Number(user_id),
        ...options
    })
}

/** 7.2 获取职业规划报告 POST /career/report，请求体 { user_id, report_id } */
export function getCareerReportAPI(user_id, report_id) {
    return http.post('/career/report', {
        user_id: Number(user_id),
        report_id
    })
}

/** 7.3 编辑职业规划报告 POST /career/edit-report */
export function editCareerReportAPI(payload) {
    return http.post('/career/edit-report', payload)
}

/** 7.4 AI优化报告 POST /career/ai-polish-report */
export function aiPolishReportAPI(report_id, polish_options = {}) {
    return http.post('/career/ai-polish-report', {
        report_id,
        polish_options
    })
}

/** 7.5 导出职业规划报告 POST /career/export-report，format: pdf|docx */
export function exportReportAPI(report_id, format = 'pdf', options = {}) {
    return http.post('/career/export-report', {
        report_id,
        format,
        ...options
    })
}

/** 7.6 获取报告完整性检查 POST /career/check-completeness */
export function checkReportCompletenessAPI(report_id) {
    return http.post('/career/check-completeness', { report_id })
}

/** 7.7 获取历史报告列表 POST /career/report-history */
export function getReportHistoryAPI(user_id, page = 1, size = 10) {
    return http.post('/career/report-history', {
        user_id: Number(user_id),
        page,
        size
    })
}
