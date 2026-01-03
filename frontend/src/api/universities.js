// src/spi/universities.js
import http from './http'

// 2.1 高校列表（tags 逗号字符串）
export function universitiesAPI({
    page = 1,
    size = 10,
    keyword = '',
    tags = ''
}) {
    return http.post('/universities', { page, size, keyword, tags })
}

// 3.1 通知列表
export function univNoticesAPI(univ_id) {
    return http.post('/universities/notices', { univ_id })
}

// 3.2 高校详情
export function univInfoAPI(univ_id) {
    return http.post('/universities/info', { univ_id })
}

// 4.1 帖子列表（univ_id 可不传/为空）
export function univPostsAPI({ univ_id, keyword = '' } = {}) {
    const body = { keyword }
    if (univ_id !== undefined && univ_id !== null && univ_id !== '')
        body.univ_id = univ_id
    return http.post('/universities/posts', body)
}
