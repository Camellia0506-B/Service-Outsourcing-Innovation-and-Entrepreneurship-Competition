# HR 端与学生端打通 — 操作步骤

## 第一步：设置环境变量后重启 AI 服务

先停掉当前正在运行的 Python（AI）服务，再**在同一终端**用下面任一方式启动。

### Windows CMD（注意是 `set` 不是 cmdset）

```cmd
set JAVA_BACKEND_URL=http://127.0.0.1:5000
cd AI算法
python app.py
```

### Windows PowerShell

```powershell
$env:JAVA_BACKEND_URL="http://127.0.0.1:5000"
cd AI算法
python app.py
```

### 使用项目自带脚本（推荐，已含环境变量）

- **PowerShell**：在项目根目录执行  
  `.\start_ai_service_with_java.ps1`
- **CMD**：在项目根目录执行  
  `start_ai_service_with_java.cmd`

### Mac / Linux

```bash
cd AI算法
JAVA_BACKEND_URL=http://127.0.0.1:5000 python app.py
```

或先导出再启动：

```bash
export JAVA_BACKEND_URL=http://127.0.0.1:5000
cd AI算法
python app.py
```

---

## 第二步：确认 hr_router.py 读取方式

代码里**同时支持**两个变量名（任设其一即可）：

- `JAVA_BACKEND_URL`
- `BACKEND_URL`

对应位置在 `AI算法/api/hr_router.py` 第 19 行：

```python
JAVA_BACKEND_URL = (os.environ.get("JAVA_BACKEND_URL") or os.environ.get("BACKEND_URL") or "").rstrip("/")
```

若你习惯用 `BACKEND_URL`，启动时改为：

- CMD: `set BACKEND_URL=http://127.0.0.1:5000`
- PowerShell: `$env:BACKEND_URL="http://127.0.0.1:5000"`

---

## 第三步：确认 Java 服务在 5000 正常运行

在**新开一个终端**执行（无需登录）：

```bash
curl http://localhost:5000/api/v1/health
```

若返回 JSON（如 `{"code":200,"msg":"success","data":{...}}`）说明 Java 正常。

也可用：

```bash
curl "http://localhost:5000/api/v1/hr/students/browse?hr_id=1&page=1&size=10"
```

能返回 JSON 即说明 HR 浏览接口可用（列表可为空）。

---

## 第四步：验证链路打通

1. 用**第一步**的方式重启 AI 服务（保证已设置 `JAVA_BACKEND_URL`）。
2. 浏览器打开 **HR 端**，进入「学生简历库」。
3. 按 **F12** → 切到 **Network**，找到请求：`/hr/students/browse`。
4. 看该请求的 **Response**：  
   - 若来自 Java，则 `data.list` 中的学生应与**学生端在 Java 后端填写的档案**一致（含 `anonymous_id` 如 `student_001` 等）。  
   - 若仍为本地数据或空，请确认：  
     - 第一步环境变量是否在当前启动 AI 的终端里设置；  
     - Java 5000 是否已启动；  
     - 学生是否已在**学生端**完成档案保存（数据在 Java/MySQL）。

---

## 故障排查

| 现象 | 可能原因 |
|------|----------|
| HR 列表为 0 条 | ① AI 未设置 `JAVA_BACKEND_URL`（看 AI 启动日志是否有「JAVA_BACKEND_URL 已设置」）<br>② Java 5000 未启动或代理请求失败（看 AI 日志「请求 Java 浏览接口」）<br>③ 学生端无人保存过档案：**新注册用户**自本次改动起会自动有一条空档案，**老用户**需在学生端打开「个人档案」并点一次保存后才会出现在 HR 列表 |
| HR 列表仍是旧/本地数据 | AI 未带 `JAVA_BACKEND_URL` 重启，或 Java 5000 未启动 / 请求失败 |
| curl 5000 无响应 | Java 后端未启动或端口不是 5000（查 `backend/.../application.yml` 中 `server.port`） |

**说明**：当 Java 返回的学生列表为空时，AI 会自动用本地文件数据（如有）兜底，避免有本地简历时仍显示 0 条。
