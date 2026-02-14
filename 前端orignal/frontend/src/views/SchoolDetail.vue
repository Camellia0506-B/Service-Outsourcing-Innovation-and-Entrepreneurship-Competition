<template>
    <div class="school-detail">
        <!-- 返回按钮 -->
        <div class="back-btn" @click="goBack">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                    d="M19 12H5M5 12L12 19M5 12L12 5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
            <span>返回院校列表</span>
        </div>

        <!-- 顶部加载/错误提示 -->
        <div v-if="isLoading" style="padding: 10px; color: #666">加载中...</div>
        <div v-if="errorMsg" style="padding: 10px; color: #e11d48">
            {{ errorMsg }}
        </div>

        <!-- 学校信息卡片 -->
        <div class="school-info-card">
            <div class="school-avatar-large">
                <img
                    v-if="school?.logo_url"
                    :src="school.logo_url"
                    :alt="school?.name || 'logo'"
                    class="school-logo-large"
                    @error="school.logo_url = ''"
                />
                <span v-else>
                    {{ (school?.name || '院').slice(0, 1) }}
                </span>
            </div>

            <div class="school-main-info">
                <h1 class="school-name">
                    {{ school?.name || '加载中...' }}
                </h1>

                <div class="school-tags">
                    <span
                        class="tag"
                        v-for="t in school?.tags || []"
                        :key="t"
                        >{{ t }}</span
                    >
                    <span
                        class="tag"
                        v-if="!school?.tags || school.tags.length === 0"
                        >暂无标签</span
                    >
                </div>

                <p class="school-description">
                    {{ school?.intro || '暂无简介/正在加载...' }}
                </p>
            </div>
        </div>

        <!-- 标签页导航 -->
        <div class="tabs-container">
            <div class="tabs-nav">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    :class="['tab-btn', { active: activeTab === tab.id }]"
                    @click="activeTab = tab.id"
                >
                    {{ tab.name }}
                </button>
            </div>

            <!-- 标签页内容 -->
            <div class="tab-content">
                <!-- 招生通知 -->
                <div v-if="activeTab === 'notice'" class="notice-content">
                    <div class="filter-row">
                        <select class="filter-select" v-model="filters.college">
                            <option value="">所有学院</option>
                            <!-- 动态学院列表（从 notices 里抽取） -->
                            <option
                                v-for="dept in deptOptions"
                                :key="dept"
                                :value="dept"
                            >
                                {{ dept }}
                            </option>
                        </select>

                        <!-- 这两个目前后端没字段，先保留 UI 不做真实筛选 -->
                        <select class="filter-select" v-model="filters.type">
                            <option value="">所有类型</option>
                            <option value="summer">夏令营</option>
                            <option value="recommend">预推免</option>
                        </select>
                        <select class="filter-select" v-model="filters.status">
                            <option value="">所有形式</option>
                            <option value="online">线上</option>
                            <option value="offline">线下</option>
                        </select>
                    </div>

                    <div class="notice-list">
                        <div
                            v-for="notice in filteredNotices"
                            :key="notice.id"
                            class="notice-item"
                            role="button"
                            tabindex="0"
                            @click="openNoticeDetail(notice)"
                            @keydown.enter="openNoticeDetail(notice)"
                        >
                            <div class="notice-header">
                                <span
                                    class="notice-tag"
                                    :style="{ background: notice.tagColor }"
                                >
                                    {{ notice.tag }}
                                </span>
                                <h3 class="notice-title">{{ notice.title }}</h3>
                            </div>

                            <div class="notice-meta">
                                <span class="meta-item">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    {{ notice.dept_name || '通知' }}
                                </span>
                                <span class="meta-item">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        />
                                        <path
                                            d="M12 6v6l4 2"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                        />
                                    </svg>
                                    截止: {{ notice.deadline }}
                                </span>
                            </div>

                            <div class="notice-actions">
                                <span :class="['status-badge', notice.status]">
                                    {{
                                        notice.status === 'ongoing'
                                            ? '进行中'
                                            : '已结束'
                                    }}
                                </span>

                                <!-- 按钮仍然保留，但阻止冒泡，避免触发两次 -->
                                <button
                                    class="detail-btn"
                                    @click.stop="openNoticeDetail(notice)"
                                >
                                    查看详情
                                </button>
                            </div>
                        </div>

                        <div
                            v-if="!isLoading && filteredNotices.length === 0"
                            style="padding: 12px; color: #999"
                        >
                            暂无通知
                        </div>
                    </div>
                </div>

                <!-- 经验社区 -->
                <div v-if="activeTab === 'community'" class="community-content">
                    <div class="community-header">
                        <h2 class="section-title">热门讨论</h2>

                        <div
                            style="display: flex; gap: 8px; align-items: center"
                        >
                            <input
                                v-model="postKeyword"
                                placeholder="搜索帖子标题/内容..."
                                style="
                                    padding: 8px 10px;
                                    border: 1px solid #eee;
                                    border-radius: 10px;
                                    outline: none;
                                "
                            />
                            <button
                                class="post-btn"
                                style="padding: 8px 12px"
                                @click="fetchPosts"
                            >
                                搜索
                            </button>

                            <!-- <button class="post-btn" @click="openNewPost">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M12 5v14m-7-7h14"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                    />
                                </svg>
                                发布帖子
                            </button> -->
                        </div>
                    </div>

                    <div
                        style="padding: 10px; color: #666"
                        v-if="isPostsLoading"
                    >
                        帖子加载中...
                    </div>

                    <div class="post-list">
                        <div
                            v-for="post in posts"
                            :key="post.id"
                            class="post-item"
                            @click="goPostDetail(post.id)"
                            style="cursor: pointer"
                        >
                            <h3 class="post-title">{{ post.title }}</h3>
                            <p class="post-preview">{{ post.preview }}</p>
                            <div class="post-meta">
                                <span class="post-author">{{
                                    post.author
                                }}</span>
                                <span class="post-stats">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        />
                                        <path
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        />
                                    </svg>
                                    {{ post.views }}
                                </span>
                                <span class="post-stats">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    {{ post.replies }} 回复
                                </span>
                                <span class="post-time">{{ post.time }}</span>
                            </div>
                        </div>

                        <div
                            v-if="!isPostsLoading && posts.length === 0"
                            style="padding: 12px; color: #999"
                        >
                            暂无帖子
                        </div>
                    </div>
                </div>

                <!-- 资料共享 -->
                <div v-if="activeTab === 'resources'" class="resources-content">
                    <div class="resources-header">
                        <h2 class="section-title">资料列表</h2>

                        <!-- 这里只做列表+下载；上传需要 file input & multipart，我可以下一步给你补 -->
                        <button class="upload-btn" @click="triggerUpload">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            上传资料
                        </button>

                        <!-- 隐藏 input（你要上传功能再接 resourcesUploadAPI） -->
                        <input
                            ref="fileInput"
                            type="file"
                            style="display: none"
                            @change="onPickFile"
                        />
                    </div>

                    <div
                        style="padding: 10px; color: #666"
                        v-if="isFilesLoading"
                    >
                        资料加载中...
                    </div>

                    <div class="resources-grid">
                        <div
                            v-for="file in files"
                            :key="file.id"
                            class="file-card"
                        >
                            <div class="file-icon" :class="file.type">
                                <svg
                                    v-if="file.type === 'pdf'"
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M7 18h10M9.5 6h5M9.5 6a2 2 0 11-4 0 2 2 0 014 0zm0 0V18m5.5-12a2 2 0 114 0 2 2 0 01-4 0zm0 0V18"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <svg
                                    v-else
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </div>
                            <div class="file-info">
                                <h4 class="file-name">{{ file.name }}</h4>
                                <p class="file-meta">
                                    大小: {{ file.size }} • 上传者:
                                    {{ file.uploader }}
                                </p>
                                <p class="file-meta" style="color: #999">
                                    上传时间: {{ file.upload_time || '-' }}
                                </p>
                            </div>
                            <button
                                class="download-btn"
                                @click="downloadFile(file)"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div
                            v-if="!isFilesLoading && files.length === 0"
                            style="padding: 12px; color: #999"
                        >
                            暂无资料
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { univInfoAPI, univNoticesAPI, univPostsAPI } from '@/api/universities'
import { resourceListAPI, resourceUploadAPI } from '@/api/resources'
import { postDetailAPI, newPostAPI, newCommentAPI } from '@/api/posts'

export default {
    name: 'SchoolDetail',
    data() {
        return {
            activeTab: 'notice',
            tabs: [
                { id: 'notice', name: '招生通知' },
                { id: 'community', name: '经验社区' },
                { id: 'resources', name: '资料共享' }
            ],

            isLoading: false,
            errorMsg: '',

            univId: null,

            // ✅ 从登录信息里拿（不要写死 5001）
            userId: null,

            school: { id: null, name: '', logo_url: '', tags: [], intro: '' },

            filters: { college: '', type: '', status: '' },
            notices: [],

            postKeyword: '',
            posts: [],
            isPostsLoading: false,

            // ✅ 不再用弹窗详情（改为跳转）
            showPostModal: false,
            postDetail: null,
            isPostDetailLoading: false,
            commentInput: '',

            showNewPostModal: false,
            newPostForm: { title: '', content: '' },

            files: [],
            isFilesLoading: false
        }
    },

    computed: {
        deptOptions() {
            const set = new Set()
            ;(this.notices || []).forEach(
                n => n?.dept_name && set.add(n.dept_name)
            )
            return Array.from(set)
        },
        filteredNotices() {
            let list = this.notices || []
            if (this.filters.college) {
                list = list.filter(
                    n => (n.dept_name || '') === this.filters.college
                )
            }
            return list
        }
    },

    async mounted() {
        this.resolveUnivId()
        this.resolveUserId()

        if (!this.userId) {
            this.errorMsg = '未登录或登录信息缺失：请先登录以获取 user_id'
            // 你也可以选择直接跳转登录
            // this.$router.push('/login')
            return
        }

        if (!this.univId || Number.isNaN(this.univId)) {
            this.errorMsg =
                '缺少 univ_id：请检查 School.vue 跳转是否传入 params.id 或 query.univ_id，以及路由是否支持 /school/detail/:id'
            return
        }

        await this.refreshAll()
    },

    methods: {
        // ✅ 从 localStorage 读取 user_id（登录接口是唯一合法来源）
        resolveUserId() {
            const v = localStorage.getItem('user_id')
            const id = v ? Number(v) : null
            this.userId = Number.isFinite(id) && id > 0 ? id : null
        },

        resolveUnivId() {
            const raw =
                this.$route?.params?.univ_id ??
                this.$route?.params?.id ??
                this.$route?.query?.univ_id ??
                this.$route?.query?.id

            this.univId =
                raw !== undefined && raw !== null && raw !== ''
                    ? Number(raw)
                    : null
        },

        unwrap(res) {
            return res?.data ?? res
        },

        isOk(payload) {
            if (payload == null) return false
            if (Array.isArray(payload)) return true
            if (typeof payload === 'object' && !('code' in payload)) return true
            return payload.code === 200
        },

        // ✅ 页面返回按钮：优先回退，否则回院校列表（你的路由是 /main/school）
        goBack() {
            if (window.history.length > 1) this.$router.back()
            else this.$router.push('/main/school')
        },

        async refreshAll() {
            this.isLoading = true
            this.errorMsg = ''
            try {
                await this.fetchSchoolInfo()
                await this.fetchNotices()
                await this.fetchPosts()
                await this.fetchResources()
            } catch (e) {
                console.error('[SchoolDetail] refreshAll error:', e)
                this.errorMsg =
                    '请求失败：请检查后端是否启动、baseURL/代理、跨域、接口路径是否一致'
            } finally {
                this.isLoading = false
            }
        },

        async fetchSchoolInfo() {
            const res = await univInfoAPI(this.univId)
            const payload = this.unwrap(res)

            if (!this.isOk(payload)) return

            const info = payload?.data ?? payload
            this.school = {
                id: info.id ?? this.univId,
                name: info.name ?? '',
                logo_url: info.logo_url ?? '',
                tags: Array.isArray(info.tags)
                    ? info.tags
                    : typeof info.tags === 'string'
                    ? info.tags
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                    : [],
                intro: info.intro ?? info.description ?? info.brief ?? ''
            }
        },

        async fetchNotices() {
            const res = await univNoticesAPI(this.univId)
            const payload = this.unwrap(res)

            const raw = Array.isArray(payload)
                ? payload
                : payload?.data ?? payload?.notices ?? []
            const list = Array.isArray(raw) ? raw : []

            this.notices = list.map(x => ({
                id: x.id,
                dept_name: x.dept_name,
                tag: x.dept_name,
                tagColor: '#E0E7FF',
                title: x.title,
                deadline: x.end_date,
                source_link: x.source_link,
                status: this.calcNoticeStatus(x.end_date)
            }))
        },

        calcNoticeStatus(endDateStr) {
            if (!endDateStr) return 'ended'
            const end = new Date(endDateStr + ' 23:59:59')
            return new Date() <= end ? 'ongoing' : 'ended'
        },

        // ✅ 保留一个版本，删掉你原来的重复 openNoticeDetail
        openNoticeDetail(notice) {
            let url = (notice?.source_link || '').trim()
            if (!url) return
            if (url.startsWith('//')) url = 'https:' + url
            if (/^https?:$/i.test(url)) return
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url
            try {
                // eslint-disable-next-line no-new
                new URL(url)
                window.open(url, '_blank')
            } catch (e) {
                console.warn('[SchoolDetail] invalid URL:', url, notice, e)
            }
        },

        async fetchPosts() {
            this.isPostsLoading = true
            try {
                const res = await univPostsAPI({
                    univ_id: this.univId,
                    keyword: this.postKeyword
                })
                const payload = this.unwrap(res)

                if (!this.isOk(payload)) {
                    this.posts = []
                    return
                }

                const list = Array.isArray(payload)
                    ? payload
                    : payload?.data ?? []
                this.posts = (Array.isArray(list) ? list : []).map(p => ({
                    id: p.id,
                    title: p.title,
                    preview:
                        (p.content || '').slice(0, 60) +
                        ((p.content || '').length > 60 ? '...' : ''),
                    author: p.author_nickname,
                    views: p.view_count,
                    replies: p.reply_count,
                    time: p.created_at
                }))
            } finally {
                this.isPostsLoading = false
            }
        },

        // ✅ 经验社区：点击跳转到帖子详情页（方案 A）
        goPostDetail(postId) {
            if (!postId) return
            this.$router.push({
                name: 'Postdetail',
                params: { id: String(postId) }
            })
        },

        // ✅ 如果你模板里还在用 openPostDetail(post.id)，这里做个兼容：直接跳转
        openPostDetail(postId) {
            this.goPostDetail(postId)
        },

        async fetchResources() {
            this.isFilesLoading = true
            try {
                const res = await resourceListAPI(this.univId)
                const payload = this.unwrap(res)

                if (!this.isOk(payload)) {
                    this.files = []
                    return
                }

                const list = Array.isArray(payload)
                    ? payload
                    : payload?.data ?? []
                this.files = (Array.isArray(list) ? list : []).map((f, idx) => {
                    const ext = (f.file_name || '')
                        .split('.')
                        .pop()
                        ?.toLowerCase()
                    return {
                        id: f.id ?? `${idx}-${f.file_name}`,
                        name: f.file_name,
                        size: f.file_size ?? '-',
                        uploader: f.user_name ?? f.user_id ?? '-',
                        type: ext === 'pdf' ? 'pdf' : 'doc',
                        file_url: f.file_url,
                        upload_time: f.created_at ?? f.upload_time ?? '-'
                    }
                })
            } finally {
                this.isFilesLoading = false
            }
        },

        openNewPost() {
            this.showNewPostModal = true
            this.newPostForm = { title: '', content: '' }
        },

        async submitNewPost() {
            const title = this.newPostForm.title.trim()
            const content = this.newPostForm.content.trim()
            if (!title || !content) return

            try {
                await newPostAPI({
                    univ_id: this.univId,
                    user_id: this.userId,
                    title,
                    content
                })
                this.showNewPostModal = false
                await this.fetchPosts()
            } catch (e) {
                console.error('[SchoolDetail] newPost failed:', e)
                this.$message?.error?.(e?.message || '发布失败')
            }
        },

        // ⚠️ 由于我们改成“跳转详情页评论”，这里保留但一般用不到
        async submitComment() {
            const content = this.commentInput.trim()
            const postId = this.postDetail?.post?.id
            if (!content || !postId) return

            try {
                await newCommentAPI({
                    post_id: postId,
                    user_id: this.userId,
                    content
                })
                this.commentInput = ''
                // 重新拉取弹窗详情（如果你还保留弹窗）
                await this.openPostDetail(postId)
            } catch (e) {
                console.error('[SchoolDetail] comment failed:', e)
                this.$message?.error?.(e?.message || '评论失败')
            }
        },

        downloadFile(file) {
            if (!file?.file_url) return
            window.open(file.file_url, '_blank')
        },

        triggerUpload() {
            this.$refs.fileInput?.click()
        },

        async onPickFile(e) {
            const file = e?.target?.files?.[0]
            e.target.value = ''
            if (!file) return

            if (!this.userId) {
                this.$message?.error?.('未登录，无法上传')
                return
            }

            try {
                this.isFilesLoading = true
                await resourceUploadAPI({
                    univ_id: this.univId,
                    user_id: this.userId,
                    file,
                    file_name: file.name
                })
                await this.fetchResources()
            } catch (err) {
                console.error('[SchoolDetail] upload failed:', err)
                this.errorMsg =
                    err?.response?.data?.message || err?.message || '上传失败'
            } finally {
                this.isFilesLoading = false
            }
        }
    }
}
</script>

<style scoped>
.notice-item {
    cursor: pointer;
}

.notice-item:active {
    transform: translateY(1px);
}
.school-detail {
    padding: 24px 40px;
    background: var(--home-bg, #f3f4f6);
    min-height: 100vh;
    margin-top: 60px;
}

.back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary, #6b7280);
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 24px;
    transition: color 0.2s;
}

.back-btn:hover {
    color: var(--text-primary, #1f2937);
}

.school-info-card {
    background: var(--card-bg, white);
    border-radius: 12px;
    padding: 32px;
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    box-shadow: var(--box-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.school-avatar-large {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
}

.school-logo-large {
    width: 100%;
    height: 100%;
    object-fit: contain; /* 校徽一般用 contain */
    border-radius: 12px;
}

.school-main-info {
    flex: 1;
}

.school-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary, #1f2937);
    margin: 0 0 12px 0;
}

.school-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.tag {
    padding: 4px 12px;
    background: #eff6ff;
    color: #3b82f6;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
}

.school-description {
    font-size: 15px;
    color: var(--text-secondary, #6b7280);
    margin: 0;
    line-height: 1.6;
}

.tabs-container {
    background: var(--card-bg, white);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--box-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.tabs-nav {
    display: flex;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    padding: 0 32px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.tabs-nav::-webkit-scrollbar {
    display: none;
}

.tab-btn {
    padding: 16px 24px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary, #6b7280);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    bottom: -1px;
}

.tab-btn:hover {
    color: #3b82f6;
}

.tab-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
}

.tab-content {
    padding: 32px;
}

/* 招生通知样式 */
.filter-row {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}

.filter-select {
    padding: 8px 16px;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 6px;
    background: var(--card-bg, white);
    color: var(--text-primary, #1f2937);
    font-size: 14px;
    cursor: pointer;
    outline: none;
}

.notice-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.notice-item {
    padding: 20px;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    transition: all 0.2s;
}

.notice-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.notice-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.notice-tag {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #3b82f6;
}

.notice-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0;
    flex: 1;
}

.notice-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary, #6b7280);
}

.notice-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.ongoing {
    background: #d1fae5;
    color: #059669;
}

.detail-btn {
    padding: 6px 16px;
    background: transparent;
    border: 1px solid #3b82f6;
    color: #3b82f6;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.detail-btn:hover {
    background: #3b82f6;
    color: white;
}

/* 经验社区样式 */
.community-header,
.resources-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0;
}

.post-btn,
.upload-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.post-btn:hover,
.upload-btn:hover {
    background: #2563eb;
}

.post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.post-item {
    padding: 20px;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.post-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.post-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 8px 0;
}

.post-preview {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    margin: 0 0 12px 0;
    line-height: 1.5;
}

.post-meta {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 13px;
    color: var(--text-tertiary, #9ca3af);
}

.post-author {
    font-weight: 500;
}

.post-stats {
    display: flex;
    align-items: center;
    gap: 4px;
}

.post-time {
    margin-left: auto;
}

/* 资料共享样式 */
.resources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
}

.file-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    transition: all 0.2s;
}

.file-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.file-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    flex-shrink: 0;
}

.file-icon.pdf {
    background: #fee2e2;
    color: #dc2626;
}

.file-icon.doc {
    background: #dbeafe;
    color: #2563eb;
}

.file-info {
    flex: 1;
    min-width: 0;
}

.file-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-meta {
    font-size: 13px;
    color: var(--text-tertiary, #9ca3af);
    margin: 0;
}

.download-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--home-bg, #f3f4f6);
    border: none;
    border-radius: 6px;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.2s;
}

.download-btn:hover {
    background: #3b82f6;
    color: white;
}

@media (max-width: 768px) {
    .school-detail {
        padding: 16px;
    }

    .back-btn {
        font-size: 13px;
    }

    .school-info-card {
        padding: 20px;
        gap: 16px;
    }

    .school-avatar-large {
        width: 80px;
        height: 80px;
        font-size: 36px;
    }

    .school-name {
        font-size: 22px;
    }

    .school-tags {
        flex-wrap: wrap;
    }

    .school-description {
        font-size: 14px;
    }

    .tabs-nav {
        padding: 0 16px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .tab-btn {
        padding: 14px 16px;
        font-size: 14px;
        white-space: nowrap;
    }

    .tab-content {
        padding: 20px 16px;
    }

    .filter-row {
        flex-direction: column;
    }

    .filter-select {
        width: 100%;
    }

    .notice-item {
        padding: 16px;
    }

    .notice-header {
        flex-wrap: wrap;
    }

    .notice-title {
        font-size: 15px;
        width: 100%;
        margin-top: 8px;
    }

    .notice-meta {
        flex-wrap: wrap;
        gap: 12px;
    }

    .meta-item {
        font-size: 12px;
    }

    .notice-actions {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .detail-btn {
        width: 100%;
        justify-content: center;
    }

    .community-header,
    .resources-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }

    .post-btn,
    .upload-btn {
        width: 100%;
        justify-content: center;
    }

    .section-title {
        font-size: 18px;
    }

    .post-item {
        padding: 16px;
    }

    .post-title {
        font-size: 15px;
    }

    .post-preview {
        font-size: 13px;
    }

    .post-meta {
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
    }

    .post-time {
        margin-left: 0;
        width: 100%;
    }

    .resources-grid {
        grid-template-columns: 1fr;
    }

    .file-card {
        padding: 16px;
    }

    .file-icon {
        width: 48px;
        height: 48px;
    }

    .file-icon svg {
        width: 28px;
        height: 28px;
    }

    .file-name {
        font-size: 14px;
    }

    .file-meta {
        font-size: 12px;
    }

    .download-btn {
        width: 36px;
        height: 36px;
    }

    .download-btn svg {
        width: 18px;
        height: 18px;
    }
}
</style>
