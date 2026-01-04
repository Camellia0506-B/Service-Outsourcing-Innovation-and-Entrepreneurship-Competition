# PDF 文档阅读智能体 API 文档

## 接口交互通用规范

- **URL 前缀**: `/api/v1`
- **请求格式**: `Content-Type: application/json` 或 `multipart/form-data`（上传文件时）
- **统一响应格式**: 后端无论成功失败，都返回以下 JSON 结构，前端根据 code 判断业务逻辑。

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

```json
// 注意：这不是真正的 JSON，而是 multipart/form-data 格式
// 参数说明：
{
  "file": "<PDF 文件二进制数据>",
  "session_id": "550e8400-e29b-41d4-a716-446655440000" // 可选
}
```

**JavaScript 示例：**

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

**失败响应 - 服务器错误：**

```json
{
  "code": 500,
  "msg": "服务器错误: PDF 文件处理失败，无法提取页面",
  "data": null
}
```

### 注意事项

- 文件大小限制由服务器配置决定
- PDF 文件会被转换为图像格式存储在内存中
- 会话数据在服务器重启后会丢失
- session_id 用于后续对话，请妥善保存

---

## 2. 与 PDF 对话

### 接口说明

向已上传的 PDF 文档提问，获取智能回答。支持多轮对话，系统会记住对话历史。对于超过 10 页的 PDF，系统会自动处理前 10 页。

- **方法**: `POST`
- **路径**: `/pdf/chat`
- **Content-Type**: `application/json`

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

**更多示例：**

```json
{
  "question": "这份招生简章中，计算机学院的招生人数是多少？",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

```json
{
  "question": "有哪些专业可以选择？录取要求是什么？",
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
    "answer": "根据这份招生简章，计算机学院2025年计划招生120人，其中推免生60人，统考生60人。具体专业包括：计算机科学与技术（40人）、软件工程（40人）、人工智能（40人）。",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**失败响应 - 问题为空：**

```json
{
  "code": 400,
  "msg": "问题不能为空",
  "data": null
}
```

**失败响应 - session_id 为空：**

```json
{
  "code": 400,
  "msg": "session_id 不能为空，请先上传 PDF 文件",
  "data": null
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

**失败响应 - API 调用失败：**

```json
{
  "code": 500,
  "msg": "服务器错误: API 调用失败",
  "data": null
}
```

### 注意事项

- 支持多轮对话，系统会自动记住对话历史
- 对于超过 10 页的 PDF，系统会自动在问题中添加提示信息
- 首次对话会包含 PDF 的所有图像（最多 10 页）
- 后续对话会参考历史对话上下文

---

## 3. 清除会话

### 接口说明

清除指定会话的数据，释放服务器内存。建议在不再需要对话时主动调用此接口。

- **方法**: `POST`
- **路径**: `/pdf/clear`
- **Content-Type**: `application/json`

### 请求参数

| 参数名     | 类型   | 必填 | 说明                      |
| ---------- | ------ | ---- | ------------------------- |
| session_id | string | 是   | 会话 ID（从上传接口获取） |

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

**失败响应 - session_id 为空：**

```json
{
  "code": 400,
  "msg": "session_id 不能为空",
  "data": null
}
```

**失败响应 - 服务器错误：**

```json
{
  "code": 500,
  "msg": "服务器错误: 清除会话时发生异常",
  "data": null
}
```

### 注意事项

- 清除会话后，该 session_id 将无法再用于对话
- 会话数据包括 PDF 图像和对话历史，清除后可释放内存
- 如果 session_id 不存在，接口仍会返回成功
- 建议在用户离开页面或完成对话后调用此接口

---

## 完整使用流程示例

### JavaScript 完整示例

```javascript
// 1. 上传 PDF 文件
const uploadFormData = new FormData();
uploadFormData.append("file", pdfFile);

const uploadResponse = await fetch("http://localhost:8080/api/v1/pdf/upload", {
  method: "POST",
  body: uploadFormData,
});
const uploadData = await uploadResponse.json();

if (uploadData.code === 200) {
  const sessionId = uploadData.data.session_id;
  console.log(`PDF 上传成功，会话 ID: ${sessionId}`);
  console.log(`文件页数: ${uploadData.data.page_count}`);

  // 2. 第一轮对话
  const chat1Response = await fetch("http://localhost:8080/api/v1/pdf/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "这份文档的主要内容是什么？",
      session_id: sessionId,
    }),
  });
  const chat1Data = await chat1Response.json();

  if (chat1Data.code === 200) {
    console.log("AI 回答:", chat1Data.data.answer);
  }

  // 3. 第二轮对话（系统会记住上一轮对话）
  const chat2Response = await fetch("http://localhost:8080/api/v1/pdf/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "能详细说说招生要求吗？",
      session_id: sessionId,
    }),
  });
  const chat2Data = await chat2Response.json();

  if (chat2Data.code === 200) {
    console.log("AI 回答:", chat2Data.data.answer);
  }

  // 4. 清除会话
  await fetch("http://localhost:8080/api/v1/pdf/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
  console.log("会话已清除");
}
```

### Vue 3 示例

```vue
<template>
  <div class="pdf-chat">
    <input type="file" @change="handleFileChange" accept=".pdf" />
    <button @click="uploadPdf">上传 PDF</button>

    <div v-if="sessionId">
      <input v-model="question" placeholder="请输入问题" />
      <button @click="askQuestion">提问</button>
      <button @click="clearSession">清除会话</button>

      <div class="answer" v-if="answer">
        <strong>回答：</strong>{{ answer }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const file = ref(null);
const sessionId = ref("");
const question = ref("");
const answer = ref("");

const handleFileChange = (event) => {
  file.value = event.target.files[0];
};

const uploadPdf = async () => {
  if (!file.value) {
    alert("请选择 PDF 文件");
    return;
  }

  const formData = new FormData();
  formData.append("file", file.value);

  const response = await fetch("http://localhost:8080/api/v1/pdf/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.code === 200) {
    sessionId.value = data.data.session_id;
    alert(`上传成功！页数: ${data.data.page_count}`);
  } else {
    alert(data.msg);
  }
};

const askQuestion = async () => {
  if (!question.value) {
    alert("请输入问题");
    return;
  }

  const response = await fetch("http://localhost:8080/api/v1/pdf/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: question.value,
      session_id: sessionId.value,
    }),
  });

  const data = await response.json();

  if (data.code === 200) {
    answer.value = data.data.answer;
  } else {
    alert(data.msg);
  }
};

const clearSession = async () => {
  const response = await fetch("http://localhost:8080/api/v1/pdf/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId.value,
    }),
  });

  const data = await response.json();

  if (data.code === 200) {
    sessionId.value = "";
    answer.value = "";
    alert("会话已清除");
  }
};
</script>
```

---

## 错误码总结

| 错误码 | 说明           | 常见原因                                                  | 解决方法                         |
| ------ | -------------- | --------------------------------------------------------- | -------------------------------- |
| 200    | 成功           | 请求正常处理                                              | -                                |
| 400    | 客户端参数错误 | 文件为空、文件类型错误、问题为空、session_id 为空或不存在 | 检查请求参数是否完整且正确       |
| 500    | 服务器错误     | PDF 处理失败、API 调用失败、其他服务器异常                | 检查服务器日志，联系后端开发人员 |

---

## 常见问题 FAQ

### Q1: 会话数据会保存多久？

A: 会话数据存储在服务器内存中，服务重启后会丢失。建议每次使用完毕后调用清除会话接口。

### Q2: 支持多大的 PDF 文件？

A: 文件大小限制由服务器配置决定，建议单个文件不超过 10MB。

### Q3: 为什么只处理前 10 页？

A: 为了控制 API 调用成本和响应时间，系统限制了最多处理 10 页。如需处理更多页面，请联系后端开发人员调整配置。

### Q4: 可以同时上传多个 PDF 吗？

A: 可以，每个 PDF 对应一个独立的 session_id，互不影响。

### Q5: session_id 可以自定义吗？

A: 可以，在上传时提供 session_id 参数即可。但请确保唯一性，避免冲突。

### Q6: 对话历史会保存吗？

A: 会，在同一个 session_id 下的所有对话历史都会保存，直到清除会话或服务重启。
