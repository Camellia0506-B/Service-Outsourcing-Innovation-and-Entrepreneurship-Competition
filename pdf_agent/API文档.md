# PDF 文档阅读智能体 API 文档

## 概述

本 API 提供 PDF 文档阅读智能体功能，支持上传 PDF 文件并通过对话方式获取文档内容分析。

**基础信息：**

- 服务地址：`http://localhost:8000`（默认端口，可通过环境变量配置）
- API 前缀：`/api/v1`
- 请求格式：支持 `application/json` 和 `multipart/form-data`
- 响应格式：统一 JSON 格式

## 统一响应格式

所有接口统一返回以下 JSON 结构：

```json
{
  "code": 200,          // 200: 成功, 400: 客户端参数错误, 500: 服务器错误
  "msg": "success",     // 提示信息，报错时显示错误原因
  "data": { ... }       // 具体数据对象，失败时为 null
}
```

---

## 接口列表

### 1. 健康检查

**接口说明：** 检查服务是否正常运行

- **方法：** `GET`
- **路径：** `/`
- **请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "msg": "PDF 文档阅读智能体服务运行正常"
}
```

---

### 2. 上传 PDF 文件

**接口说明：** 上传 PDF 文件并初始化智能体会话

- **方法：** `POST`
- **路径：** `/api/v1/pdf/upload`
- **Content-Type：** `multipart/form-data`

**请求参数：**

| 参数名     | 类型   | 必填 | 说明                                              |
| ---------- | ------ | ---- | ------------------------------------------------- |
| file       | file   | 是   | PDF 文件                                          |
| session_id | string | 否   | 会话 ID，用于多轮对话。如果不提供，系统会自动生成 |

**请求示例（使用 curl）：**

```bash
curl -X POST "http://localhost:8000/api/v1/pdf/upload" \
  -F "file=@document.pdf" \
  -F "session_id=optional-session-id"
```

**请求示例（使用 JavaScript FormData）：**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("session_id", "optional-session-id"); // 可选

fetch("http://localhost:8000/api/v1/pdf/upload", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

**响应示例（成功）：**

```json
{
  "code": 200,
  "msg": "PDF 上传成功",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "page_count": 5,
    "filename": "document.pdf"
  }
}
```

**响应示例（失败）：**

```json
{
  "code": 400,
  "msg": "文件类型错误，仅支持 PDF 格式",
  "data": null
}
```

**错误码说明：**

- `400`：文件类型错误、文件处理失败
- `500`：服务器内部错误

---

### 3. 与 PDF 对话

**接口说明：** 向已上传的 PDF 文档提问，获取智能回答

- **方法：** `POST`
- **路径：** `/api/v1/pdf/chat`
- **Content-Type：** `application/json`

**请求参数：**

| 参数名     | 类型   | 必填 | 说明                      |
| ---------- | ------ | ---- | ------------------------- |
| question   | string | 是   | 用户问题                  |
| session_id | string | 是   | 会话 ID（从上传接口获取） |

**请求示例：**

```json
{
  "question": "这个文档的主要内容是什么？",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**请求示例（使用 JavaScript）：**

```javascript
fetch("http://localhost:8000/api/v1/pdf/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    question: "这个文档的主要内容是什么？",
    session_id: "550e8400-e29b-41d4-a716-446655440000",
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

**响应示例（成功）：**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "answer": "这个文档主要介绍了人工智能的发展历程和应用场景。文档分为三个部分：第一部分介绍了AI的历史背景，第二部分讨论了当前的技术应用，第三部分展望了未来发展趋势。",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**响应示例（失败）：**

```json
{
  "code": 400,
  "msg": "会话不存在或已过期，请重新上传 PDF 文件",
  "data": null
}
```

**错误码说明：**

- `400`：问题为空、session_id 为空、会话不存在或已过期
- `500`：服务器内部错误、API 调用失败

**注意事项：**

- 会话数据存储在内存中，服务重启后会丢失
- 对于多页 PDF（超过 10 页），系统会自动处理前 10 页
- 支持多轮对话，系统会记住对话历史

---

### 4. 清除会话

**接口说明：** 清除指定会话的数据，释放内存

- **方法：** `POST`
- **路径：** `/api/v1/pdf/clear`
- **Content-Type：** `multipart/form-data` 或 `application/json`

**请求参数：**

| 参数名     | 类型   | 必填 | 说明    |
| ---------- | ------ | ---- | ------- |
| session_id | string | 是   | 会话 ID |

**请求示例（multipart/form-data）：**

```bash
curl -X POST "http://localhost:8000/api/v1/pdf/clear" \
  -F "session_id=550e8400-e29b-41d4-a716-446655440000"
```

**请求示例（application/json）：**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例：**

```json
{
  "code": 200,
  "msg": "会话已清除",
  "data": null
}
```

---

## 使用流程

### 典型使用流程

1. **上传 PDF 文件**

   ```bash
   POST /api/v1/pdf/upload
   ```

   获取 `session_id`

2. **与 PDF 对话**

   ```bash
   POST /api/v1/pdf/chat
   ```

   使用 `session_id` 和问题，获取回答

3. **继续对话**（可选）
   使用相同的 `session_id` 继续提问，系统会记住对话历史

4. **清除会话**（可选）
   ```bash
   POST /api/v1/pdf/clear
   ```
   释放内存资源

### 前端集成示例

```javascript
// 1. 上传 PDF
async function uploadPDF(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:8000/api/v1/pdf/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (result.code === 200) {
    return result.data.session_id;
  } else {
    throw new Error(result.msg);
  }
}

// 2. 提问
async function askQuestion(sessionId, question) {
  const response = await fetch("http://localhost:8000/api/v1/pdf/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      question: question,
    }),
  });

  const result = await response.json();
  if (result.code === 200) {
    return result.data.answer;
  } else {
    throw new Error(result.msg);
  }
}

// 使用示例
const fileInput = document.querySelector("#pdf-input");
const questionInput = document.querySelector("#question-input");
const submitBtn = document.querySelector("#submit-btn");

let currentSessionId = null;

// 上传 PDF
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      currentSessionId = await uploadPDF(file);
      console.log("PDF 上传成功，session_id:", currentSessionId);
    } catch (error) {
      console.error("上传失败:", error);
    }
  }
});

// 提问
submitBtn.addEventListener("click", async () => {
  if (!currentSessionId) {
    alert("请先上传 PDF 文件");
    return;
  }

  const question = questionInput.value;
  if (!question) {
    alert("请输入问题");
    return;
  }

  try {
    const answer = await askQuestion(currentSessionId, question);
    console.log("回答:", answer);
    // 显示回答到页面
  } catch (error) {
    console.error("提问失败:", error);
  }
});
```

---

## 错误处理

### 常见错误

1. **文件类型错误**

   - 错误码：`400`
   - 原因：上传的文件不是 PDF 格式
   - 解决：确保上传 `.pdf` 文件

2. **会话不存在**

   - 错误码：`400`
   - 原因：`session_id` 无效或会话已过期
   - 解决：重新上传 PDF 文件获取新的 `session_id`

3. **API Key 未设置**

   - 错误码：`500`
   - 原因：环境变量 `ARK_API_KEY` 未设置
   - 解决：设置正确的 API Key

4. **PDF 处理失败**
   - 错误码：`400`
   - 原因：PDF 文件损坏或无法读取
   - 解决：检查 PDF 文件是否完整

---

## 技术说明

### 模型信息

- 使用模型：`doubao-seed-1.6`（通过 doubao-seed-1-6-251015 接入点）
- 推理模式：`reasoning_effort="medium"`
- 支持多模态：图像 + 文本

### 性能限制

- 单次对话最多处理 10 页 PDF（避免 token 过多）
- 会话数据存储在内存中，服务重启后丢失
- 建议在生产环境中使用 Redis 等持久化存储

### 安全建议

- 生产环境应配置 CORS 白名单
- 建议添加文件大小限制
- 建议添加请求频率限制
- API Key 应通过环境变量管理，不要硬编码

---

## 更新日志

### v1.0.0 (2025-01-XX)

- 初始版本
- 支持 PDF 上传和对话功能
- 集成 doubao-seed-1.6 API
