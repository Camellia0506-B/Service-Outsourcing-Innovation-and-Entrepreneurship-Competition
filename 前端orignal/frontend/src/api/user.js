// src/api/user.js - 兼容层：用 Profile 模块实现，符合 API 文档 2（个人档案）
// 获取用户信息 = 获取个人档案；更新资料 = 更新个人档案

import { getProfileInfoAPI, updateProfileAPI as profileUpdateAPI } from './profile'

/** 获取用户信息（映射自 profile/info，便于原有页面使用） */
export async function userInfoAPI(user_id) {
    const res = await getProfileInfoAPI(user_id)
    if (res.code !== 200 || !res.data) return res
    const d = res.data
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
    return {
        ...res,
        data: {
            user_info: {
                id: d.user_id,
                user_id: d.user_id,
                username: userInfo.username || '',
                nickname: d.basic_info?.nickname || '',
                avatar: d.basic_info?.avatar || ''
            },
            stats: {
                follow_count: 0,
                post_count: 0,
                resource_count: 0
            },
            profile_completeness: d.profile_completeness,
            basic_info: d.basic_info,
            education_info: d.education_info,
            skills: d.skills,
            certificates: d.certificates,
            internships: d.internships,
            projects: d.projects,
            awards: d.awards
        }
    }
}

/** 更新个人资料（符合 API 文档 2.2 profile/update，仅传 JSON；头像仅在注册时上传） */
export function updateProfileAPI(payload) {
    const { user_id, nickname, basic_info, education_info, skills, certificates } = payload
    const body = { user_id: Number(user_id) }
    if (basic_info) body.basic_info = basic_info
    else if (nickname !== undefined) body.basic_info = { nickname }
    if (education_info) body.education_info = education_info
    if (skills) body.skills = skills
    if (certificates) body.certificates = certificates
    return profileUpdateAPI(body)
}

/** 以下接口 API 文档中无对应项，保留空实现或后续对接 */
export function userPostsAPI(user_id) {
    return Promise.resolve({ code: 200, data: [] })
}

export function userResourcesAPI(user_id) {
    return Promise.resolve({ code: 200, data: [] })
}
