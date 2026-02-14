<template>
  <div class="matching-page">
    <!-- 岗位匹配卡片 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>岗位匹配</span>
          <el-button 
            type="primary" 
            @click="getJobMatches" 
            :disabled="matchingLoading"
          >
            {{ matchingLoading ? '匹配中...' : '获取推荐岗位' }}
          </el-button>
        </div>
      </template>
      
      <div v-if="jobMatches.length > 0" class="matches-container">
        <div 
          v-for="match in jobMatches" 
          :key="match.job_id"
          class="job-match-item"
        >
          <div class="job-header">
            <h3>{{ match.job_name }}</h3>
            <el-tag :type="getMatchTagType(match.match_score)">
              匹配度: {{ match.match_score }}%
            </el-tag>
          </div>
          
          <div class="job-info">
            <p><strong>公司:</strong> {{ match.job_info.company }}</p>
            <p><strong>地点:</strong> {{ match.job_info.location }}</p>
            <p><strong>薪资:</strong> {{ match.job_info.salary }}</p>
            <p><strong>经验要求:</strong> {{ match.job_info.experience_requirement }}</p>
            <p><strong>学历要求:</strong> {{ match.job_info.education_requirement }}</p>
          </div>
          
          <div class="match-highlights">
            <h4>匹配亮点</h4>
            <ul>
              <li v-for="highlight in match.highlights" :key="highlight">
                {{ highlight }}
              </li>
            </ul>
          </div>
          
          <div class="match-gaps">
            <h4>能力差距</h4>
            <ul>
              <li v-for="gap in match.gaps" :key="gap.gap">
                {{ gap.gap }} ({{ gap.importance }}) - {{ gap.suggestion }}
              </li>
            </ul>
          </div>
          
          <div class="job-description">
            <h4>职位描述</h4>
            <p>{{ match.job_info.description }}</p>
          </div>
          
          <div class="job-requirements">
            <h4>任职要求</h4>
            <ul>
              <li v-for="requirement in match.job_info.requirements" :key="requirement">
                {{ requirement }}
              </li>
            </ul>
          </div>
          
          <div class="job-actions">
            <el-button @click="viewJobDetail(match.job_id)">查看详情</el-button>
            <el-button type="primary" @click="analyzeMatch(match.job_id)">详细分析</el-button>
            <el-button type="success" @click="applyJob(match.job_id)">申请职位</el-button>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <el-empty description="暂无岗位匹配数据">
          <el-button type="primary" @click="getJobMatches">获取推荐岗位</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  getRecommendJobsAPI,
  getMatchingAnalyzeAPI
} from '@/api/planning'

const router = useRouter()

// 岗位匹配相关数据
const jobMatches = ref([])
const matchingLoading = ref(false)

// 岗位匹配相关方法
const getJobMatches = async () => {
  matchingLoading.value = true
  try {
    const userId = localStorage.getItem('user_id')
    const res = await getRecommendJobsAPI(userId)
    jobMatches.value = res.data.recommendations
    ElMessage.success('获取推荐岗位成功')
  } catch (error) {
    ElMessage.error('获取推荐岗位失败')
  } finally {
    matchingLoading.value = false
  }
}

const getMatchTagType = (score) => {
  if (score >= 90) return 'success'
  if (score >= 80) return 'warning'
  return 'info'
}

const viewJobDetail = (jobId) => {
  // 查看岗位详情
  router.push({ path: `/main/position/${jobId}` })
}

const analyzeMatch = async (jobId) => {
  try {
    const userId = localStorage.getItem('user_id')
    const res = await getMatchingAnalyzeAPI(userId, jobId)
    // 显示详细分析结果
    ElMessageBox.alert(JSON.stringify(res.data, null, 2), '岗位匹配分析', {
      confirmButtonText: '确定'
    })
  } catch (error) {
    ElMessage.error('获取匹配分析失败')
  }
}

const applyJob = (jobId) => {
  ElMessageBox.confirm('确定要申请这个职位吗？', '申请职位', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    ElMessage.success('职位申请已提交')
  }).catch(() => {
    // 用户取消申请
  })
}

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.matching-page {
  padding: 20px;
  padding-top: 80px; /* 增加顶部内边距，避免被导航栏遮挡 */
  background-color: var(--home-bg);
  min-height: calc(100vh - 60px);
}

.section-card {
  margin-bottom: 20px;
  box-shadow: var(--box-shadow);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.section-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.matches-container {
  padding: 20px 0;
}

.job-match-item {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.job-match-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.job-info {
  margin-bottom: 15px;
}

.job-info p {
  margin-bottom: 5px;
}

.match-highlights, .match-gaps, .job-description, .job-requirements {
  margin-bottom: 15px;
}

.match-highlights h4, .match-gaps h4, .job-description h4, .job-requirements h4 {
  margin-bottom: 10px;
}

.match-highlights ul, .match-gaps ul, .job-requirements ul {
  margin: 0;
  padding-left: 20px;
}

.match-highlights li, .match-gaps li, .job-requirements li {
  margin-bottom: 5px;
}

.job-actions {
  text-align: right;
}

.job-actions .el-button {
  margin-left: 10px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .matching-page {
    padding: 10px;
  }
  
  .job-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .job-actions {
    text-align: left;
  }
  
  .job-actions .el-button {
    margin: 5px 5px 5px 0;
  }
}
</style>