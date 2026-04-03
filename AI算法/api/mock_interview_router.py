"""
模拟面试模块 - 路由层
对应 API 文档第 10 章：模拟面试
4个接口：创建面试会话、发送回答、获取报告、历史记录
会话持久化到 data/mock_interview_sessions.json，避免重启后历史只剩一条。
"""

import json
import os
import uuid
import tempfile
import random
from datetime import datetime
from flask import Blueprint, request, Response, jsonify, stream_with_context
from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from langchain_chroma import Chroma
from model.factory import embedding_model
from utils.config_handler import chroma_conf
from profile.profile_service import get_profile_service

mock_interview_bp = Blueprint("mock_interview", __name__, url_prefix="/api/v1/mock-interview")

# 计算机相关岗位的专业关键词
JOB_KEYWORDS = {
    "算法工程师": ["Python", "TensorFlow", "PyTorch", "机器学习", "深度学习", "算法", "模型", "神经网络", "NLP", "CV", "数据挖掘", "统计"],
    "前端开发工程师": ["JavaScript", "Vue", "React", "TypeScript", "HTML", "CSS", "DOM", "Webpack", "Vite", "HTTP", "浏览器"],
    "后端开发工程师": ["Java", "Go", "Python", "Spring", "Spring Boot", "MySQL", "Redis", "微服务", "分布式", "API", "HTTP"],
    "数据分析师": ["Python", "SQL", "Excel", "Tableau", "数据可视化", "统计", "机器学习", "数据分析", "Hadoop", "Spark"],
    "产品经理": ["产品设计", "需求分析", "用户研究", "原型设计", "PRD", "Figma", "Axure", "项目管理", "敏捷开发"],
    "UI/UX设计师": ["Figma", "Sketch", "交互设计", "视觉设计", "UI", "UX", "用户体验", "设计系统"],
    "AI应用工程师": ["Python", "LLM", "大模型", "Prompt", "RAG", "Agent", "API", "LangChain"],
    "测试工程师": ["自动化测试", "性能测试", "Selenium", "JMeter", "Python", "测试用例", "缺陷管理"],
    "运维工程师/DevOps": ["Linux", "Docker", "Kubernetes", "K8s", "CI/CD", "云原生", "监控", "部署"],
    "全栈开发工程师": ["JavaScript", "Node.js", "React", "Vue", "MongoDB", "MySQL", "Redis", "API", "HTTP"]
}

def get_job_keywords(job_title):
    """根据岗位名称获取相关关键词列表"""
    for job, keywords in JOB_KEYWORDS.items():
        if job in job_title:
            return keywords
    # 默认返回通用计算机相关关键词
    return ["Python", "Java", "算法", "数据", "API", "系统", "开发"]


def map_job_title_to_type(job_title):
    """
    将岗位标题映射到 job_type
    :param job_title: 岗位标题
    :return: job_type (java_backend | web_frontend | python_algo) 或 None
    """
    if not job_title:
        return None
    
    job_title_lower = job_title.lower()
    
    if any(keyword in job_title_lower for keyword in ["java", "后端"]):
        return "java_backend"
    elif any(keyword in job_title_lower for keyword in ["前端", "vue", "react", "javascript"]):
        return "web_frontend"
    elif any(keyword in job_title_lower for keyword in ["python", "算法", "ai", "llm", "rag"]):
        return "python_algo"
    
    return None


def get_question_bank_stats() -> dict:
    """
    获取题库统计信息
    :return: dict {job_type: {total, technical, project, scenario, behavior}}
    """
    try:
        vector_store = Chroma(
            collection_name="interview_questions",
            embedding_function=embedding_model,
            persist_directory=chroma_conf["persist_directory"],
        )
        
        all_docs = vector_store.get()
        
        if not all_docs or not all_docs["metadatas"]:
            return {}
        
        stats = {}
        
        for metadata in all_docs["metadatas"]:
            try:
                question_data = json.loads(metadata["question_data"])
                job_type = metadata.get("job_type", question_data.get("job_type"))
                category = question_data.get("category", "technical")
                
                if job_type not in stats:
                    stats[job_type] = {
                        "total": 0,
                        "technical": 0,
                        "project": 0,
                        "scenario": 0,
                        "behavior": 0
                    }
                
                stats[job_type]["total"] += 1
                if category in stats[job_type]:
                    stats[job_type][category] += 1
            except Exception as e:
                continue
        
        return stats
        
    except Exception as e:
        logger.warning(f"获取题库统计失败: {e}")
        return {}


def get_questions_for_interview(job_type: str, interview_type: str, difficulty: str, count: int) -> list[dict]:
    """
    从 ChromaDB 中获取面试题目
    :param job_type: 岗位类型 (java_backend | web_frontend | python_algo)
    :param interview_type: 面试类型
    :param difficulty: 难度 (easy | medium | hard)
    :param count: 需要的题目数量
    :return: 题目列表，包含完整题目信息
    """
    try:
        # 初始化 ChromaDB
        vector_store = Chroma(
            collection_name="interview_questions",
            embedding_function=embedding_model,
            persist_directory=chroma_conf["persist_directory"],
        )
        
        # 获取所有匹配的题目（先不做 RAG，直接从 collection 中获取）
        all_docs = vector_store.get(where={"job_type": job_type})
        
        if not all_docs or not all_docs["documents"]:
            logger.warning(f"ChromaDB 中没有找到 {job_type} 的题目，将使用默认出题方式")
            return []
        
        # 解析题目数据
        questions = []
        for i in range(len(all_docs["ids"])):
            try:
                metadata = all_docs["metadatas"][i]
                question_data = json.loads(metadata["question_data"])
                questions.append(question_data)
            except Exception as e:
                logger.error(f"解析题目数据失败: {e}")
                continue
        
        if not questions:
            logger.warning(f"解析题目数据失败，将使用默认出题方式")
            return []
        
        # 按 category 和 difficulty 筛选和排序
        # category 比例: technical 40%, project 30%, scenario 20%, behavior 10%
        category_weights = {
            "technical": 0.4,
            "project": 0.3,
            "scenario": 0.2,
            "behavior": 0.1
        }
        
        # difficulty 权重: easy 0.2, medium 0.6, hard 0.2
        difficulty_weights = {
            "easy": 0.2,
            "medium": 0.6,
            "hard": 0.2
        }
        
        # 分类存储题目
        categorized = {
            "technical": [],
            "project": [],
            "scenario": [],
            "behavior": []
        }
        
        for q in questions:
            cat = q.get("category", "technical")
            if cat in categorized:
                categorized[cat].append(q)
        
        # 按照比例抽取
        selected_questions = []
        used_ids = set()
        
        for category, weight in category_weights.items():
            if not categorized[category]:
                continue
            
            # 计算该分类应该抽取的数量
            category_count = max(1, int(count * weight))
            
            # 按 difficulty 权重筛选
            filtered = []
            for q in categorized[category]:
                diff = q.get("difficulty", "medium")
                # 更有可能选择匹配的难度
                if diff == difficulty:
                    filtered.extend([q] * 3)
                elif diff in difficulty_weights:
                    filtered.extend([q] * 2)
                else:
                    filtered.append(q)
            
            # 打乱并抽取
            random.shuffle(filtered)
            selected = []
            for q in filtered:
                if q["id"] not in used_ids and len(selected) < category_count:
                    selected.append(q)
                    used_ids.add(q["id"])
            
            selected_questions.extend(selected)
        
        # 如果数量不够，从剩余的题目中补
        if len(selected_questions) < count:
            remaining = [q for q in questions if q["id"] not in used_ids]
            random.shuffle(remaining)
            selected_questions.extend(remaining[:count - len(selected_questions)])
        
        # 最终打乱顺序
        random.shuffle(selected_questions)
        
        logger.info(f"从 ChromaDB 成功获取 {len(selected_questions)} 道 {job_type} 题目")
        return selected_questions[:count]
        
    except Exception as e:
        logger.error(f"从 ChromaDB 获取题目失败: {e}", exc_info=True)
        return []

def calculate_speech_metrics(sentences, job_title, job_type=None):
    """
    计算语音指标：语速、停顿次数、专业术语命中、流畅度得分
    :param sentences: 阿里云Paraformer返回的句子列表，每个元素包含begin_time, end_time, text
    :param job_title: 目标岗位名称
    :param job_type: 岗位类型（可选，用于从题库获取tags）
    :return: dict {words_per_minute, pause_count, confidence_keywords, fluency_score}
    """
    if not sentences or len(sentences) == 0:
        return {
            "words_per_minute": 0,
            "pause_count": 0,
            "confidence_keywords": [],
            "fluency_score": 0,
            "total_duration_seconds": 0
        }
    
    # 计算总字数
    total_chars = 0
    for sentence in sentences:
        text = sentence.get("text", "")
        # 只统计中文字符和英文字母
        for char in text:
            if '\u4e00' <= char <= '\u9fff' or char.isalpha():
                total_chars += 1
    
    # 计算总时长（秒）
    if sentences:
        first_start = sentences[0].get("begin_time", 0)
        last_end = sentences[-1].get("end_time", 0)
        total_duration = (last_end - first_start) / 1000  # 毫秒转秒
    else:
        total_duration = 0
    
    # 计算语速：字/分钟
    wpm = 0
    if total_duration > 0:
        wpm = int((total_chars / total_duration) * 60)
    
    # 计算停顿次数：两句话之间间隔超过0.5秒算一次停顿
    pause_count = 0
    for i in range(1, len(sentences)):
        prev_end = sentences[i-1].get("end_time", 0)
        curr_start = sentences[i].get("begin_time", 0)
        gap = (curr_start - prev_end) / 1000
        if gap > 0.5:
            pause_count += 1
    
    # 计算专业术语命中（关键词列表）
    confidence_keywords = []
    
    # 先从岗位关键词中查找
    keywords = get_job_keywords(job_title)
    full_text = " ".join([s.get("text", "") for s in sentences])
    for keyword in keywords:
        if keyword.lower() in full_text.lower():
            if keyword not in confidence_keywords:
                confidence_keywords.append(keyword)
    
    # 如果有 job_type，从题库的 tags 中查找
    if job_type:
        try:
            vector_store = Chroma(
                collection_name="interview_questions",
                embedding_function=embedding_model,
                persist_directory=chroma_conf["persist_directory"],
            )
            all_docs = vector_store.get(where={"job_type": job_type})
            
            if all_docs and all_docs["metadatas"]:
                all_tags = set()
                for metadata in all_docs["metadatas"]:
                    try:
                        question_data = json.loads(metadata["question_data"])
                        tags = question_data.get("tags", [])
                        for tag in tags:
                            all_tags.add(tag.lower())
                    except:
                        pass
                
                # 查找匹配的 tags
                for tag in all_tags:
                    if tag in full_text.lower() and tag not in [k.lower() for k in confidence_keywords]:
                        confidence_keywords.append(tag)
        except Exception as e:
            logger.warning(f"从题库获取 tags 失败: {e}")
    
    # 计算流畅度综合分（0-100）
    # 语速评分：120-200 字/分钟为最佳（100分）
    if 120 <= wpm <= 200:
        wpm_score = 100
    else:
        wpm_score = max(0, 100 - abs(wpm - 160) * 0.8)
    
    # 停顿扣分：每次超过 0.5 秒的停顿扣 3 分（最多扣 20 分）
    pause_penalty = min(20, pause_count * 3)
    
    # 关键词加分：每个专业术语加 2 分（最多加 10 分）
    keyword_bonus = min(10, len(confidence_keywords) * 2)
    
    # 综合计算流畅度分
    fluency_score = max(0, min(100, int(wpm_score * 0.7 + keyword_bonus - pause_penalty)))
    
    return {
        "words_per_minute": wpm,
        "pause_count": pause_count,
        "confidence_keywords": confidence_keywords,
        "fluency_score": fluency_score,
        "total_duration_seconds": total_duration
    }


def _get_sessions_path() -> str:
    return get_abs_path("data/mock_interview_sessions.json")


def _load_json(path: str, default: dict):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
            return json.loads(text) if text else default
    except Exception as e:
        logger.warning(f"[MockInterview] 加载会话文件失败 {path}: {e}")
        return default


def _save_sessions() -> None:
    os.makedirs(os.path.dirname(_get_sessions_path()), exist_ok=True)
    with open(_get_sessions_path(), "w", encoding="utf-8") as f:
        json.dump(interview_sessions, f, ensure_ascii=False, indent=2)


# 内存中存储面试会话，启动时从文件恢复，避免重启后历史丢失
interview_sessions = _load_json(_get_sessions_path(), {})

def success_response(data: dict, msg: str = "success") -> tuple:
    """成功响应"""
    return jsonify({"code": 200, "msg": msg, "data": data}), 200

def error_response(code: int, msg: str) -> tuple:
    """错误响应"""
    return jsonify({"code": code, "msg": msg, "data": None}), code if code >= 400 else 200

# ================================================================
# 10.0 恢复面试会话（前端本地有会话数据时使用）
# ================================================================
@mock_interview_bp.route("/session/restore", methods=["POST"])
def restore_session():
    """
    恢复面试会话（当后端重启后，前端可以把本地存储的会话数据恢复）
    请求体：完整的面试会话对象
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")
        
        interview_id = body.get("interview_id")
        if not interview_id:
            return error_response(400, "请提供 interview_id")
        # 兼容前端字段：前端使用 target_position，后端使用 target_job_title
        if not body.get("target_job_title") and body.get("target_position"):
            body["target_job_title"] = body["target_position"]
        interview_sessions[interview_id] = body
        _save_sessions()
        logger.info(f"[MockInterview] 恢复会话: {interview_id}")
        
        return success_response({"restored": True}, msg="会话恢复成功")
        
    except Exception as e:
        logger.error(f"[MockInterview] 恢复会话异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 10.1 创建模拟面试会话
# ================================================================
@mock_interview_bp.route("/session/create", methods=["POST"])
def create_session():
    """
    6.2 创建模拟面试会话（升级）
    请求体：{ user_id, target_job_title, job_type, interview_type, difficulty, duration_minutes }
    返回：{ interview_id, opening_message, interviewer_persona, interview_plan, question_pool_size }
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        target_job_title = body.get("target_job_title")
        job_type = body.get("job_type")
        interview_type = body.get("interview_type", "comprehensive")
        difficulty = body.get("difficulty", "medium")
        duration_minutes = body.get("duration_minutes", 30)

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not target_job_title:
            return error_response(400, "请提供 target_job_title 参数")

        interview_id = str(uuid.uuid4())
        
        # 如果没有提供 job_type，自动推断
        if not job_type:
            job_type = map_job_title_to_type(target_job_title)
        
        # 定义面试官配置
        interviewer_config = {
            "java_backend": {
                "name": "李工",
                "role": "某大厂 Java 架构师",
                "style": "逻辑严密，步步深挖，不接受模糊答案",
                "avatar": "interviewer_java.png"
            },
            "web_frontend": {
                "name": "张工",
                "role": "某大厂前端技术负责人",
                "style": "注重细节，关注用户体验和性能优化",
                "avatar": "interviewer_web.png"
            },
            "python_algo": {
                "name": "王工",
                "role": "某大厂算法专家",
                "style": "严谨务实，关注算法思维和工程实现",
                "avatar": "interviewer_python.png"
            }
        }
        
        # 根据 job_type 获取面试官配置，默认使用通用配置
        config = interviewer_config.get(job_type, {
            "name": "AI面试官",
            "role": f"{target_job_title}面试官",
            "style": "专业、严谨、注重细节",
            "avatar": "interviewer_default.png"
        })
        
        interviewer_name = config["name"]
        interviewer_persona = {
            "name": interviewer_name,
            "role": config["role"],
            "style": config["style"],
            "avatar": config["avatar"]
        }
        
        # 构建面试计划
        interview_plan = {
            "total_questions": 5,
            "duration_minutes": duration_minutes,
            "question_types": [
                "自我介绍",
                "岗位认知",
                "项目经验",
                "技术能力",
                "职业规划"
            ]
        }
        
        # === 步骤 1：根据 job_type 加载对应的 System Prompt 文件 ===
        system_prompt = ""
        
        if job_type:
            prompt_filename = {
                "java_backend": "interviewer_java_backend.txt",
                "web_frontend": "interviewer_web_frontend.txt",
                "python_algo": "interviewer_python_algo.txt"
            }.get(job_type)
            
            if prompt_filename:
                prompt_path = get_abs_path(f"prompts/{prompt_filename}")
                if os.path.exists(prompt_path):
                    with open(prompt_path, "r", encoding="utf-8") as f:
                        system_prompt = f.read()
                        logger.info(f"[MockInterview] 加载 System Prompt: {prompt_filename}")
        
        # === 步骤 2：调用 get_profile_service 获取学生档案 ===
        student_profile_str = "暂无档案信息"
        try:
            profile_service = get_profile_service()
            profile = profile_service.get_profile(int(user_id) if user_id and user_id.isdigit() else 0)
            
            if profile:
                # 格式化学生档案信息
                profile_parts = []
                
                skills = profile.get("skills", [])
                if skills:
                    profile_parts.append(f"技能：{', '.join([s.get('name', '') for s in skills[:5]])}")
                
                projects = profile.get("projects", [])
                if projects:
                    project_names = [p.get("name", "") for p in projects[:3]]
                    profile_parts.append(f"项目：{', '.join(project_names)}")
                
                internships = profile.get("internships", [])
                if internships:
                    internship_names = [i.get("company", "") for i in internships[:2]]
                    profile_parts.append(f"实习：{', '.join(internship_names)}")
                
                if profile_parts:
                    student_profile_str = "\n".join(profile_parts)
                else:
                    student_profile_str = "技能、项目、实习信息待完善"
                
                logger.info(f"[MockInterview] 获取到学生档案: {student_profile_str[:100]}...")
        except Exception as e:
            logger.warning(f"[MockInterview] 获取学生档案失败: {e}")
        
        # === 步骤 3：尝试从 ChromaDB 获取 RAG 题目 ===
        rag_questions = []
        if job_type:
            logger.info(f"[MockInterview] 尝试从 ChromaDB 获取 {job_type} 题目...")
            rag_questions = get_questions_for_interview(job_type, interview_type, difficulty, 5)
        
        # === 步骤 4：获取题库统计 ===
        question_pool_size = 0
        try:
            stats = get_question_bank_stats()
            if job_type and job_type in stats:
                question_pool_size = stats[job_type].get("total", 0)
        except Exception as e:
            logger.warning(f"[MockInterview] 获取题库统计失败: {e}")
        
        # === 步骤 5：构建第一道题的信息 ===
        first_question_str = "请先简单介绍一下你自己"
        if rag_questions and len(rag_questions) > 0:
            first_question_str = rag_questions[0]["question"]
        
        # === 步骤 6：替换 System Prompt 中的占位符 ===
        if system_prompt:
            system_prompt = system_prompt.replace("{student_profile}", student_profile_str)
            system_prompt = system_prompt.replace("{current_question}", first_question_str)
            system_prompt = system_prompt.replace("{history}", "")
        
        # 开场消息（使用人设中的名称，避免硬编码）
        if rag_questions and len(rag_questions) > 0:
            first_question = rag_questions[0]["question"]
            opening_message = f"你好！我是{interviewer_name}，今天将负责你{target_job_title}岗位的面试。\n\n我们将进行大约{duration_minutes}分钟的面试。\n\n准备好了吗？第一个问题：\n\n{first_question}"
        else:
            opening_message = f"你好！我是{interviewer_name}，今天将负责你{target_job_title}岗位的面试。\n\n我们将进行大约{duration_minutes}分钟的面试，主要考察你的专业能力、项目经验和综合素质。\n\n准备好了吗？请先简单介绍一下你自己。"
        
        # 存储会话（包含 System Prompt 和题目列表）
        interview_sessions[interview_id] = {
            "interview_id": interview_id,
            "user_id": user_id,
            "target_job_title": target_job_title,
            "job_type": job_type,
            "interview_type": interview_type,
            "difficulty": difficulty,
            "duration_minutes": duration_minutes,
            "started_at": datetime.now().isoformat(),
            "status": "in_progress",
            "current_question_index": 0,
            "system_prompt": system_prompt,
            "rag_questions": rag_questions,
            "student_profile": student_profile_str,
            "messages": [
                {
                    "role": "interviewer",
                    "content": opening_message,
                    "timestamp": datetime.now().isoformat()
                }
            ],
            "interviewer_persona": interviewer_persona,
            "interview_plan": interview_plan
        }
        
        _save_sessions()
        return success_response({
            "interview_id": interview_id,
            "opening_message": opening_message,
            "interviewer_persona": interviewer_persona,
            "interview_plan": interview_plan,
            "question_pool_size": question_pool_size,
            "started_at": interview_sessions[interview_id]["started_at"]
        }, msg="模拟面试已准备就绪")
        
    except Exception as e:
        logger.error(f"[MockInterview] 创建会话异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")

# ================================================================
# 10.2 发送面试回答（支持SSE流式响应）
# ================================================================
@mock_interview_bp.route("/session/<interview_id>/answer", methods=["POST"])
def send_answer(interview_id):
    """
    发送面试回答，获取AI面试官的下一个问题。
    支持SSE流式响应。
    请求体：{ user_id, interview_id, answer_text }
    """
    try:
        logger.info(f"[MockInterview] 收到发送回答请求: interview_id={interview_id}")
        body = request.get_json()
        if not body:
            logger.error("[MockInterview] 无请求体")
            return error_response(400, "请提供JSON请求体")
        logger.info(f"[MockInterview] 请求体: {body}")

        user_id = body.get("user_id")
        answer_text = body.get("answer_text", "").strip()
        speech_meta = body.get("speech_meta")

        if not user_id:
            logger.error("[MockInterview] 缺少user_id")
            return error_response(400, "请提供 user_id 参数")
        if not answer_text:
            logger.error("[MockInterview] 缺少answer_text")
            return error_response(400, "请提供 answer_text 参数")

        interview = interview_sessions.get(interview_id)
        if not interview:
            logger.error(f"[MockInterview] 会话不存在: {interview_id}")
            return error_response(404, "面试会话不存在")
        if interview["status"] != "in_progress":
            logger.error(f"[MockInterview] 面试已结束: {interview_id}")
            return error_response(400, "面试已结束")
        logger.info(f"[MockInterview] 会话存在，用户回答: {answer_text}, speech_meta: {speech_meta}")

        # 保存用户回答
        user_message = {
            "role": "user",
            "content": answer_text,
            "timestamp": datetime.now().isoformat()
        }
        if speech_meta:
            user_message["speech_meta"] = speech_meta
        interview["messages"].append(user_message)

        # 按模块统计：5 个模块，每模块可多轮追问，只算 1 题
        MODULE_NAMES = ["自我介绍", "岗位认知", "项目经验", "技术能力", "职业规划"]
        EXCHANGES_PER_MODULE = 2  # 每模块 2 轮用户回答后进入下一模块
        user_count = len([m for m in interview["messages"] if m["role"] == "user"])
        current_module_index = min(5, user_count // EXCHANGES_PER_MODULE)
        interview["current_question_index"] = current_module_index
        is_complete = current_module_index >= 5
        current_module_name = MODULE_NAMES[current_module_index] if current_module_index < 5 else ""
        next_module_name = MODULE_NAMES[current_module_index + 1] if current_module_index < 4 else ""

        def generate():
            try:
                from langchain_core.prompts import PromptTemplate
                from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
                from model.factory import chat_model

                # 构建面试上下文
                history_text = ""
                for msg in interview["messages"]:
                    role = "面试官" if msg["role"] == "interviewer" else "应聘者"
                    history_text += f"{role}：{msg['content']}\n"

                job_title = interview.get("target_job_title") or interview.get("target_position") or "该岗位"
                question_id = body.get("question_id", f"q_{uuid.uuid4().hex[:8]}")
                
                # ========== 发送 evaluating 事件 ==========
                yield "event: evaluating\n"
                yield f"data: {json.dumps({'description': '正在分析你的回答...'}, ensure_ascii=False)}\n\n"
                
                # ========== 实时评分 ==========
                logger.info(f"[MockInterview] 开始实时评分...")
                score_prompt = PromptTemplate.from_template("""
你是一位专业的{job_title}面试官，请根据应聘者的最新回答进行实时评分。

应聘岗位：{job_title}
当前考察模块：{current_module}

面试对话：
{history}

请对应聘者的回答进行评分，返回JSON格式，必须包含以下字段：
{{
    "dimension_scores": {{
        "内容质量": 0-100整数,
        "表达能力": 0-100整数,
        "逻辑思维": 0-100整数,
        "岗位匹配度": 0-100整数
    }},
    "overall_score": 综合得分（0-100整数）,
    "reason": "简短的评分理由"
}}

评分标准：
- 内容质量：技术正确性、知识深度
- 表达能力：语言流畅度、逻辑清晰度
- 逻辑思维：思维逻辑性、条理性
- 岗位匹配度：与岗位要求的匹配程度
""")
                
                score_chain = score_prompt | chat_model | JsonOutputParser()
                
                # 获取 speech_meta
                speech_meta = interview["messages"][-1].get("speech_meta")
                
                try:
                    score_result = score_chain.invoke({
                        "job_title": job_title,
                        "current_module": current_module_name,
                        "history": history_text
                    })
                    logger.info(f"[MockInterview] 实时评分结果: {score_result}")
                    
                    # 处理 speech_meta，调整表达能力评分并生成 speech_feedback
                    speech_feedback = None
                    if speech_meta:
                        logger.info(f"[MockInterview] 应用 speech_meta 调整评分: {speech_meta}")
                        
                        wpm = speech_meta.get("words_per_minute", 160)
                        pause_count = speech_meta.get("pause_count", 0)
                        confidence_keywords = speech_meta.get("confidence_keywords", [])
                        fluency_score = speech_meta.get("fluency_score", 75)
                        
                        # 获取基础表达能力分
                        dimension_scores = score_result.get("dimension_scores", {})
                        base_expression_score = dimension_scores.get("表达能力", 75)
                        
                        # 计算调整后的表达能力分
                        if 120 <= wpm <= 200:
                            wpm_score = 100
                        else:
                            wpm_score = max(0, 100 - abs(wpm - 160) * 0.8)
                        
                        pause_penalty = min(20, pause_count * 3)
                        keyword_bonus = min(10, len(confidence_keywords) * 2)
                        
                        expression_score = base_expression_score * 0.5 + wpm_score * 0.3 + keyword_bonus - pause_penalty
                        expression_score = max(0, min(100, int(expression_score)))
                        
                        # 更新表达能力分
                        dimension_scores["表达能力"] = expression_score
                        
                        # 重新计算总分
                        all_scores = list(dimension_scores.values())
                        if all_scores:
                            score_result["overall_score"] = int(sum(all_scores) / len(all_scores))
                        
                        # 生成 speech_feedback
                        feedback_parts = []
                        if 120 <= wpm <= 200:
                            feedback_parts.append(f"语速适中({wpm}字/分)")
                        elif wpm < 120:
                            feedback_parts.append(f"语速偏慢({wpm}字/分)，建议加快语速")
                        else:
                            feedback_parts.append(f"语速偏快({wpm}字/分)，建议适当放慢")
                        
                        if confidence_keywords:
                            feedback_parts.append(f"提及{len(confidence_keywords)}个专业术语")
                        
                        if pause_count > 2:
                            feedback_parts.append(f"停顿次数偏多({pause_count}次)")
                        elif pause_count > 0:
                            feedback_parts.append(f"停顿次数正常({pause_count}次)")
                        
                        speech_feedback = "，".join(feedback_parts)
                        
                        logger.info(f"[MockInterview] 调整后的评分结果: {score_result}, speech_feedback: {speech_feedback}")
                    
                    # 发送 score_update 事件
                    yield "event: score_update\n"
                    score_update_data = {
                        "question_id": question_id,
                        "dimension_scores": score_result.get("dimension_scores", {
                            "内容质量": 80,
                            "表达能力": 75,
                            "逻辑思维": 78,
                            "岗位匹配度": 82
                        }),
                        "overall_score": score_result.get("overall_score", 80)
                    }
                    if speech_feedback:
                        score_update_data["speech_feedback"] = speech_feedback
                    yield f"data: {json.dumps(score_update_data, ensure_ascii=False)}\n\n"
                    
                    # 保存评分到会话
                    interview["messages"][-1]["score"] = score_result
                    
                except Exception as score_e:
                    logger.warning(f"[MockInterview] 实时评分失败: {score_e}")
                    
                    # 发送模拟评分
                    mock_dimension_scores = {
                        "内容质量": 80,
                        "表达能力": 78,
                        "逻辑思维": 75,
                        "岗位匹配度": 82
                    }
                    mock_overall = 79
                    speech_feedback = None
                    
                    # 如果有 speech_meta，调整模拟评分
                    if speech_meta:
                        wpm = speech_meta.get("words_per_minute", 160)
                        pause_count = speech_meta.get("pause_count", 0)
                        confidence_keywords = speech_meta.get("confidence_keywords", [])
                        
                        if 120 <= wpm <= 200:
                            wpm_score = 100
                        else:
                            wpm_score = max(0, 100 - abs(wpm - 160) * 0.8)
                        
                        pause_penalty = min(20, pause_count * 3)
                        keyword_bonus = min(10, len(confidence_keywords) * 2)
                        
                        expression_score = 78 * 0.5 + wpm_score * 0.3 + keyword_bonus - pause_penalty
                        expression_score = max(0, min(100, int(expression_score)))
                        mock_dimension_scores["表达能力"] = expression_score
                        
                        mock_overall = int(sum(mock_dimension_scores.values()) // len(mock_dimension_scores))
                        
                        # 生成 speech_feedback
                        feedback_parts = []
                        if 120 <= wpm <= 200:
                            feedback_parts.append(f"语速适中({wpm}字/分)")
                        elif wpm < 120:
                            feedback_parts.append(f"语速偏慢({wpm}字/分)")
                        else:
                            feedback_parts.append(f"语速偏快({wpm}字/分)")
                        
                        if confidence_keywords:
                            feedback_parts.append(f"提及{len(confidence_keywords)}个专业术语")
                        
                        if pause_count > 2:
                            feedback_parts.append(f"停顿次数偏多({pause_count}次)")
                        
                        speech_feedback = "，".join(feedback_parts)
                    
                    # 发送 score_update 事件
                    yield "event: score_update\n"
                    score_update_data = {
                        "question_id": question_id,
                        "dimension_scores": mock_dimension_scores,
                        "overall_score": mock_overall
                    }
                    if speech_feedback:
                        score_update_data["speech_feedback"] = speech_feedback
                    yield f"data: {json.dumps(score_update_data, ensure_ascii=False)}\n\n"
                    
                    interview["messages"][-1]["score"] = {
                        "dimension_scores": mock_dimension_scores,
                        "overall_score": mock_overall
                    }
                
                # ========== 生成面试官回复 ==========
                follow_up_count = 0
                max_follow_ups = 2
                is_follow_up = False
                follow_up_reason = ""
                
                if is_complete:
                    system_prompt = f"""你是一位专业的{job_title}面试官。面试已进入收尾阶段。
请简短致谢并告知面试结束，例如："感谢你的参与，本次面试到此结束，我们会尽快给你反馈。" 控制在80字以内。"""

                    template = PromptTemplate.from_template("""
{system}

面试历史：
{history}

请生成面试官的回复（仅输出回复内容，不要加前缀）：
""")

                    chain = template | chat_model | StrOutputParser()

                    full_response = ""
                    for chunk in chain.stream({
                        "system": system_prompt,
                        "history": history_text
                    }):
                        if chunk:
                            full_response += chunk
                            yield "event: interviewer_response_chunk\n"
                            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                else:
                    # === 优先使用 System Prompt + RAG 题目 ===
                    saved_system_prompt = interview.get("system_prompt", "")
                    rag_questions = interview.get("rag_questions", [])
                    current_q_index = interview.get("current_question_index", 0)
                    student_profile = interview.get("student_profile", "")
                    
                    # 我们有 5 个模块，每个模块对应一道 RAG 题
                    next_question_index = current_q_index + 1
                    
                    if saved_system_prompt:
                        # 有 System Prompt，构建当前题目的信息
                        current_question_str = ""
                        if rag_questions and next_question_index < len(rag_questions):
                            current_question_str = rag_questions[next_question_index]["question"]
                        else:
                            current_question_str = "请继续深入回答"
                        
                        # 替换 System Prompt 中的占位符
                        final_system_prompt = saved_system_prompt
                        final_system_prompt = final_system_prompt.replace("{student_profile}", student_profile)
                        final_system_prompt = final_system_prompt.replace("{current_question}", current_question_str)
                        final_system_prompt = final_system_prompt.replace("{history}", history_text)
                        
                        logger.info(f"[MockInterview] 使用 System Prompt 生成回复")
                        
                        template = PromptTemplate.from_template("""
{system}

请生成面试官的回复（仅输出回复内容，不要加前缀）：
""")

                        chain = template | chat_model | StrOutputParser()

                        full_response = ""
                        for chunk in chain.stream({
                            "system": final_system_prompt
                        }):
                            if chunk:
                                full_response += chunk
                                yield "event: interviewer_response_chunk\n"
                                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                    elif rag_questions and next_question_index < len(rag_questions):
                        # 没有 System Prompt，但有 RAG 题目可用，直接使用
                        full_response = rag_questions[next_question_index]["question"]
                        logger.info(f"[MockInterview] 使用 RAG 题目: {next_question_index}")
                        # 模拟流式输出，让用户体验更好
                        for i in range(0, len(full_response), 5):
                            chunk = full_response[i:i+5]
                            yield "event: interviewer_response_chunk\n"
                            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                    else:
                        # 没有 System Prompt 也没有 RAG 题目，用大模型生成
                        transition_hint = f"本模块考察充分后，可自然过渡到下一模块「{next_module_name}」。" if next_module_name else ""
                        system_prompt = f"""你是一位专业的{job_title}面试官。
你的风格：{interview['interviewer_persona']['style']}
面试类型：{interview['interview_type']}，难度：{interview['difficulty']}

当前考察模块：{current_module_name}。请根据应聘者的回答，在本模块内进行追问或深入（可多轮），或{transition_hint}
根据上面的对话，生成面试官的下一个提问。回答要专业、友好，控制在200字以内。"""

                        template = PromptTemplate.from_template("""
{system}

面试历史：
{history}

请生成面试官的回复（仅输出回复内容，不要加前缀）：
""")

                        chain = template | chat_model | StrOutputParser()

                        full_response = ""
                        for chunk in chain.stream({
                            "system": system_prompt,
                            "history": history_text
                        }):
                            if chunk:
                                full_response += chunk
                                yield "event: interviewer_response_chunk\n"
                                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                
                # 随机判断是否触发追问（模拟）
                if not is_complete and random.random() < 0.3 and follow_up_count < max_follow_ups:
                    is_follow_up = True
                    follow_up_count += 1
                    follow_up_reasons = [
                        "答案中未出现具体类名",
                        "项目细节描述不够深入",
                        "技术方案缺乏具体实现细节",
                        "未提及具体的技术选型理由"
                    ]
                    follow_up_reason = random.choice(follow_up_reasons)
                    
                    yield "event: follow_up_triggered\n"
                    yield f"data: {json.dumps({{
                        'reason': follow_up_reason,
                        'follow_up_count': follow_up_count,
                        'max_follow_ups': max_follow_ups
                    }}, ensure_ascii=False)}\n\n"

                remaining = 0 if is_complete else (5 - current_module_index - 1)
                if is_complete:
                    interview["status"] = "completed"
                
                # 获取下一题信息
                next_question_id = None
                section = current_module_name
                if not is_complete and rag_questions and next_question_index < len(rag_questions):
                    next_question_id = rag_questions[next_question_index].get("id")
                
                yield "event: next_question\n"
                yield f"data: {json.dumps({{
                    'question_id': next_question_id or f'q_{uuid.uuid4().hex[:8]}',
                    'section': section,
                    'remaining_questions': remaining
                }}, ensure_ascii=False)}\n\n"

                # 保存AI回复
                interview["messages"].append({
                    "role": "interviewer",
                    "content": full_response,
                    "timestamp": datetime.now().isoformat()
                })
                _save_sessions()

                yield "event: done\n"
                yield f"data: {json.dumps({{'message_id': f'msg_{uuid.uuid4().hex[:8]}'}}, ensure_ascii=False)}\n\n"

            except Exception as e:
                logger.error(f"[MockInterview] 流式响应异常: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error(f"[MockInterview] 发送回答异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")

# ================================================================
# 10.3 结束面试并获取报告
# ================================================================
@mock_interview_bp.route("/session/<interview_id>/finish", methods=["POST"])
def get_report(interview_id):
    """
    结束面试并获取详细报告。
    请求体：{ user_id, interview_id }
    返回：完整的面试报告。前端请求路径须为 /api/v1/mock-interview/session/<id>/finish，方法 POST。
    """
    try:
        print(f"[Debug] 获取报告请求: interview_id={interview_id}")
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        interview = interview_sessions.get(interview_id)
        if not interview:
            print(f"[Debug] 获取报告: 会话不存在 interview_id={interview_id}")
            return error_response(404, "面试会话不存在")

        # 标记为已完成
        interview["status"] = "completed"

        # 计算所有回答的平均分
        all_scores = []
        all_expression = []
        all_logic = []
        all_content = []
        
        for msg in interview["messages"]:
            if msg.get("score"):
                score = msg["score"]
                # 优先使用total_score字段
                total_score = score.get("total_score") or score.get("overall")
                if total_score:
                    all_scores.append(total_score)
                
                # 处理维度得分
                if score.get("dimensions"):
                    dimensions = score["dimensions"]
                    # 遍历维度数组，匹配中文名称
                    for dim in dimensions:
                        dim_name = dim.get("name", "")
                        dim_score = dim.get("score", 75)
                        if "表达" in dim_name or "表达能力" in dim_name:
                            all_expression.append(dim_score)
                        elif "逻辑" in dim_name or "逻辑思维" in dim_name:
                            all_logic.append(dim_score)
                        elif "内容" in dim_name or "专业" in dim_name or "项目" in dim_name:
                            all_content.append(dim_score)
        
        avg_overall = int(sum(all_scores) / len(all_scores)) if all_scores else 80
        avg_expression = int(sum(all_expression) / len(all_expression)) if all_expression else 80
        avg_logic = int(sum(all_logic) / len(all_logic)) if all_logic else 75
        avg_content = int(sum(all_content) / len(all_content)) if all_content else 80
        
        # 构建完整的面试历史
        interview_history = ""
        for msg in interview["messages"]:
            role = "面试官" if msg["role"] == "interviewer" else "应聘者"
            interview_history += f"{role}：{msg['content']}\n"
        
        # 让AI根据面试内容生成个性化报告
        from langchain_core.prompts import PromptTemplate
        from langchain_core.output_parsers import JsonOutputParser
        from model.factory import chat_model
        
        report_prompt = PromptTemplate.from_template("""
你是一位专业的面试官，请根据以下面试内容，对整场面试进行评分并生成详细的面试报告。

应聘岗位：{target_job}
面试类型：{interview_type}

面试完整对话：
{history}

请分析应聘者的整体表现，并返回JSON格式的报告，必须包含以下字段：
{{
    "overall_score": 综合得分（0-100整数）,
    "expression": 表达能力得分（0-100整数）,
    "logic": 逻辑思维得分（0-100整数）,
    "content": 内容质量得分（0-100整数）,
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["建议1", "建议2", "建议3"],
    "improvement_plan": {{
        "short_term": ["短期计划1", "短期计划2"],
        "suggested_retry_days": 14
    }}
}}

要求：
1. overall_score、expression、logic、content 为 0-100 的整数，基于整场面试表现综合给出
2. strengths：3个具体的优势，要基于面试内容
3. weaknesses：2个具体的不足，要基于面试内容
4. suggestions：3个针对性的改进建议
5. improvement_plan：2个具体的短期行动计划，以及建议再次面试的天数
6. 所有内容要具体、实用、有针对性，不要太笼统
""")
        
        report_chain = report_prompt | chat_model | JsonOutputParser()
        
        target_job_title = interview.get("target_job_title") or interview.get("target_position") or "未知岗位"
        try:
            report_data = report_chain.invoke({
                "target_job": target_job_title,
                "interview_type": interview.get("interview_type", "comprehensive"),
                "history": interview_history
            })
            overall_score_ai = report_data.get("overall_score")
            if overall_score_ai is not None:
                overall_score_ai = max(0, min(100, int(overall_score_ai)))
            expr_ai = report_data.get("expression")
            logic_ai = report_data.get("logic")
            content_ai = report_data.get("content")
            strengths = report_data.get("strengths", ["专业知识扎实", "沟通表达清晰", "逻辑思维能力强"])
            weaknesses = report_data.get("weaknesses", ["项目经验可以更丰富", "压力下的表现还有提升空间"])
            suggestions = report_data.get("suggestions", ["建议多积累项目经验", "可以进行更多的模拟面试练习", "加强对行业动态的了解"])
            improvement_plan = report_data.get("improvement_plan", {
                "short_term": ["每天练习1道面试题", "每周进行2-3次模拟面试"],
                "suggested_retry_days": 14
            })
        except Exception as e:
            logger.warning(f"[MockInterview] AI生成报告失败，使用默认值: {e}")
            overall_score_ai = None
            expr_ai = logic_ai = content_ai = None
            strengths = ["专业知识扎实", "沟通表达清晰", "逻辑思维能力强"]
            weaknesses = ["项目经验可以更丰富", "压力下的表现还有提升空间"]
            suggestions = ["建议多积累项目经验", "可以进行更多的模拟面试练习", "加强对行业动态的了解"]
            improvement_plan = {
                "short_term": ["每天练习1道面试题", "每周进行2-3次模拟面试"],
                "suggested_retry_days": 14
            }

        # 优先使用报告中的评分，否则用历史消息平均或默认值
        final_overall = overall_score_ai if overall_score_ai is not None else interview.get("total_score") or avg_overall
        final_expr = max(0, min(100, int(expr_ai))) if expr_ai is not None else avg_expression
        final_logic = max(0, min(100, int(logic_ai))) if logic_ai is not None else avg_logic
        final_content = max(0, min(100, int(content_ai))) if content_ai is not None else avg_content

        # 真实对话轮数：统计用户回答次数
        round_count = sum(1 for msg in interview.get("messages", []) if msg.get("role") == "user")

        # 生成报告
        report = {
            "interview_id": interview_id,
            "target_job": target_job_title,
            "overall_score": final_overall,
            "round_count": round_count,
            "dimension_scores": {
                "expression": final_expr,
                "logic": final_logic,
                "content": final_content,
                "stress_resistance": 75,
                "cultural_fit": 80
            },
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions,
            "improvement_plan": improvement_plan,
            "created_at": datetime.now().isoformat()
        }

        interview["total_score"] = report["overall_score"]
        interview["dimension_scores"] = report["dimension_scores"]
        
        # 同时保存中英文键，确保兼容
        interview["dimension_scores"]["内容质量"] = report["dimension_scores"]["content"]
        interview["dimension_scores"]["表达能力"] = report["dimension_scores"]["expression"]
        interview["dimension_scores"]["逻辑思维"] = report["dimension_scores"]["logic"]
        interview["dimension_scores"]["岗位匹配度"] = report["dimension_scores"]["cultural_fit"]
        
        _save_sessions()

        print(f"[Debug] 查询结果: overall_score={report.get('overall_score')}, keys={list(report.keys())}")
        return success_response(report, msg="面试报告生成成功")

    except Exception as e:
        logger.error(f"[MockInterview] 获取报告异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")

# ================================================================
# 10.4 获取历史记录
# ================================================================
@mock_interview_bp.route("/history", methods=["GET"])
def get_history():
    """
    6.4 获取历史面试记录（升级）
    查询参数：user_id, job_type, page, size
    """
    try:
        user_id = request.args.get("user_id")
        job_type = request.args.get("job_type")
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 10))

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        # 过滤用户的面试记录
        user_interviews = [
            v for k, v in interview_sessions.items()
            if str(v.get("user_id")) == str(user_id)
        ]
        
        # 按 job_type 筛选
        if job_type:
            user_interviews = [
                v for v in user_interviews
                if v.get("job_type") == job_type
            ]

        # 按时间倒序（兼容 started_at / created_at）
        user_interviews.sort(key=lambda x: x.get("started_at") or x.get("created_at") or "", reverse=True)

        logger.info(f"[MockInterview] 查询历史记录, user_id={user_id}, job_type={job_type}, 结果数量={len(user_interviews)}")

        # 分页
        total = len(user_interviews)
        start = (page - 1) * size
        end = start + size
        raw_list = user_interviews[start:end]

        # 归一化字段，供前端使用
        paginated_list = []
        for item in raw_list:
            rec = dict(item)
            
            # 格式化日期
            created_at = rec.get("created_at") or rec.get("started_at")
            if created_at:
                try:
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    created_at = dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass
            
            # 判断是否使用了语音输入
            used_voice = False
            messages = rec.get("messages", [])
            for msg in messages:
                if msg.get("role") == "user" and msg.get("speech_meta"):
                    used_voice = True
                    break
            
            # 判断面试状态：有 total_score 或 status=completed 就算完成
            is_completed = rec.get("status") == "completed" or rec.get("total_score") is not None
            
            # 计算结果等级
            overall_score = rec.get("total_score", 0)
            if overall_score >= 80:
                result = "excellent"
            elif overall_score >= 70:
                result = "good"
            elif overall_score >= 60:
                result = "average"
            else:
                result = "poor"
            
            # 构建列表项
            paginated_list.append({
                "interview_id": rec.get("interview_id"),
                "target_job": rec.get("target_job_title") or rec.get("target_position"),
                "job_type": rec.get("job_type"),
                "overall_score": overall_score,
                "total_score": overall_score,
                "status": "completed" if is_completed else "in_progress",
                "result": result,
                "used_voice": used_voice,
                "duration_minutes": rec.get("duration_minutes", 30),
                "created_at": created_at
            })

        # 计算得分趋势（按时间顺序，从旧到新）
        # 支持两种格式：
        # 1. score_trend: 对象数组（前端Chart.js需要）
        # 2. score_trend: 纯数字数组（API文档定义）
        # 为了兼容，我们同时返回两种格式的数据
        score_trend_array = []  # 纯数字数组（API文档格式）
        score_trend_objects = []  # 对象数组（前端需要）
        dates = []
        dimension_trend = {
            "内容质量": [],
            "表达能力": [],
            "逻辑思维": [],
            "岗位匹配度": []
        }
        
        # 按时间正序处理（从旧到新）
        for interview in reversed(user_interviews):
            if interview.get("total_score"):
                # 处理日期
                date_str = interview.get("created_at") or interview.get("started_at")
                if date_str:
                    try:
                        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        date_str = dt.strftime("%Y-%m-%d")
                    except:
                        pass
                dates.append(date_str)
                
                # 综合得分
                total_score = interview.get("total_score", 0)
                score_trend_array.append(total_score)
                score_trend_objects.append({
                    "date": date_str,
                    "total_score": total_score,
                    "score": total_score
                })
                
                # 维度得分
                dims = interview.get("dimension_scores", {})
                if dims:
                    dimension_trend["内容质量"].append(dims.get("content", dims.get("内容质量", 75)))
                    dimension_trend["表达能力"].append(dims.get("expression", dims.get("表达能力", 75)))
                    dimension_trend["逻辑思维"].append(dims.get("logic", dims.get("逻辑思维", 75)))
                    dimension_trend["岗位匹配度"].append(dims.get("cultural_fit", dims.get("岗位匹配度", 75)))
                else:
                    # 如果没有维度得分，用默认值
                    dimension_trend["内容质量"].append(75)
                    dimension_trend["表达能力"].append(75)
                    dimension_trend["逻辑思维"].append(75)
                    dimension_trend["岗位匹配度"].append(75)
                
                # 最多保留 10 条趋势数据
                if len(score_trend_array) >= 10:
                    break

        # 确定返回的 score_trend 格式
        # 如果有至少2条数据，返回对象数组（前端需要），否则返回纯数组
        score_trend = score_trend_objects if len(score_trend_objects) >= 2 else score_trend_array

        return success_response({
            "total": total,
            "score_trend": score_trend,
            "dimension_trend": dimension_trend,
            "dates": dates,
            "list": paginated_list
        }, msg="success")

    except Exception as e:
        logger.error(f"[MockInterview] 获取历史记录异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 语音识别接口
# ================================================================
@mock_interview_bp.route("/speech/transcribe", methods=["POST"])
def speech_transcribe():
    """
    6.1 语音转写接口
    功能说明：接收前端录制的音频文件，调用语音识别服务返回转写文本与表达能力指标。
    请求格式：multipart/form-data
    参数：
        - audio_file: file（必填）录音文件（audio/webm 格式，≤5MB，≤120秒）
        - interview_id: string（必填）当前面试会话ID，用于提取岗位关键词
        - user_id: number（必填）用户ID
    """
    try:
        # 获取参数
        interview_id = request.form.get("interview_id", "")
        user_id = request.form.get("user_id", "")
        
        if 'audio_file' not in request.files:
            return error_response(400, "请提供音频文件")
        
        audio_file = request.files['audio_file']
        if audio_file.filename == '':
            return error_response(400, "请选择音频文件")
        
        if not interview_id:
            return error_response(400, "请提供 interview_id 参数")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        # 检查文件格式
        filename = audio_file.filename.lower()
        if not filename.endswith('.webm'):
            return error_response(400, "仅支持 audio/webm 格式")
        
        # 检查文件大小（限制 5MB）
        MAX_SIZE = 5 * 1024 * 1024
        if audio_file.content_length and audio_file.content_length > MAX_SIZE:
            return error_response(400, "音频文件不能超过 5MB")
        
        # 获取岗位信息（从会话中获取）
        job_title = "后端开发工程师"
        job_type = None
        if interview_id and interview_id in interview_sessions:
            session = interview_sessions[interview_id]
            job_title = session.get("target_job_title", job_title)
            job_type = session.get("job_type")
        
        # 保存临时文件
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"audio_{uuid.uuid4().hex}.webm")
        audio_file.save(temp_file_path)
        
        logger.info(f"[SpeechTranscribe] 收到音频文件: {temp_file_path}, interview_id: {interview_id}, user_id: {user_id}")
        
        try:
            # 调用阿里云Paraformer进行语音识别
            from dashscope import audio
            from utils.config_handler import rag_conf
            
            # 获取API Key
            api_key = rag_conf.get("api_key") or rag_conf.get("dashscope_api_key") or rag_conf.get("DASHSCOPE_API_KEY")
            if not api_key:
                # 尝试从环境变量获取
                api_key = os.environ.get("DASHSCOPE_API_KEY")
            
            if not api_key:
                logger.warning("[SpeechTranscribe] 未找到API Key，返回模拟数据")
                # 返回模拟数据（演示用）
                mock_duration = 28
                return success_response({
                    "transcript": "我在上一个项目中主要负责了 Spring Boot 的服务拆分...",
                    "duration_seconds": mock_duration,
                    "speech_meta": {
                        "words_per_minute": 158,
                        "pause_count": 3,
                        "confidence_keywords": ["Spring Boot", "服务拆分", "接口"],
                        "fluency_score": 78
                    }
                }, msg="转写成功（模拟数据）")
            
            # 调用阿里云Paraformer
            try:
                import dashscope
                dashscope.api_key = api_key
                
                # Paraformer语音识别
                from dashscope.audio.asr import Recognition
                recognition = Recognition()
                
                # 调用语音识别
                result = recognition.call(
                    model='paraformer-v2',
                    file_path=temp_file_path,
                    format='webm'
                )
                
                logger.info(f"[SpeechTranscribe] 阿里云识别结果: {result}")
                
                if result.status_code == 200 and result.output:
                    # 解析识别结果
                    sentences = []
                    full_text = ""
                    
                    if hasattr(result.output, 'results') and result.output.results:
                        for item in result.output.results:
                            if hasattr(item, 'sentence') and item.sentence:
                                sentences.append({
                                    "text": item.sentence.text if hasattr(item.sentence, 'text') else str(item.sentence),
                                    "begin_time": item.sentence.begin_time if hasattr(item.sentence, 'begin_time') else 0,
                                    "end_time": item.sentence.end_time if hasattr(item.sentence, 'end_time') else 0
                                })
                                full_text += item.sentence.text if hasattr(item.sentence, 'text') else str(item.sentence)
                    
                    # 如果没有获取到详细结果，尝试获取纯文本
                    if not sentences and hasattr(result.output, 'text'):
                        full_text = result.output.text
                        sentences = [{"text": full_text, "begin_time": 0, "end_time": 10000}]
                    
                    # 计算语音指标
                    speech_meta = calculate_speech_metrics(sentences, job_title, job_type)
                    duration_seconds = speech_meta.get("total_duration_seconds", 0)
                    
                    # 删除临时文件
                    try:
                        os.remove(temp_file_path)
                        logger.info(f"[SpeechTranscribe] 删除临时文件: {temp_file_path}")
                    except:
                        pass
                    
                    return success_response({
                        "transcript": full_text,
                        "duration_seconds": duration_seconds,
                        "speech_meta": {
                            "words_per_minute": speech_meta.get("words_per_minute", 0),
                            "pause_count": speech_meta.get("pause_count", 0),
                            "confidence_keywords": speech_meta.get("confidence_keywords", []),
                            "fluency_score": speech_meta.get("fluency_score", 0)
                        }
                    }, msg="转写成功")
                
                else:
                    logger.warning(f"[SpeechTranscribe] 阿里云识别失败: {result}")
                    # 删除临时文件
                    try:
                        os.remove(temp_file_path)
                    except:
                        pass
                    # 返回模拟数据
                    mock_duration = 28
                    return success_response({
                        "transcript": "我在上一个项目中主要负责了 Spring Boot 的服务拆分...",
                        "duration_seconds": mock_duration,
                        "speech_meta": {
                            "words_per_minute": 158,
                            "pause_count": 3,
                            "confidence_keywords": ["Spring Boot", "服务拆分", "接口"],
                            "fluency_score": 78
                        }
                    }, msg="转写成功（模拟数据）")
            
            except ImportError as e:
                logger.warning(f"[SpeechTranscribe] 导入dashscope失败: {e}")
                # 删除临时文件
                try:
                    os.remove(temp_file_path)
                except:
                    pass
                # 返回模拟数据
                mock_duration = 28
                return success_response({
                    "transcript": "我在上一个项目中主要负责了 Spring Boot 的服务拆分...",
                    "duration_seconds": mock_duration,
                    "speech_meta": {
                        "words_per_minute": 158,
                        "pause_count": 3,
                        "confidence_keywords": ["Spring Boot", "服务拆分", "接口"],
                        "fluency_score": 78
                    }
                }, msg="转写成功（模拟数据）")
            
            except Exception as e:
                logger.error(f"[SpeechTranscribe] 调用阿里云识别失败: {e}", exc_info=True)
                # 返回模拟数据
                mock_duration = 28
                return success_response({
                    "transcript": "我在上一个项目中主要负责了 Spring Boot 的服务拆分...",
                    "duration_seconds": mock_duration,
                    "speech_meta": {
                        "words_per_minute": 158,
                        "pause_count": 3,
                        "confidence_keywords": ["Spring Boot", "服务拆分", "接口"],
                        "fluency_score": 78
                    }
                }, msg="转写成功（模拟数据）")
        
        finally:
            # 清理临时文件
            try:
                if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"[SpeechTranscribe] 删除临时文件失败: {e}")
    
    except Exception as e:
        logger.error(f"[SpeechTranscribe] 语音识别异常: {e}", exc_info=True)
        return error_response(500, f"语音识别失败: {str(e)}")


# ================================================================
# 6.5 题库管理接口
# ================================================================
@mock_interview_bp.route("/question-bank/stats", methods=["GET"])
def get_question_bank_stats_api():
    """
    6.5.1 查询题库统计
    """
    try:
        stats = get_question_bank_stats()
        
        return success_response(stats)
        
    except Exception as e:
        logger.error(f"[QuestionBank] 获取题库统计异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@mock_interview_bp.route("/question-bank/rebuild", methods=["POST"])
def rebuild_question_bank():
    """
    6.5.2 触发题库重建
    """
    try:
        import time
        import subprocess
        import sys
        
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")
        
        admin_key = body.get("admin_key")
        job_type = body.get("job_type", "all")
        
        # 验证管理员密钥
        if admin_key != "gradquest_admin_2026":
            return error_response(403, "管理员密钥无效")
        
        logger.info(f"[QuestionBank] 开始重建题库, job_type={job_type}")
        
        start_time = time.time()
        
        # 调用 import_questions.py 脚本重建题库
        script_path = get_abs_path("scripts/import_questions.py")
        
        if not os.path.exists(script_path):
            return error_response(404, "题库导入脚本不存在")
        
        # 构建命令参数
        cmd_args = [sys.executable, script_path]
        if job_type != "all":
            cmd_args.extend(["--job_type", job_type])
        
        # 执行脚本
        try:
            result = subprocess.run(
                cmd_args,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                logger.error(f"[QuestionBank] 题库重建失败: {result.stderr}")
                return error_response(500, f"题库重建失败: {result.stderr}")
            
            # 解析重建的题目数量
            rebuilt_count = 0
            if "成功导入" in result.stdout:
                import re
                match = re.search(r"成功导入\s+(\d+)\s+道题目", result.stdout)
                if match:
                    rebuilt_count = int(match.group(1))
            
        except subprocess.TimeoutExpired:
            logger.error("[QuestionBank] 题库重建超时")
            return error_response(503, "题库重建超时")
        
        end_time = time.time()
        time_seconds = round(end_time - start_time, 2)
        
        logger.info(f"[QuestionBank] 题库重建完成, 重建 {rebuilt_count} 道题目, 耗时 {time_seconds} 秒")
        
        return success_response({
            "rebuilt_count": rebuilt_count,
            "time_seconds": time_seconds
        }, msg="题库重建成功")
        
    except Exception as e:
        logger.error(f"[QuestionBank] 重建题库异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
