<template>
    <div class="big-box">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>加载中...</p>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="error" class="error-message">
            <p>{{ error }}</p>
            <button @click="fetchPostDetail" class="retry-btn">重试</button>
        </div>

        <!-- 帖子详情 -->
        <div v-else-if="postData" class="content-wrapper">
            <!-- 面包屑导航 -->
            <div class="breadcrumb">
                <span class="breadcrumb-item" @click="goBack">← 返回</span>
                <span class="breadcrumb-divider">/</span>
                <span class="breadcrumb-current">帖子详情</span>
            </div>

            <!-- 帖子卡片 -->
            <div class="post-card">
                <h1 class="post-title">{{ postData.post.title }}</h1>

                <div class="post-meta">
                    <span class="author">{{
                        postData.post.author_nickname
                    }}</span>
                    <span class="divider">·</span>
                    <span class="meta-text">{{
                        postData.post.created_at
                    }}</span>
                    <span class="divider">·</span>
                    <span class="meta-text"
                        >{{ postData.post.view_count }} 浏览</span
                    >
                    <span class="divider">·</span>
                    <span class="meta-text"
                        >{{ postData.post.reply_count }} 回复</span
                    >
                </div>

                <div class="post-content">
                    {{ postData.post.content }}
                </div>
            </div>

            <!-- 评论区域 -->
            <div class="comments-section">
                <div class="comments-header">
                    <h2 class="comments-title">全部评论</h2>
                    <span class="comments-count">{{
                        postData.comments.length
                    }}</span>
                </div>
                <!-- 发表评论 -->
                <div class="comment-editor">
                    <textarea
                        v-model="newComment"
                        class="comment-input"
                        placeholder="写下你的评论..."
                        :maxlength="500"
                    ></textarea>

                    <div class="comment-actions">
                        <div class="comment-hint">
                            {{ newComment.length }}/500
                        </div>
                        <button
                            class="comment-submit"
                            :disabled="commentSubmitting || !newComment.trim()"
                            @click="submitComment"
                        >
                            {{ commentSubmitting ? '发表中...' : '发表评论' }}
                        </button>
                    </div>
                </div>
                <div v-if="postData.comments.length === 0" class="no-comments">
                    暂无评论
                </div>

                <div v-else class="comments-list">
                    <div
                        v-for="(comment, index) in postData.comments"
                        :key="index"
                        class="comment-item"
                    >
                        <img
                            :src="comment.user_avatar || defaultAvatar"
                            :alt="comment.user_nickname"
                            class="comment-avatar"
                            @error="handleImageError"
                        />
                        <div class="comment-content-wrapper">
                            <div class="comment-header">
                                <span class="comment-nickname">{{
                                    comment.user_nickname
                                }}</span>
                                <span class="comment-time">{{
                                    comment.created_at
                                }}</span>
                            </div>
                            <p class="comment-text">{{ comment.content }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { postDetailAPI, newCommentAPI } from '@/api/posts'

export default {
    name: 'PostDetail',
    data() {
        return {
            postData: null, // ✅ 初始为空，等接口回来再填
            loading: false,
            error: null,
            postId: null,
            newComment: '',
            commentSubmitting: false,
            defaultAvatar:
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23e0e0e0" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
        }
    },

    created() {
        // ✅ 兼容 /posts/detail/:id 或 ?post_id=1001
        const id = this.$route.params.id ?? this.$route.query.post_id
        this.postId = Number(id)

        if (!this.postId) {
            this.error = '缺少 post_id'
            return
        }

        this.fetchPostDetail()
    },

    watch: {
        // ✅ 同一路由复用组件时，id 变了也要重新请求
        '$route.params.id'(newId) {
            const id = Number(newId)
            if (id && id !== this.postId) {
                this.postId = id
                this.fetchPostDetail()
            }
        }
    },

    methods: {
        async fetchPostDetail() {
            if (!this.postId) return

            this.loading = true
            this.error = null

            try {
                // ✅ 你的 http 拦截器：成功时 resolve 的就是 {code:200, data:{...}}
                const body = await postDetailAPI(this.postId)

                // body.code 必然是 200（否则已被拦截器 reject）
                const data = body.data || {}

                this.postData = {
                    post: data.post || {},
                    comments: Array.isArray(data.comments) ? data.comments : []
                }
            } catch (err) {
                console.error('获取帖子详情失败:', err)
                // ✅ err.message 是拦截器里的 body.msg / "请求失败"
                this.error = err?.message || '网络请求失败，请稍后重试'
            } finally {
                this.loading = false
            }
        },

        handleImageError(e) {
            e.target.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23e0e0e0" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
        },

        goBack() {
            this.$router.go(-1)
        },
        async submitComment() {
            const content = this.newComment.trim()
            if (!content) return

            const user_id = localStorage.getItem('user_id')
            if (!user_id) {
                alert('请先登录后再评论')
                this.$router.push('/login')
                return
            }

            this.commentSubmitting = true
            try {
                await newCommentAPI({
                    post_id: this.postId,
                    user_id: Number(user_id),
                    content
                })

                // 清空输入
                this.newComment = ''

                // ✅ 最稳：重新拉详情，comments + reply_count 同步更新
                await this.fetchPostDetail()
            } catch (err) {
                console.error('发表评论失败:', err)
                alert(err?.message || '发表评论失败，请稍后重试')
            } finally {
                this.commentSubmitting = false
            }
        }
    }
}
</script>

<style scoped>
.big-box {
    padding: 24px;
    min-height: 100vh;
    margin-top: 60px;
}

.loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f0f0f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading p {
    margin-top: 16px;
    font-size: 14px;
}

.error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #666;
}

.error-message p {
    margin-bottom: 16px;
    font-size: 14px;
}

.retry-btn {
    padding: 8px 20px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
}

.retry-btn:hover {
    background: #4f46e5;
}

.content-wrapper {
    width: 75%;
    margin: 0 auto;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #666;
}

.breadcrumb-item {
    cursor: pointer;
    transition: color 0.2s;
}

.breadcrumb-item:hover {
    color: #6366f1;
}

.breadcrumb-divider {
    color: #ccc;
}

.breadcrumb-current {
    color: #333;
}

.post-card {
    background: white;
    border-radius: 8px;
    padding: 32px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.post-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 16px 0;
    line-height: 1.5;
}

.post-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    padding-bottom: 20px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 24px;
    font-size: 14px;
}

.author {
    color: #6366f1;
    font-weight: 500;
}

.divider {
    margin: 0 8px;
    color: #d0d0d0;
}

.meta-text {
    color: #999;
}

.post-content {
    font-size: 15px;
    line-height: 1.8;
    color: #333;
    white-space: pre-wrap;
}

.comments-section {
    background: white;
    border-radius: 8px;
    padding: 24px 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.comments-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
}

.comments-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.comments-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    background: #f5f5f5;
    border-radius: 12px;
    font-size: 13px;
    color: #666;
}

.no-comments {
    text-align: center;
    color: #999;
    padding: 60px 0;
    font-size: 14px;
}

.comments-list {
    display: flex;
    flex-direction: column;
}

.comment-item {
    display: flex;
    gap: 12px;
    padding: 20px 0;
    border-bottom: 1px solid #f5f5f5;
}

.comment-item:last-child {
    border-bottom: none;
}

.comment-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.comment-content-wrapper {
    flex: 1;
    min-width: 0;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.comment-nickname {
    font-weight: 500;
    color: #333;
    font-size: 14px;
}

.comment-time {
    color: #999;
    font-size: 13px;
}

.comment-text {
    margin: 0;
    color: #666;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
}

.comment-editor {
    margin-bottom: 18px;
    padding: 14px 14px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
}

.comment-input {
    width: 100%;
    min-height: 90px;
    resize: vertical;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    background: #fff;
}

.comment-input:focus {
    border-color: #6366f1;
}

.comment-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
}

.comment-hint {
    font-size: 12px;
    color: #999;
}

.comment-submit {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: #6366f1;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

.comment-submit:hover:not(:disabled) {
    background: #4f46e5;
}

.comment-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .big-box {
        padding: 16px;
    }

    .post-card {
        padding: 20px;
        border-radius: 6px;
    }

    .comments-section {
        padding: 16px 20px;
        border-radius: 6px;
    }

    .post-title {
        font-size: 20px;
    }

    .post-meta {
        font-size: 13px;
    }

    .comment-avatar {
        width: 36px;
        height: 36px;
    }
    .content-wrapper {
        width: 90%;
        margin: 0 auto;
    }
}
</style>
