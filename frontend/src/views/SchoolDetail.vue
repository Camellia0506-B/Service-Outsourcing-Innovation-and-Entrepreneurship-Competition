<template>
    <div class="school-detail">
      <!-- 返回按钮 -->
      <div class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>返回院校列表</span>
      </div>
  
      <!-- 学校信息卡片 -->
      <div class="school-info-card">
        <div class="school-avatar-large">清</div>
        <div class="school-main-info">
          <h1 class="school-name">清华大学</h1>
          <div class="school-tags">
            <span class="tag">TP (清北)</span>
            <span class="tag">C9</span>
            <span class="tag">985</span>
          </div>
          <p class="school-description">中国顶尖学府，坐落于北京...</p>
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
                <option value="cs">计算机系</option>
                <option value="software">软件学院</option>
                <option value="network">网络安全学院</option>
              </select>
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
                v-for="notice in notices" 
                :key="notice.id"
                class="notice-item"
              >
                <div class="notice-header">
                  <span class="notice-tag" :style="{ background: notice.tagColor }">
                    {{ notice.tag }}
                  </span>
                  <h3 class="notice-title">{{ notice.title }}</h3>
                </div>
                <div class="notice-meta">
                  <span class="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    机试/面试
                  </span>
                  <span class="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    截止: {{ notice.deadline }}
                  </span>
                </div>
                <div class="notice-actions">
                  <span :class="['status-badge', notice.status]">
                    {{ notice.status === 'ongoing' ? '进行中' : '未开始' }}
                  </span>
                  <button class="detail-btn">查看详情</button>
                </div>
              </div>
            </div>
          </div>
  
          <!-- 经验社区 -->
          <div v-if="activeTab === 'community'" class="community-content">
            <div class="community-header">
              <h2 class="section-title">热门讨论</h2>
              <button class="post-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                发布帖子
              </button>
            </div>
  
            <div class="post-list">
              <div 
                v-for="post in posts" 
                :key="post.id"
                class="post-item"
              >
                <h3 class="post-title">{{ post.title }}</h3>
                <p class="post-preview">{{ post.preview }}</p>
                <div class="post-meta">
                  <span class="post-author">{{ post.author }}</span>
                  <span class="post-stats">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    {{ post.views }}
                  </span>
                  <span class="post-stats">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    {{ post.replies }} 回复
                  </span>
                  <span class="post-time">{{ post.time }}</span>
                </div>
              </div>
            </div>
          </div>
  
          <!-- 资料共享 -->
          <div v-if="activeTab === 'resources'" class="resources-content">
            <div class="resources-header">
              <h2 class="section-title">资料列表</h2>
              <button class="upload-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                上传资料
              </button>
            </div>
  
            <div class="resources-grid">
              <div 
                v-for="file in files" 
                :key="file.id"
                class="file-card"
              >
                <div class="file-icon" :class="file.type">
                  <svg v-if="file.type === 'pdf'" width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M7 18h10M9.5 6h5M9.5 6a2 2 0 11-4 0 2 2 0 014 0zm0 0V18m5.5-12a2 2 0 114 0 2 2 0 01-4 0zm0 0V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="file-info">
                  <h4 class="file-name">{{ file.name }}</h4>
                  <p class="file-meta">大小: {{ file.size }} • 上传者: {{ file.uploader }}</p>
                </div>
                <button class="download-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
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
        activeTab: 'notice',
        tabs: [
          { id: 'notice', name: '招生通知' },
          { id: 'community', name: '经验社区' },
          { id: 'resources', name: '资料共享' }
        ],
        filters: {
          college: '',
          type: '',
          status: ''
        },
        notices: [
          {
            id: 1,
            tag: '计算机系',
            tagColor: '#E0E7FF',
            title: '2025年优秀大学生夏令营报名通知',
            deadline: '2025-05-20',
            status: 'ongoing'
          },
          {
            id: 2,
            tag: '软件学院',
            tagColor: '#DBEAFE',
            title: '2025年预推免招生简章',
            deadline: '2025-06-01',
            status: 'ongoing'
          },
          {
            id: 3,
            tag: '网络安全学院',
            tagColor: '#E0F2FE',
            title: '直博生招募计划',
            deadline: '2025-06-10',
            status: 'ongoing'
          }
        ],
        posts: [
          {
            id: 1,
            title: '避雷！今年夏令营初试难度极大',
            preview: '昨天刚考完，题目全是Codeforces 1800分以上的，根本做不完...',
            author: 'User_888',
            views: 1205,
            replies: 23,
            time: '2小时前'
          },
          {
            id: 2,
            title: 'Offer接收情况统计贴',
            preview: '大家报一下收到的offer情况，方便后来人参考...',
            author: 'Admin',
            views: 3400,
            replies: 102,
            time: '1天前'
          },
          {
            id: 3,
            title: '复旦软院夏令营入营名单公布',
            preview: '官网已经出了，大家快去查邮件！',
            author: 'FDUer',
            views: 890,
            replies: 45,
            time: '3小时前'
          },
          {
            id: 4,
            title: '求问清华计算机系面试流程',
            preview: '有没有学长学姐分享一下去年的面试题？',
            author: 'DreamTHU',
            views: 2100,
            replies: 15,
            time: '5小时前'
          }
        ],
        files: [
          {
            id: 1,
            name: '2024机试真题回忆版.pdf',
            size: '2.4MB',
            uploader: 'User_888',
            type: 'pdf'
          },
          {
            id: 2,
            name: '导师评价汇总表.docx',
            size: '500KB',
            uploader: 'Admin',
            type: 'doc'
          },
          {
            id: 3,
            name: '个人简历模板_通用.docx',
            size: '1.2MB',
            uploader: 'User_001',
            type: 'doc'
          }
        ]
      }
    },
    methods: {
      goBack() {
        // 返回院校列表
        console.log('返回院校列表')
      }
    }
  }
  </script>
  
  <style scoped>
  .school-detail {
    padding: 24px 40px;
    background: var(--home-bg, #F3F4F6);
    min-height: 100vh;
  }
  
  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary, #6B7280);
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 24px;
    transition: color 0.2s;
  }
  
  .back-btn:hover {
    color: var(--text-primary, #1F2937);
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
  
  .school-main-info {
    flex: 1;
  }
  
  .school-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary, #1F2937);
    margin: 0 0 12px 0;
  }
  
  .school-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .tag {
    padding: 4px 12px;
    background: #EFF6FF;
    color: #3B82F6;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .school-description {
    font-size: 15px;
    color: var(--text-secondary, #6B7280);
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
    border-bottom: 1px solid var(--border-color, #E5E7EB);
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
    color: var(--text-secondary, #6B7280);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    bottom: -1px;
  }
  
  .tab-btn:hover {
    color: #3B82F6;
  }
  
  .tab-btn.active {
    color: #3B82F6;
    border-bottom-color: #3B82F6;
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
    border: 1px solid var(--border-color, #E5E7EB);
    border-radius: 6px;
    background: var(--card-bg, white);
    color: var(--text-primary, #1F2937);
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
    border: 1px solid var(--border-color, #E5E7EB);
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .notice-item:hover {
    border-color: #3B82F6;
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
    color: #3B82F6;
  }
  
  .notice-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1F2937);
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
    color: var(--text-secondary, #6B7280);
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
    background: #D1FAE5;
    color: #059669;
  }
  
  .detail-btn {
    padding: 6px 16px;
    background: transparent;
    border: 1px solid #3B82F6;
    color: #3B82F6;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .detail-btn:hover {
    background: #3B82F6;
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
    color: var(--text-primary, #1F2937);
    margin: 0;
  }
  
  .post-btn,
  .upload-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #3B82F6;
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
    background: #2563EB;
  }
  
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .post-item {
    padding: 20px;
    border: 1px solid var(--border-color, #E5E7EB);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .post-item:hover {
    border-color: #3B82F6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }
  
  .post-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #1F2937);
    margin: 0 0 8px 0;
  }
  
  .post-preview {
    font-size: 14px;
    color: var(--text-secondary, #6B7280);
    margin: 0 0 12px 0;
    line-height: 1.5;
  }
  
  .post-meta {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 13px;
    color: var(--text-tertiary, #9CA3AF);
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
    border: 1px solid var(--border-color, #E5E7EB);
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .file-card:hover {
    border-color: #3B82F6;
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
    background: #FEE2E2;
    color: #DC2626;
  }
  
  .file-icon.doc {
    background: #DBEAFE;
    color: #2563EB;
  }
  
  .file-info {
    flex: 1;
    min-width: 0;
  }
  
  .file-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #1F2937);
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .file-meta {
    font-size: 13px;
    color: var(--text-tertiary, #9CA3AF);
    margin: 0;
  }
  
  .download-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--home-bg, #F3F4F6);
    border: none;
    border-radius: 6px;
    color: var(--text-secondary, #6B7280);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .download-btn:hover {
    background: #3B82F6;
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