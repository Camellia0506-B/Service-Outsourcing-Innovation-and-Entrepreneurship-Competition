<template>
    <div class="responsive-layout" :class="{ 'mobile-layout': isMobileView }">
        <!-- Daily Card Section -->
        <div class="section-container left-pane">
            <h2 class="section-title">欢迎{{ nickname }}！</h2>
            <div class="daily-card">
                <div class="card-image">
                    <img
                        :src="bgImageUrl || '/images/bgi.jpg'"
                        alt="Daily inspiration"
                    />
                </div>
                <div class="card-content">
                    <p class="quote-text" v-text="quoteText"></p>
                    <p class="quote-author" v-if="quoteAuthor">
                        ——{{ quoteAuthor }}
                    </p>
                </div>
                <div class="card-footer">
                    <div class="service-info">@samhan</div>
                    <div class="date-box">
                        <div class="date">
                            {{ currentDay }}/{{ daysInMonth }}
                        </div>
                        <div class="day">{{ dayOfWeek }}.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section two -->
        <div class="section-container right-pane">
            <div class="info-grid">
                <!-- 我的关注 -->
                <div class="info-card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <span class="star-icon">⭐</span>
                            我的关注
                        </h3>
                        <button class="add-btn" @click="openAddModal">
                            + 添加关注
                        </button>
                    </div>

                    <div class="tags-container">
                        <span
                            class="tag"
                            :class="{ active: selectedUniv === '' }"
                            @click="handleSelectUniv('')"
                        >
                            全部
                        </span>

                        <span
                            class="tag"
                            v-for="u in followedUnivs"
                            :key="u"
                            :class="{ active: selectedUniv === u }"
                            @click="handleSelectUniv(u)"
                        >
                            {{ u }}
                            <span
                                class="tag-close"
                                @click.stop="handleRemoveFollow(u)"
                                >×</span
                            >
                        </span>
                    </div>

                    <div class="ddl-section">
                        <div class="section-header">
                            <span class="section-label">临近 DDL 提醒</span>
                            <span class="from-label">来自关注列表</span>
                        </div>

                        <div
                            v-if="filteredDdlReminders.length === 0"
                            class="empty-message"
                        >
                            {{
                                selectedUniv
                                    ? `${selectedUniv} 暂无DDL提醒`
                                    : '暂无DDL提醒，请添加关注'
                            }}
                        </div>

                        <div
                            class="ddl-item"
                            v-for="item in filteredDdlReminders"
                            :key="item.notice_id || item.id"
                            @click="openNoticeLink(item)"
                        >
                            <div class="ddl-info">
                                <div class="ddl-title">
                                    {{ item.univ_name }} - {{ item.dept_name }}
                                </div>
                                <div class="ddl-subtitle">{{ item.title }}</div>
                                <div class="ddl-deadline">
                                    截止: {{ item.end_date || '暂无' }}
                                </div>
                            </div>
                            <div
                                class="ddl-countdown"
                                :class="{ expired: hasPast(item) }"
                            >
                                {{ countdownText(item) }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 热门帖子推荐 -->
                <div class="info-card">
                    <div class="card-header">
                        <h3 class="card-title">热门帖子推荐</h3>
                        <span class="top-label">TOP</span>
                    </div>

                    <div class="posts-list">
                        <div
                            class="post-item"
                            v-for="(post, idx) in hotPosts"
                            :key="post.post_id"
                            @click="goPostDetail(post.post_id)"
                        >
                            <span class="post-rank">{{ idx + 1 }}</span>
                            <div class="post-content">
                                <div class="post-title">{{ post.title }}</div>
                                <div class="post-meta">
                                    <span class="post-source">{{
                                        post.univ_name
                                    }}</span>
                                    <span class="post-views"
                                        >👁 {{ post.view_count }}</span
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 添加关注弹窗 -->
        <div
            v-if="showAddModal"
            class="modal-overlay"
            @click="showAddModal = false"
        >
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>选择要关注的大学</h3>
                    <button class="close-btn" @click="showAddModal = false">
                        ×
                    </button>
                </div>

                <!-- 搜索和筛选区域 -->
                <div class="modal-filters">
                    <div class="search-box">
                        <input
                            type="text"
                            v-model="searchKeyword"
                            placeholder="搜索大学名称..."
                            class="search-input"
                        />
                    </div>

                    <div class="region-filters">
                        <button
                            class="region-btn"
                            :class="{ active: selectedRegion === '' }"
                            @click="selectedRegion = ''"
                        >
                            全部地区
                        </button>
                        <button
                            v-for="region in availableRegions"
                            :key="region"
                            class="region-btn"
                            :class="{ active: selectedRegion === region }"
                            @click="selectedRegion = region"
                        >
                            {{ region }}
                        </button>
                    </div>
                </div>

                <div class="modal-body">
                    <div v-if="isLoading" class="loading-message">
                        加载中...
                    </div>
                    <div
                        v-else-if="filteredUnivs.length === 0"
                        class="empty-message"
                    >
                        {{
                            searchKeyword || selectedRegion
                                ? '没有找到匹配的大学'
                                : '暂无可关注的大学'
                        }}
                    </div>
                    <div v-else class="univ-list">
                        <label
                            v-for="u in filteredUnivs"
                            :key="u"
                            class="univ-item"
                            :class="{ disabled: isLoading }"
                        >
                            <input
                                type="checkbox"
                                :checked="followedUnivs.includes(u)"
                                @change="handleToggleFollow(u)"
                                :disabled="isLoading"
                            />
                            <span>{{ u }}</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button
                        class="btn-cancel"
                        @click="showAddModal = false"
                        :disabled="isLoading"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>

        <!-- Toast 提示 -->
        <div v-if="toast.show" class="toast" :class="toast.type">
            {{ toast.message }}
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { themeEventBus } from '@/utils/themeEvent'
import { dashboardAPI } from '@/api/dashboard'
import { followListAPI, followAddAPI, followDeleteAPI } from '@/api/follows'
import {
    universitiesAPI,
    univNoticesAPI,
    univPostsAPI
} from '@/api/universities'

export default {
    name: 'CalendarWithDailyCard',
    setup() {
        const quote = ref('')
        const bgImageUrl = ref('')
        const ddlReminders = ref([])
        const hotPosts = ref([])
        const nickname = ref('')
        const currentDate = ref(new Date())
        const isMobileView = ref(false)

        const userId = ref(0)
        const followedUnivs = ref([])
        const selectedUniv = ref('')
        const showAddModal = ref(false)
        const isLoading = ref(false)

        // 弹窗搜索和筛选
        const searchKeyword = ref('')
        const selectedRegion = ref('')

        // 存储 univ_name -> {followId, univId} 的映射
        const univMap = ref({})

        const router = useRouter()

        const goPostDetail = postId => {
            if (!postId) return
            // ✅ 按你路由配置改：比如 /posts/detail/:id
            router.push({ path: `/main/posts/detail/${postId}` })
            // 或者：router.push({ name: 'PostDetail', params: { id: postId } })
        }

        // Toast 提示
        const toast = ref({
            show: false,
            message: '',
            type: 'success' // success | error
        })

        const showToast = (message, type = 'success') => {
            toast.value = { show: true, message, type }
            setTimeout(() => {
                toast.value.show = false
            }, 3000)
        }

        const currentDay = computed(() => currentDate.value.getDate())
        const daysInMonth = computed(() => {
            return new Date(
                currentDate.value.getFullYear(),
                currentDate.value.getMonth() + 1,
                0
            ).getDate()
        })
        const dayOfWeek = computed(() => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[currentDate.value.getDay()]
        })

        const quoteText = computed(() => {
            const raw = (quote.value || '').trim()
            if (!raw) return ''
            const [textPart] = raw.split('##')
            return (textPart || '').trim().replace(/\\n/g, '\n')
        })

        const quoteAuthor = computed(() => {
            const raw = (quote.value || '').trim()
            if (!raw) return ''
            const parts = raw.split('##')
            if (parts.length < 2) return ''
            return (parts.slice(1).join('##') || '').trim()
        })

        // 存储所有可用的大学信息（包含 univ_id）
        const allUnivs = ref([])

        // 存储所有关注大学的通知列表（合并后的）
        const allNotices = ref([])

        // 强制刷新标记（用于触发计算属性重新计算）
        const refreshTrigger = ref(0)

        const availableUnivs = computed(() => {
            // 优先从 allUnivs 获取
            if (allUnivs.value.length > 0) {
                return allUnivs.value.map(u => u.univ_name).sort()
            }

            // 兜底：从 ddlReminders 中提取
            const set = new Set()
            ddlReminders.value.forEach(item => {
                if (item?.univ_name) set.add(item.univ_name)
            })
            return Array.from(set).sort()
        })

        // 提取所有地区
        const availableRegions = computed(() => {
            const regions = new Set()
            allUnivs.value.forEach(u => {
                // 从大学名称中提取地区（如：上海、北京、江苏等）
                const match = u.univ_name.match(
                    /^(上海|北京|天津|重庆|江苏|浙江|广东|四川|湖北|山东|陕西|辽宁|湖南|福建|河南|河北|安徽|黑龙江|吉林|云南|山西|江西|贵州|广西|甘肃|内蒙古|新疆|海南|宁夏|青海|西藏|香港|澳门|台湾)/
                )
                if (match) {
                    regions.add(match[1])
                }
            })
            return Array.from(regions).sort()
        })

        // 过滤后的大学列表
        const filteredUnivs = computed(() => {
            let list = allUnivs.value

            // 按地区筛选
            if (selectedRegion.value) {
                list = list.filter(u =>
                    u.univ_name.startsWith(selectedRegion.value)
                )
            }

            // 按关键词搜索
            if (searchKeyword.value.trim()) {
                const keyword = searchKeyword.value.trim().toLowerCase()
                list = list.filter(u =>
                    u.univ_name.toLowerCase().includes(keyword)
                )
            }

            return list.map(u => u.univ_name).sort()
        })

        const filteredDdlReminders = computed(() => {
            // 依赖 refreshTrigger 来强制重新计算
            const _ = refreshTrigger.value

            // 使用合并后的通知列表（来自 dashboard 的 ddlReminders + 动态加载的 allNotices）
            const mergedList = [...ddlReminders.value, ...allNotices.value]

            console.log('[Debug] Computing filteredDdlReminders:', {
                refreshTrigger: refreshTrigger.value,
                ddlReminders: ddlReminders.value.length,
                allNotices: allNotices.value.length,
                merged: mergedList.length,
                followedUnivs: followedUnivs.value
            })

            // 去重：根据 id 去重
            const uniqueMap = new Map()
            mergedList.forEach(item => {
                if (item?.id || item?.notice_id) {
                    const key = item.id || item.notice_id
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, item)
                    }
                }
            })

            let list = Array.from(uniqueMap.values()).filter(item => {
                const included = followedUnivs.value.includes(item.univ_name)
                if (!included) {
                    console.log(
                        '[Debug] Filtering out:',
                        item.univ_name,
                        'not in',
                        followedUnivs.value
                    )
                }
                return included
            })

            console.log('[Debug] After follow filter:', list.length)

            if (selectedUniv.value) {
                list = list.filter(
                    item => item.univ_name === selectedUniv.value
                )
            }

            const mapped = list.map(it => ({
                ...it,
                _days: getDaysLeft(it),
                _past: hasPast(it)
            }))

            // 排序：未过期的按剩余天数升序，已过期的放最后
            mapped.sort((a, b) => {
                // 如果一个过期一个没过期，没过期的排前面
                if (a._past !== b._past) {
                    return a._past ? 1 : -1
                }

                // 都未过期或都过期，按天数排序
                if (a._days === '--' && b._days === '--') return 0
                if (a._days === '--') return 1
                if (b._days === '--') return -1
                return a._days - b._days
            })

            console.log('[Debug] Final filtered list:', mapped.length)

            return mapped
        })

        const checkScreenSize = () => {
            isMobileView.value = window.innerWidth < 1200
        }

        const toStaticUrl = p => {
            if (!p) return ''
            if (p.startsWith('http')) return p
            if (p.startsWith('/static')) return p
            return '/static/' + p.replace(/^\/+/, '')
        }

        const parseDate = s => {
            if (!s) return null
            if (typeof s === 'number') return new Date(s)
            const str = String(s).trim()
            if (str.includes(' ')) return new Date(str.replace(' ', 'T'))
            if (str.includes('/')) return new Date(str.replaceAll('/', '-'))
            return new Date(str + 'T23:59:59')
        }

        // ✅ 固定起点：2025-01-01
        const BASE_DATE = new Date('2025-01-01T00:00:00')

        const calcDaysLeft = endDateStr => {
            const end = parseDate(endDateStr)
            if (!end || isNaN(end.getTime())) return '--'

            // ✅ 从固定起点算（而不是从今天算）
            const diff = end.getTime() - BASE_DATE.getTime()
            return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24))
        }

        const hasPast = item => {
            if (item?.end_date) {
                const end = parseDate(item.end_date)
                if (!end || isNaN(end.getTime())) return false

                // ✅ 是否"早于固定起点"
                return end.getTime() < BASE_DATE.getTime()
            }
            return typeof item?.days_left === 'number' && item.days_left < 0
        }

        const getDaysLeft = item => {
            if (item?.end_date) return calcDaysLeft(item.end_date)
            if (typeof item?.days_left === 'number')
                return Math.max(0, item.days_left)
            return '--'
        }

        const countdownText = item => {
            const d = getDaysLeft(item)
            if (d === '--') return '截止未知'
            if (hasPast(item) || d === 0) return '已截止'
            return `剩 ${d} 天`
        }

        // 打开通知链接
        const openNoticeLink = item => {
            if (item?.source_link) {
                // 确保链接有协议前缀
                let url = item.source_link
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url
                }
                window.open(url, '_blank')
            }
        }

        // 重置弹窗搜索筛选
        const resetModalFilters = () => {
            searchKeyword.value = ''
            selectedRegion.value = ''
        }

        // 打开弹窗时重置筛选
        const openAddModal = () => {
            resetModalFilters()
            showAddModal.value = true
        }

        // 从后端加载关注列表
        const loadFollowedUnivs = async () => {
            try {
                const res = await followListAPI(userId.value)
                console.log('[Debug] followListAPI response:', res)

                if (res?.code === 200 && Array.isArray(res.data)) {
                    // 构建映射表
                    univMap.value = {}
                    followedUnivs.value = []

                    res.data.forEach(item => {
                        // 如果后端返回了 univ_name，直接使用
                        let univName = item.univ_name

                        // 如果没有 univ_name，从 allUnivs 中查找
                        if (!univName && item.univ_id) {
                            const univ = allUnivs.value.find(
                                u => u.univ_id === item.univ_id
                            )
                            univName = univ?.univ_name
                        }

                        if (univName) {
                            followedUnivs.value.push(univName)
                            univMap.value[univName] = {
                                followId: item.id,
                                univId: item.univ_id
                            }
                        } else {
                            console.warn(
                                '[Debug] Cannot find univ_name for:',
                                item
                            )
                        }
                    })

                    console.log('[Debug] Loaded follows:', followedUnivs.value)
                    console.log('[Debug] UnivMap:', univMap.value)
                }
            } catch (e) {
                console.error('Failed to load followed univs:', e)
                showToast('加载关注列表失败', 'error')
            }
        }

        // 加载所有可用的大学列表
        const loadAllUniversities = async () => {
            try {
                // 获取所有大学（不分页，设置较大的 size）
                const res = await universitiesAPI({ page: 1, size: 1000 })
                if (res?.code === 200 && res?.data?.list) {
                    allUnivs.value = res.data.list.map(u => ({
                        univ_id: u.id,
                        univ_name: u.name,
                        logo_url: u.logo_url,
                        tags: u.tags,
                        intro: u.intro
                    }))
                    console.log(
                        '[Debug] Loaded universities:',
                        allUnivs.value.length
                    )
                }
            } catch (e) {
                console.error('Failed to load universities:', e)
            }
        }

        // 加载某个大学的通知列表
        const loadUnivNotices = async (univId, univName) => {
            try {
                console.log('[Debug] Loading notices for:', {
                    univId,
                    univName
                })
                const res = await univNoticesAPI(univId)
                console.log('[Debug] univNoticesAPI response:', res)

                if (res?.code === 200) {
                    // 后端返回的结构是 {code: 200, data: {info: {...}, notices: [...]}}
                    const noticesData = res.data?.notices || res.data

                    if (Array.isArray(noticesData)) {
                        // 给每个通知添加 univ_name 和 univ_id
                        const notices = noticesData.map(notice => ({
                            ...notice,
                            id: notice.id, // 保留原始 id
                            notice_id: notice.id, // 添加 notice_id 用于去重
                            univ_id: univId,
                            univ_name: univName
                        }))
                        console.log('[Debug] Processed notices:', notices)
                        return notices
                    }
                }
            } catch (e) {
                console.error('Failed to load notices for', univName, e)
            }
            return []
        }

        // 批量加载所有关注大学的通知
        const loadAllFollowedNotices = async () => {
            console.log(
                '[Debug] Loading all followed notices for:',
                followedUnivs.value
            )
            const noticesPromises = []

            for (const univName of followedUnivs.value) {
                const univInfo = univMap.value[univName]
                if (univInfo?.univId) {
                    noticesPromises.push(
                        loadUnivNotices(univInfo.univId, univName)
                    )
                } else {
                    console.warn('[Debug] No univId found for:', univName)
                }
            }

            const noticesArrays = await Promise.all(noticesPromises)
            // 合并所有通知
            allNotices.value = noticesArrays.flat()
            console.log(
                '[Debug] Total notices loaded:',
                allNotices.value.length
            )
            console.log('[Debug] All loaded notices:', allNotices.value)
        }

        // 切换关注状态
        const handleToggleFollow = async univName => {
            if (isLoading.value) return

            const isFollowed = followedUnivs.value.includes(univName)

            console.log('[Debug] Toggle follow:', { univName, isFollowed })

            if (isFollowed) {
                await handleRemoveFollow(univName)
            } else {
                await handleAddFollow(univName)
            }
        }

        // 添加关注
        const handleAddFollow = async univName => {
            if (isLoading.value) return

            // 检查是否已经关注
            if (followedUnivs.value.includes(univName)) {
                console.log('[Debug] Already followed:', univName)
                return // 不显示错误提示，静默返回
            }

            // 优先从 allUnivs 中查找
            let univInfo = allUnivs.value.find(u => u.univ_name === univName)

            // 兜底：从 ddlReminders 中查找
            if (!univInfo) {
                univInfo = ddlReminders.value.find(
                    item => item.univ_name === univName
                )
            }

            if (!univInfo?.univ_id) {
                console.error('Cannot find univ_id for:', univName)
                showToast('无法找到该大学信息', 'error')
                return
            }

            isLoading.value = true
            try {
                console.log('[Debug] Adding follow:', {
                    univName,
                    univ_id: univInfo.univ_id
                })

                const res = await followAddAPI({
                    user_id: userId.value,
                    univ_id: univInfo.univ_id
                })

                console.log('[Debug] Add follow response:', res)

                if (res?.code === 200) {
                    // 后端返回的 data 是 follow_id
                    const followId = res.data

                    // 确保不重复添加
                    if (!followedUnivs.value.includes(univName)) {
                        followedUnivs.value = [...followedUnivs.value, univName]
                        console.log(
                            '[Debug] Added to followedUnivs:',
                            followedUnivs.value
                        )
                    }

                    univMap.value = {
                        ...univMap.value,
                        [univName]: {
                            followId: followId,
                            univId: univInfo.univ_id
                        }
                    }

                    console.log('[Debug] Updated univMap:', univMap.value)

                    // 立即加载该大学的通知列表
                    console.log(
                        '[Debug] Starting to load notices for:',
                        univName
                    )
                    const notices = await loadUnivNotices(
                        univInfo.univ_id,
                        univName
                    )
                    console.log(
                        '[Debug] Loaded notices count:',
                        notices?.length || 0
                    )

                    if (notices && notices.length > 0) {
                        // 使用 Vue 的响应式更新方式
                        allNotices.value = [...allNotices.value, ...notices]
                        console.log(
                            '[Debug] Total allNotices after add:',
                            allNotices.value.length
                        )

                        // 强制触发计算属性重新计算
                        refreshTrigger.value++
                        console.log(
                            '[Debug] Triggered refresh:',
                            refreshTrigger.value
                        )

                        // 等待 Vue 更新 DOM
                        await nextTick()
                        console.log(
                            '[Debug] After nextTick, filteredDdlReminders count:',
                            filteredDdlReminders.value.length
                        )
                    } else {
                        console.warn('[Debug] No notices loaded for', univName)
                    }

                    await nextTick()
                    await refreshHotPosts()

                    showToast('关注成功', 'success')
                } else {
                    showToast(res?.msg || '关注失败', 'error')
                }
            } catch (e) {
                console.error('Failed to add follow:', e)
                // 如果是重复关注错误，给出更友好的提示
                if (e?.message?.includes('Duplicate')) {
                    console.log(
                        '[Debug] Duplicate follow detected, reloading follows'
                    )
                    // 重新同步关注列表
                    await loadFollowedUnivs()
                } else {
                    showToast('关注失败，请重试', 'error')
                }
            } finally {
                isLoading.value = false
            }
        }

        // 取消关注
        const handleRemoveFollow = async univName => {
            if (isLoading.value) return

            const univInfo = univMap.value[univName]
            if (!univInfo?.followId) {
                console.error('Cannot find follow_id for:', univName)
                console.log('[Debug] Current univMap:', univMap.value)
                showToast('无法找到关注记录', 'error')
                return
            }

            isLoading.value = true
            try {
                console.log('[Debug] Removing follow:', {
                    univName,
                    followId: univInfo.followId
                })

                const res = await followDeleteAPI(univInfo.followId)

                console.log('[Debug] Remove follow response:', res)

                if (res?.code === 200) {
                    // 从本地数组中移除
                    const index = followedUnivs.value.indexOf(univName)
                    if (index > -1) {
                        followedUnivs.value.splice(index, 1)
                    }

                    const univId = univMap.value[univName]?.univId
                    delete univMap.value[univName]

                    // 删除该大学的所有通知
                    if (univId) {
                        const beforeCount = allNotices.value.length
                        allNotices.value = allNotices.value.filter(
                            notice => notice.univ_id !== univId
                        )
                        const afterCount = allNotices.value.length
                        console.log(
                            '[Debug] Removed notices:',
                            beforeCount - afterCount
                        )

                        // 强制触发计算属性重新计算
                        refreshTrigger.value++
                    }

                    // 如果当前选中的是被删除的学校，清空选中
                    if (selectedUniv.value === univName) {
                        selectedUniv.value = ''
                    }
                    await nextTick()
                    await refreshHotPosts()

                    showToast('已取消关注', 'success')
                } else {
                    showToast(res?.msg || '取消关注失败', 'error')
                }
            } catch (e) {
                console.error('Failed to remove follow:', e)
                showToast('取消关注失败，请重试', 'error')
            } finally {
                isLoading.value = false
            }
        }

        const dashboardHotPosts = ref([]) // 备份 dashboard 的 hot_posts

        const normalizeHotPostsFromUniv = (list, univName) => {
            // 把 /universities/posts 的返回统一成你模板需要的字段
            return (Array.isArray(list) ? list : []).map(p => ({
                post_id: p.id ?? p.post_id,
                title: p.title,
                univ_name: univName,
                view_count: p.view_count ?? 0
            }))
        }

        const pickPostList = res => {
            // ✅ 兼容两种：1) http 已经返回业务包 {code,data}
            //            2) axios 原始包 {data:{code,data}}
            const root =
                res && typeof res === 'object' && 'code' in res
                    ? res
                    : res?.data ?? res

            const data = root?.data ?? {}

            // ✅ 常见字段：list / posts / items / 直接数组
            const list =
                (Array.isArray(data) ? data : null) ??
                (Array.isArray(data.list) ? data.list : null) ??
                (Array.isArray(data.posts) ? data.posts : null) ??
                (Array.isArray(data.items) ? data.items : null) ??
                []

            return { code: root?.code, list, raw: root }
        }

        const refreshHotPosts = async () => {
            console.log('[hotPosts] Starting refresh for:', selectedUniv.value)

            // "全部"恢复 dashboard
            if (!selectedUniv.value) {
                hotPosts.value = filterPostsByFollowed(dashboardHotPosts.value)
                console.log(
                    '[hotPosts] Restored dashboard posts:',
                    hotPosts.value.length
                )
                return
            }

            const univId =
                univMap.value?.[selectedUniv.value]?.univId ??
                allUnivs.value.find(u => u.univ_name === selectedUniv.value)
                    ?.univ_id

            console.log(
                '[hotPosts] Found univId:',
                univId,
                'for',
                selectedUniv.value
            )

            if (!univId) {
                hotPosts.value = []
                console.log('[hotPosts] No univId found, clearing posts')
                return
            }

            try {
                const res = await univPostsAPI({ univ_id: univId, keyword: '' })
                const { code, list, raw } = pickPostList(res)

                console.log(
                    '[hotPosts] API response - code:',
                    code,
                    'list length:',
                    list.length
                )

                const sorted = [...list].sort(
                    (a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)
                )

                hotPosts.value = normalizeHotPostsFromUniv(
                    sorted.slice(0, 10),
                    selectedUniv.value
                )

                console.log(
                    '[hotPosts] Updated hotPosts:',
                    hotPosts.value.length
                )
            } catch (e) {
                console.error('[hotPosts] refresh failed', e)
                hotPosts.value = []
            }
        }

        const filterPostsByFollowed = posts => {
            const set = new Set(followedUnivs.value)
            return (Array.isArray(posts) ? posts : []).filter(p => {
                const name = p.univ_name || p.university_name || p.univ || ''
                return set.has(name)
            })
        }

        const handleSelectUniv = async name => {
            selectedUniv.value = name
            // 使用 nextTick 确保 Vue 响应式系统已更新
            await nextTick()
            await refreshHotPosts()
        }

        onMounted(async () => {
            checkScreenSize()
            window.addEventListener('resize', checkScreenSize)

            const user = JSON.parse(localStorage.getItem('user_info') || '{}')
            nickname.value = user.nickname || user.username || '同学'

            const rawUserId = localStorage.getItem('user_id')
            userId.value = Number(rawUserId || user.id || 0)

            if (!userId.value) {
                console.warn('[home] userId invalid')
                showToast('用户信息无效', 'error')
                return
            }

            try {
                // 先加载所有大学列表，这样后续可以根据 univ_id 查找名称
                await loadAllUniversities()

                // 然后并行请求 dashboard 和关注列表
                const [dashboardRes, followsRes] = await Promise.all([
                    dashboardAPI(userId.value),
                    followListAPI(userId.value)
                ])

                // 处理 dashboard 数据
                const data = dashboardRes?.data ?? {}
                quote.value = data.quote || ''
                bgImageUrl.value = toStaticUrl(data.bg_image)
                ddlReminders.value = Array.isArray(data.ddl_reminders)
                    ? data.ddl_reminders
                    : []
                dashboardHotPosts.value = Array.isArray(data.hot_posts)
                    ? data.hot_posts
                    : []
                hotPosts.value = dashboardHotPosts.value

                // 如果 allUnivs 为空，尝试从 ddlReminders 构建（兜底）
                if (allUnivs.value.length === 0) {
                    const univSet = new Map()
                    ddlReminders.value.forEach(item => {
                        if (item?.univ_name && item?.univ_id) {
                            univSet.set(item.univ_name, {
                                univ_name: item.univ_name,
                                univ_id: item.univ_id
                            })
                        }
                    })
                    allUnivs.value = Array.from(univSet.values())
                }

                console.log('[Debug] Available universities:', allUnivs.value)

                // 处理关注列表
                if (
                    followsRes?.code === 200 &&
                    Array.isArray(followsRes.data)
                ) {
                    univMap.value = {}
                    followedUnivs.value = []

                    followsRes.data.forEach(item => {
                        // 如果后端返回了 univ_name，直接使用
                        let univName = item.univ_name

                        // 如果没有 univ_name，从 allUnivs 中查找
                        if (!univName && item.univ_id) {
                            const univ = allUnivs.value.find(
                                u => u.univ_id === item.univ_id
                            )
                            univName = univ?.univ_name
                        }

                        if (univName) {
                            followedUnivs.value.push(univName)
                            univMap.value[univName] = {
                                followId: item.id,
                                univId: item.univ_id
                            }
                        } else {
                            console.warn(
                                '[Debug] Cannot find univ_name for:',
                                item
                            )
                        }
                    })

                    console.log('[Debug] Initial follows:', followedUnivs.value)
                    console.log('[Debug] Initial univMap:', univMap.value)

                    // 加载所有关注大学的通知
                    if (followedUnivs.value.length > 0) {
                        await loadAllFollowedNotices()
                    }
                }
            } catch (e) {
                console.error('[home] API failed', e)
                showToast('数据加载失败', 'error')
            }
        })

        onUnmounted(() => {
            window.removeEventListener('resize', checkScreenSize)
        })

        return {
            quote,
            quoteText,
            quoteAuthor,
            bgImageUrl,
            ddlReminders,
            hotPosts,
            nickname,
            currentDay,
            daysInMonth,
            dayOfWeek,
            isMobileView,
            selectedUniv,
            followedUnivs,
            availableUnivs,
            allUnivs,
            filteredDdlReminders,
            showAddModal,
            isLoading,
            toast,
            searchKeyword,
            selectedRegion,
            availableRegions,
            filteredUnivs,
            handleToggleFollow,
            handleRemoveFollow,
            openNoticeLink,
            openAddModal,
            getDaysLeft,
            countdownText,
            hasPast,
            handleSelectUniv,
            goPostDetail
        }
    }
}
</script>

<style scoped>
.responsive-layout {
    display: flex;
    width: 100%;
    gap: 32px;
    margin: 0 auto;
    padding: 40px 16px;
    max-width: 1400px;
    justify-content: center;
    margin-top: 60px;
    background-color: var(--home-bg);
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    min-height: 100vh;
    transition: background-color 0.3s ease;
}

/* 让这个页面区域占满一屏，并且不让“整页”滚动 */
.responsive-layout {
    height: calc(100vh - 60px); /* 60px改成你顶部栏高度 */
    overflow: hidden; /* 关键：禁掉外层滚动 */
    align-items: flex-start;
}

/* 左侧不滚动 */
.left-pane {
    flex: 0 0 auto;
    width: 300px;
}

/* 右侧自己滚动 */
.right-pane {
    flex: 1;
    max-width: 900px;

    height: 100%;
    overflow-y: auto; /* 关键：右侧内部滚动 */
    padding-right: 8px; /* 防止滚动条遮挡内容，可选 */
}

.mobile-layout {
    flex-direction: column;
    align-items: center;
}

.section-container {
    display: flex;
    flex-direction: column;
}

.section-container:first-child {
    flex: 0 0 auto;
}

.section-container:last-child {
    flex: 1;
    max-width: 900px;
}

.section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--section-title-color);
    margin-bottom: 16px;
    border-left: 4px solid var(--section-title-border);
    padding-left: 12px;
    transition: color 0.3s ease, border-color 0.3s ease;
}

/* Daily Card Styles */
.daily-card {
    width: 100%;
    max-width: 450px;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--box-shadow);
    display: flex;
    flex-direction: column;
    transition: background-color 0.3s ease, border 0.3s ease,
        box-shadow 0.3s ease;
}

.card-image {
    width: 100%;
    position: relative;
    padding-bottom: 100%;
    overflow: hidden;
    background-color: #f5f5f5;
}

.card-image img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-bottom: 1px solid var(--border-color);
    transition: border-bottom 0.3s ease;
}

.card-content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.quote-text {
    white-space: pre-line;
    font-size: 16px;
    line-height: 1.8;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 16px;
    transition: color 0.3s ease;
}

.quote-author {
    font-size: 14px;
    color: var(--text-secondary);
    text-align: center;
    transition: color 0.3s ease;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    transition: border-top 0.3s ease;
}

.service-info {
    font-size: 12px;
    color: var(--text-tertiary);
    transition: color 0.3s ease;
}

.date-box {
    text-align: right;
    padding: 8px;
    border: 1px solid var(--border-color);
    transition: border 0.3s ease;
}

.date {
    font-size: 16px;
    color: var(--text-primary);
    font-weight: bold;
    transition: color 0.3s ease;
}

.day {
    font-size: 14px;
    color: var(--text-secondary);
    transition: color 0.3s ease;
}

/* Info Grid Styles */
.info-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.info-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    box-shadow: var(--box-shadow);
    transition: background-color 0.3s ease, border 0.3s ease,
        box-shadow 0.3s ease;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    transition: color 0.3s ease;
}

.star-icon {
    font-size: 20px;
}

.add-btn {
    background: #f0f7ff;
    color: #4a90e2;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.add-btn:hover {
    background: #e3f2fd;
}

.top-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}

.tag {
    background: #e8f4ff;
    color: #4a90e2;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.tag-close {
    cursor: pointer;
    font-size: 16px;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.tag-close:hover {
    opacity: 1;
}

.ddl-section {
    margin-top: 20px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.section-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.3s ease;
}

.from-label {
    font-size: 13px;
    color: var(--text-tertiary);
    transition: color 0.3s ease;
}

.ddl-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--ddl-item);
    border-radius: 12px;
    margin-bottom: 12px;
    transition: all 0.3s ease;
}

.ddl-item:hover {
    background: var(--ddl-item-hover);
    transform: translateX(4px);
}

.ddl-info {
    flex: 1;
}

.ddl-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
    transition: color 0.3s ease;
}

.ddl-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 6px;
    transition: color 0.3s ease;
}

.ddl-deadline {
    font-size: 13px;
    color: #e74c3c;
}

.ddl-countdown {
    background: linear-gradient(135deg, #ffd93d 0%, #ffaa33 100%);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
}

.posts-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.post-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: var(--ddl-item);
    border-radius: 12px;
    transition: all 0.3s ease;
    cursor: pointer;
}

.post-item:hover {
    background: var(--ddl-item-hover);
    transform: translateX(4px);
}

.post-rank {
    font-size: 18px;
    font-weight: 700;
    color: #4a90e2;
    min-width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.post-item:first-child .post-rank {
    color: #f39c12;
}

.post-item:nth-child(2) .post-rank {
    color: #95a5a6;
}

.post-item:nth-child(3) .post-rank {
    color: #cd7f32;
}

.post-content {
    flex: 1;
}

.post-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
    line-height: 1.4;
    transition: color 0.3s ease;
}

.post-meta {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-tertiary);
    transition: color 0.3s ease;
}

.post-source {
    color: var(--text-secondary);
    transition: color 0.3s ease;
}

.post-views {
    display: flex;
    align-items: center;
    gap: 4px;
}

.tag.active {
    background: #e8f1ff;
    border: 1px solid #6aa7ff;
}

.ddl-countdown.expired {
    opacity: 0.7;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    line-height: 30px;
}

.close-btn:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.univ-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.univ-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.univ-item:hover {
    background: #f5f5f5;
    border-color: #4caf50;
}

.univ-item input[type='checkbox'] {
    cursor: pointer;
}

.modal-footer {
    padding: 15px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
}

.btn-cancel {
    padding: 8px 20px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    cursor: pointer;
}

.btn-cancel:hover {
    background: #f5f5f5;
}

.empty-message {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 14px;
}

.ddl-countdown.expired {
    color: #999;
    opacity: 0.6;
}

.add-btn {
    cursor: pointer;
}

/* Toast 样式 */
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
}

.toast.success {
    background-color: #52c41a;
}

.toast.error {
    background-color: #ff4d4f;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* DDL Item 可点击样式 */
.ddl-item {
    cursor: pointer;
    transition: all 0.2s ease;
}

.ddl-item:hover {
    background-color: #f5f5f5;
    transform: translateX(4px);
}

.ddl-item:active {
    transform: translateX(2px);
}

/* Loading 和 Empty 消息样式 */
.loading-message,
.empty-message {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 14px;
}

.loading-message {
    color: #1890ff;
}
.univ-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.univ-item.disabled input {
    cursor: not-allowed;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 弹窗搜索和筛选样式 */
.modal-filters {
    padding: 0 24px 16px;
    border-bottom: 1px solid #f0f0f0;
}

.search-box {
    margin-bottom: 16px;
}

.search-input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: all 0.3s;
}

.search-input:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.search-input::placeholder {
    color: #bfbfbf;
}

.region-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 120px;
    overflow-y: auto;
}

.region-btn {
    padding: 6px 16px;
    border: 1px solid #d9d9d9;
    border-radius: 16px;
    background: white;
    color: #595959;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
}

.region-btn:hover {
    border-color: #40a9ff;
    color: #40a9ff;
}

.region-btn.active {
    background: #1890ff;
    border-color: #1890ff;
    color: white;
}

.region-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 调整弹窗主体高度 */
.modal-body {
    max-height: 350px;
    overflow-y: auto;
}

/* Responsive Styles */
@media (max-width: 1000px) {
    .responsive-layout {
        flex-direction: column;
        align-items: center;
        gap: 20px; /* 收紧两块之间间距 */
        height: auto; /* 恢复整页滚动（如果你桌面端做了右侧滚动） */
        overflow: visible;
        padding: 24px 12px; /* 收紧外边距 */
    }

    .left-pane,
    .right-pane {
        width: 100%;
        max-width: 600px;
        height: auto;
        overflow: visible;
        padding-right: 0;
    }

    /* 不要再用 first/last-child 兜底，直接对容器生效更稳 */
    .section-container {
        width: 100%;
    }
}

@media (max-width: 800px) {
    .responsive-layout {
        padding: 20px 12px;
        gap: 24px;
    }

    .section-container:first-child,
    .section-container:last-child {
        max-width: 100%;
    }

    .daily-card {
        max-width: 100%;
    }

    .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .add-btn {
        width: 100%;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .ddl-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .ddl-countdown {
        align-self: flex-end;
    }
}
</style>
