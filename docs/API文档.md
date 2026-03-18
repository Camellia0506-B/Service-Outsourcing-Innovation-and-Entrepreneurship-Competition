# AI职业规划智能体 - 完整API文档

## 版本信息


**版本** : v3.0
**最后更新** : 2025-02-23
**项目** : 基于AI的大学生职业规划智能体
**团队分工** :

算法模型: 孙于婷
前端开发: 李嘉鑫、王雨姗
后端开发: 古媛媛
材料撰写，数据爬取：邓诗依

---

## 0. 接口交互通用规范

### 0.1 URL前缀

所有接口均以 `/api/v1` 为前缀，例如：`/api/v1/auth/login`


### 0.2 请求格式

**Content-Type**： `application/json`

**文件上传**： `multipart/form-data`


### 0.3 统一响应格式


后端无论成功失败，都返回以下JSON结构，前端根据code判断业务逻辑。

```json
{
  "code": 200,        // 200: 成功, 400: 客户端参数错误, 401: 未授权, 500: 服务器错误
  "msg": "success",   // 提示信息，报错时显示错误原因
  "data": { ... }     // 具体数据对象或数组，失败时为 null
}
```


### 0.4 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 200 | 请求成功 | 正常处理返回数据 |
| 400 | 客户端参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权或Token失效 | 重新登录获取Token |
| 403 | 无权限访问 | 提示用户权限不足 |
| 404 | 资源不存在 | 提示资源未找到 |
| 500 | 服务器内部错误 | 稍后重试或联系技术支持 |
## 1. 身份认证模块 (Auth)

### 1.1 用户注册

**功能说明**：新用户注册账号，创建用户档案

**方法**： `POST`

**路径**： `/auth/register`

**请求格式**： `multipart/form-data`

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户账号（全局唯一，类似学号） |
| password | string | 是 | 用户密码（建议6-20位） |
| nickname | string | 是 | 用户昵称（可重复） |
| avatar | file | 否 | 用户头像图片文件（jpg/png，≤2MB） |
**响应示例**：

**响应示例**： |  |  |
```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "user_id": 10001,
    "username": "2021001001",
    "nickname": "李明",
    "avatar": "/uploads/avatars/10001.jpg",
    "created_at": "2025-02-14 10:30:00"
  }
}
```

**错误示例**：

```json
{
  "code": 400,
  "msg": "用户名已存在",
  "data": null
}
```


### 1.2 用户登录

**功能说明**：用户登录系统，获取访问凭证

**方法**： `POST`

**路径**： `/auth/login`

**请求示例**：

```json
{
  "username": "2021001001",
  "password": "password123"
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "登录成功" , "data" : { "user_id" : 10001 , "username" : "2021001001" , "nickname" : "李明" , "avatar" : "/uploads/avatars/10001.jpg" , "token" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." , "profile_completed" : true , // 档案是否完善 "assessment_completed" : false // 是否完成职业测评 } }
```

**错误示例**：

```json
{
  "code": 400,
  "msg": "用户名或密码错误",
  "data": null
}
```


### 1.3 退出登录

**功能说明**：用户退出系统

**方法**： `POST`

**路径**： `/auth/logout`

**请求示例**：

```json
{
  "user_id": 10001
}
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "退出成功",
  "data": null
}
```


## 2. 个人档案模块 (Profile)

### 2.1 获取个人档案

**功能说明**：获取用户的完整个人档案信息

**方法**： `POST`

**路径**： `/profile/info`

**请求示例**：

```json
{
  "user_id": 10001
}
```

**响应示例**：

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
      "email": " [email protected] "
    },
    "education_info": {
      "school": "北京大学",
      "major": "计算机科学与技术",
      "degree": "本科",
      "grade": "2021级",
      "expected_graduation": "2025-06",
      "gpa": "3.8/4.0"
    },
    "skills": [
      {
        "category": "编程语言",
        "items": [
          "Python",
          "Java",
          "JavaScript"
        ]
      },
      {
        "category": "框架工具",
        "items": [
          "React",
          "Django",
          "Docker"
        ]
      },
      {
        "category": "数据技能",
        "items": [
          "SQL",
          "Pandas",
          "NumPy"
        ]
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
        "tech_stack": [
          "React",
          "Node.js",
          "MongoDB"
        ]
      }
    ],
    "awards": [
      {
        "name": "国家奖学金",
        "level": "国家级",
        "date": "2023-11"
      }
    ],
    "profile_completeness": 85,
    "updated_at": "2025-02-10 15:30:00"
  }
}
```


### 2.2 更新个人档案

**功能说明**：更新或完善个人档案信息

**方法**： `POST`

**路径**： `/profile/update`

**请求示例**：

```json
{
  "user_id": 10001,
  "basic_info": {
    "nickname": "李明",
    "gender": "男",
    "birth_date": "2002-05-15",
    "phone": "13800138000",
    "email": " [email protected] "
  },
  "education_info": {
    "school": "北京大学",
    "major": "计算机科学与技术",
    "degree": "本科",
    "grade": "2021级",
    "expected_graduation": "2025-06",
    "gpa": "3.8/4.0"
  },
  "skills": [
    {
      "category": "编程语言",
      "items": [
        "Python",
        "Java",
        "JavaScript",
        "C++"
      ]
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

**响应示例**：

```json
{
  "code": 200,
  "msg": "档案更新成功",
  "data": {
    "profile_completeness": 90,
    "updated_at": "2025-02-14 10:45:00"
  }
}
```


### 2.3 上传简历

**功能说明**：上传简历PDF文件，AI自动解析并填充档案

**方法**： `POST`

**路径**： `/profile/upload-resume`

**请求格式**： `multipart/form-data`

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | number | 是 | 用户ID |
| resume_file | file | 是 | 简历文件（PDF格式，≤10MB） |
**响应示例**：

**响应示例**： |  |  |
```json
{
  "code": 200,
  "msg": "简历上传成功，正在解析...",
  "data": {
    "task_id": "resume_parse_20250214_10001",
    "status": "processing"
  }
}
```


### 2.4 获取简历解析结果

**功能说明**：获取AI简历解析的结果

**方法**： `POST`

**路径**： `/profile/resume-parse-result`

**请求示例**：

```json
{
  "user_id": 10001,
  "task_id": "resume_parse_20250214_10001"
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "status" : "completed" , // processing/completed/failed "parsed_data" : { "basic_info" : { "name" : "李明" , "phone" : "13800138000" , "email" : " [email protected] " } , "education" : [ ... ] , "skills" : [ ... ] , "internships" : [ ... ] , "projects" : [ ... ] } , "confidence_score" : 0.92 , // AI解析置信度 "suggestions" : [ "建议补充GPA信息" , "实习经历描述可以更具体" ] } }
```


## 3. 职业测评模块 (Assessment)

### 3.1 获取测评问卷

**功能说明**：获取职业测评问卷题目

**方法**： `POST`

**路径**： `/assessment/questionnaire`

**请求示例**：

```json
{ "user_id" : 10001 , "assessment_type" : "comprehensive" // comprehensive: 综合测评, quick: 快速测评 }
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "assessment_id" : "assess_20250214_10001" , "total_questions" : 50 , "estimated_time" : 15 , // 预计耗时（分钟） "dimensions" : [ { "dimension_id" : "interest" , "dimension_name" : "职业兴趣" , "questions" : [ { "question_id" : "q001" , "question_text" : "你更喜欢哪种工作方式？" , "question_type" : "single_choice" , // single_choice/multiple_choice/scale "options" : [ { "option_id" : "A" , "option_text" : "独立完成任务" } , { "option_id" : "B" , "option_text" : "团队协作完成" } , { "option_id" : "C" , "option_text" : "两者都可以" } ] } ] } , { "dimension_id" : "personality" , "dimension_name" : "性格特质" , "questions" : [ ... ] } , { "dimension_id" : "ability" , "dimension_name" : "能力倾向" , "questions" : [ ... ] } , { "dimension_id" : "values" , "dimension_name" : "职业价值观" , "questions" : [ ... ] } ] } }
```


### 3.2 提交测评答案

**功能说明**：提交职业测评答卷

**方法**： `POST`

**路径**： `/assessment/submit`

**请求示例**：

```json
{ "user_id" : 10001 , "assessment_id" : "assess_20250214_10001" , "answers" : [ { "question_id" : "q001" , "answer" : "A" } , { "question_id" : "q002" , "answer" : [ "A" , "C" ] // 多选题 } , { "question_id" : "q003" , "answer" : 4 // 量表题（1-5分） } ] , "time_spent" : 12 // 实际耗时（分钟） }
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "测评提交成功，正在生成报告...",
  "data": {
    "report_id": "report_20250214_10001",
    "status": "processing"
  }
}
```


### 3.3 获取测评报告

**功能说明**：获取职业测评诊断报告

**方法**： `POST`

**路径**： `/assessment/report`

**请求示例**：

```json
{
  "user_id": 10001,
  "report_id": "report_20250214_10001"
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "report_id" : "report_20250214_10001" , "user_id" : 10001 , "assessment_date" : "2025-02-14" , "status" : "completed" , // 职业兴趣分析 "interest_analysis" : { "holland_code" : "RIA" , // 霍兰德职业兴趣代码 "primary_interest" : { "type" : "研究型(I)" , "score" : 85 , "description" : "喜欢观察、学习、研究、分析、评估和解决问题" } , "interest_distribution" : [ { "type" : "研究型(I)" , "score" : 85 } , { "type" : "实用型(R)" , "score" : 72 } , { "type" : "艺术型(A)" , "score" : 65 } ] , "suitable_fields" : [ "软件开发" , "数据分析" , "算法工程师" , "人工智能研发" ] } , // 性格特质分析 "personality_analysis" : { "mbti_type" : "INTJ" , "traits" : [ { "trait_name" : "外向性" , "score" : 45 , "level" : "偏内向" , "description" : "更倾向于独立思考和深度工作" } , { "trait_name" : "开放性" , "score" : 82 , "level" : "高" , "description" : "对新事物充满好奇，善于学习新技能" } , { "trait_name" : "尽责性" , "score" : 78 , "level" : "高" , "description" : "做事认真负责，注重细节" } ] } , // 能力倾向分析 "ability_analysis" : { "strengths" : [ { "ability" : "逻辑分析能力" , "score" : 88 , "description" : "擅长发现问题本质和规律" } , { "ability" : "学习能力" , "score" : 85 , "description" : "能够快速掌握新知识和技能" } ] , "areas_to_improve" : [ { "ability" : "沟通表达能力" , "score" : 62 , "suggestions" : [ "多参加团队讨论和技术分享" , "练习清晰表达技术方案" ] } ] } , // 职业价值观 "values_analysis" : { "top_values" : [ { "value" : "成就感" , "score" : 90 , "description" : "追求技术突破和个人成长" } , { "value" : "学习发展" , "score" : 88 , "description" : "重视持续学习和能力提升" } ] } , // 综合建议 "recommendations" : { "suitable_careers" : [ { "career" : "算法工程师" , "match_score" : 92 , "reasons" : [ "与你的研究型兴趣高度匹配" , "充分发挥逻辑分析和学习能力" , "符合追求成就感的价值观" ] } , { "career" : "后端开发工程师" , "match_score" : 87 , "reasons" : [ ... ] } ] , "development_suggestions" : [ "加强沟通表达能力的训练" , "多参与团队项目提升协作能力" , "保持技术深度的同时拓展技术广度" ] } } }
```


## 4. 岗位画像模块 (Job Profile)

### 4.1 获取岗位画像列表

**功能说明**：获取系统中的岗位画像库（至少10个岗位）

**方法**： `POST`

**路径**： `/job/profiles`

**请求示例**：

```json
{ "page" : 1 , "size" : 20 , "keyword" : "算法" , // 可选，搜索关键词 "industry" : "互联网" , // 可选，筛选行业 "level" : "初级" // 可选，岗位级别: 初级/中级/高级 }
```

**响应示例**：

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
        "demand_score": 85,
        "growth_trend": "上升",
        "tags": [
          "人工智能",
          "机器学习",
          "Python"
        ],
        "created_at": "2025-01-15"
      }
    ]
  }
}
```


### 4.2 获取岗位详细画像

**功能说明**：获取单个岗位的详细画像信息

**方法**： `POST`

**路径**： `/job/profile/detail`

**请求示例**：

```json
{
  "job_id": "job_001"
}
```

**响应示例**：

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
      "work_locations": [
        "北京",
        "上海",
        "深圳",
        "杭州"
      ],
      "company_scales": [
        "100-500人",
        "500-2000人",
        "2000人以上"
      ],
      "description": "负责机器学习算法的研究、开发和优化，解决实际业务问题"
    },
    "requirements": {
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
      "professional_skills": {
        "programming_languages": [
          {
            "skill": "Python",
            "level": "熟练",
            "importance": "必需",
            "weight": 0.1
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
            "weight": 0.1
          }
        ],
        "total_weight": 0.4
      },
      "certificates": {
        "required": [],
        "preferred": [
          "AWS机器学习认证",
          "Google TensorFlow开发者证书"
        ],
        "weight": 0.05
      },
      "soft_skills": {
        "innovation_ability": {
          "description": "能够提出创新的算法方案",
          "level": "高",
          "weight": 0.08
        },
        "learning_ability": {
          "description": "快速学习新技术和算法",
          "level": "高",
          "weight": 0.1
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
        "total_weight": 0.3
      },
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
        "weight": 0.1
      }
    },
    "market_analysis": {
      "demand_score": 85,
      "growth_trend": "上升",
      "salary_range": {
        "junior": "15k-25k",
        "intermediate": "25k-40k",
        "senior": "40k-70k"
      },
      "hottest_cities": [
        {
          "city": "北京",
          "job_count": 1500
        },
        {
          "city": "上海",
          "job_count": 1200
        },
        {
          "city": "深圳",
          "job_count": 800
        }
      ],
      "top_companies": [
        "字节跳动",
        "阿里巴巴",
        "腾讯",
        "百度",
        "华为"
      ],
      "industry_trends": [
        "大模型应用场景持续扩大",
        "多模态AI成为新热点",
        "AI+垂直行业深度融合"
      ]
    },
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


### 4.3 获取岗位关联图谱

**功能说明**：获取岗位间的血缘关系和转换路径

**方法**： `POST`

**路径**： `/job/relation-graph`

**请求示例**：

```json
{ "job_id" : "job_001" , "graph_type" : "all" // vertical: 垂直晋升, transfer: 横向转岗, all: 全部 }
```

**响应示例**：

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
          "requirements": [
            "独立项目经验",
            "算法优化能力"
          ]
        },
        {
          "from": "job_002",
          "to": "job_003",
          "years": "3-5",
          "requirements": [
            "架构设计能力",
            "技术攻坚能力"
          ]
        }
      ]
    },
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
          "skills_gap": [
            "统计学",
            "业务分析",
            "可视化"
          ]
        },
        {
          "from": "job_001",
          "to": "job_011",
          "relevance_score": 90,
          "difficulty": "低",
          "time": "3-6个月",
          "skills_gap": [
            "模型部署",
            "工程化"
          ]
        }
      ]
    }
  }
}
```


### 4.4 AI生成岗位画像

**功能说明**：使用AI大模型分析岗位数据，生成新的岗位画像

**方法**： `POST`

**路径**： `/job/ai-generate-profile`

**请求示例**：

```json
{ "job_name" : "AI产品经理" , "job_descriptions" : [ "负责AI产品的规划和设计..." , "协调技术团队完成产品开发..." , // 从招聘网站抓取的多个岗位描述 ] , "sample_size" : 50 // 分析的样本数量 }
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "AI画像生成中..." , "data" : { "task_id" : "job_gen_20250214_001" , "status" : "processing" , "estimated_time" : 30 // 预计耗时（秒） } }
```


### 4.5 获取AI生成结果

**功能说明**：获取AI岗位画像生成结果

**方法**： `POST`

**路径**： `/job/ai-generate-result`

**请求示例**：

```json
{
  "task_id": "job_gen_20250214_001"
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "status" : "completed" , "job_profile" : { // 完整的岗位画像数据（格式同4.2） "job_id" : "job_new_001" , "job_name" : "AI产品经理" , "requirements" : { ... } , "market_analysis" : { ... } } , "ai_confidence" : 0.88 , // AI生成的置信度 "data_sources" : { "total_samples" : 50 , "valid_samples" : 47 , "analysis_date" : "2025-02-14" } } }
```


## 5. 学生能力画像模块 (Student Profile)

### 5.1 获取学生能力画像

**功能说明**：获取学生的就业能力画像和评分

**方法**： `POST`

**路径**： `/student/ability-profile`

**请求示例**：

```json
{
  "user_id": 10001
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "user_id" : 10001 , "profile_id" : "profile_10001" , "generated_at" : "2025-02-14 11:00:00" , // 基础信息 "basic_info" : { "education" : "本科" , "major" : "计算机科学与技术" , "school" : "北京大学" , "gpa" : "3.8/4.0" , "expected_graduation" : "2025-06" } , // 专业技能画像 "professional_skills" : { "programming_languages" : [ { "skill" : "Python" , "level" : "熟练" , "evidence" : [ "3个Python项目经验" , "开源贡献500+ commits" ] , "score" : 85 } , { "skill" : "Java" , "level" : "熟悉" , "evidence" : [ "课程项目" , "实习应用" ] , "score" : 70 } ] , "frameworks_tools" : [ { "skill" : "React" , "level" : "熟练" , "evidence" : [ "2个前端项目" ] , "score" : 80 } ] , "domain_knowledge" : [ { "domain" : "机器学习" , "level" : "熟悉" , "evidence" : [ "相关课程" , "Kaggle竞赛" ] , "score" : 75 } ] , "overall_score" : 78 } , // 证书资质 "certificates" : { "items" : [ { "name" : "全国计算机等级考试二级" , "level" : "二级" , "issue_date" : "2023-03" } ] , "score" : 60 , "competitiveness" : "中等" } , // 创新能力 "innovation_ability" : { "projects" : [ { "name" : "校园社交平台" , "innovation_points" : [ "首创校园匿名树洞功能" , "基于LBS的校友发现" ] , "impact" : "1000+用户使用" } ] , "competitions" : [ { "name" : "中国大学生计算机设计大赛" , "award" : "省级二等奖" } ] , "score" : 72 , "level" : "中上" } , // 学习能力 "learning_ability" : { "indicators" : [ { "indicator" : "GPA" , "value" : 3.8 , "percentile" : 85 // 在本专业的百分位 } , { "indicator" : "自学新技术" , "evidence" : [ "1个月掌握React框架" , "自学机器学习并完成项目" ] } ] , "score" : 85 , "level" : "优秀" } , // 抗压能力 "pressure_resistance" : { "evidence" : [ "同时处理3门课程期末+实习" , "项目deadline前完成高质量交付" ] , "assessment_score" : 75 , // 基于测评问卷 "level" : "良好" } , // 沟通能力 "communication_ability" : { "teamwork" : { "evidence" : [ "担任3个项目的技术负责人" , "协调5人团队完成开发" ] , "score" : 70 } , "presentation" : { "evidence" : [ "技术分享会演讲3次" , "项目答辩获得好评" ] , "score" : 75 } , "overall_score" : 72 , "level" : "良好" } , // 实习/项目经验 "practical_experience" : { "internships" : [ { "company" : "腾讯科技" , "position" : "前端开发实习生" , "duration" : "3个月" , "achievements" : [ "独立完成2个H5页面开发" , "优化页面加载速度30%" ] , "score" : 80 } ] , "projects" : [ { "name" : "校园社交平台" , "role" : "项目负责人" , "complexity" : "高" , "score" : 85 } ] , "overall_score" : 82 } , // 综合评分 "overall_assessment" : { "total_score" : 76 , // 总分（0-100） "percentile" : 78 , // 在同专业学生中的百分位 "completeness" : 90 , // 画像完整度 "competitiveness" : "中上" , // 竞争力等级：优秀/中上/中等/待提升 "strengths" : [ "学习能力强，GPA优秀" , "有完整的项目和实习经验" , "技术栈较为全面" ] , "weaknesses" : [ "缺少技术证书" , "沟通能力有提升空间" , "创新项目影响力可以更大" ] } } }
```


### 5.2 AI生成学生能力画像

**功能说明**：使用AI分析学生档案和简历，生成能力画像

**方法**： `POST`

**路径**： `/student/ai-generate-profile`

**请求示例**：

```json
{ "user_id" : 10001 , "data_source" : "profile" // profile: 使用档案数据, resume: 使用简历文件 }
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "AI画像生成中...",
  "data": {
    "task_id": "stu_gen_20250214_10001",
    "status": "processing"
  }
}
```


### 5.3 更新能力画像

**功能说明**：手动更新或补充能力画像信息

**方法**： `POST`

**路径**： `/student/update-profile`

**请求示例**：

```json
{
  "user_id": 10001,
  "updates": {
    "professional_skills": {
      "programming_languages": [
        {
          "skill": "Go",
          "level": "熟悉",
          "evidence": [
            "完成2个Go项目"
          ]
        }
      ]
    },
    "certificates": {
      "items": [
        {
          "name": "AWS云从业者认证",
          "issue_date": "2025-01-15"
        }
      ]
    }
  }
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "画像更新成功" , "data" : { "updated_at" : "2025-02-14 11:30:00" , "new_total_score" : 78 , "score_change" : + 2 } }
```


## 6. 人岗匹配模块 (Job Matching)

### 6.1 获取推荐岗位

**功能说明**：基于学生能力画像，推荐匹配的岗位

**方法**： `POST`

**路径**： `/matching/recommend-jobs`

**请求示例**：

```json
{ "user_id" : 10001 , "top_n" : 10 , // 返回前N个推荐 "filters" : { "cities" : [ "北京" , "上海" ] , // 可选 "salary_min" : 15000 , // 可选 "industries" : [ "互联网" ] // 可选 } }
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "total_matched" : 45 , "recommendations" : [ { "job_id" : "job_001" , "job_name" : "算法工程师" , "match_score" : 92 , // 总体匹配度（0-100） "match_level" : "高度匹配" , // 高度匹配/较为匹配/一般匹配 // 多维度匹配分析 "dimension_scores" : { "basic_requirements" : { "score" : 95 , "weight" : 0.15 , "details" : { "education" : { "required" : "本科" , "student" : "本科" , "match" : true } , "major" : { "required" : [ "计算机" , "软件工程" ] , "student" : "计算机科学与技术" , "match" : true } , "gpa" : { "required" : "3.0" , "student" : "3.8" , "match" : true } } } , "professional_skills" : { "score" : 88 , "weight" : 0.40 , "details" : { "matched_skills" : [ { "skill" : "Python" , "required_level" : "熟练" , "student_level" : "熟练" , "match" : true } , { "skill" : "TensorFlow" , "required_level" : "熟练" , "student_level" : "熟悉" , "match" : "部分匹配" } ] , "missing_skills" : [ { "skill" : "Spark" , "importance" : "重要" , "learning_difficulty" : "中" } ] , "match_rate" : 0.85 // 技能匹配率 } } , "soft_skills" : { "score" : 90 , "weight" : 0.30 , "details" : { "innovation_ability" : { "required" : "高" , "student" : "中上" , "score" : 88 } , "learning_ability" : { "required" : "高" , "student" : "优秀" , "score" : 95 } , "communication_ability" : { "required" : "中" , "student" : "良好" , "score" : 90 } } } , "development_potential" : { "score" : 93 , "weight" : 0.15 , "details" : { "growth_mindset" : "优秀" , "career_clarity" : "清晰" , "motivation" : "强" } } } , // 匹配亮点 "highlights" : [ "学习能力强，符合岗位高要求" , "有相关实习经验，快速上手" , "技术栈覆盖80%以上岗位需求" ] , // 能力差距 "gaps" : [ { "gap" : "缺少Spark大数据处理经验" , "importance" : "重要" , "suggestion" : "可通过在线课程1-2个月学习" } , { "gap" : "TensorFlow需要进阶" , "importance" : "必需" , "suggestion" : "深入学习模型优化和部署" } ] , // 岗位基本信息 "job_info" : { "company" : "字节跳动" , "location" : "北京" , "salary" : "20k-35k" , "experience" : "应届生/1年经验" } } ] } }
```


### 6.2 获取单个岗位匹配分析

**功能说明**：分析学生与指定岗位的匹配情况

**方法**： `POST`

**路径**： `/matching/analyze`

**请求示例**：

```json
{
  "user_id": 10001,
  "job_id": "job_001"
}
```

**响应示例**：（格式同6.1中单个推荐的详细格式）


### 6.3 批量匹配分析

**功能说明**：分析学生与多个岗位的匹配情况

**方法**： `POST`

**路径**： `/matching/batch-analyze`

**请求示例**：

```json
{
  "user_id": 10001,
  "job_ids": [
    "job_001",
    "job_002",
    "job_003"
  ]
}
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "analyses": [
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


## 7. 职业规划报告模块 (Career Report)

### 7.1 生成职业规划报告

**功能说明**：AI生成个性化的职业生涯发展报告

**方法**： `POST`

**路径**： `/career/generate-report`

**请求示例**：

```json
{ "user_id" : 10001 , "target_jobs" : [ "job_001" , "job_002" ] , // 可选，目标岗位 "preferences" : { "career_goal" : "技术专家" , // 职业目标类型 "work_location" : "北京" , "salary_expectation" : "25k+" , "work_life_balance" : "中" // 工作生活平衡偏好：高/中/低 } }
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "报告生成中，预计需要30秒...",
  "data": {
    "report_id": "report_career_20250214_10001",
    "status": "processing"
  }
}
```


### 7.2 获取职业规划报告

**功能说明**：获取生成的职业规划报告

**方法**： `POST`

**路径**： `/career/report`

**请求示例**：

```json
{
  "user_id": 10001,
  "report_id": "report_career_20250214_10001"
}
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "success" , "data" : { "report_id" : "report_career_20250214_10001" , "user_id" : 10001 , "generated_at" : "2025-02-14 12:00:00" , "status" : "completed" , // 报告元数据 "metadata" : { "version" : "v1.0" , "ai_model" : "claude-sonnet-4" , "confidence_score" : 0.91 , "completeness" : 95 } , // 第一部分：职业探索与岗位匹配 "section_1_job_matching" : { "title" : "职业探索与岗位匹配" , // 自我认知总结 "self_assessment" : { "strengths" : [ "学习能力强，快速掌握新技术" , "逻辑思维能力突出" , "有扎实的编程基础和项目经验" ] , "interests" : [ "对人工智能和算法有浓厚兴趣" , "喜欢解决复杂技术问题" , "追求技术深度" ] , "values" : [ "重视个人技术成长" , "追求工作成就感" , "希望参与有影响力的项目" ] } , // 推荐职业方向 "recommended_careers" : [ { "career" : "算法工程师" , "match_score" : 92 , "match_analysis" : { "why_suitable" : [ "你的研究型兴趣与算法岗位高度契合" , "强大的学习能力适合快速迭代的算法领域" , "逻辑分析能力是算法工程师的核心素质" ] , "capability_match" : { "professional_skills" : { "score" : 88 , "description" : "技术栈覆盖80%岗位需求，Python和机器学习基础扎实" } , "soft_skills" : { "score" : 90 , "description" : "学习能力、创新能力与岗位要求高度匹配" } } , "gaps_and_solutions" : [ { "gap" : "缺少大规模数据处理经验" , "solution" : "学习Spark等大数据框架，通过Kaggle竞赛积累经验" , "priority" : "高" , "timeline" : "2-3个月" } , { "gap" : "深度学习框架需要进阶" , "solution" : "深入学习TensorFlow/PyTorch，完成1-2个深度学习项目" , "priority" : "高" , "timeline" : "1-2个月" } ] } , "market_outlook" : { "demand" : "高" , "growth_trend" : "持续上升" , "salary_range" : "15k-25k（应届）→ 25k-40k（2-3年）" , "key_trends" : [ "大模型应用爆发式增长" , "多模态AI成为新热点" , "垂直领域AI深度应用" ] } } , { "career" : "后端开发工程师" , "match_score" : 85 , "match_analysis" : { ... } } ] , // 职业选择建议 "career_choice_advice" : { "primary_recommendation" : "算法工程师" , "reasons" : [ "与你的兴趣、能力、价值观高度契合" , "市场需求旺盛，发展前景好" , "能够充分发挥你的技术优势" ] , "alternative_option" : "机器学习工程师（偏工程化方向）" , "risk_mitigation" : "建议同时关注后端开发技能，增加就业灵活性" } } , // 第二部分：职业目标设定与职业路径规划 "section_2_career_path" : { "title" : "职业目标设定与职业路径规划" , // 短期目标（1年内） "short_term_goal" : { "timeline" : "2025.06 - 2026.06" , "primary_goal" : "成功入职算法工程师岗位，完成职业起步" , "specific_targets" : [ { "target" : "获得算法工程师offer" , "metrics" : "至少2个中大厂offer" , "deadline" : "2025.06" } , { "target" : "快速融入团队" , "metrics" : "3个月内独立负责算法模块" , "deadline" : "2025.09" } , { "target" : "建立技术基础" , "metrics" : "掌握公司核心算法框架和业务" , "deadline" : "2026.06" } ] } , // 中期目标（3-5年） "mid_term_goal" : { "timeline" : "2026 - 2030" , "primary_goal" : "成长为中高级算法工程师，建立技术影响力" , "specific_targets" : [ { "target" : "晋升为中级算法工程师" , "metrics" : "独立负责关键算法项目" , "deadline" : "2027" } , { "target" : "技术深度突破" , "metrics" : "在某一细分领域成为团队专家" , "deadline" : "2028" } , { "target" : "建立行业影响力" , "metrics" : "发表技术博客，参加技术会议" , "deadline" : "2029" } ] } , // 职业发展路径 "career_roadmap" : { "path_type" : "技术专家路线" , "stages" : [ { "stage" : "初级算法工程师" , "period" : "1-2年" , "key_responsibilities" : [ "完成分配的算法开发任务" , "优化现有算法性能" , "学习业务和技术架构" ] , "success_criteria" : [ "独立完成算法模块开发" , "代码质量达到团队标准" , "理解核心业务逻辑" ] } , { "stage" : "中级算法工程师" , "period" : "2-3年" , "key_responsibilities" : [ "负责核心算法设计" , "解决技术难题" , "指导初级工程师" ] , "success_criteria" : [ "设计的算法性能提升显著" , "攻克2-3个技术难点" , "获得晋升委员会认可" ] } , { "stage" : "高级算法工程师/算法专家" , "period" : "3-5年" , "key_responsibilities" : [ "设计算法架构" , "带领算法团队" , "制定技术方向" ] , "success_criteria" : [ "成为某领域的技术专家" , "带领团队完成重要项目" , "有行业影响力（论文/专利）" ] } ] , // 转岗备选方案 "alternative_paths" : [ { "path" : "横向转岗 → 数据科学家" , "timing" : "2-3年工作经验后" , "reason" : "算法能力可迁移，拓展业务分析能力" , "preparation" : [ "加强统计学和业务理解" , "学习数据可视化工具" , "参与业务数据分析项目" ] } , { "path" : "向上转型 → AI产品经理" , "timing" : "4-5年工作经验后" , "reason" : "技术背景+产品思维" , "preparation" : [ "培养产品sense" , "提升沟通和项目管理能力" , "理解商业和用户需求" ] } ] } , // 行业发展趋势分析 "industry_trends" : { "current_status" : "AI算法岗位需求持续旺盛" , "key_trends" : [ { "trend" : "大模型应用普及" , "impact" : "对算法工程师的工程能力要求提高" , "opportunity" : "掌握大模型应用开发将成为核心竞争力" } , { "trend" : "AI+垂直行业融合" , "impact" : "需要懂业务的算法工程师" , "opportunity" : "选择一个垂直领域深耕（如医疗AI、金融AI）" } , { "trend" : "自动化机器学习(AutoML)" , "impact" : "部分基础算法工作被替代" , "opportunity" : "专注高价值的算法创新和优化" } ] , "5_year_outlook" : "算法工程师将从纯技术岗位向技术+业务复合型人才转变" } } , // 第三部分：行动计划与成果展示 "section_3_action_plan" : { "title" : "行动计划与成果展示" , // 短期行动计划（6个月） "short_term_plan" : { "period" : "2025.02 - 2025.08" , "goal" : "补齐能力短板，冲刺校招offer" , "monthly_plans" : [ { "month" : "2025.02 - 2025.03" , "focus" : "技能提升" , "tasks" : [ { "task" : "深度学习进阶" , "具体行动" : [ "完成斯坦福CS231n课程" , "复现3篇经典论文(ResNet, Transformer, BERT)" , "参加Kaggle计算机视觉竞赛" ] , "预期成果" : "掌握深度学习核心算法，获得竞赛Top 10%" , "时间投入" : "每周15小时" } , { "task" : "大数据处理" , "具体行动" : [ "学习Spark基础和实战" , "使用Spark处理1个亿级数据集" ] , "预期成果" : "掌握大规模数据处理流程" , "时间投入" : "每周10小时" } ] , "milestone" : "完成2个深度学习项目，Spark实战项目" } , { "month" : "2025.03 - 2025.04" , "focus" : "项目实战" , "tasks" : [ { "task" : "完整算法项目" , "具体行动" : [ "选择一个实际问题（如推荐系统、NLP应用）" , "从数据收集→模型训练→部署全流程" , "写技术博客记录" ] , "预期成果" : "GitHub star 100+，可用于面试展示" , "时间投入" : "每周20小时" } ] , "milestone" : "完成1个高质量开源项目" } , { "month" : "2025.04 - 2025.06" , "focus" : "求职冲刺" , "tasks" : [ { "task" : "算法刷题" , "具体行动" : [ "LeetCode刷300题（中等150+困难50）" , "准备常见算法面试题" ] , "预期成果" : "算法面试通过率80%+" , "时间投入" : "每周15小时" } , { "task" : "简历优化与投递" , "具体行动" : [ "突出项目成果和技术亮点" , "提前批投递20+公司" ] , "预期成果" : "获得10+面试机会" , "时间投入" : "每周5小时" } , { "task" : "面试准备" , "具体行动" : [ "总结项目经验STAR法则" , "准备技术问题和行为面试" , "模拟面试3次" ] , "预期成果" : "offer转化率50%+" , "时间投入" : "每周10小时" } ] , "milestone" : "获得2-3个算法工程师offer" } ] } , // 中期行动计划（1-3年） "mid_term_plan" : { "period" : "2025.06 - 2028.06" , "goal" : "从初级到中高级算法工程师的成长" , "yearly_plans" : [ { "year" : "第1年 (2025.06-2026.06)" , "focus" : "快速成长，建立基础" , "key_tasks" : [ "完成公司新人培训和导师制项目" , "独立负责2-3个算法优化任务" , "深入学习公司业务和技术栈" , "建立技术博客，分享学习心得" ] , "evaluation_metrics" : [ "绩效评级：达到或超过预期" , "独立完成算法模块开发" , "技术博客阅读量5000+" ] } , { "year" : "第2年 (2026.06-2027.06)" , "focus" : "技术深化，寻求突破" , "key_tasks" : [ "主导1个核心算法项目" , "在某一细分领域（如NLP/CV）建立专长" , "参加1-2次技术会议/竞赛" , "指导1-2名新人" ] , "evaluation_metrics" : [ "项目成果：算法性能提升30%+" , "获得团队技术专家认可" , "晋升为中级算法工程师" ] } , { "year" : "第3年 (2027.06-2028.06)" , "focus" : "建立影响力，冲击高级" , "key_tasks" : [ "负责核心算法架构设计" , "发表1-2篇技术论文或申请专利" , "参与技术规划和团队建设" , "行业技术分享3次以上" ] , "evaluation_metrics" : [ "成为某领域的技术专家" , "绩效连续优秀" , "获得高级工程师提名" ] } ] } , // 学习路径 "learning_path" : { "technical_skills" : [ { "skill_area" : "深度学习" , "current_level" : "熟悉" , "target_level" : "精通" , "learning_resources" : [ "课程：斯坦福CS231n、CS224n" , "书籍：《深度学习》(花书)" , "实践：Kaggle竞赛、复现论文" ] , "timeline" : "6个月" } , { "skill_area" : "大数据处理" , "current_level" : "了解" , "target_level" : "熟练" , "learning_resources" : [ "课程：Spark官方教程" , "项目：处理公司实际数据" , "社区：参与开源项目" ] , "timeline" : "3个月" } ] , "soft_skills" : [ { "skill" : "技术沟通" , "improvement_plan" : [ "每月1次技术分享" , "撰写清晰的技术文档" , "参加公开演讲培训" ] , "timeline" : "持续提升" } ] } , // 成果展示计划 "achievement_showcase" : { "portfolio_building" : { "github" : { "goal" : "打造个人技术品牌" , "actions" : [ "开源2-3个高质量项目" , "维护技术博客，Star 500+" , "贡献知名开源项目" ] } , "technical_blog" : { "goal" : "建立技术影响力" , "actions" : [ "每月1-2篇技术文章" , "总阅读量10万+" , "在掘金/知乎/CSDN建立专栏" ] } , "competitions" : { "goal" : "验证技术能力" , "actions" : [ "参加3次Kaggle竞赛，Top 10%" , "参加1次算法挑战赛，获奖" ] } } } } , // 第四部分：动态评估与调整机制 "section_4_evaluation" : { "title" : "评估周期与动态调整" , "evaluation_system" : { "monthly_review" : { "frequency" : "每月1次" , "review_items" : [ "学习目标完成度" , "项目进展情况" , "技能提升评估" ] , "adjustment_triggers" : [ "目标完成度<70% → 调整计划或降低难度" , "提前完成 → 增加挑战性任务" ] } , "quarterly_review" : { "frequency" : "每季度1次" , "review_items" : [ "能力画像更新" , "人岗匹配度重新评估" , "职业目标校准" ] , "key_questions" : [ "当前能力是否达到预期？" , "职业目标是否需要调整？" , "市场环境有何变化？" ] } , "annual_review" : { "frequency" : "每年1次" , "review_items" : [ "年度目标达成情况" , "职业路径是否需要调整" , "下一年度规划制定" ] } } , "adjustment_scenarios" : [ { "scenario" : "求职不顺利（offer<预期）" , "possible_reasons" : [ "技能储备不足" , "面试表现欠佳" , "目标定位过高" ] , "adjustment_plan" : { "immediate_actions" : [ "分析面试反馈，针对性提升" , "降低目标公司档次，先就业" , "寻求内推和模拟面试帮助" ] , "long_term_actions" : [ "系统提升薄弱技能" , "积累更多项目经验" , "拓展求职渠道" ] } } , { "scenario" : "工作后发现不适合算法岗" , "possible_reasons" : [ "兴趣不符" , "能力不匹配" , "工作环境不适应" ] , "adjustment_plan" : { "evaluation_period" : "工作6个月内" , "decision_tree" : [ "是否是短期适应问题 → 给自己6个月适应期" , "是否能力问题 → 加强学习，寻求导师指导" , "是否兴趣问题 → 考虑换岗路径（参考section_2）" ] , "fallback_options" : [ "转向机器学习工程师（偏工程）" , "转向数据科学家（偏分析）" , "转向后端开发（利用编程能力）" ] } } ] , "risk_management" : { "identified_risks" : [ { "risk" : "AI技术迭代导致部分岗位需求变化" , "probability" : "中" , "impact" : "高" , "mitigation" : "保持学习，关注前沿技术，建立技术深度" } , { "risk" : "市场竞争加剧" , "probability" : "高" , "impact" : "中" , "mitigation" : "提前准备，建立差异化竞争力，拓宽就业面" } ] , "contingency_plans" : [ "plan A: 坚持算法方向，成为技术专家" , "plan B: 转向ML工程师或数据科学家" , "plan C: 转向后端开发或全栈工程师" ] } } , // 报告总结 "summary" : { "key_takeaways" : [ "你适合从事算法工程师职业，与你的兴趣、能力、价值观高度契合" , "短期目标是补齐技能短板，获得2-3个offer" , "中期目标是3-5年内成长为中高级算法工程师" , "需要重点提升深度学习和大数据处理能力" , "保持技术学习和项目实践，建立个人技术品牌" ] , "next_steps" : [ "立即开始：深度学习课程学习（本周内）" , "2周内：启动1个深度学习项目" , "1个月内：完成Spark学习和实战" , "3个月内：完成2个高质量项目并开源" , "4个月内：开始算法刷题和简历准备" ] , "motivational_message" : "你已经具备了成为优秀算法工程师的潜质。接下来的6个月是关键期，保持专注和持续行动，你一定能够实现职业目标。记住：每一次学习和实践都是在为未来的自己铺路。加油！" } } }
```


### 7.3 编辑职业规划报告

**功能说明**：手动编辑和调整报告内容

**方法**： `POST`

**路径**： `/career/edit-report`

**请求示例**：

```json
{
  "report_id": "report_career_20250214_10001",
  "user_id": 10001,
  "edits": {
    "section_3_action_plan.short_term_plan.monthly_plans[0].tasks[0].时间投入": "每周12小时",
    "section_2_career_path.short_term_goal.specific_targets[0].deadline": "2025.07"
  }
}
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "报告编辑成功",
  "data": {
    "updated_at": "2025-02-14 13:00:00"
  }
}
```


### 7.4 AI优化报告

**功能说明**：使用AI对报告进行智能润色和优化

**方法**： `POST`

**路径**： `/career/ai-polish-report`

**请求示例**：

```json
{ "report_id" : "report_career_20250214_10001" , "polish_options" : { "improve_readability" : true , // 提升可读性 "add_examples" : true , // 添加具体案例 "enhance_actionability" : true , // 增强可操作性 "check_completeness" : true // 检查完整性 } }
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "AI优化中...",
  "data": {
    "task_id": "polish_20250214_001",
    "status": "processing"
  }
}
```


### 7.5 导出职业规划报告

**功能说明**：导出报告为PDF/Word文档

**方法**： `POST`

**路径**： `/career/export-report`

**请求示例**：

```json
{ "report_id" : "report_career_20250214_10001" , "format" : "pdf" , // pdf/docx "include_sections" : [ "all" ] , // all 或指定章节 "template_style" : "professional" // professional/modern/simple }
```

**响应示例**：

```json
{ "code" : 200 , "msg" : "报告导出成功" , "data" : { "download_url" : "/downloads/career_report_10001_20250214.pdf" , "file_size" : "2.5MB" , "expires_at" : "2025-02-21 13:00:00" // 下载链接7天有效 } }
```


### 7.6 获取报告完整性检查

**功能说明**：AI检查报告的完整性和质量

**方法**： `POST`

**路径**： `/career/check-completeness`

**请求示例**：

```json
{
  "report_id": "report_career_20250214_10001"
}
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "completeness_score": 92,
    "quality_score": 88,
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


### 7.7 获取历史报告列表

**功能说明**：获取用户的历史职业规划报告

**方法**： `POST`

**路径**： `/career/report-history`

**请求示例**：

```json
{
  "user_id": 10001,
  "page": 1,
  "size": 10
}
```

**响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 3,
    "list": [
      {
        "report_id": "report_career_20250214_10001",
        "created_at": "2025-02-14 12:00:00",
        "status": "completed",
        "primary_career": "算法工程师",
        "completeness": 95,
        "last_viewed": "2025-02-14 13:30:00"
      },
      {
        "report_id": "report_career_20250101_10001",
        "created_at": "2025-01-01 10:00:00",
        "status": "archived",
        "primary_career": "前端开发工程师",
        "completeness": 85
      }
    ]
  }
}
```

---

## 8. 智能体对话与自主规划模块 (Agent Core)

> **核心设计理念**：本模块是体现系统"智能体"属性的核心模块。区别于普通问答，本模块实现**多轮上下文记忆**、**自主任务分解**、**工具调用链**（Tool
> Use
> Chain）、**主动追问与澄清**四大智能体特征，在网页端以沉浸式对话界面呈现，并实时展示
> Agent 的思考过程（ReAct 推理链可视化）。

### 8.1 发起智能体对话会话

**功能说明**：创建一个新的 Agent 会话，Agent
会自动分析用户当前状态（档案完整度、测评结果、已有匹配岗位），制定本次对话的初始规划目标，并以主动提问的方式引导用户。

**方法**：`POST`\
**路径**：`/agent/session/create`

**请求示例**：

    {
      "user_id": 10001,
      "session_type": "career_planning",  // career_planning | job_match | skill_gap | mock_interview_prep
      "context_hint": "我想了解转行到产品经理的可能性"  // 可选，用户主动输入的初始意图
    }

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "session_id": "agent_sess_20250301_001",
        "agent_state": {
          "current_goal": "评估用户转岗产品经理的可行性并制定行动计划",
          "sub_tasks": [
            "分析当前能力画像与产品经理岗位画像的差距",
            "评估转岗路径可行性",
            "生成个性化提升路线图",
            "推荐适合过渡期的岗位"
          ],
          "completed_tasks": [],
          "tool_calls_plan": ["get_student_profile", "get_job_profile", "compute_skill_gap", "search_knowledge_base"]
        },
        "initial_message": "你好！我注意到你目前的专业背景是计算机科学，已完成职业测评，MBTI类型为ENFJ，Holland代码为SAE。转行产品经理是一个很有潜力的方向！\n\n在我为你制定详细规划之前，我想先了解几点：\n1. 你是希望毕业后直接从事产品岗，还是先在技术岗积累经验再转？\n2. 你更倾向于哪个产品方向：ToB企业软件、ToC消费互联网，还是AI产品？\n\n请告诉我你的想法，我来为你量身制定规划路径 😊",
        "created_at": "2025-03-01 10:00:00"
      }
    }

### 8.2 发送消息（流式输出）

**功能说明**：向 Agent 发送消息，Agent
在回复前会展示**工具调用过程**与**推理步骤**（ReAct模式），最终给出回复。支持
SSE 流式输出，前端实时渲染思考链与回答内容。

**方法**：`POST`\
**路径**：`/agent/session/chat`\
**响应类型**：`text/event-stream`（SSE 流式）

**请求示例**：

    {
      "session_id": "agent_sess_20250301_001",
      "user_id": 10001,
      "message": "我倾向于AI产品方向，希望毕业后直接从事产品岗"
    }

**SSE 事件流格式**：

每个 SSE 事件包含 `event` 类型与 `data` JSON 体：

    event: thinking
    data: {"step": 1, "type": "tool_call", "tool": "get_student_profile", "description": "正在读取你的能力画像数据..."}

    event: thinking
    data: {"step": 2, "type": "tool_call", "tool": "get_job_profile", "description": "正在检索AI产品经理岗位画像..."}

    event: thinking
    data: {"step": 3, "type": "tool_call", "tool": "compute_skill_gap", "description": "正在计算技能差距，分析你的编程、数据分析能力在产品岗中的优势..."}

    event: thinking
    data: {"step": 4, "type": "reasoning", "description": "用户具备CS背景，技术理解能力强，是AI产品的竞争优势。主要差距在于：产品思维（当前评分42/100）、用户研究方法（未涉及）、商业分析（初级）。建议制定6-12个月提升计划..."}

    event: message_chunk
    data: {"chunk": "根据你的情况，我为你制定了以下规划：\n\n**你的核心优势**（相比非技术背景的产品同学）\n"}

    event: message_chunk
    data: {"chunk": "- 技术可行性判断能力强，能与研发高效协作\n- 数据分析基础扎实，具备产品数据驱动思维的先天条件\n"}

    event: task_completed
    data: {"completed_task": "分析当前能力画像与产品经理岗位画像的差距", "remaining_tasks": ["生成个性化提升路线图", "推荐适合过渡期的岗位"]}

    event: message_done
    data: {"full_message": "...(完整回复内容)...", "message_id": "msg_001", "tokens_used": 512}

**前端展示要求**： - 左侧/顶部展示 Agent
思考过程面板（可折叠），实时显示工具调用与推理步骤 -
右侧展示对话内容区域，流式渲染文字 -
已完成子任务以绿色进度条形式展示在会话顶部

### 8.3 获取会话历史

**功能说明**：获取指定会话的完整对话记录，包含 Agent 的思考链记录。

**方法**：`GET`\
**路径**：`/agent/session/{session_id}/history`

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "session_id": "agent_sess_20250301_001",
        "session_type": "career_planning",
        "status": "active",
        "messages": [
          {
            "message_id": "msg_000",
            "role": "agent",
            "content": "你好！我注意到你目前的专业背景是计算机科学...",
            "thinking_chain": [],
            "created_at": "2025-03-01 10:00:00"
          },
          {
            "message_id": "msg_001",
            "role": "user",
            "content": "我倾向于AI产品方向，希望毕业后直接从事产品岗",
            "created_at": "2025-03-01 10:01:30"
          },
          {
            "message_id": "msg_002",
            "role": "agent",
            "content": "根据你的情况，我为你制定了以下规划...",
            "thinking_chain": [
              {"step": 1, "type": "tool_call", "tool": "get_student_profile"},
              {"step": 2, "type": "tool_call", "tool": "get_job_profile"},
              {"step": 3, "type": "reasoning", "description": "用户具备CS背景..."}
            ],
            "created_at": "2025-03-01 10:01:35"
          }
        ],
        "agent_state": {
          "current_goal": "评估用户转岗产品经理的可行性并制定行动计划",
          "completed_tasks": ["分析当前能力画像与产品经理岗位画像的差距"],
          "remaining_tasks": ["生成个性化提升路线图", "推荐适合过渡期的岗位"]
        }
      }
    }

### 8.4 获取用户所有会话列表

**方法**：`GET`\
**路径**：`/agent/session/list`

**请求参数（Query）**：

  ------------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- ------------------
  user_id           number            是                用户ID

  page              number            否                页码，默认1

  size              number            否                每页数量，默认10
  ------------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 5,
        "list": [
          {
            "session_id": "agent_sess_20250301_001",
            "session_type": "career_planning",
            "title": "转行AI产品经理规划",
            "status": "active",
            "message_count": 12,
            "last_message_at": "2025-03-01 11:30:00",
            "created_at": "2025-03-01 10:00:00"
          }
        ]
      }
    }

### 8.5 Agent 主动任务触发（定时提醒）

**功能说明**：Agent
具备主动性，可根据用户设定的目标，定时检测学习进度并主动推送提醒与建议。体现智能体"持续规划"特性。

**方法**：`POST`\
**路径**：`/agent/task/schedule`

**请求示例**：

    {
      "user_id": 10001,
      "task_type": "learning_reminder",  // learning_reminder | application_reminder | progress_check
      "goal": "3个月内完成产品经理转岗准备",
      "check_interval_days": 7,  // 每7天检查一次进度
      "notify_channel": "in_app"  // in_app | email
    }

**响应示例**：

    {
      "code": 200,
      "msg": "定时规划任务已创建",
      "data": {
        "task_id": "agent_task_001",
        "next_check_at": "2025-03-08 10:00:00",
        "goal_breakdown": [
          {"week": 1, "milestone": "完成产品思维基础课程学习（推荐：梁宁产品思维30讲）"},
          {"week": 2, "milestone": "完成一份竞品分析报告"},
          {"week": 3, "milestone": "开始撰写产品需求文档（PRD）实践"}
        ]
      }
    }

## 9. 规划落地性跟踪模块 (Career Tracking)

> **核心设计理念**：解决"规划落地性差"的核心痛点。系统在推荐岗位后，持续跟踪学生的求职进展，记录笔试/面试结果，当求职失败时吸取经验，提供更优的下一步规划，并生成**反馈优化报告**，实现平台持续自我迭代。

### 9.1 创建求职跟踪记录

**功能说明**：学生开始投递某个推荐岗位后，创建该岗位的求职跟踪记录。

**方法**：`POST`\
**路径**：`/tracking/record/create`

**请求示例**：

    {
      "user_id": 10001,
      "job_id": "job_2025_001",
      "job_title": "AI产品经理",
      "company_name": "某科技公司",
      "apply_date": "2025-03-01",
      "source": "system_recommend"  // system_recommend | self_found
    }

**响应示例**：

    {
      "code": 200,
      "msg": "跟踪记录已创建",
      "data": {
        "record_id": "track_001",
        "status": "applied",
        "created_at": "2025-03-01 14:00:00"
      }
    }

### 9.2 更新求职进展

**功能说明**：学生录入求职各阶段的进展与反馈，包括笔试成绩、面试评价、最终结果等。

**方法**：`PUT`\
**路径**：`/tracking/record/{record_id}/update`

**请求示例**：

    {
      "user_id": 10001,
      "stage": "interview_1",  // applied | written_test | interview_1 | interview_2 | final | offer | rejected
      "result": "passed",  // passed | failed | pending | withdrawn
      "stage_date": "2025-03-10",
      "self_evaluation": {
        "performance_score": 70,  // 自评分 0-100
        "difficulty": "medium",  // easy | medium | hard
        "weak_points": ["产品数据分析题目答得不好", "竞品分析不够深入"],
        "strong_points": ["技术背景获得面试官认可", "沟通表达较流畅"]
      },
      "notes": "一面通过，考察了产品思维和数据分析，感觉数据分析部分有些薄弱"
    }

**响应示例**：

    {
      "code": 200,
      "msg": "进展已更新",
      "data": {
        "record_id": "track_001",
        "current_stage": "interview_1",
        "result": "passed",
        "agent_tip": "一面通过，恭喜！针对你提到的数据分析薄弱点，建议在二面前重点复习 SQL 窗口函数和漏斗分析方法。"
      }
    }

### 9.3 求职失败反馈分析（关键接口）

**功能说明**：当求职结果为"失败/拒绝"时，Agent
自动分析失败原因，结合学生自评与该岗位画像，生成**针对性改进建议**与**更新后的求职规划**，并将失败经验纳入平台学习数据。

**方法**：`POST`\
**路径**：`/tracking/record/{record_id}/failure-analysis`\
**响应类型**：`text/event-stream`（流式）

**请求示例**：

    {
      "user_id": 10001,
      "record_id": "track_001",
      "final_stage": "interview_2",
      "final_result": "rejected",
      "rejection_feedback": "HR反馈说产品sense不足，对商业模式理解较浅"
    }

**SSE 事件流格式**：

    event: analyzing
    data: {"description": "正在对比你的能力画像与该岗位的实际要求差距..."}

    event: analyzing
    data: {"description": "正在分析你在各面试阶段的表现数据..."}

    event: report_chunk
    data: {"chunk": "## 本次求职复盘报告\n\n**失败阶段**：终面\n**核心原因分析**：\n"}

    event: report_chunk
    data: {"chunk": "根据你的反馈与岗位画像对比，本次未通过的核心原因集中在：\n1. **商业敏感度不足**（差距最大）：AI产品经理岗要求对商业模式有深刻理解，而你当前能力画像中"商业分析"维度评分仅35/100\n2. **产品sense培养**：需要大量阅读竞品报告和行业案例\n"}

    event: new_plan_chunk
    data: {"chunk": "\n## 更新后的求职规划\n\n基于本次失败经验，我对你的规划进行了调整：\n\n**短期（1个月）**：\n- 完成《俞军产品方法论》精读，重点学习商业视角\n- 每周阅读3份行业分析报告并产出总结\n\n**中期（2-3个月）**：\n- 参与1个实际产品项目（可从开源产品贡献或学校创业项目切入）\n- 尝试投递产品助理或数据产品岗积累经验\n"}

    event: done
    data: {"report_id": "failure_report_001", "plan_updated": true}

### 9.4 获取求职跟踪总览

**功能说明**：获取用户所有求职记录的总览，包含各阶段统计与成功率分析。

**方法**：`GET`\
**路径**：`/tracking/overview`

**请求参数（Query）**：

  -----------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- -----------------
  user_id           number            是                用户ID

  -----------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "summary": {
          "total_applied": 8,
          "written_test_pass_rate": 0.75,
          "interview_pass_rate": 0.50,
          "offer_count": 1,
          "rejected_count": 4,
          "in_progress_count": 3
        },
        "records": [
          {
            "record_id": "track_001",
            "job_title": "AI产品经理",
            "company_name": "某科技公司",
            "current_stage": "rejected",
            "last_updated": "2025-03-15",
            "has_failure_report": true
          }
        ],
        "agent_insight": "根据你的求职数据，你的简历通过率较高（75%），但终面转化率偏低（50%）。建议重点强化商业思维与产品案例储备。"
      }
    }

### 9.5 获取反馈优化报告列表

**方法**：`GET`\
**路径**：`/tracking/failure-reports`

**请求参数（Query）**：

  -----------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- -----------------
  user_id           number            是                用户ID

  page              number            否                默认1

  size              number            否                默认10
  -----------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 3,
        "list": [
          {
            "report_id": "failure_report_001",
            "job_title": "AI产品经理",
            "company_name": "某科技公司",
            "failure_stage": "interview_2",
            "key_weakness": "商业敏感度不足",
            "plan_updated": true,
            "created_at": "2025-03-15 16:00:00"
          }
        ]
      }
    }

## 10. 模拟面试模块 (Mock Interview)

> **核心设计理念**：基于目标岗位画像，由 AI
> 担任面试官进行沉浸式模拟面试，实时评估回答质量，生成面试表现报告与改进建议，体现智能体的交互能力与规划性。

### 10.1 创建模拟面试会话

**功能说明**：根据目标岗位创建模拟面试会话，AI
自动从岗位画像中提取高频考点，生成面试题库并规划面试流程。

**方法**：`POST`\
**路径**：`/mock-interview/session/create`

**请求示例**：

    {
      "user_id": 10001,
      "target_job_id": "job_2025_001",  // 可选，若不填则从已匹配岗位中选择
      "target_job_title": "AI产品经理",
      "interview_type": "comprehensive",  // comprehensive | technical | hr | case_study
      "difficulty": "medium",  // easy | medium | hard
      "duration_minutes": 30  // 模拟面试时长
    }

**响应示例**：

    {
      "code": 200,
      "msg": "模拟面试已准备就绪",
      "data": {
        "interview_id": "mock_interview_001",
        "interviewer_persona": {
          "name": "张总",
          "role": "某AI公司产品总监",
          "style": "注重产品思维与商业逻辑，会追问细节"
        },
        "interview_plan": {
          "total_questions": 8,
          "sections": [
            {"name": "自我介绍", "question_count": 1, "time_minutes": 3},
            {"name": "产品思维考察", "question_count": 3, "time_minutes": 12},
            {"name": "背景与动机", "question_count": 2, "time_minutes": 8},
            {"name": "案例分析", "question_count": 1, "time_minutes": 5},
            {"name": "反向提问", "question_count": 1, "time_minutes": 2}
          ]
        },
        "opening_message": "你好！请先做一个简短的自我介绍，重点介绍一下你与产品岗位相关的经历和优势。",
        "started_at": "2025-03-20 14:00:00"
      }
    }

### 10.2 发送面试回答（流式实时评估）

**功能说明**：学生提交面试回答，AI
面试官实时给出追问或下一题，并在每轮结束后进行实时评分。

**方法**：`POST`\
**路径**：`/mock-interview/session/{interview_id}/answer`\
**响应类型**：`text/event-stream`

**请求示例**：

    {
      "user_id": 10001,
      "interview_id": "mock_interview_001",
      "question_id": "q_001",
      "answer_text": "我叫李明，就读于某大学计算机科学专业大四，有两年的算法开发经验，同时热爱产品设计，曾独立完成一款校园工具App从0到1的产品设计与上线..."
    }

**SSE 事件流格式**：

    event: evaluating
    data: {"description": "正在评估你的回答..."}

    event: score_update
    data: {
      "question_id": "q_001",
      "dimension_scores": {
        "内容完整度": 85,
        "逻辑结构": 80,
        "与岗位相关性": 90,
        "表达清晰度": 75
      },
      "overall_score": 83
    }

    event: interviewer_response_chunk
    data: {"chunk": "不错！你提到了独立做过一款App，这个经历很有说服力。"}

    event: interviewer_response_chunk
    data: {"chunk": "我想进一步了解一下：那款校园App当时你是如何做用户调研的？最终的日活数据大概是多少？"}

    event: next_question
    data: {
      "question_id": "q_002",
      "section": "产品思维考察",
      "question_number": 2,
      "remaining_questions": 6
    }

    event: done
    data: {"message_id": "msg_002"}

### 10.3 结束模拟面试并获取报告

**功能说明**：面试结束后生成综合表现报告，包含各维度评分、优劣势分析、与目标岗位要求的对比，以及
AI 给出的改进建议。

**方法**：`POST`\
**路径**：`/mock-interview/session/{interview_id}/finish`

**请求示例**：

    {
      "user_id": 10001,
      "interview_id": "mock_interview_001"
    }

**响应示例**：

    {
      "code": 200,
      "msg": "面试报告生成成功",
      "data": {
        "interview_id": "mock_interview_001",
        "target_job": "AI产品经理",
        "total_duration_minutes": 28,
        "overall_score": 76,
        "pass_threshold": 80,
        "result": "borderline",  // excellent | good | borderline | needs_improvement
        "dimension_scores": {
          "产品思维": {"score": 65, "weight": 0.30, "benchmark": 80},
          "沟通表达": {"score": 82, "weight": 0.20, "benchmark": 75},
          "技术背景": {"score": 90, "weight": 0.15, "benchmark": 70},
          "商业敏感度": {"score": 60, "weight": 0.20, "benchmark": 78},
          "逻辑思维": {"score": 80, "weight": 0.15, "benchmark": 75}
        },
        "strengths": [
          "技术背景扎实，能够清晰描述技术实现逻辑，获得面试官认可",
          "表达流畅，答题结构较清晰（多次使用STAR法则）"
        ],
        "weaknesses": [
          "产品思维深度不足：在案例分析题中，对用户痛点的挖掘流于表面，缺乏数据支撑",
          "商业敏感度偏低：无法清晰描述产品的盈利模式与商业价值"
        ],
        "question_reviews": [
          {
            "question_id": "q_001",
            "question": "请做自我介绍",
            "your_answer_summary": "介绍了CS背景和App项目经历",
            "score": 83,
            "feedback": "内容有亮点，建议开头更简洁，将App成绩数据前置"
          }
        ],
        "improvement_plan": {
          "short_term": [
            "每天练习1道产品案例题（推荐使用PM面试宝典）",
            "研读3家AI公司的商业模式与盈利逻辑"
          ],
          "suggested_retry_days": 14
        },
        "created_at": "2025-03-20 14:30:00"
      }
    }

### 10.4 获取历史面试记录

**方法**：`GET`\
**路径**：`/mock-interview/history`

**请求参数（Query）**：

  -----------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- -----------------
  user_id           number            是                用户ID

  page              number            否                默认1

  size              number            否                默认10
  -----------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 5,
        "score_trend": [72, 74, 76, 78, 81],  // 历次得分趋势（用于前端折线图）
        "list": [
          {
            "interview_id": "mock_interview_005",
            "target_job": "AI产品经理",
            "overall_score": 81,
            "result": "good",
            "duration_minutes": 30,
            "created_at": "2025-04-03 10:00:00"
          }
        ]
      }
    }

## 11. 企业HR评估模块 (HR Evaluation)

> **核心设计理念**：引入企业HR或面试官视角，弥补学生自我认知偏差，提供更客观的外部评估数据，与学生自评数据双轨并行，优化推荐准确性。HR端拥有独立登录入口与评估界面。

### 11.1 HR账号注册

**功能说明**：企业HR注册账号，填写企业信息与招聘方向，用于筛选对口学生简历。

**方法**：`POST`\
**路径**：`/hr/register`

**请求格式**：`multipart/form-data`

**请求参数**：

  ------------------------------------------------------------------------------------------------
  参数名             类型              必填              说明
  ------------------ ----------------- ----------------- -----------------------------------------
  username           string            是                HR账号（邮箱格式）

  password           string            是                密码

  real_name          string            是                真实姓名

  company_name       string            是                企业名称

  company_size       string            是                企业规模（50人以下/50-500人/500人以上）

  industry           string            是                行业（互联网/金融/制造/教育/其他）

  hr_role            string            是                岗位（HR专员/招聘主管/部门经理）

  business_license   file              否                营业执照（用于认证，jpg/png/pdf）
  ------------------------------------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "注册成功，等待平台审核",
      "data": {
        "hr_id": "hr_001",
        "status": "pending_review",  // pending_review | approved | rejected
        "created_at": "2025-03-01 09:00:00"
      }
    }

### 11.2 HR登录

**方法**：`POST`\
**路径**：`/hr/login`

**请求示例**：

    {
      "username": "[email protected]",
      "password": "password123"
    }

**响应示例**：

    {
      "code": 200,
      "msg": "登录成功",
      "data": {
        "hr_id": "hr_001",
        "real_name": "王HR",
        "company_name": "某AI科技公司",
        "status": "approved",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "unread_evaluations": 0  // 待完成的评估任务数量
      }
    }

### 11.3 HR浏览学生简历（匿名）

**功能说明**：HR可浏览平台上主动公开简历的学生（学生授权），简历以脱敏方式展示（隐去姓名、学校等敏感信息，仅展示能力画像与项目经历摘要）。

**方法**：`GET`\
**路径**：`/hr/students/browse`

**请求参数（Query）**：

  -------------------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- -------------------------
  hr_id             number            是                HR的ID

  target_job        string            否                招聘岗位筛选

  min_match_score   number            否                最低岗位匹配分（0-100）

  education_level   string            否                学历（本科/硕士/博士）

  page              number            否                默认1

  size              number            否                默认20
  -------------------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 45,
        "list": [
          {
            "anonymous_id": "student_anon_001",  // 匿名ID
            "education_level": "本科",
            "major_category": "计算机科学与技术",
            "gpa_level": "优秀（3.7+）",
            "system_match_score": 88,  // 系统计算的与HR目标岗位的匹配分
            "ability_tags": ["Python", "机器学习", "数据分析", "项目管理"],
            "highlight": "主导开发AI辅助系统，具备独立项目落地经验",
            "is_open_to_contact": true
          }
        ]
      }
    }

### 11.4 HR发起评估邀请

**功能说明**：HR对感兴趣的学生发起评估邀请，学生同意后，HR可对该学生进行能力评估并留下评价，系统将HR评估结果纳入学生能力画像的外部维度。

**方法**：`POST`\
**路径**：`/hr/evaluation/invite`

**请求示例**：

    {
      "hr_id": "hr_001",
      "anonymous_student_id": "student_anon_001",
      "target_job": "AI产品经理",
      "message": "您好，我们公司正在招聘AI产品经理，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。"
    }

**响应示例**：

    {
      "code": 200,
      "msg": "邀请已发送，等待学生确认",
      "data": {
        "invitation_id": "inv_001",
        "status": "pending",
        "sent_at": "2025-03-10 15:00:00"
      }
    }

### 11.5 学生响应HR评估邀请

**方法**：`POST`\
**路径**：`/hr/evaluation/respond`

**请求示例**：

    {
      "user_id": 10001,
      "invitation_id": "inv_001",
      "action": "accept",  // accept | decline
      "agree_reveal_identity": false  // 是否同意向HR解除匿名
    }

**响应示例**：

    {
      "code": 200,
      "msg": "已接受邀请",
      "data": {
        "evaluation_id": "eval_001",
        "hr_company": "某AI科技公司",
        "target_job": "AI产品经理",
        "status": "in_progress"
      }
    }

### 11.6 HR提交学生评估结果

**功能说明**：HR完成对学生的评估（可基于面试、简历审阅、在线测试等形式），提交多维度评估结果。该数据将作为"外部评估维度"融入学生能力画像，提升推荐准确性。

**方法**：`POST`\
**路径**：`/hr/evaluation/{evaluation_id}/submit`

**请求示例**：

    {
      "hr_id": "hr_001",
      "evaluation_id": "eval_001",
      "evaluation_form": {
        "overall_impression": "good",  // excellent | good | average | below_average
        "dimension_scores": {
          "专业技能匹配度": 85,
          "学习能力": 90,
          "沟通表达": 80,
          "团队协作意愿": 85,
          "抗压能力": 75,
          "职业成熟度": 70
        },
        "hiring_intent": "strong",  // strong | moderate | weak | no
        "strengths_noted": "技术背景扎实，学习能力强，对产品有自己的见解",
        "weaknesses_noted": "商业经验不足，需要一定的培养周期",
        "recommended_positions": ["产品助理", "数据产品经理", "AI产品经理（1-2年后）"],
        "evaluation_basis": "resume_review"  // resume_review | online_test | video_interview | onsite_interview
      }
    }

**响应示例**：

    {
      "code": 200,
      "msg": "评估提交成功",
      "data": {
        "evaluation_id": "eval_001",
        "status": "completed",
        "profile_updated": true,  // 学生能力画像是否已更新外部评估维度
        "submitted_at": "2025-03-12 16:30:00"
      }
    }

### 11.7 学生查看HR评估结果

**功能说明**：学生查看企业HR对自己的评估报告（仅在学生同意接受的评估中可见）。

**方法**：`GET`\
**路径**：`/hr/evaluation/student/{user_id}/results`

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 2,
        "list": [
          {
            "evaluation_id": "eval_001",
            "company_name": "某AI科技公司（已认证）",
            "target_job": "AI产品经理",
            "overall_impression": "good",
            "dimension_scores": {
              "专业技能匹配度": 85,
              "学习能力": 90,
              "沟通表达": 80
            },
            "strengths_noted": "技术背景扎实，学习能力强",
            "recommended_positions": ["产品助理", "数据产品经理"],
            "hiring_intent_label": "有意向",
            "evaluated_at": "2025-03-12 16:30:00"
          }
        ],
        "external_dimension_summary": {
          "avg_skill_match": 85,
          "avg_learning_ability": 90,
          "avg_communication": 80,
          "data_source_count": 2,
          "insight": "来自2家企业HR的外部评估显示：你的学习能力被一致认可（平均90分），技术匹配度强；商业经验不足是最常被提及的待提升点。"
        }
      }
    }

## 12. 向量语义匹配升级模块 (Semantic Matching)

> **技术创新点**：在原有精准/模糊字段匹配基础上，引入向量数据库（ChromaDB
> /
> Milvus）与语义嵌入模型（BGE-M3），实现对简历中非结构化文本的**语义理解与匹配**，大幅提升推荐准确性。

### 12.1 构建/更新用户语义向量

**功能说明**：将用户简历、个人档案的非结构化文本（项目描述、技能说明、自我评价等）向量化并存储，用于语义检索。在用户更新档案或简历时自动触发。

**方法**：`POST`\
**路径**：`/semantic/user-vector/build`

**请求示例**：

    {
      "user_id": 10001,
      "rebuild_all": false,  // true: 全量重建，false: 增量更新
      "text_sources": ["profile", "resume", "assessment_result"]
    }

**响应示例**：

    {
      "code": 200,
      "msg": "向量构建任务已提交",
      "data": {
        "task_id": "vec_task_001",
        "status": "processing",
        "estimated_seconds": 5
      }
    }

### 12.2 语义岗位匹配

**功能说明**：基于用户的语义向量，在岗位向量库中检索语义最接近的岗位，返回带相似度分数的推荐结果。可与传统字段匹配结果融合（加权），得到综合推荐分。

**方法**：`POST`\
**路径**：`/semantic/job-match`

**请求示例**：

    {
      "user_id": 10001,
      "query_text": "我擅长用Python做数据处理，做过推荐系统相关项目，对用户产品感兴趣",  // 可选，自由描述
      "top_k": 10,
      "fusion_weight": {
        "semantic": 0.6,   // 语义相似度权重
        "field_match": 0.4  // 传统字段匹配权重
      }
    }

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "match_mode": "semantic_fusion",
        "results": [
          {
            "job_id": "job_2025_001",
            "job_title": "推荐算法工程师",
            "company": "某电商平台",
            "semantic_score": 0.91,
            "field_match_score": 0.85,
            "fusion_score": 0.89,
            "match_reason": "你的项目经历中涉及推荐系统设计，与该岗位核心要求高度语义匹配；Python技能与岗位偏好高度一致"
          }
        ]
      }
    }

### 12.3 技能语义扩展

**功能说明**：对学生填写的技能词进行语义扩展，识别相关联技能与岗位中等价描述（如
"深度学习" 与 "神经网络" 等价），减少因用词不同导致的匹配遗漏。

**方法**：`POST`\
**路径**：`/semantic/skill-expand`

**请求示例**：

    {
      "skills": ["PyTorch", "推荐系统", "A/B测试"],
      "context": "算法工程师"
    }

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "expanded_skills": [
          {
            "original": "PyTorch",
            "semantic_equivalents": ["深度学习框架", "TensorFlow（相似技能）", "神经网络开发"],
            "related_skills": ["CUDA", "模型训练", "模型部署（TorchServe）"]
          },
          {
            "original": "推荐系统",
            "semantic_equivalents": ["个性化推荐", "协同过滤", "召回与排序"],
            "related_skills": ["Embedding技术", "特征工程", "CTR预估"]
          }
        ]
      }
    }

## 13. 模拟教务数据接入模块 (Academic Data Integration)

> **设计说明**：题目背景提及企业已积累教务、学工等数据。本模块提供模拟数据的接入接口，用于功能演示与推荐优化，实际部署时可替换为学校教务系统的真实数据。

### 13.1 导入模拟教务数据

**功能说明**：管理员上传或导入学生的模拟教务数据（成绩、课程、GPA等），用于增强能力画像的可信度，为职业推荐提供更细粒度分析支持。

**方法**：`POST`\
**路径**：`/academic/import`\
**请求格式**：`multipart/form-data`

**请求参数**：

  --------------------------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- --------------------------------
  user_id           number            是                管理员ID

  data_file         file              是                教务数据文件（CSV/JSON格式）

  data_type         string            是                数据类型：academic（教务）/
                                                        student_affairs（学工）

  is_simulated      boolean           是                是否为模拟数据（演示用途标识）
  --------------------------------------------------------------------------------------

**CSV文件格式（教务数据）**：

    student_id,course_name,course_type,credits,score,semester
    S2021001,数据结构,专业必修,4,92,2022-1
    S2021001,机器学习,专业选修,3,88,2022-2
    S2021001,软件工程,专业必修,3,85,2023-1

**响应示例**：

    {
      "code": 200,
      "msg": "数据导入成功",
      "data": {
        "imported_records": 156,
        "affected_students": 42,
        "data_type": "academic",
        "is_simulated": true,
        "import_id": "import_001",
        "imported_at": "2025-03-01 09:00:00"
      }
    }

### 13.2 获取学生教务画像

**功能说明**：获取系统基于教务数据分析出的学生学业能力画像，包含核心课程表现、学习能力评估、专业方向偏好等维度。

**方法**：`GET`\
**路径**：`/academic/student-portrait/{user_id}`

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "user_id": 10001,
        "is_simulated": true,
        "academic_portrait": {
          "overall_gpa": 3.72,
          "gpa_percentile": 0.15,
          "strong_subject_areas": [
            {"area": "算法与数据结构", "avg_score": 91.5, "course_count": 3},
            {"area": "机器学习与AI", "avg_score": 89.0, "course_count": 4}
          ],
          "weak_subject_areas": [
            {"area": "经济与管理类", "avg_score": 74.0, "course_count": 2}
          ],
          "learning_ability_score": 85,
          "major_direction_tags": ["AI/机器学习", "算法开发", "数据分析"],
          "academic_awards": [
            {"name": "校级奖学金", "year": 2023},
            {"name": "ACM程序设计竞赛三等奖", "year": 2022}
          ]
        },
        "career_relevance_insight": "你的课程成绩显示在AI/机器学习方向具有扎实的学业基础，与算法工程师、数据科学家等岗位高度匹配。管理类课程偏弱，进军产品经理方向需要额外补强。"
      }
    }

### 13.3 学工数据接入（行为与素质画像）

**功能说明**：接入学工数据，补充学生的综合素质维度，如活动参与、社团经历、荣誉等，为职业规划提供性格与领导力维度的参考。

**方法**：`POST`\
**路径**：`/academic/student-affairs/import`\
**请求格式**：`multipart/form-data`

**请求参数**：

  ------------------------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- ------------------------------
  user_id           number            是                管理员ID

  data_file         file              是                学工数据文件（CSV/JSON格式）

  is_simulated      boolean           是                是否为模拟数据
  ------------------------------------------------------------------------------------

**CSV文件格式（学工数据）**：

    student_id,activity_name,activity_type,role,year,description
    S2021001,学生会主席团,学生组织,部长,2022-2023,负责科技部活动策划与执行
    S2021001,校园马拉松,体育活动,参与者,2023,完赛时间4h20min

**响应示例**：

    {
      "code": 200,
      "msg": "学工数据导入成功",
      "data": {
        "imported_records": 28,
        "affected_students": 42,
        "is_simulated": true,
        "generated_tags": ["组织管理能力", "抗压能力", "团队领导"]
      }
    }

## 14. 数据安全与隐私保护模块 (Data Security)

> **技术创新点**：平台涉及学生隐私数据（个人信息、学业成绩、职业测评结果等），引入国产加密算法（SM2/SM3/SM4）与分级数据脱敏机制，作为技术创新亮点之一，也体现平台的可信度与合规性。

### 14.1 数据脱敏配置

**功能说明**：管理员配置各类数据字段的脱敏规则，确保在数据共享（如HR浏览、数据导出）时敏感字段自动脱敏处理。

**方法**：`POST`\
**路径**：`/security/desensitization/config`

**请求示例**：

    {
      "admin_id": 1,
      "rules": [
        {
          "field": "real_name",
          "strategy": "partial_mask",  // partial_mask | full_mask | hash | none
          "mask_pattern": "X${last_char}",  // 如 "李明" → "XM"
          "apply_to": ["hr_browse", "data_export"]
        },
        {
          "field": "id_number",
          "strategy": "full_mask",
          "apply_to": ["all"]
        },
        {
          "field": "gpa",
          "strategy": "level_label",  // 转为等级标签 优秀/良好/中等/合格
          "apply_to": ["hr_browse"]
        }
      ]
    }

**响应示例**：

    {
      "code": 200,
      "msg": "脱敏配置已更新",
      "data": {
        "updated_rules": 3,
        "effective_at": "2025-03-01 12:00:00"
      }
    }

### 14.2 加密存储验证接口

**功能说明**：验证关键字段是否已采用 SM4
国产对称加密算法进行存储保护。仅供管理员和安全审计使用。

**方法**：`GET`\
**路径**：`/security/encryption/status`

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "encryption_algorithm": "SM4-CBC",
        "key_management": "国产密钥管理系统（KMS）",
        "encrypted_fields": [
          {"field": "password", "status": "SM3哈希（加盐）"},
          {"field": "id_number", "status": "SM4-CBC加密"},
          {"field": "phone", "status": "SM4-CBC加密"},
          {"field": "assessment_raw_data", "status": "SM4-CBC加密"}
        ],
        "last_audit_at": "2025-03-01 00:00:00"
      }
    }

### 14.3 用户隐私授权管理

**功能说明**：学生管理自己数据的授权范围，明确控制哪些数据可被HR查看、哪些数据用于平台算法优化、是否允许数据用于研究目的。

**方法**：`PUT`\
**路径**：`/security/privacy/consent`

**请求示例**：

    {
      "user_id": 10001,
      "consents": {
        "resume_visible_to_hr": true,        // 简历是否对HR可见（匿名）
        "allow_hr_contact": true,            // 允许HR发起评估邀请
        "allow_algorithm_optimization": true, // 允许数据用于平台算法优化
        "allow_research": false,             // 是否允许用于学术研究（脱敏后）
        "data_retention_years": 3           // 数据保留年限（1/3/5年）
      }
    }

**响应示例**：

    {
      "code": 200,
      "msg": "隐私设置已更新",
      "data": {
        "user_id": 10001,
        "consents_updated": true,
        "effective_at": "2025-03-01 14:00:00",
        "next_review_reminder": "2026-03-01"  // 提醒用户年度复核授权设置
      }
    }

### 14.4 数据访问日志查询

**功能说明**：学生可查看自己数据被访问的记录（谁、在什么时候、访问了什么数据），保障数据透明度。

**方法**：`GET`\
**路径**：`/security/access-log`

**请求参数（Query）**：

  -----------------------------------------------------------------------
  参数名            类型              必填              说明
  ----------------- ----------------- ----------------- -----------------
  user_id           number            是                用户ID

  page              number            否                默认1

  size              number            否                默认20
  -----------------------------------------------------------------------

**响应示例**：

    {
      "code": 200,
      "msg": "success",
      "data": {
        "total": 8,
        "list": [
          {
            "log_id": "log_001",
            "accessor_type": "hr",  // hr | system | admin | self
            "accessor_label": "某AI科技公司HR（匿名）",
            "data_accessed": "简历摘要（脱敏）",
            "access_time": "2025-03-10 15:03:22",
            "purpose": "招聘评估"
          },
          {
            "log_id": "log_002",
            "accessor_type": "system",
            "accessor_label": "平台推荐算法",
            "data_accessed": "能力画像向量",
            "access_time": "2025-03-11 09:00:00",
            "purpose": "岗位语义匹配计算"
          }
        ]
      }
    }

## 附录更新

### 附录B（更新）：AI模型说明

#### B.1 使用的AI模型（更新版）

本系统使用以下AI模型：

  --------------------------------------------------------------------------
  模块                                模型/技术
  ----------------------------------- --------------------------------------
  岗位画像生成                        Qwen3-max  

  学生能力画像生成                    Qwen3-max

  简历解析                            专用NLP模型 + Qwen

  人岗匹配（语义）                    BGE-M3向量模型 + ChromaDB / Milvus

  人岗匹配（融合）                    语义相似度 × 0.6 + 字段匹配 × 0.4

  智能体对话                         Qwen3-max（ReAct模式，支持工具调用）

  模拟面试评估                        Qwen3-max + 自研评分模型

  职业规划报告生成                    Qwen3-max（长文本，流式）

  知识库RAG                           text-embedding-v4 + Qwen3-max（RAG增强）
  --------------------------------------------------------------------------

#### B.2 智能体工具集（Tool Use）

智能体模块注册了以下内部工具，Agent 在对话中可自主选择调用：

  -----------------------------------------------------------------------
  工具名                              说明
  ----------------------------------- -----------------------------------
  `get_student_profile`               获取用户能力画像

  `get_job_profile`                   获取目标岗位画像

  `compute_skill_gap`                 计算技能差距

  `get_matched_jobs`                  获取推荐岗位列表

  `search_knowledge_base`             检索职业知识库（RAG）

  `get_tracking_history`              获取求职跟踪历史

  `get_mock_interview_history`        获取历史面试记录与评分趋势

  `update_career_plan`                更新/写入职业规划报告

  `get_academic_portrait`             获取学业画像（教务数据）
  -----------------------------------------------------------------------

### 附录D：前端展示要求说明（新增）

#### D.1 智能体对话界面（Module 10）

-   采用**左右分栏**布局：左侧"Agent思考过程"面板（可折叠），右侧对话气泡区
-   思考链实时滚动展示，工具调用以卡片形式呈现（图标+工具名+状态指示灯）
-   对话顶部展示当前任务进度条（子任务列表，已完成项打✓）
-   流式输出使用打字机效果
-   区别于普通聊天的视觉设计，突出"AI在思考/规划"的智能体感

#### D.2 规划落地跟踪看板（Module 11）

-   求职进度以**时间线（Timeline）**形式展示每个岗位的各阶段状态
-   总览页面提供**漏斗图**：投递→笔试→面试→Offer各阶段转化率
-   失败分析报告以**对比雷达图**展示：当前能力 vs 岗位要求
-   提供"添加进展"快捷操作按钮，支持移动端操作

#### D.3 模拟面试界面（Module 12）

-   沉浸式**面试间**设计：顶部显示AI面试官信息与计时器，中部为对话区，底部为文字输入框
-   实时评分以**浮动评分卡**展示（每轮作答后从右侧滑入）
-   历史记录页面提供**折线图**展示历次综合分数趋势

#### D.4 HR评估界面（Module 13）

-   HR端独立入口，风格偏商务简洁
-   学生简历浏览页采用**卡片流**布局，支持筛选与排序
-   评估表单采用**滑块+标签**组合的评分方式，提升填写体验

### 版本历史（更新）

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  版本                    日期                    变更内容
  ----------------------- ----------------------- ---------------------------------------------------------------------------------------------------------------
  v1.0                    2025-02-14              初始版本，完整API设计（模块1-9）

  v2.0                    2025-03-01              新增模块10-16：智能体对话、规划落地跟踪、模拟面试、企业HR评估、向量语义匹配、教务数据接入、数据安全与隐私保护
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------

---

## 附录A：数据结构说明

### A.1 能力维度权重配置


不同岗位的能力维度权重不同，以下为参考配置：

```json
{
  "算法工程师": {
    "基础要求": 0.15,
    "专业技能": 0.4,
    "职业素养": 0.3,
    "发展潜力": 0.15
  },
  "产品经理": {
    "基础要求": 0.1,
    "专业技能": 0.3,
    "职业素养": 0.45,
    "发展潜力": 0.15
  }
}
```


### A.2 技能等级定义

等级

说明

代码标识

了解

知道基本概念，看过相关资料

understand

熟悉

能够在指导下使用，有初步实践

familiar

熟练

能够独立完成任务，解决常见问题

proficient

精通

能够解决复杂问题，指导他人

expert


### A.3 匹配度等级划分

匹配度分数

匹配等级

建议

90-100

高度匹配

强烈推荐申请

80-89

较为匹配

推荐申请

70-79

一般匹配

可以尝试，需提升部分能力

60-69

匹配度较低

需大幅提升能力

<60

不匹配

不推荐


## 附录B：AI模型说明

### B.1 使用的AI模型


本系统使用以下AI模型：

**岗位画像生成**：Claude Sonnet 4 / GPT-4

**学生能力画像生成**：Claude Sonnet 4 / GPT-4

**简历解析**：专用NLP模型 + Claude Sonnet 4

**人岗匹配**：自研匹配算法 + AI辅助

**职业规划报告生成**：Claude Sonnet 4 (长文本生成)

**知识库RAG**：BGE-M3向量模型 + Claude Sonnet 4


### B.2 模型调用示例


详见算法模型开发文档。


## 附录C：错误处理指南

### C.1 常见错误及解决方案

错误代码

错误信息

可能原因

解决方案

400

参数错误

请求参数格式不正确

检查请求体格式和必填字段

401

未授权

Token失效或未登录

重新登录获取Token

404

资源不存在

user_id/job_id不存在

确认ID正确性

500

AI生成失败

模型调用异常

稍后重试或联系技术支持

503

服务暂时不可用

系统维护或负载过高

稍后重试


## 版本历史

版本

日期

变更内容

v1.0

2025-02-14

初始版本，完整API设计


## 联系方式

**技术支持**：

[email protected]

**API问题反馈**：

[email protected]
