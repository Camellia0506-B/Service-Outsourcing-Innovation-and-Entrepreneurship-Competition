<template>
    <div class="responsive-layout" :class="{ 'mobile-layout': isMobileView }">
        <!-- Daily Card Section -->
        <div class="section-container left-pane">
            <h2 class="section-title">欢迎samhan！</h2>
            <div class="daily-card">
                <div class="card-image">
                    <img src="/images/bgi.jpg" alt="Daily inspiration" />
                </div>
                <div class="card-content">
                    <p class="quote-text">
                        星光不问赶路人，<br />
                        时光不负有心人。
                    </p>
                    <p class="quote-author">——大冰《我不》</p>
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
                        <button class="add-btn">+ 添加关注</button>
                    </div>
                    <div class="tags-container">
                        <span class="tag"
                            >清华大学 | 计算机系
                            <span class="tag-close">×</span></span
                        >
                        <span class="tag"
                            >复旦大学 | 软件学院
                            <span class="tag-close">×</span></span
                        >
                    </div>

                    <div class="ddl-section">
                        <div class="section-header">
                            <span class="section-label">临近 DDL 提醒</span>
                            <span class="from-label">来自关注列表</span>
                        </div>

                        <div class="ddl-item">
                            <div class="ddl-info">
                                <div class="ddl-title">复旦大学 - 软件学院</div>
                                <div class="ddl-subtitle">
                                    2025年预推免招生简章
                                </div>
                                <div class="ddl-deadline">
                                    截止: 2025-06-01
                                </div>
                            </div>
                            <div class="ddl-countdown">剩 212 天</div>
                        </div>

                        <div class="ddl-item">
                            <div class="ddl-info">
                                <div class="ddl-title">清华大学 - 计算机系</div>
                                <div class="ddl-subtitle">
                                    2025年优秀大学生夏令营报名通知
                                </div>
                                <div class="ddl-deadline">
                                    截止: 2025-05-20
                                </div>
                            </div>
                            <div class="ddl-countdown">剩 224 天</div>
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
                        <div class="post-item">
                            <span class="post-rank">1</span>
                            <div class="post-content">
                                <div class="post-title">
                                    求问清华计算机系面试流程
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">清华大学</span>
                                    <span class="post-views">👁 2100</span>
                                </div>
                            </div>
                        </div>

                        <div class="post-item">
                            <span class="post-rank">2</span>
                            <div class="post-content">
                                <div class="post-title">
                                    避雷！今年夏令营机试难度极大
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">清华大学</span>
                                    <span class="post-views">👁 1205</span>
                                </div>
                            </div>
                        </div>

                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-item">
                            <span class="post-rank">3</span>
                            <div class="post-content">
                                <div class="post-title">
                                    复旦软院夏令营入营名单公布
                                </div>
                                <div class="post-meta">
                                    <span class="post-source">复旦大学</span>
                                    <span class="post-views">👁 890</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { themeEventBus } from '@/utils/themeEvent'

export default {
    name: 'CalendarWithDailyCard',

    setup() {
        const currentDate = ref(new Date())
        const isMobileView = ref(false)

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

        const checkScreenSize = () => {
            isMobileView.value = window.innerWidth < 1200
        }

        const applyThemeToHomePage = () => {
            // Theme changes handled by CSS variables
        }

        onMounted(() => {
            checkScreenSize()
            window.addEventListener('resize', checkScreenSize)
            themeEventBus.on('themeChanged', applyThemeToHomePage)

            const currentTheme = localStorage.getItem('theme') || 'light'
            if (currentTheme === 'dark') {
                applyThemeToHomePage('dark')
            }
        })

        onUnmounted(() => {
            window.removeEventListener('resize', checkScreenSize)
            themeEventBus.off('themeChanged', applyThemeToHomePage)
        })

        return {
            currentDay,
            daysInMonth,
            dayOfWeek,
            isMobileView
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
  overflow: hidden;           /* 关键：禁掉外层滚动 */
  align-items: flex-start;
}

/* 左侧不滚动 */
.left-pane {
  flex: 0 0 auto;
  width: 300px
}

/* 右侧自己滚动 */
.right-pane {
  flex: 1;
  max-width: 900px;

  height: 100%;
  overflow-y: auto;  /* 关键：右侧内部滚动 */
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

/* Responsive Styles */
@media (max-width: 1000px) {
  .responsive-layout {
    flex-direction: column;
    align-items: center;
    gap: 20px;          /* 收紧两块之间间距 */
    height: auto;       /* 恢复整页滚动（如果你桌面端做了右侧滚动） */
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