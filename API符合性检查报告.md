# API 符合性检查报告

对照《接口交互通用规范》及 1–4 模块文档，对 **backend**（Java）、**frontfiles**（前端）、**AI算法**（Python）的符合性结论如下。

---

## 0. 通用规范

| 项目 | 要求 | Backend (Java) | Frontfiles | AI算法 |
|------|------|----------------|------------|--------|
| URL 前缀 | `/api/v1` | ✅ `server.servlet.context-path: /api/v1` | ✅ `baseURL: 'http://localhost:5000/api/v1'` | ✅ 各 Blueprint `url_prefix="/api/v1/..."` |
| 请求格式 | JSON / multipart | ✅ 使用 `@RequestBody`、`multipart/form-data` | ✅ JSON + FormData 上传 | ✅ `request.get_json()` |
| 统一响应 | `{ code, msg, data }` | ✅ `ApiResponse` 200/400/401/500 | ✅ 按 `result.code === 200` 判断 | ✅ `{"code":200,"msg":...,"data":...}` |
| 错误码 | 200/400/401/403/404/500 | ✅ 使用 success/badRequest/failure | ✅ 处理 401 跳登录 | ✅ error_response(code, msg) |

**结论**：三端在 URL 前缀、请求格式、统一响应结构上均符合文档。

---

## 1. 身份认证模块 (Auth)

| 接口 | 方法/路径 | Backend | Frontfiles | 说明 |
|------|------------|---------|------------|------|
| 1.1 用户注册 | POST /auth/register, multipart | ✅ | ✅ FormData: username, password, nickname, avatar | 一致 |
| 1.2 用户登录 | POST /auth/login, JSON | ✅ | ✅ body: username, password | 一致 |
| 1.3 退出登录 | POST /auth/logout, body: user_id | ✅ | ✅ body: user_id | 一致 |
| 1.4.1 发送验证码 | POST /auth/forgot-password/send-code | ❌ **未实现** | ❌ **未调用** | 缺失 |
| 1.4.2 重置密码 | POST /auth/forgot-password/reset | ❌ **未实现** | ❌ **未调用** | 缺失 |

- 注册响应：文档要求 `user_id, username, nickname, avatar, created_at` → Backend `RegisterResponse` 已包含 ✅  
- 登录响应：文档要求 `token, profile_completed, assessment_completed` → Backend `LoginResponse` 已包含 ✅  

**结论**：1.1–1.3 符合；**1.4 忘记密码（发送验证码 + 重置密码）在 backend 与 frontfiles 均未实现。**

---

## 2. 个人档案模块 (Profile)

| 接口 | 方法/路径 | Backend (Java) | AI算法 (Python) | Frontfiles | 说明 |
|------|------------|----------------|-----------------|------------|------|
| 2.1 获取档案 | POST /profile/info, body: user_id | ✅ | ✅ 同路径 | ✅ getProfile(userId) | 两套实现，前端只连 Java |
| 2.2 更新档案 | POST /profile/update | ✅ | ✅ | ✅ updateProfile(...) | 一致 |
| 2.3 上传简历 | POST /profile/upload-resume, multipart user_id + resume_file | ✅ | ✅ | ✅ uploadResume(userId, file)，字段名一致 | 一致 |
| 2.4 解析结果 | POST /profile/resume-parse-result, body: user_id, task_id | ✅ | ✅ | ✅ getResumeParseResult(userId, taskId) | 一致 |

- 2.1 响应结构：文档要求 `basic_info`, `education_info`, `skills`, `certificates`, `internships`, `projects`, `awards`, `profile_completeness`, `updated_at` → Backend `ProfileInfoResponse` 已按文档设计 ✅  
- 2.4 响应：`status`, `parsed_data`, `confidence_score`, `suggestions` → Backend 已实现 ✅  

**结论**：Profile 模块在 **Backend (Java)** 与 **Frontfiles** 上符合文档；AI算法 中也有同路径的 Profile 实现，当前前端仅请求 Java 后端（5000），未请求 AI 服务（8080）。

---

## 3. 职业测评模块 (Assessment)

| 接口 | 方法/路径 | Backend (Java) | AI算法 (Python) | Frontfiles | 说明 |
|------|------------|----------------|-----------------|------------|------|
| 3.1 获取问卷 | POST /assessment/questionnaire | ❌ **无** | ✅ 已实现 | ✅ getQuestionnaire(userId) | 前端调 5000 → 404 |
| 3.2 提交答案 | POST /assessment/submit | ❌ **无** | ✅ 已实现 | ⚠️ 缺 assessment_id、time_spent，答案格式不一致 | 同上 |
| 3.3 获取报告 | POST /assessment/report | ❌ **无** | ✅ 已实现 | ⚠️ 仅传 userId，未传 report_id | 同上 |

- **Backend (Java)**：无 `AssessmentController`，**未实现 3.1–3.3**。  
- **AI算法**：`/api/v1/assessment/questionnaire`、`/submit`、`/report` 已实现，且请求/响应与文档一致（含 assessment_type、assessment_id、time_spent、report_id）。  
- **Frontfiles**：  
  - `baseURL` 指向 **5000**，因此测评相关请求会打到 Java，得到 **404**。  
  - 3.1：未传 `assessment_type`（文档可选，建议传 `comprehensive`/`quick`）。  
  - 3.2：`submitAssessment(userId, answers)` 未传 `assessment_id`（应从 3.1 返回中取）、`time_spent`；答案格式为 `{ question_id, answer_index, score }`，文档为 `{ question_id, answer }`（单选 "A"、多选 ["A","C"]、量表 1–5）。  
  - 3.3：`getAssessmentReport(userId)` 未传 `report_id`（应从 3.2 返回中取）。

**结论**：**测评逻辑仅在 AI算法 中实现；Java 未实现；前端未接 AI 且参数/字段与文档不一致。**

---

## 4. 岗位画像模块 (Job Profile)

| 接口 | 方法/路径 | Backend (Java) | AI算法 (Python) | Frontfiles | 说明 |
|------|------------|----------------|-----------------|------------|------|
| 4.1 岗位列表 | POST /job/profiles, body: page, size, keyword?, industry?, level? | ❌ **无** | ✅ 已实现 | ❌ 调 POST /job/list，且无 industry/level | 路径与参数均不符 |
| 4.2 岗位详情 | POST /job/profile/detail, body: job_id | ❌ **无** | ✅ 已实现 | ❌ 调 POST /job/detail, body: job_name | 路径与参数均不符 |
| 4.3 关联图谱 | POST /job/relation-graph, body: job_id, graph_type? | ❌ **无** | ✅ 已实现 | ❌ **未调用** | 缺失 |
| 4.4 AI 生成画像 | POST /job/ai-generate-profile | ❌ **无** | ✅ 已实现 | ❌ **未调用** | 缺失 |
| 4.5 AI 生成结果 | POST /job/ai-generate-result, body: task_id | ❌ **无** | ✅ 已实现 | ❌ **未调用** | 缺失 |

- **Backend (Java)**：无 `JobController`，**未实现 4.1–4.5**。  
- **AI算法**：4.1–4.5 路径与文档一致，请求体字段一致。  
- **Frontfiles**：  
  - 使用 `/job/list`、`/job/detail`、`/job/search`，与文档 `/job/profiles`、`/job/profile/detail` 不一致；  
  - 列表未传 `industry`、`level`；详情使用 `job_name` 而非 `job_id`；  
  - 未实现 4.3、4.4、4.5 的调用。

**结论**：**岗位画像仅在 AI算法 中实现；Java 未实现；前端路径与参数与文档不符，且缺少 4.3–4.5。**

---

## 5. 架构与对接关系

- **当前前端**：`api.js` 中 `baseURL: 'http://localhost:5000/api/v1'`，即**所有请求只发往 Java 后端**。  
- **Java (5000)**：仅提供 **Auth（1.1–1.3）** 与 **Profile（2.1–2.4）**；**无 Assessment、无 Job**。  
- **AI算法 (8080)**：提供 **Profile、Assessment、Job** 的完整接口，且与文档一致。

因此会出现：  
- 访问 **Profile**：正常（Java 已实现）。  
- 访问 **测评 / 岗位**：前端请求仍发到 5000 → **404 或不存在接口**，除非把测评/岗位的 baseURL 改为 8080 或由 Java 反向代理到 AI。

---

## 6. 修改建议汇总

### 6.1 Backend (Java)

1. **Auth 1.4 忘记密码**  
   - 新增：`POST /auth/forgot-password/send-code`（body: username, email）  
   - 新增：`POST /auth/forgot-password/reset`（body: username, code, new_password）  
   - 需实现验证码存储与校验（如 `password_reset_codes` 表或缓存）。

### 6.2 测评与岗位：二选一

**方案 A：前端直接调 AI 服务（推荐，改动小）**  
- 在 frontfiles 中为 **Assessment** 和 **Job** 单独配置 baseURL（例如 `http://localhost:8080/api/v1`），测评与岗位相关请求发往 8080，其余仍发 5000。

**方案 B：Java 实现 3.x 和 4.x**  
- 在 backend 新增 `AssessmentController`、`JobController`，实现 3.1–3.3、4.1–4.5；可内部调用 AI 服务或自实现业务逻辑。

### 6.3 Frontfiles

1. **测评模块**  
   - 若接 AI（8080）：  
     - 3.1 增加 `assessment_type`（如 `comprehensive`）。  
     - 3.2 使用 3.1 返回的 `assessment_id`，并传 `time_spent`；答案格式改为文档格式 `{ question_id, answer }`。  
     - 3.3 使用 3.2 返回的 `report_id`，请求时传 `user_id` + `report_id`。  
   - 若接 Java：需等 Java 实现 3.1–3.3 后再对齐参数。

2. **岗位模块**  
   - 4.1：改为 `POST /job/profiles`，body 含 `page, size, keyword, industry, level`（后两者可选）。  
   - 4.2：改为 `POST /job/profile/detail`，body 含 `job_id`（可从列表项取）。  
   - 4.3–4.5：新增调用 `relation-graph`、`ai-generate-profile`、`ai-generate-result`，并传文档要求的参数（如 `job_id`, `graph_type`, `task_id` 等）。

3. **忘记密码（1.4）**  
   - 在登录/注册页增加「忘记密码」入口，调用 send-code 与 reset 接口（需后端先实现）。

---

## 7. 总结表

| 模块 | 文档要求 | Backend (Java) | AI算法 | Frontfiles |
|------|----------|----------------|--------|------------|
| 0 通用规范 | code/msg/data, /api/v1 | ✅ | ✅ | ✅ |
| 1 Auth 1.1–1.3 | 注册/登录/登出 | ✅ | - | ✅ |
| 1 Auth 1.4 | 忘记密码 | ❌ | - | ❌ |
| 2 Profile | 2.1–2.4 | ✅ | ✅ | ✅ |
| 3 Assessment | 3.1–3.3 | ❌ | ✅ | ⚠️ 路径指向 Java 且参数/格式不全 |
| 4 Job | 4.1–4.5 | ❌ | ✅ | ❌ 路径与参数不符，缺 4.3–4.5 |

**整体结论**：  
- **Backend**：Auth（除 1.4）、Profile 符合文档；Assessment、Job 未实现。  
- **AI算法**：Profile、Assessment、Job 与文档一致，可作为测评与岗位的正式实现。  
- **Frontfiles**：通用规范、Auth（除 1.4）、Profile 符合；测评与岗位的**路径、参数及缺失接口**需按上文建议调整，并明确测评/岗位请求发往 Java 还是 AI（8080）。
