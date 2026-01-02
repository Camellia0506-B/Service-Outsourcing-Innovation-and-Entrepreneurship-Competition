"""
PDF 智能体服务
使用 LangChain 封装 doubao-seed-1.6 API，实现 PDF 文档阅读智能体
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI
# LangChain 相关导入（可选，当前主要使用 OpenAI 客户端）
# from langchain_openai import ChatOpenAI
# from langchain.schema import HumanMessage, AIMessage, SystemMessage
# from langchain.memory import ConversationBufferMemory
from PIL import Image
import base64
import io

from pdf_processor import PDFProcessor


class PDFAgentService:
    """PDF 文档阅读智能体服务"""
    
    def __init__(self):
        """初始化智能体服务"""
        # 从环境变量获取 API Key
        self.api_key = os.environ.get("ARK_API_KEY")
        if not self.api_key:
            raise ValueError("请设置环境变量 ARK_API_KEY")
        
        # 初始化 OpenAI 客户端（兼容 doubao-seed-1.6）
        self.client = OpenAI(
            base_url="https://ark.cn-beijing.volces.com/api/v3",
            api_key=self.api_key,
        )
        
        # 模型名称（需要根据实际情况修改）
        self.model = os.environ.get("DOUBAO_MODEL", "doubao-seed-1-6-251015")
        
        # 存储会话数据：session_id -> {images, memory, conversation_history}
        self.sessions: Dict[str, dict] = {}
        
        # PDF 处理器
        self.pdf_processor = PDFProcessor()
    
    def init_session(self, session_id: str, images: List[Image.Image]):
        """
        初始化会话
        
        Args:
            session_id: 会话ID
            images: PDF 页面图像列表
        """
        self.sessions[session_id] = {
            "images": images,
            "conversation_history": []
        }
    
    def has_session(self, session_id: str) -> bool:
        """检查会话是否存在"""
        return session_id in self.sessions
    
    def clear_session(self, session_id: str):
        """清除会话"""
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """将 PIL Image 转换为 base64 编码的字符串"""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/png;base64,{img_base64}"
    
    async def chat(self, session_id: str, question: str) -> str:
        """
        与 PDF 进行对话
        
        Args:
            session_id: 会话ID
            question: 用户问题
        
        Returns:
            AI 回答
        """
        if session_id not in self.sessions:
            raise ValueError(f"会话 {session_id} 不存在")
        
        session = self.sessions[session_id]
        images = session["images"]
        conversation_history = session["conversation_history"]
        
        # 构建消息内容
        # 对于多页 PDF，我们可以选择发送所有页面或让用户指定页面
        # 这里先实现发送第一页，后续可以根据问题智能选择页面
        
        # 构建消息列表
        messages = []
        
        # 添加系统提示
        system_prompt = """你是一个专业的 PDF 文档阅读助手。用户会向你提问关于 PDF 文档内容的问题。
请仔细阅读文档中的图像，理解文档内容，然后回答用户的问题。
如果文档有多页，请综合考虑所有页面的信息来回答问题。
回答要准确、详细、有帮助。"""
        
        # 添加历史对话
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append({
                    "role": "user",
                    "content": msg["content"]
                })
            elif msg["role"] == "assistant":
                messages.append({
                    "role": "assistant",
                    "content": msg["content"]
                })
        
        # 构建当前问题的消息
        # 对于多页 PDF，我们发送所有页面（如果页面太多，可以限制）
        content_list = []
        
        # 限制最多发送 10 页，避免 token 过多
        max_pages = min(len(images), 10)
        for i in range(max_pages):
            img_base64 = self._image_to_base64(images[i])
            content_list.append({
                "type": "image_url",
                "image_url": {
                    "url": img_base64
                }
            })
        
        # 如果是多页文档，添加提示
        if len(images) > max_pages:
            question_with_context = f"{question}\n\n注意：文档共有 {len(images)} 页，当前显示了前 {max_pages} 页。"
        else:
            question_with_context = question
        
        content_list.append({
            "type": "text",
            "text": question_with_context
        })
        
        messages.append({
            "role": "user",
            "content": content_list
        })
        
        try:
            # 调用 API
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                reasoning_effort="medium"
            )
            
            # 获取回答
            answer = completion.choices[0].message.content
            
            # 如果有推理过程，也可以获取（可选）
            if hasattr(completion.choices[0].message, 'reasoning_content'):
                reasoning = completion.choices[0].message.reasoning_content
                # 可以将推理过程也保存或返回
            
            # 保存对话历史
            conversation_history.append({
                "role": "user",
                "content": question
            })
            conversation_history.append({
                "role": "assistant",
                "content": answer
            })
            
            return answer
            
        except Exception as e:
            raise Exception(f"API 调用失败: {str(e)}")

