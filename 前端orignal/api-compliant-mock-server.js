// 完全符合API文档的模拟API服务器
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

const port = 5000

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

// 模拟个人档案数据 - 完全符合API文档2.1
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
    },
    {
      category: '框架工具',
      items: ['React', 'Django', 'Docker']
    },
    {
      category: '数据技能',
      items: ['SQL', 'Pandas', 'NumPy']
    }
  ],
  certificates: [
    {
      name: '全国计算机等级考试二级',
      issue_date: '2023-03',
      cert_url: '/uploads/certs/10001_ncre.pdf'
    }
  ],
  internships: [
    {
      company: '腾讯科技',
      position: '前端开发实习生',
      start_date: '2024-06',
      end_date: '2024-09',
      description: '负责移动端H5页面开发'
    }
  ],
  projects: [
    {
      name: '校园社交平台',
      role: '项目负责人',
      start_date: '2023-09',
      end_date: '2024-01',
      description: '基于React和Node.js开发的校园社交应用',
      tech_stack: ['React', 'Node.js', 'MongoDB']
    }
  ],
  awards: [
    {
      name: '国家奖学金',
      level: '国家级',
      date: '2023-11'
    }
  ],
  profile_completeness: 85,
  updated_at: '2026-02-14 15:30:00'
}

// 模拟测评问卷 - 完全符合API文档3.1
const mockQuestionnaire = {
  assessment_id: 'assess_20260214_10001',
  total_questions: 50,
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
    },
    {
      dimension_id: 'personality',
      dimension_name: '性格特质',
      questions: [
        {
          question_id: 'q002',
          question_text: '你在社交场合通常表现如何？',
          question_type: 'single_choice',
          options: [
            { option_id: 'A', option_text: '活跃健谈' },
            { option_id: 'B', option_text: '安静观察' },
            { option_id: 'C', option_text: '视情况而定' }
          ]
        }
      ]
    },
    {
      dimension_id: 'ability',
      dimension_name: '能力倾向',
      questions: [
        {
          question_id: 'q003',
          question_text: '你学习新技术的速度如何？',
          question_type: 'scale',
          options: [
            { option_id: '1', option_text: '很慢' },
            { option_id: '2', option_text: '较慢' },
            { option_id: '3', option_text: '一般' },
            { option_id: '4', option_text: '较快' },
            { option_id: '5', option_text: '很快' }
          ]
        }
      ]
    },
    {
      dimension_id: 'values',
      dimension_name: '职业价值观',
      questions: [
        {
          question_id: 'q004',
          question_text: '你最看重工作中的什么？',
          question_type: 'multiple_choice',
          options: [
            { option_id: 'A', option_text: '高收入' },
            { option_id: 'B', option_text: '工作稳定' },
            { option_id: 'C', option_text: '成长机会' },
            { option_id: 'D', option_text: '工作生活平衡' }
          ]
        }
      ]
    }
  ]
}

// 模拟测评报告 - 完全符合API文档3.3
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
      { type: '艺术型(A)', score: 65 },
      { type: '社会型(S)', score: 58 },
      { type: '企业型(E)', score: 45 },
      { type: '常规型(C)', score: 38 }
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
      },
      {
        trait_name: '开放性',
        score: 82,
        level: '高',
        description: '对新事物充满好奇，善于学习新技能'
      },
      {
        trait_name: '尽责性',
        score: 78,
        level: '高',
        description: '做事认真负责，注重细节'
      },
      {
        trait_name: '宜人性',
        score: 65,
        level: '中等',
        description: '待人友善，能够与他人合作'
      },
      {
        trait_name: '神经质',
        score: 42,
        level: '低',
        description: '情绪稳定，抗压能力强'
      }
    ]
  },
  ability_analysis: {
    strengths: [
      {
        ability: '逻辑分析能力',
        score: 88,
        description: '擅长发现问题本质和规律'
      },
      {
        ability: '学习能力',
        score: 85,
        description: '能够快速掌握新知识和技能'
      },
      {
        ability: '创新能力',
        score: 78,
        description: '能够提出新颖的解决方案'
      }
    ],
    areas_to_improve: [
      {
        ability: '沟通表达能力',
        score: 62,
        suggestions: [
          '多参加团队讨论和技术分享',
          '练习清晰表达技术方案'
        ]
      },
      {
        ability: '领导协调能力',
        score: 58,
        suggestions: [
          '尝试担任项目负责人',
          '学习团队管理技巧'
        ]
      }
    ]
  },
  values_analysis: {
    top_values: [
      {
        value: '成就感',
        score: 90,
        description: '追求技术突破和个人成长'
      },
      {
        value: '学习发展',
        score: 88,
        description: '重视持续学习和能力提升'
      },
      {
        value: '自主性',
        score: 82,
        description: '喜欢独立工作，有决策自由'
      }
    ]
  },
  recommendations: {
    suitable_careers: [
      {
        career: '算法工程师',
        match_score: 92,
        reasons: [
          '与你的研究型兴趣高度匹配',
          '充分发挥逻辑分析和学习能力',
          '符合追求成就感的价值观'
        ]
      },
      {
        career: '后端开发工程师',
        match_score: 87,
        reasons: [
          '技术深度与你的学习能力匹配',
          '逻辑思维能力是核心要求',
          '有明确的技术成长路径'
        ]
      },
      {
        career: '数据科学家',
        match_score: 83,
        reasons: [
          '研究型特质适合数据分析',
          '需要持续学习新技术',
          '能带来成就感'
        ]
      }
    ],
    development_suggestions: [
      '加强沟通表达能力的训练',
      '多参与团队项目提升协作能力',
      '保持技术深度的同时拓展技术广度',
      '培养一定的领导力和项目管理能力'
    ]
  }
}

// 模拟岗位画像列表 - 完全符合API文档4.1
const mockJobProfiles = {
  total: 120,
  page: 1,
  size: 20,
  list: [
    {
      job_id: 'job_001',
      job_name: '算法工程师',
      job_code: 'ALG001',
      industry: '互联网',
      level: '初级',
      avg_salary: '15k-25k',
      description: '负责机器学习算法的研究、开发和优化',
      demand_score: 85,
      growth_trend: '上升',
      tags: ['人工智能', '机器学习', 'Python'],
      created_at: '2026-01-15'
    },
    {
      job_id: 'job_002',
      job_name: '前端开发工程师',
      job_code: 'FE001',
      industry: '互联网',
      level: '初级',
      avg_salary: '12k-20k',
      description: '负责Web前端界面开发与交互实现',
      demand_score: 90,
      growth_trend: '平稳',
      tags: ['JavaScript', 'React', 'Vue'],
      created_at: '2026-01-15'
    },
    {
      job_id: 'job_003',
      job_name: '产品经理',
      job_code: 'PM001',
      industry: '互联网',
      level: '初级',
      avg_salary: '15k-25k',
      description: '负责产品规划、设计和项目管理',
      demand_score: 88,
      growth_trend: '上升',
      tags: ['产品设计', '项目管理', '需求分析'],
      created_at: '2026-01-15'
    }
  ]
}

// 模拟岗位详细画像 - 完全符合API文档4.2
const mockJobProfileDetail = {
  job_id: 'job_001',
  job_name: '算法工程师',
  job_code: 'ALG001',
  basic_info: {
    industry: '互联网',
    level: '初级',
    avg_salary: '15k-25k',
    work_locations: ['北京', '上海', '深圳', '杭州'],
    company_scales: ['100-500人', '500-2000人', '2000人以上'],
    description: '负责机器学习算法的研究、开发和优化，解决实际业务问题'
  },
  requirements: {
    basic_requirements: {
      education: {
        level: '本科及以上',
        preferred_majors: [
          '计算机科学与技术',
          '软件工程',
          '人工智能',
          '数学与应用数学'
        ],
        weight: 0.15
      },
      gpa: {
        min_requirement: '3.0/4.0',
        preferred: '3.5/4.0以上',
        weight: 0.05
      }
    },
    professional_skills: {
      programming_languages: [
        {
          skill: 'Python',
          level: '熟练',
          importance: '必需',
          weight: 0.10
        },
        {
          skill: 'C++',
          level: '熟悉',
          importance: '重要',
          weight: 0.05
        }
      ],
      frameworks_tools: [
        {
          skill: 'TensorFlow/PyTorch',
          level: '熟练',
          importance: '必需',
          weight: 0.15
        },
        {
          skill: 'Scikit-learn',
          level: '熟悉',
          importance: '重要',
          weight: 0.08
        }
      ],
      algorithms_theory: [
        {
          skill: '机器学习算法',
          level: '熟练',
          importance: '必需',
          weight: 0.12
        },
        {
          skill: '深度学习',
          level: '熟悉',
          importance: '重要',
          weight: 0.10
        }
      ],
      total_weight: 0.40
    },
    certificates: {
      required: [],
      preferred: [
        'AWS机器学习认证',
        'Google TensorFlow开发者证书'
      ],
      weight: 0.05
    },
    soft_skills: {
      innovation_ability: {
        description: '能够提出创新的算法方案',
        level: '高',
        weight: 0.08
      },
      learning_ability: {
        description: '快速学习新技术和算法',
        level: '高',
        weight: 0.10
      },
      pressure_resistance: {
        description: '能够在项目压力下保持高效',
        level: '中',
        weight: 0.05
      },
      communication_ability: {
        description: '清晰表达技术方案，与团队协作',
        level: '中',
        weight: 0.07
      },
      total_weight: 0.30
    },
    experience: {
      internship_required: false,
      preferred_experience: [
        '机器学习相关实习经验',
        '算法竞赛经历（Kaggle等）',
        '开源项目贡献'
      ],
      project_requirements: [
        '至少1个完整的机器学习项目',
        '有模型训练和部署经验'
      ],
      weight: 0.10
    }
  },
  market_analysis: {
    demand_score: 85,
    growth_trend: '上升',
    salary_range: {
      junior: '15k-25k',
      intermediate: '25k-40k',
      senior: '40k-70k'
    },
    hottest_cities: [
      { city: '北京', job_count: 1500 },
      { city: '上海', job_count: 1200 },
      { city: '深圳', job_count: 800 }
    ],
    top_companies: [
      '字节跳动', '阿里巴巴', '腾讯', '百度', '华为'
    ],
    industry_trends: [
      '大模型应用场景持续扩大',
      '多模态AI成为新热点',
      'AI+垂直行业深度融合'
    ]
  },
  career_path: {
    current_level: '初级算法工程师',
    promotion_path: [
      {
        level: '中级算法工程师',
        years_required: '2-3年',
        key_requirements: [
          '独立负责算法模块',
          '优化算法性能',
          '指导初级工程师'
        ]
      },
      {
        level: '高级算法工程师',
        years_required: '3-5年',
        key_requirements: [
          '设计复杂算法架构',
          '解决关键技术难题',
          '带领算法团队'
        ]
      },
      {
        level: '算法专家/技术总监',
        years_required: '5-8年',
        key_requirements: [
          '制定技术战略',
          '行业影响力',
          '管理大型团队'
        ]
      }
    ]
  },
  transfer_paths: [
    {
      target_job: '数据科学家',
      relevance_score: 85,
      required_skills: [
        '统计分析能力',
        '业务理解能力',
        '数据可视化'
      ],
      transition_difficulty: '中',
      estimated_time: '6-12个月'
    },
    {
      target_job: '机器学习工程师',
      relevance_score: 90,
      required_skills: [
        '模型部署',
        '工程化能力',
        '系统设计'
      ],
      transition_difficulty: '低',
      estimated_time: '3-6个月'
    }
  ]
}

// 模拟学生能力画像 - 完全符合API文档5.1
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
        evidence: [
          '3个Python项目经验',
          '开源贡献500+ commits'
        ],
        score: 85
      },
      {
        skill: 'Java',
        level: '熟悉',
        evidence: ['课程项目', '实习应用'],
        score: 70
      },
      {
        skill: 'JavaScript',
        level: '熟练',
        evidence: ['2个前端项目'],
        score: 80
      }
    ],
    frameworks_tools: [
      {
        skill: 'React',
        level: '熟练',
        evidence: ['2个前端项目'],
        score: 80
      },
      {
        skill: 'TensorFlow',
        level: '熟悉',
        evidence: ['课程项目', 'Kaggle竞赛'],
        score: 75
      }
    ],
    domain_knowledge: [
      {
        domain: '机器学习',
        level: '熟悉',
        evidence: ['相关课程', 'Kaggle竞赛'],
        score: 75
      }
    ],
    overall_score: 78
  },
  certificates: {
    items: [
      {
        name: '全国计算机等级考试二级',
        level: '二级',
        issue_date: '2023-03'
      }
    ],
    score: 60,
    competitiveness: '中等'
  },
  innovation_ability: {
    projects: [
      {
        name: '校园社交平台',
        innovation_points: [
          '首创校园匿名树洞功能',
          '基于LBS的校友发现'
        ],
        impact: '1000+用户使用'
      }
    ],
    competitions: [
      {
        name: '中国大学生计算机设计大赛',
        award: '省级二等奖'
      }
    ],
    score: 72,
    level: '中上'
  },
  learning_ability: {
    indicators: [
      {
        indicator: 'GPA',
        value: 3.8,
        percentile: 85
      },
      {
        indicator: '自学新技术',
        evidence: [
          '1个月掌握React框架',
          '自学机器学习并完成项目'
        ]
      }
    ],
    score: 85,
    level: '优秀'
  },
  pressure_resistance: {
    evidence: [
      '同时处理3门课程期末+实习',
      '项目deadline前完成高质量交付'
    ],
    assessment_score: 75,
    level: '良好'
  },
  communication_ability: {
    teamwork: {
      evidence: [
        '担任3个项目的技术负责人',
        '协调5人团队完成开发'
      ],
      score: 70
    },
    presentation: {
      evidence: [
        '技术分享会演讲3次',
        '项目答辩获得好评'
      ],
      score: 75
    },
    overall_score: 72,
    level: '良好'
  },
  practical_experience: {
    internships: [
      {
        company: '腾讯科技',
        position: '前端开发实习生',
        duration: '3个月',
        achievements: [
          '独立完成2个H5页面开发',
          '优化页面加载速度30%'
        ],
        score: 80
      }
    ],
    projects: [
      {
        name: '校园社交平台',
        role: '项目负责人',
        complexity: '高',
        score: 85
      }
    ],
    overall_score: 82
  },
  overall_assessment: {
    total_score: 76,
    percentile: 78,
    completeness: 90,
    competitiveness: '中上',
    strengths: [
      '学习能力强，GPA优秀',
      '有完整的项目和实习经验',
      '技术栈较为全面'
    ],
    weaknesses: [
      '缺少技术证书',
      '沟通能力有提升空间',
      '创新项目影响力可以更大'
    ]
  }
}

// 模拟岗位匹配 - 完全符合API文档6.1
const mockJobMatches = {
  total_matched: 45,
  recommendations: [
    {
      job_id: 'job_001',
      job_name: '算法工程师',
      match_score: 92,
      match_level: '高度匹配',
      dimension_scores: {
        basic_requirements: {
          score: 95,
          weight: 0.15,
          details: {
            education: {
              required: '本科',
              student: '本科',
              match: true
            },
            major: {
              required: ['计算机', '软件工程'],
              student: '计算机科学与技术',
              match: true
            },
            gpa: {
              required: '3.0',
              student: '3.8',
              match: true
            }
          }
        },
        professional_skills: {
          score: 88,
          weight: 0.40,
          details: {
            matched_skills: [
              {
                skill: 'Python',
                required_level: '熟练',
                student_level: '熟练',
                match: true
              },
              {
                skill: 'TensorFlow',
                required_level: '熟练',
                student_level: '熟悉',
                match: '部分匹配'
              }
            ],
            missing_skills: [
              {
                skill: 'Spark',
                importance: '重要',
                learning_difficulty: '中'
              }
            ],
            match_rate: 0.85
          }
        },
        soft_skills: {
          score: 90,
          weight: 0.30,
          details: {
            innovation_ability: {
              required: '高',
              student: '中上',
              score: 88
            },
            learning_ability: {
              required: '高',
              student: '优秀',
              score: 95
            },
            communication_ability: {
              required: '中',
              student: '良好',
              score: 90
            }
          }
        },
        development_potential: {
          score: 93,
          weight: 0.15,
          details: {
            growth_mindset: '优秀',
            career_clarity: '清晰',
            motivation: '强'
          }
        }
      },
      highlights: [
        '学习能力强，符合岗位高要求',
        '有相关实习经验，快速上手',
        '技术栈覆盖80%以上岗位需求'
      ],
      gaps: [
        {
          gap: '缺少Spark大数据处理经验',
          importance: '重要',
          suggestion: '可通过在线课程1-2个月学习'
        },
        {
          gap: 'TensorFlow需要进阶',
          importance: '必需',
          suggestion: '深入学习模型优化和部署'
        }
      ],
      job_info: {
        company: '字节跳动',
        location: '北京',
        salary: '20k-35k',
        experience: '应届生/1年经验'
      }
    },
    {
      job_id: 'job_002',
      job_name: '前端开发工程师',
      match_score: 85,
      match_level: '较为匹配',
      job_info: {
        company: '阿里巴巴',
        location: '杭州',
        salary: '15k-25k',
        experience: '应届生/1年经验'
      }
    }
  ]
}

// 模拟职业规划报告 - 完全符合API文档7.2
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
    self_assessment: {
      strengths: [
        '学习能力强，快速掌握新技术',
        '逻辑思维能力突出',
        '有扎实的编程基础和项目经验'
      ],
      interests: [
        '对人工智能和算法有浓厚兴趣',
        '喜欢解决复杂技术问题',
        '追求技术深度'
      ],
      values: [
        '重视个人技术成长',
        '追求工作成就感',
        '希望参与有影响力的项目'
      ]
    },
    recommended_careers: [
      {
        career: '算法工程师',
        match_score: 92,
        match_analysis: {
          why_suitable: [
            '你的研究型兴趣与算法岗位高度契合',
            '强大的学习能力适合快速迭代的算法领域',
            '逻辑分析能力是算法工程师的核心素质'
          ],
          capability_match: {
            professional_skills: {
              score: 88,
              description: '技术栈覆盖80%岗位需求，Python和机器学习基础扎实'
            },
            soft_skills: {
              score: 90,
              description: '学习能力、创新能力与岗位要求高度匹配'
            }
          },
          gaps_and_solutions: [
            {
              gap: '缺少大规模数据处理经验',
              solution: '学习Spark等大数据框架，通过Kaggle竞赛积累经验',
              priority: '高',
              timeline: '2-3个月'
            },
            {
              gap: '深度学习框架需要进阶',
              solution: '深入学习TensorFlow/PyTorch，完成1-2个深度学习项目',
              priority: '高',
              timeline: '1-2个月'
            }
          ]
        },
        market_outlook: {
          demand: '高',
          growth_trend: '持续上升',
          salary_range: '15k-25k（应届）→ 25k-40k（2-3年）',
          key_trends: [
            '大模型应用爆发式增长',
            '多模态AI成为新热点',
            '垂直领域AI深度应用'
          ]
        }
      }
    ],
    career_choice_advice: {
      primary_recommendation: '算法工程师',
      reasons: [
        '与你的兴趣、能力、价值观高度契合',
        '市场需求旺盛，发展前景好',
        '能够充分发挥你的技术优势'
      ],
      alternative_option: '机器学习工程师（偏工程化方向）',
      risk_mitigation: '建议同时关注后端开发技能，增加就业灵活性'
    }
  },
  section_2_career_path: {
    title: '职业目标设定与职业路径规划',
    short_term_goal: {
      timeline: '2026.06 - 2026.06',
      primary_goal: '成功入职算法工程师岗位，完成职业起步',
      specific_targets: [
        {
          target: '获得算法工程师offer',
          metrics: '至少2个中大厂offer',
          deadline: '2026.06'
        },
        {
          target: '快速融入团队',
          metrics: '3个月内独立负责算法模块',
          deadline: '2026.09'
        },
        {
          target: '建立技术基础',
          metrics: '掌握公司核心算法框架和业务',
          deadline: '2026.06'
        }
      ]
    },
    mid_term_goal: {
      timeline: '2026 - 2030',
      primary_goal: '成长为中高级算法工程师，建立技术影响力',
      specific_targets: [
        {
          target: '晋升为中级算法工程师',
          metrics: '独立负责关键算法项目',
          deadline: '2027'
        },
        {
          target: '技术深度突破',
          metrics: '在某一细分领域成为团队专家',
          deadline: '2028'
        },
        {
          target: '建立行业影响力',
          metrics: '发表技术博客，参加技术会议',
          deadline: '2029'
        }
      ]
    },
    career_roadmap: {
      path_type: '技术专家路线',
      stages: [
        {
          stage: '初级算法工程师',
          period: '1-2年',
          key_responsibilities: [
            '完成分配的算法开发任务',
            '优化现有算法性能',
            '学习业务和技术架构'
          ],
          success_criteria: [
            '独立完成算法模块开发',
            '代码质量达到团队标准',
            '理解核心业务逻辑'
          ]
        },
        {
          stage: '中级算法工程师',
          period: '2-3年',
          key_responsibilities: [
            '负责核心算法设计',
            '解决技术难题',
            '指导初级工程师'
          ],
          success_criteria: [
            '设计的算法性能提升显著',
            '攻克2-3个技术难点',
            '获得晋升委员会认可'
          ]
        },
        {
          stage: '高级算法工程师/算法专家',
          period: '3-5年',
          key_responsibilities: [
            '设计算法架构',
            '带领算法团队',
            '制定技术方向'
          ],
          success_criteria: [
            '成为某领域的技术专家',
            '带领团队完成重要项目',
            '有行业影响力（论文/专利）'
          ]
        }
      ],
      alternative_paths: [
        {
          path: '横向转岗 → 数据科学家',
          timing: '2-3年工作经验后',
          reason: '算法能力可迁移，拓展业务分析能力',
          preparation: [
            '加强统计学和业务理解',
            '学习数据可视化工具',
            '参与业务数据分析项目'
          ]
        },
        {
          path: '向上转型 → AI产品经理',
          timing: '4-5年工作经验后',
          reason: '技术背景+产品思维',
          preparation: [
            '培养产品sense',
            '提升沟通和项目管理能力',
            '理解商业和用户需求'
          ]
        }
      ]
    },
    industry_trends: {
      current_status: 'AI算法岗位需求持续旺盛',
      key_trends: [
        {
          trend: '大模型应用普及',
          impact: '对算法工程师的工程能力要求提高',
          opportunity: '掌握大模型应用开发将成为核心竞争力'
        },
        {
          trend: 'AI+垂直行业融合',
          impact: '需要懂业务的算法工程师',
          opportunity: '选择一个垂直领域深耕（如医疗AI、金融AI）'
        },
        {
          trend: '自动化机器学习(AutoML)',
          impact: '部分基础算法工作被替代',
          opportunity: '专注高价值的算法创新和优化'
        }
      ],
      '5_year_outlook': '算法工程师将从纯技术岗位向技术+业务复合型人才转变'
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
              具体行动: [
                '完成斯坦福CS231n课程',
                '复现3篇经典论文(ResNet, Transformer, BERT)',
                '参加Kaggle计算机视觉竞赛'
              ],
              预期成果: '掌握深度学习核心算法，获得竞赛Top 10%',
              时间投入: '每周15小时'
            },
            {
              task: '大数据处理',
              具体行动: [
                '学习Spark基础和实战',
                '使用Spark处理1个亿级数据集'
              ],
              预期成果: '掌握大规模数据处理流程',
              时间投入: '每周10小时'
            }
          ],
          milestone: '完成2个深度学习项目，Spark实战项目'
        },
        {
          month: '2026.03 - 2026.04',
          focus: '项目实战',
          tasks: [
            {
              task: '完整算法项目',
              具体行动: [
                '选择一个实际问题（如推荐系统、NLP应用）',
                '从数据收集→模型训练→部署全流程',
                '写技术博客记录'
              ],
              预期成果: 'GitHub star 100+，可用于面试展示',
              时间投入: '每周20小时'
            }
          ],
          milestone: '完成1个高质量开源项目'
        },
        {
          month: '2026.04 - 2026.06',
          focus: '求职冲刺',
          tasks: [
            {
              task: '算法刷题',
              具体行动: [
                'LeetCode刷300题（中等150+困难50）',
                '准备常见算法面试题'
              ],
              预期成果: '算法面试通过率80%+',
              时间投入: '每周15小时'
            },
            {
              task: '简历优化与投递',
              具体行动: [
                '突出项目成果和技术亮点',
                '提前批投递20+公司'
              ],
              预期成果: '获得10+面试机会',
              时间投入: '每周5小时'
            },
            {
              task: '面试准备',
              具体行动: [
                '总结项目经验STAR法则',
                '准备技术问题和行为面试',
                '模拟面试3次'
              ],
              预期成果: 'offer转化率50%+',
              时间投入: '每周10小时'
            }
          ],
          milestone: '获得2-3个算法工程师offer'
        }
      ]
    },
    mid_term_plan: {
      period: '2026.06 - 2028.06',
      goal: '从初级到中高级算法工程师的成长',
      yearly_plans: [
        {
          year: '第1年 (2026.06-2026.06)',
          focus: '快速成长，建立基础',
          key_tasks: [
            '完成公司新人培训和导师制项目',
            '独立负责2-3个算法优化任务',
            '深入学习公司业务和技术栈',
            '建立技术博客，分享学习心得'
          ],
          evaluation_metrics: [
            '绩效评级：达到或超过预期',
            '独立完成算法模块开发',
            '技术博客阅读量5000+'
          ]
        },
        {
          year: '第2年 (2026.06-2027.06)',
          focus: '技术深化，寻求突破',
          key_tasks: [
            '主导1个核心算法项目',
            '在某一细分领域（如NLP/CV）建立专长',
            '参加1-2次技术会议/竞赛',
            '指导1-2名新人'
          ],
          evaluation_metrics: [
            '项目成果：算法性能提升30%+',
            '获得团队技术专家认可',
            '晋升为中级算法工程师'
          ]
        },
        {
          year: '第3年 (2027.06-2028.06)',
          focus: '建立影响力，冲击高级',
          key_tasks: [
            '负责核心算法架构设计',
            '发表1-2篇技术论文或申请专利',
            '参与技术规划和团队建设',
            '行业技术分享3次以上'
          ],
          evaluation_metrics: [
            '成为某领域的技术专家',
            '绩效连续优秀',
            '获得高级工程师提名'
          ]
        }
      ]
    },
    learning_path: {
      technical_skills: [
        {
          skill_area: '深度学习',
          current_level: '熟悉',
          target_level: '精通',
          learning_resources: [
            '课程：斯坦福CS231n、CS224n',
            '书籍：《深度学习》(花书)',
            '实践：Kaggle竞赛、复现论文'
          ],
          timeline: '6个月'
        },
        {
          skill_area: '大数据处理',
          current_level: '了解',
          target_level: '熟练',
          learning_resources: [
            '课程：Spark官方教程',
            '项目：处理公司实际数据',
            '社区：参与开源项目'
          ],
          timeline: '3个月'
        }
      ],
      soft_skills: [
        {
          skill: '技术沟通',
          improvement_plan: [
            '每月1次技术分享',
            '撰写清晰的技术文档',
            '参加公开演讲培训'
          ],
          timeline: '持续提升'
        }
      ]
    },
    achievement_showcase: {
      portfolio_building: {
        github: {
          goal: '打造个人技术品牌',
          actions: [
            '开源2-3个高质量项目',
            '维护技术博客，Star 500+',
            '贡献知名开源项目'
          ]
        },
        technical_blog: {
          goal: '建立技术影响力',
          actions: [
            '每月1-2篇技术文章',
            '总阅读量10万+',
            '在掘金/知乎/CSDN建立专栏'
          ]
        },
        competitions: {
          goal: '验证技术能力',
          actions: [
            '参加3次Kaggle竞赛，Top 10%',
            '参加1次算法挑战赛，获奖'
          ]
        }
      }
    }
  },
  section_4_evaluation: {
    title: '评估周期与动态调整',
    evaluation_system: {
      monthly_review: {
        frequency: '每月1次',
        review_items: [
          '学习目标完成度',
          '项目进展情况',
          '技能提升评估'
        ],
        adjustment_triggers: [
          '目标完成度<70% → 调整计划或降低难度',
          '提前完成 → 增加挑战性任务'
        ]
      },
      quarterly_review: {
        frequency: '每季度1次',
        review_items: [
          '能力画像更新',
          '人岗匹配度重新评估',
          '职业目标校准'
        ],
        key_questions: [
          '当前能力是否达到预期？',
          '职业目标是否需要调整？',
          '市场环境有何变化？'
        ]
      },
      annual_review: {
        frequency: '每年1次',
        review_items: [
          '年度目标达成情况',
          '职业路径是否需要调整',
          '下一年度规划制定'
        ]
      }
    },
    adjustment_scenarios: [
      {
        scenario: '求职不顺利（offer<预期）',
        possible_reasons: [
          '技能储备不足',
          '面试表现欠佳',
          '目标定位过高'
        ],
        adjustment_plan: {
          immediate_actions: [
            '分析面试反馈，针对性提升',
            '降低目标公司档次，先就业',
            '寻求内推和模拟面试帮助'
          ],
          long_term_actions: [
            '系统提升薄弱技能',
            '积累更多项目经验',
            '拓展求职渠道'
          ]
        }
      },
      {
        scenario: '工作后发现不适合算法岗',
        possible_reasons: [
          '兴趣不符',
          '能力不匹配',
          '工作环境不适应'
        ],
        adjustment_plan: {
          evaluation_period: '工作6个月内',
          decision_tree: [
            '是否是短期适应问题 → 给自己6个月适应期',
            '是否能力问题 → 加强学习，寻求导师指导',
            '是否兴趣问题 → 考虑换岗路径（参考section_2）'
          ],
          fallback_options: [
            '转向机器学习工程师（偏工程）',
            '转向数据科学家（偏分析）',
            '转向后端开发（利用编程能力）'
          ]
        }
      }
    ],
    risk_management: {
      identified_risks: [
        {
          risk: 'AI技术迭代导致部分岗位需求变化',
          probability: '中',
          impact: '高',
          mitigation: '保持学习，关注前沿技术，建立技术深度'
        },
        {
          risk: '市场竞争加剧',
          probability: '高',
          impact: '中',
          mitigation: '提前准备，建立差异化竞争力，拓宽就业面'
        }
      ],
      contingency_plans: [
        'plan A: 坚持算法方向，成为技术专家',
        'plan B: 转向ML工程师或数据科学家',
        'plan C: 转向后端开发或全栈工程师'
      ]
    }
  },
  summary: {
    key_takeaways: [
      '你适合从事算法工程师职业，与你的兴趣、能力、价值观高度契合',
      '短期目标是补齐技能短板，获得2-3个offer',
      '中期目标是3-5年内成长为中高级算法工程师',
      '需要重点提升深度学习和大数据处理能力',
      '保持技术学习和项目实践，建立个人技术品牌'
    ],
    next_steps: [
      '立即开始：深度学习课程学习（本周内）',
      '2周内：启动1个深度学习项目',
      '1个月内：完成Spark学习和实战',
      '3个月内：完成2个高质量项目并开源',
      '4个月内：开始算法刷题和简历准备'
    ],
    motivational_message: '你已经具备了成为优秀算法工程师的潜质。接下来的6个月是关键期，保持专注和持续行动，你一定能够实现职业目标。记住：每一次学习和实践都是在为未来的自己铺路。加油！'
  }
}

// 院校库模拟数据
const mockUniversityList = {
  list: [
    {
      id: 'univ001',
      name: '清华大学',
      logo_url: '/images/universities/tsinghua.png',
      location: '北京',
      type: '985',
      rank: 1,
      tags: ['985', '211', '双一流', '理工类'],
      intro: '清华大学是中国著名高等学府，坐落于北京西北郊风景秀丽的清华园，是中国高层次人才培养和科学技术研究的重要基地。',
      majors: [
        {
          id: 'major001',
          name: '计算机科学与技术',
          description: '培养具有扎实的计算机科学与技术理论基础，掌握计算机系统结构、软件与应用、理论等专业知识',
          duration: '4年',
          degree: '工学学士',
          score_line: 680
        },
        {
          id: 'major002',
          name: '软件工程',
          description: '培养具有扎实的软件工程理论基础，掌握软件系统开发、维护和项目管理能力',
          duration: '4年',
          degree: '工学学士',
          score_line: 675
        }
      ],
      employment_rate: '98.5%',
      average_salary: '15000元/月',
      top_companies: ['阿里巴巴', '腾讯', '百度', '字节跳动', '华为']
    },
    {
      id: 'univ002',
      name: '北京大学',
      logo_url: '/images/universities/peking.png',
      location: '北京',
      type: '985',
      rank: 2,
      tags: ['985', '211', '双一流', '综合类'],
      intro: '北京大学创立于1898年，初名京师大学堂，是中国第一所国立综合性大学，也是当时中国最高教育行政机关。',
      majors: [
        {
          id: 'major003',
          name: '人工智能',
          description: '培养具有扎实的人工智能理论基础，掌握机器学习、深度学习、自然语言处理等核心技术',
          duration: '4年',
          degree: '理学学士',
          score_line: 685
        },
        {
          id: 'major004',
          name: '数据科学与大数据技术',
          description: '培养具有扎实的数据科学理论基础，掌握大数据处理、分析和可视化技术',
          duration: '4年',
          degree: '理学学士',
          score_line: 680
        }
      ],
      employment_rate: '98.2%',
      average_salary: '14500元/月',
      top_companies: ['阿里巴巴', '腾讯', '百度', '字节跳动', '华为']
    },
    {
      id: 'univ003',
      name: '浙江大学',
      logo_url: '/images/universities/zhejiang.png',
      location: '杭州',
      type: '985',
      rank: 3,
      tags: ['985', '211', '双一流', '综合类'],
      intro: '浙江大学是一所历史悠久、声誉卓著的高等学府，坐落于中国历史文化名城、风景旅游胜地杭州。',
      majors: [
        {
          id: 'major005',
          name: '软件工程',
          description: '培养具有扎实的软件工程理论基础，掌握软件系统开发、维护和项目管理能力',
          duration: '4年',
          degree: '工学学士',
          score_line: 670
        },
        {
          id: 'major006',
          name: '计算机科学与技术',
          description: '培养具有扎实的计算机科学与技术理论基础，掌握计算机系统结构、软件与应用、理论等专业知识',
          duration: '4年',
          degree: '工学学士',
          score_line: 675
        }
      ],
      employment_rate: '97.8%',
      average_salary: '13000元/月',
      top_companies: ['阿里巴巴', '网易', '海康威视', '大华', '华为']
    }
  ],
  total: 3,
  page: 1,
  size: 20
}

// 院校通知模拟数据
const mockUniversityNotices = {
  notices: [
    {
      id: 'notice001',
      university_id: 'univ001',
      title: '清华大学2026年硕士研究生招生简章发布',
      content: '清华大学2026年硕士研究生招生简章已发布，欢迎各位考生报考...',
      publish_time: '2025-09-15',
      category: '招生信息'
    },
    {
      id: 'notice002',
      university_id: 'univ002',
      title: '北京大学2026年推免生接收工作通知',
      content: '北京大学2026年推荐免试研究生接收工作即将开始，具体安排如下...',
      publish_time: '2025-09-10',
      category: '招生信息'
    }
  ],
  total: 2,
  page: 1,
  size: 10
}

// 院校动态模拟数据
const mockUniversityPosts = {
  posts: [
    {
      id: 'post001',
      university_id: 'univ001',
      title: '清华大学计算机系学生在国际编程竞赛中获金奖',
      content: '清华大学计算机系代表队在ACM国际大学生程序设计竞赛世界总决赛中获得金奖...',
      publish_time: '2025-08-20',
      author: '清华大学计算机系',
      likes: 256,
      comments: 32
    },
    {
      id: 'post002',
      university_id: 'univ002',
      title: '北京大学人工智能研究院取得重大突破',
      content: '北京大学人工智能研究院在自然语言处理领域取得重大突破，相关论文发表于顶级期刊...',
      publish_time: '2025-08-15',
      author: '北京大学人工智能研究院',
      likes: 189,
      comments: 24
    }
  ],
  total: 2,
  page: 1,
  size: 10
}

// 知识库搜索模拟数据
const mockKnowledgeSearchResults = {
  query: '算法工程师',
  results: [
    {
      doc_id: 'doc001',
      title: '算法工程师职业发展路径详解',
      content_snippet: '算法工程师是近年来热门的职业方向，主要负责设计、实现和优化各种算法模型。本文将详细介绍算法工程师的职业发展路径...',
      relevance_score: 0.95,
      source: '职业百科',
      publish_date: '2025-01-15'
    },
    {
      doc_id: 'doc002',
      title: '算法工程师必备技能清单',
      content_snippet: '成为一名优秀的算法工程师需要掌握多项技能，包括编程能力、数学基础、机器学习算法等。以下是算法工程师必备技能清单...',
      relevance_score: 0.92,
      source: '技术指南',
      publish_date: '2025-02-20'
    },
    {
      doc_id: 'doc003',
      title: '算法工程师面试常见问题及解答',
      content_snippet: '算法工程师面试中常见的问题类型包括算法设计题、编程实现题、机器学习理论题等。本文整理了算法工程师面试常见问题及解答...',
      relevance_score: 0.88,
      source: '面试宝典',
      publish_date: '2025-03-10'
    }
  ],
  total: 3
}

// 创建服务器
const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  
  // 解析URL
  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  
  // 只处理API请求
  if (!pathname.startsWith('/api/v1/')) {
    // 处理静态文件
    if (pathname.startsWith('/images/')) {
      const filePath = path.join(__dirname, 'frontend/public/images', pathname.substring(8))
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath)
        const contentType = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif'
        }[ext] || 'application/octet-stream'
        
        res.writeHead(200, { 'Content-Type': contentType })
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    // 其他请求返回404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
    return
  }
  
  // 处理POST请求
  if (req.method === 'POST') {
    let body = ''
    
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        let response = { code: 200, msg: 'success', data: null }
        
        // 路由处理 - 完全符合API文档
        switch (pathname) {
          // 1. 身份认证模块
          case '/api/v1/auth/login':
            const { username, password } = data
            const user = users.find(u => u.username === username && u.password === password)
            
            if (user) {
              response.data = user
              response.msg = '登录成功'
            } else {
              response.code = 400
              response.msg = '用户名或密码错误'
              response.data = null
            }
            break
            
          case '/api/v1/auth/register':
            const { username: regUsername, password: regPassword, nickname } = data
            
            // 简单模拟注册成功
            const newUser = {
              user_id: users.length + 10001,
              username: regUsername,
              nickname: nickname || regUsername,
              avatar: '/images/avatar.png',
              token: 'mock_token_' + Date.now(),
              profile_completed: false,
              assessment_completed: false
            }
            
            users.push(newUser)
            response.data = newUser
            response.msg = '注册成功'
            break
            
          case '/api/v1/auth/logout':
            response.msg = '退出成功'
            response.data = null
            break
            
          // 2. 个人档案模块
          case '/api/v1/profile/info':
            response.data = mockProfile
            break
            
          case '/api/v1/profile/update':
            response.data = {
              profile_completeness: 90,
              updated_at: '2026-02-14 10:45:00'
            }
            response.msg = '档案更新成功'
            break
            
          case '/api/v1/profile/upload-resume':
            response.data = {
              task_id: 'resume_parse_20260214_10001',
              status: 'processing'
            }
            response.msg = '简历上传成功，正在解析...'
            break
            
          case '/api/v1/profile/resume-parse-result':
            response.data = {
              status: 'completed',
              parsed_data: {
                basic_info: {
                  name: '李明',
                  phone: '13800138000',
                  email: 'test@example.com'
                },
                education: [],
                skills: [],
                internships: [],
                projects: []
              },
              confidence_score: 0.92,
              suggestions: [
                '建议补充GPA信息',
                '实习经历描述可以更具体'
              ]
            }
            break
            
          // 3. 职业测评模块
          case '/api/v1/assessment/questionnaire':
            response.data = mockQuestionnaire
            break
            
          case '/api/v1/assessment/submit':
            response.data = {
              report_id: 'report_20260214_10001',
              status: 'processing'
            }
            response.msg = '测评提交成功，正在生成报告...'
            break
            
          case '/api/v1/assessment/report':
            response.data = mockAssessmentReport
            break
            
          // 4. 岗位画像模块
          case '/api/v1/job/profiles':
            response.data = mockJobProfiles
            break
            
          case '/api/v1/job/profile/detail':
            const { job_id } = data
            response.data = mockJobProfileDetail
            break
            
          case '/api/v1/job/relation-graph':
            response.data = {
              center_job: {
                job_id: 'job_001',
                job_name: '算法工程师',
                level: '初级'
              },
              vertical_graph: {
                nodes: [
                  {
                    job_id: 'job_001',
                    job_name: '初级算法工程师',
                    level: 1
                  },
                  {
                    job_id: 'job_002',
                    job_name: '中级算法工程师',
                    level: 2
                  },
                  {
                    job_id: 'job_003',
                    job_name: '高级算法工程师',
                    level: 3
                  },
                  {
                    job_id: 'job_004',
                    job_name: '算法专家',
                    level: 4
                  }
                ],
                edges: [
                  {
                    from: 'job_001',
                    to: 'job_002',
                    years: '2-3',
                    requirements: ['独立项目经验', '算法优化能力']
                  },
                  {
                    from: 'job_002',
                    to: 'job_003',
                    years: '3-5',
                    requirements: ['架构设计能力', '技术攻坚能力']
                  }
                ]
              },
              transfer_graph: {
                nodes: [
                  {
                    job_id: 'job_001',
                    job_name: '算法工程师'
                  },
                  {
                    job_id: 'job_010',
                    job_name: '数据科学家'
                  },
                  {
                    job_id: 'job_011',
                    job_name: '机器学习工程师'
                  },
                  {
                    job_id: 'job_012',
                    job_name: 'AI产品经理'
                  }
                ],
                edges: [
                  {
                    from: 'job_001',
                    to: 'job_010',
                    relevance_score: 85,
                    difficulty: '中',
                    time: '6-12个月',
                    skills_gap: ['统计学', '业务分析', '可视化']
                  },
                  {
                    from: 'job_001',
                    to: 'job_011',
                    relevance_score: 90,
                    difficulty: '低',
                    time: '3-6个月',
                    skills_gap: ['模型部署', '工程化']
                  }
                ]
              }
            }
            break
            
          case '/api/v1/job/ai-generate-profile':
            response.data = {
              task_id: 'job_gen_20260214_001',
              status: 'processing',
              estimated_time: 30
            }
            response.msg = 'AI画像生成中...'
            break
            
          case '/api/v1/job/ai-generate-result':
            response.data = {
              status: 'completed',
              job_profile: mockJobProfileDetail,
              ai_confidence: 0.88,
              data_sources: {
                total_samples: 50,
                valid_samples: 47,
                analysis_date: '2026-02-14'
              }
            }
            break
            
          // 5. 学生能力画像模块
          case '/api/v1/student/ability-profile':
            response.data = mockAbilityProfile
            break
            
          case '/api/v1/student/ai-generate-profile':
            response.data = {
              task_id: 'stu_gen_20260214_10001',
              status: 'processing'
            }
            response.msg = 'AI画像生成中...'
            break
            
          case '/api/v1/student/update-profile':
            response.data = {
              updated_at: '2026-02-14 11:30:00',
              new_total_score: 78,
              score_change: +2
            }
            response.msg = '画像更新成功'
            break
            
          // 6. 人岗匹配模块
          case '/api/v1/matching/recommend-jobs':
            response.data = mockJobMatches
            break
            
          case '/api/v1/matching/analyze':
            const { job_id: matchJobId } = data
            const job = mockJobMatches.recommendations.find(j => j.job_id === matchJobId)
            
            if (job) {
              response.data = job
            } else {
              response.code = 404
              response.msg = '岗位不存在'
              response.data = null
            }
            break
            
          case '/api/v1/matching/batch-analyze':
            const { job_ids } = data
            response.data = {
              analyses: job_ids.map(id => {
                const job = mockJobMatches.recommendations.find(j => j.job_id === id)
                return job || { job_id: id, match_score: 0, match_level: '不匹配' }
              }),
              best_match: mockJobMatches.recommendations[0]
            }
            break
            
          // 7. 职业规划报告模块
          case '/api/v1/career/generate-report':
            response.data = {
              report_id: 'report_career_20260214_10001',
              status: 'processing'
            }
            response.msg = '报告生成中，预计需要30秒...'
            break
            
          case '/api/v1/career/report':
            response.data = mockCareerReport
            break
            
          case '/api/v1/career/edit-report':
            response.data = {
              updated_at: '2026-02-14 13:00:00'
            }
            response.msg = '报告编辑成功'
            break
            
          case '/api/v1/career/ai-polish-report':
            response.data = {
              task_id: 'polish_20260214_001',
              status: 'processing'
            }
            response.msg = 'AI优化中...'
            break
            
          case '/api/v1/career/export-report':
            response.data = {
              download_url: '/downloads/career_report_10001_20260214.pdf',
              file_size: '2.5MB',
              expires_at: '2026-02-21 13:00:00'
            }
            response.msg = '报告导出成功'
            break
            
          case '/api/v1/career/check-completeness':
            response.data = {
              completeness_score: 92,
              quality_score: 88,
              section_completeness: [
                {
                  section: '职业探索与岗位匹配',
                  completeness: 95,
                  issues: []
                },
                {
                  section: '职业目标设定与职业路径规划',
                  completeness: 90,
                  issues: ['建议补充更多行业趋势分析']
                },
                {
                  section: '行动计划与成果展示',
                  completeness: 88,
                  issues: ['学习路径可以更具体', '建议添加时间管理建议']
                }
              ],
              suggestions: [
                {
                  type: '内容完善',
                  priority: '中',
                  suggestion: '在行动计划中添加具体的时间管理方法'
                },
                {
                  type: '可操作性',
                  priority: '低',
                  suggestion: '为每个学习资源添加具体链接'
                }
              ],
              strengths: [
                '岗位匹配分析详细准确',
                '行动计划具体可执行',
                '职业路径规划清晰'
              ]
            }
            break
            
          case '/api/v1/career/report-history':
            response.data = {
              total: 3,
              list: [
                {
                  report_id: 'report_career_20260214_10001',
                  created_at: '2026-02-14 12:00:00',
                  status: 'completed',
                  primary_career: '算法工程师',
                  completeness: 95,
                  last_viewed: '2026-02-14 13:30:00'
                },
                {
                  report_id: 'report_career_20260101_10001',
                  created_at: '2026-01-01 10:00:00',
                  status: 'archived',
                  primary_career: '前端开发工程师',
                  completeness: 85
                }
              ]
            }
            break
            
          // 8. 系统管理模块
          case '/api/v1/system/upload-job-data':
            response.data = {
              task_id: 'upload_20260214_001',
              total_records: 10000,
              status: 'processing'
            }
            response.msg = '数据上传成功，正在处理...'
            break
            
          case '/api/v1/system/generate-job-profiles':
            response.data = {
              task_id: 'batch_gen_20260214_001',
              total_jobs: 3,
              estimated_time: '15分钟'
            }
            response.msg = '批量生成任务已启动'
            break
            
          case '/api/v1/system/statistics':
            response.data = {
              user_statistics: {
                total_users: 5000,
                active_users: 3200,
                new_users_this_month: 500
              },
              usage_statistics: {
                total_assessments: 3500,
                total_reports_generated: 2800,
                total_job_matches: 15000
              },
              job_statistics: {
                total_jobs_in_db: 120,
                ai_generated_profiles: 80,
                most_popular_jobs: [
                  { job: '算法工程师', search_count: 1500 },
                  { job: '产品经理', search_count: 1200 }
                ]
              },
              model_performance: {
                matching_accuracy: 0.87,
                profile_generation_success_rate: 0.95,
                average_response_time: '2.3s'
              }
            }
            break
            
          // 9. RAG知识库模块
          case '/api/v1/knowledge/upload':
            response.data = {
              doc_id: 'kb_doc_001',
              status: 'processing'
            }
            response.msg = '文档上传成功，正在向量化...'
            break
            
          case '/api/v1/knowledge/search':
            response.data = {
              results: [
                {
                  doc_id: 'kb_doc_001',
                  title: '算法工程师技能树全解析',
                  content_snippet: '算法工程师需要掌握的核心技能包括：1. 编程语言（Python/C++）...',
                  relevance_score: 0.92,
                  source: '《2026 AI人才白皮书》'
                },
                {
                  doc_id: 'kb_doc_015',
                  title: '机器学习工程师vs算法工程师',
                  content_snippet: '算法工程师侧重于算法研发和优化...',
                  relevance_score: 0.85
                }
              ]
            }
            break
            
          case '/api/v1/knowledge/list':
            response.data = {
              total: 50,
              list: [
                {
                  doc_id: 'kb_doc_001',
                  title: '算法工程师技能树全解析',
                  category: '技能指南',
                  file_size: '1.2MB',
                  uploaded_at: '2026-01-15',
                  view_count: 150
                }
              ]
            }
            break
            
          // 8. 院校库模块
          case '/api/v1/universities':
            response.data = mockUniversityList
            break
            
          case '/api/v1/university/notices':
            response.data = mockUniversityNotices
            break
            
          case '/api/v1/university/posts':
            response.data = mockUniversityPosts
            break
            
          // 9. RAG知识库模块
          case '/api/v1/rag/search':
            response.data = mockKnowledgeSearchResults
            break
            
          default:
            response.code = 404
            response.msg = '接口不存在'
            response.data = null
        }
        
        // 发送响应
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          code: 500,
          msg: '服务器内部错误',
          data: null
        }))
      }
    })
  } else {
    // 非POST请求返回404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

// 启动服务器
server.listen(port, () => {
  console.log(`完全符合API文档的模拟API服务器运行在 http://localhost:${port}`)
  console.log('API基础路径: http://localhost:5000/api/v1')
})