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
                />
                <button class="btn-search">搜索</button>
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
                    <div class="post-meta">
                        <span class="author">{{
                            post.author_name || 'AutoUpdated' + post.id
                        }}</span>
                        <span class="meta-item">
                            <i class="icon-view">👁</i>
                            {{ post.view_count || 2 }}
                        </span>
                        <span class="meta-item">
                            <i class="icon-comment">💬</i>
                            {{ post.comment_count || 1 }} 回复
                        </span>
                    </div>
                </div>
                <div class="post-time">
                    {{ formatFullTime(post.created_at) }}
                </div>
            </div>

            <div v-if="posts.length === 0 && !loading" class="empty">
                暂无帖子
            </div>

            <div v-if="loading" class="loading">加载中...</div>
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
                        <label>标题</label>
                        <input
                            v-model="newPost.title"
                            type="text"
                            placeholder="请输入帖子标题"
                        />
                    </div>

                    <div class="form-item">
                        <label>内容</label>
                        <textarea
                            v-model="newPost.content"
                            placeholder="分享你的想法..."
                            rows="8"
                        ></textarea>
                    </div>

                    <div class="form-item">
                        <label>学校ID（可选）</label>
                        <input
                            v-model="newPost.univ_id"
                            type="text"
                            placeholder="关联学校ID"
                        />
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-cancel" @click="closeDialog">
                        取消
                    </button>
                    <button
                        class="btn-submit"
                        @click="submitPost"
                        :disabled="submitting"
                    >
                        {{ submitting ? '发布中...' : '发布' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { getPostsAPI, newPostAPI } from '@/api/posts'

export default {
    name: 'PostsPage',

    data() {
        return {
            posts: [],
            loading: false,
            showDialog: false,
            submitting: false,
            searchKeyword: '',
            newPost: {
                title: '',
                content: '',
                univ_id: ''
            }
        }
    },

    mounted() {
        this.loadPosts()
    },

    methods: {
        async loadPosts() {
            this.loading = true
            try {
                const res = await getPostsAPI()
                if (res.data && res.data.posts) {
                    this.posts = res.data.posts
                }
            } catch (error) {
                console.error('加载帖子失败:', error)
            } finally {
                this.loading = false
            }
        },

        showNewPostDialog() {
            this.showDialog = true
            this.resetForm()
        },

        closeDialog() {
            this.showDialog = false
            this.resetForm()
        },

        resetForm() {
            this.newPost = {
                title: '',
                content: '',
                univ_id: ''
            }
        },

        async submitPost() {
            if (!this.newPost.title.trim()) {
                alert('请输入标题')
                return
            }
            if (!this.newPost.content.trim()) {
                alert('请输入内容')
                return
            }

            this.submitting = true
            try {
                const user_id = localStorage.getItem('user_id') || '1'

                await newPostAPI({
                    user_id,
                    title: this.newPost.title,
                    content: this.newPost.content,
                    univ_id: this.newPost.univ_id
                })

                alert('发布成功！')
                this.closeDialog()
                this.loadPosts()
            } catch (error) {
                console.error('发布失败:', error)
                alert('发布失败，请稍后重试')
            } finally {
                this.submitting = false
            }
        },

        viewPostDetail(postId) {
            this.$router.push(`/posts/${postId}`)
        },

        formatFullTime(time) {
            if (!time) return ''
            const date = new Date(time)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hour = String(date.getHours()).padStart(2, '0')
            const minute = String(date.getMinutes()).padStart(2, '0')
            const second = String(date.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`
        }
    }
}
</script>

<style scoped>
.posts-page {
    min-height: 100vh;
    background: #f5f5f5;
}

/* 顶部导航 */
.header {
    background: white;
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
    transition: box-shadow 0.3s;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.post-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-main {
    flex: 1;
}

.post-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 0 12px 0;
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

.empty,
.loading {
    text-align: center;
    padding: 60px 20px;
    color: #999;
    font-size: 15px;
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
}

.modal-box {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: auto;
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
}

.btn-close:hover {
    color: #333;
}

.modal-body {
    padding: 24px;
}

.form-item {
    margin-bottom: 20px;
}

.form-item label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
    font-weight: 500;
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
}

.form-item input:focus,
.form-item textarea:focus {
    outline: none;
    border-color: #1890ff;
}

.form-item textarea {
    resize: vertical;
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
</style>
