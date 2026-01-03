// resources.js

import http from './http'

export function resourceListAPI(univ_id) {
    return http.post('/resources/list', { univ_id })
}

// multipart upload
export function resourceUploadAPI({ univ_id, user_id, file, file_name }) {
    const fd = new FormData()
    fd.append('univ_id', String(univ_id))
    fd.append('user_id', String(user_id))
    fd.append('file', file)
    fd.append('file_name', file_name)

    return http.post('/resources/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}
