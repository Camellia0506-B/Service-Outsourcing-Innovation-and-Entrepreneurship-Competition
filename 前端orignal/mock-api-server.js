// 简单的模拟API服务器，用于测试前端效果
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
const port = 5000

// 中间件
app.use(cors())
app.use(express.json())
app.use('/static', express.static(path.join(__dirname, 'public')))

// 配置multer用于文件上传
const upload = multer({ dest: 'uploads/' })

// 模拟用户数据
const users = [
  {
    user_id: 10001,
    username: 'testuser',
    password: '123456',
    nickname: '测试用户',
    avatar: '/images/avatar.png',
    token: 'mock_token_12345',
    profile_completed: true,
    assessment_completed: false
  }
]

// 模拟个人档案数据
const mockProfile = {
  user_id: 10001,
  basic_info: {
    nickname: '测试用户',
    avatar: '/images/avatar.png',
    gender: '男',
    birth_date: '2000-01-01',
    phone: '13800138000',
    email: 'test@example.com'
  },
  education_info: {
    school: '北京大学',
    major: '计算机科学与技术',
    degree: '本科',
    grade: '2021级',
    expected_graduation: '2026-06',
    gpa: '3.8/4.0'
  },
  skills: [
    {
      category: '编程语言',
      items: ['Python', 'Java', 'JavaScript']
    }
  ],
  profile_completeness: 85,
  updated_at: '2026-02-14 15:30:00'
}

// 模拟测评问卷
const mockQuestionnaire = {
  assessment_id: 'assess_20260214_10001',
  total_questions: 10,
  estimated_time: 15,
  dimensions: [
    {
      dimension_id: 'interest',
      dimension_name: '职业兴趣',
      questions: [
        {
          question_id: 'q001',
          question_text: '你更喜欢哪种工作方式？',
          question_type: 'single_choice',
          options: [
            { option_id: 'A', option_text: '独立完成任务' },
            { option_id: 'B', option_text: '团队协作完成' },
            { option_id: 'C', option_text: '两者都可以' }
          ]
        }
      ]
    }
  ]
}

// 模拟测评报告
const mockAssessmentReport = {
  report_id: 'report_20260214_10001',
  user_id: 10001,
  assessment_date: '2026-02-14',
  status: 'completed',
  interest_analysis: {
    holland_code: 'RIA',
    primary_interest: {
      type: '研究型(I)',
      score: 85,
      description: '喜欢观察、学习、研究、分析、评估和解决问题'
    },
    interest_distribution: [
      { type: '研究型(I)', score: 85 },
      { type: '实用型(R)', score: 72 },
      { type: '艺术型(A)', score: 65 }
    ],
    suitable_fields: ['软件开发', '数据分析', '算法工程师', '人工智能研发']
  },
  personality_analysis: {
    mbti_type: 'INTJ',
    traits: [
      {
        trait_name: '外向性',
        score: 45,
        level: '偏内向',
        description: '更倾向于独立思考和深度工作'
      }
    ]
  },
  ability_analysis: {
    strengths: [
      {
        ability: '逻辑分析能力',
        score: 88,
        description: '擅长发现问题本质和规律'
      }
    ],
    areas_to_improve: [
      {
        ability: '沟通表达能力',
        score: 62,
        suggestions: ['多参加团队讨论和技术分享']
      }
    ]
  },
  recommendations: {
    suitable_careers: [
      {
        career: '算法工程师',
        match_score: 92,
        reasons: ['与你的研究型兴趣高度匹配']
      }
    ]
  }
}

// 模拟能力画像
const mockAbilityProfile = {
  user_id: 10001,
  profile_id: 'profile_10001',
  generated_at: '2026-02-14 11:00:00',
  basic_info: {
    education: '本科',
    major: '计算机科学与技术',
    school: '北京大学',
    gpa: '3.8/4.0',
    expected_graduation: '2026-06'
  },
  professional_skills: {
    programming_languages: [
      {
        skill: 'Python',
        level: '熟练',
        evidence: ['3个Python项目经验'],
        score: 85
      }
    ],
    overall_score: 78
  },
  overall_assessment: {
    total_score: 76,
    percentile: 78,
    completeness: 90,
    competitiveness: '中上',
    strengths: ['学习能力强，GPA优秀'],
    weaknesses: ['缺少技术证书']
  }
}

// 模拟岗位匹配
const mockJobMatches = {
  total_matched: 45,
  recommendations: [
    {
      job_id: 'job_001',
      job_name: '算法工程师',
      match_score: 92,
      match_level: '高度匹配',
      job_info: {
        company: '字节跳动',
        location: '北京',
        salary: '20k-35k',
        experience: '应届生/1年经验'
      },
      highlights: ['学习能力强，符合岗位高要求'],
      gaps: [
        {
          gap: '缺少Spark大数据处理经验',
          importance: '重要',
          suggestion: '可通过在线课程1-2个月学习'
        }
      ]
    }
  ]
}

// 模拟职业规划报告
const mockCareerReport = {
  report_id: 'report_career_20260214_10001',
  user_id: 10001,
  generated_at: '2026-02-14 12:00:00',
  status: 'completed',
  metadata: {
    version: 'v1.0',
    ai_model: 'claude-sonnet-4',
    confidence_score: 0.91,
    completeness: 95
  },
  section_1_job_matching: {
    title: '职业探索与岗位匹配',
    recommended_careers: [
      {
        career: '算法工程师',
        match_score: 92,
        match_analysis: {
          why_suitable: ['你的研究型兴趣与算法岗位高度契合']
        }
      }
    ]
  },
  section_2_career_path: {
    title: '职业目标设定与职业路径规划',
    short_term_goal: {
      timeline: '2026.06 - 2026.06',
      primary_goal: '成功入职算法工程师岗位，完成职业起步'
    },
    career_roadmap: {
      stages: [
        {
          stage: '初级算法工程师',
          period: '1-2年',
          key_responsibilities: ['完成分配的算法开发任务']
        }
      ]
    }
  },
  section_3_action_plan: {
    title: '行动计划与成果展示',
    short_term_plan: {
      period: '2026.02 - 2026.08',
      goal: '补齐能力短板，冲刺校招offer',
      monthly_plans: [
        {
          month: '2026.02 - 2026.03',
          focus: '技能提升',
          tasks: [
            {
              task: '深度学习进阶',
              具体行动: ['完成斯坦福CS231n课程'],
              预期成果: '掌握深度学习核心算法'
            }
          ]
        }
      ]
    }
  }
}

// API路由

// 1. 身份认证模块
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body
  const user = users.find(u => u.username === username && u.password === password)
  
  if (user) {
    res.json({
      code: 200,
      msg: '登录成功',
      data: user
    })
  } else {
    res.status(400).json({
      code: 400,
      msg: '用户名或密码错误',
      data: null
    })
  }
})

app.post('/api/v1/auth/register', (req, res) => {
  const { username, password, nickname } = req.body
  
  // 简单模拟注册成功
  const newUser = {
    user_id: users.length + 10001,
    username,
    nickname: nickname || username,
    avatar: '/images/avatar.png',
    token: 'mock_token_' + Date.now(),
    profile_completed: false,
    assessment_completed: false
  }
  
  users.push(newUser)
  
  res.json({
    code: 200,
    msg: '注册成功',
    data: newUser
  })
})

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({
    code: 200,
    msg: '退出成功',
    data: null
  })
})

// 2. 个人档案模块
app.post('/api/v1/profile/info', (req, res) => {
  const { user_id } = req.body
  
  res.json({
    code: 200,
    msg: 'success',
    data: mockProfile
  })
})

app.post('/api/v1/profile/update', (req, res) => {
  res.json({
    code: 200,
    msg: '档案更新成功',
    data: {
      profile_completeness: 90,
      updated_at: '2026-02-14 10:45:00'
    }
  })
})

// 3. 职业测评模块
app.post('/api/v1/assessment/questionnaire', (req, res) => {
  res.json({
    code: 200,
    msg: 'success',
    data: mockQuestionnaire
  })
})

app.post('/api/v1/assessment/submit', (req, res) => {
  res.json({
    code: 200,
    msg: '测评提交成功，正在生成报告...',
    data: {
      report_id: 'report_20260214_10001',
      status: 'processing'
    }
  })
})

app.post('/api/v1/assessment/report', (req, res) => {
  res.json({
    code: 200,
    msg: 'success',
    data: mockAssessmentReport
  })
})

// 5. 学生能力画像模块
app.post('/api/v1/student/ability-profile', (req, res) => {
  res.json({
    code: 200,
    msg: 'success',
    data: mockAbilityProfile
  })
})

app.post('/api/v1/student/ai-generate-profile', (req, res) => {
  res.json({
    code: 200,
    msg: 'AI画像生成中...',
    data: {
      task_id: 'stu_gen_20260214_10001',
      status: 'processing'
    }
  })
})

// 6. 人岗匹配模块
app.post('/api/v1/matching/recommend-jobs', (req, res) => {
  res.json({
    code: 200,
    msg: 'success',
    data: mockJobMatches
  })
})

app.post('/api/v1/matching/analyze', (req, res) => {
  const { job_id } = req.body
  const job = mockJobMatches.recommendations.find(j => j.job_id === job_id)
  
  if (job) {
    res.json({
      code: 200,
      msg: 'success',
      data: job
    })
  } else {
    res.status(404).json({
      code: 404,
      msg: '岗位不存在',
      data: null
    })
  }
})

// 4. 岗位画像模块
app.post('/api/v1/job/profile/detail', (req, res) => {
  const { job_id } = req.body
  
  // 模拟岗位详情
  const jobDetail = {
    job_id,
    job_name: '算法工程师',
    job_code: 'ALG001',
    basic_info: {
      industry: '互联网',
      level: '初级',
      avg_salary: '15k-25k',
      work_locations: ['北京', '上海', '深圳', '杭州'],
      description: '负责机器学习算法的研究、开发和优化，解决实际业务问题'
    }
  }
  
  res.json({
    code: 200,
    msg: 'success',
    data: jobDetail
  })
})

// 7. 职业规划报告模块
app.post('/api/v1/career/generate-report', (req, res) => {
  res.json({
    code: 200,
    msg: '报告生成中，预计需要30秒...',
    data: {
      report_id: 'report_career_20260214_10001',
      status: 'processing'
    }
  })
})

app.post('/api/v1/career/report', (req, res) => {
  res.json({
    code: 200,
    msg: 'success',
    data: mockCareerReport
  })
})

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, 'frontend/public/images')))

// 创建必要的目录
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// 启动服务器
app.listen(port, () => {
  console.log(`模拟API服务器运行在 http://localhost:${port}`)
  console.log('API基础路径: http://localhost:5000/api/v1')
})