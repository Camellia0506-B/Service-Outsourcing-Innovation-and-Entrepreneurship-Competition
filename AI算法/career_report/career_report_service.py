"""
职业规划报告模块 - 服务层
与测评报告打通：基于测评报告转换为职业规划报告格式（section_1~4, summary, metadata），
支持编辑持久化、完整性检查等。
"""

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.prompts import PromptTemplate
from langchain_community.chat_models import ChatTongyi
from langchain_core.output_parsers import StrOutputParser

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from utils.yaml_config import get_yaml_config


# 配置读取
config = get_yaml_config()
rag_conf = config.get("rag", {})

# ===================================================
# 模型调用
# ===================================================
def get_chat_model():
    """获取通义大模型实例"""
    model_name = rag_conf.get("chat_model_name", "qwen3-max")
    return ChatTongyi(model=model_name)

# 缓存模型实例
_chat_model = None

def _get_model():
    """获取模型实例（单例模式）"""
    global _chat_model
    if _chat_model is None:
        _chat_model = get_chat_model()
    return _chat_model

def _build_career_chain():
    """构建职业规划生成链"""
    prompt_text = """
你是一位专业的职业规划顾问，擅长根据用户的测评结果生成个性化的职业规划建议。

请根据以下用户信息，为用户生成个性化的：
1. 行动计划（短期和中期）
2. 评估调整机制
3. 痛点解决方案

用户信息：
- 报告ID: {report_id}
- 用户ID: {user_id}
- 兴趣分析: {interest_analysis}
- 性格分析: {personality_analysis}
- 能力分析: {ability_analysis}
- 推荐职业: {recommended_careers}
- 当前时间: {current_time}

要求：
1. 生成的内容要与用户的具体情况相符，不要泛泛而谈
2. 行动计划要具体可行，包含时间节点和可衡量的目标
3. 评估调整机制要合理，包含不同时间周期的评估内容
4. 痛点解决方案要针对用户可能面临的具体问题
5. 输出格式为JSON，包含以下字段：
   - action_plan: 包含short_term_plan和mid_term_plan
   - evaluation: 包含evaluation_system和adjustment_scenarios
   - pain_points: 包含identified_risks和contingency_plans

JSON输出：
"""
    template = PromptTemplate.from_template(prompt_text)
    return template | _get_model() | StrOutputParser()

def generate_personalized_content(report_id: str, user_id: int, assessment_report: dict) -> dict:
    """生成个性化的职业规划内容"""
    try:
        interest = assessment_report.get("interest_analysis", {})
        personality = assessment_report.get("personality_analysis", {})
        ability = assessment_report.get("ability_analysis", {})
        comp = assessment_report.get("comprehensive_recommendation", {})
        careers = comp.get("recommended_careers") or comp.get("careers") or []
        
        chain = _build_career_chain()
        raw_output = chain.invoke({
            "report_id": report_id,
            "user_id": user_id,
            "interest_analysis": json.dumps(interest, ensure_ascii=False),
            "personality_analysis": json.dumps(personality, ensure_ascii=False),
            "ability_analysis": json.dumps(ability, ensure_ascii=False),
            "recommended_careers": json.dumps(careers, ensure_ascii=False),
            "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        
        # 解析JSON
        content = raw_output if isinstance(raw_output, str) else getattr(raw_output, "content", str(raw_output))
        print("=== qwen生成个性化内容 ===")
        print(content)
        print("========================")
        
        # 提取JSON
        try:
            result = json.loads(content)
        except Exception:
            # 尝试提取JSON部分
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = {}
        
        return result
    except Exception as e:
        logger.error(f"生成个性化内容失败: {e}")
        return {}

def _career_edits_path() -> str:
    p = get_abs_path("data/career_report/edits.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def _load_edits() -> Dict[str, Dict[str, Any]]:
    path = _career_edits_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_edits(edits_store: Dict[str, Dict[str, Any]]) -> None:
    path = _career_edits_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(edits_store, f, ensure_ascii=False, indent=2)


def _path_parts(path: str) -> List[tuple]:
    """解析路径为 (key, index?) 列表，如 monthly_plans[0] -> ('monthly_plans', 0)"""
    out = []
    for segment in path.split("."):
        segment = segment.strip()
        if not segment:
            continue
        m = re.match(r"^([^\[]+)\[(\d+)\]$", segment)
        if m:
            out.append((m.group(1), int(m.group(2))))
        else:
            out.append((segment, None))
    return out


def _set_by_path(obj: dict, path: str, value: Any) -> None:
    """按路径设置值，如 section_3_action_plan.short_term_plan.monthly_plans[0].tasks[0].时间投入"""
    parts = _path_parts(path)
    if not parts:
        return
    current = obj
    for i, (key, idx) in enumerate(parts[:-1]):
        if idx is not None:
            if key not in current:
                current[key] = []
            while len(current[key]) <= idx:
                current[key].append({})
            current = current[key][idx]
        else:
            if key not in current:
                current[key] = {}
            current = current[key]
    last_key, last_idx = parts[-1]
    if last_idx is not None:
        if last_key not in current:
            current[last_key] = []
        while len(current[last_key]) <= last_idx:
            current[last_key].append({})
        current[last_key][last_idx] = value
    else:
        current[last_key] = value


def _default_career_report_structure(user_id: int, report_id: str, created_at: str) -> dict:
    """返回符合 API 文档的职业规划报告骨架（含 section_1~4, summary, metadata）"""
    return {
        "report_id": report_id,
        "user_id": user_id,
        "generated_at": created_at,
        "status": "completed",
        "metadata": {
            "version": "v1.0",
            "ai_model": "assessment-report",
            "confidence_score": 0.88,
            "completeness": 85,
        },
        "section_1_job_matching": {
            "title": "职业探索与岗位匹配",
            "self_assessment": {
                "strengths": ["学习能力强", "逻辑思维突出", "有项目经验"],
                "interests": ["对技术有浓厚兴趣", "喜欢解决复杂问题"],
                "values": ["重视技术成长", "追求工作成就感"],
            },
            "recommended_careers": [
                {
                    "career": "算法工程师",
                    "match_score": 88,
                    "match_analysis": {
                        "why_suitable": ["兴趣与岗位契合", "学习能力适合算法领域"],
                        "capability_match": {"professional_skills": {"score": 85, "description": "技术栈匹配"}, "soft_skills": {"score": 82, "description": "软技能良好"}},
                        "gaps_and_solutions": [{"gap": "可补充大数据经验", "solution": "学习 Spark 等", "priority": "中", "timeline": "2-3个月"}],
                    },
                    "market_outlook": {"demand": "高", "growth_trend": "上升", "salary_range": "15k-25k（应届）", "key_trends": ["大模型应用", "AI 垂直落地"]},
                },
            ],
            "career_choice_advice": {
                "primary_recommendation": "算法工程师",
                "reasons": ["与兴趣能力契合", "市场需求旺"],
                "alternative_option": "后端开发工程师",
                "risk_mitigation": "可同时关注后端技能",
            },
        },
        "section_2_career_path": {
            "title": "职业目标设定与职业路径规划",
            "short_term_goal": {"timeline": "1年内", "primary_goal": "成功入职目标岗位", "specific_targets": [{"target": "获得 offer", "metrics": "2+ offer", "deadline": "6个月内"}]},
            "mid_term_goal": {"timeline": "3-5年", "primary_goal": "成长为中高级工程师", "specific_targets": []},
            "career_roadmap": {"path_type": "技术路线", "stages": [{"stage": "初级", "period": "1-2年", "key_responsibilities": [], "success_criteria": []}, {"stage": "中级", "period": "2-3年", "key_responsibilities": [], "success_criteria": []}], "alternative_paths": []},
            "industry_trends": {"current_status": "需求旺盛", "key_trends": [], "5_year_outlook": "技术+业务复合型"},
        },
        "section_3_action_plan": {
            "title": "行动计划与成果展示",
            "short_term_plan": {"period": "6个月", "goal": "补齐短板冲刺 offer", "monthly_plans": [{"month": "第1-2月", "focus": "技能提升", "tasks": [], "milestone": ""}]},
            "mid_term_plan": {"period": "1-3年", "goal": "从初级到中高级", "yearly_plans": []},
            "learning_path": {"technical_skills": [], "soft_skills": []},
            "achievement_showcase": {"portfolio_building": {"github": {"goal": "", "actions": []}, "technical_blog": {"goal": "", "actions": []}, "competitions": {"goal": "", "actions": []}}},
        },
        "section_4_evaluation": {
            "title": "评估周期与动态调整",
            "evaluation_system": {"monthly_review": {"frequency": "每月1次", "review_items": [], "adjustment_triggers": []}, "quarterly_review": {"frequency": "每季度1次", "review_items": [], "key_questions": []}, "annual_review": {"frequency": "每年1次", "review_items": []}},
            "adjustment_scenarios": [],
            "risk_management": {"identified_risks": [], "contingency_plans": []},
        },
        "summary": {
            "key_takeaways": ["基于测评你适合技术方向", "短期以求职与技能提升为主", "中长期可走技术专家路线"],
            "next_steps": ["完成能力画像与岗位匹配", "制定 3 个月学习计划", "开始投递与面试准备"],
            "motivational_message": "基于测评结果，你已具备较好的技术倾向与学习能力，持续行动即可逐步达成目标。",
        },
    }


def transform_assessment_to_career(assessment_report: dict, report_id: str, user_id: int) -> dict:
    """
    将测评报告转换为职业规划报告格式（含 section_1_job_matching 等），
    便于前端统一按 7.2 响应结构渲染。
    """
    created = assessment_report.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    base = _default_career_report_structure(user_id, report_id, created)

    interest = assessment_report.get("interest_analysis") or {}
    primary = interest.get("primary_interest") or {}
    personality = assessment_report.get("personality_analysis") or {}
    ability = assessment_report.get("ability_analysis") or {}
    comp = assessment_report.get("comprehensive_recommendation") or {}

    # section_1: 从兴趣、能力、综合建议填充
    s1 = base["section_1_job_matching"]
    s1["self_assessment"]["strengths"] = [x.get("description", x.get("ability", "")) for x in (ability.get("strengths") or [])][:5] or s1["self_assessment"]["strengths"]
    s1["self_assessment"]["interests"] = [primary.get("description", "") or f"主要兴趣：{primary.get('type', '')}"][:3] or s1["self_assessment"]["interests"]
    careers = comp.get("recommended_careers") or comp.get("careers") or []
    if isinstance(careers, list) and careers:
        s1["recommended_careers"] = []
        for c in careers[:5]:
            if isinstance(c, dict):
                s1["recommended_careers"].append({
                    "career": c.get("career") or c.get("name") or "技术岗位",
                    "match_score": c.get("match_score") or c.get("score") or primary.get("score") or 85,
                    "match_analysis": c.get("match_analysis") or {"why_suitable": [], "capability_match": {}, "gaps_and_solutions": []},
                    "market_outlook": c.get("market_outlook") or {"demand": "高", "growth_trend": "上升", "salary_range": "15k-25k", "key_trends": []},
                })
            else:
                s1["recommended_careers"].append({"career": str(c), "match_score": 85, "match_analysis": {}, "market_outlook": {}})
    if not s1["recommended_careers"]:
        s1["recommended_careers"] = base["section_1_job_matching"]["recommended_careers"]
    s1["career_choice_advice"]["primary_recommendation"] = (s1["recommended_careers"][0].get("career") if s1["recommended_careers"] else "") or "技术岗位"
    s1["career_choice_advice"]["reasons"] = comp.get("reasons") or s1["career_choice_advice"]["reasons"]

    # 生成个性化内容：行动计划、评估调整、痛点解决方案
    personalized_content = generate_personalized_content(report_id, user_id, assessment_report)
    
    # section_3: 行动计划与成果展示
    s3 = base["section_3_action_plan"]
    if "action_plan" in personalized_content:
        action_plan = personalized_content["action_plan"]
        if "short_term_plan" in action_plan:
            s3["short_term_plan"] = action_plan["short_term_plan"]
        if "mid_term_plan" in action_plan:
            s3["mid_term_plan"] = action_plan["mid_term_plan"]
    
    # section_4: 评估周期与动态调整
    s4 = base["section_4_evaluation"]
    if "evaluation" in personalized_content:
        evaluation = personalized_content["evaluation"]
        if "evaluation_system" in evaluation:
            s4["evaluation_system"] = evaluation["evaluation_system"]
        if "adjustment_scenarios" in evaluation:
            s4["adjustment_scenarios"] = evaluation["adjustment_scenarios"]
    
    # 添加痛点解决方案
    if "pain_points" in personalized_content:
        pain_points = personalized_content["pain_points"]
        if "identified_risks" in pain_points:
            s4["risk_management"]["identified_risks"] = pain_points["identified_risks"]
        if "contingency_plans" in pain_points:
            s4["risk_management"]["contingency_plans"] = pain_points["contingency_plans"]

    base["metadata"]["confidence_score"] = assessment_report.get("confidence_score") or 0.88
    base["metadata"]["completeness"] = min(95, 70 + (len(s1["self_assessment"]["strengths"]) + len(s1["recommended_careers"])) * 5)
    return base


def get_career_report_with_edits(assessment_service, report_id: str, user_id: Optional[int]) -> Optional[dict]:
    """获取职业规划报告：先取测评报告并转为 career 格式，再应用已保存的编辑。"""
    report = None
    if user_id is not None:
        report = assessment_service.get_report(user_id, report_id)
    else:
        task = assessment_service.tasks.get(report_id)
        if task and task.get("status") == "processing":
            return {"report_id": report_id, "status": "processing", "message": "报告生成中，请稍后查询"}
        if task and task.get("status") == "failed":
            return {"report_id": report_id, "status": "failed", "error": task.get("error", "未知错误")}
        report = assessment_service.reports.get(report_id)
    if not report or report.get("status") not in (None, "completed"):
        return report
    user_id = report.get("user_id") or user_id
    career = transform_assessment_to_career(report, report_id, user_id or 0)
    edits_store = _load_edits()
    edits = edits_store.get(report_id) or {}
    for path, value in edits.items():
        try:
            _set_by_path(career, path, value)
        except Exception as e:
            logger.warning(f"[CareerReport] apply edit path={path}: {e}")
    return career


def apply_edits_and_save(report_id: str, edits: Dict[str, Any]) -> str:
    """应用编辑并持久化，返回 updated_at。"""
    edits_store = _load_edits()
    if report_id not in edits_store:
        edits_store[report_id] = {}
    for path, value in edits.items():
        edits_store[report_id][path] = value
    _save_edits(edits_store)
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def compute_completeness(report: dict) -> dict:
    """根据 API 7.6 返回完整性检查结构。"""
    s1 = report.get("section_1_job_matching") or {}
    s2 = report.get("section_2_career_path") or {}
    s3 = report.get("section_3_action_plan") or {}
    s4 = report.get("section_4_evaluation") or {}
    summary = report.get("summary") or {}
    section_scores = [
        {"section": "职业探索与岗位匹配", "completeness": 90 if (s1.get("recommended_careers") and s1.get("self_assessment")) else 70, "issues": []},
        {"section": "职业目标设定与职业路径规划", "completeness": 85 if s2.get("career_roadmap") else 70, "issues": []},
        {"section": "行动计划与成果展示", "completeness": 80 if s3.get("short_term_plan") else 65, "issues": []},
    ]
    comp = int(sum(s["completeness"] for s in section_scores) / len(section_scores)) if section_scores else 85
    quality = min(95, comp + 3)
    suggestions = []
    if not (summary.get("next_steps")):
        suggestions.append({"type": "内容完善", "priority": "中", "suggestion": "在摘要中补充下一步行动"})
    return {
        "completeness_score": comp,
        "quality_score": quality,
        "section_completeness": section_scores,
        "suggestions": suggestions[:5],
        "strengths": ["岗位匹配分析清晰", "职业路径结构完整", "行动计划可执行"][:3],
    }


def list_reports_for_career_history(assessment_service, user_id: int) -> List[dict]:
    """将测评报告列表转为 7.7 的 list 项（含 primary_career, completeness, last_viewed）。"""
    raw = assessment_service.list_reports_for_user(user_id)
    out = []
    for r in raw:
        # 获取完整报告信息
        report = assessment_service.reports.get(r["report_id"])
        if not report:
            continue
        
        # 检查是否为职业规划报告（包含职业规划特有的字段）
        # 职业规划报告通常包含 section_1_job_matching 等字段
        if not (report.get("section_1_job_matching") or report.get("section_2_career_path") or report.get("section_3_action_plan")):
            # 跳过测评报告，只保留职业规划报告
            continue
        
        # 计算完整度（如果报告中没有完整度字段）
        completeness = report.get("completeness", 85)
        
        # 生成有区分度的规划报告名称
        created_date = r.get("created_at", "")
        if created_date:
            # 从创建时间中提取日期部分作为区分
            date_part = created_date.split(' ')[0]
            report_name = f"职业规划报告 - {date_part}"
        else:
            # 如果没有创建时间，使用报告ID的最后几位作为区分
            report_id_suffix = r["report_id"][-4:] if len(r["report_id"]) >= 4 else r["report_id"]
            report_name = f"职业规划报告 - {report_id_suffix}"
        
        out.append({
            "report_id": r["report_id"],
            "created_at": r["created_at"],
            "status": "completed",
            "primary_career": report_name,
            "completeness": completeness,
            "last_viewed": r.get("last_viewed") or r.get("created_at") or r["created_at"],
        })
    return out
