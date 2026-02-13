"""
总结服务类：
用户提问，搜索参考资料，将提问和参考资料提交给模型，让模型总结回复
"""
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from rag.vector_store import VectorStoreService
from utils.prompt_loader import load_rag_prompts
from langchain_core.prompts import PromptTemplate
from model.factory import chat_model

#prompt内容：System 角色 + User 问题 + Context 资料 + Metadata + 输出约束
def print_prompt(prompt):
    print("="*20)
    print(prompt.to_string())
    print("="*20)
    return prompt

class RagSummarizeService(object):
    def __init__(self):
        self.vector_store=VectorStoreService()
        self.retriever=self.vector_store.get_retriever()
        self.prompt_text = load_rag_prompts()
        self.prompt_template=PromptTemplate.from_template(self.prompt_text)
        self.model=chat_model
        self.chain=self._init_chain()

    def _init_chain(self):
        chain=self.prompt_template|print_prompt|self.model|StrOutputParser()
        return chain

    #检索文档函数
    def retriever_docs(self,query:str)->list[Document]:
        return self.retriever.invoke(query)

    def rag_summarize_docs(self,query:str)->str:
        #检索相关文档 获取对应资料
        context_docs=self.retriever_docs(query)

        context=""
        counter=1
        for doc in context_docs:
            context+=f"【参考资料{counter}】:{doc.page_content} | 参考元数据:{doc.metadata}\n"
            counter+=1

        return self.chain.invoke(
            {
                "input":query,
                "context":context
            }
        )
        """
        “我有一个问题（query），
        我还有一堆检索到的资料（context），
        请你按照 prompt 的格式回答
        """

if __name__=="__main__":
    rag_service=RagSummarizeService()
    print(rag_service.rag_summarize_docs("小户型适合哪种扫地机器人？"))