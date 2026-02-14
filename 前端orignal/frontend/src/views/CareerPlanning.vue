<template>
  <div class="career-planning">
    <div class="tab-content">
      <!-- 职业测评卡片 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>职业测评</span>
            <el-button 
              type="primary" 
              @click="startAssessment" 
              :disabled="assessmentLoading"
            >
              {{ assessmentLoading ? '测评中...' : '开始测评' }}
            </el-button>
          </div>
        </template>
        
        <!-- 测评问卷 -->
        <div v-if="questionnaire && !assessmentReport">
          <el-steps :active="currentQuestionIndex" align-center>
            <el-step 
              v-for="(dimension, index) in questionnaire.dimensions" 
              :key="index"
              :title="dimension.dimension_name"
            ></el-step>
          </el-steps>
          
          <div class="question-container" v-if="currentQuestion">
            <h3>{{ currentQuestion.question_text }}</h3>
            <el-radio-group v-model="currentAnswer" v-if="currentQuestion.question_type === 'single_choice'">
              <el-radio 
                v-for="option in currentQuestion.options" 
                :key="option.option_id"
                :label="option.option_id"
              >
                {{ option.option_text }}
              </el-radio>
            </el-radio-group>
            
            <el-checkbox-group v-model="currentAnswer" v-if="currentQuestion.question_type === 'multiple_choice'">
              <el-checkbox 
                v-for="option in currentQuestion.options" 
                :key="option.option_id"
                :label="option.option_id"
              >
                {{ option.option_text }}
              </el-checkbox>
            </el-checkbox-group>
            
            <el-rate v-model="currentAnswer" v-if="currentQuestion.question_type === 'scale'"></el-rate>
            
            <div class="question-actions">
              <el-button @click="prevQuestion" :disabled="currentQuestionIndex === 0">上一题</el-button>
              <el-button 
                type="primary" 
                @click="nextQuestion" 
                :disabled="!currentAnswer"
              >
                {{ isLastQuestion ? '提交测评' : '下一题' }}
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 测评报告 -->
        <div v-if="assessmentReport" class="report-container">
          <h3>职业测评报告</h3>
          <el-tabs v-model="activeReportTab">
            <el-tab-pane label="兴趣分析" name="interest">
              <div class="report-section">
                <h4>霍兰德职业兴趣代码: {{ assessmentReport.interest_analysis.holland_code }}</h4>
                <div class="interest-distribution">
                  <div 
                    v-for="item in assessmentReport.interest_analysis.interest_distribution" 
                    :key="item.type"
                    class="interest-item"
                  >
                    <span>{{ item.type }}: {{ item.score }}分</span>
                    <el-progress :percentage="item.score" :show-text="false"></el-progress>
                  </div>
                </div>
                <h4>适合领域</h4>
                <el-tag 
                  v-for="field in assessmentReport.interest_analysis.suitable_fields" 
                  :key="field"
                  class="field-tag"
                >
                  {{ field }}
                </el-tag>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="性格特质" name="personality">
              <div class="report-section">
                <h4>MBTI类型: {{ assessmentReport.personality_analysis.mbti_type }}</h4>
                <div 
                  v-for="trait in assessmentReport.personality_analysis.traits" 
                  :key="trait.trait_name"
                  class="trait-item"
                >
                  <h5>{{ trait.trait_name }} ({{ trait.level }})</h5>
                  <p>{{ trait.description }}</p>
                  <el-progress :percentage="trait.score" :show-text="false"></el-progress>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="职业推荐" name="recommendations">
              <div class="report-section">
                <div 
                  v-for="career in assessmentReport.recommendations.suitable_careers" 
                  :key="career.career"
                  class="career-item"
                >
                  <h4>{{ career.career }} (匹配度: {{ career.match_score }}%)</h4>
                  <ul>
                    <li v-for="reason in career.reasons" :key="reason">
                      {{ reason }}
                    </li>
                  </ul>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>
      
      <!-- 能力画像卡片 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>能力画像</span>
            <el-button 
              type="primary" 
              @click="generateAbilityProfile" 
              :disabled="profileLoading"
            >
              {{ profileLoading ? '生成中...' : '生成能力画像' }}
            </el-button>
          </div>
        </template>
        
        <div v-if="abilityProfile" class="profile-container">
          <h3>综合评分: {{ abilityProfile.overall_assessment.total_score }}分</h3>
          <p>竞争力等级: {{ abilityProfile.overall_assessment.competitiveness }}</p>
          
          <el-tabs v-model="activeProfileTab">
            <el-tab-pane label="专业技能" name="skills">
              <div class="profile-section">
                <h4>编程语言</h4>
                <div 
                  v-for="skill in abilityProfile.professional_skills.programming_languages" 
                  :key="skill.skill"
                  class="skill-item"
                >
                  <h5>{{ skill.skill }} ({{ skill.level }})</h5>
                  <p>得分: {{ skill.score }}</p>
                  <el-progress :percentage="skill.score" :show-text="false"></el-progress>
                  <div class="skill-evidence">
                    <h6>证据:</h6>
                    <ul>
                      <li v-for="evidence in skill.evidence" :key="evidence">
                        {{ evidence }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="项目经验" name="projects">
              <div class="profile-section">
                <div 
                  v-for="project in abilityProfile.practical_experience.projects" 
                  :key="project.name"
                  class="project-item"
                >
                  <h4>{{ project.name }}</h4>
                  <p>角色: {{ project.role }}</p>
                  <p>复杂度: {{ project.complexity }}</p>
                  <p>得分: {{ project.score }}</p>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>
      
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
            </div>
            
            <div class="job-actions">
              <el-button @click="viewJobDetail(match.job_id)">查看详情</el-button>
              <el-button type="primary" @click="analyzeMatch(match.job_id)">详细分析</el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getQuestionnaireAPI,
  submitAssessmentAPI,
  getAssessmentReportAPI,
  getAbilityProfileAPI,
  getRecommendJobsAPI,
  getMatchingAnalyzeAPI
} from '@/api/planning'
import { useRouter } from 'vue-router'

const router = useRouter()

// 动态广场相关数据
const questionnaire = ref(null)
const currentQuestionIndex = ref(0)
const currentAnswer = ref('')
const assessmentReport = ref(null)
const activeReportTab = ref('interest')
const assessmentLoading = ref(false)

const abilityProfile = ref(null)
const activeProfileTab = ref('skills')
const profileLoading = ref(false)

const jobMatches = ref([])
const matchingLoading = ref(false)

// 计算属性
const currentQuestion = computed(() => {
  if (!questionnaire.value) return null
  
  let questionIndex = currentQuestionIndex.value
  let dimensionIndex = 0
  
  for (const dimension of questionnaire.value.dimensions) {
    if (questionIndex < dimension.questions.length) {
      return dimension.questions[questionIndex]
    }
    questionIndex -= dimension.questions.length
    dimensionIndex++
  }
  
  return null
})

const isLastQuestion = computed(() => {
  if (!questionnaire.value) return false
  
  let totalQuestions = 0
  for (const dimension of questionnaire.value.dimensions) {
    totalQuestions += dimension.questions.length
  }
  
  return currentQuestionIndex.value === totalQuestions - 1
})

// 职业测评相关方法
const startAssessment = async () => {
  assessmentLoading.value = true
  try {
    const userId = localStorage.getItem('user_id')
    const res = await getQuestionnaireAPI(userId)
    questionnaire.value = res.data
    currentQuestionIndex.value = 0
    currentAnswer.value = ''
    assessmentReport.value = null
  } catch (error) {
    ElMessage.error('获取测评问卷失败')
  } finally {
    assessmentLoading.value = false
  }
}

const nextQuestion = () => {
  if (!currentAnswer.value) {
    ElMessage.warning('请先回答当前问题')
    return
  }
  
  if (isLastQuestion.value) {
    submitAssessment()
  } else {
    currentQuestionIndex.value++
    currentAnswer.value = ''
  }
}

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
    currentAnswer.value = ''
  }
}

const submitAssessment = async () => {
  assessmentLoading.value = true
  try {
    const userId = localStorage.getItem('user_id')
    const answers = []
    
    // 这里简化处理，实际应该收集所有答案
    answers.push({
      question_id: currentQuestion.value.question_id,
      answer: currentAnswer.value
    })
    
    const res = await submitAssessmentAPI({
      user_id: Number(userId),
      assessment_id: questionnaire.value.assessment_id,
      answers,
      time_spent: 15
    })
    
    ElMessage.success('测评提交成功，正在生成报告...')
    
    // 获取测评报告
    setTimeout(async () => {
      try {
        const reportRes = await getAssessmentReportAPI(userId, res.data.report_id)
        assessmentReport.value = reportRes.data
      } catch (error) {
        ElMessage.error('获取测评报告失败')
      }
    }, 2000)
  } catch (error) {
    ElMessage.error('提交测评失败')
  } finally {
    assessmentLoading.value = false
  }
}

// 能力画像相关方法
const generateAbilityProfile = async () => {
  profileLoading.value = true
  try {
    const userId = localStorage.getItem('user_id')
    const res = await getAbilityProfileAPI(userId)
    abilityProfile.value = res.data
    ElMessage.success('能力画像生成成功')
  } catch (error) {
    ElMessage.error('生成能力画像失败')
  } finally {
    profileLoading.value = false
  }
}

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

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.career-planning {
  padding: 20px;
  background-color: var(--home-bg);
  min-height: calc(100vh - 60px);
}

.tab-content {
  padding: 20px 0;
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

/* 职业测评样式 */
.question-container {
  padding: 20px 0;
}

.question-actions {
  margin-top: 20px;
  text-align: center;
}

.report-container {
  padding: 20px 0;
}

.report-section {
  margin-bottom: 20px;
}

.interest-item, .trait-item {
  margin-bottom: 15px;
}

.interest-distribution {
  margin: 15px 0;
}

.field-tag {
  margin-right: 10px;
  margin-bottom: 10px;
}

/* 能力画像样式 */
.profile-container {
  padding: 20px 0;
}

.profile-section {
  margin-bottom: 20px;
}

.skill-item, .project-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.skill-evidence {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 岗位匹配样式 */
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

.job-actions {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .career-planning {
    padding: 10px;
  }
}
</style>