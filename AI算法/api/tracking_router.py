"""
Career Tracking 模块 API 路由
对应 API 文档第 9 章：规划落地性跟踪模块

路由列表：
  POST /api/v1/tracking/record/create              - 9.1 创建求职跟踪记录
  PUT  /api/v1/tracking/record/<record_id>/update  - 9.2 更新求职进展
  POST /api/v1/tracking/record/<record_id>/failure-analysis - 9.3 求职失败反馈分析（SSE）
  GET  /api/v1/tracking/overview                   - 9.4 获取求职跟踪总览
  GET  /api/v1/tracking/failure-reports            - 9.5 获取反馈优化报告列表
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Any

from flask import Blueprint, request, jsonify, Response

from utils.logger_handler import logger
from utils.path_tool import get_abs_path

tracking_bp = Blueprint("tracking", __name__, url_prefix="/api/v1/tracking")


# ========== 工具函数 ==========

def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _load_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
            return json.loads(text) if text else default
    except Exception as e:
        logger.warning(f"[Tracking] 加载JSON失败 {path}: {e}")
        return default


def _save_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_records_store_path() -> str:
    return get_abs_path("data/tracking/records.json")


def _get_failure_reports_path() -> str:
    return get_abs_path("data/tracking/failure_reports.json")


def _load_records() -> Dict[str, Any]:
    return _load_json(_get_records_store_path(), {})


def _save_records(store: Dict[str, Any]) -> None:
    _save_json(_get_records_store_path(), store)


def _load_failure_reports() -> Dict[str, Any]:
    return _load_json(_get_failure_reports_path(), {})


def _save_failure_reports(store: Dict[str, Any]) -> None:
    _save_json(_get_failure_reports_path(), store)


def _success(data=None, msg: str = "success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def _error(code: int, msg: str, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ============================================================
# 9.1 创建求职跟踪记录
# ============================================================

@tracking_bp.route("/record/create", methods=["POST"])
def create_record():
    """
    学生开始投递某个推荐岗位后，创建该岗位的求职跟踪记录。
    请求体：{ user_id, job_id, job_title, company_name, apply_date, source }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        job_id = body.get("job_id")
        job_title = body.get("job_title")
        company_name = body.get("company_name")
        apply_date = body.get("apply_date") or datetime.now().strftime("%Y-%m-%d")
        source = body.get("source") or "system_recommend"

        if not user_id:
            return _error(400, "请提供 user_id")
        if not job_id:
            return _error(400, "请提供 job_id")
        if not job_title:
            return _error(400, "请提供 job_title")
        if not company_name:
            return _error(400, "请提供 company_name")

        store = _load_records()
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
        record_id = f"track_{ts}_{user_id}"

        record = {
            "record_id": record_id,
            "user_id": user_id,
            "job_id": job_id,
            "job_title": job_title,
            "company_name": company_name,
            "apply_date": apply_date,
            "source": source,
            "current_stage": "applied",
            "result": "pending",
            "created_at": _now_str(),
            "updated_at": _now_str(),
            "timeline": [
                {
                    "stage": "applied",
                    "result": "pending",
                    "stage_date": apply_date,
                    "notes": body.get("notes", "")
                }
            ],
            "has_failure_report": False,
        }

        store[record_id] = record
        _save_records(store)

        logger.info(f"[Tracking] 创建求职跟踪记录 record_id={record_id}, user_id={user_id}, job_id={job_id}")
        return _success(
            {
                "record_id": record_id,
                "status": "applied",
                "created_at": record["created_at"],
            },
            msg="跟踪记录已创建",
        )
    except Exception as e:
        logger.error(f"[API] /tracking/record/create 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.2 更新求职进展
# ============================================================

@tracking_bp.route("/record/<record_id>/update", methods=["PUT"])
def update_record(record_id: str):
    """
    学生录入求职各阶段的进展与反馈，包括笔试成绩、面试评价、最终结果等。
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        if not user_id:
            return _error(400, "请提供 user_id")

        store = _load_records()
        record = store.get(record_id)
        if not record:
            return _error(404, f"记录不存在: {record_id}")
        if int(record.get("user_id")) != int(user_id):
            return _error(403, "无权操作该记录")

        stage = body.get("stage") or "applied"
        result = body.get("result") or "pending"
        stage_date = body.get("stage_date") or datetime.now().strftime("%Y-%m-%d")
        self_eval = body.get("self_evaluation") or {}
        notes = body.get("notes") or ""

        timeline_entry = {
            "stage": stage,
            "result": result,
            "stage_date": stage_date,
            "self_evaluation": self_eval,
            "notes": notes,
        }
        record.setdefault("timeline", []).append(timeline_entry)
        record["current_stage"] = stage
        record["result"] = result
        record["updated_at"] = _now_str()

        # 简单 Agent 提示：基于结果和自评弱项生成一句话建议
        agent_tip = ""
        weak_points = self_eval.get("weak_points") or []
        strong_points = self_eval.get("strong_points") or []
        if result == "passed":
            if weak_points:
                agent_tip = f"{stage} 通过，做得不错！后续可以重点优化：{weak_points[0]}"
            elif strong_points:
                agent_tip = f"{stage} 通过，恭喜！保持你的优势：{strong_points[0]}"
            else:
                agent_tip = f"{stage} 通过，继续保持良好状态。"
        elif result == "failed":
            if weak_points:
                agent_tip = f"{stage} 未通过，关键短板在：{weak_points[0]}，建议有针对性地复盘并补强。"
            else:
                agent_tip = f"{stage} 未通过，建议结合题目与面试官反馈做一次详细复盘。"
        else:
            agent_tip = "进展已记录，保持节奏，注意整理每一轮的复盘笔记。"

        store[record_id] = record
        _save_records(store)

        logger.info(f"[Tracking] 更新求职进展 record_id={record_id}, stage={stage}, result={result}")
        return _success(
            {
                "record_id": record_id,
                "current_stage": stage,
                "result": result,
                "agent_tip": agent_tip,
            },
            msg="进展已更新",
        )
    except Exception as e:
        logger.error(f"[API] /tracking/record/{record_id}/update 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.3 求职失败反馈分析（SSE）
# ============================================================

@tracking_bp.route("/record/<record_id>/failure-analysis", methods=["POST"])
def failure_analysis(record_id: str):
    """
    当求职结果为失败/拒绝时，Agent 自动分析失败原因并生成复盘报告 + 更新规划。
    此处采用简化版实现：基于记录和反馈拼装报告，并以 SSE 形式分块返回。
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        final_stage = body.get("final_stage") or "final"
        final_result = body.get("final_result") or "rejected"
        rejection_feedback = body.get("rejection_feedback") or ""

        if not user_id:
            return _error(400, "请提供 user_id")

        records = _load_records()
        record = records.get(record_id)
        if not record:
            return _error(404, f"记录不存在: {record_id}")
        if int(record.get("user_id")) != int(user_id):
            return _error(403, "无权操作该记录")

        if final_result != "rejected":
            return _error(400, "仅在最终结果为 rejected 时才需要失败分析")

        failure_reports = _load_failure_reports()
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
        report_id = f"failure_report_{ts}_{user_id}"

        job_title = record.get("job_title", "")
        company = record.get("company_name", "")

        # 构造简化分析内容（非流式LLM），按 API 文档的结构切块返回
        def event_stream():
            # analyzing 阶段
            yield "event: analyzing\n"
            yield 'data: {"description": "正在对比你的能力画像与该岗位的实际要求差距..."}\n\n'
            time.sleep(0.2)
            yield "event: analyzing\n"
            yield 'data: {"description": "正在分析你在各面试阶段的表现数据..."}\n\n'
            time.sleep(0.2)

            # 复盘报告主体（两段）
            header = {
                "chunk": f"## 本次求职复盘报告\\n\\n**岗位**：{job_title}（{company}）\\n**失败阶段**：{final_stage}\\n"
            }
            yield "event: report_chunk\n"
            yield f"data: {json.dumps(header, ensure_ascii=False)}\n\n"

            reasons_lines = [
                "**核心原因分析**：",
                "",
            ]
            if rejection_feedback:
                reasons_lines.append(f"- 面试/HR 反馈：{rejection_feedback}")
            reasons = {
                "chunk": "\\n".join(reasons_lines) + "\\n"
            }
            yield "event: report_chunk\n"
            yield f"data: {json.dumps(reasons, ensure_ascii=False)}\n\n"

            # 新规划建议
            plan_lines = [
                "## 更新后的求职规划",
                "",
                "**短期（1个月）**：",
                "- 针对本次面试暴露的关键短板（如产品sense不足、商业敏感度不够等），整理 3–5 个典型问题并准备高质量回答。",
                "- 至少完成 1 次模拟面试或面试题复盘，将易错点记录在案。",
                "",
                "**中期（2–3个月）**：",
                "- 参与 1 个与目标岗位高度相关的项目实践（如校内项目、开源贡献、产品Demo）。",
                "- 根据复盘结论，调整目标岗位类型或级别（例如先从助理 / 初级岗位切入）。",
            ]
            plan_chunk = {"chunk": "\\n".join(plan_lines) + "\\n"}
            yield "event: new_plan_chunk\n"
            yield f"data: {json.dumps(plan_chunk, ensure_ascii=False)}\n\n"

            # 保存失败报告摘要
            failure_reports[report_id] = {
                "report_id": report_id,
                "user_id": user_id,
                "record_id": record_id,
                "job_title": job_title,
                "company_name": company,
                "failure_stage": final_stage,
                "key_weakness": rejection_feedback or "待总结",
                "plan_updated": True,
                "created_at": _now_str(),
            }
            _save_failure_reports(failure_reports)

            # 标记记录已有关联失败报告
            record["has_failure_report"] = True
            record["updated_at"] = _now_str()
            records[record_id] = record
            _save_records(records)

            done_payload = {"report_id": report_id, "plan_updated": True}
            yield "event: done\n"
            yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

        return Response(event_stream(), mimetype="text/event-stream")

    except Exception as e:
        logger.error(f"[API] /tracking/record/{record_id}/failure-analysis 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.4 获取求职跟踪总览
# ============================================================

@tracking_bp.route("/overview", methods=["GET"])
def tracking_overview():
    """
    获取用户所有求职记录的总览，包含各阶段统计与成功率分析。
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return _error(400, "请提供 user_id")

        records = _load_records()
        user_records = [r for r in records.values() if str(r.get("user_id")) == str(user_id)]

        total_applied = len(user_records)
        written_pass = 0
        written_total = 0
        interview_pass = 0
        interview_total = 0
        offer_count = 0
        rejected_count = 0
        in_progress = 0

        overview_records = []
        for r in user_records:
            current_stage = r.get("current_stage") or "applied"
            result = r.get("result") or "pending"
            if result == "offer":
                offer_count += 1
            elif result == "rejected":
                rejected_count += 1
            elif result in ("pending", "in_progress"):
                in_progress += 1

            # 统计笔试 / 面试通过率（基于时间线）
            for t in r.get("timeline", []):
                stg = t.get("stage")
                res = t.get("result")
                if stg == "written_test":
                    written_total += 1
                    if res == "passed":
                        written_pass += 1
                if stg and stg.startswith("interview"):
                    interview_total += 1
                    if res == "passed":
                        interview_pass += 1

            overview_records.append(
                {
                    "record_id": r.get("record_id"),
                    "job_title": r.get("job_title"),
                    "company_name": r.get("company_name"),
                    "current_stage": current_stage,
                    "last_updated": r.get("updated_at") or r.get("created_at"),
                    "has_failure_report": bool(r.get("has_failure_report")),
                }
            )

        written_rate = (written_pass / written_total) if written_total > 0 else 0.0
        interview_rate = (interview_pass / interview_total) if interview_total > 0 else 0.0

        # 简单 Agent 洞察
        if total_applied == 0:
            agent_insight = "你还没有开始任何求职记录，可以先从系统推荐的岗位里选择 1–2 个作为起点。"
        else:
            agent_insight = (
                f"根据你的求职数据，你的简历通过率约为 {written_rate:.0%}，"
                f"面试轮次通过率约为 {interview_rate:.0%}。"
            )
            if interview_rate < 0.5 and written_rate >= 0.6:
                agent_insight += " 终面转化率相对偏低，建议重点加强面试表现与案例准备。"

        summary = {
            "total_applied": total_applied,
            "written_test_pass_rate": round(written_rate, 2),
            "interview_pass_rate": round(interview_rate, 2),
            "offer_count": offer_count,
            "rejected_count": rejected_count,
            "in_progress_count": in_progress,
        }

        data = {
            "summary": summary,
            "records": overview_records,
            "agent_insight": agent_insight,
        }
        return _success(data)
    except Exception as e:
        logger.error(f"[API] /tracking/overview 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.5 获取反馈优化报告列表
# ============================================================

@tracking_bp.route("/failure-reports", methods=["GET"])
def list_failure_reports():
    """
    获取某个用户的所有失败复盘报告（分页）
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return _error(400, "请提供 user_id")

        page = int(request.args.get("page", "1") or "1")
        size = int(request.args.get("size", "10") or "10")
        if page < 1:
            page = 1
        if size < 1 or size > 50:
            size = 10

        store = _load_failure_reports()
        all_reports = [r for r in store.values() if str(r.get("user_id")) == str(user_id)]
        all_reports.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        total = len(all_reports)
        start = (page - 1) * size
        end = start + size
        subset = all_reports[start:end]

        return _success(
            {
                "total": total,
                "list": subset,
            }
        )
    except Exception as e:
        logger.error(f"[API] /tracking/failure-reports 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")

