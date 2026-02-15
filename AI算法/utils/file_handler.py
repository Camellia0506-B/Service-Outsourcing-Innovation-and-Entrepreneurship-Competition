#md5用于文件去重判断
#获取文件的md5的十六进制字符串
import os,hashlib
from utils.logger_handler import logger

#Document是LangChain中用于统一表示文本内容和元数据的标准数据容器
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader,TextLoader

#计算文件的MD5哈希值
def get_file_md5_hex(file_path):
    if not os.path.exists(file_path):
        logger.error(f"[md5计算]文件{file_path}不存在")
        return

    if not os.path.isfile(file_path):
        logger.error(f"[md5计算]路径{file_path}不是文件")
        return

    md5_obj = hashlib.md5() #创建一个「MD5 计算器」

    chunk_size = 4096  #4KB分片，避免文件过大爆内存
    try:
        with open(file_path, "rb") as f: #必须二进制读取
            while chunk:= f.read(chunk_size):
                md5_obj.update(chunk) #计算MD5 内部状态不断被更新

            """
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                md5_obj.update(chunk)
            """
            md5_hex=md5_obj.hexdigest() #转十六进制
            return md5_hex
    except Exception as e:
        logger.error(f"计算文件{file_path}md5失败，{str(e)}")
        return None

#读取并返回文件夹内的文件列表（允许的文件后缀tuple[str]）
def listdir_with_allowed_type(path:str, allowed_types:tuple[str]):
    files=[]

    if not os.path.isdir(path):
        logger.error(f"[listdir_with_allowed_type]{path}不是文件夹")
        return allowed_types #bug?

    for f in os.listdir(path): #获取指定目录 path 下所有文件和文件夹的名称列表
        if f.endswith(allowed_types):
            files.append(os.path.join(path,f))

    return tuple(files) #list->tuple (tuple是不可变类型 维护列表)

def pdf_loader(file_path:str,password=None)->list[Document]:
    return PyPDFLoader(file_path,password).load()
    #load()执行文档加载操作，将文件内容读取并转换为 Document 对象列表。

def text_loader(file_path:str,password=None)->list[Document]:
    return TextLoader(file_path,encoding="utf-8").load()