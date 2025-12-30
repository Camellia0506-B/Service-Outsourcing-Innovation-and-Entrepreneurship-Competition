<template>
    <div class="big-box">
      <div class="post-container">
        <!-- 帖子主体 -->
        <div class="post-main">
          <!-- 标题 -->
          <h1 class="post-title">{{ post.title }}</h1>
  
          <!-- 作者信息栏 -->
          <div class="post-meta">
            <div class="author-info">
              <img :src="post.author.avatar" :alt="post.author.name" class="avatar" />
              <div class="author-details">
                <div class="author-name">{{ post.author.name }}</div>
                <div class="post-info">
                  <span class="time">{{ post.time }}</span>
                  <span class="separator">·</span>
                  <span class="views">{{ post.views }} 阅读</span>
                  <span class="separator">·</span>
                  <span class="university">{{ post.university }}</span>
                </div>
              </div>
            </div>
            <button class="follow-btn">+ 关注</button>
          </div>
  
          <!-- 正文内容 -->
          <div class="post-content" v-html="post.content"></div>
  
          <!-- 互动按钮 -->
          <div class="post-actions">
            <button class="action-btn" :class="{ active: isLiked }" @click="toggleLike">
              <span class="icon">👍</span>
              <span>{{ post.likes }}</span>
            </button>
            <button class="action-btn">
              <span class="icon">⭐</span>
              <span>收藏</span>
            </button>
            <button class="action-btn">
              <span class="icon">🔗</span>
              <span>分享</span>
            </button>
          </div>
        </div>
  
        <!-- 评论区 -->
        <div class="comments-section">
          <div class="comments-header">
            <h2>评论 ({{ comments.length }})</h2>
          </div>
  
          <!-- 发表评论 -->
          <div class="comment-input-box">
            <img :src="currentUser.avatar" :alt="currentUser.name" class="avatar-small" />
            <div class="input-wrapper">
              <textarea 
                v-model="newComment" 
                placeholder="写下你的评论..."
                rows="3"
              ></textarea>
              <button class="submit-btn" @click="submitComment" :disabled="!newComment.trim()">
                发表评论
              </button>
            </div>
          </div>
  
          <!-- 评论列表 -->
          <div class="comments-list">
            <div v-for="comment in comments" :key="comment.id" class="comment-item">
              <img :src="comment.user.avatar" :alt="comment.user.name" class="avatar-small" />
              <div class="comment-content">
                <div class="comment-header">
                  <span class="commenter-name">{{ comment.user.name }}</span>
                  <span class="comment-time">{{ comment.time }}</span>
                </div>
                <p class="comment-text">{{ comment.content }}</p>
                <div class="comment-actions">
                  <button class="reply-btn" @click="replyTo(comment)">回复</button>
                  <button class="like-btn" :class="{ active: comment.isLiked }" @click="toggleCommentLike(comment.id)">
                    <span class="icon">👍</span>
                    <span v-if="comment.likes > 0">{{ comment.likes }}</span>
                  </button>
                </div>
  
                <!-- 回复列表 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <img :src="reply.user.avatar" :alt="reply.user.name" class="avatar-tiny" />
                    <div class="reply-content">
                      <div class="reply-header">
                        <span class="replier-name">{{ reply.user.name }}</span>
                        <span class="reply-to">回复 {{ reply.replyTo }}</span>
                        <span class="reply-time">{{ reply.time }}</span>
                      </div>
                      <p class="reply-text">{{ reply.content }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        isLiked: false,
        newComment: '',
        currentUser: {
          name: '当前用户',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current'
        },
        post: {
          title: '如何高效学习前端开发：我的经验分享',
          author: {
            name: '张小明',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
          },
          time: '2024-12-30 14:30',
          views: 1248,
          university: '清华大学',
          likes: 156,
          content: `
            <p>大家好！今天想和大家分享一下我在学习前端开发过程中的一些心得体会。</p>
            
            <h3>一、打好基础很重要</h3>
            <p>HTML、CSS、JavaScript 是前端的三大基石。不要急于学习框架，先把基础打牢固。我花了整整两个月时间专注于原生 JavaScript，这对后来学习 Vue 和 React 帮助很大。</p>
            
            <h3>二、多动手实践</h3>
            <p>看再多教程都不如自己动手写代码。我建议大家：</p>
            <ul>
              <li>每学一个知识点，立即写个小 demo</li>
              <li>尝试复刻一些知名网站的页面</li>
              <li>参与开源项目，阅读优秀代码</li>
            </ul>
            
            <h3>三、保持学习热情</h3>
            <p>前端技术更新很快，要保持持续学习的态度。关注技术社区、参加线下活动、和同学交流都是很好的学习方式。</p>
            
            <p>希望这些经验对大家有帮助！如果有任何问题，欢迎在评论区讨论～</p>
          `
        },
        comments: [
          {
            id: 1,
            user: {
              name: '李华',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia'
            },
            time: '1小时前',
            content: '写得太好了！特别是关于打好基础这一点，深有体会。我当时就是急于学框架，导致后来遇到很多问题。',
            likes: 23,
            isLiked: false,
            replies: [
              {
                id: 11,
                user: {
                  name: '张小明',
                  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                },
                replyTo: '李华',
                time: '50分钟前',
                content: '是的，基础真的很重要！慢就是快，稳扎稳打才能走得更远。'
              }
            ]
          },
          {
            id: 2,
            user: {
              name: '王小红',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie'
            },
            time: '3小时前',
            content: '请问有推荐的学习资源吗？刚开始学习前端，感觉资料太多不知道从哪里开始。',
            likes: 15,
            isLiked: true,
            replies: []
          },
          {
            id: 3,
            user: {
              name: '刘明',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
            },
            time: '5小时前',
            content: '同意多动手实践这一点！我现在每天都会写点代码，感觉进步很快。',
            likes: 8,
            isLiked: false,
            replies: []
          }
        ]
      }
    },
    methods: {
      toggleLike() {
        this.isLiked = !this.isLiked;
        this.post.likes += this.isLiked ? 1 : -1;
      },
      toggleCommentLike(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
          comment.isLiked = !comment.isLiked;
          comment.likes += comment.isLiked ? 1 : -1;
        }
      },
      submitComment() {
        if (!this.newComment.trim()) return;
        
        const newCommentObj = {
          id: Date.now(),
          user: { ...this.currentUser },
          time: '刚刚',
          content: this.newComment,
          likes: 0,
          isLiked: false,
          replies: []
        };
        
        this.comments.unshift(newCommentObj);
        this.newComment = '';
      },
      replyTo(comment) {
        alert(`回复 ${comment.user.name} 的功能开发中...`);
      }
    }
  }
  </script>
  
  <style scoped>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  .big-box {
    min-height: 100vh;
    background: var(--home-bg, #f5f7fa);
    padding: 10px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
    transition: background-color 0.3s ease;
    margin-top: 60px;
  }
  
  .post-container {
    max-width: 900px;
    margin: 0 auto;
  }
  
  /* 帖子主体 */
  .post-main {
    background: var(--card-bg, white);
    border-radius: 12px;
    padding: 40px;
    margin-bottom: 24px;
    box-shadow: var(--box-shadow, 0 2px 8px rgba(0, 0, 0, 0.06));
    transition: all 0.3s ease;
  }
  
  .post-title {
    font-size: 32px;
    font-weight: bold;
    color: var(--text-primary, #1a1a1a);
    margin-bottom: 24px;
    line-height: 1.4;
  }
  
  .post-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color, #e8e8e8);
    margin-bottom: 32px;
  }
  
  .author-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .author-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .author-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }
  
  .post-info {
    font-size: 14px;
    color: var(--text-secondary, #8a8a8a);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .separator {
    color: var(--text-tertiary, #d0d0d0);
  }
  
  .university {
    color: var(--path-display-color, #667eea);
    font-weight: 500;
  }
  
  .follow-btn {
    padding: 8px 20px;
    background: var(--path-display-color, #667eea);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .follow-btn:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }
  
  .post-content {
    font-size: 16px;
    line-height: 1.8;
    color: var(--text-primary, #333);
    margin-bottom: 32px;
  }
  
  .post-content h3 {
    font-size: 20px;
    margin: 24px 0 12px;
    color: var(--text-primary, #1a1a1a);
  }
  
  .post-content p {
    margin: 16px 0;
  }
  
  .post-content ul {
    margin: 16px 0;
    padding-left: 24px;
  }
  
  .post-content li {
    margin: 8px 0;
  }
  
  .post-actions {
    display: flex;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color, #e8e8e8);
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: var(--nav-hover, #f5f7fa);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
    color: var(--text-secondary, #666);
  }
  
  .action-btn:hover {
    background: var(--button-hover, #e8ecf3);
  }
  
  .action-btn.active {
    background: var(--calendar-today-bg, #e6f0ff);
    color: var(--calendar-today-color, #667eea);
  }
  
  .action-btn .icon {
    font-size: 16px;
  }
  
  /* 评论区 */
  .comments-section {
    background: var(--card-bg, white);
    border-radius: 12px;
    padding: 32px 40px;
    box-shadow: var(--box-shadow, 0 2px 8px rgba(0, 0, 0, 0.06));
    transition: all 0.3s ease;
  }
  
  .comments-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    margin-bottom: 24px;
  }
  
  .comment-input-box {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color, #e8e8e8);
  }
  
  .avatar-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  
  .avatar-tiny {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  
  .input-wrapper {
    flex: 1;
  }
  
  .input-wrapper textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 12px;
    transition: all 0.3s;
    background: var(--card-bg, white);
    color: var(--text-primary, #333);
  }
  
  .input-wrapper textarea:focus {
    outline: none;
    border-color: var(--path-display-color, #667eea);
  }
  
  .submit-btn {
    padding: 10px 24px;
    background: var(--path-display-color, #667eea);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .submit-btn:hover:not(:disabled) {
    opacity: 0.85;
  }
  
  .submit-btn:disabled {
    background: var(--text-tertiary, #ccc);
    cursor: not-allowed;
  }
  
  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .comment-item {
    display: flex;
    gap: 12px;
  }
  
  .comment-content {
    flex: 1;
  }
  
  .comment-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .commenter-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }
  
  .comment-time {
    font-size: 13px;
    color: var(--text-secondary, #8a8a8a);
  }
  
  .comment-text {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-primary, #333);
    margin-bottom: 12px;
  }
  
  .comment-actions {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  
  .reply-btn,
  .like-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: none;
    border: none;
    font-size: 13px;
    color: var(--text-secondary, #8a8a8a);
    cursor: pointer;
    transition: color 0.3s;
  }
  
  .reply-btn:hover,
  .like-btn:hover {
    color: var(--path-display-color, #667eea);
  }
  
  .like-btn.active {
    color: var(--path-display-color, #667eea);
  }
  
  .replies-list {
    margin-top: 16px;
    padding-left: 44px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .reply-item {
    display: flex;
    gap: 10px;
  }
  
  .reply-content {
    flex: 1;
  }
  
  .reply-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  
  .replier-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }
  
  .reply-to {
    font-size: 13px;
    color: var(--text-secondary, #8a8a8a);
  }
  
  .reply-to::before {
    content: '→ ';
  }
  
  .reply-time {
    font-size: 12px;
    color: var(--text-tertiary, #aaa);
  }
  
  .reply-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary, #333);
  }
  
  @media (max-width: 768px) {
    .post-main,
    .comments-section {
      padding: 24px 20px;
    }
  
    .post-title {
      font-size: 24px;
    }
  
    .post-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
  
    .replies-list {
      padding-left: 20px;
    }
  }
  </style>