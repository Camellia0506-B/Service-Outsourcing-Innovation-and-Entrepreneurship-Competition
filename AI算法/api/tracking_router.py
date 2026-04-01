"""
Career Tracking 模块 API 路由
对应 API 文档第 9 章：规划落地性跟踪模块

路由列表：
  POST /api/v1/tracking/record/create              - 9.1 创建求职闭环记录
  PUT  /api/v1/tracking/record/<record_id>/update  - 9.2 更新求职进展
  POST /api/v1/tracking/record/<record_id>/failure-analysis - 9.3 求职失败反馈分析（SSE）
  GET  /api/v1/tracking/overview                   - 9.4 获取求职闭环总览
  GET  /api/v1/tracking/failure-reports            - 9.5 获取反馈优化报告列表
  DELETE /api/v1/tracking/failure-reports/<report_id> - 删除一条反馈优化报告
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Any

from flask import Blueprint, request, jsonify, Response

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from model.factory import chat_model

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
# 9.1 创建求职闭环记录
# ============================================================

@tracking_bp.route("/record/create", methods=["POST"])
def create_record():
    """
    学生开始投递某个推荐岗位后，创建该岗位的求职闭环记录。
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
        if not job_title:
            return _error(400, "请提供 job_title")
        if not company_name:
            return _error(400, "请提供 company_name")

        if not job_id:
            job_id = f"job_manual_{datetime.now().strftime('%Y%m%d%H%M%S')}"
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

        logger.info(f"[Tracking] 创建求职闭环记录 record_id={record_id}, user_id={user_id}, job_id={job_id}")
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
        stage_notes = body.get("stage_notes") or {}

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
        # 分阶段备注：前端按 { applied / written_test / interview / offer } 结构传入
        if isinstance(stage_notes, dict):
            existing = record.get("stage_notes") or {}
            if isinstance(existing, dict):
                existing.update(stage_notes)
                record["stage_notes"] = existing
            else:
                record["stage_notes"] = stage_notes

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
        # 以 record_id 作为主键，保证每条记录有一份独立报告（多次分析则更新同一条）
        report_id = f"failure_report_{record_id}"

        job_title = record.get("job_title", "")
        company = record.get("company_name", "")
        stage_notes = record.get("stage_notes") or {}

        # 从阶段备注中提炼一段摘要，尽量保证不同记录的分析文本不相同
        def _short(text: str, limit: int = 80) -> str:
            if not text:
                return ""
            s = str(text).strip().replace("\n", " ")
            return s if len(s) <= limit else s[: limit] + "…"

        rejected_note = _short(stage_notes.get("rejected") or "")
        final_note = _short(stage_notes.get("final") or "")
        interview_notes = [
            _short(stage_notes.get("interview_1") or ""),
            _short(stage_notes.get("interview_2") or ""),
        ]
        interview_notes = [n for n in interview_notes if n]
        written_note = _short(stage_notes.get("written_test") or "")
        applied_note = _short(stage_notes.get("applied") or "")

        # 尝试调用大模型，基于阶段备注生成个性化复盘（失败时回退到模板逻辑）
        llm_markdown = None
        try:
            # 将阶段备注整理成可读文本，方便 LLM 引用具体细节
            notes_summary_lines = []
            if applied_note:
                notes_summary_lines.append(f"- 投递阶段备注：{applied_note}")
            if written_note:
                notes_summary_lines.append(f"- 笔试阶段备注：{written_note}")
            if interview_notes:
                notes_summary_lines.append(f"- 面试阶段备注：{'；'.join(interview_notes)}")
            if final_note:
                notes_summary_lines.append(f"- HR 面阶段备注：{final_note}")
            if rejected_note:
                notes_summary_lines.append(f"- 淘汰备注：{rejected_note}")
            if rejection_feedback:
                notes_summary_lines.append(f"- 面试官/HR 明确反馈：{rejection_feedback}")

            notes_block = "\n".join(notes_summary_lines) if notes_summary_lines else "（学生未填写任何阶段备注，仅有岗位与失败阶段信息。）"

            prompt = f"""
你是一名资深求职教练，请根据下面的求职记录做一次失败复盘，并输出 Markdown 文本。

【岗位信息】
- 公司：{company or "（未知公司）"}
- 岗位：{job_title or "（未知岗位）"}
- 最终失败阶段：{final_stage}

【学生阶段性备注与反馈】
{notes_block}

请严格按照下面结构输出（使用中文）：

## 技能 Gap
- 从上述备注中提炼出 5～10 条「与该岗位技能要求相关的关键差距」，每条尽量具体，指向某个知识点或实践薄弱点。
- 避免空泛话术（如“多刷题”“多投简历”），要结合备注里的具体内容来分析。

## 简历优化点
- 从备注中结合岗位信息，给出 5～10 条「如何修改简历/项目描述」的建议。
- 建议要围绕该岗位的核心要求，例如如何突出相关项目、量化成果、补充缺失的经历。

## 面试准备建议
- 从备注中暴露的问题出发，总结 5～10 条「下一次面试如何改进」的建议。
- 建议要可执行，例如需要准备哪些高频问题、如何复盘失败问题、如何补充案例。

要求：
- 只输出上述三个一级标题及对应的无序列表内容，不要再加多余说明。
- 每条建议前用 "-" 开头。
"""
            response = chat_model.invoke(prompt)
            llm_markdown = getattr(response, "content", None) or str(response)
        except Exception as e:
            logger.error(f"[Tracking] LLM 生成失败复盘报告失败，将回退到模板内容: {e}", exc_info=True)
            llm_markdown = None

        # 构造 SSE 流响应：优先使用 LLM 结果，失败时回退到原有模板
        def event_stream():
            # analyzing 阶段
            yield "event: analyzing\n"
            yield 'data: {"description": "正在对比你的能力画像与该岗位的实际要求差距..."}\n\n'
            time.sleep(0.2)
            yield "event: analyzing\n"
            yield 'data: {"description": "正在分析你在各面试阶段的表现数据..."}\n\n'
            time.sleep(0.2)

            if llm_markdown:
                # 直接将 LLM 生成的 Markdown 作为整份复盘报告流式返回
                chunk = {"chunk": llm_markdown}
                yield "event: report_chunk\n"
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            else:
                # 回退：使用原有的模板化内容（保证功能可用）
                header_lines = [
                    "## 本次求职复盘报告",
                    "",
                    f"**岗位**：{job_title}（{company}）",
                    f"**失败阶段**：{final_stage}",
                ]
                header = {"chunk": "\\n".join(header_lines) + "\\n"}
                yield "event: report_chunk\n"
                yield f"data: {json.dumps(header, ensure_ascii=False)}\n\n"

                reasons_lines = ["**核心原因分析**：", ""]
                if rejection_feedback:
                    reasons_lines.append(f"- 面试/HR 反馈：{rejection_feedback}")
                if rejected_note:
                    reasons_lines.append(f"- 淘汰备注关键点：{rejected_note}")
                if final_note:
                    reasons_lines.append(f"- HR 面阶段记录：{final_note}")
                if written_note:
                    reasons_lines.append(f"- 笔试阶段记录：{written_note}")
                if interview_notes:
                    reasons_lines.append(f"- 面试表现记录：{'；'.join(interview_notes)}")
                if len(reasons_lines) <= 2:
                    reasons_lines.append("- 当前系统尚未捕获到明确的失败原因，请结合自己的复盘备注补充。")
                reasons = {
                    "chunk": "\\n".join(reasons_lines) + "\\n"
                }
                yield "event: report_chunk\n"
                yield f"data: {json.dumps(reasons, ensure_ascii=False)}\n\n"

                plan_lines = [
                    "## 更新后的求职规划",
                    "",
                    "**短期（1个月）**：",
                    "- 针对本次失败阶段中暴露出来的关键短板，结合上方复盘要点，整理 3–5 个典型问题并准备高质量回答。",
                    "- 至少完成 1 次模拟面试或面试题复盘，将易错点记录在案，并补充到淘汰备注中。",
                    "",
                    "**中期（2–3个月）**：",
                    "- 参与 1 个与该岗位高度相关的项目实践（如校内项目、开源贡献、业务侧小项目），把这次失败中暴露的短板补齐。",
                    "- 根据复盘结论，必要时调整目标公司或岗位级别（例如先从实习 / 初级岗位切入，再向上跳）。",
                ]
                plan_chunk = {"chunk": "\\n".join(plan_lines) + "\\n"}
                yield "event: new_plan_chunk\n"
                yield f"data: {json.dumps(plan_chunk, ensure_ascii=False)}\n\n"

            # 保存失败报告摘要（按 record_id 聚合，一条记录对应一份报告，多次分析覆盖更新）
            key_weakness_parts = []
            if rejection_feedback:
                key_weakness_parts.append(rejection_feedback)
            if rejected_note:
                key_weakness_parts.append(f"淘汰备注：{rejected_note}")
            if written_note:
                key_weakness_parts.append(f"笔试：{written_note}")
            if interview_notes:
                key_weakness_parts.append(f"面试：{'；'.join(interview_notes)}")
            key_weakness = " | ".join(key_weakness_parts) if key_weakness_parts else "待总结"

            failure_reports[report_id] = {
                "report_id": report_id,
                "user_id": user_id,
                "record_id": record_id,
                "job_title": job_title,
                "company_name": company,
                "failure_stage": final_stage,
                "key_weakness": key_weakness,
                "plan_updated": True,
                "created_at": failure_reports.get(report_id, {}).get("created_at") or _now_str(),
                "updated_at": _now_str(),
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
# 9.4 获取求职闭环总览
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
        offer_count = 0
        rejected_count = 0
        in_progress = 0
        rejected_at_applied_only = 0  # 仅在投递阶段被淘汰（从未进入笔试）
        # 面试通过率：按岗位算。进入面试阶段的岗位数（一面/二面/HR面任一）为分母，拿到 Offer 的岗位数为分子
        interview_stage_records = 0  # 进入过面试阶段的岗位数

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

            # 时间线里出现过的阶段
            stages_in_record = {t.get("stage") for t in r.get("timeline", [])}
            stages_in_record.add(current_stage)
            has_written = "written_test" in stages_in_record

            # 仅在投递阶段被淘汰：淘汰且从未进入笔试
            if result == "rejected" and not has_written:
                rejected_at_applied_only += 1

            # 是否进入过面试阶段（进入面试 = 笔试通过，用于算 笔试通过率 = 面试人数/笔试人数）
            if any(s in stages_in_record for s in ("interview_1", "interview_2", "final", "offer")):
                interview_stage_records += 1

            overview_records.append(
                {
                    "record_id": r.get("record_id"),
                    "job_title": r.get("job_title"),
                    "company_name": r.get("company_name"),
                    "current_stage": current_stage,
                    "apply_date": r.get("apply_date"),
                    "last_updated": r.get("updated_at") or r.get("created_at"),
                    "stage_notes": r.get("stage_notes") or {},
                    "has_failure_report": bool(r.get("has_failure_report")),
                }
            )

        # 进入笔试人数 = 投递总数 - 仅在投递阶段被淘汰数（例如投 6 份、1 份投递阶段淘汰 → 5 个进入笔试）
        written_total = max(0, total_applied - rejected_at_applied_only)
        # 笔试通过率 = 进入面试人数 / 进入笔试人数
        written_rate = (interview_stage_records / written_total) if written_total > 0 else 0.0
        # 面试通过率 = 拿到 Offer 的岗位数 / 进入面试阶段的岗位数（每个岗位有 3 轮面试，按岗位整体算）
        interview_rate = (offer_count / interview_stage_records) if interview_stage_records > 0 else 0.0

        # 简单 Agent 洞察：笔试通过率 = 参加过笔试且通过的比例，与「简历通过」区分（仅投递就淘汰的不算进笔试）
        if total_applied == 0:
            agent_insight = "你还没有开始任何求职记录，可以先从系统推荐的岗位里选择 1–2 个作为起点。"
        else:
            agent_insight = (
                f"根据你的求职数据，你的笔试通过率约为 {written_rate:.0%}，"
                f"面试通过率（进入面试→拿到 Offer）约为 {interview_rate:.0%}。"
            )
            if interview_rate < 0.5 and written_rate >= 0.6:
                agent_insight += " 终面转化率相对偏低，建议重点加强面试表现与案例准备。"

        summary = {
            "total_applied": total_applied,
            "written_test_pass_rate": round(written_rate, 2),
            "written_total": written_total,  # 进入笔试的人数（仅 timeline 有 written_test 的才计）
            "interview_stage_count": interview_stage_records,  # 进入面试阶段的岗位数
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


# ============================================================
# 9.5.1 删除一条反馈优化报告
# ============================================================


@tracking_bp.route("/failure-reports/<report_id>", methods=["DELETE"])
def delete_failure_report(report_id: str):
    """
    删除当前用户的一条失败复盘报告。
    请求体 JSON：{ "user_id": ... }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        if not user_id:
            return _error(400, "请提供 user_id")

        store = _load_failure_reports()
        report = store.get(report_id)
        if not report:
            return _error(404, f"报告不存在: {report_id}")
        if str(report.get("user_id")) != str(user_id):
            return _error(403, "无权操作该报告")

        record_id = report.get("record_id")
        store.pop(report_id, None)
        _save_failure_reports(store)

        if record_id:
            records = _load_records()
            rec = records.get(record_id)
            if rec and str(rec.get("user_id")) == str(user_id):
                rec["has_failure_report"] = False
                records[record_id] = rec
                _save_records(records)

        logger.info(f"[Tracking] 删除反馈报告 report_id={report_id}, user_id={user_id}")
        return _success(msg="报告已删除")
    except Exception as e:
        logger.error(f"[API] DELETE /tracking/failure-reports/{report_id} 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.6 保存失败分析为报告
# ============================================================

@tracking_bp.route("/failure-reports/save", methods=["POST"])
def save_failure_report():
    """
    将某条失败记录的分析结果保存为复盘报告，写入 failure_reports.json。
    请求体：{ user_id, record_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        record_id = body.get("record_id")
        if not user_id or not record_id:
            return _error(400, "请提供 user_id 和 record_id")

        records = _load_records()
        record = records.get(record_id)
        if not record:
            return _error(404, f"记录不存在: {record_id}")
        if int(record.get("user_id")) != int(user_id):
            return _error(403, "无权操作该记录")

        # 失败分析结果通常保存在 failure_reports.json 中，此处简单生成一条基础报告
        store = _load_failure_reports()
        now_str = _now_str()
        report_id = f"failure_report_{record_id}"

        report = store.get(report_id) or {}
        report.update(
            {
                "report_id": report_id,
                "user_id": user_id,
                "record_id": record_id,
                "job_title": record.get("job_title"),
                "company_name": record.get("company_name"),
                "failure_stage": record.get("current_stage"),
                "key_weakness": "",  # 具体弱项由前端/后续分析填充，这里先留空
                "plan_updated": False,
                "created_at": report.get("created_at") or now_str,
                "updated_at": now_str,
            }
        )
        store[report_id] = report
        _save_failure_reports(store)

        # 标记该记录已有失败报告
        record["has_failure_report"] = True
        records[record_id] = record
        _save_records(records)

        return _success(report, msg="失败报告已保存")
    except Exception as e:
        logger.error(f"[API] /tracking/failure-reports/save 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")


# ============================================================
# 9.7 删除求职闭环记录
# ============================================================

@tracking_bp.route("/record/<record_id>/delete", methods=["DELETE"])
def delete_record(record_id: str):
    """
    删除当前用户的一条求职闭环记录。
    前端按约定以 JSON 方式传入 { user_id }。
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        if not user_id:
            return _error(400, "请提供 user_id")

        records = _load_records()
        record = records.get(record_id)
        if not record:
            return _error(404, f"记录不存在: {record_id}")
        if str(record.get("user_id")) != str(user_id):
            return _error(403, "无权操作该记录")

        # 从存储中移除该记录
        records.pop(record_id, None)
        _save_records(records)

        logger.info(f"[Tracking] 删除求职记录 record_id={record_id}, user_id={user_id}")
        return _success(msg="记录已删除")
    except Exception as e:
        logger.error(f"[API] /tracking/record/{record_id}/delete 异常: {e}", exc_info=True)
        return _error(500, f"服务器内部错误: {e}")

