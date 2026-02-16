
# AI职业规划智能体 - 完整API文档

## 版本信息

- **版本** : v1.2
- **最后更新** : 2026-02-14
- **项目** : 基于AI的大学生职业规划智能体
- **团队分工** :
  - 算法模型: 孙于婷
  - 前端开发: 李嘉鑫、王雨姗
  - 后端开发: 古媛媛

---

## 文档目录

1. [版本信息](#版本信息)
2. [接口交互通用规范](#0-接口交互通用规范)
3. [身份认证模块 (Auth)](#1-身份认证模块-auth)
4. [个人档案模块 (Profile)](#2-个人档案模块-profile)
5. [职业测评模块 (Assessment)](#3-职业测评模块-assessment)
6. [岗位画像模块 (Job Profile)](#4-岗位画像模块-job-profile)
7. [学生能力画像模块 (Student Profile)](#5-学生能力画像模块-student-profile)
8. [人岗匹配模块 (Job Matching)](#6-人岗匹配模块-job-matching)
9. [职业规划报告模块 (Career Report)](#7-职业规划报告模块-career-report)
10. [系统管理模块 (System)](#8-系统管理模块-system)

---

## 0. 接口交互通用规范

### 0.1 URL前缀

```
/api/v1
```

### 0.2 请求格式

- **Content-Type** : `application/json`
- **文件上传** : `multipart/form-data`

### 0.3 统一响应格式

后端无论成功失败，都返回以下JSON结构，前端根据code判断业务逻辑。

```json
{
  "code": 200,          // 200: 成功, 400: 客户端参数错误, 401: 未授权, 500: 服务器错误
  "msg": "success",     // 提示信息，报错时显示错误原因
  "data": { ... }       // 具体数据对象或数组，失败时为 null
}
```

### 0.4 错误码说明

| 错误码 | 说明 | 处理建议 |
| --- | --- | --- |
| 200 | 请求成功 | 正常处理返回数据 |
| 400 | 客户端参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权或Token失效 | 重新登录获取Token |
| 403 | 无权限访问 | 提示用户权限不足 |
| 404 | 资源不存在 | 提示资源未找到 |
| 500 | 服务器内部错误 | 稍后重试或联系技术支持 |

### 0.5 API调用示例

#### 0.5.1 JavaScript (Fetch API) 示例

```javascript
// 登录示例
async function login(username, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  const result = await response.json();
  if (result.code === 200) {
    // 登录成功，保存token
    localStorage.setItem('token', result.data.token);
    return result.data;
  } else {
    throw new Error(result.msg);
  }
}

// 带认证的请求示例
async function getProfile(user_id) {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/profile/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ user_id })
  });
  
  return await response.json();
}
```

#### 0.5.2 Python (requests) 示例

```python
import requests

# 登录示例
def login(username, password):
    url = 'http://localhost:8000/api/v1/auth/login'
    data = {'username': username, 'password': password}
    response = requests.post(url, json=data)
    result = response.json()
    if result['code'] == 200:
        return result['data']
    else:
        raise Exception(result['msg'])

# 带认证的请求示例
def get_profile(user_id, token):
    url = 'http://localhost:8000/api/v1/profile/info'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    data = {'user_id': user_id}
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

### 0.6 典型使用场景

#### 场景1: 新用户注册流程
1. 调用 `/auth/register` 注册账号
2. 调用 `/auth/login` 登录获取token
3. 调用 `/profile/update` 完善个人档案
4. 调用 `/assessment/questionnaire` 获取职业测评问卷

#### 场景2: 职业规划流程
1. 完成职业测评 (`/assessment/submit`)
2. 获取测评报告 (`/assessment/report`)
3. 获取能力画像 (`/student/ability-profile`)
4. 获取推荐岗位 (`/matching/recommend-jobs`)
5. 生成职业规划报告 (`/career/generate-report`)

#### 场景3: 岗位匹配分析
1. 选择目标岗位
2. 调用 `/matching/analyze` 获取匹配分析
3. 根据分析结果制定能力提升计划
4. 定期更新档案和重新分析匹配度

---

## 1. 身份认证模块 (Auth)

### 1.1 用户注册

**功能说明**: 新用户注册账号，创建用户档案

**方法**:`POST`**路径**:`/auth/register`

**请求格式**:`multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户账号（全局唯一，类似学号） |
| password | string | 是 | 用户密码（建议6-20位） |
| nickname | string | 是 | 用户昵称（可重复） |
| avatar | file | 否 | 用户头像图片文件（jpg/png，≤2MB） |

**响应示例**:

```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "user_id": 10001,
    "username": "2021001001",
    "nickname": "李明",
    "avatar": "/uploads/avatars/10001.jpg",
    "created_at": "2026-02-14 10:30:00"
  }
}
```

**错误示例**:

```json
{
  "code": 400,
  "msg": "用户名已存在",
  "data": null
}
```

---

### 1.2 用户登录

**功能说明**: 用户登录系统，获取访问凭证

**方法**:`POST`**路径**:`/auth/login`

**请求示例**:

```json
{
  "username": "2021001001",
  "password": "password123"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "user_id": 10001,
    "username": "2021001001",
    "nickname": "李明",
    "avatar": "/uploads/avatars/10001.jpg",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "profile_completed": true,  // 档案是否完善
    "assessment_completed": false  // 是否完成职业测评
  }
}
```

**错误示例**:

```json
{
  "code": 400,
  "msg": "用户名或密码错误",
  "data": null
}
```

---

### 1.3 退出登录

**功能说明**: 用户退出系统

**方法**:`POST`**路径**:`/auth/logout`

**请求示例**:

```json
{
  "user_id": 10001
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "退出成功",
  "data": null
}
```

---

## 2. 个人档案模块 (Profile)

### 2.1 获取个人档案

**功能说明**: 获取用户的完整个人档案信息

**方法**:`POST`**路径**:`/profile/info`

**请求示例**:

```json
{
  "user_id": 10001
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "user_id": 10001,
    "basic_info": {
      "nickname": "李明",
      "avatar": "/uploads/avatars/10001.jpg",
      "gender": "男",
      "birth_date": "2002-05-15",
      "phone": "13800138000",
      "email": "[email protected]"
    },
    "education_info": {
      "school": "北京大学",
      "major": "计算机科学与技术",
      "degree": "本科",
      "grade": "2021级",
      "expected_graduation": "2026-06",
      "gpa": "3.8/4.0"
    },
    "skills": [
      {
        "category": "编程语言",
        "items": ["Python", "Java", "JavaScript"]
      },
      {
        "category": "框架工具",
        "items": ["React", "Django", "Docker"]
      },
      {
        "category": "数据技能",
        "items": ["SQL", "Pandas", "NumPy"]
      }
    ],
    "certificates": [
      {
        "name": "全国计算机等级考试二级",
        "issue_date": "2023-03",
        "cert_url": "/uploads/certs/10001_ncre.pdf"
      }
    ],
    "internships": [
      {
        "company": "腾讯科技",
        "position": "前端开发实习生",
        "start_date": "2024-06",
        "end_date": "2024-09",
        "description": "负责移动端H5页面开发"
      }
    ],
    "projects": [
      {
        "name": "校园社交平台",
        "role": "项目负责人",
        "start_date": "2023-09",
        "end_date": "2024-01",
        "description": "基于React和Node.js开发的校园社交应用",
        "tech_stack": ["React", "Node.js", "MongoDB"]
      }
    ],
    "awards": [
      {
        "name": "国家奖学金",
        "level": "国家级",
        "date": "2023-11"
      }
    ],
    "profile_completeness": 85,  // 档案完整度百分比
    "updated_at": "2026-02-10 15:30:00"
  }
}
```

---

### 2.2 更新个人档案

**功能说明**: 更新或完善个人档案信息

**方法**:`POST`**路径**:`/profile/update`

**请求示例**:

```json
{
  "user_id": 10001,
  "basic_info": {
    "nickname": "李明",
    "gender": "男",
    "birth_date": "2002-05-15",
    "phone": "13800138000",
    "email": "[email protected]"
  },
  "education_info": {
    "school": "北京大学",
    "major": "计算机科学与技术",
    "degree": "本科",
    "grade": "2021级",
    "expected_graduation": "2026-06",
    "gpa": "3.8/4.0"
  },
  "skills": [
    {
      "category": "编程语言",
      "items": ["Python", "Java", "JavaScript", "C++"]
    }
  ],
  "certificates": [
    {
      "name": "全国计算机等级考试二级",
      "issue_date": "2023-03"
    }
  ]
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "档案更新成功",
  "data": {
    "profile_completeness": 90,
    "updated_at": "2026-02-14 10:45:00"
  }
}
```

---

### 2.3 上传简历

**功能说明**: 上传简历PDF文件，AI自动解析并填充档案

**方法**:`POST`**路径**:`/profile/upload-resume`

**请求格式**:`multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| user_id | number | 是 | 用户ID |
| resume_file | file | 是 | 简历文件（PDF格式，≤10MB） |

**响应示例**:

```json
{
  "code": 200,
  "msg": "简历上传成功，正在解析...",
  "data": {
    "task_id": "resume_parse_20260214_10001",
    "status": "processing"
  }
}
```

---

### 2.4 获取简历解析结果

**功能说明**: 获取AI简历解析的结果

**方法**:`POST`**路径**:`/profile/resume-parse-result`

**请求示例**:

```json
{
  "user_id": 10001,
  "task_id": "resume_parse_20260214_10001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "status": "completed",  // processing/completed/failed
    "parsed_data": {
      "basic_info": {
        "name": "李明",
        "phone": "13800138000",
        "email": "[email protected]"
      },
      "education": [...],
      "skills": [...],
      "internships": [...],
      "projects": [...]
    },
    "confidence_score": 0.92,  // AI解析置信度
    "suggestions": [
      "建议补充GPA信息",
      "实习经历描述可以更具体"
    ]
  }
}
```

---

## 3. 职业测评模块 (Assessment)

### 3.1 获取测评问卷

**功能说明**: 获取职业测评问卷题目

**方法**:`POST`**路径**:`/assessment/questionnaire`

**请求示例**:

```json
{
  "user_id": 10001,
  "assessment_type": "comprehensive"  // comprehensive: 综合测评, quick: 快速测评
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "assessment_id": "assess_20260214_10001",
    "total_questions": 50,
    "estimated_time": 15,  // 预计耗时（分钟）
    "dimensions": [
      {
        "dimension_id": "interest",
        "dimension_name": "职业兴趣",
        "questions": [
          {
            "question_id": "q001",
            "question_text": "你更喜欢哪种工作方式？",
            "question_type": "single_choice",  // single_choice/multiple_choice/scale
            "options": [
              {"option_id": "A", "option_text": "独立完成任务"},
              {"option_id": "B", "option_text": "团队协作完成"},
              {"option_id": "C", "option_text": "两者都可以"}
            ]
          }
        ]
      },
      {
        "dimension_id": "personality",
        "dimension_name": "性格特质",
        "questions": [...]
      },
      {
        "dimension_id": "ability",
        "dimension_name": "能力倾向",
        "questions": [...]
      },
      {
        "dimension_id": "values",
        "dimension_name": "职业价值观",
        "questions": [...]
      }
    ]
  }
}
```

---

### 3.2 提交测评答案

**功能说明**: 提交职业测评答卷

**方法**:`POST`**路径**:`/assessment/submit`

**请求示例**:

```json
{
  "user_id": 10001,
  "assessment_id": "assess_20260214_10001",
  "answers": [
    {
      "question_id": "q001",
      "answer": "A"
    },
    {
      "question_id": "q002",
      "answer": ["A", "C"]  // 多选题
    },
    {
      "question_id": "q003",
      "answer": 4  // 量表题（1-5分）
    }
  ],
  "time_spent": 12  // 实际耗时（分钟）
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "测评提交成功，正在生成报告...",
  "data": {
    "report_id": "report_20260214_10001",
    "status": "processing"
  }
}
```

---

### 3.3 获取测评报告

**功能说明**: 获取职业测评诊断报告

**方法**:`POST`**路径**:`/assessment/report`

**请求示例**:

```json
{
  "user_id": 10001,
  "report_id": "report_20260214_10001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "report_id": "report_20260214_10001",
    "user_id": 10001,
    "assessment_date": "2026-02-14",
    "status": "completed",
    
    // 职业兴趣分析
    "interest_analysis": {
      "holland_code": "RIA",  // 霍兰德职业兴趣代码
      "primary_interest": {
        "type": "研究型(I)",
        "score": 85,
        "description": "喜欢观察、学习、研究、分析、评估和解决问题"
      },
      "interest_distribution": [
        {"type": "研究型(I)", "score": 85},
        {"type": "实用型(R)", "score": 72},
        {"type": "艺术型(A)", "score": 65}
      ],
      "suitable_fields": [
        "软件开发",
        "数据分析",
        "算法工程师",
        "人工智能研发"
      ]
    },
    
    // 性格特质分析
    "personality_analysis": {
      "mbti_type": "INTJ",
      "traits": [
        {
          "trait_name": "外向性",
          "score": 45,
          "level": "偏内向",
          "description": "更倾向于独立思考和深度工作"
        },
        {
          "trait_name": "开放性",
          "score": 82,
          "level": "高",
          "description": "对新事物充满好奇，善于学习新技能"
        },
        {
          "trait_name": "尽责性",
          "score": 78,
          "level": "高",
          "description": "做事认真负责，注重细节"
        }
      ]
    },
    
    // 能力倾向分析
    "ability_analysis": {
      "strengths": [
        {
          "ability": "逻辑分析能力",
          "score": 88,
          "description": "擅长发现问题本质和规律"
        },
        {
          "ability": "学习能力",
          "score": 85,
          "description": "能够快速掌握新知识和技能"
        }
      ],
      "areas_to_improve": [
        {
          "ability": "沟通表达能力",
          "score": 62,
          "suggestions": [
            "多参加团队讨论和技术分享",
            "练习清晰表达技术方案"
          ]
        }
      ]
    },
    
    // 职业价值观
    "values_analysis": {
      "top_values": [
        {
          "value": "成就感",
          "score": 90,
          "description": "追求技术突破和个人成长"
        },
        {
          "value": "学习发展",
          "score": 88,
          "description": "重视持续学习和能力提升"
        }
      ]
    },
    
    // 综合建议
    "recommendations": {
      "suitable_careers": [
        {
          "career": "算法工程师",
          "match_score": 92,
          "reasons": [
            "与你的研究型兴趣高度匹配",
            "充分发挥逻辑分析和学习能力",
            "符合追求成就感的价值观"
          ]
        },
        {
          "career": "后端开发工程师",
          "match_score": 87,
          "reasons": [...]
        }
      ],
      "development_suggestions": [
        "加强沟通表达能力的训练",
        "多参与团队项目提升协作能力",
        "保持技术深度的同时拓展技术广度"
      ]
    }
  }
}
```

---

## 4. 岗位画像模块 (Job Profile)

### 4.1 获取岗位画像列表

**功能说明**: 获取系统中的岗位画像库（至少10个岗位）

**方法**:`POST`**路径**:`/job/profiles`

**请求示例**:

```json
{
  "page": 1,
  "size": 20,
  "keyword": "算法",  // 可选，搜索关键词
  "industry": "互联网",  // 可选，筛选行业
  "level": "初级"  // 可选，岗位级别: 初级/中级/高级
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 120,
    "page": 1,
    "size": 20,
    "list": [
      {
        "job_id": "job_001",
        "job_name": "算法工程师",
        "job_code": "ALG001",
        "industry": "互联网",
        "level": "初级",
        "avg_salary": "15k-25k",
        "description": "负责机器学习算法的研究、开发和优化",
        "demand_score": 85,  // 市场需求热度（0-100）
        "growth_trend": "上升",  // 发展趋势：上升/平稳/下降
        "tags": ["人工智能", "机器学习", "Python"],
        "created_at": "2026-01-15"
      }
    ]
  }
}
```

---

### 4.2 获取岗位详细画像

**功能说明**: 获取单个岗位的详细画像信息

**方法**:`POST`**路径**:`/job/profile/detail`

**请求示例**:

```json
{
  "job_id": "job_001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "job_id": "job_001",
    "job_name": "算法工程师",
    "job_code": "ALG001",
    "basic_info": {
      "industry": "互联网",
      "level": "初级",
      "avg_salary": "15k-25k",
      "work_locations": ["北京", "上海", "深圳", "杭州"],
      "company_scales": ["100-500人", "500-2000人", "2000人以上"],
      "description": "负责机器学习算法的研究、开发和优化，解决实际业务问题"
    },
    
    // 能力要求画像
    "requirements": {
      // 基础要求
      "basic_requirements": {
        "education": {
          "level": "本科及以上",
          "preferred_majors": [
            "计算机科学与技术",
            "软件工程",
            "人工智能",
            "数学与应用数学"
          ],
          "weight": 0.15
        },
        "gpa": {
          "min_requirement": "3.0/4.0",
          "preferred": "3.5/4.0以上",
          "weight": 0.05
        }
      },
      
      // 专业技能要求
      "professional_skills": {
        "programming_languages": [
          {
            "skill": "Python",
            "level": "熟练",  // 了解/熟悉/熟练/精通
            "importance": "必需",  // 必需/重要/加分
            "weight": 0.10
          },
          {
            "skill": "C++",
            "level": "熟悉",
            "importance": "重要",
            "weight": 0.05
          }
        ],
        "frameworks_tools": [
          {
            "skill": "TensorFlow/PyTorch",
            "level": "熟练",
            "importance": "必需",
            "weight": 0.15
          },
          {
            "skill": "Scikit-learn",
            "level": "熟悉",
            "importance": "重要",
            "weight": 0.08
          }
        ],
        "algorithms_theory": [
          {
            "skill": "机器学习算法",
            "level": "熟练",
            "importance": "必需",
            "weight": 0.12
          },
          {
            "skill": "深度学习",
            "level": "熟悉",
            "importance": "重要",
            "weight": 0.10
          }
        ],
        "total_weight": 0.40
      },
      
      // 证书要求
      "certificates": {
        "required": [],
        "preferred": [
          "AWS机器学习认证",
          "Google TensorFlow开发者证书"
        ],
        "weight": 0.05
      },
      
      // 职业素养
      "soft_skills": {
        "innovation_ability": {
          "description": "能够提出创新的算法方案",
          "level": "高",
          "weight": 0.08
        },
        "learning_ability": {
          "description": "快速学习新技术和算法",
          "level": "高",
          "weight": 0.10
        },
        "pressure_resistance": {
          "description": "能够在项目压力下保持高效",
          "level": "中",
          "weight": 0.05
        },
        "communication_ability": {
          "description": "清晰表达技术方案，与团队协作",
          "level": "中",
          "weight": 0.07
        },
        "total_weight": 0.30
      },
      
      // 实习/项目经验
      "experience": {
        "internship_required": false,
        "preferred_experience": [
          "机器学习相关实习经验",
          "算法竞赛经历（Kaggle等）",
          "开源项目贡献"
        ],
        "project_requirements": [
          "至少1个完整的机器学习项目",
          "有模型训练和部署经验"
        ],
        "weight": 0.10
      }
    },
    
    // 市场分析
    "market_analysis": {
      "demand_score": 85,
      "growth_trend": "上升",
      "salary_range": {
        "junior": "15k-25k",
        "intermediate": "25k-40k",
        "senior": "40k-70k"
      },
      "hottest_cities": [
        {"city": "北京", "job_count": 1500},
        {"city": "上海", "job_count": 1200},
        {"city": "深圳", "job_count": 800}
      ],
      "top_companies": [
        "字节跳动", "阿里巴巴", "腾讯", "百度", "华为"
      ],
      "industry_trends": [
        "大模型应用场景持续扩大",
        "多模态AI成为新热点",
        "AI+垂直行业深度融合"
      ]
    },
    
    // 发展路径（垂直岗位图谱）
    "career_path": {
      "current_level": "初级算法工程师",
      "promotion_path": [
        {
          "level": "中级算法工程师",
          "years_required": "2-3年",
          "key_requirements": [
            "独立负责算法模块",
            "优化算法性能",
            "指导初级工程师"
          ]
        },
        {
          "level": "高级算法工程师",
          "years_required": "3-5年",
          "key_requirements": [
            "设计复杂算法架构",
            "解决关键技术难题",
            "带领算法团队"
          ]
        },
        {
          "level": "算法专家/技术总监",
          "years_required": "5-8年",
          "key_requirements": [
            "制定技术战略",
            "行业影响力",
            "管理大型团队"
          ]
        }
      ]
    },
    
    // 换岗路径图谱
    "transfer_paths": [
      {
        "target_job": "数据科学家",
        "relevance_score": 85,
        "required_skills": [
          "统计分析能力",
          "业务理解能力",
          "数据可视化"
        ],
        "transition_difficulty": "中",
        "estimated_time": "6-12个月"
      },
      {
        "target_job": "机器学习工程师",
        "relevance_score": 90,
        "required_skills": [
          "模型部署",
          "工程化能力",
          "系统设计"
        ],
        "transition_difficulty": "低",
        "estimated_time": "3-6个月"
      }
    ]
  }
}
```

---

### 4.3 获取岗位关联图谱

**功能说明**: 获取岗位间的血缘关系和转换路径

**方法**:`POST`**路径**:`/job/relation-graph`

**请求示例**:

```json
{
  "job_id": "job_001",
  "graph_type": "all"  // vertical: 垂直晋升, transfer: 横向转岗, all: 全部
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "center_job": {
      "job_id": "job_001",
      "job_name": "算法工程师",
      "level": "初级"
    },
    
    // 垂直晋升图谱
    "vertical_graph": {
      "nodes": [
        {
          "job_id": "job_001",
          "job_name": "初级算法工程师",
          "level": 1
        },
        {
          "job_id": "job_002",
          "job_name": "中级算法工程师",
          "level": 2
        },
        {
          "job_id": "job_003",
          "job_name": "高级算法工程师",
          "level": 3
        },
        {
          "job_id": "job_004",
          "job_name": "算法专家",
          "level": 4
        }
      ],
      "edges": [
        {
          "from": "job_001",
          "to": "job_002",
          "years": "2-3",
          "requirements": ["独立项目经验", "算法优化能力"]
        },
        {
          "from": "job_002",
          "to": "job_003",
          "years": "3-5",
          "requirements": ["架构设计能力", "技术攻坚能力"]
        }
      ]
    },
    
    // 横向转岗图谱
    "transfer_graph": {
      "nodes": [
        {
          "job_id": "job_001",
          "job_name": "算法工程师"
        },
        {
          "job_id": "job_010",
          "job_name": "数据科学家"
        },
        {
          "job_id": "job_011",
          "job_name": "机器学习工程师"
        },
        {
          "job_id": "job_012",
          "job_name": "AI产品经理"
        }
      ],
      "edges": [
        {
          "from": "job_001",
          "to": "job_010",
          "relevance_score": 85,
          "difficulty": "中",
          "time": "6-12个月",
          "skills_gap": ["统计学", "业务分析", "可视化"]
        },
        {
          "from": "job_001",
          "to": "job_011",
          "relevance_score": 90,
          "difficulty": "低",
          "time": "3-6个月",
          "skills_gap": ["模型部署", "工程化"]
        }
      ]
    }
  }
}
```

---

### 4.4 AI生成岗位画像

**功能说明**: 使用AI大模型分析岗位数据，生成新的岗位画像

**方法**:`POST`**路径**:`/job/ai-generate-profile`

**请求示例**:

```json
{
  "job_name": "AI产品经理",
  "job_descriptions": [
    "负责AI产品的规划和设计...",
    "协调技术团队完成产品开发...",
    // 从招聘网站抓取的多个岗位描述
  ],
  "sample_size": 50  // 分析的样本数量
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "AI画像生成中...",
  "data": {
    "task_id": "job_gen_20260214_001",
    "status": "processing",
    "estimated_time": 30  // 预计耗时（秒）
  }
}
```

---

### 4.5 获取AI生成结果

**功能说明**: 获取AI岗位画像生成结果

**方法**:`POST`**路径**:`/job/ai-generate-result`

**请求示例**:

```json
{
  "task_id": "job_gen_20260214_001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "status": "completed",
    "job_profile": {
      // 完整的岗位画像数据（格式同4.2）
      "job_id": "job_new_001",
      "job_name": "AI产品经理",
      "requirements": {...},
      "market_analysis": {...}
    },
    "ai_confidence": 0.88,  // AI生成的置信度
    "data_sources": {
      "total_samples": 50,
      "valid_samples": 47,
      "analysis_date": "2026-02-14"
    }
  }
}
```

---

## 5. 学生能力画像模块 (Student Profile)

### 5.1 获取学生能力画像

**功能说明**: 获取学生的就业能力画像和评分

**方法**:`POST`**路径**:`/student/ability-profile`

**请求示例**:

```json
{
  "user_id": 10001
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "user_id": 10001,
    "profile_id": "profile_10001",
    "generated_at": "2026-02-14 11:00:00",
    
    // 基础信息
    "basic_info": {
      "education": "本科",
      "major": "计算机科学与技术",
      "school": "北京大学",
      "gpa": "3.8/4.0",
      "expected_graduation": "2026-06"
    },
    
    // 专业技能画像
    "professional_skills": {
      "programming_languages": [
        {
          "skill": "Python",
          "level": "熟练",
          "evidence": [
            "3个Python项目经验",
            "开源贡献500+ commits"
          ],
          "score": 85
        },
        {
          "skill": "Java",
          "level": "熟悉",
          "evidence": ["课程项目", "实习应用"],
          "score": 70
        }
      ],
      "frameworks_tools": [
        {
          "skill": "React",
          "level": "熟练",
          "evidence": ["2个前端项目"],
          "score": 80
        }
      ],
      "domain_knowledge": [
        {
          "domain": "机器学习",
          "level": "熟悉",
          "evidence": ["相关课程", "Kaggle竞赛"],
          "score": 75
        }
      ],
      "overall_score": 78
    },
    
    // 证书资质
    "certificates": {
      "items": [
        {
          "name": "全国计算机等级考试二级",
          "level": "二级",
          "issue_date": "2023-03"
        }
      ],
      "score": 60,
      "competitiveness": "中等"
    },
    
    // 创新能力
    "innovation_ability": {
      "projects": [
        {
          "name": "校园社交平台",
          "innovation_points": [
            "首创校园匿名树洞功能",
            "基于LBS的校友发现"
          ],
          "impact": "1000+用户使用"
        }
      ],
      "competitions": [
        {
          "name": "中国大学生计算机设计大赛",
          "award": "省级二等奖"
        }
      ],
      "score": 72,
      "level": "中上"
    },
    
    // 学习能力
    "learning_ability": {
      "indicators": [
        {
          "indicator": "GPA",
          "value": 3.8,
          "percentile": 85  // 在本专业的百分位
        },
        {
          "indicator": "自学新技术",
          "evidence": [
            "1个月掌握React框架",
            "自学机器学习并完成项目"
          ]
        }
      ],
      "score": 85,
      "level": "优秀"
    },
    
    // 抗压能力
    "pressure_resistance": {
      "evidence": [
        "同时处理3门课程期末+实习",
        "项目deadline前完成高质量交付"
      ],
      "assessment_score": 75,  // 基于测评问卷
      "level": "良好"
    },
    
    // 沟通能力
    "communication_ability": {
      "teamwork": {
        "evidence": [
          "担任3个项目的技术负责人",
          "协调5人团队完成开发"
        ],
        "score": 70
      },
      "presentation": {
        "evidence": [
          "技术分享会演讲3次",
          "项目答辩获得好评"
        ],
        "score": 75
      },
      "overall_score": 72,
      "level": "良好"
    },
    
    // 实习/项目经验
    "practical_experience": {
      "internships": [
        {
          "company": "腾讯科技",
          "position": "前端开发实习生",
          "duration": "3个月",
          "achievements": [
            "独立完成2个H5页面开发",
            "优化页面加载速度30%"
          ],
          "score": 80
        }
      ],
      "projects": [
        {
          "name": "校园社交平台",
          "role": "项目负责人",
          "complexity": "高",
          "score": 85
        }
      ],
      "overall_score": 82
    },
    
    // 综合评分
    "overall_assessment": {
      "total_score": 76,  // 总分（0-100）
      "percentile": 78,  // 在同专业学生中的百分位
      "completeness": 90,  // 画像完整度
      "competitiveness": "中上",  // 竞争力等级：优秀/中上/中等/待提升
      "strengths": [
        "学习能力强，GPA优秀",
        "有完整的项目和实习经验",
        "技术栈较为全面"
      ],
      "weaknesses": [
        "缺少技术证书",
        "沟通能力有提升空间",
        "创新项目影响力可以更大"
      ]
    }
  }
}
```

---

### 5.2 AI生成学生能力画像

**功能说明**: 使用AI分析学生档案和简历，生成能力画像

**方法**:`POST`**路径**:`/student/ai-generate-profile`

**请求示例**:

```json
{
  "user_id": 10001,
  "data_source": "profile"  // profile: 使用档案数据, resume: 使用简历文件
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "AI画像生成中...",
  "data": {
    "task_id": "stu_gen_20260214_10001",
    "status": "processing"
  }
}
```

---

### 5.3 更新能力画像

**功能说明**: 手动更新或补充能力画像信息

**方法**:`POST`**路径**:`/student/update-profile`

**请求示例**:

```json
{
  "user_id": 10001,
  "updates": {
    "professional_skills": {
      "programming_languages": [
        {
          "skill": "Go",
          "level": "熟悉",
          "evidence": ["完成2个Go项目"]
        }
      ]
    },
    "certificates": {
      "items": [
        {
          "name": "AWS云从业者认证",
          "issue_date": "2026-01-15"
        }
      ]
    }
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "画像更新成功",
  "data": {
    "updated_at": "2026-02-14 11:30:00",
    "new_total_score": 78,
    "score_change": +2
  }
}
```

---

## 6. 人岗匹配模块 (Job Matching)

### 6.1 获取推荐岗位

**功能说明**: 基于学生能力画像，推荐匹配的岗位

**方法**:`POST`**路径**:`/matching/recommend-jobs`

**请求示例**:

```json
{
  "user_id": 10001,
  "top_n": 10,  // 返回前N个推荐
  "filters": {
    "cities": ["北京", "上海"],  // 可选
    "salary_min": 15000,  // 可选
    "industries": ["互联网"]  // 可选
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total_matched": 45,
    "recommendations": [
      {
        "job_id": "job_001",
        "job_name": "算法工程师",
        "match_score": 92,  // 总体匹配度（0-100）
        "match_level": "高度匹配",  // 高度匹配/较为匹配/一般匹配
        
        // 多维度匹配分析
        "dimension_scores": {
          "basic_requirements": {
            "score": 95,
            "weight": 0.15,
            "details": {
              "education": {
                "required": "本科",
                "student": "本科",
                "match": true
              },
              "major": {
                "required": ["计算机", "软件工程"],
                "student": "计算机科学与技术",
                "match": true
              },
              "gpa": {
                "required": "3.0",
                "student": "3.8",
                "match": true
              }
            }
          },
          
          "professional_skills": {
            "score": 88,
            "weight": 0.40,
            "details": {
              "matched_skills": [
                {
                  "skill": "Python",
                  "required_level": "熟练",
                  "student_level": "熟练",
                  "match": true
                },
                {
                  "skill": "TensorFlow",
                  "required_level": "熟练",
                  "student_level": "熟悉",
                  "match": "部分匹配"
                }
              ],
              "missing_skills": [
                {
                  "skill": "Spark",
                  "importance": "重要",
                  "learning_difficulty": "中"
                }
              ],
              "match_rate": 0.85  // 技能匹配率
            }
          },
          
          "soft_skills": {
            "score": 90,
            "weight": 0.30,
            "details": {
              "innovation_ability": {
                "required": "高",
                "student": "中上",
                "score": 88
              },
              "learning_ability": {
                "required": "高",
                "student": "优秀",
                "score": 95
              },
              "communication_ability": {
                "required": "中",
                "student": "良好",
                "score": 90
              }
            }
          },
          
          "development_potential": {
            "score": 93,
            "weight": 0.15,
            "details": {
              "growth_mindset": "优秀",
              "career_clarity": "清晰",
              "motivation": "强"
            }
          }
        },
        
        // 匹配亮点
        "highlights": [
          "学习能力强，符合岗位高要求",
          "有相关实习经验，快速上手",
          "技术栈覆盖80%以上岗位需求"
        ],
        
        // 能力差距
        "gaps": [
          {
            "gap": "缺少Spark大数据处理经验",
            "importance": "重要",
            "suggestion": "可通过在线课程1-2个月学习"
          },
          {
            "gap": "TensorFlow需要进阶",
            "importance": "必需",
            "suggestion": "深入学习模型优化和部署"
          }
        ],
        
        // 岗位基本信息
        "job_info": {
          "company": "字节跳动",
          "location": "北京",
          "salary": "20k-35k",
          "experience": "应届生/1年经验"
        }
      }
    ]
  }
}
```

---

### 6.2 获取单个岗位匹配分析

**功能说明**: 分析学生与指定岗位的匹配情况

**方法**:`POST`**路径**:`/matching/analyze`

**请求示例**:

```json
{
  "user_id": 10001,
  "job_id": "job_001"
}
```

**响应示例**: （格式同6.1中单个推荐的详细格式）

---

### 6.3 批量匹配分析

**功能说明**: 分析学生与多个岗位的匹配情况

**方法**:`POST`**路径**:`/matching/batch-analyze`

**请求示例**:

```json
{
  "user_id": 10001,
  "job_ids": ["job_001", "job_002", "job_003"]
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "analyses": [
      {
        "job_id": "job_001",
        "job_name": "算法工程师",
        "match_score": 92,
        "match_level": "高度匹配",
        // 其他匹配详情...
      },
      {
        "job_id": "job_002",
        "job_name": "前端开发工程师",
        "match_score": 85,
        "match_level": "较为匹配"
      }
    ],
    "best_match": {
      "job_id": "job_001",
      "job_name": "算法工程师",
      "match_score": 92
    }
  }
}
```

---

## 7. 职业规划报告模块 (Career Report)

### 7.1 生成职业规划报告

**功能说明**: AI生成个性化的职业生涯发展报告

**方法**:`POST`**路径**:`/career/generate-report`

**请求示例**:

```json
{
  "user_id": 10001,
  "target_jobs": ["job_001", "job_002"],  // 可选，目标岗位
  "preferences": {
    "career_goal": "技术专家",  // 职业目标类型
    "work_location": "北京",
    "salary_expectation": "25k+",
    "work_life_balance": "中"  // 工作生活平衡偏好：高/中/低
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "报告生成中，预计需要30秒...",
  "data": {
    "report_id": "report_career_20260214_10001",
    "status": "processing"
  }
}
```

---

### 7.2 获取职业规划报告

**功能说明**: 获取生成的职业规划报告

**方法**:`POST`**路径**:`/career/report`

**请求示例**:

```json
{
  "user_id": 10001,
  "report_id": "report_career_20260214_10001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "report_id": "report_career_20260214_10001",
    "user_id": 10001,
    "generated_at": "2026-02-14 12:00:00",
    "status": "completed",
    
    // 报告元数据
    "metadata": {
      "version": "v1.0",
      "ai_model": "claude-sonnet-4",
      "confidence_score": 0.91,
      "completeness": 95
    },
    
    // 第一部分：职业探索与岗位匹配
    "section_1_job_matching": {
      "title": "职业探索与岗位匹配",
      
      // 自我认知总结
      "self_assessment": {
        "strengths": [
          "学习能力强，快速掌握新技术",
          "逻辑思维能力突出",
          "有扎实的编程基础和项目经验"
        ],
        "interests": [
          "对人工智能和算法有浓厚兴趣",
          "喜欢解决复杂技术问题",
          "追求技术深度"
        ],
        "values": [
          "重视个人技术成长",
          "追求工作成就感",
          "希望参与有影响力的项目"
        ]
      },
      
      // 推荐职业方向
      "recommended_careers": [
        {
          "career": "算法工程师",
          "match_score": 92,
          "match_analysis": {
            "why_suitable": [
              "你的研究型兴趣与算法岗位高度契合",
              "强大的学习能力适合快速迭代的算法领域",
              "逻辑分析能力是算法工程师的核心素质"
            ],
            "capability_match": {
              "professional_skills": {
                "score": 88,
                "description": "技术栈覆盖80%岗位需求，Python和机器学习基础扎实"
              },
              "soft_skills": {
                "score": 90,
                "description": "学习能力、创新能力与岗位要求高度匹配"
              }
            },
            "gaps_and_solutions": [
              {
                "gap": "缺少大规模数据处理经验",
                "solution": "学习Spark等大数据框架，通过Kaggle竞赛积累经验",
                "priority": "高",
                "timeline": "2-3个月"
              },
              {
                "gap": "深度学习框架需要进阶",
                "solution": "深入学习TensorFlow/PyTorch，完成1-2个深度学习项目",
                "priority": "高",
                "timeline": "1-2个月"
              }
            ]
          },
          "market_outlook": {
            "demand": "高",
            "growth_trend": "持续上升",
            "salary_range": "15k-25k（应届）→ 25k-40k（2-3年）",
            "key_trends": [
              "大模型应用爆发式增长",
              "多模态AI成为新热点",
              "垂直领域AI深度应用"
            ]
          }
        },
        {
          "career": "后端开发工程师",
          "match_score": 85,
          "match_analysis": {...}
        }
      ],
      
      // 职业选择建议
      "career_choice_advice": {
        "primary_recommendation": "算法工程师",
        "reasons": [
          "与你的兴趣、能力、价值观高度契合",
          "市场需求旺盛，发展前景好",
          "能够充分发挥你的技术优势"
        ],
        "alternative_option": "机器学习工程师（偏工程化方向）",
        "risk_mitigation": "建议同时关注后端开发技能，增加就业灵活性"
      }
    },
    
    // 第二部分：职业目标设定与职业路径规划
    "section_2_career_path": {
      "title": "职业目标设定与职业路径规划",
      
      // 短期目标（1年内）
      "short_term_goal": {
        "timeline": "2026.06 - 2026.06",
        "primary_goal": "成功入职算法工程师岗位，完成职业起步",
        "specific_targets": [
          {
            "target": "获得算法工程师offer",
            "metrics": "至少2个中大厂offer",
            "deadline": "2026.06"
          },
          {
            "target": "快速融入团队",
            "metrics": "3个月内独立负责算法模块",
            "deadline": "2026.09"
          },
          {
            "target": "建立技术基础",
            "metrics": "掌握公司核心算法框架和业务",
            "deadline": "2026.06"
          }
        ]
      },
      
      // 中期目标（3-5年）
      "mid_term_goal": {
        "timeline": "2026 - 2030",
        "primary_goal": "成长为中高级算法工程师，建立技术影响力",
        "specific_targets": [
          {
            "target": "晋升为中级算法工程师",
            "metrics": "独立负责关键算法项目",
            "deadline": "2027"
          },
          {
            "target": "技术深度突破",
            "metrics": "在某一细分领域成为团队专家",
            "deadline": "2028"
          },
          {
            "target": "建立行业影响力",
            "metrics": "发表技术博客，参加技术会议",
            "deadline": "2029"
          }
        ]
      },
      
      // 职业发展路径
      "career_roadmap": {
        "path_type": "技术专家路线",
        "stages": [
          {
            "stage": "初级算法工程师",
            "period": "1-2年",
            "key_responsibilities": [
              "完成分配的算法开发任务",
              "优化现有算法性能",
              "学习业务和技术架构"
            ],
            "success_criteria": [
              "独立完成算法模块开发",
              "代码质量达到团队标准",
              "理解核心业务逻辑"
            ]
          },
          {
            "stage": "中级算法工程师",
            "period": "2-3年",
            "key_responsibilities": [
              "负责核心算法设计",
              "解决技术难题",
              "指导初级工程师"
            ],
            "success_criteria": [
              "设计的算法性能提升显著",
              "攻克2-3个技术难点",
              "获得晋升委员会认可"
            ]
          },
          {
            "stage": "高级算法工程师/算法专家",
            "period": "3-5年",
            "key_responsibilities": [
              "设计算法架构",
              "带领算法团队",
              "制定技术方向"
            ],
            "success_criteria": [
              "成为某领域的技术专家",
              "带领团队完成重要项目",
              "有行业影响力（论文/专利）"
            ]
          }
        ],
        
        // 转岗备选方案
        "alternative_paths": [
          {
            "path": "横向转岗 → 数据科学家",
            "timing": "2-3年工作经验后",
            "reason": "算法能力可迁移，拓展业务分析能力",
            "preparation": [
              "加强统计学和业务理解",
              "学习数据可视化工具",
              "参与业务数据分析项目"
            ]
          },
          {
            "path": "向上转型 → AI产品经理",
            "timing": "4-5年工作经验后",
            "reason": "技术背景+产品思维",
            "preparation": [
              "培养产品sense",
              "提升沟通和项目管理能力",
              "理解商业和用户需求"
            ]
          }
        ]
      },
      
      // 行业发展趋势分析
      "industry_trends": {
        "current_status": "AI算法岗位需求持续旺盛",
        "key_trends": [
          {
            "trend": "大模型应用普及",
            "impact": "对算法工程师的工程能力要求提高",
            "opportunity": "掌握大模型应用开发将成为核心竞争力"
          },
          {
            "trend": "AI+垂直行业融合",
            "impact": "需要懂业务的算法工程师",
            "opportunity": "选择一个垂直领域深耕（如医疗AI、金融AI）"
          },
          {
            "trend": "自动化机器学习(AutoML)",
            "impact": "部分基础算法工作被替代",
            "opportunity": "专注高价值的算法创新和优化"
          }
        ],
        "5_year_outlook": "算法工程师将从纯技术岗位向技术+业务复合型人才转变"
      }
    },
    
    // 第三部分：行动计划与成果展示
    "section_3_action_plan": {
      "title": "行动计划与成果展示",
      
      // 短期行动计划（6个月）
      "short_term_plan": {
        "period": "2026.02 - 2026.08",
        "goal": "补齐能力短板，冲刺校招offer",
        "monthly_plans": [
          {
            "month": "2026.02 - 2026.03",
            "focus": "技能提升",
            "tasks": [
              {
                "task": "深度学习进阶",
                "具体行动": [
                  "完成斯坦福CS231n课程",
                  "复现3篇经典论文(ResNet, Transformer, BERT)",
                  "参加Kaggle计算机视觉竞赛"
                ],
                "预期成果": "掌握深度学习核心算法，获得竞赛Top 10%",
                "时间投入": "每周15小时"
              },
              {
                "task": "大数据处理",
                "具体行动": [
                  "学习Spark基础和实战",
                  "使用Spark处理1个亿级数据集"
                ],
                "预期成果": "掌握大规模数据处理流程",
                "时间投入": "每周10小时"
              }
            ],
            "milestone": "完成2个深度学习项目，Spark实战项目"
          },
          {
            "month": "2026.03 - 2026.04",
            "focus": "项目实战",
            "tasks": [
              {
                "task": "完整算法项目",
                "具体行动": [
                  "选择一个实际问题（如推荐系统、NLP应用）",
                  "从数据收集→模型训练→部署全流程",
                  "写技术博客记录"
                ],
                "预期成果": "GitHub star 100+，可用于面试展示",
                "时间投入": "每周20小时"
              }
            ],
            "milestone": "完成1个高质量开源项目"
          },
          {
            "month": "2026.04 - 2026.06",
            "focus": "求职冲刺",
            "tasks": [
              {
                "task": "算法刷题",
                "具体行动": [
                  "LeetCode刷300题（中等150+困难50）",
                  "准备常见算法面试题"
                ],
                "预期成果": "算法面试通过率80%+",
                "时间投入": "每周15小时"
              },
              {
                "task": "简历优化与投递",
                "具体行动": [
                  "突出项目成果和技术亮点",
                  "提前批投递20+公司"
                ],
                "预期成果": "获得10+面试机会",
                "时间投入": "每周5小时"
              },
              {
                "task": "面试准备",
                "具体行动": [
                  "总结项目经验STAR法则",
                  "准备技术问题和行为面试",
                  "模拟面试3次"
                ],
                "预期成果": "offer转化率50%+",
                "时间投入": "每周10小时"
              }
            ],
            "milestone": "获得2-3个算法工程师offer"
          }
        ]
      },
      
      // 中期行动计划（1-3年）
      "mid_term_plan": {
        "period": "2026.06 - 2028.06",
        "goal": "从初级到中高级算法工程师的成长",
        "yearly_plans": [
          {
            "year": "第1年 (2026.06-2026.06)",
            "focus": "快速成长，建立基础",
            "key_tasks": [
              "完成公司新人培训和导师制项目",
              "独立负责2-3个算法优化任务",
              "深入学习公司业务和技术栈",
              "建立技术博客，分享学习心得"
            ],
            "evaluation_metrics": [
              "绩效评级：达到或超过预期",
              "独立完成算法模块开发",
              "技术博客阅读量5000+"
            ]
          },
          {
            "year": "第2年 (2026.06-2027.06)",
            "focus": "技术深化，寻求突破",
            "key_tasks": [
              "主导1个核心算法项目",
              "在某一细分领域（如NLP/CV）建立专长",
              "参加1-2次技术会议/竞赛",
              "指导1-2名新人"
            ],
            "evaluation_metrics": [
              "项目成果：算法性能提升30%+",
              "获得团队技术专家认可",
              "晋升为中级算法工程师"
            ]
          },
          {
            "year": "第3年 (2027.06-2028.06)",
            "focus": "建立影响力，冲击高级",
            "key_tasks": [
              "负责核心算法架构设计",
              "发表1-2篇技术论文或申请专利",
              "参与技术规划和团队建设",
              "行业技术分享3次以上"
            ],
            "evaluation_metrics": [
              "成为某领域的技术专家",
              "绩效连续优秀",
              "获得高级工程师提名"
            ]
          }
        ]
      },
      
      // 学习路径
      "learning_path": {
        "technical_skills": [
          {
            "skill_area": "深度学习",
            "current_level": "熟悉",
            "target_level": "精通",
            "learning_resources": [
              "课程：斯坦福CS231n、CS224n",
              "书籍：《深度学习》(花书)",
              "实践：Kaggle竞赛、复现论文"
            ],
            "timeline": "6个月"
          },
          {
            "skill_area": "大数据处理",
            "current_level": "了解",
            "target_level": "熟练",
            "learning_resources": [
              "课程：Spark官方教程",
              "项目：处理公司实际数据",
              "社区：参与开源项目"
            ],
            "timeline": "3个月"
          }
        ],
        "soft_skills": [
          {
            "skill": "技术沟通",
            "improvement_plan": [
              "每月1次技术分享",
              "撰写清晰的技术文档",
              "参加公开演讲培训"
            ],
            "timeline": "持续提升"
          }
        ]
      },
      
      // 成果展示计划
      "achievement_showcase": {
        "portfolio_building": {
          "github": {
            "goal": "打造个人技术品牌",
            "actions": [
              "开源2-3个高质量项目",
              "维护技术博客，Star 500+",
              "贡献知名开源项目"
            ]
          },
          "technical_blog": {
            "goal": "建立技术影响力",
            "actions": [
              "每月1-2篇技术文章",
              "总阅读量10万+",
              "在掘金/知乎/CSDN建立专栏"
            ]
          },
          "competitions": {
            "goal": "验证技术能力",
            "actions": [
              "参加3次Kaggle竞赛，Top 10%",
              "参加1次算法挑战赛，获奖"
            ]
          }
        }
      }
    },
    
    // 第四部分：动态评估与调整机制
    "section_4_evaluation": {
      "title": "评估周期与动态调整",
      
      "evaluation_system": {
        "monthly_review": {
          "frequency": "每月1次",
          "review_items": [
            "学习目标完成度",
            "项目进展情况",
            "技能提升评估"
          ],
          "adjustment_triggers": [
            "目标完成度<70% → 调整计划或降低难度",
            "提前完成 → 增加挑战性任务"
          ]
        },
        "quarterly_review": {
          "frequency": "每季度1次",
          "review_items": [
            "能力画像更新",
            "人岗匹配度重新评估",
            "职业目标校准"
          ],
          "key_questions": [
            "当前能力是否达到预期？",
            "职业目标是否需要调整？",
            "市场环境有何变化？"
          ]
        },
        "annual_review": {
          "frequency": "每年1次",
          "review_items": [
            "年度目标达成情况",
            "职业路径是否需要调整",
            "下一年度规划制定"
          ]
        }
      },
      
      "adjustment_scenarios": [
        {
          "scenario": "求职不顺利（offer<预期）",
          "possible_reasons": [
            "技能储备不足",
            "面试表现欠佳",
            "目标定位过高"
          ],
          "adjustment_plan": {
            "immediate_actions": [
              "分析面试反馈，针对性提升",
              "降低目标公司档次，先就业",
              "寻求内推和模拟面试帮助"
            ],
            "long_term_actions": [
              "系统提升薄弱技能",
              "积累更多项目经验",
              "拓展求职渠道"
            ]
          }
        },
        {
          "scenario": "工作后发现不适合算法岗",
          "possible_reasons": [
            "兴趣不符",
            "能力不匹配",
            "工作环境不适应"
          ],
          "adjustment_plan": {
            "evaluation_period": "工作6个月内",
            "decision_tree": [
              "是否是短期适应问题 → 给自己6个月适应期",
              "是否能力问题 → 加强学习，寻求导师指导",
              "是否兴趣问题 → 考虑换岗路径（参考section_2）"
            ],
            "fallback_options": [
              "转向机器学习工程师（偏工程）",
              "转向数据科学家（偏分析）",
              "转向后端开发（利用编程能力）"
            ]
          }
        }
      ],
      
      "risk_management": {
        "identified_risks": [
          {
            "risk": "AI技术迭代导致部分岗位需求变化",
            "probability": "中",
            "impact": "高",
            "mitigation": "保持学习，关注前沿技术，建立技术深度"
          },
          {
            "risk": "市场竞争加剧",
            "probability": "高",
            "impact": "中",
            "mitigation": "提前准备，建立差异化竞争力，拓宽就业面"
          }
        ],
        "contingency_plans": [
          "plan A: 坚持算法方向，成为技术专家",
          "plan B: 转向ML工程师或数据科学家",
          "plan C: 转向后端开发或全栈工程师"
        ]
      }
    },
    
    // 报告总结
    "summary": {
      "key_takeaways": [
        "你适合从事算法工程师职业，与你的兴趣、能力、价值观高度契合",
        "短期目标是补齐技能短板，获得2-3个offer",
        "中期目标是3-5年内成长为中高级算法工程师",
        "需要重点提升深度学习和大数据处理能力",
        "保持技术学习和项目实践，建立个人技术品牌"
      ],
      "next_steps": [
        "立即开始：深度学习课程学习（本周内）",
        "2周内：启动1个深度学习项目",
        "1个月内：完成Spark学习和实战",
        "3个月内：完成2个高质量项目并开源",
        "4个月内：开始算法刷题和简历准备"
      ],
      "motivational_message": "你已经具备了成为优秀算法工程师的潜质。接下来的6个月是关键期，保持专注和持续行动，你一定能够实现职业目标。记住：每一次学习和实践都是在为未来的自己铺路。加油！"
    }
  }
}
```

---

### 7.3 编辑职业规划报告

**功能说明**: 手动编辑和调整报告内容

**方法**:`POST`**路径**:`/career/edit-report`

**请求示例**:

```json
{
  "report_id": "report_career_20260214_10001",
  "user_id": 10001,
  "edits": {
    "section_3_action_plan.short_term_plan.monthly_plans[0].tasks[0].时间投入": "每周12小时",
    "section_2_career_path.short_term_goal.specific_targets[0].deadline": "2026.07"
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "报告编辑成功",
  "data": {
    "updated_at": "2026-02-14 13:00:00"
  }
}
```

---

### 7.4 AI优化报告

**功能说明**: 使用AI对报告进行智能润色和优化

**方法**:`POST`**路径**:`/career/ai-polish-report`

**请求示例**:

```json
{
  "report_id": "report_career_20260214_10001",
  "polish_options": {
    "improve_readability": true,  // 提升可读性
    "add_examples": true,  // 添加具体案例
    "enhance_actionability": true,  // 增强可操作性
    "check_completeness": true  // 检查完整性
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "AI优化中...",
  "data": {
    "task_id": "polish_20260214_001",
    "status": "processing"
  }
}
```

---

### 7.5 导出职业规划报告

**功能说明**: 导出报告为PDF/Word文档

**方法**:`POST`**路径**:`/career/export-report`

**请求示例**:

```json
{
  "report_id": "report_career_20260214_10001",
  "format": "pdf",  // pdf/docx
  "include_sections": ["all"],  // all 或指定章节
  "template_style": "professional"  // professional/modern/simple
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "报告导出成功",
  "data": {
    "download_url": "/downloads/career_report_10001_20260214.pdf",
    "file_size": "2.5MB",
    "expires_at": "2026-02-21 13:00:00"  // 下载链接7天有效
  }
}
```

---

### 7.6 获取报告完整性检查

**功能说明**: AI检查报告的完整性和质量

**方法**:`POST`**路径**:`/career/check-completeness`

**请求示例**:

```json
{
  "report_id": "report_career_20260214_10001"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "completeness_score": 92,  // 完整性评分（0-100）
    "quality_score": 88,  // 质量评分（0-100）
    
    "section_completeness": [
      {
        "section": "职业探索与岗位匹配",
        "completeness": 95,
        "issues": []
      },
      {
        "section": "职业目标设定与职业路径规划",
        "completeness": 90,
        "issues": [
          "建议补充更多行业趋势分析"
        ]
      },
      {
        "section": "行动计划与成果展示",
        "completeness": 88,
        "issues": [
          "学习路径可以更具体",
          "建议添加时间管理建议"
        ]
      }
    ],
    
    "suggestions": [
      {
        "type": "内容完善",
        "priority": "中",
        "suggestion": "在行动计划中添加具体的时间管理方法"
      },
      {
        "type": "可操作性",
        "priority": "低",
        "suggestion": "为每个学习资源添加具体链接"
      }
    ],
    
    "strengths": [
      "岗位匹配分析详细准确",
      "行动计划具体可执行",
      "职业路径规划清晰"
    ]
  }
}
```

---

### 7.7 获取历史报告列表

**功能说明**: 获取用户的历史职业规划报告

**方法**:`POST`**路径**:`/career/report-history`

**请求示例**:

```json
{
  "user_id": 10001,
  "page": 1,
  "size": 10
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 3,
    "list": [
      {
        "report_id": "report_career_20260214_10001",
        "created_at": "2026-02-14 12:00:00",
        "status": "completed",
        "primary_career": "算法工程师",
        "completeness": 95,
        "last_viewed": "2026-02-14 13:30:00"
      },
      {
        "report_id": "report_career_20260101_10001",
        "created_at": "2026-01-01 10:00:00",
        "status": "archived",
        "primary_career": "前端开发工程师",
        "completeness": 85
      }
    ]
  }
}
```

---

## 8. 系统管理模块 (System)

### 8.1 上传岗位数据

**功能说明**: 管理员上传岗位数据集（仅管理员权限）

**方法**:`POST`**路径**:`/system/upload-job-data`

**请求格式**:`multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| admin_id | number | 是 | 管理员ID |
| data_file | file | 是 | Excel/CSV数据文件 |
| data_source | string | 是 | 数据来源（如：智联招聘） |

**响应示例**:

```json
{
  "code": 200,
  "msg": "数据上传成功，正在处理...",
  "data": {
    "task_id": "upload_20260214_001",
    "total_records": 10000,
    "status": "processing"
  }
}
```

---

### 8.2 触发岗位画像生成

**功能说明**: 管理员触发批量岗位画像生成（仅管理员权限）

**方法**:`POST`**路径**:`/system/generate-job-profiles`

**请求示例**:

```json
{
  "admin_id": 1,
  "job_names": ["算法工程师", "数据分析师", "产品经理"],
  "sample_size_per_job": 100  // 每个岗位分析的样本数
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "批量生成任务已启动",
  "data": {
    "task_id": "batch_gen_20260214_001",
    "total_jobs": 3,
    "estimated_time": "15分钟"
  }
}
```

---

### 8.3 获取系统统计数据

**功能说明**: 获取系统使用统计（仅管理员权限）

**方法**:`POST`**路径**:`/system/statistics`

**请求示例**:

```json
{
  "admin_id": 1,
  "date_range": {
    "start": "2026-01-01",
    "end": "2026-02-14"
  }
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "user_statistics": {
      "total_users": 5000,
      "active_users": 3200,
      "new_users_this_month": 500
    },
    "usage_statistics": {
      "total_assessments": 3500,
      "total_reports_generated": 2800,
      "total_job_matches": 15000
    },
    "job_statistics": {
      "total_jobs_in_db": 120,
      "ai_generated_profiles": 80,
      "most_popular_jobs": [
        {"job": "算法工程师", "search_count": 1500},
        {"job": "产品经理", "search_count": 1200}
      ]
    },
    "model_performance": {
      "matching_accuracy": 0.87,
      "profile_generation_success_rate": 0.95,
      "average_response_time": "2.3s"
    }
  }
}
```

---

## 9. RAG知识库模块 (Knowledge Base)

### 9.1 上传知识文档

**功能说明**: 上传职业相关的知识文档到RAG系统

**方法**:`POST`**路径**:`/knowledge/upload`

**请求格式**:`multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| user_id | number | 是 | 用户ID（管理员） |
| doc_file | file | 是 | 文档文件（PDF/DOCX/TXT） |
| category | string | 是 | 文档分类（行业报告/技能指南/面试经验等） |
| tags | string | 否 | 标签（逗号分隔） |

**响应示例**:

```json
{
  "code": 200,
  "msg": "文档上传成功，正在向量化...",
  "data": {
    "doc_id": "kb_doc_001",
    "status": "processing"
  }
}
```

---

### 9.2 查询知识库

**功能说明**: 基于语义搜索查询知识库

**方法**:`POST`**路径**:`/knowledge/search`

**请求示例**:

```json
{
  "user_id": 10001,
  "query": "算法工程师需要掌握哪些技能",
  "top_k": 5,  // 返回最相关的5个结果
  "category": "技能指南"  // 可选，限定分类
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "results": [
      {
        "doc_id": "kb_doc_001",
        "title": "算法工程师技能树全解析",
        "content_snippet": "算法工程师需要掌握的核心技能包括：1. 编程语言（Python/C++）...",
        "relevance_score": 0.92,
        "source": "《2026 AI人才白皮书》"
      },
      {
        "doc_id": "kb_doc_015",
        "title": "机器学习工程师vs算法工程师",
        "content_snippet": "算法工程师侧重于算法研发和优化...",
        "relevance_score": 0.85
      }
    ]
  }
}
```

---

### 9.3 获取知识库文档列表

**功能说明**: 获取知识库中的文档列表

**方法**:`POST`**路径**:`/knowledge/list`

**请求示例**:

```json
{
  "page": 1,
  "size": 20,
  "category": "技能指南",  // 可选
  "keyword": "算法"  // 可选
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 50,
    "list": [
      {
        "doc_id": "kb_doc_001",
        "title": "算法工程师技能树全解析",
        "category": "技能指南",
        "file_size": "1.2MB",
        "uploaded_at": "2026-01-15",
        "view_count": 150
      }
    ]
  }
}
```

---

## 附录A：数据结构说明

### A.1 能力维度权重配置

不同岗位的能力维度权重不同，以下为参考配置：

```json
{
  "算法工程师": {
    "基础要求": 0.15,
    "专业技能": 0.40,
    "职业素养": 0.30,
    "发展潜力": 0.15
  },
  "产品经理": {
    "基础要求": 0.10,
    "专业技能": 0.30,
    "职业素养": 0.45,
    "发展潜力": 0.15
  }
}
```

### A.2 技能等级定义

| 等级 | 说明 | 代码标识 |
| --- | --- | --- |
| 了解 | 知道基本概念，看过相关资料 | understand |
| 熟悉 | 能够在指导下使用，有初步实践 | familiar |
| 熟练 | 能够独立完成任务，解决常见问题 | proficient |
| 精通 | 能够解决复杂问题，指导他人 | expert |

### A.3 匹配度等级划分

| 匹配度分数 | 匹配等级 | 建议 |
| --- | --- | --- |
| 90-100 | 高度匹配 | 强烈推荐申请 |
| 80-89 | 较为匹配 | 推荐申请 |
| 70-79 | 一般匹配 | 可以尝试，需提升部分能力 |
| 60-69 | 匹配度较低 | 需大幅提升能力 |
| <60 | 不匹配 | 不推荐 |

---

## 附录B：AI模型说明

### B.1 使用的AI模型

本系统使用以下AI模型：

1. **岗位画像生成** : Claude Sonnet 4 / GPT-4
2. **学生能力画像生成** : Claude Sonnet 4 / GPT-4
3. **简历解析** : 专用NLP模型 + Claude Sonnet 4
4. **人岗匹配** : 自研匹配算法 + AI辅助
5. **职业规划报告生成** : Claude Sonnet 4 (长文本生成)
6. **知识库RAG** : BGE-M3向量模型 + Claude Sonnet 4

### B.2 模型调用示例

详见算法模型开发文档。

---

## 附录C：错误处理指南

### C.1 常见错误及解决方案

| 错误代码 | 错误信息 | 可能原因 | 解决方案 |
| --- | --- | --- | --- |
| 400 | 参数错误 | 请求参数格式不正确 | 检查请求体格式和必填字段 |
| 401 | 未授权 | Token失效或未登录 | 重新登录获取Token |
| 404 | 资源不存在 | user_id/job_id不存在 | 确认ID正确性 |
| 500 | AI生成失败 | 模型调用异常 | 稍后重试或联系技术支持 |
| 503 | 服务暂时不可用 | 系统维护或负载过高 | 稍后重试 |

---

## 版本历史

| 版本 | 日期 | 变更内容 |
| --- | --- | --- |
| v1.0 | 2026-02-14 | 初始版本，完整API设计 |

---

## 联系方式

**技术支持**:[email protected]**API问题反馈**:[email protected]
