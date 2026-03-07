"""
模拟面试模块 - 路由层
对应 API 文档第 10 章：模拟面试
4个接口：创建面试会话、发送回答、获取报告、历史记录
"""

import json
import uuid
from datetime import datetime
from flask import Blueprint, request, Response, jsonify, stream_with_context
from utils.logger_handler import logger

mock_interview_bp = Blueprint("mock_interview", __name__, url_prefix="/api/v1/mock-interview")

# 内存中存储面试会话（生产环境建议使用Redis或数据库）
interview_sessions = {}

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
        
        interview_sessions[interview_id] = body
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
        
        # 构建面试官人设
        interviewer_persona = {
            "name": "张总监",
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
        
        # 开场消息
        opening_message = f"你好！我是张总监，今天将负责你{target_job_title}岗位的面试。\n\n我们将进行大约{duration_minutes}分钟的面试，主要考察你的专业能力、项目经验和综合素质。\n\n准备好了吗？请先简单介绍一下你自己。"
        
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
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        answer_text = body.get("answer_text", "").strip()

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not answer_text:
            return error_response(400, "请提供 answer_text 参数")

        interview = interview_sessions.get(interview_id)
        if not interview:
            return error_response(404, "面试会话不存在")
        if interview["status"] != "in_progress":
            return error_response(400, "面试已结束")

        # 保存用户回答
        interview["messages"].append({
            "role": "user",
            "content": answer_text,
            "timestamp": datetime.now().isoformat()
        })

        # 预定义问题库
        questions = [
            "请介绍一下你自己？",
            "你为什么想应聘这个岗位？",
            "请分享一个你参与过的项目经历？",
            "你遇到过的最大挑战是什么？你是如何解决的？",
            "你对未来3-5年的职业规划是什么？"
        ]

        interview["current_question_index"] += 1
        next_question_index = interview["current_question_index"]
        is_complete = next_question_index >= len(questions)

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

                # 首先让AI分析回答并给出评分
                score_prompt = PromptTemplate.from_template("""
你是一位专业的面试官，请根据应聘者的回答，从以下三个维度进行评分（0-100分）：

1. 表达能力（expression）：语言表达是否清晰、流畅、有条理
2. 逻辑思维（logic）：回答是否逻辑严谨、思路清晰
3. 内容质量（content）：回答内容是否充实、有深度、切题

面试历史：
{history}

请只返回JSON格式，格式如下：
{{
    "overall": 综合得分,
    "expression": 表达能力得分,
    "logic": 逻辑思维得分,
    "content": 内容质量得分
}}
""")

                score_chain = score_prompt | chat_model | JsonOutputParser()
                
                try:
                    score_result = score_chain.invoke({"history": history_text})
                    overall = score_result.get("overall", 75)
                    expression = score_result.get("expression", 75)
                    logic = score_result.get("logic", 75)
                    content = score_result.get("content", 75)
                except:
                    overall = 75 + next_question_index * 2
                    expression = 75 + next_question_index * 2
                    logic = 70 + next_question_index * 2
                    content = 80 + next_question_index * 2

                # 发送分数更新事件
                yield f"data: {json.dumps({'event': 'score_update', 'overall_score': overall, 'dimension_scores': {'expression': expression, 'logic': logic, 'content': content}}, ensure_ascii=False)}\n\n"

                # 构建面试官回复的system prompt
                system_prompt = f"""你是一位专业的{interview['target_job_title']}面试官。
你的风格是：{interview['interviewer_persona']['style']}
面试类型：{interview['interview_type']}
难度：{interview['difficulty']}

请根据应聘者的回答，自然地提出下一个问题。
如果这是最后一个问题，请在问题后补充："面试结束，感谢你的参与！"
回答要专业、友好，控制在200字以内。"""

                # 下一个问题
                if not is_complete:
                    next_question = questions[next_question_index]
                else:
                    next_question = "面试结束，感谢你的参与！我们会尽快给你反馈。"

                # 构建prompt
                template = PromptTemplate.from_template("""
{system}

面试历史：
{history}

根据上面的对话，请生成面试官的回复。
""")

                chain = template | chat_model | StrOutputParser()

                # 流式输出AI回复
                full_response = ""
                for chunk in chain.stream({
                    "system": system_prompt,
                    "history": history_text
                }):
                    if chunk:
                        full_response += chunk
                        yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                # 如果是最后一个问题，发送完成事件
                if is_complete:
                    yield f"data: {json.dumps({'event': 'next_question', 'remaining_questions': 0}, ensure_ascii=False)}\n\n"
                    interview["status"] = "completed"
                    interview["total_score"] = overall
                else:
                    yield f"data: {json.dumps({'event': 'next_question', 'remaining_questions': len(questions) - next_question_index - 1}, ensure_ascii=False)}\n\n"

                # 保存AI回复
                interview["messages"].append({
                    "role": "interviewer",
                    "content": full_response,
                    "timestamp": datetime.now().isoformat(),
                    "score": {
                        "overall": overall,
                        "dimensions": {
                            "expression": expression,
                            "logic": logic,
                            "content": content
                        }
                    }
                })

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
    返回：完整的面试报告
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        interview = interview_sessions.get(interview_id)
        if not interview:
            return error_response(404, "面试会话不存在")

        # 标记为已完成
        interview["status"] = "completed"

        # 计算所有回答的平均分
        all_scores = []
        all_expression = []
        all_logic = []
        all_content = []
        
        for msg in interview["messages"]:
            if msg.get("score") and msg["score"].get("dimensions"):
                all_scores.append(msg["score"]["overall"])
                all_expression.append(msg["score"]["dimensions"].get("expression", 75))
                all_logic.append(msg["score"]["dimensions"].get("logic", 75))
                all_content.append(msg["score"]["dimensions"].get("content", 75))
        
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
你是一位专业的面试官，请根据以下面试内容，生成详细的面试报告。

应聘岗位：{target_job}
面试类型：{interview_type}

面试完整对话：
{history}

请分析应聘者的表现，并返回JSON格式的报告，包含以下内容：
{{
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["建议1", "建议2", "建议3"],
    "improvement_plan": {{
        "short_term": ["短期计划1", "短期计划2"],
        "suggested_retry_days": 14
    }}
}}

要求：
1. strengths：3个具体的优势，要基于面试内容
2. weaknesses：2个具体的不足，要基于面试内容
3. suggestions：3个针对性的改进建议
4. improvement_plan：2个具体的短期行动计划，以及建议再次面试的天数
5. 所有内容要具体、实用、有针对性，不要太笼统
""")
        
        report_chain = report_prompt | chat_model | JsonOutputParser()
        
        try:
            report_data = report_chain.invoke({
                "target_job": interview["target_job_title"],
                "interview_type": interview["interview_type"],
                "history": interview_history
            })
            strengths = report_data.get("strengths", ["专业知识扎实", "沟通表达清晰", "逻辑思维能力强"])
            weaknesses = report_data.get("weaknesses", ["项目经验可以更丰富", "压力下的表现还有提升空间"])
            suggestions = report_data.get("suggestions", ["建议多积累项目经验", "可以进行更多的模拟面试练习", "加强对行业动态的了解"])
            improvement_plan = report_data.get("improvement_plan", {
                "short_term": ["每天练习1道面试题", "每周进行2-3次模拟面试"],
                "suggested_retry_days": 14
            })
        except Exception as e:
            logger.warning(f"[MockInterview] AI生成报告失败，使用默认值: {e}")
            strengths = ["专业知识扎实", "沟通表达清晰", "逻辑思维能力强"]
            weaknesses = ["项目经验可以更丰富", "压力下的表现还有提升空间"]
            suggestions = ["建议多积累项目经验", "可以进行更多的模拟面试练习", "加强对行业动态的了解"]
            improvement_plan = {
                "short_term": ["每天练习1道面试题", "每周进行2-3次模拟面试"],
                "suggested_retry_days": 14
            }
        
        # 生成报告
        report = {
            "interview_id": interview_id,
            "target_job": interview["target_job_title"],
            "overall_score": interview.get("total_score", avg_overall),
            "dimension_scores": {
                "expression": avg_expression,
                "logic": avg_logic,
                "content": avg_content,
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
        size = int(request.args.get("size", 10))

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        # 过滤用户的面试记录
        user_interviews = [
            v for k, v in interview_sessions.items()
            if str(v["user_id"]) == str(user_id)
        ]

        # 按时间倒序
        user_interviews.sort(key=lambda x: x["started_at"], reverse=True)

        # 分页
        total = len(user_interviews)
        start = (page - 1) * size
        end = start + size
        paginated_list = user_interviews[start:end]

        # 计算得分趋势
        scores = [i.get("total_score", 0) for i in user_interviews if i.get("total_score")]
        score_trend = scores[-10:] if len(scores) > 10 else scores

        return success_response({
            "total": total,
            "list": paginated_list,
            "page": page,
            "size": size,
            "score_trend": score_trend
        }, msg="获取历史记录成功")

    except Exception as e:
        logger.error(f"[MockInterview] 获取历史记录异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
