// src/api/knowledge.js - 符合 API 文档 9：RAG知识库模块 (Knowledge Base)

import http from './http'

/** 9.1 上传知识文档 POST /knowledge/upload，multipart: user_id, doc_file, category, tags? */
export function uploadKnowledgeAPI(user_id, docFile, category, tags = '') {
    const fd = new FormData()
    fd.append('user_id', Number(user_id))
    fd.append('doc_file', docFile)
    fd.append('category', category)
    if (tags) fd.append('tags', tags)
    return http.post('/knowledge/upload', fd)
}

/** 9.2 查询知识库 POST /knowledge/search，请求体 { user_id, query, top_k?, category? } */
export function searchKnowledgeAPI(user_id, query, top_k = 5, category) {
    const body = { user_id: Number(user_id), query, top_k }
    if (category) body.category = category
    return http.post('/knowledge/search', body)
}

/** 9.3 获取知识库文档列表 POST /knowledge/list，请求体 { page, size?, category?, keyword? } */
export function getKnowledgeListAPI(params) {
    return http.post('/knowledge/list', params)
}
