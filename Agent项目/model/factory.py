#模型工厂代码 提供模型
from abc import ABC, abstractmethod
from typing import Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from utils.config_handler import rag_conf
from langchain_community.embeddings import DashScopeEmbeddings    #(父类为Embeddings)
from langchain_community.chat_models.tongyi import ChatTongyi    #(父类为BaseChatModel)



#抽象工厂类:强制统一接口（规范）
class BaseModelFactory(ABC):
    @abstractmethod
    def generator(self)->Optional[Embeddings | BaseChatModel]:
        pass

class ChatModelFactory(BaseModelFactory):
    def generator(self)->Optional[Embeddings | BaseChatModel]:
        return ChatTongyi(model=rag_conf["chat_model_name"])

class EmbeddingsFactory(BaseModelFactory):
    def generator(self)->Optional[Embeddings | BaseChatModel]:
        return DashScopeEmbeddings(model=rag_conf["embedding_model_name"])

chat_model=ChatModelFactory().generator()
embedding_model=EmbeddingsFactory().generator()