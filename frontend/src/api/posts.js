// src/api/posts.js

import http from './http'

export function postDetailAPI(post_id) {
    return http.post('/posts/detail', { post_id })
}

export function newPostAPI({ univ_id, user_id, title, content }) {
    const body = { user_id, title, content }
    if (univ_id !== undefined && univ_id !== null && univ_id !== '')
        body.univ_id = univ_id
    return http.post('/posts/new', body)
}

export function newCommentAPI({ post_id, user_id, content }) {
    return http.post('/posts/comments', { post_id, user_id, content })
}
