"""
岗位关联图谱服务 v3
==================================================
核心改进：
  - 垂直图谱：从 career_tracks + layer_level 自动生成，节点直接用真实 job_id
  - 换岗图谱：从每个岗位的 transfer_targets 字段自动生成，无硬编码临时ID
  - 节点信息从已生成的画像存储中动态读取（薪资/描述等实时准确）
  - 若画像尚未生成，降级使用配置中的静态信息展示

对应API文档：
  4.3 POST /job/relation-graph - 获取岗位关联图谱（vertical/transfer/all）
"""

import json
import os
from datetime import datetime
from typing import Optional

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from job_profile.job_profile_service import (
    job_profile_conf,
    _load_profiles_store,
    _save_profiles_store,
    get_job_profile_service,
)


# ============================================================
# 图谱构建器：从yml配置自动生成，不依赖任何硬编码数据
# ============================================================

class JobGraphBuilder:
    """
    从 job_profile.yml 的 career_tracks 和每个岗位的 transfer_targets
    自动构建垂直晋升图谱和横向换岗图谱。

    节点 job_id 与 profiles_store 直接对应，数据实时准确。
    """

    def __init__(self):
        self.target_jobs: list[dict] = job_profile_conf.get("target_jobs", [])
        self.career_tracks: list[dict] = job_profile_conf.get("career_tracks", [])
        # job_id → 配置信息的快查索引
        self._job_index: dict[str, dict] = {j["job_id"]: j for j in self.target_jobs}

    # ----------------------------------------------------------
    # 辅助：从已生成的画像或配置中读取节点元信息
    # ----------------------------------------------------------
    def _get_node_info(self, job_id: str, profiles: dict) -> dict:
        """
        优先从已生成画像中取字段，画像不存在时退回到配置中的静态信息。
        确保图谱始终可用，不因画像未全量生成而报错。
        """
        cfg = self._job_index.get(job_id, {})
        base = {
            "job_id":      job_id,
            "job_name":    cfg.get("name", job_id),
            "category":    cfg.get("category", ""),
            "career_track":cfg.get("career_track", ""),
            "layer_level": cfg.get("layer_level", 0),
        }

        profile = profiles.get(job_id)
        if profile:
            basic = profile.get("basic_info", {})
            sr    = basic.get("salary_range", {})
            base.update({
                "description":      basic.get("description", ""),
                "salary_junior":    sr.get("junior", ""),
                "salary_senior":    sr.get("senior", ""),
                "demand_score":     profile.get("market_analysis", {}).get("demand_score", 0),
                "growth_trend":     profile.get("market_analysis", {}).get("growth_trend", ""),
                "tags":             profile.get("market_analysis", {}).get("tags", []),
                "profile_generated": True,
            })
        else:
            base["profile_generated"] = False

        return base

    # ----------------------------------------------------------
    # 构建垂直晋升图谱
    # 每条赛道按 job_ids_ordered 顺序连成链式图谱
    # ----------------------------------------------------------
    def build_vertical_graphs(self, profiles: dict) -> list[dict]:
        """
        遍历 career_tracks，将 job_ids_ordered 中的岗位依次连接为晋升链。
        边上携带 layer_level 差值以体现跨度，节点使用真实 job_id。
        """
        vertical_graphs = []

        for track in self.career_tracks:
            track_name    = track["name"]
            track_id      = track["track_id"]
            color         = track.get("color", "#666666")
            job_ids_ordered = track.get("job_ids_ordered", [])

            if len(job_ids_ordered) < 2:
                # 单节点赛道：只有节点，没有晋升边（如设计赛道仅有1个岗位时）
                nodes = [self._get_node_info(jid, profiles) for jid in job_ids_ordered]
                vertical_graphs.append({
                    "track_id":    track_id,
                    "career_track":track_name,
                    "color":       color,
                    "nodes":       nodes,
                    "edges":       [],
                })
                continue

            nodes = [self._get_node_info(jid, profiles) for jid in job_ids_ordered]

            # 相邻节点之间生成晋升边
            edges = []
            for i in range(len(job_ids_ordered) - 1):
                from_id = job_ids_ordered[i]
                to_id   = job_ids_ordered[i + 1]
                from_cfg = self._job_index.get(from_id, {})
                to_cfg   = self._job_index.get(to_id, {})
                from_level = from_cfg.get("layer_level", i + 1)
                to_level   = to_cfg.get("layer_level", i + 2)

                # 根据层级差估算所需年限
                level_gap = to_level - from_level
                if level_gap <= 1:
                    years = "1-2年"
                elif level_gap == 2:
                    years = "2-4年"
                else:
                    years = "3-6年"

                # 晋升关键条件：优先从画像中读取，否则用通用描述
                requirements = self._get_promotion_requirements(from_id, to_id, profiles)

                edges.append({
                    "from":         from_id,
                    "to":           to_id,
                    "from_name":    from_cfg.get("name", from_id),
                    "to_name":      to_cfg.get("name", to_id),
                    "years":        years,
                    "level_gap":    level_gap,
                    "requirements": requirements,
                })

            vertical_graphs.append({
                "track_id":    track_id,
                "career_track":track_name,
                "color":       color,
                "nodes":       nodes,
                "edges":       edges,
            })

        return vertical_graphs

    def _get_promotion_requirements(self, from_id: str, to_id: str, profiles: dict) -> list[str]:
        """从画像的 career_path 中提取晋升条件；画像未生成时返回通用描述"""
        from_profile = profiles.get(from_id)
        to_cfg = self._job_index.get(to_id, {})
        to_name = to_cfg.get("name", to_id)

        if from_profile:
            path = from_profile.get("career_path", {})
            for step in path.get("promotion_path", []):
                # 粗匹配：目标岗位名称包含晋升步骤描述
                if any(kw in step.get("level", "") for kw in to_name.split("/")):
                    return step.get("key_requirements", [])[:3]

        # 降级：通用晋升描述
        to_level = self._job_index.get(to_id, {}).get("layer_level", 3)
        generic = {
            2: ["掌握核心技能栈", "有完整项目经验", "能独立交付任务"],
            3: ["独立负责模块开发", "有优化与攻坚经验", "指导初级成员"],
            4: ["主导技术方案设计", "深度领域专家能力", "带动团队技术提升"],
            5: ["系统架构设计能力", "技术选型与攻坚", "跨团队协调"],
            6: ["团队管理与战略规划", "行业影响力", "业务与技术融合"],
        }
        return generic.get(to_level, ["持续积累经验", "提升综合能力"])

    # ----------------------------------------------------------
    # 构建横向换岗图谱
    # 从每个岗位的 transfer_targets 字段自动展开
    # ----------------------------------------------------------
    def build_transfer_graph(self, profiles: dict) -> dict:
        """
        遍历所有岗位的 transfer_targets，生成换岗图谱。
        边数据优先从画像的 transfer_paths 中读取，否则生成推导数据。
        """
        # 1. 收集所有会出现在换岗图谱中的节点ID
        node_ids = set()
        for job in self.target_jobs:
            if job.get("transfer_targets"):
                node_ids.add(job["job_id"])
                node_ids.update(job["transfer_targets"])

        nodes = [self._get_node_info(jid, profiles) for jid in sorted(node_ids)]

        # 2. 构建边
        edges = []
        seen_pairs = set()

        for job in self.target_jobs:
            from_id  = job["job_id"]
            targets  = job.get("transfer_targets", [])
            from_profile = profiles.get(from_id)

            for to_id in targets:
                pair = (from_id, to_id)
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                # 优先从画像 transfer_paths 中取数据
                edge = self._get_transfer_edge(from_id, to_id, from_profile)
                edges.append(edge)

        return {"nodes": nodes, "edges": edges}

    def _get_transfer_edge(self, from_id: str, to_id: str, from_profile: Optional[dict]) -> dict:
        """构建单条换岗边，优先用画像数据，降级用层级差推导"""
        from_cfg = self._job_index.get(from_id, {})
        to_cfg   = self._job_index.get(to_id, {})
        to_name  = to_cfg.get("name", to_id)

        # 从画像 transfer_paths 匹配
        if from_profile:
            for tp in from_profile.get("transfer_paths", []):
                target = tp.get("target_job", "")
                if to_name in target or any(k in target for k in to_name.split("/")):
                    return {
                        "from": from_id,
                        "to":   to_id,
                        "from_name": from_cfg.get("name", from_id),
                        "to_name":   to_name,
                        "relevance_score":      tp.get("relevance_score", 70),
                        "difficulty":           tp.get("transition_difficulty", "中"),
                        "estimated_time":       tp.get("estimated_time", "6-12个月"),
                        "skills_gap":           tp.get("required_skills", []),
                        "reason":               tp.get("reason", ""),
                        "data_source":          "画像生成",
                    }

        # 降级：根据层级差和类别差异推导
        from_level = from_cfg.get("layer_level", 3)
        to_level   = to_cfg.get("layer_level", 3)
        from_cat   = from_cfg.get("category", "")
        to_cat     = to_cfg.get("category", "")
        same_cat   = from_cat == to_cat
        level_gap  = abs(to_level - from_level)

        if same_cat and level_gap <= 1:
            difficulty, score, time_est = "低", 80, "3-6个月"
        elif same_cat or level_gap <= 1:
            difficulty, score, time_est = "中", 70, "6-12个月"
        else:
            difficulty, score, time_est = "高", 60, "12-18个月"

        return {
            "from": from_id,
            "to":   to_id,
            "from_name":    from_cfg.get("name", from_id),
            "to_name":      to_name,
            "relevance_score":  score,
            "difficulty":       difficulty,
            "estimated_time":   time_est,
            "skills_gap":       ["待画像生成后补充具体技能差距"],
            "reason":           f"同属计算机行业，技能存在关联性",
            "data_source":      "推导（画像未生成）",
        }

    # ----------------------------------------------------------
    # 热门换岗路径：从图谱中提取 relevance_score 最高的几条
    # ----------------------------------------------------------
    def build_hot_paths(self, transfer_graph: dict) -> list[dict]:
        edges = sorted(
            transfer_graph["edges"],
            key=lambda e: e.get("relevance_score", 0),
            reverse=True
        )[:8]

        hot = []
        for e in edges:
            hot.append({
                "from_job":       e["from_name"],
                "to_job":         e["to_name"],
                "relevance_score":e["relevance_score"],
                "difficulty":     e["difficulty"],
                "estimated_time": e["estimated_time"],
            })
        return hot

    # ----------------------------------------------------------
    # 换岗路径合规性摘要（命题验证用）
    # ----------------------------------------------------------
    def get_transfer_summary(self, transfer_graph: dict) -> dict:
        """统计每个岗位有多少条换岗路径，用于命题合规性检查"""
        count = {}
        for edge in transfer_graph["edges"]:
            fid = edge["from"]
            if fid not in count:
                from_name = self._job_index.get(fid, {}).get("name", fid)
                count[fid] = {"job_name": from_name, "transfer_count": 0, "paths": []}
            count[fid]["transfer_count"] += 1
            count[fid]["paths"].append({
                "to":        edge["to_name"],
                "difficulty":edge["difficulty"],
                "time":      edge["estimated_time"],
            })
        return count


# ============================================================
# 图谱服务：对外统一入口
# ============================================================

class JobGraphService:
    """
    对外提供图谱查询接口，内部使用 JobGraphBuilder 自动构建。
    图谱结果持久化到 job_graph_store，避免每次重新计算。
    """

    def __init__(self):
        self.builder = JobGraphBuilder()

    def _load_store(self) -> Optional[dict]:
        path = get_abs_path(job_profile_conf.get("job_graph_store", "data/job_profiles/graph.json"))
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def _save_store(self, graph: dict):
        path = get_abs_path(job_profile_conf.get("job_graph_store", "data/job_profiles/graph.json"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(graph, f, ensure_ascii=False, indent=2)

    # ----------------------------------------------------------
    # 核心：获取完整图谱
    # ----------------------------------------------------------
    def get_full_graph(self, force_regenerate: bool = False) -> dict:
        """
        获取完整岗位关联图谱。
        force_regenerate=False 时优先用缓存；=True 时重新从画像数据构建。
        每次有新画像生成后，应调用 force_regenerate=True 刷新图谱。
        """
        if not force_regenerate:
            cached = self._load_store()
            if cached:
                return cached

        # 读取当前所有已生成的画像（作为节点数据来源）
        profiles = _load_profiles_store()

        vertical  = self.builder.build_vertical_graphs(profiles)
        transfer  = self.builder.build_transfer_graph(profiles)
        hot_paths = self.builder.build_hot_paths(transfer)
        summary   = self.builder.get_transfer_summary(transfer)

        graph = {
            "graph_version":  "v3",
            "generated_at":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_strategy":  "从job_profile.yml自动构建，节点与画像store直接关联",
            "summary": {
                "total_jobs":           len(self.builder.target_jobs),
                "total_vertical_tracks":len(vertical),
                "total_transfer_nodes": len(transfer["nodes"]),
                "total_transfer_edges": len(transfer["edges"]),
                "profiles_generated":   len(profiles),
                "jobs_with_2plus_transfers": len(
                    [v for v in summary.values() if v["transfer_count"] >= 2]
                ),
            },
            "vertical_graphs":  vertical,
            "transfer_graph":   transfer,
            "hot_transfer_paths": hot_paths,
            "transfer_summary": summary,
        }

        self._save_store(graph)
        logger.info(
            f"[JobGraphService] 图谱构建完成: "
            f"{len(vertical)}条赛道, {len(transfer['edges'])}条换岗边"
        )
        return graph

    # ----------------------------------------------------------
    # 获取指定岗位的子图
    # 对应API: POST /job/relation-graph
    # ----------------------------------------------------------
    def get_job_graph(self, job_id: str, graph_type: str = "all") -> dict:
        """
        获取以某个 job_id 为中心的子图
        graph_type: vertical（所在赛道）/ transfer（换岗路径）/ all（两者合并）
        """
        full = self.get_full_graph()
        cfg  = self.builder._job_index.get(job_id, {})

        result = {
            "center_job": {
                "job_id":      job_id,
                "job_name":    cfg.get("name", job_id),
                "category":    cfg.get("category", ""),
                "career_track":cfg.get("career_track", ""),
                "layer_level": cfg.get("layer_level", 0),
            }
        }

        # 垂直图谱：找到该岗位所在的赛道
        if graph_type in ("vertical", "all"):
            track_name = cfg.get("career_track", "")
            vg = next(
                (g for g in full["vertical_graphs"] if g["career_track"] == track_name),
                None
            )
            result["vertical_graph"] = vg

        # 换岗图谱：过滤与该岗位相关的边和节点
        if graph_type in ("transfer", "all"):
            related_edges = [
                e for e in full["transfer_graph"]["edges"]
                if e["from"] == job_id or e["to"] == job_id
            ]
            related_ids = {job_id}
            for e in related_edges:
                related_ids.add(e["from"])
                related_ids.add(e["to"])
            related_nodes = [
                n for n in full["transfer_graph"]["nodes"]
                if n["job_id"] in related_ids
            ]
            result["transfer_graph"] = {
                "nodes": related_nodes,
                "edges": related_edges,
            }

        return result

    # ----------------------------------------------------------
    # 换岗路径合规性摘要（供init脚本验证命题要求）
    # ----------------------------------------------------------
    def get_all_transfer_paths_summary(self) -> dict:
        full = self.get_full_graph()
        return full.get("transfer_summary", {})


# ============================================================
# 单例
# ============================================================
_instance: Optional[JobGraphService] = None


def get_job_graph_service() -> JobGraphService:
    global _instance
    if _instance is None:
        _instance = JobGraphService()
    return _instance


# ============================================================
# CLI
# ============================================================
if __name__ == "__main__":
    import sys

    service = JobGraphService()
    graph = service.get_full_graph(force_regenerate=True)

    print(f"图谱版本: {graph['graph_version']}")
    print(f"垂直赛道: {graph['summary']['total_vertical_tracks']} 条")
    print(f"换岗节点: {graph['summary']['total_transfer_nodes']} 个")
    print(f"换岗路径: {graph['summary']['total_transfer_edges']} 条")
    print(f"已生成画像: {graph['summary']['profiles_generated']} 个")
    print(f"有≥2条换岗路径的岗位: {graph['summary']['jobs_with_2plus_transfers']} 个")

    if "--summary" in sys.argv:
        print("\n=== 换岗路径覆盖 ===")
        for jid, info in graph["transfer_summary"].items():
            print(f"  {info['job_name']}: {info['transfer_count']} 条换岗路径")
            for p in info["paths"]:
                print(f"    → {p['to']} ({p['difficulty']}, {p['time']})")
