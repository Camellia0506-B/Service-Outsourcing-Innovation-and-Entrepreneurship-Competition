"""
PDF 文档阅读智能体 API 服务
使用 FastAPI 和 LangChain 实现，调用 doubao-seed-1.6 API
"""
import os
import base64
import tempfile
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import json

from pdf_processor import PDFProcessor
from agent_service import PDFAgentService

app = FastAPI(title="PDF 文档阅读智能体 API", version="1.0.0")

# 配置 CORS，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应设置为具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务
pdf_processor = PDFProcessor()
agent_service = PDFAgentService()


class ChatRequest(BaseModel):
    """聊天请求模型"""
    question: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """聊天响应模型"""
    code: int
    msg: str
    data: Optional[dict] = None


@app.get("/")
async def root():
    """健康检查接口"""
    return {"code": 200, "msg": "PDF 文档阅读智能体服务运行正常"}


@app.post("/api/v1/pdf/upload")
async def upload_pdf(
    file: UploadFile = File(..., description="PDF 文件"),
    session_id: Optional[str] = Form(None, description="会话ID，用于多轮对话")
):
    """
    上传 PDF 文件并初始化智能体
    
    请求格式: multipart/form-data
    参数:
        - file: PDF 文件
        - session_id: 可选的会话ID，用于多轮对话
    
    返回:
        - code: 200 成功, 400 参数错误, 500 服务器错误
        - msg: 提示信息
        - data: 包含 session_id 和页面数量
    """
    try:
        # 验证文件类型
        if not file.filename.endswith('.pdf'):
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "msg": "文件类型错误，仅支持 PDF 格式",
                    "data": None
                }
            )
        
        # 保存临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # 处理 PDF：转换为图像
            images = pdf_processor.pdf_to_images(tmp_path)
            
            if not images:
                return JSONResponse(
                    status_code=400,
                    content={
                        "code": 400,
                        "msg": "PDF 文件处理失败，无法提取页面",
                        "data": None
                    }
                )
            
            # 生成或使用提供的 session_id
            if not session_id:
                import uuid
                session_id = str(uuid.uuid4())
            
            # 初始化智能体会话
            agent_service.init_session(session_id, images)
            
            return {
                "code": 200,
                "msg": "PDF 上传成功",
                "data": {
                    "session_id": session_id,
                    "page_count": len(images),
                    "filename": file.filename
                }
            }
        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "code": 500,
                "msg": f"服务器错误: {str(e)}",
                "data": None
            }
        )


@app.post("/api/v1/pdf/chat")
async def chat_with_pdf(request: ChatRequest):
    """
    与 PDF 文档进行对话
    
    请求体:
        - question: 用户问题
        - session_id: 会话ID（从上传接口获取）
    
    返回:
        - code: 200 成功, 400 参数错误, 500 服务器错误
        - msg: 提示信息
        - data: 包含回答内容
    """
    try:
        if not request.question:
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "msg": "问题不能为空",
                    "data": None
                }
            )
        
        if not request.session_id:
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "msg": "session_id 不能为空，请先上传 PDF 文件",
                    "data": None
                }
            )
        
        # 检查会话是否存在
        if not agent_service.has_session(request.session_id):
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "msg": "会话不存在或已过期，请重新上传 PDF 文件",
                    "data": None
                }
            )
        
        # 调用智能体获取回答
        answer = await agent_service.chat(request.session_id, request.question)
        
        return {
            "code": 200,
            "msg": "success",
            "data": {
                "answer": answer,
                "session_id": request.session_id
            }
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "code": 500,
                "msg": f"服务器错误: {str(e)}",
                "data": None
            }
        )


@app.post("/api/v1/pdf/clear")
async def clear_session(request: Request):
    """
    清除会话数据
    
    支持两种请求格式:
    1. application/json: {"session_id": "..."}
    2. multipart/form-data: session_id=...
    
    参数:
        - session_id: 会话ID
    
    返回:
        - code: 200 成功, 400 参数错误
        - msg: 提示信息
    """
    try:
        content_type = request.headers.get("content-type", "")
        sid = None
        
        # 处理 JSON 格式
        if "application/json" in content_type:
            body = await request.json()
            sid = body.get("session_id")
        # 处理 form-data 格式
        elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            form = await request.form()
            sid = form.get("session_id")
        
        if not sid:
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "msg": "session_id 不能为空",
                    "data": None
                }
            )
        
        agent_service.clear_session(sid)
        return {
            "code": 200,
            "msg": "会话已清除",
            "data": None
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "code": 500,
                "msg": f"服务器错误: {str(e)}",
                "data": None
            }
        )


if __name__ == "__main__":
    # 从环境变量读取配置
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    uvicorn.run(app, host=host, port=port)

