// src/api/system.js - 符合 API 文档 8：系统管理模块 (System)，仅管理员

import http from './http'

/** 8.1 上传岗位数据 POST /system/upload-job-data，multipart: admin_id, data_file, data_source */
export function uploadJobDataAPI(admin_id, dataFile, data_source) {
    const fd = new FormData()
    fd.append('admin_id', Number(admin_id))
    fd.append('data_file', dataFile)
    fd.append('data_source', data_source)
    return http.post('/system/upload-job-data', fd)
}

/** 8.2 触发岗位画像生成 POST /system/generate-job-profiles */
export function generateJobProfilesAPI(admin_id, job_names, sample_size_per_job = 100) {
    return http.post('/system/generate-job-profiles', {
        admin_id: Number(admin_id),
        job_names,
        sample_size_per_job
    })
}

/** 8.3 获取系统统计数据 POST /system/statistics */
export function getSystemStatisticsAPI(admin_id, date_range = {}) {
    return http.post('/system/statistics', {
        admin_id: Number(admin_id),
        date_range
    })
}
