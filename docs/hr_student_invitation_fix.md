# HR 评估邀请 ↔ 学生端查询 修复说明

## 第一步：后端接口是否存在

**结论：已存在。**

在 `AI算法/api/hr_router.py` 中已有：

- `@hr_bp.route("/student/invitations", methods=["GET"])` → `student_get_invitations()`（约 696 行）
- `@hr_bp.route("/student/invitation/<invitation_id>/respond", methods=["POST"])` → `student_respond_invitation()`

完整 URL（hr_bp 前缀为 `/api/v1/hr`）：

- 学生查邀请：`GET /api/v1/hr/student/invitations?user_id=<user_id>`
- 学生响应邀请：`POST /api/v1/hr/student/invitation/<id>/respond`，body: `{ user_id, action: "accept"|"decline" }`

无需新增路由，无需在 app.py 再注册。

---

## 第二步：关联字段是否一致（根本原因与现状）

- **发邀请**：HR 端调用 `POST /api/v1/hr/evaluation/invite`，body 里是 `anonymous_student_id`（如 `求职者_001`）。  
- **存盘**：`hr_router.send_invitation()` 会先用 `anonymous_student_id` 在 `_load_all_resumes()` 里解析出 **user_id**，再把邀请写入 `data/evaluations/invitation_<id>.json`，且**同时写入 `user_id`**（见 `invitation["user_id"] = int(user_id)`）。  
- **学生查邀请**：`student_get_invitations()` 从 `_load_all_invitations()` 读全部邀请，**按 `inv["user_id"] == request.args.get("user_id")` 过滤**。

因此：**用 user_id 关联的逻辑已经正确**，学生端用登录的 user_id 查即可拿到自己的邀请。

---

## 第三步：数据存储方式（本项目的实际情况）

- **邀请**：存在 **JSON 文件**，不是数据库。路径：`AI算法/data/evaluations/invitation_<invitation_id>.json`。  
- **anonymous_id 格式**：简历/学生列表里为 `求职者_<user_id 三位数>`（如 user_id=1 → `求职者_001`）。  
- **邀请文件字段**：含 `invitation_id`, `hr_id`, `anonymous_student_id`, **`user_id`**, `target_job`, `message`, `status`, `sent_at` 等。  

无需执行 SQL；若需自检，可直接查看：

```bash
# 查看已有邀请文件
dir AI算法\data\evaluations\invitation_*.json
# 或
type AI算法\data\evaluations\invitation_*.json
```

---

## 第四步：前端 API 路径

学生端已在用正确前缀与路径：

- `frontfiles/api.js` 中 `getStudentInvitations(userId)` 使用：  
  `base = assessmentBaseURL`（默认 `http://127.0.0.1:5002/api/v1`），  
  `url = base + "/hr/student/invitations?user_id=" + userId`  
- 即请求为：`GET http://127.0.0.1:5002/api/v1/hr/student/invitations?user_id=xxx`  

**不要**改成 `/api/v1/student/invitations`（该路径不在 hr_bp 下，会 404）。保持当前 `/hr/student/invitations` 即可。

---

## 第五步：app.py 注册

`AI算法/app.py` 中已有：

- `from api.hr_router import hr_bp`
- `app.register_blueprint(hr_bp)`

无需修改。重启 Python 服务即可加载最新 hr_router 逻辑。

---

## 本次代码改动（已完成）

1. **学生端邀请列表增强**（`AI算法/api/hr_router.py`）  
   - 新增 `_get_hr_info_by_id(hr_id)`，从 `hr_accounts.json` 根据 `hr_id` 取 `company_name`、`real_name`。  
   - `student_get_invitations()` 在返回每条邀请时附带 `company_name`、`hr_name`，便于前端展示「XX公司 XX 邀请您」。

---

## 若学生仍看不到邀请，可自检

1. **HR 发邀请是否走 Python**  
   - `frontfiles/hr-app.js` 中 `API_BASE_URL = 'http://127.0.0.1:5002/api/v1'`，发邀请应打到 Python。若曾改为 Java（如 8080），邀请会进 Java 而非 Python，学生端只查 Python 就会为空。

2. **学生请求是否带 user_id**  
   - 前端 `loadStudentInvitations` 需传入当前登录的 `getCurrentUserId()`，确保 `getStudentInvitations(userId)` 的 `userId` 不为空。

3. **AI 服务是否启动**  
   - 学生端请求 5002；未启动则无法拿到列表。启动：在项目根目录运行 `start_ai_service.ps1` 或 `cd AI算法 && python app.py`。

4. **隐私设置**  
   - 发邀请前会检查 `allow_hr_contact`；若为 false，邀请会 403。隐私默认已改为默认开启（见前序修改）。
