"""
基于 a13 JD采样数据.csv 离线预计算转岗推荐，写入 transfer_cache.json
运行：python scripts/precompute_transfer_graph.py
"""
import json, os, sys, re
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd

CSV_PATH    = "AI算法/data/a13基于AI的大学生职业规划智能体-JD采样数据.csv"
OUTPUT_PATH = "AI算法/data/job_profiles/transfer_cache.json"
MIN_COUNT   = 2
TOP_N       = 6

SKILL_KEYWORDS = [
    "Python","Java","JavaScript","TypeScript","C++","C#","Go","PHP","SQL",
    "HTML","CSS","Vue","React","Node","Spring","Docker","Kubernetes","Redis",
    "MySQL","MongoDB","Linux","Git","机器学习","深度学习","人工智能","NLP",
    "计算机视觉","大数据","云计算","微服务","分布式","运维","DevOps","测试",
    "前端开发","后端开发","算法","数据分析","数据挖掘","项目管理","ERP","MES",
    "arcgis","CASS","CAD","CAXA","测绘","地理信息","化工","实验","研发",
    "混凝土","施工","建筑","植物保护","HPLC","NGS","分子生物学","销售","沟通",
]

def extract_skills(text):
    if not text:
        return set()
    text = text[:2000].lower()
    return {kw.lower() for kw in SKILL_KEYWORDS if kw.lower() in text}

def parse_salary_avg(s):
    if not s:
        return None
    s = re.sub(r'·\d+薪', '', str(s)).strip()
    m = re.search(r'([\d.]+)-([\d.]+)万', s)
    if m:
        return (float(m.group(1)) + float(m.group(2))) / 2 * 10000
    m = re.search(r'(\d+)-(\d+)元', s)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    return None

def skill_similarity(a, b):
    if not a or not b:
        return 0.0
    return round(len(a & b) / len(a | b) * 100, 1)

def difficulty_from_sim(sim):
    if sim >= 60: return "低"
    elif sim >= 40: return "中"
    else: return "高"

def time_from_difficulty(d):
    return {"低":"3-6个月","中":"6-12个月","高":"12-18个月"}.get(d,"6-12个月")

def build_cache():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base, CSV_PATH)
    df = pd.read_csv(csv_path, encoding="utf-8-sig").fillna("")

    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
    desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
    sal_col  = "薪资范围"
    comp_col = "公司名称" if "公司名称" in df.columns else "公司全称"
    loc_col  = "地址"     if "地址"     in df.columns else "工作地址"
    ind_col  = "所属行业"

    group_skills = defaultdict(set)
    group_meta   = {}
    group_count  = defaultdict(int)

    for _, row in df.iterrows():
        name = str(row.get(name_col, "")).strip()
        if not name:
            continue
        group_count[name] += 1
        group_skills[name] |= extract_skills(str(row.get(desc_col, "")))
        if name not in group_meta:
            sal = str(row.get(sal_col, ""))
            group_meta[name] = {
                "company":      str(row.get(comp_col, "")),
                "salary_range": sal,
                "location":     str(row.get(loc_col, "")),
                "industry":     str(row.get(ind_col, "")),
                "avg_salary":   parse_salary_avg(sal),
            }

    valid_jobs = [n for n, cnt in group_count.items() if cnt >= MIN_COUNT]
    print(f"有效岗位数: {len(valid_jobs)}")

    cache = {}
    for center in valid_jobs:
        center_skills = group_skills[center]
        center_meta   = group_meta[center]
        candidates    = []
        for target in valid_jobs:
            if target == center:
                continue
            if target == center or target in center or center in target:
                continue
            sim = skill_similarity(center_skills, group_skills[target])
            if sim <= 0:
                continue
            diff = difficulty_from_sim(sim)
            tm   = group_meta[target]
            candidates.append({
                "job_name":     target,
                "match":        int(sim),
                "difficulty":   diff,
                "time":         time_from_difficulty(diff),
                "company":      tm["company"],
                "salary_range": tm["salary_range"],
                "location":     tm["location"],
                "industry":     tm["industry"],
            })

        candidates.sort(key=lambda x: -x["match"])
        ind_count = defaultdict(int)
        diverse   = []
        for c in candidates:
            key = c["industry"][:6]
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

        cache[center] = {
            "center_job":     {"job_name": center, **center_meta},
            "transferPaths":  diverse[:TOP_N],
            "skill_count":    len(center_skills),
        }

    out_path = os.path.join(base, OUTPUT_PATH)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f"完成：{len(cache)} 个岗位 -> {out_path}")
    for name in list(cache.keys())[:3]:
        print(f"  {name} -> {[p['job_name'] for p in cache[name]['transferPaths']]}")

if __name__ == "__main__":
    build_cache()
