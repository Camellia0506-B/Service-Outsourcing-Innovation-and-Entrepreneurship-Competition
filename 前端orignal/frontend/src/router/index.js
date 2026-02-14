import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/login.vue')
    },
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('../views/ResetPassword.vue')
    },
    {
        path: '/main',
        name: 'Main',
        component: () => import('@/views/main.vue'),
        children: [
            {
                // 默认子路由
                path: '',
                redirect: '/main/home'
            },
            {
                path: 'home',
                name: 'Home',
                component: () => import('@/views/home.vue')
            },
            {
                path: 'profile',
                name: 'Profile',
                component: () => import('@/views/Profile.vue')
            },
            {
                path: 'position',
                name: 'Position',
                component: () => import('@/views/Position.vue')
            },
            {
                path: 'ai',
                name: 'AI',
                component: () => import('@/views/AI.vue')
            },
            {
                path: 'school',
                name: 'School',
                component: () => import('@/views/School.vue')
            },
            {
                path: 'school/detail',
                name: 'SchoolDetail',
                component: () => import('@/views/SchoolDetail.vue'),
                props: true // 让 detail 组件能直接用 props 接到 id
            },
            {
                path: 'posts',
                name: 'Posts',
                component: () => import('@/views/Posts.vue')
            },
            {
                path: 'artical',
                name: 'Artical',
                component: () => import('@/views/Artical.vue')
            },
            {
                path: 'posts/detail/:id',
                name: 'Postdetail',
                component: () => import('@/views/PostDetail.vue'),
                props: true
            },
            {
                path: 'career-planning',
                name: 'CareerPlanning',
                component: () => import('@/views/CareerPlanning.vue')
            },
            {
                path: 'career-planning/assessment',
                name: 'CareerAssessment',
                component: () => import('@/views/career/Assessment.vue')
            },
            {
                path: 'career-planning/profile',
                name: 'CareerProfile',
                component: () => import('@/views/career/Profile.vue')
            },
            {
                path: 'career-planning/matching',
                name: 'CareerMatching',
                component: () => import('@/views/career/Matching.vue')
            }

            // 其他子路由可以继续在这里添加
        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
