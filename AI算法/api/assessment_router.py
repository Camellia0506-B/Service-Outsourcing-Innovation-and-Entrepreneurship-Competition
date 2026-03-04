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


# ================================================================
# 智能评分：基于测评答案计算四维度能力分数与建议（学习/逻辑/执行/创新）
# POST /api/v1/assessment/calculate
# ================================================================
_QUESTION_MAPPING = {
    "q1": {"dimension": "learning", "scores": {"A": 90, "B": 70, "C": 50, "D": 30}},
    "q2": {"dimension": "learning", "scores": {"A": 85, "B": 65, "C": 45, "D": 25}},
    "q3": {"dimension": "learning", "scores": {"A": 95, "B": 75, "C": 55, "D": 35}},
    "q4": {"dimension": "learning", "scores": {"A": 80, "B": 60, "C": 40, "D": 20}},
    "q5": {"dimension": "learning", "scores": {"A": 88, "B": 68, "C": 48, "D": 28}},
    "q6": {"dimension": "logic", "scores": {"A": 92, "B": 72, "C": 52, "D": 32}},
    "q7": {"dimension": "logic", "scores": {"A": 87, "B": 67, "C": 47, "D": 27}},
    "q8": {"dimension": "logic", "scores": {"A": 93, "B": 73, "C": 53, "D": 33}},
    "q9": {"dimension": "logic", "scores": {"A": 89, "B": 69, "C": 49, "D": 29}},
    "q10": {"dimension": "logic", "scores": {"A": 91, "B": 71, "C": 51, "D": 31}},
    "q11": {"dimension": "execution", "scores": {"A": 86, "B": 66, "C": 46, "D": 26}},
    "q12": {"dimension": "execution", "scores": {"A": 90, "B": 70, "C": 50, "D": 30}},
    "q13": {"dimension": "execution", "scores": {"A": 84, "B": 64, "C": 44, "D": 24}},
    "q14": {"dimension": "execution", "scores": {"A": 88, "B": 68, "C": 48, "D": 28}},
    "q15": {"dimension": "execution", "scores": {"A": 92, "B": 72, "C": 52, "D": 32}},
    "q16": {"dimension": "innovation", "scores": {"A": 94, "B": 74, "C": 54, "D": 34}},
    "q17": {"dimension": "innovation", "scores": {"A": 89, "B": 69, "C": 49, "D": 29}},
    "q18": {"dimension": "innovation", "scores": {"A": 91, "B": 71, "C": 51, "D": 31}},
    "q19": {"dimension": "innovation", "scores": {"A": 87, "B": 67, "C": 47, "D": 27}},
    "q20": {"dimension": "innovation", "scores": {"A": 93, "B": 73, "C": 53, "D": 33}},
}

_ADVICE_MAP = {
    "learning": {
        "优秀": "你的学习能力很强！建议：1) 深入学习前沿技术（AI、云计算、区块链）；2) 通过阅读开源项目源码提升技术深度；3) 在技术社区分享学习心得，建立个人品牌。",
        "一般": "学习能力有提升空间。建议：1) 制定系统化学习计划，每周学习新技术；2) 通过慕课网、Coursera等平台系统学习；3) 参加技术读书会或学习小组。",
        "较弱": "学习能力需要加强。建议：1) 从基础知识开始系统学习；2) 寻找导师或报名培训班；3) 每天保持1-2小时专注学习时间。",
    },
    "logic": {
        "优秀": "逻辑思维强！建议：1) 参加算法竞赛（LeetCode周赛、ACM）提升算法能力；2) 深入学习数据结构与算法；3) 参与复杂系统的架构设计。",
        "一般": "逻辑能力中等。建议：1) 每天刷2-3道算法题，坚持3个月；2) 学习常见设计模式和数据结构；3) 参与Code Review，培养逻辑思维。",
        "较弱": "逻辑思维需提升。建议：1) 从简单算法题开始练习；2) 阅读《算法图解》等入门书籍；3) 多做逻辑推理和数学题训练。",
    },
    "execution": {
        "优秀": "执行力出色！建议：1) 主导项目开发，锻炼项目管理能力；2) 设定更高挑战目标；3) 培养团队协作和领导能力。",
        "一般": "执行力一般。建议：1) 使用任务管理工具（Notion、飞书）规划工作；2) 将大任务拆解为可执行的小目标；3) 设定明确的时间节点。",
        "较弱": "执行力待提升。建议：1) 培养时间管理习惯，使用番茄工作法；2) 从小项目开始，逐步完成；3) 找伙伴互相监督，提升完成率。",
    },
    "innovation": {
        "优秀": "创新能力突出！建议：1) 参与创新项目或技术创业；2) 关注前沿技术（AGI、量子计算）；3) 申请技术专利或发表论文。",
        "一般": "创新意识一般。建议：1) 参加黑客马拉松，锻炼快速创新能力；2) 尝试改进现有产品功能；3) 阅读《创新者的窘境》等书籍。",
        "较弱": "创新能力需培养。建议：1) 学习设计思维方法论；2) 多观察生活中的痛点和需求；3) 参与头脑风暴，激发创意。",
    },
}

_DIM_NAMES = {"learning": "学习能力", "logic": "逻辑分析能力", "execution": "执行能力", "innovation": "创新能力"}


def _answers_to_qdict(answers):
    """将 [ { question_id, answer }, ... ] 转为 { q1: 'A', q2: 'B', ... }（按题号排序取前20）"""
    if isinstance(answers, dict):
        return answers
    if not isinstance(answers, list):
        return {}
    def qkey(a):
        qid = a.get("question_id") or ""
        s = str(qid).strip()
        if s.startswith("q"):
            try:
                return int(s[1:])
            except ValueError:
                return 999
        try:
            return int(s)
        except ValueError:
            return 999
    sorted_list = sorted(answers, key=lambda a: (qkey(a), str(a.get("question_id", ""))))
    out = {}
    for i in range(min(20, len(sorted_list))):
        a = sorted_list[i].get("answer")
        opt = (str(a).strip().upper() + "A")[0] if a is not None else "A"
        out["q%d" % (i + 1)] = opt
    return out


@assessment_bp.route("/calculate", methods=["POST"])
def calculate_assessment():
    """
    根据测评答案计算四维度能力分数与建议。
    请求体：{ answers: { q1: "A", q2: "B", ... } 或 answers: [ { question_id, answer }, ... ] }
    返回：{ scores: { learning, logic, execution, innovation }, suggestions: { learning: { name, score, level, advice }, ... } }
    """
    try:
        body = request.get_json() or {}
        raw = body.get("answers", {})
        answers = _answers_to_qdict(raw)

        dimension_scores = {"learning": [], "logic": [], "execution": [], "innovation": []}
        for q_id, answer in answers.items():
            if q_id in _QUESTION_MAPPING:
                m = _QUESTION_MAPPING[q_id]
                opt = (str(answer).strip().upper() + "A")[0] if answer else "A"
                score = m["scores"].get(opt, 50)
                dimension_scores[m["dimension"]].append(score)

        results = {}
        for dim, scores in dimension_scores.items():
            results[dim] = int(sum(scores) / len(scores)) if scores else 60

        suggestions = {}
        for dim, score in results.items():
            level = "优秀" if score >= 80 else "一般" if score >= 60 else "较弱"
            suggestions[dim] = {
                "name": _DIM_NAMES[dim],
                "score": score,
                "level": level,
                "advice": _ADVICE_MAP[dim][level],
            }

        logger.info("[Assessment] calculate: scores=%s", results)
        return success_response({"scores": results, "suggestions": suggestions}, msg="计算成功")
    except Exception as e:
        logger.error(f"[API] /assessment/calculate 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 历史报告列表
# ================================================================
@assessment_bp.route("/report-history", methods=["GET"])
def report_history():
    """
    获取当前用户的历史测评报告列表。
    从 query 获取 user_id（前端已登录时传入）；可选：后续可从 token/session 解析。
    返回：{ code: 200, data: [ { report_id, created_at, holland_code, mbti, match_score } ] }
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        service = get_assessment_service()
        data = service.list_reports_for_user(user_id)
        return jsonify({"code": 200, "msg": "success", "data": data}), 200

    except Exception as e:
        logger.error(f"[API] /assessment/report-history 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
