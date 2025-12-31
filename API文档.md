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

* **方法**: `POST`
* **路径**: `/dashboard`
* **请求示例**:

```json
{
  "user_id": 5001
}
```

* **响应示例**:

```json
{
  "code": 200,
  "data": {
    "quote": "星光不问赶路人，时光不负有心人。",
    "bg_image": "/static/daily/0910.jpg",
    "ddl_reminders": [
      {
        "notice_id": 2005,
        "univ_name": "清华大学",
        "dept_name": "计算机系",
        "title": "2025优才夏令营...",
        "source_link": "www.baidu.com",
        "end_date": "2025-05-20"
      },
      {
        "notice_id": 2006,
        "univ_name": "复旦大学",
        "dept_name": "电子工程系",
        "title": "2025暑期实习计划...",
        "source_link": "www.baidu.com",
        "end_date": "2025-06-15"
      }
    ],
    "hot_posts": [
      {
        "post_id": 3001,
        "title": "求问清华计算机面试流程",
        "univ_name": "清华大学",
        "view_count": 2100,
        "username": "zzr"
      },
      {
        "post_id": 3002,
        "title": "复旦大学暑期实习申请经验",
        "univ_name": "复旦大学",
        "view_count": 1800,
        "username": "abc123"
      }
    ]
  }
}
```


---

### 2. 院校库模块 (University Library)
#### 2.1 获取高校列表 (支持筛选与搜索)
+ **方法**: `POST`
+ **路径**: `/universities`
+ **请求示例**:

```json
{
  "page": 1,
  "size": 10,
  "keyword": "交通",
  "tags": "985,C9,211,华五,清北,双一流,双非,港校" //这个是一个字符串用逗号分隔
}
```

+ **响应示例**:

```json
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
      {
        "id": 1002,
        "name": "复旦大学",
        "logo_url": "...",
        "tags": "985,C9",
        "intro": "复旦大学是..."
      },
      ...
    ]
  }
}
```

### 3. 高校详情页 - 招生通知 (Notices)
#### 3.1 获取某高校的通知列表
+ **方法**: `POST`
+ **路径**: `/universities/notices`
+ **请求参数**:

```json
{
  "univ_id": 1001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 2005,
      "dept_name": "电子信息与电气工程学院",
      "title": "2025电院优才夏令营...",
      "notice_type": "夏令营",
      "exam_type": "机试/面试",
      "end_date": "2025-06-20",
      "source_link": "www.baidu.com"
    }
  ]
}

```

#### 3.2 获取某一个高校详情
+ **方法**: `POST`
+ **路径**: `/universities/info`
+ **请求参数**:

```json
{
  "univ_id": 1001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": {
    "id": 1001,
    "name": "上海交通大学",
    "logo_url": "...",
    "tags": [
      "985",
      "C9",
      "华五"
    ],
    "intro": "上海交通大学是..."
  }
}

```

---

### 4. 高校详情页 - 经验社区 (Forum)
#### 4.1 获取帖子列表
+ **方法**: `POST`
+ **路径**: `/universities/posts`
+ **请求示例:**

```json
{
  "univ_id": 1001, //可以为空或者不传。前端需要获取univ_id的话从高校list中获得
  "keyword": "笔试题" // 会搜索title和content
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 3001,
      "title": "避雷！某学院机试全是原题",
      "author_nickname": "匿名用户",
      "view_count": 500,
      "reply_count": 12, 
      "created_at": "2025-05-12 10:00",
      "content": "zheshi",
    }
  ]
}
```

#### 4.2 获取帖子详情 (含评论)
+ **方法**: `POST`
+ **路径**: `/posts/detail`
+ **请求示例:**

```json
{
  "post_id": 1001 
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": {
    "post": {
      "id": 3001,
      "title": "上交电院夏令营避雷指南",
      "author_nickname": "保研汪汪队",
      "view_count": 1024,
      "reply_count": 12,
      "created_at": "2025-07-01 10:00:00",
      "content": "今年机试太难了... \n我写了这篇帖子，希望大家能在夏令营中避开这些常见的坑。请各位小伙伴参考下，做好准备！"
    },
    "comments": [
      {
        "content": "感谢楼主分享！这篇帖子很有帮助，我现在才明白当时机试的题怎么这么难。",
        "created_at": "2025-07-01 10:05:00",
        "user_nickname": "学霸小明",
        "user_avatar": "/static/avatar2.png"
      },
      {
        "content": "哈哈，原来是有套路的。夏令营前的准备工作真是太重要了！",
        "created_at": "2025-07-01 10:15:00",
        "user_nickname": "留学小张",
        "user_avatar": "/static/avatar3.png"
      }
    ]
  }
}

```



#### 4.3 发布帖子
+ **方法**: `POST`
+ **路径**: `/posts/new`
+ **请求体 (Body)**:

```json
{
  "univ_id": 1001, //为空或者不传代表不归属于任何大学
  "user_id": 5001, 
  "title": "求问复试流程",
  "content": "如题，求学长学姐解答..."
}
```

#### 4.4 发布评论（回帖）
+ **方法**: `POST`
+ **路径**: `/posts/comments`
+ **请求示例**:

```json
{
  "post_id": 3001,
  "user_id": 5001,
  "content": "蹲一个"
}
```

+ **响应示例：**

```json
{
  "code": 200,
  "message": "评论发布成功"
}
```
---

### 5. 高校详情页 - 资料共享 (Resources)
#### 5.1 获取资料列表
+ **方法**: `POST`
+ **路径**: `/resources`
+ **请求示例**:

```json
{
  "univ_id": 1001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": [
      {
        "user_name": "student_01",
        "file_name": "2024真题.pdf",
        "file_url": "http://oss.aliyun.../file.pdf",
        "file_size": "2MB",
        "upload_time": "2025-06-01 14:00:00"
      },
      {
        "user_name": "student_02",
        "file_name": "2024模拟题.pdf",
        "file_url": "http://oss.aliyun.../file2.pdf",
        "file_size": "3MB",
        "upload_time": "2025-06-02 10:30:00"
      }
    ]
}
```

#### 5.2 上传资料
+ **方法**: `POST`
+ **路径**: `/resources`
+ **请求示例**

注意，这边不是放在json里面。上传文件，其他参数如大学 ID 和用户 ID 放在 multipart/form-data 请求体中，文件内容作为二进制数据上传。

| 参数名      | 类型     | 必填 | 说明    |
| -------- | ------ | -- | ----- |
| univ\_id | number | 是  | 大学 ID |
| user\_id | number | 是  | 用户 ID |
| file     | file   | 是  | 上传的文件 |


+ **响应示例**:

```json
{
  "code": 200,
  "message": "资料上传成功"
}
```

### 6. 关注管理 (Follows)
#### 6.1 获取我的关注列表
+ **方法**: `POST`
+ **路径**: `/user/follows`
+ **请求示例**:

```json
{
  "user_id": 5001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": [
    { 
      "id": 7001, //注意这个id是关注关系的id，不是大学的id
      "univ_id": 1001, //这个是大学的id
      "univ_name": "清华大学"
    },
    { 
      "id": 7002,
      "univ_id": 1001, //这个是大学的id
      "univ_name": "复旦大学"
    }
  ]
}
```

#### 6.2 添加关注
+ **方法**: `POST`
+ **路径**: `/user/follows`
+ **请求示例**:

```json
{
  "user_id": 5001,
  "univ_id": 1001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "msg": "关注成功"
}
```

#### 6.3 取消关注
+ **方法**: `DELETE`
+ **路径**: `/user/follows`
+ **请求体**:

```json
{
  "id": 7001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "msg": "已取消关注"
}
```

### 7 用户主页
#### 7.1 获取用户信息
+ **方法**: `POST`
+ **路径**: `/user/info`
+ **请求示例**:

```json
{
  "user_id": 5001
}
```

+ **响应示例**:

```json
{
  "code": 200,
  "data": {
    "user_info": {
      "id": 5001,
      "username": "student_01",
      "nickname": "User_001",
      "avatar": "url"
    },
    "stats": {
      "follow_count": 2,
      "post_count": 1,
      "resource_count": 1
    }
  }
}
```

---

#### 7.2 更新个人资料
+ **方法**: `PUT`
+ **路径**: `/user/profile`
+ **请求示例**:

和上面一样，只要涉及到文件上传，就用multipart/form-data


| 参数名      | 类型     | 必填 | 说明        |
| -------- | ------ | -- | --------- |
| user\_id | number | 是  | 用户 ID     |
| nickname | string | 是  | 用户昵称      |
| avatar   | file   | 否  | 用户头像，图片文件 |


+ **响应示例**:

```json
{
  "code": 200,
  "msg": "更新成功"
}
```

---

#### 7.3 获取我的帖子列表
+ **方法**: `POST`
+ **路径**: `/user/posts`
+ **请求示例**:

```json
{
  "user_id": 5001
}
```

+ **响应示例**:

```json
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

---

#### 7.4 获取我的资料列表
+ **方法**: `POST`
+ **路径**: `/user/resources`
+ **请求示例**:

```json
{
  "user_id": 5001
}
```

+ **响应示例**:

```json
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

### 8. 身份认证模块
#### 8.1 用户注册
+ **描述**: 新用户注册账号。
+ **方法**: `POST`
+ **路径**: `/auth/register`
+ **请求体**:

使用 multipart/form-data 请求体

| 参数名      | 类型     | 必填 | 说明                                |
| -------- | ------ | -- | --------------------------------- |
| username | string | 是  | 用户 ID（全局唯一，类似于微信号）                |
| password | string | 是  | 用户密码                              |
| nickname | string | 是  | 用户昵称（可以重复）                        |
| avatar   | file   | 否  | 用户头像，图片文件，可以为空，作为文件上传，不能作为 URL 传递 |


+ **响应**:

```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "id": 5002,
    "username": "student_02",
    "nickname": "新晋保研人"
  }
}
```

#### 8.2 用户登录
+ **描述**: 用户输入账号密码进行登录。这是前端获取 `user_id` 的**唯一合法途径**。
+ **方法**: `POST`
+ **路径**: `/auth/login`
+ **请求体**

```json
{
  "username": "student_01",
  "password": "password123"
}
```

+ **响应**:

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "id": 5001, 
    "username": "student_01",
    "nickname": "User_001",
    "avatar": "/static/avatar1.png",
  }
}
```

