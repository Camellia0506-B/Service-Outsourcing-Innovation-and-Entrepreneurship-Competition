"""
职业测评模块 - 路由层
对应 API 文档第 3 章
3个接口：问卷获取/答案提交/报告获取
"""

from flask import Blueprint, request, jsonify
from assessment.assessment_service import get_assessment_service
from utils.logger_handler import logger


assessment_bp = Blueprint("assessment", __name__, url_prefix="/api/v1/assessment")


def success_response(data: dict, msg: str = "success") -> tuple:
    """成功响应"""
    return jsonify({"code": 200, "msg": msg, "data": data}), 200


def error_response(code: int, msg: str) -> tuple:
    """错误响应"""
    return jsonify({"code": code, "msg": msg, "data": None}), code if code >= 400 else 200


# ================================================================
# 3.1 获取测评问卷
# ================================================================
@assessment_bp.route("/questionnaire", methods=["POST"])
def get_questionnaire():
    """
    获取职业测评问卷。
    请求体：{ user_id, assessment_type: "comprehensive" | "quick" }
    返回：{ assessment_id, total_questions, estimated_time, dimensions: [...] }
    对应 API 文档 3.1
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        assessment_type = body.get("assessment_type", "comprehensive")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if assessment_type not in ("comprehensive", "quick"):
            return error_response(400, "assessment_type 必须是 comprehensive 或 quick")

        service = get_assessment_service()
        questionnaire = service.get_questionnaire(int(user_id), assessment_type)

        return success_response(questionnaire, msg="问卷获取成功")

    except ValueError as ve:
        logger.warning(f"[API] /assessment/questionnaire 参数错误: {ve}")
        return error_response(400, str(ve))
    except Exception as e:
        logger.error(f"[API] /assessment/questionnaire 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 3.2 提交测评答案
# ================================================================
@assessment_bp.route("/submit", methods=["POST"])
def submit_answers():
    """
    提交测评答卷，触发后台AI报告生成。
    请求体：{
      user_id,
      assessment_id,
      answers: [ { question_id, answer } ],
      time_spent
    }
    返回：{ report_id, status: "processing" }
    对应 API 文档 3.2
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        assessment_id = body.get("assessment_id")
        answers = body.get("answers", [])
        time_spent = body.get("time_spent", 0)

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not assessment_id:
            return error_response(400, "请提供 assessment_id 参数")
        if not answers:
            return error_response(400, "请提供 answers 参数")

        service = get_assessment_service()
        result = service.submit_answers(int(user_id), assessment_id, answers, int(time_spent))

        return success_response(result, msg="测评提交成功，正在生成报告...")

    except ValueError as ve:
        logger.warning(f"[API] /assessment/submit 参数错误: {ve}")
        return error_response(400, str(ve))
    except Exception as e:
        logger.error(f"[API] /assessment/submit 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 3.3 获取测评报告
# ================================================================
@assessment_bp.route("/report", methods=["POST"])
def get_report():
    """
    获取测评报告（轮询）。
    请求体：{ user_id, report_id }
    返回：完整的测评诊断报告（霍兰德/MBTI/能力/价值观/职业建议）
    对应 API 文档 3.3
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        report_id = body.get("report_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not report_id:
            return error_response(400, "请提供 report_id 参数")

        service = get_assessment_service()
        report = service.get_report(int(user_id), report_id)

        if not report:
            return error_response(404, f"报告不存在或已过期: {report_id}")

        # 如果还在生成中
        if report.get("status") == "processing":
            return success_response(report, msg="报告生成中...")

        # 如果生成失败
        if report.get("status") == "failed":
            return error_response(500, f"报告生成失败: {report.get('error', '未知错误')}")

        # 成功
        return success_response(report, msg="报告获取成功")

    except Exception as e:
        logger.error(f"[API] /assessment/report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
