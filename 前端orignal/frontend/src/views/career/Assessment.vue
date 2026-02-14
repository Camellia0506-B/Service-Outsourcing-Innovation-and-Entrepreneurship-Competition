<template>
  <div class="assessment-page">
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
          
          <el-checkbox-group v-model="currentMultipleAnswer" v-if="currentQuestion.question_type === 'multiple_choice'">
            <el-checkbox 
              v-for="option in currentQuestion.options" 
              :key="option.option_id"
              :label="option.option_id"
            >
              {{ option.option_text }}
            </el-checkbox>
          </el-checkbox-group>
          
          <el-rate v-model="currentScaleAnswer" v-if="currentQuestion.question_type === 'scale'"></el-rate>
          
          <div class="question-actions">
            <el-button @click="prevQuestion" :disabled="currentQuestionIndex === 0">上一题</el-button>
            <el-button 
              type="primary" 
              @click="nextQuestion" 
              :disabled="!hasAnswer"
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getQuestionnaireAPI,
  submitAssessmentAPI,
  getAssessmentReportAPI
} from '@/api/planning'

// 职业测评相关数据
const questionnaire = ref(null)
const currentQuestionIndex = ref(0)
const currentAnswer = ref('')
const currentMultipleAnswer = ref([]) // 用于多选题
const currentScaleAnswer = ref(0) // 用于评分题
const assessmentReport = ref(null)
const activeReportTab = ref('interest')
const assessmentLoading = ref(false)
const allAnswers = ref([]) // 存储所有答案

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

// 检查当前问题是否有答案
const hasAnswer = computed(() => {
  if (!currentQuestion.value) return false
  
  switch (currentQuestion.value.question_type) {
    case 'single_choice':
      return currentAnswer.value !== ''
    case 'multiple_choice':
      return currentMultipleAnswer.value.length > 0
    case 'scale':
      return currentScaleAnswer.value > 0
    default:
      return false
  }
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
    currentMultipleAnswer.value = []
    currentScaleAnswer.value = 0
    allAnswers.value = []
    assessmentReport.value = null
  } catch (error) {
    ElMessage.error('获取测评问卷失败')
  } finally {
    assessmentLoading.value = false
  }
}

const nextQuestion = () => {
  if (!hasAnswer.value) {
    ElMessage.warning('请先回答当前问题')
    return
  }
  
  // 保存当前问题的答案
  if (currentQuestion.value) {
    let answer
    switch (currentQuestion.value.question_type) {
      case 'single_choice':
        answer = currentAnswer.value
        break
      case 'multiple_choice':
        answer = currentMultipleAnswer.value
        break
      case 'scale':
        answer = currentScaleAnswer.value
        break
      default:
        answer = null
    }
    
    allAnswers.value.push({
      question_id: currentQuestion.value.question_id,
      answer: answer
    })
  }
  
  if (isLastQuestion.value) {
    submitAssessment()
  } else {
    currentQuestionIndex.value++
    // 重置答案
    currentAnswer.value = ''
    currentMultipleAnswer.value = []
    currentScaleAnswer.value = 0
  }
}

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
    // 恢复上一题的答案
    if (allAnswers.value[currentQuestionIndex.value]) {
      const prevAnswer = allAnswers.value[currentQuestionIndex.value].answer
      if (Array.isArray(prevAnswer)) {
        currentMultipleAnswer.value = prevAnswer
      } else if (typeof prevAnswer === 'number') {
        currentScaleAnswer.value = prevAnswer
      } else {
        currentAnswer.value = prevAnswer
      }
    } else {
      // 如果没有保存的答案，重置
      currentAnswer.value = ''
      currentMultipleAnswer.value = []
      currentScaleAnswer.value = 0
    }
  }
}

const submitAssessment = async () => {
  assessmentLoading.value = true
  try {
    const userId = localStorage.getItem('user_id')
    
    const res = await submitAssessmentAPI({
      user_id: Number(userId),
      assessment_id: questionnaire.value.assessment_id,
      answers: allAnswers.value,
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

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.assessment-page {
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

.career-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .assessment-page {
    padding: 10px;
  }
}
</style>