"""
职业规划报告模块 - 路由层
与测评报告打通：职业规划报告即测评报告，走 Flask AI 服务（5001）
接口：generate-report / report-status / view-report
"""

from datetime import datetime, timedelta
from typing import Optional
import time
from flask import Blueprint, request, jsonify
from assessment.assessment_service import get_assessment_service
from utils.logger_handler import logger


career_bp = Blueprint("career", __name__, url_prefix="/api/v1/career")


def success_response(data: dict, msg: str = "success") -> tuple:
    return jsonify({"code": 200, "msg": msg, "data": data}), 200


def error_response(code: int, msg: str) -> tuple:
    return jsonify({"code": code, "msg": msg, "data": None}), code if code >= 400 else 200


def _latest_report_id_for_user(service, user_id: int) -> Optional[str]:
    """获取该用户最近一次报告 ID（含 processing/completed）。"""
    candidate = None
    for rid, report in service.reports.items():
        if report.get("user_id") != user_id:
            continue
        created = report.get("created_at") or ""
        if candidate is None or (created and created > (candidate[1] or "")):
            candidate = (rid, created)
    return candidate[0] if candidate else None


# ================================================================
# POST /api/v1/career/generate-report
# ================================================================
@career_bp.route("/generate-report", methods=["POST"])
def generate_report():
    """
    生成职业规划报告。
    实际逻辑：返回该用户最近一次测评报告的任务 ID，供前端轮询；
    若用户从未完成测评，则提示先完成职业测评。
    请求体：{ user_id }
    响应：{ task_id [, report_id, status ] }
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        user_id = body.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        service = get_assessment_service()
        report_id = _latest_report_id_for_user(service, user_id)

        if not report_id:
            return error_response(400, "请先完成职业测评，完成后再生成报告")

        task = service.tasks.get(report_id)
        status = (task or {}).get("status", "processing")
        return success_response(
            {"task_id": report_id, "report_id": report_id, "status": status},
            msg="报告生成中" if status == "processing" else "报告已就绪"
        )

    except Exception as e:
        logger.error(f"[API] /career/generate-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# POST /api/v1/career/report-status
# ================================================================
@career_bp.route("/report-status", methods=["POST"])
def report_status():
    """
    查询报告生成状态。task_id 即 report_id。
    请求体：{ task_id }
    响应：{ status, report_id }
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        task_id = body.get("task_id")
        if not task_id:
            return error_response(400, "请提供 task_id 参数")

        service = get_assessment_service()
        task = service.tasks.get(task_id)
        if not task:
            report = service.reports.get(task_id)
            if report:
                return success_response({"status": "completed", "report_id": task_id})
            return error_response(404, "报告任务不存在")

        status = task.get("status", "processing")
        return success_response({"status": status, "report_id": task_id})

    except Exception as e:
        logger.error(f"[API] /career/report-status 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# POST /api/v1/career/report  （前端使用的路径，与 view-report 一致）
# ================================================================
@career_bp.route("/report", methods=["POST"])
def report():
    """查看报告（别名，逻辑同 view_report）"""
    return view_report()


# ================================================================
# POST /api/v1/career/view-report
# ================================================================
@career_bp.route("/view-report", methods=["POST"])
def view_report():
    """
    查看职业规划报告内容。即测评报告内容。
    请求体：{ user_id, report_id }
    响应：完整报告对象（与 /assessment/report 一致）
    """
    try:
        body = request.get_json()
        if not body:
            return error_response(400, "请提供JSON请求体")

        report_id = body.get("report_id")
        if not report_id:
            return error_response(400, "请提供 report_id 参数")

        service = get_assessment_service()
        user_id = body.get("user_id")
        if user_id is not None:
            try:
                user_id = int(user_id)
                report = service.get_report(user_id, report_id)
            except (TypeError, ValueError):
                return error_response(400, "user_id 必须为数字")
        else:
            # 仅传 report_id 时：先查任务状态，再查已完成的报告
            task = service.tasks.get(report_id)
            if task and task.get("status") == "processing":
                report = {"report_id": report_id, "status": "processing", "message": "报告生成中，请稍后查询"}
            elif task and task.get("status") == "failed":
                report = {"report_id": report_id, "status": "failed", "error": task.get("error", "未知错误")}
            else:
                report = service.reports.get(report_id)

        if not report:
            return error_response(404, "报告不存在或已过期")

        if report.get("status") == "processing":
            return success_response(report, msg="报告生成中...")
        if report.get("status") == "failed":
            return error_response(500, report.get("error", "报告生成失败"))

        return success_response(report, msg="报告获取成功")

    except Exception as e:
        logger.error(f"[API] /career/view-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# POST /api/v1/career/report-history  （前端用 POST 传 user_id, page, size）
# ================================================================
@career_bp.route("/report-history", methods=["POST"])
def report_history():
    """职业规划报告历史列表（与测评报告打通）"""
    try:
        body = request.get_json() or {}
        user_id = body.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")
        page = max(1, int(body.get("page", 1)))
        size = max(1, min(50, int(body.get("size", 10))))
        service = get_assessment_service()
        all_list = service.list_reports_for_user(user_id)
        total = len(all_list)
        start = (page - 1) * size
        list_page = all_list[start : start + size]
        return success_response({"total": total, "list": list_page}, msg="success")
    except Exception as e:
        logger.error(f"[API] /career/report-history 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 以下为占位接口，避免前端 404；后续可接入真实逻辑
# ================================================================
@career_bp.route("/edit-report", methods=["POST"])
def edit_report():
    """编辑报告（占位）"""
    return success_response({"updated_at": datetime.now().isoformat()}, msg="已保存")


@career_bp.route("/ai-polish-report", methods=["POST"])
def ai_polish_report():
    """AI 润色报告（占位）"""
    return success_response({"task_id": "polish_" + str(time.time()), "status": "processing"}, msg="AI润色中...")


@career_bp.route("/export-report", methods=["POST"])
def export_report():
    """导出报告（占位）"""
    return success_response({"download_url": "/downloads/report.pdf", "expires_at": (datetime.now() + timedelta(days=7)).isoformat()}, msg="导出链接已生成")


@career_bp.route("/check-completeness", methods=["POST"])
def check_completeness():
    """报告完整性检查（占位）"""
    return success_response({"completeness": 85, "suggestions": []}, msg="success")
