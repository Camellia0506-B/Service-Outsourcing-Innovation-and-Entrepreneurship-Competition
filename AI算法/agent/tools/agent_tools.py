"""
AI职业规划智能体 — Agent工具集
=============================================
工具列表（对应API功能）：
  1. get_job_profile_list       - 查询岗位画像列表
  2. get_job_profile_detail     - 查询岗位详细画像
  3. get_job_relation_graph     - 查询岗位关联图谱
  4. trigger_generate_job_profile - 触发AI生成指定岗位画像
  5. get_transfer_paths_summary   - 获取全部换岗路径摘要
  6. preview_csv_match          - 预览各岗位CSV匹配情况

"""

import json

from langchain_core.tools import tool

from utils.logger_handler import logger


# ========== 工具1：查询岗位画像列表 ==========

@tool(description=(
    "查询岗位画像列表。"
    "可传入 keyword（关键词）、industry（行业）、level（级别：初级/中级/高级）、"
    "category（类别：后端开发/前端开发/AI与算法/运维与云/产品与设计/网络安全/嵌入式与硬件/管理类）进行筛选。"
    "以文本形式返回画像摘要列表。"
))
def get_job_profile_list(keyword: str = "", industry: str = "",
                         level: str = "", category: str = "") -> str:
    try:
        from job_profile.job_profile_service import get_job_profile_service
        service = get_job_profile_service()
        result = service.get_profile_list(
            keyword=keyword or None,
            industry=industry or None,
            level=level or None,
            category=category or None,
        )
        if result["total"] == 0:
            return "暂无匹配的岗位画像数据，请先触发岗位画像生成（trigger_generate_job_profile）。"

        lines = [f"共找到 {result['total']} 个岗位画像："]
        for item in result["list"]:
            src_mark = "📊" if "数据集" in item.get("data_source", "") else "🤖"
            lines.append(
                f"{src_mark} {item['job_name']}（{item['job_id']}）"
                f"｜{item.get('description', '')} "
                f"｜需求热度:{item['demand_score']} ｜趋势:{item['growth_trend']}"
            )
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"[get_job_profile_list] 失败: {e}")
        return f"查询失败: {e}"


# ========== 工具2：查询岗位详细画像 ==========

@tool(description=(
    "查询指定岗位的详细画像。"
    "传入 job_id（如 job_001）或 job_name（如 Java后端开发工程师）。"
    "返回包含专业技能、证书、软技能、薪资、晋升路径等完整信息。"
))
def get_job_profile_detail(job_id: str = "", job_name: str = "") -> str:
    try:
        from job_profile.job_profile_service import get_job_profile_service
        service = get_job_profile_service()

        profile = None
        if job_id:
            profile = service.get_profile_detail(job_id)
        elif job_name:
            profile = service.get_profile_by_name(job_name)

        if not profile:
            return (f"未找到岗位画像（job_id={job_id}, job_name={job_name}）。"
                    f"请先使用 trigger_generate_job_profile 生成该岗位画像。")

        req    = profile.get("requirements", {})
        soft   = req.get("soft_skills", {})
        prof   = req.get("professional_skills", {})
        market = profile.get("market_analysis", {})
        path   = profile.get("career_path", {})

        summary = {
            "岗位名称":   profile.get("job_name"),
            "数据来源":   profile.get("data_source"),
            "CSV样本数":  profile.get("csv_sample_count", 0),
            "基本信息":   profile.get("basic_info", {}),
            "核心技能": {
                "编程语言": [s["skill"] for s in prof.get("programming_languages", [])],
                "框架工具": [s["skill"] for s in prof.get("frameworks_tools", [])],
                "领域知识": [s["skill"] for s in prof.get("domain_knowledge", [])],
            },
            "证书要求": req.get("certificates", {}),
            "软技能": {
                "创新能力": soft.get("innovation_ability", {}).get("level"),
                "学习能力": soft.get("learning_ability", {}).get("level"),
                "抗压能力": soft.get("pressure_resistance", {}).get("level"),
                "沟通能力": soft.get("communication_ability", {}).get("level"),
                "团队协作": soft.get("teamwork_ability", {}).get("level"),
            },
            "市场分析": {
                "需求热度": market.get("demand_score"),
                "发展趋势": market.get("growth_trend"),
                "热门城市": [c["city"] for c in market.get("hottest_cities", [])[:3]],
                "行业趋势": market.get("industry_trends", []),
            },
            "晋升路径": [f"{p['level']}（{p['years_required']}）"
                        for p in path.get("promotion_path", [])],
            "换岗路径": [f"→ {t['target_job']}（难度:{t['transition_difficulty']}, "
                        f"时间:{t['estimated_time']}）"
                        for t in profile.get("transfer_paths", [])],
        }
        return json.dumps(summary, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[get_job_profile_detail] 失败: {e}")
        return f"查询失败: {e}"


# ========== 工具3：查询岗位关联图谱 ==========

@tool(description=(
    "查询岗位关联图谱。"
    "传入 job_id 和 graph_type（vertical：垂直晋升 / transfer：横向换岗 / all：两者）。"
    "返回该岗位在赛道中的晋升路径及可换岗的相关岗位。"
))
def get_job_relation_graph(job_id: str, graph_type: str = "all") -> str:
    try:
        from job_profile.job_graph_service import get_job_graph_service
        service = get_job_graph_service()
        graph = service.get_job_graph(job_id, graph_type)

        lines = [f"=== {graph['center_job']['job_name']} 关联图谱 ==="]
        lines.append(f"层级：L{graph['center_job']['layer_level']} | 赛道：{graph['center_job']['career_track']}")

        vg = graph.get("vertical_graph")
        if vg:
            lines.append(f"\n【垂直晋升路径】{vg['career_track']}：")
            for node in vg["nodes"]:
                mark = "▶" if node["job_id"] == job_id else "  "
                lines.append(f"  {mark} L{node['layer_level']}: {node['job_name']}"
                             + (f"（薪资:{node.get('salary_junior','')}~{node.get('salary_senior','')}）"
                                if node.get("salary_junior") else ""))
            for edge in vg["edges"]:
                lines.append(f"     ↑ 晋升需 {edge['years']}：{'、'.join(edge['requirements'][:2])}")

        tg = graph.get("transfer_graph")
        if tg and tg.get("edges"):
            lines.append(f"\n【换岗路径】（{len(tg['edges'])}条）：")
            for edge in tg["edges"]:
                if edge["from"] == job_id:
                    lines.append(
                        f"  → {edge['to_name']}"
                        f"｜关联度:{edge['relevance_score']} ｜难度:{edge['difficulty']}"
                        f"｜预计:{edge['estimated_time']}"
                    )

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"[get_job_relation_graph] 失败: {e}")
        return f"查询失败: {e}"


# ========== 工具4：触发生成岗位画像 ==========

@tool(description=(
    "触发AI生成指定岗位的标准化画像。"
    "传入 job_name（如 Java后端开发工程师）。"
    "系统优先使用数据集中的真实JD生成，数据集无数据时使用模型行业知识兜底。"
    "生成完成后可用 get_job_profile_detail 查看详情。"
))
def trigger_generate_job_profile(job_name: str) -> str:
    try:
        from job_profile.job_profile_service import (
            get_job_profile_service, job_profile_conf, _save_profiles_store
        )
        service = get_job_profile_service()
        target_jobs = job_profile_conf.get("target_jobs", [])
        job_config = next((j for j in target_jobs if j["name"] == job_name), None)

        if not job_config:
            available = [j["name"] for j in target_jobs]
            return (f"未找到岗位【{job_name}】的配置。\n"
                    f"支持生成的岗位：{', '.join(available)}")

        profile = service.generate_profile(job_config)
        service.profiles_store[job_config["job_id"]] = profile
        _save_profiles_store(service.profiles_store)

        return (f"✅ 岗位画像生成完成！\n"
                f"岗位：{profile['job_name']}\n"
                f"数据来源：{profile['data_source']}\n"
                f"CSV样本数：{profile['csv_sample_count']}条\n"
                f"可用 get_job_profile_detail job_id={job_config['job_id']} 查看详情。")
    except Exception as e:
        logger.error(f"[trigger_generate_job_profile] 失败: {e}", exc_info=True)
        return f"生成失败: {e}"


# ========== 工具5：换岗路径全览 ==========

@tool(description=(
    "获取所有岗位的换岗路径汇总。"
    "无需参数，返回图谱中各岗位可转岗的目标岗位列表及难度信息。"
))
def get_transfer_paths_summary() -> str:
    try:
        from job_profile.job_graph_service import get_job_graph_service
        service = get_job_graph_service()
        summary = service.get_all_transfer_paths_summary()

        if not summary:
            return "换岗路径数据为空，请先运行初始化脚本生成图谱。"

        lines = ["=== 岗位换岗路径全览 ===\n"]
        for job_id, info in summary.items():
            cnt = info["transfer_count"]
            lines.append(f"📋 {info['job_name']}（{cnt}条换岗路径）：")
            for p in info["paths"]:
                lines.append(f"   → {p['to']} | 难度:{p['difficulty']} | 预计:{p['time']}")
        lines.append(f"\n覆盖 {len(summary)} 个岗位")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"[get_transfer_paths_summary] 失败: {e}")
        return f"查询失败: {e}"


# ========== 工具6：预览CSV匹配情况 ==========

@tool(description=(
    "预览各岗位能从数据集中匹配到多少条真实JD数据。"
    "无需参数，返回每个岗位的数据集匹配情况，帮助了解哪些岗位画像基于真实数据、哪些需要模型补充。"
))
def preview_csv_match() -> str:
    try:
        from job_profile.job_profile_service import get_job_profile_service
        service = get_job_profile_service()
        preview = service.preview_csv_match()

        lines = ["=== 数据集匹配预览 ===\n"]
        lines.append(f"{'📊'} = 数据集JD分析  {'🤖'} = 模型知识兜底\n")
        for jid, info in preview.items():
            mark = "📊" if info["matched"] > 0 else "🤖"
            lines.append(f"{mark} {info['name']:22s} | 匹配 {info['matched']:2d} 条 JD")
            if info["samples"]:
                lines.append(f"     ↳ {', '.join(info['samples'][:2])}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"[preview_csv_match] 失败: {e}")
        return f"查询失败: {e}"


# ========== 工具列表（供Agent注册使用）==========
career_agent_tools = [
    get_job_profile_list,
    get_job_profile_detail,
    get_job_relation_graph,
    trigger_generate_job_profile,
    get_transfer_paths_summary,
    preview_csv_match,
]
