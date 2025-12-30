<template>
    <div class="profile-container">
        <div class="profile-header">
            <div class="avatar-container">
                <img
                    :src="user.avatarUrl"
                    alt="User avatar"
                    class="avatar"
                    v-if="user.avatarUrl"
                />
                <div class="avatar-placeholder" v-else>
                    {{ getInitials(user.username) }}
                </div>
            </div>
            <h1 class="username">{{ user.username }}</h1>
        </div>

        <div class="profile-details">
            <div class="detail-item">
                <div class="detail-label">本科院校</div>
                <div class="detail-value">{{ user.university }}</div>
            </div>

            <div class="detail-item">
                <div class="detail-label">专业</div>
                <div class="detail-value">{{ user.major }}</div>
            </div>

            <div class="detail-item">
                <div class="detail-label">GPA（专业排名）</div>
                <div class="detail-value gpa">
                    {{ formatGPA(user.gpa, user.ranking) }}
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-label">保研状态</div>
                <div class="detail-value status">{{ formatStatus(user.status) }}</div>
            </div>
        </div>

        <!-- 退出登录按钮 -->
        <div class="logout-container">
            <button class="logout-btn" @click="handleLogout">
                退出登录
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

// You would typically fetch this data from an API
const user = ref({
    username: 'SamHan',
    university: '武汉理工大学',
    major: '软件工程',
    gpa: '3.78 / 4.00',
    ranking: '前 5%',
    status: '夏令营准备中',
    // avatarUrl: null // Set to null to show the initials placeholder
    avatarUrl: require('../icons/avatar.png') // Set to null to show the initials placeholder
})

const handleLogout = () => {
    if (!confirm('确定要退出登录吗？')) return
    localStorage.clear()
    router.push('/login')
}

// Function to get initials from username
const getInitials = username => {
    if (!username) return ''
    return username
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
}

// Format GPA with ranking
const formatGPA = (gpa, ranking) => {
    return `${gpa}（${ranking}）`
}

// Format status
const formatStatus = status => {
    return status || '未设置'
}

// You would typically fetch user data here
onMounted(async () => {
    try {
        // Simulating API call
        // const response = await fetch('/api/user/profile');
        // user.value = await response.json();
        // For demonstration, we're using static data
        // In a real app, you'd load this from your API
    } catch (error) {
        console.error('Failed to load user profile:', error)
    }
})
</script>

<style scoped>
.profile-container {
    max-width: 800px;
    margin: 0 auto;
    margin-top: 60px;
    height: 100vh;
    padding: 2rem;
    background-color: var(--home-bg);
    border-radius: 8px;
    box-shadow: var(--box-shadow);
    color: var(--text-primary);
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.avatar-container {
    margin-right: 1.5rem;
}

.avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border-color);
}

.avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: var(--calendar-selected-bg);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
}

.username {
    font-size: 2rem;
    margin: 0;
    color: var(--text-primary);
}

.profile-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.detail-item {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background-color: var(--card-bg);
    border-radius: 6px;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
}

.detail-item:hover {
    background-color: var(--button-hover);
}

.detail-label {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    margin-bottom: 0.25rem;
}

.detail-value {
    font-size: 1.2rem;
    color: var(--text-secondary);
    font-weight: 500;
}

/* GPA value color special styling */
.detail-value.gpa {
    color: var(--time-display-color);
}

/* Status value color special styling */
.detail-value.status {
    color: #10b981;
    font-weight: 600;
}

.logout-container {
    margin-top: 2.5rem;
    display: flex;
    justify-content: center;
}

.logout-btn {
    width: 100%;
    max-width: 300px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background-color: #ef4444; /* red-500 */
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.logout-btn:hover {
    background-color: #dc2626; /* red-600 */
}

.logout-btn:active {
    transform: scale(0.98);
}


@media (max-width: 600px) {
    .profile-header {
        flex-direction: column;
        text-align: center;
    }

    .avatar-container {
        margin-right: 0;
        margin-bottom: 1rem;
    }
}
</style>