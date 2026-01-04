<template>
    <div class="profile-container">
        <!-- 用户信息头部 -->
        <div class="profile-header">
            <div class="avatar-container">
                <img
                    :src="userInfo.avatar"
                    alt="User avatar"
                    class="avatar"
                    v-if="userInfo.avatar"
                    @error="handleImageError"
                />
                <div class="avatar-placeholder" v-else>
                    {{ getInitials(userInfo.nickname || userInfo.username) }}
                </div>
                <label class="avatar-edit-btn" @click="handleAvatarClick">
                    <input
                        type="file"
                        ref="avatarInput"
                        accept="image/*"
                        @change="handleAvatarChange"
                        style="display: none"
                    />
                    📷
                </label>
            </div>
            <div class="user-info">
                <h1 class="username">
                    {{ userInfo.nickname }}
                </h1>
                <div class="usn">@{{ userInfo.username }}</div>
                <div class="user-stats">
                    <div class="stat-item">
                        <span class="stat-value">{{ stats.follow_count }}</span>
                        <span class="stat-label">关注</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ stats.post_count }}</span>
                        <span class="stat-label">帖子</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{
                            stats.resource_count
                        }}</span>
                        <span class="stat-label">资料</span>
                    </div>
                </div>
                <button class="edit-profile-btn" @click="showEditModal = true">
                    编辑资料
                </button>
            </div>
        </div>

        <!-- 标签页切换 -->
        <div class="tabs">
            <button
                class="tab-btn"
                :class="{ active: activeTab === 'posts' }"
                @click="activeTab = 'posts'"
            >
                我的帖子
            </button>
            <button
                class="tab-btn"
                :class="{ active: activeTab === 'resources' }"
                @click="activeTab = 'resources'"
            >
                我的资料
            </button>
        </div>

        <!-- 内容区域 -->
        <div class="content-area">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading">加载中...</div>

            <!-- 我的帖子 -->
            <div v-else-if="activeTab === 'posts'" class="posts-list">
                <div v-if="posts.length === 0" class="empty-state">
                    暂无帖子
                </div>
                <div
                    v-else
                    v-for="post in posts"
                    :key="post.id"
                    class="post-card"
                    @click="goToPost(post.id)"
                >
                    <h3 class="post-title">{{ post.title }}</h3>
                    <p class="post-intro">{{ post.intro }}</p>
                    <div class="post-meta">
                        <span>👁 {{ post.view_count }} 浏览</span>
                        <span>💬 {{ post.reply_count }} 回复</span>
                        <span>📅 {{ post.created_at }}</span>
                    </div>
                </div>
            </div>

            <!-- 我的资料 -->
            <div v-else-if="activeTab === 'resources'" class="resources-list">
                <div v-if="resources.length === 0" class="empty-state">
                    暂无资料
                </div>
                <div
                    v-else
                    v-for="resource in resources"
                    :key="resource.id"
                    class="resource-card"
                >
                    <div class="resource-icon">📄</div>
                    <div class="resource-info">
                        <h4 class="resource-name">{{ resource.file_name }}</h4>
                        <div class="resource-meta">
                            <span>{{ resource.file_size }}</span>
                            <span>{{ resource.created_at }}</span>
                        </div>
                    </div>
                    <button
                        class="download-btn"
                        @click.stop="downloadResource(resource)"
                    >
                        下载
                    </button>
                </div>
            </div>
        </div>

        <!-- 退出登录按钮 -->
        <div class="logout-container">
            <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>

        <!-- 编辑资料弹窗 -->
        <div
            v-if="showEditModal"
            class="modal-overlay"
            @click.self="showEditModal = false"
        >
            <div class="modal-content">
                <h2>编辑资料</h2>
                <form @submit.prevent="handleUpdateProfile">
                    <div class="form-group">
                        <label>昵称</label>
                        <input
                            v-model="editForm.nickname"
                            type="text"
                            placeholder="请输入昵称"
                            required
                        />
                    </div>
                    <div class="form-actions">
                        <button
                            type="button"
                            @click="showEditModal = false"
                            class="cancel-btn"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            class="save-btn"
                            :disabled="updating"
                        >
                            {{ updating ? '保存中...' : '保存' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
    userInfoAPI,
    userPostsAPI,
    userResourcesAPI,
    updateProfileAPI
} from '@/api/user'

const router = useRouter()

// 数据状态
const userInfo = ref({
    id: null,
    username: '',
    nickname: '',
    avatar: ''
})

const stats = ref({
    follow_count: 0,
    post_count: 0,
    resource_count: 0
})

const posts = ref([])
const resources = ref([])
const activeTab = ref('posts')
const loading = ref(false)
const showEditModal = ref(false)
const updating = ref(false)

// 编辑表单
const editForm = ref({
    nickname: ''
})

// 头像相关
const avatarInput = ref(null)
const newAvatarFile = ref(null)

// 获取用户信息
const fetchUserInfo = async () => {
    try {
        const userId = localStorage.getItem('user_id') || 5001
        const res = await userInfoAPI(userId)

        if (res.code === 200) {
            userInfo.value = res.data.user_info
            stats.value = res.data.stats
            editForm.value.nickname = res.data.user_info.nickname
        }
    } catch (error) {
        console.error('获取用户信息失败:', error)
        alert('获取用户信息失败')
    }
}

// 获取帖子列表
const fetchPosts = async () => {
    loading.value = true
    try {
        const userId = localStorage.getItem('user_id') || 5001
        const res = await userPostsAPI(userId)

        if (res.code === 200) {
            posts.value = res.data
        }
    } catch (error) {
        console.error('获取帖子列表失败:', error)
    } finally {
        loading.value = false
    }
}

// 获取资料列表
const fetchResources = async () => {
    loading.value = true
    try {
        const userId = localStorage.getItem('user_id') || 5001
        const res = await userResourcesAPI(userId)

        if (res.code === 200) {
            resources.value = res.data
        }
    } catch (error) {
        console.error('获取资料列表失败:', error)
    } finally {
        loading.value = false
    }
}

// 头像相关处理
const handleAvatarClick = () => {
    avatarInput.value.click()
}

const handleAvatarChange = event => {
    const file = event.target.files[0]
    if (file) {
        newAvatarFile.value = file
        // 预览头像
        const reader = new FileReader()
        reader.onload = e => {
            userInfo.value.avatar = e.target.result
        }
        reader.readAsDataURL(file)
    }
}

const handleImageError = e => {
    e.target.style.display = 'none'
}

// 更新个人资料
const handleUpdateProfile = async () => {
    updating.value = true
    try {
        const userId = localStorage.getItem('user_id') || 5001
        const res = await updateProfileAPI({
            user_id: userId,
            nickname: editForm.value.nickname,
            avatarFile: newAvatarFile.value
        })

        if (res.code === 200) {
            alert('更新成功')
            showEditModal.value = false
            newAvatarFile.value = null
            await fetchUserInfo()
        }
    } catch (error) {
        console.error('更新失败:', error)
        alert('更新失败，请重试')
    } finally {
        updating.value = false
    }
}

// 获取用户名首字母
const getInitials = name => {
    if (!name) return '?'
    return name
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// 跳转到帖子详情
const goToPost = postId => {
    router.push(`/main/posts/detail/${postId}`)
}

// 下载资料
const downloadResource = resource => {
    if (!resource) return

    const url = (resource.file_url || resource.url || '').trim()
    if (!url) {
        alert('缺少文件地址 file_url，无法下载')
        console.log('resource=', resource)
        return
    }

    // 兼容后端返回 "/static/xxx" 这种相对路径
    if (/^https?:\/\//i.test(url)) {
        window.open(url, '_blank')
    } else {
        // 如果你 http.js 里有 baseURL，这里用它拼一下更稳
        // 不知道 baseURL 的情况下，用当前域名拼
        const fullUrl = `${window.location.origin}${
            url.startsWith('/') ? '' : '/'
        }${url}`
        window.open(fullUrl, '_blank')
    }
}

// 退出登录
const handleLogout = () => {
    if (!confirm('确定要退出登录吗？')) return
    localStorage.clear()
    router.push('/login')
}

// 监听标签切换
const handleTabChange = () => {
    if (activeTab.value === 'posts' && posts.value.length === 0) {
        fetchPosts()
    } else if (
        activeTab.value === 'resources' &&
        resources.value.length === 0
    ) {
        fetchResources()
    }
}

// 页面加载时获取数据
onMounted(async () => {
    await fetchUserInfo()
    await fetchPosts()
})

// 监听标签切换
import { watch } from 'vue'
watch(activeTab, handleTabChange)
</script>

<style scoped>
.usn {
    color: gray;
    font-size: 18px;
    margin-top: -15px;
    margin-bottom: 20px;
}

.profile-container {
    max-width: 800px;
    margin: 0 auto;
    margin-top: 60px;
    min-height: 100vh;
    padding: 2rem 1.5rem;
    background-color: var(--home-bg);
}

/* 用户信息头部 */
.profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.5rem 2rem;
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: var(--box-shadow);
    margin-bottom: 2rem;
}

.avatar-container {
    position: relative;
    margin-bottom: 1rem;
}

.avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--border-color);
}

.avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: bold;
}

.avatar-edit-btn {
    position: absolute;
    bottom: 0;
    right: -5px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--calendar-selected-bg);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: transform 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-edit-btn:hover {
    transform: scale(1.1);
}

.user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.username {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-weight: 600;
}

.user-stats {
    display: flex;
    gap: 3rem;
    margin-bottom: 1.5rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--time-display-color);
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.edit-profile-btn {
    padding: 0.6rem 2rem;
    background-color: var(--calendar-selected-bg);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: opacity 0.2s;
}

.edit-profile-btn:hover {
    opacity: 0.9;
}

/* 标签页 */
.tabs {
    display: flex;
    gap: 2rem;
    justify-content: center;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--border-color);
}

.tab-btn {
    padding: 0.75rem 2rem;
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
}

.tab-btn:hover {
    color: var(--text-secondary);
}

.tab-btn.active {
    color: var(--calendar-selected-bg);
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--calendar-selected-bg);
}

/* 内容区域 */
.content-area {
    min-height: 350px;
}

.loading {
    text-align: center;
    padding: 3rem;
    color: var(--text-tertiary);
}

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-tertiary);
    font-size: 1rem;
}

/* 帖子列表 */
.posts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.post-card {
    padding: 1.5rem;
    background-color: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s;
}

.post-card:hover {
    background-color: var(--button-hover);
    transform: translateY(-2px);
    box-shadow: var(--box-shadow);
}

.post-title {
    font-size: 1.3rem;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
}

.post-intro {
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
    line-height: 1.5;
}

.post-meta {
    display: flex;
    gap: 1.5rem;
    font-size: 0.9rem;
    color: var(--text-tertiary);
}

/* 资料列表 */
.resources-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.resource-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
}

.resource-card:hover {
    background-color: var(--button-hover);
}

.resource-icon {
    font-size: 2.5rem;
}

.resource-info {
    flex: 1;
}

.resource-name {
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.resource-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-tertiary);
}

.download-btn {
    padding: 0.5rem 1rem;
    background-color: var(--calendar-selected-bg);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: opacity 0.2s;
}

.download-btn:hover {
    opacity: 0.9;
}

/* 退出登录 */
.logout-container {
    margin-top: 3rem;
    padding-top: 2rem;
    display: flex;
    justify-content: center;
}

.logout-btn {
    padding: 0.75rem 3rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background-color: #ef4444;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.logout-btn:hover {
    background-color: #dc2626;
}

/* 编辑资料弹窗 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background-color: var(--card-bg);
    padding: 2rem;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content h2 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary);
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background-color: var(--home-bg);
    color: var(--text-primary);
    font-size: 1rem;
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.cancel-btn,
.save-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
}

.cancel-btn {
    background-color: var(--button-hover);
    color: var(--text-primary);
}

.save-btn {
    background-color: var(--calendar-selected-bg);
    color: white;
}

.save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cancel-btn:hover,
.save-btn:hover:not(:disabled) {
    opacity: 0.9;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .user-stats {
        gap: 2rem;
    }

    .tabs {
        justify-content: center;
    }
}
</style>
