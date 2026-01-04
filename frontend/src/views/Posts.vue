<template>
    <div class="posts-page">
        <!-- 顶部导航 -->
        <div class="header">
            <h1 class="title">热门讨论</h1>
            <div class="header-actions">
                <input
                    type="text"
                    class="search-input"
                    placeholder="搜索帖子标题/内容..."
                    v-model="searchKeyword"
                    @keyup.enter="onSearch"
                />
                <button class="btn-search" @click="onSearch">搜索</button>
                <button class="btn-new" @click="showNewPostDialog">
                    + 发布帖子
                </button>
            </div>
        </div>

        <!-- 帖子列表 -->
        <div class="posts-container">
            <div
                v-for="post in posts"
                :key="post.id"
                class="post-item"
                @click="viewPostDetail(post.id)"
            >
                <div class="post-main">
                    <h2 class="post-title">{{ post.title }}</h2>
                    <p class="post-preview" v-if="post.content">
                        {{ getContentPreview(post.content) }}
                    </p>
                    <div class="post-meta">
                        <span class="author">
                            {{
                                post.author_name ||
                                `用户${post.user_id || post.id}`
                            }}
                        </span>
                        <span class="meta-item">
                            <i class="icon-view">👁</i>
                            {{ post.view_count || 0 }}
                        </span>
                        <span class="meta-item">
                            <i class="icon-comment">💬</i>
                            {{ post.comment_count || 0 }} 回复
                        </span>
                    </div>
                </div>
                <div class="post-time">
                    {{ formatFullTime(post.created_at) }}
                </div>
            </div>

            <div v-if="posts.length === 0 && !loading" class="empty">
                <div class="empty-icon">📝</div>
                <p>暂无帖子</p>
                <button class="btn-new-empty" @click="showNewPostDialog">
                    发布第一个帖子
                </button>
            </div>

            <div v-if="loading" class="loading">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        </div>

        <!-- 发布对话框 -->
        <div v-if="showDialog" class="modal-overlay" @click="closeDialog">
            <div class="modal-box" @click.stop>
                <div class="modal-header">
                    <h3>发布新帖</h3>
                    <button class="btn-close" @click="closeDialog">×</button>
                </div>

                <div class="modal-body">
                    <div class="form-item">
                        <label>标题 <span class="required">*</span></label>
                        <input
                            v-model="newPost.title"
                            type="text"
                            placeholder="请输入帖子标题"
                            maxlength="100"
                        />
                        <div class="char-count">
                            {{ newPost.title.length }}/100
                        </div>
                    </div>

                    <div class="form-item">
                        <label>内容 <span class="required">*</span></label>
                        <textarea
                            v-model="newPost.content"
                            placeholder="分享你的想法..."
                            rows="8"
                            maxlength="5000"
                        ></textarea>
                        <div class="char-count">
                            {{ newPost.content.length }}/5000
                        </div>
                    </div>

                    <div class="form-item">
                        <label>关联学校（可选）</label>
                        <div
                            class="univ-selector"
                            @click="
                                ;(showUnivSelector = true),
                                    console.log(
                                        'open selector',
                                        showUnivSelector
                                    )
                            "
                        >
                            <input
                                type="text"
                                :value="selectedUnivName || ''"
                                placeholder="点击选择学校（不选则不关联）"
                                readonly
                            />
                            <!-- <span class="selector-icon">{{
                                selectedUnivName ? '✓' : '▼'
                            }}</span> -->
                        </div>
                        <!-- <div v-if="selectedUnivName" class="selected-tag">
                            {{ selectedUnivName }}
                            <span class="remove-tag" @click="clearSelectedUniv"
                                >×</span
                            >
                        </div> -->
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-cancel" @click="closeDialog">
                        取消
                    </button>
                    <button
                        class="btn-submit"
                        @click="submitPost"
                        :disabled="submitting || !isFormValid"
                    >
                        {{ submitting ? '发布中...' : '发布' }}
                    </button>
                </div>
            </div>
            <!-- 学校选择弹窗 -->
            <div
                v-if="showUnivSelector"
                class="univ-modal-overlay"
                @click="showUnivSelector = false"
            >
                <div class="univ-modal" @click.stop>
                    <div class="univ-modal-header">
                        <div class="univ-modal-title">选择学校</div>
                        <button
                            class="univ-modal-close"
                            @click="showUnivSelector = false"
                        >
                            ×
                        </button>
                    </div>

                    <div class="univ-modal-tools">
                        <input
                            class="univ-search"
                            v-model="univSearchKeyword"
                            placeholder="搜索学校名称..."
                        />
                        <select
                            class="univ-region"
                            v-model="univSelectedRegion"
                        >
                            <option value="">全部地区</option>
                            <option
                                v-for="r in availableRegions"
                                :key="r"
                                :value="r"
                            >
                                {{ r }}
                            </option>
                        </select>
                    </div>

                    <div class="univ-modal-list">
                        <div v-if="loadingUnivs" class="univ-loading">
                            加载学校中...
                        </div>

                        <div
                            v-else
                            v-for="u in filteredUnivsList"
                            :key="u.univ_id"
                            class="univ-item"
                            @click="selectUniv(u)"
                        >
                            <img
                                v-if="u.logo_url"
                                :src="u.logo_url"
                                class="univ-logo"
                            />
                            <div class="univ-name">{{ u.univ_name }}</div>
                        </div>

                        <div
                            v-if="
                                !loadingUnivs && filteredUnivsList.length === 0
                            "
                            class="univ-empty"
                        >
                            没有匹配的学校
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { newPostAPI } from '@/api/posts'
import { univPostsAPI, universitiesAPI } from '@/api/universities'

export default {
    name: 'Posts',

    data() {
        return {
            // ===== 列表相关 =====
            posts: [],
            loading: false,
            searchKeyword: '',
            univ_id: 0, // 0=全部（来自路由 query）

            // ===== 发布弹窗相关 =====
            showDialog: false,
            submitting: false,
            newPost: {
                title: '',
                content: '',
                univ_id: ''
            },

            // ===== 学校选择弹窗相关 =====
            showUnivSelector: false,
            allUnivs: [],
            selectedUnivName: '',
            loadingUnivs: false,
            univSearchKeyword: '',
            univSelectedRegion: ''
        }
    },

    computed: {
        isFormValid() {
            return this.newPost.title.trim() && this.newPost.content.trim()
        },

        // 提取所有地区
        availableRegions() {
            const regions = new Set()
            this.allUnivs.forEach(u => {
                const match = u.univ_name.match(
                    /^(上海|北京|天津|重庆|江苏|浙江|广东|四川|湖北|山东|陕西|辽宁|湖南|福建|河南|河北|安徽|黑龙江|吉林|云南|山西|江西|贵州|广西|甘肃|内蒙古|新疆|海南|宁夏|青海|西藏|香港|澳门|台湾)/
                )
                if (match) regions.add(match[1])
            })
            return Array.from(regions).sort()
        },

        // 过滤后的学校列表
        filteredUnivsList() {
            let list = this.allUnivs

            // 按地区筛选
            if (this.univSelectedRegion) {
                list = list.filter(u =>
                    u.univ_name.startsWith(this.univSelectedRegion)
                )
            }

            // 按关键词搜索
            if (this.univSearchKeyword.trim()) {
                const kw = this.univSearchKeyword.trim().toLowerCase()
                list = list.filter(u => u.univ_name.toLowerCase().includes(kw))
            }

            return list
        }
    },

    mounted() {
        const q = this.$route.query.univ_id
        if (q !== undefined) this.univ_id = Number(q) || 0

        this.loadPosts()
        this.loadUniversities()
    },

    methods: {
        // =========================
        // 1) 帖子列表
        // =========================
        async loadPosts() {
            this.loading = true
            try {
                const body = await univPostsAPI({
                    univ_id: this.univ_id === 0 ? '' : this.univ_id,
                    keyword: this.searchKeyword.trim()
                })

                // 后端：{ code:200, data:[...] }
                this.posts = Array.isArray(body?.data) ? body.data : []
            } catch (err) {
                console.error('[Posts] loadPosts failed:', err)
                this.$message?.error?.('加载帖子失败，请稍后重试')
            } finally {
                this.loading = false
            }
        },

        onSearch() {
            this.loadPosts()
        },

        // =========================
        // 2) 点击跳帖子详情（方案A）
        // 路由：/main/posts/detail/:id
        // =========================
        viewPostDetail(postId) {
            if (!postId) {
                this.$message?.error?.('帖子ID缺失')
                return
            }
            this.$router.push({
                name: 'Postdetail', // ⚠️ 和 router 里 name 完全一致
                params: { id: String(postId) }
            })
        },

        // =========================
        // 3) 学校列表（用于选择关联学校）
        // =========================
        async loadUniversities() {
            this.loadingUnivs = true
            try {
                const res = await universitiesAPI({ page: 1, size: 1000 })
                // 你之前的兼容：res.data.list -> {id,name,logo_url}
                if (res?.code === 200 && Array.isArray(res?.data?.list)) {
                    this.allUnivs = res.data.list.map(u => ({
                        univ_id: u.id,
                        univ_name: u.name,
                        logo_url: u.logo_url
                    }))
                } else {
                    // 如果后端直接返回数组，也兼容一下
                    const arr = Array.isArray(res?.data) ? res.data : []
                    if (arr.length) {
                        this.allUnivs = arr.map(u => ({
                            univ_id: u.id ?? u.univ_id,
                            univ_name: u.name ?? u.univ_name,
                            logo_url: u.logo_url
                        }))
                    }
                }
            } catch (e) {
                console.error('[Posts] loadUniversities failed:', e)
            } finally {
                this.loadingUnivs = false
            }
        },

        selectUniv(univ) {
            this.newPost.univ_id = univ.univ_id
            this.selectedUnivName = univ.univ_name
            this.showUnivSelector = false
            this.univSearchKeyword = ''
            this.univSelectedRegion = ''
        },

        clearSelectedUniv() {
            this.newPost.univ_id = ''
            this.selectedUnivName = ''
        },

        // =========================
        // 4) 发布帖子弹窗
        // =========================
        async showNewPostDialog() {
            const userId = localStorage.getItem('user_id')
            if (!userId) {
                alert('请先登录后再发布帖子')
                this.$router.push('/login')
                return
            }

            // 如果学校还没加载完，补拉一次
            if (!this.allUnivs.length && !this.loadingUnivs) {
                await this.loadUniversities()
            }

            this.showDialog = true
            this.resetForm()
        },

        closeDialog() {
            this.showDialog = false
            this.showUnivSelector = false
            this.resetForm()
        },

        resetForm() {
            this.newPost = {
                title: '',
                content: '',
                univ_id: this.univ_id > 0 ? this.univ_id : ''
            }
            this.selectedUnivName = ''

            // 如果当前页面是某个学校下的帖子，默认选中该校
            if (this.univ_id > 0) {
                const u = this.allUnivs.find(x => x.univ_id === this.univ_id)
                if (u) {
                    this.selectedUnivName = u.univ_name
                    this.newPost.univ_id = u.univ_id
                }
            }

            this.univSearchKeyword = ''
            this.univSelectedRegion = ''
        },

        async submitPost() {
            if (!this.newPost.title.trim()) return alert('请输入标题')
            if (!this.newPost.content.trim()) return alert('请输入内容')

            this.submitting = true
            try {
                const user_id = localStorage.getItem('user_id') || '1'

                const params = {
                    user_id,
                    title: this.newPost.title.trim(),
                    content: this.newPost.content.trim()
                }
                if (this.newPost.univ_id) {
                    params.univ_id = Number(this.newPost.univ_id)
                }

                await newPostAPI(params)

                alert('发布成功！')
                this.closeDialog()
                await this.loadPosts()
            } catch (err) {
                console.error('发布失败:', err)
                alert(err?.message || '发布失败，请稍后重试')
            } finally {
                this.submitting = false
            }
        },

        // =========================
        // 5) 工具函数
        // =========================
        getContentPreview(content) {
            if (!content) return ''
            return content.length > 100
                ? content.substring(0, 100) + '...'
                : content
        },

        formatFullTime(time) {
            if (!time) return ''
            const date = new Date(time)
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            const hh = String(date.getHours()).padStart(2, '0')
            const mm = String(date.getMinutes()).padStart(2, '0')
            const ss = String(date.getSeconds()).padStart(2, '0')
            return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
        }
    }
}
</script>

<style scoped>
.posts-page {
    min-height: 100vh;
    background: #f5f5f5;
    margin-top: 60px;
}

/* 顶部导航 */
.header {
    background: #fefefe;
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.search-input {
    padding: 10px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    width: 280px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.3s;
}

.search-input:focus {
    border-color: #1890ff;
}

.btn-search {
    padding: 10px 20px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.3s;
}

.btn-search:hover {
    background: #40a9ff;
}

.btn-new {
    padding: 10px 20px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.3s;
}

.btn-new:hover {
    background: #40a9ff;
}

/* 帖子容器 */
.posts-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 40px;
}

/* 帖子项 */
.post-item {
    background: white;
    padding: 24px 28px;
    margin-bottom: 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.post-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.post-main {
    flex: 1;
}

.post-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
}

.post-preview {
    font-size: 14px;
    color: #666;
    margin: 8px 0 12px 0;
    line-height: 1.5;
}

.post-meta {
    display: flex;
    gap: 20px;
    align-items: center;
    font-size: 14px;
    color: #999;
}

.author {
    color: #666;
    font-weight: 500;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.icon-view,
.icon-comment {
    font-style: normal;
}

.post-time {
    color: #999;
    font-size: 14px;
    white-space: nowrap;
    margin-left: 20px;
}

/* 空状态 */
.empty {
    text-align: center;
    padding: 80px 20px;
    color: #999;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty p {
    font-size: 16px;
    margin-bottom: 24px;
}

.btn-new-empty {
    padding: 12px 24px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.3s;
}

.btn-new-empty:hover {
    background: #40a9ff;
}

/* 加载状态 */
.loading {
    text-align: center;
    padding: 60px 20px;
    color: #999;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 16px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* 弹窗样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal-box {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: auto;
    animation: slideIn 0.3s;
}

@keyframes slideIn {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.btn-close {
    background: none;
    border: none;
    font-size: 28px;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    line-height: 1;
    transition: color 0.3s;
}

.btn-close:hover {
    color: #333;
}

.modal-body {
    padding: 24px;
}

.form-item {
    margin-bottom: 20px;
    position: relative;
}

.form-item label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
    font-weight: 500;
}

.required {
    color: #ff4d4f;
}

.form-item input,
.form-item textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    font-family: inherit;
    transition: border-color 0.3s;
}

.form-item input:focus,
.form-item textarea:focus {
    outline: none;
    border-color: #1890ff;
}

.form-item textarea {
    resize: vertical;
}

.char-count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    font-size: 12px;
    color: #999;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
}

.btn-cancel,
.btn-submit {
    padding: 8px 20px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    border: none;
    transition: all 0.3s;
}

.btn-cancel {
    background: #f5f5f5;
    color: #666;
}

.btn-cancel:hover {
    background: #e8e8e8;
}

.btn-submit {
    background: #1890ff;
    color: white;
}

.btn-submit:hover:not(:disabled) {
    background: #40a9ff;
}

.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.univ-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 1100; /* 比 modal-overlay(1000) 高 */
    display: flex;
    justify-content: center;
    align-items: center;
}

.univ-modal {
    width: 90%;
    max-width: 640px;
    max-height: 80vh;
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
}

.univ-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
}

.univ-modal-title {
    font-weight: 600;
    color: #333;
}
.univ-modal-close {
    border: none;
    background: transparent;
    font-size: 24px;
    cursor: pointer;
    color: #999;
}

.univ-modal-tools {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid #f6f6f6;
}

.univ-search {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    outline: none;
}
.univ-region {
    width: 140px;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    outline: none;
    background: #fff;
}

.univ-modal-list {
    padding: 8px 0;
    overflow: auto;
    max-height: calc(80vh - 120px);
}

.univ-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
}
.univ-item:hover {
    background: #f5f9ff;
}

.univ-logo {
    width: 26px;
    height: 26px;
    border-radius: 4px;
    object-fit: cover;
}
.univ-name {
    color: #333;
}

.univ-loading,
.univ-empty {
    padding: 18px 16px;
    color: #999;
}
</style>
