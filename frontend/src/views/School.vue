<template>
  <div class="school-database">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">高校资源库</h1>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <div class="search-bar">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#9CA3AF" stroke-width="2"/>
          <path d="M16 16l4 4" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input 
          type="text" 
          class="search-input" 
          placeholder="搜索高校名称（如：交通大学）..."
          v-model="searchQuery"
        >
        <button class="search-btn">搜索</button>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-section">
        <div class="filter-group">
          <span class="filter-label">院校标签：</span>
          <div class="filter-tags">
            <button 
              v-for="tag in schoolTags" 
              :key="tag"
              :class="['tag-btn', { active: selectedTags.includes(tag) }]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">营期状态：</span>
          <label class="checkbox-label">
            <input type="checkbox" v-model="filters.isOpen">
            <span>开营中</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="filters.isClosed">
            <span>已结束</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 院校卡片网格 -->
    <div class="schools-grid">
      <div 
        v-for="school in schools" 
        :key="school.id"
        class="school-card"
        @click="goDetail(school)"
      >
        <div class="school-avatar">
          {{ school.shortName }}
        </div>
        <div class="school-info">
          <div class="school-header">
            <h3 class="school-name">{{ school.name }}</h3>
            <span :class="['status-badge', school.status]">
              {{ school.status === 'open' ? '开营中' : '未开始' }}
            </span>
          </div>
          <div class="school-tags">
            <span 
              v-for="tag in school.tags" 
              :key="tag"
              class="school-tag"
            >
              {{ tag }}
            </span>
          </div>
          <p class="school-desc">{{ school.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      searchQuery: '',
      schoolTags: ['TP (清北)', '华五', 'C9', '985', '211', '双非'],
      selectedTags: [],
      filters: {
        isOpen: false,
        isClosed: false
      },
      schools: [
        {
          id: 1,
          name: '清华大学',
          shortName: '清',
          tags: ['TP (清北)', 'C9', '985'],
          description: '中国顶尖学府，坐落于北京...',
          status: 'open'
        },
        {
          id: 2,
          name: '上海交通大学',
          shortName: '上',
          tags: ['华五', 'C9', '985'],
          description: '综合性、研究型、国际化大学...',
          status: 'open'
        },
        {
          id: 3,
          name: '复旦大学',
          shortName: '复',
          tags: ['华五', 'C9', '985'],
          description: '江南第一学府，人文与理工并...',
          status: 'closed'
        },
        {
          id: 4,
          name: '浙江大学',
          shortName: '浙',
          tags: ['华五', 'C9', '985'],
          description: '求是创新，学科门类全...',
          status: 'open'
        },
        {
          id: 5,
          name: '南京大学',
          shortName: '南',
          tags: ['华五', 'C9', '985'],
          description: '历史悠久，诚朴雄伟...',
          status: 'open'
        },
        {
          id: 6,
          name: '中国科学技术大学',
          shortName: '中',
          tags: ['华五', 'C9', '985'],
          description: '红专并进，理实交融...',
          status: 'open'
        },
        {
          id: 7,
          name: '西安电子科技大学',
          shortName: '西',
          tags: ['211'],
          description: '两电一邮成员，电子信息强校...',
          status: 'open'
        }
      ]
    }
  },
  methods: {
    toggleTag(tag) {
      const index = this.selectedTags.indexOf(tag);
      if (index > -1) {
        this.selectedTags.splice(index, 1);
      } else {
        this.selectedTags.push(tag);
      }
    },
    goDetail(school) {
      this.$router.push({
        name: 'SchoolDetail',
        params: { id: school.id }
      });
    }
  }
}
</script>

<style scoped>
.school-database {
  padding: 24px 40px;
  background: var(--home-bg, #F9FAFB);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
  margin: 0;
}

.search-section {
  background: var(--card-bg, white);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--box-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  background: var(--home-bg, #F3F4F6);
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid var(--border-color, transparent);
}

.search-icon {
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--text-primary, #1F2937);
}

.search-input::placeholder {
  color: var(--text-tertiary, #9CA3AF);
}

.search-btn {
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover {
  background: #2563EB;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  color: var(--text-primary, #6B7280);
  font-weight: 500;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color, #E5E7EB);
  background: var(--card-bg, white);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary, #4B5563);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn:hover {
  border-color: #3B82F6;
  color: #3B82F6;
  background: var(--button-hover, #f0f0f0);
}

.tag-btn.active {
  background: #EFF6FF;
  border-color: #3B82F6;
  color: #3B82F6;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary, #4B5563);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.schools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 20px;
}

.school-card {
  background: var(--card-bg, white);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 20px;
  box-shadow: var(--box-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  border: 1px solid var(--border-color, transparent);
}

.school-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  background: var(--button-hover, white);
}

.school-avatar {
  width: 64px;
  height: 64px;
  background: var(--home-bg, #F3F4F6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #6B7280);
  flex-shrink: 0;
  border: 1px solid var(--border-color, transparent);
}

.school-info {
  flex: 1;
  min-width: 0;
}

.school-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.school-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge.open {
  background: #D1FAE5;
  color: #059669;
}

.status-badge.closed {
  background: #FEF3C7;
  color: #D97706;
}

.school-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.school-tag {
  padding: 4px 10px;
  background: #EFF6FF;
  color: #3B82F6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.school-desc {
  font-size: 14px;
  color: var(--text-secondary, #6B7280);
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 1200px) {
  .schools-grid {
    grid-template-columns: 1fr;
  }
}
</style>