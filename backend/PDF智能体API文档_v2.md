# PDF 文档阅读智能体 API 文档 v2

## 接口交互通用规范

- **URL 前缀**: `/api/v1`
- **请求格式**: `Content-Type: application/json` 或 `multipart/form-data`（上传文件时）
- **响应格式**:
  - 非流式接口：返回标准 JSON 结构
  - 流式接口：返回 Server-Sent Events (SSE) 格式

### 标准 JSON 响应格式

```json
{
  "code": 200,          // 200: 成功, 400: 客户端参数错误, 500: 服务器错误
  "msg": "success",     // 提示信息，报错时显示错误原因
  "data": { ... }       // 具体数据对象或数组，失败时为 null
}
```

---

## 1. 上传 PDF 文件

### 接口说明

上传 PDF 文件并初始化智能体会话，支持多轮对话。会话数据存储在内存中，系统会自动将 PDF 转换为图像格式进行处理。

- **方法**: `POST`
- **路径**: `/pdf/upload`
- **Content-Type**: `multipart/form-data`

### 请求参数

| 参数名     | 类型   | 必填 | 说明                                                   |
| ---------- | ------ | ---- | ------------------------------------------------------ |
| file       | file   | 是   | PDF 文件（仅支持 .pdf 格式）                           |
| session_id | string | 否   | 会话 ID，用于多轮对话。如果不提供，系统会自动生成 UUID |

### 请求示例

**使用 FormData（推荐）：**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("session_id", "optional-session-id"); // 可选

fetch("http://localhost:8080/api/v1/pdf/upload", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### 响应示例

**成功响应：**

```json
{
  "code": 200,
  "msg": "PDF 上传成功",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "page_count": 15,
    "filename": "研究生招生简章.pdf"
  }
}
```

**失败响应 - 文件为空：**

```json
{
  "code": 400,
  "msg": "文件不能为空",
  "data": null
}
```

**失败响应 - 文件类型错误：**

```json
{
  "code": 400,
  "msg": "文件类型错误，仅支持 PDF 格式",
  "data": null
}
```

### 注意事项

- 文件大小限制由服务器配置决定
- PDF 文件会被转换为图像格式存储在内存中
- 会话数据在服务器重启后会丢失
- session_id 用于后续对话，请妥善保存

---

## 2. 与 PDF 对话（常规模式）

### 接口说明

向已上传的 PDF 文档提问，获取完整智能回答。支持多轮对话，系统会记住对话历史。对于超过 10 页的 PDF，系统会自动处理前 10 页。

- **方法**: `POST`
- **路径**: `/pdf/chat`
- **Content-Type**: `application/json`
- **响应格式**: 标准 JSON 格式

### 请求参数

| 参数名     | 类型   | 必填 | 说明                             |
| ---------- | ------ | ---- | -------------------------------- |
| question   | string | 是   | 用户问题（不能为空或仅包含空格） |
| session_id | string | 是   | 会话 ID（从上传接口获取）        |

### 请求示例

```json
{
  "question": "这份文档的主要内容是什么？",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 响应示例

**成功响应：**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "answer": "这份文档是关于2025年研究生招生的重要信息汇总...",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**失败响应 - 会话不存在：**

```json
{
  "code": 400,
  "msg": "会话不存在或已过期，请重新上传 PDF 文件",
  "data": null
}
```

**失败响应 - 参数为空：**

```json
{
  "code": 400,
  "msg": "问题不能为空",
  "data": null
}
```

### JavaScript 示例

```javascript
async function chatWithPdf() {
  const response = await fetch("http://localhost:8080/api/v1/pdf/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "这份文档的主要内容是什么？",
      session_id: "550e8400-e29b-41d4-a716-446655440000",
    }),
  });

  const data = await response.json();
  console.log(data.data.answer);
}
```

---

## 3. 与 PDF 对话（流式模式 - 逐 Token 返回）

### 接口说明

向已上传的 PDF 文档提问，使用 Server-Sent Events (SSE) 实时流式返回回答内容，逐 token 推送。适合需要实时显示 AI 回答过程的场景，提供更好的用户体验。

- **方法**: `POST`
- **路径**: `/pdf/chat/stream`
- **Content-Type**: `application/json`
- **响应格式**: `text/event-stream` (SSE)

### 请求参数

与常规对话接口相同：

| 参数名     | 类型   | 必填 | 说明                             |
| ---------- | ------ | ---- | -------------------------------- |
| question   | string | 是   | 用户问题（不能为空或仅包含空格） |
| session_id | string | 是   | 会话 ID（从上传接口获取）        |

### 请求示例

```json
{
  "question": "这份文档的主要内容是什么？",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 响应示例

使用 SSE 格式，每条消息都以 `data: ` 开头，后跟一个 token 内容：

```
data: 这
data: 份
data: 文
data: 档
data: 是
data: 关
data: 于
data: 2025
data: 年
data: 研
data: 究
data: 生
data: 招
data: 生
...
```

### JavaScript 示例（EventSource）

```javascript
function streamChatWithPdf() {
  const eventSource = new EventSource(
    "http://localhost:8080/api/v1/pdf/chat/stream",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "这份文档的主要内容是什么？",
        session_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    }
  );

  let fullAnswer = "";

  eventSource.onmessage = (event) => {
    const token = event.data;
    fullAnswer += token;
    // 实时更新 UI
    document.getElementById("answer").textContent = fullAnswer;
  };

  eventSource.onerror = (error) => {
    console.error("流式对话错误:", error);
    eventSource.close();
  };
}
```

**注意：EventSource 构造函数不支持 POST 请求，上述代码需要使用浏览器原生支持或 polyfill。**

### 推荐：使用 Fetch API with ReadableStream

```javascript
async function streamChatWithPdf() {
  const response = await fetch("http://localhost:8080/api/v1/pdf/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "这份文档的主要内容是什么？",
      session_id: "550e8400-e29b-41d4-a716-446655440000",
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const token = line.substring(6);
        fullAnswer += token;
        // 实时更新 UI
        document.getElementById("answer").textContent = fullAnswer;
      }
    }
  }
}
```

### 优点与使用场景

**优点：**

- ✅ 实时显示 AI 回答过程，用户可以即时看到生成内容
- ✅ 减少等待感，提升用户体验
- ✅ 节省内存，流式处理避免一次性加载完整答案
- ✅ 可以中途停止流传输

**适用场景：**

- 需要实时显示 AI 生成过程的应用
- 长文本生成场景
- 实时交互性要求高的场景

### SSE 响应格式说明

- 每条消息都是一个 token
- 每条消息格式: `data: <token>\n\n`
- 流结束时，服务端会自动关闭连接

---

## 4. 清除会话

### 接口说明

清除指定会话的数据，释放服务器内存。建议在用户完成对话或切换文档时调用此接口。

- **方法**: `POST`
- **路径**: `/pdf/clear`
- **Content-Type**: `application/json`

### 请求参数

| 参数名     | 类型   | 必填 | 说明    |
| ---------- | ------ | ---- | ------- |
| session_id | string | 是   | 会话 ID |

### 请求示例

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 响应示例

**成功响应：**

```json
{
  "code": 200,
  "msg": "会话已清除",
  "data": null
}
```

### JavaScript 示例

```javascript
async function clearSession(sessionId) {
  const response = await fetch("http://localhost:8080/api/v1/pdf/clear", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });

  const data = await response.json();
  console.log(data.msg);
}
```

---

## 完整使用流程示例

### 场景：用户上传 PDF 并进行对话

```javascript
// 1. 上传 PDF 文件
async function uploadAndChat() {
  // 上传 PDF
  const formData = new FormData();
  formData.append("file", document.getElementById("fileInput").files[0]);

  const uploadResponse = await fetch(
    "http://localhost:8080/api/v1/pdf/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const uploadData = await uploadResponse.json();
  const sessionId = uploadData.data.session_id;

  // 2. 使用流式对话获取回答
  const response = await fetch("http://localhost:8080/api/v1/pdf/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "这份文档的主要内容是什么？",
      session_id: sessionId,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const token = line.substring(6);
        fullAnswer += token;
        document.getElementById("answer").textContent = fullAnswer;
      }
    }
  }

  // 3. 清除会话
  await fetch("http://localhost:8080/api/v1/pdf/clear", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}
```

---

## 常见问题

### Q1: 流式对话和常规对话有什么区别？

**A:**

- **常规对话** (`/pdf/chat`)：等待 AI 完成回答后一次性返回完整结果，响应时间较长但操作简单
- **流式对话** (`/pdf/chat/stream`)：AI 在生成回答时实时推送每个 token，用户可以即时看到生成过程，响应更灵敏

### Q2: PDF 最多支持多少页？

**A:** API 支持无限页数的 PDF，但每次对话只会处理前 10 页以确保性能。如需处理特定页面，建议在提问中指明页面范围。

### Q3: 会话数据会存储多久？

**A:** 会话数据存储在服务器内存中，仅在该次程序运行期间有效。服务器重启后所有会话数据会丢失。若需持久化存储，建议前端自行保存对话记录。

### Q4: 如何处理流式对话中的错误？

**A:**

```javascript
const reader = response.body.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 处理数据
  }
} catch (error) {
  console.error("读取流时出错:", error);
} finally {
  reader.cancel();
}
```

### Q5: 支持多轮对话吗？

**A:** 是的，系统会自动记录对话历史。使用同一个 `session_id` 进行多次提问，系统会基于之前的对话内容进行回答。

---

## 错误码参考

| 错误码 | 含义           | 处理建议               |
| ------ | -------------- | ---------------------- |
| 200    | 成功           | 正常处理响应数据       |
| 400    | 客户端参数错误 | 检查请求参数格式和内容 |
| 500    | 服务器错误     | 联系技术支持或稍后重试 |

---

## 性能建议

1. **使用流式对话** 当需要实时显示 AI 回答时，使用 `/pdf/chat/stream` 接口
2. **及时清理会话** 使用完毕后调用 `/pdf/clear` 接口释放内存
3. **合理控制文档大小** PDF 页数过多会影响首次加载和处理速度
4. **批量操作时添加延迟** 避免频繁并发请求导致服务器压力过大

---

## 更新日志

### v2.0（当前版本）

- ✅ 新增流式对话接口 `/pdf/chat/stream`
- ✅ 支持 Server-Sent Events (SSE) 格式流式返回
- ✅ 逐 token 实时推送 AI 回答
- ✅ 改进文档和使用示例
- ✅ 添加完整的 JavaScript 客户端示例

### v1.0

- 初始版本，支持基础的 PDF 上传和对话功能
