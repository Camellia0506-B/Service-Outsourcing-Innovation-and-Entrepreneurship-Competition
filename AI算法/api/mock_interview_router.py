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
from datetime import datetime
from flask import Blueprint, request, Response, jsonify, stream_with_context
from utils.logger_handler import logger
from utils.path_tool import get_abs_path

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

def calculate_speech_metrics(sentences, job_title):
    """
    计算语音指标：语速、停顿次数、专业术语命中
    :param sentences: 阿里云Paraformer返回的句子列表，每个元素包含begin_time, end_time, text
    :param job_title: 目标岗位名称
    :return: dict {speaking_rate, pause_count, keyword_hits}
    """
    if not sentences or len(sentences) == 0:
        return {
            "speaking_rate": 0,
            "pause_count": 0,
            "keyword_hits": 0
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
    speaking_rate = 0
    if total_duration > 0:
        speaking_rate = int((total_chars / total_duration) * 60)
    
    # 计算停顿次数：两句话之间间隔超过0.8秒算一次停顿
    pause_count = 0
    for i in range(1, len(sentences)):
        prev_end = sentences[i-1].get("end_time", 0)
        curr_start = sentences[i].get("begin_time", 0)
        gap = (curr_start - prev_end) / 1000
        if gap > 0.8:
            pause_count += 1
    
    # 计算专业术语命中
    keywords = get_job_keywords(job_title)
    keyword_hits = 0
    full_text = " ".join([s.get("text", "") for s in sentences])
    for keyword in keywords:
        if keyword.lower() in full_text.lower():
            keyword_hits += 1
    
    return {
        "speaking_rate": speaking_rate,
        "pause_count": pause_count,
        "keyword_hits": keyword_hits
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
    创建模拟面试会话。
    请求体：{ user_id, target_job_title, interview_type, difficulty, duration_minutes }
    返回：{ interview_id, opening_message, interviewer_persona, interview_plan }
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        target_job_title = body.get("target_job_title")
        interview_type = body.get("interview_type", "comprehensive")
        difficulty = body.get("difficulty", "medium")
        duration_minutes = body.get("duration_minutes", 30)

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not target_job_title:
            return error_response(400, "请提供 target_job_title 参数")

        interview_id = str(uuid.uuid4())
        
        # 构建面试官人设（名称与开场白一致，便于前端展示）
        interviewer_name = "AI面试官"
        interviewer_persona = {
            "name": interviewer_name,
            "title": f"{target_job_title}面试官",
            "style": "专业、严谨、注重细节",
            "background": "10年以上相关行业经验，曾任职于多家知名企业"
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
        
        # 开场消息（使用人设中的名称，避免硬编码）
        opening_message = f"你好！我是{interviewer_name}，今天将负责你{target_job_title}岗位的面试。\n\n我们将进行大约{duration_minutes}分钟的面试，主要考察你的专业能力、项目经验和综合素质。\n\n准备好了吗？请先简单介绍一下你自己。"
        
        # 存储会话
        interview_sessions[interview_id] = {
            "interview_id": interview_id,
            "user_id": user_id,
            "target_job_title": target_job_title,
            "interview_type": interview_type,
            "difficulty": difficulty,
            "duration_minutes": duration_minutes,
            "started_at": datetime.now().isoformat(),
            "status": "in_progress",
            "current_question_index": 0,
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
            "started_at": interview_sessions[interview_id]["started_at"]
        }, msg="面试会话创建成功")
        
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
        logger.info(f"[MockInterview] 会话存在，用户回答: {answer_text}")

        # 保存用户回答
        interview["messages"].append({
            "role": "user",
            "content": answer_text,
            "timestamp": datetime.now().isoformat()
        })

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
    "dimensions": [
        {{"name": "表达能力", "score": 0-100整数}},
        {{"name": "专业知识", "score": 0-100整数}},
        {{"name": "项目经验", "score": 0-100整数}}
    ],
    "total_score": 综合得分（0-100整数）
}}

评分标准：
- 表达能力：语言流畅度、逻辑清晰度、语速适当
- 专业知识：对岗位相关知识的掌握程度
- 项目经验：项目经历描述的完整性和深度
""")
                
                score_chain = score_prompt | chat_model | JsonOutputParser()
                
                try:
                    score_result = score_chain.invoke({
                        "job_title": job_title,
                        "current_module": current_module_name,
                        "history": history_text
                    })
                    logger.info(f"[MockInterview] 实时评分结果: {score_result}")
                    
                    # 发送评分更新事件
                    score_event = {
                        'event': 'score_update',
                        'dimensions': score_result.get('dimensions', []),
                        'total_score': score_result.get('total_score', 0)
                    }
                    yield f"data: {json.dumps(score_event, ensure_ascii=False)}\n\n"
                    
                    # 保存评分到会话
                    interview["messages"][-1]["score"] = score_result
                    
                except Exception as score_e:
                    logger.warning(f"[MockInterview] 实时评分失败: {score_e}")
                    # 发送模拟评分
                    mock_score = {
                        "dimensions": [
                            {"name": "表达能力", "score": 78},
                            {"name": "专业知识", "score": 72},
                            {"name": "项目经验", "score": 80}
                        ],
                        "total_score": 77
                    }
                    score_event = {
                        'event': 'score_update',
                        'dimensions': mock_score['dimensions'],
                        'total_score': mock_score['total_score']
                    }
                    yield f"data: {json.dumps(score_event, ensure_ascii=False)}\n\n"
                    interview["messages"][-1]["score"] = mock_score
                
                # ========== 生成面试官回复 ==========
                if is_complete:
                    system_prompt = f"""你是一位专业的{job_title}面试官。面试已进入收尾阶段。
请简短致谢并告知面试结束，例如："感谢你的参与，本次面试到此结束，我们会尽快给你反馈。" 控制在80字以内。"""
                else:
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
                        yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                remaining = 0 if is_complete else (5 - current_module_index - 1)
                if is_complete:
                    interview["status"] = "completed"
                yield f"data: {json.dumps({'event': 'next_question', 'remaining_questions': remaining, 'current_question_index': current_module_index}, ensure_ascii=False)}\n\n"

                # 保存AI回复
                interview["messages"].append({
                    "role": "interviewer",
                    "content": full_response,
                    "timestamp": datetime.now().isoformat()
                })
                _save_sessions()

                yield "data: [DONE]\n\n"

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
    获取用户的面试历史记录。
    查询参数：user_id, page, size
    """
    try:
        user_id = request.args.get("user_id")
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 50))  # 默认 50 条，避免历史只显示 1 条

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        # 过滤用户的面试记录
        user_interviews = [
            v for k, v in interview_sessions.items()
            if str(v.get("user_id")) == str(user_id)
        ]

        # 按时间倒序（兼容 started_at / created_at）
        user_interviews.sort(key=lambda x: x.get("started_at") or x.get("created_at") or "", reverse=True)

        logger.info(f"[MockInterview] 查询历史记录, user_id={user_id}, 结果数量={len(user_interviews)}")

        # 分页
        total = len(user_interviews)
        start = (page - 1) * size
        end = start + size
        raw_list = user_interviews[start:end]

        # 归一化字段，供前端使用（created_at、target_position 等）
        paginated_list = []
        for item in raw_list:
            rec = dict(item)
            if not rec.get("created_at") and rec.get("started_at"):
                rec["created_at"] = rec["started_at"]
            if not rec.get("target_position") and rec.get("target_job_title"):
                rec["target_position"] = rec["target_job_title"]
            paginated_list.append(rec)

        # 计算得分趋势
        score_trend = []
        dimension_trend = {
            "表达能力": [],
            "专业知识": [],
            "项目经验": []
        }
        
        for interview in reversed(user_interviews):
            if interview.get("total_score"):
                date_str = interview.get("created_at") or interview.get("started_at")
                if date_str:
                    try:
                        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        date_str = dt.strftime("%Y-%m-%d")
                    except:
                        pass
                
                score_trend.append({
                    "date": date_str,
                    "total_score": interview.get("total_score", 0)
                })
                
                if interview.get("dimension_scores"):
                    dims = interview["dimension_scores"]
                    dimension_trend["表达能力"].append(dims.get("expression", 0))
                    dimension_trend["专业知识"].append(dims.get("content", 0))
                    dimension_trend["项目经验"].append(dims.get("logic", 0))
                
                if len(score_trend) >= 10:
                    break

        return success_response({
            "total": total,
            "list": paginated_list,
            "page": page,
            "size": size,
            "score_trend": score_trend,
            "dimension_trend": dimension_trend
        }, msg="获取历史记录成功")

    except Exception as e:
        logger.error(f"[MockInterview] 获取历史记录异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 语音识别接口
# ================================================================
@mock_interview_bp.route("/speech-to-text", methods=["POST"])
def speech_to_text():
    """
    语音转文字接口
    接收音频文件，调用阿里云Paraformer进行识别
    返回：转写文本 + 语速、停顿次数、专业词命中指标
    """
    try:
        if 'audio' not in request.files:
            return error_response(400, "请提供音频文件")
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return error_response(400, "请选择音频文件")
        
        # 保存临时文件
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"audio_{uuid.uuid4().hex}.webm")
        audio_file.save(temp_file_path)
        
        logger.info(f"[SpeechToText] 收到音频文件: {temp_file_path}")
        
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
                logger.warning("[SpeechToText] 未找到API Key，返回模拟数据")
                # 返回模拟数据（演示用）
                return success_response({
                    "text": "这是一段模拟的语音识别结果。",
                    "speaking_rate": 150,
                    "pause_count": 2,
                    "keyword_hits": 3
                }, msg="语音识别成功（模拟数据）")
            
            # 调用阿里云Paraformer
            # 注意：这里使用dashscope的语音识别API
            # 由于不同版本的API可能有差异，我们先尝试使用通用的方式
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
                
                logger.info(f"[SpeechToText] 阿里云识别结果: {result}")
                
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
                    
                    # 计算语音指标（默认岗位为后端开发工程师）
                    metrics = calculate_speech_metrics(sentences, "后端开发工程师")
                    
                    return success_response({
                        "text": full_text,
                        "speaking_rate": metrics["speaking_rate"],
                        "pause_count": metrics["pause_count"],
                        "keyword_hits": metrics["keyword_hits"]
                    }, msg="语音识别成功")
                
                else:
                    logger.warning(f"[SpeechToText] 阿里云识别失败: {result}")
                    # 返回模拟数据
                    return success_response({
                        "text": "这是一段模拟的语音识别结果。",
                        "speaking_rate": 150,
                        "pause_count": 2,
                        "keyword_hits": 3
                    }, msg="语音识别成功（模拟数据）")
            
            except ImportError as e:
                logger.warning(f"[SpeechToText] 导入dashscope失败: {e}")
                # 返回模拟数据
                return success_response({
                    "text": "这是一段模拟的语音识别结果。",
                    "speaking_rate": 150,
                    "pause_count": 2,
                    "keyword_hits": 3
                }, msg="语音识别成功（模拟数据）")
            
            except Exception as e:
                logger.error(f"[SpeechToText] 调用阿里云识别失败: {e}", exc_info=True)
                # 返回模拟数据
                return success_response({
                    "text": "这是一段模拟的语音识别结果。",
                    "speaking_rate": 150,
                    "pause_count": 2,
                    "keyword_hits": 3
                }, msg="语音识别成功（模拟数据）")
        
        finally:
            # 清理临时文件
            try:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"[SpeechToText] 删除临时文件失败: {e}")
    
    except Exception as e:
        logger.error(f"[SpeechToText] 语音识别异常: {e}", exc_info=True)
        return error_response(500, f"语音识别失败: {str(e)}")
