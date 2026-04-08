# -*- coding: utf-8 -*-
"""
生成晋升路径数据（基于真实数据集 CSV）
输出: data/career_graph_data.json
"""
import os
import sys
import pandas as pd
import json

# 项目根目录为 AI算法/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

CSV_PATH = os.path.join(ROOT, "data", "a13基于AI的大学生职业规划智能体-JD采样数据.csv")
OUT_PATH = os.path.join(ROOT, "data", "career_graph_data.json")

def parse_salary(salary_str):
    try:
        s = str(salary_str).strip()
        if not s or pd.isna(salary_str):
            return 0
        s = s.replace("元", "").replace("k", "").replace("K", "").replace("万", "").replace("/天", "").strip()
        if "-" in s:
            parts = s.split("-")
            if len(parts) >= 2:
                a, b = float(parts[0].strip()), float(parts[1].strip())
                return (a + b) / 2
        return float(s) if s else 0
    except Exception:
        return 0


def main():
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV 不存在: {CSV_PATH}")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    df.columns = df.columns.str.strip()

    # 列名兼容：CSV 为 岗位名称 / 地址 / 公司名称 / 岗位详情
    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
    if name_col not in df.columns:
        print("❌ 未找到职位名称列")
        sys.exit(1)

    job_name = "算法工程师"
    job_data = df[df[name_col].astype(str).str.contains(job_name, na=False, case=False)]

    job_data = job_data.copy()
    job_data["avg_salary"] = job_data["薪资范围"].apply(parse_salary)
    top_5 = job_data.nlargest(5, "avg_salary")

    # 晋升路径（4 级）
    levels = ["初级", "中级", "高级", "专家"]
    career_path = []
    for i, level in enumerate(levels):
        level_data = df[df[name_col].astype(str).str.contains(level, na=False)]
        if len(level_data) > 0:
            sample = level_data.iloc[0]
            career_path.append({
                "level": level,
                "name": f"{level}{job_name}",
                "time": f"{i*2}-{(i+1)*2}年",
                "salary": str(sample.get("薪资范围", "")),
                "icon": ["🌱", "🌿", "🌳", "🏆"][i],
            })
        else:
            career_path.append({
                "level": level,
                "name": f"{level}{job_name}",
                "time": f"{i*2}-{(i+1)*2}年",
                "salary": f"{10+i*10}k-{20+i*15}k",
                "icon": ["🌱", "🌿", "🌳", "🏆"][i],
            })

    # 转岗路径（从真实数据找相关岗位）
    related_keywords = ["机器学习", "数据科学", "AI产品", "计算机视觉", "数据挖掘", "深度学习"]
    transfer_paths = []
    addr_col = "地址" if "地址" in df.columns else "工作地址"
    for kw in related_keywords:
        related_data = df[df[name_col].astype(str).str.contains(kw, na=False)]
        if len(related_data) > 0:
            sample = related_data.iloc[0]
            transfer_paths.append({
                "name": str(sample.get(name_col, kw)),
                "salary": str(sample.get("薪资范围", "")),
                "match": 85,
                "difficulty": "中",
                "time": "6-12个月",
                "location": str(sample.get(addr_col, "")),
            })

    # Top5 岗位
    company_col = "公司名称" if "公司名称" in df.columns else "公司全称"
    scale_col = "公司规模" if "公司规模" in df.columns else "人员规模"
    type_col = "公司类型" if "公司类型" in df.columns else "企业性质"
    desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
    top_jobs = []
    for _, row in top_5.iterrows():
        desc = str(row.get(desc_col, ""))
        top_jobs.append({
            "company": str(row.get(company_col, "")),
            "location": str(row.get(addr_col, "")),
            "salary": str(row.get("薪资范围", "")),
            "industry": str(row.get("所属行业", "")),
            "scale": str(row.get(scale_col, "")),
            "type": str(row.get(type_col, "")),
            "description": (desc[:200] + "...") if len(desc) > 200 else desc,
        })

    result = {
        "career_path": career_path[:4],
        "transfer_paths": transfer_paths[:6],
        "top_5_jobs": top_jobs,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("✅ 生成完成")
    print(f"晋升路径: {len(career_path)} 级")
    print(f"转岗路径: {len(transfer_paths)} 条")
    print(f"Top5 岗位: {len(top_jobs)} 个")


if __name__ == "__main__":
    main()
