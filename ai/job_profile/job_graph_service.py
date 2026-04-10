"""
岗位关联图谱服务。

提供岗位关系计算、转岗图谱与相关辅助能力。
"""

import json
import os
import numpy as np
from typing import Optional, List, Dict
from datetime import datetime
import hashlib

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from utils.prompt_loader import load_prompts_from_yml
from model.factory import chat_model

from job_profile.job_profile_service import (
    job_profile_conf,
    _load_profiles_store,
    get_job_profile_service,
    to_standard_name,
)
from job_profile.job_dataset_service import calculate_weighted_skill_match  # 加权匹配算法
from job_profile.career_path_generator import generate_career_path  # LLM 动态晋升阶段


# ============================================================
# 技能相似度计算
# ============================================================

def calculate_skill_similarity(job_a: dict, job_b: dict) -> float:
    """
    计算两个岗位的技能相似度（加权版本）
    
    计算要点：
    1. 技能权重（必需>重要>加分）
    2. 技能等级（熟练>熟悉>了解）
    3. 模糊匹配（python ≈ python3）
    
    返回：相似度分数（0-100）
    """
    # 提取A岗位的技能作为"用户技能"
    skills_a = list(_extract_skills(job_a))
    
    # 用加权算法计算B岗位对A技能的匹配度
    similarity_a_to_b = calculate_weighted_skill_match(skills_a, job_b)
    
    # 反向计算
    skills_b = list(_extract_skills(job_b))
    similarity_b_to_a = calculate_weighted_skill_match(skills_b, job_a)
    
    # 取平均值（双向对称）
    similarity = (similarity_a_to_b + similarity_b_to_a) / 2
    
    return round(similarity, 2)


def _extract_skills(job_profile: dict) -> set:
    """从岗位画像提取技能集合（支持 requirements 与 core_skills 两种结构）"""
    skills = set()
    # 新版画像：core_skills
    core = job_profile.get("core_skills", {})
    for key in ("professional", "tools"):
        for item in (core.get(key) or []):
            s = item.get("skill", item) if isinstance(item, dict) else item
            if s and isinstance(s, str):
                skills.add(s.lower())
    # 旧版画像：requirements.professional_skills
    if not skills:
        reqs = job_profile.get("requirements", {})
        prof_skills = reqs.get("professional_skills", {})
        for lang in prof_skills.get("programming_languages", []):
            skills.add(lang["skill"].lower())
        for tool in prof_skills.get("frameworks_tools", []):
            skills.add(tool["skill"].lower())
        for domain in prof_skills.get("domain_knowledge", []):
            skills.add(domain["skill"].lower())
    return skills


# ============================================================
# 核心算法2：LLM评估转岗难度
# ============================================================

def evaluate_transfer_difficulty_with_llm(job_from: dict, job_to: dict) -> dict:
    """
    用LLM评估两个岗位之间的转岗难度
    
    输入：源岗位画像 + 目标岗位画像
    输出：{
        difficulty: "低/中/高",
        time: "3-6个月",
        skills_gap: ["技能1", "技能2"],
        suggestions: ["建议1", "建议2"]
    }
    """
    try:
        # 构造Prompt
        prompt = f"""你是一位资深的职业规划顾问。请分析以下两个岗位之间的转岗难度。

**源岗位**：{job_from.get('job_name', '')}
技能要求：{_format_skills_for_llm(job_from)}

**目标岗位**：{job_to.get('job_name', '')}
技能要求：{_format_skills_for_llm(job_to)}

请以JSON格式输出评估结果（只输出JSON，不要其他内容）：
{{
  "difficulty": "低/中/高",
  "time": "X-Y个月",
  "skills_gap": ["缺失技能1", "缺失技能2"],
  "suggestions": ["转岗建议1", "建议2"],
  "match_score": 0
}}

重要：match_score 为 50-95 的整数，表示该转岗方向的匹配度。必须根据「源岗位与目标岗位的技能重叠程度」单独评估，不同目标岗位必须给出不同分数（禁止所有岗位都填同一数字）。参考：技能重叠很高 85-95，较高 75-84，中等 65-74，较低 50-64。
判断标准：
- 技能重叠度>70%: 难度"低", 时间"3-6个月"
- 技能重叠度40-70%: 难度"中", 时间"6-12个月"
- 技能重叠度<40%: 难度"高", 时间"12-24个月"
"""
        
        # 调用LLM
        response = chat_model.invoke(prompt)
        result_text = response.content if hasattr(response, 'content') else str(response)
        
        # 解析JSON
        result = _extract_json_from_llm_response(result_text)
        
        if result:
            logger.info(f"[JobGraph] LLM评估转岗难度: {job_from.get('job_name')} → {job_to.get('job_name')}, 难度: {result.get('difficulty')}")
            return result
        else:
            # LLM解析失败，返回默认值
            return _default_transfer_evaluation()
    
    except Exception as e:
        logger.error(f"[JobGraph] LLM评估失败: {e}")
        return _default_transfer_evaluation()


def _format_skills_for_llm(job_profile: dict) -> str:
    """将岗位技能格式化为LLM可读的文本（支持 requirements 与 core_skills 两种结构）"""
    skills_text = []
    # 新版画像：core_skills
    core = job_profile.get("core_skills", {})
    if core:
        pro = core.get("professional") or []
        if pro:
            parts = [s if isinstance(s, str) else s.get("skill", str(s)) for s in pro]
            skills_text.append("专业技能: " + ", ".join(parts))
        tools = core.get("tools") or []
        if tools:
            parts = [t if isinstance(t, str) else t.get("skill", str(t)) for t in tools]
            skills_text.append("工具框架: " + ", ".join(parts))
        certs = core.get("certificates") or []
        if certs:
            parts = [c if isinstance(c, str) else str(c) for c in certs]
            skills_text.append("证书: " + ", ".join(parts))
    # 旧版画像：requirements.professional_skills
    if not skills_text:
        reqs = job_profile.get("requirements", {})
        prof_skills = reqs.get("professional_skills", {})
        langs = prof_skills.get("programming_languages", [])
        if langs:
            skills_text.append("编程语言: " + ", ".join([s["skill"] for s in langs]))
        tools = prof_skills.get("frameworks_tools", [])
        if tools:
            skills_text.append("框架工具: " + ", ".join([s["skill"] for s in tools]))
        domains = prof_skills.get("domain_knowledge", [])
        if domains:
            skills_text.append("领域知识: " + ", ".join([s["skill"] for s in domains]))
    return "; ".join(skills_text) if skills_text else "无"


def _extract_json_from_llm_response(text: str) -> Optional[dict]:
    """从LLM响应中提取JSON"""
    try:
        # 移除markdown代码块标记
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        return json.loads(text)
    except:
        return None


def _default_transfer_evaluation() -> dict:
    """LLM失败时的默认评估"""
    return {
        "difficulty": "中",
        "time": "6-12个月",
        "skills_gap": ["需根据具体岗位分析"],
        "suggestions": ["建议咨询职业规划师获取详细建议"],
        "match_score": 75
    }


# ============================================================
# 核心算法3：个性化路径推荐
# ============================================================

def recommend_personalized_path(user_skills: List[str], all_jobs: dict) -> dict:
    """
    基于用户技能，推荐最合适的职业路径
    
    输入：用户技能列表（如 ["Python", "MySQL", "Django"]）
    输出：{
        "matched_job": 最匹配岗位,
        "match_score": 匹配分数,
        "career_path": 晋升路径,
        "transfer_options": 转岗建议
    }
    """
    user_skill_set = set([s.lower() for s in user_skills])
    
    # 计算用户与每个岗位的匹配度
    match_scores = []
    for job_id, job_profile in all_jobs.items():
        job_skills = _extract_skills(job_profile)
        if not job_skills:
            continue
        
        # 匹配度 = 用户技能与岗位技能的重叠度
        overlap = user_skill_set.intersection(job_skills)
        match_score = len(overlap) / len(job_skills) * 100 if job_skills else 0
        
        match_scores.append({
            "job_id": job_id,
            "job_name": job_profile.get("job_name", ""),
            "match_score": round(match_score, 2),
            "missing_skills": list(job_skills - user_skill_set)
        })
    
    # 按匹配度排序
    match_scores.sort(key=lambda x: x["match_score"], reverse=True)
    
    if not match_scores:
        return {"error": "未找到匹配岗位"}
    
    best_match = match_scores[0]
    
    return {
        "matched_job": {
            "job_id": best_match["job_id"],
            "job_name": best_match["job_name"],
            "match_score": best_match["match_score"]
        },
        "missing_skills": best_match["missing_skills"][:5],  # 最多返回5个
        "alternative_jobs": match_scores[1:4]  # 其他候选岗位
    }


# ============================================================
# 图谱构建器：AI智能版
# ============================================================

class AIJobGraphBuilder:
    """
    AI智能图谱构建器（L3-L4级别）
    - 自动计算技能相似度建图
    - LLM评估转岗难度
    - 支持个性化路径推荐
    """
    
    def __init__(self):
        self.target_jobs = job_profile_conf.get("target_jobs", [])
        self.career_tracks = job_profile_conf.get("career_tracks", [])
        self._job_index = {j["job_id"]: j for j in self.target_jobs}
        
        # 相似度阈值（大于此值才建立转岗边；提高以减少泛化 JD 带来的无意义边）
        self.similarity_threshold = 45.0
    
    # ----------------------------------------------------------
    # 垂直晋升图谱（保持原逻辑，已经是L3）
    # ----------------------------------------------------------
    def build_vertical_graphs(self, profiles: dict) -> list:
        """
        构建垂直晋升图谱
        从career_tracks配置读取晋升链（这部分保持原样）
        """
        vertical_graphs = []
        
        for track in self.career_tracks:
            track_name = track["name"]
            track_id = track["track_id"]
            job_ids_ordered = track.get("job_ids_ordered", [])
            
            if len(job_ids_ordered) < 2:
                continue
            
            nodes = []
            edges = []
            
            for idx, job_id in enumerate(job_ids_ordered):
                node_info = self._get_node_info(job_id, profiles)
                nodes.append(node_info)
                
                # 建立晋升边
                if idx < len(job_ids_ordered) - 1:
                    next_job_id = job_ids_ordered[idx + 1]
                    edge = {
                        "from": job_id,
                        "to": next_job_id,
                        "years": self._estimate_promotion_time(job_id, next_job_id),
                        "requirements": self._get_promotion_requirements(job_id, next_job_id)
                    }
                    edges.append(edge)
            
            vertical_graphs.append({
                "track_id": track_id,
                "track_name": track_name,
                "nodes": nodes,
                "edges": edges
            })
        
        return vertical_graphs
    
    # ----------------------------------------------------------
    # 横向转岗图谱（核心升级：AI智能推理）
    # ----------------------------------------------------------
    def build_transfer_graph_ai(self, center_job_id: str, profiles: dict, user_skills: Optional[List[str]] = None) -> dict:
        """
        AI智能转岗图谱
        
        核心算法：
        1. 遍历所有岗位，计算与中心岗位的技能相似度
        2. 相似度>阈值的岗位，建立转岗边
        3. 用LLM评估每条转岗边的难度/时间/技能差距
        4. 如果提供user_skills，进行个性化推荐
        """
        center_profile = profiles.get(center_job_id)
        if not center_profile:
            return {"nodes": [], "edges": [], "error": "中心岗位画像不存在"}
        
        # 按标准化岗位名去重，每个岗位名只保留首条，避免全量 CSV 同名 JD 互相干扰
        seen_names: Dict[str, tuple] = {}
        for jid, jp in profiles.items():
            std = to_standard_name(jp.get("job_name", ""))
            if std and std not in seen_names:
                seen_names[std] = (jid, jp)
        deduped_profiles = {jid: jp for _std, (jid, jp) in seen_names.items()}
        
        nodes = [self._get_node_info(center_job_id, profiles)]
        edges = []
        center_std = to_standard_name(center_profile.get("job_name", ""))
        
        # 遍历去重后的岗位，计算相似度
        for job_id, job_profile in deduped_profiles.items():
            if job_id == center_job_id:
                continue
            # 排除标准化名称与中心节点相同的岗位（防止自身出现在推荐里）
            target_std = to_standard_name(job_profile.get("job_name", ""))
            if center_std and target_std and center_std == target_std:
                continue
            
            # 计算技能相似度
            similarity = calculate_skill_similarity(center_profile, job_profile)
            
            # 相似度达到阈值，建立转岗边
            if similarity >= self.similarity_threshold:
                # 用LLM评估转岗难度
                evaluation = evaluate_transfer_difficulty_with_llm(center_profile, job_profile)
                
                # 添加节点
                nodes.append(self._get_node_info(job_id, profiles))
                
                # 匹配度优先用 LLM 给出的 match_score（有区分度），否则用技能相似度
                match_score = evaluation.get("match_score")
                if match_score is not None:
                    try:
                        match_score = int(match_score)
                        match_score = max(0, min(100, match_score))
                    except (TypeError, ValueError):
                        match_score = int(similarity)
                else:
                    match_score = int(similarity)
                # 用中心岗位 id + 目标岗位 id 哈希微扰（±3），同对稳定、不同中心有区分
                perturb_seed = int(
                    hashlib.md5(f"{center_job_id}{job_id}".encode("utf-8")).hexdigest()[:6], 16
                ) % 7 - 3
                match_score = max(50, min(99, match_score + perturb_seed))
                # 添加边
                edge = {
                    "from": center_job_id,
                    "to": job_id,
                    "relevance_score": match_score,
                    "match_score": match_score,
                    "difficulty": evaluation.get("difficulty", "中"),
                    "time": evaluation.get("time", "6-12个月"),
                    "skills_gap": evaluation.get("skills_gap", [])
                }
                edges.append(edge)
        
        # 按匹配分排序；按目标标准化岗位名分桶，每名只保留最高分一条，再取 Top6
        edges.sort(key=lambda x: x["relevance_score"], reverse=True)
        edges = [e for e in edges if e["to"] != center_job_id]
        name_best: Dict[str, dict] = {}
        for e in edges:
            t_profile = deduped_profiles.get(e["to"]) or profiles.get(e["to"], {})
            t_name = to_standard_name(t_profile.get("job_name", e["to"])) or str(e["to"])
            if t_name not in name_best or e["match_score"] > name_best[t_name]["match_score"]:
                name_best[t_name] = e
        diverse_edges = sorted(name_best.values(), key=lambda x: -x["match_score"])[:6]
        edges = diverse_edges
        for e in edges:
            e["relevance_score"] = e["match_score"]

        edge_job_ids = set([center_job_id] + [e["to"] for e in edges])
        nodes = [n for n in nodes if n["job_id"] in edge_job_ids]
        
        result = {
            "nodes": nodes,
            "edges": edges,
            "algorithm": "AI智能推理（技能相似度 + LLM评估）",
            "similarity_threshold": self.similarity_threshold
        }
        
        # 如果提供了用户技能，添加个性化推荐
        if user_skills:
            personalized = recommend_personalized_path(user_skills, profiles)
            result["personalized_recommendation"] = personalized
        
        return result
    
    # ----------------------------------------------------------
    # 辅助方法
    # ----------------------------------------------------------
    def _get_node_info(self, job_id: str, profiles: dict) -> dict:
        """获取节点信息；节点名称用 standard_name 便于图谱按标准化名称分组/展示"""
        cfg = self._job_index.get(job_id, {})
        profile = profiles.get(job_id, {})
        raw_name = profile.get("job_name", cfg.get("name", job_id))
        basic = profile.get("basic_info", {})

        return {
            "job_id": job_id,
            "job_name": raw_name,
            "standard_name": to_standard_name(raw_name),
            "level": cfg.get("layer_level", 0),
            "category": cfg.get("category", ""),
            "salary_range": basic.get("avg_salary", ""),
            "description": basic.get("description", "")[:100]  # 截取前100字
        }
    
    def _estimate_promotion_time(self, from_job: str, to_job: str) -> str:
        """估算晋升时间（简单规则）"""
        from_level = self._job_index.get(from_job, {}).get("layer_level", 0)
        to_level = self._job_index.get(to_job, {}).get("layer_level", 0)
        
        diff = to_level - from_level
        if diff <= 1:
            return "2-3年"
        elif diff == 2:
            return "3-5年"
        else:
            return "5年以上"
    
    def _get_promotion_requirements(self, from_job: str, to_job: str) -> List[str]:
        """获取晋升要求（简化版）"""
        to_level = self._job_index.get(to_job, {}).get("layer_level", 0)
        
        if to_level <= 2:
            return ["独立项目经验", "技术深度"]
        elif to_level == 3:
            return ["架构设计能力", "团队协作"]
        else:
            return ["战略规划能力", "技术领导力"]


# ============================================================
# 对外服务类
# ============================================================

class JobGraphService:
    """
    岗位关联图谱服务（升级版）
    对应API文档 4.3
    """
    
    def __init__(self):
        self.builder = AIJobGraphBuilder()
        self.profile_service = get_job_profile_service()
    
    def get_relation_graph(
        self, 
        job_id: str, 
        graph_type: str = "all",
        user_id: Optional[int] = None
    ) -> dict:
        """
        获取岗位关联图谱
        
        参数：
        - job_id: 中心岗位ID
        - graph_type: "vertical"(垂直晋升) / "transfer"(横向转岗) / "all"(全部)
        - user_id: 用户ID（可选，用于个性化推荐）
        
        返回：符合API文档4.3格式的图谱数据
        """
        # ── 优先读预计算缓存 ──
        try:
            _cache_path = get_abs_path("data/job_profiles/transfer_cache.json")
            if os.path.isfile(_cache_path):
                with open(_cache_path, "r", encoding="utf-8") as _cf:
                    _tc = json.load(_cf)
                _hit = _tc.get(job_id) or next(
                    (v for k, v in _tc.items() if k in job_id or job_id in k), None
                )
                _paths = _hit.get("transferPaths") or _hit.get("transfer_paths")
                if _hit and _paths:
                    _cj = _hit["center_job"]
                    return {
                        "code": 200,
                        "msg": "success",
                        "data": {
                            "center_job": {
                                "job_id":       job_id,
                                "job_name":     _cj.get("job_name", job_id),
                                "salary_range": _cj.get("salary_range", ""),
                                "avg_salary":   _cj.get("salary_range", ""),
                                "demand_score": 95,
                            },
                            "transfer_graph": {
                                "nodes": [],
                                "edges": [],
                                "transferPaths": _paths,
                            },
                            "vertical_graph": {"nodes": [], "edges": [], "track_name": ""},
                            "career_path":    {"promotion_path": []},
                        }
                    }
        except Exception:
            pass
        # ── 缓存未命中，继续原有逻辑 ──
        profiles = _load_profiles_store()
        
        if job_id not in profiles:
            return {
                "code": 404,
                "msg": f"岗位 {job_id} 的画像不存在，请先生成画像",
                "data": None
            }
        
        center_job = profiles[job_id]
        bi = center_job.get("basic_info", {})
        ma = center_job.get("market_analysis", {})
        sr = bi.get("salary_range")
        avg_salary = bi.get("avg_salary") or (sr.get("junior", "") if isinstance(sr, dict) else (sr or ""))
        center_name = center_job.get("job_name", "")
        result = {
            "center_job": {
                "job_id": job_id,
                "job_name": center_name,
                "standard_name": to_standard_name(center_name),
                "level": self.builder._job_index.get(job_id, {}).get("layer_level", 0),
                "salary_range": sr if isinstance(sr, str) else (bi.get("avg_salary") or ""),
                "avg_salary": avg_salary,
                "demand_score": ma.get("demand_score"),
            }
        }
        
        try:
            # 获取用户技能（如果提供user_id）
            user_skills = None
            if user_id:
                user_skills = self._get_user_skills(user_id)
            
            # 构建图谱（任一环节异常时用空图兜底，避免接口返回空响应）
            if graph_type in ["vertical", "all"]:
                vertical_graphs = self.builder.build_vertical_graphs(profiles)
                result["vertical_graph"] = self._find_vertical_path(job_id, vertical_graphs)
            else:
                result["vertical_graph"] = {"nodes": [], "edges": [], "track_name": "", "message": "未请求垂直图谱"}
            
            if graph_type in ["transfer", "all"]:
                result["transfer_graph"] = self.builder.build_transfer_graph_ai(
                    job_id, profiles, user_skills
                )
                # 后处理：确保中心节点不出现在推荐边/邻居节点中（兜底同名或 id 不一致）
                tf = result.get("transfer_graph", {})
                center_jid = job_id
                center_jname = to_standard_name(center_name)
                if tf.get("edges"):
                    tf["edges"] = [
                        e for e in tf["edges"]
                        if e.get("to") != center_jid
                        and to_standard_name(
                            (profiles.get(e.get("to") or "") or {}).get("job_name", "")
                        ) != center_jname
                    ]
                    edge_ids = {center_jid} | {e["to"] for e in tf["edges"]}
                    tf["nodes"] = [n for n in tf.get("nodes", []) if n["job_id"] in edge_ids]
                result["transfer_graph"] = tf
            else:
                result["transfer_graph"] = {"nodes": [], "edges": [], "message": "未请求转岗图谱"}
            
            # 晋升路径：使用 LLM 动态生成 4 阶段
            center_job_name = center_job.get("job_name", "")
            try:
                result["career_path"] = {"promotion_path": generate_career_path(center_job_name)}
            except Exception as e:
                logger.warning(f"[JobGraph] 晋升路径生成失败，前端将使用兜底: {e}")
                result["career_path"] = {"promotion_path": []}
        except Exception as e:
            logger.error(f"[JobGraph] 构建图谱异常，返回空图: {e}", exc_info=True)
            result.setdefault("vertical_graph", {"nodes": [], "edges": [], "track_name": "", "message": "图谱生成失败"})
            result.setdefault("transfer_graph", {"nodes": [], "edges": [], "message": "图谱生成失败"})
            result.setdefault("career_path", {"promotion_path": []})
        
        return {
            "code": 200,
            "msg": "success",
            "data": result
        }

    def get_job_graph(self, job_id: str, graph_type: str = "all", user_id: Optional[int] = None) -> dict:
        """返回图谱数据（供 API 直接 success_response 使用）"""
        out = self.get_relation_graph(job_id, graph_type, user_id)
        if out.get("code") != 200:
            raise ValueError(out.get("msg", "图谱获取失败"))
        return out.get("data") or {}

    # ============================================================
    # 全量图谱生成（graph.json）——供初始化脚本/全量导出使用
    # ============================================================
    def get_full_graph(self, force_regenerate: bool = False) -> dict:
        """
        生成并返回全量图谱（与 data/job_profiles/graph.json 结构一致）。
        - profile_generated: 以 profiles_store 是否存在对应 job_id 为准
        - transfer_graph.edges: 补充 reason / skills_gap（基于 category 差异 + dimension_weights 差值）
        - 额外输出 aliases：将用户常见岗位名映射到最近似标准节点，避免中心节点降级
        """
        graph_path = get_abs_path(job_profile_conf.get("job_graph_store", "data/job_profiles/graph.json"))
        os.makedirs(os.path.dirname(graph_path), exist_ok=True)
        if (not force_regenerate) and os.path.isfile(graph_path):
            try:
                with open(graph_path, "r", encoding="utf-8") as f:
                    return json.load(f) or {}
            except Exception:
                pass

        profiles = _load_profiles_store()
        cfg_by_id = {j.get("job_id"): j for j in (job_profile_conf.get("target_jobs", []) or [])}

        def _profile_generated(jid: str) -> bool:
            return bool(jid and jid in profiles and isinstance(profiles.get(jid), dict))

        # ---------- vertical_graphs ----------
        vertical_graphs = []
        for track in (job_profile_conf.get("career_tracks", []) or []):
            nodes = []
            edges = []
            ids = track.get("job_ids_ordered", []) or []
            for idx, jid in enumerate(ids):
                cfg = cfg_by_id.get(jid, {})
                nodes.append({
                    "job_id": jid,
                    "job_name": cfg.get("name", jid),
                    "category": cfg.get("category", ""),
                    "career_track": cfg.get("career_track", track.get("name", "")),
                    "layer_level": cfg.get("layer_level", 0),
                    "level": cfg.get("layer_level", 0),
                    "profile_generated": _profile_generated(jid),
                })
                if idx < len(ids) - 1:
                    nxt = ids[idx + 1]
                    cfg_next = cfg_by_id.get(nxt, {})
                    edges.append({
                        "from": jid,
                        "to": nxt,
                        "from_name": cfg.get("name", jid),
                        "to_name": cfg_next.get("name", nxt),
                        "years": self.builder._estimate_promotion_time(jid, nxt),
                        "level_gap": (cfg_next.get("layer_level", 0) or 0) - (cfg.get("layer_level", 0) or 0),
                        "requirements": self.builder._get_promotion_requirements(jid, nxt),
                    })
            vertical_graphs.append({
                "track_id": track.get("track_id", ""),
                "career_track": track.get("name", ""),
                "color": track.get("color", ""),
                "nodes": nodes,
                "edges": edges,
            })

        # ---------- transfer_graph ----------
        nodes_all = []
        edges_all = []
        for jid, cfg in cfg_by_id.items():
            nodes_all.append({
                "job_id": jid,
                "job_name": cfg.get("name", jid),
                "category": cfg.get("category", ""),
                "career_track": cfg.get("career_track", ""),
                "layer_level": cfg.get("layer_level", 0),
                "profile_generated": _profile_generated(jid),
                "dimension_weights": cfg.get("dimension_weights", {}) or {},
            })
        nodes_index = {n["job_id"]: n for n in nodes_all}

        def _dim_gap(from_id: str, to_id: str) -> List[str]:
            a = (cfg_by_id.get(from_id, {}).get("dimension_weights") or {})
            b = (cfg_by_id.get(to_id, {}).get("dimension_weights") or {})
            diffs = []
            for k in set(list(a.keys()) + list(b.keys())):
                try:
                    diffs.append((k, float(b.get(k, 0)) - float(a.get(k, 0))))
                except Exception:
                    continue
            diffs = [(k, d) for (k, d) in diffs if d > 0.02]
            diffs.sort(key=lambda x: x[1], reverse=True)
            return [k for (k, _) in diffs[:2]]

        _DIM_HINT = {
            "基础要求": "补齐基础门槛（学历/证书/经验）",
            "专业技能": "强化核心技术栈与工程能力",
            "职业素养": "提升沟通协作与跨团队推进",
            "发展潜力": "加强学习能力与前沿视野",
        }

        def _reason(from_id: str, to_id: str) -> str:
            f = cfg_by_id.get(from_id, {})
            t = cfg_by_id.get(to_id, {})
            from_cat = f.get("category", "该方向")
            to_cat = t.get("category", "目标方向")
            gaps = _dim_gap(from_id, to_id)
            gap_txt = "、".join([_DIM_HINT.get(g, g) for g in gaps]) if gaps else "补齐关键能力差距"
            seed = int(hashlib.md5((from_id + "->" + to_id).encode("utf-8")).hexdigest(), 16)
            if from_cat == to_cat:
                templates = [
                    f"同属「{from_cat}」方向的横向扩展，更偏向：{gap_txt}。",
                    f"在「{from_cat}」内部做角色升级/细分切换，建议重点：{gap_txt}。",
                    f"保持「{from_cat}」核心积累不变，补强短板：{gap_txt}。",
                ]
            else:
                templates = [
                    f"从「{from_cat}」转向「{to_cat}」，需要迁移既有经验并重点：{gap_txt}。",
                    f"跨方向迁移：{from_cat} → {to_cat}。建议优先补齐：{gap_txt}。",
                    f"面向「{to_cat}」的能力重心调整（由{from_cat}出发），重点提升：{gap_txt}。",
                ]
            return templates[seed % len(templates)]

        for from_id, cfg in cfg_by_id.items():
            for to_id in (cfg.get("transfer_targets", []) or []):
                if to_id not in cfg_by_id:
                    continue
                edges_all.append({
                    "from": from_id,
                    "to": to_id,
                    "from_name": cfg.get("name", from_id),
                    "to_name": cfg_by_id.get(to_id, {}).get("name", to_id),
                    "from_category": cfg.get("category", ""),
                    "to_category": cfg_by_id.get(to_id, {}).get("category", ""),
                    "skills_gap": _dim_gap(from_id, to_id),
                    "reason": _reason(from_id, to_id),
                })

        # ---------- aliases（优先级3：节点覆盖） ----------
        # 说明：这些岗位名不是 35 个标准节点之一，但用户真实输入常见；映射到最近似节点避免“随机降级”
        aliases = {
            "科研人员": "job_014",           # 数据科学家（科研/分析/建模更接近）
            "实施工程师": "job_034",         # 技术项目经理（更贴近项目/交付/实施）
            "硬件工程师": "job_031",         # 嵌入式软件
            "硬件测试工程师": "job_033",     # FPGA/芯片验证
            "C/C++开发工程师": "job_031",    # 嵌入式/底层更接近
        }

        # 生成统计
        profiles_generated = sum(1 for jid in cfg_by_id.keys() if _profile_generated(jid))
        graph = {
            "graph_version": "v3",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_strategy": "从job_profile.yml自动构建，节点与画像store直接关联",
            "summary": {
                "total_jobs": len(cfg_by_id),
                "total_vertical_tracks": len(vertical_graphs),
                "total_transfer_nodes": len(nodes_all),
                "total_transfer_edges": len(edges_all),
                "profiles_generated": profiles_generated,
                "jobs_with_2plus_transfers": len([j for j in cfg_by_id.values() if len(j.get("transfer_targets", []) or []) >= 2]),
            },
            "vertical_graphs": vertical_graphs,
            "transfer_graph": {
                "nodes": nodes_all,
                "edges": edges_all,
            },
            "aliases": aliases,
        }

        try:
            with open(graph_path, "w", encoding="utf-8") as f:
                json.dump(graph, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning("[JobGraph] 写入 graph.json 失败: %s", e)

        return graph

    def get_all_transfer_paths_summary(self) -> dict:
        """
        给 init_job_profiles.verify() 用的摘要：
        { job_id: { job_name, transfer_count }, ... }
        """
        out = {}
        for j in (job_profile_conf.get("target_jobs", []) or []):
            jid = j.get("job_id", "")
            out[jid] = {
                "job_name": j.get("name", jid),
                "transfer_count": len(j.get("transfer_targets", []) or []),
            }
        return out
    
    def _find_vertical_path(self, job_id: str, vertical_graphs: list) -> dict:
        """找到包含指定岗位的垂直晋升路径"""
        for graph in vertical_graphs:
            job_ids = [n["job_id"] for n in graph["nodes"]]
            if job_id in job_ids:
                return {
                    "track_name": graph["track_name"],
                    "nodes": graph["nodes"],
                    "edges": graph["edges"]
                }
        
        return {"nodes": [], "edges": [], "msg": "该岗位暂无晋升路径"}
    
    def _get_user_skills(self, user_id: int) -> Optional[List[str]]:
        """获取用户技能（从Profile模块）"""
        try:
            from profile.profile_service import ProfileService
            profile_service = ProfileService()
            user_profile = profile_service.get_profile(user_id)
            
            if user_profile and user_profile.get("skills"):
                skills = []
                for skill_cat in user_profile["skills"]:
                    skills.extend(skill_cat.get("items", []))
                return skills
        except:
            pass
        
        return None


# ============================================================
# 单例获取
# ============================================================

_service_instance = None

def get_job_graph_service() -> JobGraphService:
    global _service_instance
    if _service_instance is None:
        _service_instance = JobGraphService()
    return _service_instance
