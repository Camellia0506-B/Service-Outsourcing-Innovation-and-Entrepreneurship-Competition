# GradQuest 构建与打包说明

本说明可基于提交的源代码复现运行环境，并构建出一致安装包。

## 1. 项目结构

- `backend/`：Java Spring Boot 后端服务
- `ai/`：Python AI 服务
- `frontend/`：前端静态页面
- `start.bat`：本地一键启动脚本（可选使用）

## 2. 环境要求

- 操作系统：Windows 10/11（其他系统可用等效命令）
- JDK：17
- Maven：3.8+
- Python：3.10.x（建议 3.10）
- MySQL：8.x

## 3. 数据库初始化

1. 创建数据库（字符集建议 utf8mb4）：

```sql
CREATE DATABASE IF NOT EXISTS gradquest
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_general_ci;
```

2. 进入 `backend/src/main/resources/`，按文件名顺序执行 `schema-*.sql`。
3. 确保后端连接配置中的库名为 `gradquest`。

## 4. 后端配置与启动（Java）

1. 编辑或创建 `backend/src/main/resources/application-local.yml`（可参考 `application-local.yml.example`）：
   - `spring.datasource.url`
   - `spring.datasource.username`
   - `spring.datasource.password`

2. 启动后端（开发模式）：

```powershell
cd backend
mvn spring-boot:run -Dspring.profiles.active=local
```

3. 打包后端安装产物（JAR）：

```powershell
cd backend
mvn clean package -DskipTests
```

打包结果默认位于：`backend/target/`。

## 5. AI 服务安装与启动（Python）

1. 创建虚拟环境并安装依赖：

```powershell
cd ai
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. 启动 AI 服务：

```powershell
cd ai
venv\Scripts\activate
python app.py
```

## 6. 前端启动

前端为静态页面，可用 Python 启动本地静态服务：

```powershell
cd frontend
python -m http.server 8080
```

浏览器访问：`http://127.0.0.1:8080`

## 7. 联调顺序（推荐）

1. 先启动 MySQL 并完成 SQL 初始化。
2. 启动 AI 服务（`ai/app.py`）。
3. 启动 Java 后端（Spring Boot）。
4. 启动前端静态服务并访问页面。

## 8. 一键启动（可选）

可使用根目录 `start.bat`，其行为为：
- 启动 AI 服务
- 启动前端静态服务（8080）
- 启动后端服务

若本机环境路径或配置不同，请按第 4~6 节手动启动。

## 9. 说明

- 本提交仅包含团队开发产生的项目源代码及必要构建脚本/配置模板。
- 不包含开发工具、开源框架源码、第三方公共库源码。
