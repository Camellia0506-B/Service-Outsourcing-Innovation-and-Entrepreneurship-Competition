# PDF 文档阅读智能体

基于 LangChain 和 doubao-seed-1.6 API 的 PDF 文档阅读智能体服务。

## 功能特性

- 📄 PDF 文件上传和处理
- 🤖 智能文档问答
- 💬 多轮对话支持
- 🖼️ 自动 PDF 转图像处理
- 🔄 会话管理

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 设置环境变量

```bash
# Windows PowerShell
$env:ARK_API_KEY="your-api-key-here"

# Linux/Mac
export ARK_API_KEY="your-api-key-here"
```

### 3. 运行服务

```bash
python main.py
```

或使用 uvicorn：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 测试接口

访问 `http://localhost:8000/` 查看服务状态。

## 项目结构

```
pdf_agent/
├── main.py              # FastAPI 主服务文件
├── pdf_processor.py     # PDF 处理工具类
├── agent_service.py     # 智能体服务封装
├── requirements.txt     # Python 依赖
├── API文档.md          # API 接口文档
├── 运行说明.md         # 详细运行说明
└── README.md           # 项目说明（本文件）
```

## 主要接口

- `POST /api/v1/pdf/upload` - 上传 PDF 文件
- `POST /api/v1/pdf/chat` - 与 PDF 对话
- `POST /api/v1/pdf/clear` - 清除会话

详细文档请参考 [API 文档.md](./API文档.md)

## 技术栈

- **FastAPI**: Web 框架
- **LangChain**: AI 应用框架
- **PyMuPDF**: PDF 处理
- **OpenAI SDK**: 兼容 doubao-seed-1.6 API
- **Pillow**: 图像处理

## 注意事项

1. 需要有效的 `ARK_API_KEY` 环境变量
2. 会话数据存储在内存中，服务重启后会丢失
3. 单次对话最多处理 10 页 PDF（可配置）
4. 生产环境建议使用 Redis 等持久化存储

## 更多信息

- [API 接口文档](./API文档.md)
- [运行说明](./运行说明.md)
