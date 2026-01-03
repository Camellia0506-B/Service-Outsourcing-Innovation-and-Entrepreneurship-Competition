<template>
    <div class="school-database">
        <!-- 页面标题 -->
        <div class="page-header">
            <h1 class="page-title">高校资源库</h1>
        </div>

        <!-- 搜索和筛选区域 -->
        <div class="search-section">
            <div class="search-bar">
                <svg
                    class="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                        stroke="#9CA3AF"
                        stroke-width="2"
                    />
                    <path
                        d="M16 16l4 4"
                        stroke="#9CA3AF"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </svg>
                <input
                    type="text"
                    class="search-input"
                    placeholder="搜索高校名称（如：交通大学）..."
                    v-model="searchQuery"
                    @keyup.enter="onSearch"
                />
                <button class="search-btn" @click="onSearch">搜索</button>
            </div>

            <!-- 筛选标签 -->
            <div class="filter-section">
                <div class="filter-group">
                    <span class="filter-label">院校标签：</span>
                    <div class="filter-tags">
                        <button
                            v-for="tag in schoolTags"
                            :key="tag"
                            :class="[
                                'tag-btn',
                                { active: selectedTags.includes(tag) }
                            ]"
                            @click="toggleTag(tag)"
                        >
                            {{ tag }}
                        </button>
                    </div>
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
                    <img
                        v-if="school.logoUrl"
                        :src="school.logoUrl"
                        :alt="school.name"
                        class="school-logo"
                        @error="school.logoUrl = ''"
                    />
                    <span v-else>
                        {{ school.shortName }}
                    </span>
                </div>
                <div class="school-info">
                    <div class="school-header">
                        <h3 class="school-name">{{ school.name }}</h3>
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
import { universitiesAPI } from '@/api/universities'

export default {
    name: 'School',
    data() {
        return {
            searchQuery: '',
            schoolTags: [
                'TOP2',
                '华五',
                'C9',
                '985',
                '211',
                '双非',
                '港三',
                '研究院'
            ],
            selectedTags: [],

            schools: [],

            page: 1,
            size: 999,
            total: 0,

            isLoading: false,
            errorMsg: ''
        }
    },
    mounted() {
        this.fetchSchools()
    },
    methods: {
        async fetchSchools({ resetPage = false } = {}) {
            if (resetPage) this.page = 1
            this.isLoading = true
            this.errorMsg = ''

            try {
                const tags = this.selectedTags.join(',')

                const res = await universitiesAPI({
                    page: this.page,
                    size: this.size,
                    keyword: this.searchQuery?.trim() || '',
                    tags
                })

                const payload = res?.data ?? res

                // ✅ 兼容：有的后端是 {code,data:[...]}，有的是直接 [...]
                const listRaw =
                    payload?.data ??
                    payload?.list ??
                    payload?.records ??
                    payload?.rows ??
                    payload

                const list = Array.isArray(listRaw) ? listRaw : []

                this.schools = list.map(u => {
                    const name = u.name ?? u.univ_name ?? u.title ?? ''

                    const tagsArr = Array.isArray(u.tags)
                        ? u.tags
                        : typeof u.tags === 'string'
                        ? u.tags
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                        : []

                    // ✅ 关键：必须使用 d1 的主键作为 univId
                    const univ_id = u.id

                    return {
                        id: univ_id, // ✅ 详情页用它
                        rowId: u.id, // （可选）列表序号
                        name,
                        shortName:
                            u.shortName ??
                            u.short_name ??
                            (name ? name.slice(0, 1) : ''),
                        tags: tagsArr,
                        description:
                            u.description ?? u.desc ?? u.intro ?? u.brief ?? '',
                        logoUrl: u.logo_url
                    }
                })

                // total 可选（没有就用长度）
                this.total =
                    Number(
                        payload?.total ??
                            payload?.count ??
                            payload?.pagination?.total
                    ) || this.schools.length
            } catch (err) {
                console.error(err)
                this.errorMsg =
                    err?.response?.data?.message ||
                    err?.message ||
                    '高校列表加载失败'
                this.schools = []
                this.total = 0
            } finally {
                this.isLoading = false
            }
        },

        toggleTag(tag) {
            const index = this.selectedTags.indexOf(tag)
            if (index > -1) this.selectedTags.splice(index, 1)
            else this.selectedTags.push(tag)
            this.fetchSchools({ resetPage: true })
        },

        onSearch() {
            this.fetchSchools({ resetPage: true })
        },

        goDetail(school) {
            // ✅ 这里的 school.id 应该是 1001/1002 这种 d1 univ_id
            console.log(school)
            if (!school?.id) {
                console.error('[School] missing univ_id:', school)
                return
            }

            this.$router.push({
                path: '/main/school/detail', // 按你实际 detail 路由
                query: { univ_id: String(school.id) }
            })
        }
    }
}
</script>

<style scoped>
.school-database {
    padding: 24px 40px;
    background: var(--home-bg, #f9fafb);
    min-height: 100vh;
}

.page-header {
    margin-bottom: 24px;
}

.page-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
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
    background: var(--home-bg, #f3f4f6);
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
    color: var(--text-primary, #1f2937);
}

.search-input::placeholder {
    color: var(--text-tertiary, #9ca3af);
}

.search-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 24px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
}

.search-btn:hover {
    background: #2563eb;
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
    color: var(--text-primary, #6b7280);
    font-weight: 500;
}

.filter-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.tag-btn {
    padding: 6px 16px;
    border: 1px solid var(--border-color, #e5e7eb);
    background: var(--card-bg, white);
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-primary, #4b5563);
    cursor: pointer;
    transition: all 0.2s;
}

.tag-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: var(--button-hover, #f0f0f0);
}

.tag-btn.active {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #3b82f6;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--text-primary, #4b5563);
    cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
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
    background: var(--home-bg, #f3f4f6);
    /* border-radius: 8px; */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary, #6b7280);
    flex-shrink: 0;
    border: transparent;
}

.school-logo {
    width: 100%;
    height: 100%;
    object-fit: contain; /* 校徽一般用 contain */
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
    color: var(--text-primary, #1f2937);
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
    background: #d1fae5;
    color: #059669;
}

.status-badge.closed {
    background: #fef3c7;
    color: #d97706;
}

.school-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.school-tag {
    padding: 4px 10px;
    background: #eff6ff;
    color: #3b82f6;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.school-desc {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
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
