#模型工厂代码 提供模型
from abc import ABC, abstractmethod
from typing import Optional

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_community.chat_models.tongyi import ChatTongyi  # (父类为 BaseChatModel)
from langchain_community.embeddings import DashScopeEmbeddings  # (父类为 Embeddings)

from utils.config_handler import rag_conf


# 抽象工厂类: 强制统一接口（规范）
class BaseModelFactory(ABC):
    @abstractmethod
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        pass


class ChatModelFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        """
        统一创建对话模型实例。
        - 若配置使用多模态模型（如 qwen3.5-plus 系列或包含 'vl' 的模型），
          直接用 ChatTongyi 文本端点会触发阿里云的 url error（要求传 image_url）。
        - 这里自动降级为兼容的纯文本模型（默认 qwen-plus），避免 InvalidParameter/url error。
        """
        # 统一：默认使用 qwen-plus
        model_name = rag_conf.get("chat_model_name", "qwen-plus") or "qwen-plus"

        # 多模态 / VL 模型自动映射到纯文本模型
        if any(model_name.startswith(p) for p in ("qwen3.5-plus", "qwen-vl", "qwen-vl-plus")) or "vl" in model_name.lower():
            # 与项目中其他地方约定保持一致：多模态配置时优先退回到纯文本模型
            model_name = "qwen-plus"

        return ChatTongyi(model=model_name)


class EmbeddingsFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        return DashScopeEmbeddings(model=rag_conf["embedding_model_name"])


chat_model = ChatModelFactory().generator()
embedding_model = EmbeddingsFactory().generator()