<template>
  <div class="profile-page">
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
              
              <h4>框架和工具</h4>
              <div 
                v-for="skill in abilityProfile.professional_skills.frameworks_tools" 
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
              
              <h4>领域知识</h4>
              <div 
                v-for="domain in abilityProfile.professional_skills.domain_knowledge" 
                :key="domain.domain"
                class="skill-item"
              >
                <h5>{{ domain.domain }} ({{ domain.level }})</h5>
                <p>得分: {{ domain.score }}</p>
                <el-progress :percentage="domain.score" :show-text="false"></el-progress>
                <div class="skill-evidence">
                  <h6>证据:</h6>
                  <ul>
                    <li v-for="evidence in domain.evidence" :key="evidence">
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
          
          <el-tab-pane label="实习经历" name="internships">
            <div class="profile-section">
              <div 
                v-for="internship in abilityProfile.practical_experience.internships" 
                :key="internship.company"
                class="internship-item"
              >
                <h4>{{ internship.company }} - {{ internship.position }}</h4>
                <p>时长: {{ internship.duration }}</p>
                <div class="achievements">
                  <h5>主要成就:</h5>
                  <ul>
                    <li v-for="achievement in internship.achievements" :key="achievement">
                      {{ achievement }}
                    </li>
                  </ul>
                </div>
                <p>得分: {{ internship.score }}</p>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="证书奖项" name="certificates">
            <div class="profile-section">
              <div 
                v-for="certificate in abilityProfile.certificates.items" 
                :key="certificate.name"
                class="certificate-item"
              >
                <h4>{{ certificate.name }}</h4>
                <p>级别: {{ certificate.level }}</p>
                <p>获得时间: {{ certificate.issue_date }}</p>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="创新能力" name="innovation">
            <div class="profile-section">
              <div 
                v-for="project in abilityProfile.innovation_ability.projects" 
                :key="project.name"
                class="innovation-item"
              >
                <h4>{{ project.name }}</h4>
                <div class="innovation-points">
                  <h5>创新点:</h5>
                  <ul>
                    <li v-for="point in project.innovation_points" :key="point">
                      {{ point }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <div v-else class="empty-state">
        <el-empty description="暂无能力画像数据">
          <el-button type="primary" @click="generateAbilityProfile">生成能力画像</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAbilityProfileAPI } from '@/api/planning'

// 能力画像相关数据
const abilityProfile = ref(null)
const activeProfileTab = ref('skills')
const profileLoading = ref(false)

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

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.profile-page {
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

.profile-container {
  padding: 20px 0;
}

.profile-section {
  margin-bottom: 20px;
}

.skill-item, .project-item, .internship-item, .certificate-item, .innovation-item {
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

.achievements, .innovation-points {
  margin-top: 10px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-page {
    padding: 10px;
  }
}
</style>