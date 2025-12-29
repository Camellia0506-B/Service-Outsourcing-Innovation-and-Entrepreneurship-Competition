### 0. 接口交互通用规范
+ **URL 前缀**: `/api/v1`
+ **请求格式**: `Content-Type: application/json`
+ 统一响应格式 (Response Wrapper):  后端无论成功失败，都返回以下 JSON 结构，前端根据 code 判断业务逻辑。



```json
{
  "code": 200,          // 200: 成功, 400: 客户端参数错误, 500: 服务器错误
  "msg": "success",     // 提示信息，报错时显示错误原因
  "data": { ... }       // 具体数据对象或数组，失败时为 null
}
```

---

### 1. 首页/欢迎页模块 (Dashboard)
#### 1.1 获取首页聚合数据 (Dashboard Summary)
+ **描述**: 获取首页内容，其中ddl_reminders必来自关注的高校，hot_posts必须来自关注的高校
+ **方法**: `GET`
+ **路径**: `/dashboard`
+ **请求参数 (Query Params)**:
    - `user_id`: int (必填，用于标识当前用户)
+ **响应示例**:



```plain
{
  "code": 200,
  "data": {
    "date": "2025-09-10",//今天的日期
    "quote": "星光不问赶路人，时光不负有心人。",
    "bg_image": "/static/daily/0910.jpg",
    "ddl_reminders": [
       {
         "notice_id": 2005,
         "univ_name": "清华大学",
         "dept_name": "计算机系",
         "title": "2025优才夏令营...",
         "days_left": 3,  // 后端计算好剩余天数返回给前端显示更方便
         "end_date": "2025-05-20"
       }
    ], 
    "hot_posts": [
       {
         "post_id": 3001,
         "title": "求问清华计算机面试流程",
         "univ_name": "清华大学", // 必须属于某个关注的高校
         "view_count": 2100
       }
    ] 
  }
}
```

---

### 2. 院校库模块 (University Library)
#### 2.1 获取高校列表 (支持筛选与搜索)
+ **描述**: 核心接口，支持无限下滑（分页），支持多条件筛选。
+ **方法**: `GET`
+ **路径**: `/universities`
+ **请求参数 (Query Params)**:



| **参数名** | **类型** | **必填** | **说明** | **示例** |
| --- | --- | --- | --- | --- |
| `page` | int | 否 | 页码，默认1 | 1 |
| `size` | int | 否 | 每页数量，默认10 | 10 |
| `keyword` | string | 否 | 搜索高校名称 | "交通" |
| `tags` | string | 否 | 院校标签，逗号分隔 | "985,C9" |


+ **响应示例**:

```plain
{
  "code": 200,
  "data": {
    "total": 50,
    "list": [
      {
        "id": 1001,
        "name": "上海交通大学",
        "logo_url": "...",
        "tags": "985,C9,华五",
        "intro": "上海交通大学是..."
      },
      ...
    ]
  }
}
```

---

### 3. 高校详情页 - 招生通知 (Notices)
#### 3.1 获取某高校的通知列表
+ **描述**: 详情页Tab 1，支持按学院、类型、日期筛选。
+ **方法**: `GET`
+ **路径**: `/universities/{id}/notices`
+ **请求参数**:
    - `dept_name`: 学院名 (模糊搜索)
    - `type`: "夏令营" / "预推免"
    - `exam_type`: "机试" / "面试" (支持模糊匹配)
    - `before_date`: "2025-06-30" (筛选此日期前截止的)
+ **响应示例**:



```plain
{
  "code": 200,
  "data": {
    "info": {
      "id": 1001,
      "name": "上海交通大学",
      "logo_url": "...",
      "tags": "985,C9,华五",
      "intro": "上海交通大学是..."
    },
    "notices": [
      {
        "id": 2005,
        "dept_name": "电子信息与电气工程学院",
        "title": "2025电院优才夏令营...",
        "notice_type": "夏令营",
        "exam_type": "机试,面试",
        "end_date": "2025-06-20",
        "status": 1
      }
    ]
  }
}
```

#### 3.2 获取通知详情
+ **方法**: `GET`
+ **路径**: `/notices/{id}`
+ **描述**: 点击卡片查看完整正文或跳转链接。



---

### 4. 高校详情页 - 经验社区 (Forum)
#### 4.1 获取某高校的帖子列表
+ **描述**: 详情页Tab 2，展示该校相关的讨论。
+ **方法**: `GET`
+ **路径**: `/universities/{id}/posts`
+ **响应示例**:



```plain
{
  "code": 200,
  "data": [
    {
      "id": 3001,
      "title": "避雷！某学院机试全是原题",
      "author_nickname": "匿名用户",
      "view_count": 500,
      "reply_count": 12, // 需关联查询评论表数量
      "created_at": "2025-05-12 10:00"
    }
  ]
}
```

#### 4.2 获取帖子详情 (含评论)
+ **方法**: `GET`
+ **路径**: `/posts/{id}`
+ **响应**: 包含帖子主楼内容 + `comments` 数组（楼中楼列表）。



#### 4.3 发布帖子
+ **方法**: `POST`
+ **路径**: `/posts`
+ **请求体 (Body)**:



```plain
{
  "univ_id": 1001,
  "user_id": 5001, 
  "title": "求问复试流程",
  "content": "如题，求学长学姐解答..."
}
```

#### 4.4 发布评论 (回帖)
+ **方法**: `POST`
+ **路径**: `/posts/{id}/comments`
+ **请求体**: `{ "user_id": 5001, "content": "蹲一个" }`



---

### 5. 高校详情页 - 资料共享 (Resources)
#### 5.1 获取资料列表
+ **方法**: `GET`
+ **路径**: `/universities/{id}/resources`
+ **响应**: 返回文件列表，含下载链接 `file_url`。



#### 5.2 上传资料 (模拟)
+ **描述**: 实际项目中需要处理文件流，为了简化，可以让文件传到图床或对象存储，这里只保存元数据。
+ **方法**: `POST`
+ **路径**: `/resources`
+ **请求体**:



```plain
{
  "univ_id": 1001,
  "user_id": 5001,
  "file_name": "2024真题.pdf",
  "file_url": "http://oss.aliyun.../file.pdf",
  "file_size": "2MB"
}
```

---

### 6. 关注管理 (Follows)
#### 6.1 获取我的关注列表
+ **方法**: `GET`
+ **路径**: `/user/follows`
+ **请求参数**:
    - `user_id`: int (必填)
+ **响应**:

```plain
{
  "code": 200,
  "data": [
    { 
      "id": 7001,       // 关注记录的唯一ID，删除时用
      "univ_id": 1001, 
      "univ_name": "清华大学", 
      "dept_name": "计算机系" 
    },
    { 
      "id": 7002, 
      "univ_id": 1002, 
      "univ_name": "复旦大学", 
      "dept_name": "软件学院" 
    }
  ]
}
```

#### 6.2 添加关注
+ **方法**: `POST`
+ **路径**: `/user/follows`
+ **请求体**:



```plain
{ 
  "user_id": 5001,     // 必须传，知道是谁关注的
  "univ_id": 1001, 
  "univ_name": "清华大学", // 前端直接传过来存进去，省得后端再查
  "dept_name": "计算机系" 
}
```

#### 6.3 取消关注
+ **方法**: `DELETE`
+ **路径**: `/user/follows/{id}`
+ **说明**: 这里的 `{id}` 是 **6.1接口** 返回的那个 `id` (例如 7001)，即关注记录的主键，而不是 user_id 或 univ_id。
+ **示例**: `DELETE /api/v1/user/follows/7001`
+ **响应**:



```plain
{
  "code": 200, 
  "msg": "已取消关注"
}
```

#### 6.4 获取关注列表
+ **方法**: GET
+ **路径**: `<font style="color:rgb(0, 0, 0);">/univ-list</font>`
+ **响应**:

```plain
{
  "code": 200,
  "data": [
    {
      "id": 1001,
      "name": "上海交通大学",
    },
    {
      "id": 1002,
      "name": "清华大学",
    }
  ]
}
```

### 7. 个人中心模块 (User Center)
#### 7.1 获取用户个人详情与统计
+ **场景**: 进入“个人中心”页面时，渲染头部卡片（头像、昵称、账号）以及三个统计数字（关注数、帖子数、资料数）。
+ **方法**: `GET`
+ **路径**: `/user/profile`
+ **请求参数**:
    - `user_id`: int (必填)
+ **响应示例**:



```plain
{
  "code": 200,
  "data": {
    "user_info": {
      "id": 5001,
      "username": "student_01",       // 对应UI上的 @student_01
      "nickname": "User_001",         // 对应UI上的大字昵称
      "avatar": "/static/avatar1.png"
    },
    "stats": {
      "follow_count": 2,    // 关注院校数量 (查询 user_follows 表)
      "post_count": 1,      // 发布帖子数量 (查询 forum_posts 表)
      "resource_count": 1   // 分享资料数量 (查询 shared_resources 表)
    }
  }
}
```

#### 7.2 更新个人资料
+ **场景**: 点击昵称旁的“编辑”按钮，修改头像或昵称。
+ **方法**: `PUT`
+ **路径**: `/user/profile`
+ **请求体**:



```plain
{
  "user_id": 5001,
  "nickname": "保研锦鲤",          // 可选
  "avatar": "http://oss.../new.jpg" // 可选，大作业可直接传图片URL字符串
}
```

+ **响应**: `{ "code": 200, "msg": "更新成功" }`

#### 7.3 获取我的帖子列表
+ **场景**: 个人中心 -> “我的帖子” Tab。
+ **方法**: `GET`
+ **路径**: `/user/posts`
+ **请求参数**:
    - `user_id`: int (必填)
+ **响应示例**:



```plain
{
  "code": 200,
  "data": [
    {
      "id": 3005,
      "title": "浙大软院夏令营记录",
      "intro": "记录一下这几天的夏令营经历，希望能帮到学弟学妹。",
      "view_count": 56,
      "reply_count": 2,
      "created_at": "2025/12/28"
    }
  ]
}
```

#### 7.4 获取我的资料列表
+ **场景**: 个人中心 -> “我的资料” Tab。
+ **方法**: `GET`
+ **路径**: `/user/resources`
+ **请求参数**:
    - `user_id`: int (必填)
+ **响应示例**:

```plain
{
  "code": 200,
  "data": [
    {
      "id": 6002,
      "file_name": "浙大机试真题.pdf",
      "file_size": "5MB",
      "created_at": "2025-06-01"
    }
  ]
}
```

---

### 8. 身份认证模块 (Authentication)
#### 8.1 用户注册
+ **描述**: 新用户注册账号。
+ **方法**: `POST`
+ **路径**: `/auth/register`
+ **请求体**:



```plain
{
  "username": "student_02",  // 必填，需唯一
  "password": "password123", // 必填
  "nickname": "新晋保研人"    // 可选，默认值可由后端生成
}
```

+ **响应**:

```plain
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "id": 5002,           // 注册成功后直接返回ID，前端可直接自动登录
    "username": "student_02",
    "nickname": "新晋保研人"
  }
}
```

#### 8.2 用户登录
+ **描述**: 用户输入账号密码进行登录。这是前端获取 `user_id` 的**唯一合法途径**。
+ **方法**: `POST`
+ **路径**: `/auth/login`
+ **请求体**:



```plain
{
  "username": "student_01",
  "password": "password123"
}
```

+ **响应**:



```plain
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "id": 5001,               // 前端拿到后需要存入浏览器 localStorage
    "username": "student_01",
    "nickname": "User_001",
    "avatar": "/static/avatar1.png",
    "token": "mock_token_xyz" // (可选)
  }
}
```

#### 8.3 退出登录 (Logout)
+ **方法**: `POST`
+ **路径**: `/auth/logout`
+ **响应**: `{ "code": 200, "msg": "已退出" }`



---

### 9. AI 智囊团 (AI Lab)
#### 9.1 文书优化 (AI Review)
+ **描述**: 发送文本，返回优化建议。
+ **方法**: `POST`
+ **路径**: `/ai/optimize`
+ **请求体**:

```plain
{
  "type": "CV", // 或 PS, Email
  "content": "本人就读于..." // 用户输入的原始文本
}
```

+ **响应示例**:

```plain
{
  "code": 200,
  "data": {
    "suggestion": "建议增加量化数据...", // AI 分析
    "optimized_content": "本人就读于XX大学，排名前5%..." // AI 改写
  }
}
```

#### 9.2 择校定位 (AI Positioning)
+ **描述**: 根据用户画像推荐学校。
+ **方法**: `POST`
+ **路径**: `/ai/positioning`
+ **请求体**:

```plain
{
  "undergraduate_uni": "武汉理工大学",
  "gpa_rank": "3/100",
  "english": "CET6 600",
  "paper": "一篇SCI二区",
  "awards": "ACM银牌"
}
```

+ **响应示例**:

```plain
{
  "code": 200,
  "data": {
    "analysis": "你的科研能力很强，英语是优势...",
    "dream_school": [ {"name": "清华大学", "id": 1001} ],
    "match_school": [ {"name": "南京大学", "id": 1002} ],
    "safety_school": [ {"name": "中南大学", "id": 1005} ]
  }
}
```

