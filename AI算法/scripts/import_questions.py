
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.logger_handler import logger
from langchain_core.documents import Document
from langchain_chroma import Chroma
from model.factory import embedding_model
from utils.config_handler import chroma_conf


def import_questions():
    """
    导入面试题库到 ChromaDB
    """
    # 获取题库目录
    question_bank_dir = Path(__file__).parent.parent / "data" / "question_bank"
    
    if not question_bank_dir.exists():
        logger.error(f"题库目录不存在: {question_bank_dir}")
        return
    
    logger.info(f"开始导入题库，目录: {question_bank_dir}")
    
    # 初始化 ChromaDB，使用项目的配置
    vector_store = Chroma(
        collection_name="interview_questions",
        embedding_function=embedding_model,
        persist_directory=chroma_conf["persist_directory"],
    )
    
    # 获取已有的题目 ID
    existing_docs = vector_store.get()
    existing_ids = set(existing_docs["ids"]) if existing_docs else set()
    
    # 统计
    stats = {"java_backend": 0, "web_frontend": 0, "python_algo": 0, "total": 0, "skipped": 0}
    
    # 遍历所有 .jsonl 文件
    documents_to_add = []
    
    for jsonl_file in question_bank_dir.glob("*.jsonl"):
        logger.info(f"处理文件: {jsonl_file}")
        
        with open(jsonl_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    question_data = json.loads(line)
                    
                    # 验证必要字段
                    required_fields = ["id", "job_type", "category", "difficulty", "section", "question"]
                    for field in required_fields:
                        if field not in question_data:
                            logger.warning(f"缺少字段 {field}，跳过: {question_data.get('id', 'unknown')}")
                            continue
                    
                    # 检查是否已存在
                    if question_data["id"] in existing_ids:
                        logger.info(f"题目已存在，跳过: {question_data['id']}")
                        stats["skipped"] += 1
                        continue
                    
                    # 准备文档内容
                    content = f"问题: {question_data['question']}\n"
                    if question_data.get("key_points"):
                        content += f"关键要点: {', '.join(question_data['key_points'])}\n"
                    if question_data.get("section"):
                        content += f"面试环节: {question_data['section']}\n"
                    
                    # 准备 metadata
                    metadata = {
                        "job_type": question_data["job_type"],
                        "category": question_data["category"],
                        "difficulty": question_data["difficulty"],
                        "section": question_data["section"],
                        "question_id": question_data["id"],
                        "question_data": json.dumps(question_data, ensure_ascii=False)
                    }
                    
                    # 创建 Document 对象
                    doc = Document(
                        page_content=content,
                        metadata=metadata,
                        id=question_data["id"]
                    )
                    
                    documents_to_add.append(doc)
                    
                    # 更新统计
                    job_type = question_data["job_type"]
                    if job_type in stats:
                        stats[job_type] += 1
                    stats["total"] += 1
                    
                    logger.info(f"准备导入: {question_data['id']}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"JSON 解析失败: {line[:100]}... 错误: {e}")
                except Exception as e:
                    logger.error(f"处理题目失败: {line[:100]}... 错误: {e}", exc_info=True)
    
    # 批量添加到向量库
    if documents_to_add:
        logger.info(f"开始批量添加 {len(documents_to_add)} 道题目到向量库...")
        vector_store.add_documents(documents_to_add)
        logger.info("批量添加完成！")
    
    # 打印统计
    logger.info("=" * 50)
    logger.info("题库导入完成！")
    logger.info(f"Java 后端工程师: {stats['java_backend']} 题")
    logger.info(f"Web 前端工程师: {stats['web_frontend']} 题")
    logger.info(f"Python 算法工程师: {stats['python_algo']} 题")
    logger.info(f"总计: {stats['total']} 题")
    logger.info(f"跳过（已存在）: {stats['skipped']} 题")
    logger.info("=" * 50)


if __name__ == "__main__":
    import_questions()
