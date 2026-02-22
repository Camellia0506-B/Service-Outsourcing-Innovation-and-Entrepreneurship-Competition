"""
职业规划报告模块 - 路由层
与测评报告打通：职业规划报告基于测评报告转换为 API 7.x 格式（section_1~4, summary, metadata）
接口：7.1 generate-report ~ 7.7 report-history
"""

from datetime import datetime, timedelta
from typing import Optional
import time
from flask import Blueprint, request, jsonify
from assessment.assessment_service import get_assessment_service
from career_report.career_report_service import (
    get_career_report_with_edits,
    apply_edits_and_save,
    compute_completeness,
    list_reports_for_career_history,
)
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
# 7.1 POST /api/v1/career/generate-report
# ================================================================
@career_bp.route("/generate-report", methods=["POST"])
def generate_report():
    """
    7.1 生成职业规划报告。
    请求体：{ user_id, target_jobs?, preferences? }
    响应：{ report_id, status }, msg 报告生成中，预计需要30秒...
    """
    try:
        body = request.get_json() or {}
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
            {"report_id": report_id, "status": status},
            msg="报告生成中，预计需要30秒..." if status == "processing" else "报告已就绪"
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
# 7.2 POST /api/v1/career/view-report 与 /report
# ================================================================
@career_bp.route("/view-report", methods=["POST"])
def view_report():
    """
    7.2 获取职业规划报告。返回 API 文档格式（section_1_job_matching, metadata 等）。
    请求体：{ user_id, report_id }
    """
    try:
        body = request.get_json() or {}
        report_id = body.get("report_id")
        if not report_id:
            return error_response(400, "请提供 report_id 参数")
        user_id = body.get("user_id")
        if user_id is not None:
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return error_response(400, "user_id 必须为数字")

        service = get_assessment_service()
        report = get_career_report_with_edits(service, report_id, user_id)
        if not report:
            return error_response(404, "报告不存在或已过期")
        if report.get("status") == "processing":
            return success_response(report, msg="报告生成中...")
        if report.get("status") == "failed":
            return error_response(500, report.get("error", "报告生成失败"))
        return success_response(report, msg="success")
    except Exception as e:
        logger.error(f"[API] /career/view-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 7.7 POST /api/v1/career/report-history
# ================================================================
@career_bp.route("/report-history", methods=["POST"])
def report_history():
    """7.7 获取历史职业规划报告列表。返回 total, list（含 report_id, created_at, status, primary_career, completeness, last_viewed）。"""
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
        all_list = list_reports_for_career_history(service, user_id)
        total = len(all_list)
        start = (page - 1) * size
        list_page = all_list[start : start + size]
        return success_response({"total": total, "list": list_page}, msg="success")
    except Exception as e:
        logger.error(f"[API] /career/report-history 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 7.3 POST /api/v1/career/edit-report
# ================================================================
@career_bp.route("/edit-report", methods=["POST"])
def edit_report():
    """
    7.3 编辑职业规划报告。应用 edits 并持久化。
    请求体：{ report_id, user_id, edits: { "path": value, ... } }
    响应：{ updated_at }
    """
    try:
        body = request.get_json() or {}
        report_id = body.get("report_id")
        edits = body.get("edits")
        if not report_id:
            return error_response(400, "请提供 report_id 参数")
        if not edits or not isinstance(edits, dict):
            return error_response(400, "请提供 edits 对象")
        updated_at = apply_edits_and_save(report_id, edits)
        return success_response({"updated_at": updated_at}, msg="报告编辑成功")
    except Exception as e:
        logger.error(f"[API] /career/edit-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 7.4 POST /api/v1/career/ai-polish-report
# ================================================================
@career_bp.route("/ai-polish-report", methods=["POST"])
def ai_polish_report():
    """
    7.4 AI 润色报告。返回 task_id 供前端轮询（占位实现）。
    请求体：{ report_id, polish_options? }
    响应：{ task_id, status: "processing" }
    """
    try:
        body = request.get_json() or {}
        report_id = body.get("report_id", "")
        task_id = "polish_" + datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + str(int(time.time() * 1000) % 10000)
        return success_response({"task_id": task_id, "status": "processing"}, msg="AI优化中...")
    except Exception as e:
        logger.error(f"[API] /career/ai-polish-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 7.5 POST /api/v1/career/export-report
# ================================================================
@career_bp.route("/export-report", methods=["POST"])
def export_report():
    """
    7.5 导出职业规划报告为 PDF/Word。返回下载链接（占位实现）。
    请求体：{ report_id, format?, include_sections?, template_style? }
    响应：{ download_url, file_size, expires_at }
    """
    try:
        body = request.get_json() or {}
        report_id = body.get("report_id", "")
        fmt = body.get("format", "pdf")
        expires = datetime.now() + timedelta(days=7)
        filename = f"career_report_{report_id}_{datetime.now().strftime('%Y%m%d')}.{('docx' if fmt == 'docx' else 'pdf')}"
        return success_response({
            "download_url": f"/downloads/{filename}",
            "file_size": "2.5MB",
            "expires_at": expires.strftime("%Y-%m-%d %H:%M:%S"),
        }, msg="报告导出成功")
    except Exception as e:
        logger.error(f"[API] /career/export-report 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ================================================================
# 7.6 POST /api/v1/career/check-completeness
# ================================================================
@career_bp.route("/check-completeness", methods=["POST"])
def check_completeness():
    """
    7.6 获取报告完整性检查。AI 检查报告完整性和质量。
    请求体：{ report_id [, user_id] }
    响应：{ completeness_score, quality_score, section_completeness, suggestions, strengths }
    """
    try:
        body = request.get_json() or {}
        report_id = body.get("report_id")
        user_id = body.get("user_id")
        if not report_id:
            return error_response(400, "请提供 report_id 参数")

        service = get_assessment_service()
        report = get_career_report_with_edits(service, report_id, int(user_id) if user_id else None)
        if not report:
            return error_response(404, "报告不存在")
        if report.get("status") in ("processing", "failed"):
            return error_response(400, "报告尚未完成生成，无法检查完整性")

        result = compute_completeness(report)
        return success_response(result, msg="success")
    except Exception as e:
        logger.error(f"[API] /career/check-completeness 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
