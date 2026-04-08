"""
离线预计算转岗推荐，写入 data/job_profiles/transfer_cache.json。

与 graph.job_graph_service 使用同一份 CSV（列名经 load_jobs 统一为 职位名称 / 职位描述 等），
并与 config/job_profile.yml 中的 target_jobs 对齐：在岗位名称键之外增加 job_id 键，
便于 job_profile.job_graph_service 通过 job_id 命中缓存。

运行方式（任选其一）：
  - 仓库根目录: python scripts/precompute_transfer_graph.py
  - AI算法目录: python -m graph.precompute_transfer_graph
"""
from __future__ import annotations

import json
import os
import re
from collections import defaultdict

import yaml

from graph.job_graph_service import load_jobs
from utils.path_tool import get_abs_path

OUTPUT_REL = "data/job_profiles/transfer_cache.json"
JOB_PROFILE_YML = "config/job_profile.yml"
MIN_COUNT = 2
TOP_N = 6

SKILL_KEYWORDS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "PHP", "SQL",
    "HTML", "CSS", "Vue", "React", "Node", "Spring", "Docker", "Kubernetes", "Redis",
    "MySQL", "MongoDB", "Linux", "Git", "机器学习", "深度学习", "人工智能", "NLP",
    "计算机视觉", "大数据", "云计算", "微服务", "分布式", "运维", "DevOps", "测试",
    "前端开发", "后端开发", "算法", "数据分析", "数据挖掘", "项目管理", "ERP", "MES",
    "arcgis", "CASS", "CAD", "CAXA", "测绘", "地理信息", "化工", "实验", "研发",
    "混凝土", "施工", "建筑", "植物保护", "HPLC", "NGS", "分子生物学", "销售", "沟通",
]


def extract_skills(text: str) -> set:
    if not text:
        return set()
    text = text[:2000].lower()
    return {kw.lower() for kw in SKILL_KEYWORDS if kw.lower() in text}


def parse_salary_avg(s) -> float | None:
    if not s:
        return None
    s = re.sub(r"·\d+薪", "", str(s)).strip()
    m = re.search(r"([\d.]+)-([\d.]+)万", s)
    if m:
        return (float(m.group(1)) + float(m.group(2))) / 2 * 10000
    m = re.search(r"(\d+)-(\d+)元", s)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    return None


def skill_similarity(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return round(len(a & b) / len(a | b) * 100, 1)


def difficulty_from_sim(sim: float) -> str:
    if sim >= 60:
        return "低"
    if sim >= 40:
        return "中"
    return "高"


def time_from_difficulty(d: str) -> str:
    return {"低": "3-6个月", "中": "6-12个月", "高": "12-18个月"}.get(d, "6-12个月")


def _load_job_id_by_name() -> dict[str, str]:
    """target_jobs: 岗位中文名 -> job_id（如 job_001）"""
    path = get_abs_path(JOB_PROFILE_YML)
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}
    except Exception:
        return {}
    out: dict[str, str] = {}
    for j in cfg.get("target_jobs") or []:
        if not isinstance(j, dict):
            continue
        name = str(j.get("name") or "").strip()
        jid = str(j.get("job_id") or "").strip()
        if name and jid:
            out[name] = jid
    return out


def build_cache() -> dict:
    """
    构建转岗缓存 dict，并写入 transfer_cache.json。
    键：CSV 岗位名称 +（若配置中存在）对应 job_id。
    """
    df = load_jobs()
    if df.empty:
        print("CSV 为空或不存在，请检查 graph.job_graph_service 中的 job_data_path / 文件路径")
        return {}

    name_col = "职位名称"
    desc_col = "职位描述"
    sal_col = "薪资范围"
    comp_col = "公司全称"
    loc_col = "工作地址"
    ind_col = "所属行业"

    for c in (name_col, desc_col):
        if c not in df.columns:
            print(f"DataFrame 缺少列 {c}，当前列: {list(df.columns)}")
            return {}

    group_skills: dict[str, set] = defaultdict(set)
    group_meta: dict[str, dict] = {}
    group_count: dict[str, int] = defaultdict(int)

    for _, row in df.iterrows():
        name = str(row.get(name_col, "")).strip()
        if not name:
            continue
        group_count[name] += 1
        group_skills[name] |= extract_skills(str(row.get(desc_col, "")))
        if name not in group_meta:
            sal = str(row.get(sal_col, ""))
            group_meta[name] = {
                "company": str(row.get(comp_col, "")),
                "salary_range": sal,
                "location": str(row.get(loc_col, "")),
                "industry": str(row.get(ind_col, "")),
                "avg_salary": parse_salary_avg(sal),
            }

    valid_jobs = [n for n, cnt in group_count.items() if cnt >= MIN_COUNT]
    print(f"有效岗位数: {len(valid_jobs)}")

    job_id_by_name = _load_job_id_by_name()
    if job_id_by_name:
        print(f"已从 job_profile.yml 加载 {len(job_id_by_name)} 个岗位 job_id 映射")

    cache_by_name: dict[str, dict] = {}
    for center in valid_jobs:
        center_skills = group_skills[center]
        center_meta = group_meta[center]
        candidates = []
        for target in valid_jobs:
            if target == center:
                continue
            if target in center or center in target:
                continue
            sim = skill_similarity(center_skills, group_skills[target])
            if sim <= 0:
                continue
            diff = difficulty_from_sim(sim)
            tm = group_meta[target]
            candidates.append({
                "job_name": target,
                "match": int(sim),
                "difficulty": diff,
                "time": time_from_difficulty(diff),
                "company": tm["company"],
                "salary_range": tm["salary_range"],
                "location": tm["location"],
                "industry": tm["industry"],
            })

        candidates.sort(key=lambda x: -x["match"])
        ind_count: dict[str, int] = defaultdict(int)
        diverse = []
        for c in candidates:
            key = (c["industry"] or "")[:6]
            if ind_count[key] < 2:
                diverse.append(c)
                ind_count[key] += 1
            if len(diverse) >= TOP_N:
                break
        if len(diverse) < TOP_N:
            for c in candidates:
                if c not in diverse:
                    diverse.append(c)
                if len(diverse) >= TOP_N:
                    break

        center_job = {"job_name": center, **center_meta}
        jid = job_id_by_name.get(center)
        if jid:
            center_job["job_id"] = jid

        cache_by_name[center] = {
            "center_job": center_job,
            "transferPaths": diverse[:TOP_N],
            "skill_count": len(center_skills),
        }

    # 合并：名称键 + job_id 键（同一条目引用，便于 API 用 job_id 查）
    final_cache: dict[str, dict] = dict(cache_by_name)
    for name, entry in cache_by_name.items():
        jid = job_id_by_name.get(name)
        if jid:
            final_cache[jid] = entry

    out_path = get_abs_path(OUTPUT_REL)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_cache, f, ensure_ascii=False, indent=2)
    print(f"完成：{len(cache_by_name)} 个名称键、{len(final_cache)} 个总键 -> {out_path}")
    for name in list(cache_by_name.keys())[:3]:
        print(f"  {name} -> {[p['job_name'] for p in cache_by_name[name]['transferPaths']]}")
    return final_cache


if __name__ == "__main__":
    build_cache()
