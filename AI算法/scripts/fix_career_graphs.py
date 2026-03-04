# -*- coding: utf-8 -*-
"""
基于真实 CSV 数据生成岗位图谱 JSON（晋升路径 + 转岗路径）。
CSV 列名：岗位名称, 地址, 薪资范围, 公司名称, 所属行业, 公司规模, 公司类型, 岗位编码, 岗位详情, 更新日期, 公司详情, 岗位来源地址
"""
import os
import sys
import json
import pandas as pd

# 保证从 AI算法 目录运行
_script_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_script_dir)
if _root not in sys.path:
    sys.path.insert(0, _root)
os.chdir(_root)

CSV_PATH = os.path.join(_root, "data", "a13基于AI的大学生职业规划智能体-JD采样数据.csv")
OUT_PATH = os.path.join(_root, "data", "career_graphs.json")


def parse_salary(s):
    try:
        s = str(s).replace("元", "").replace("·", "").replace(" ", "")
        if "万" in s:
            s = s.replace("万", "")
            parts = s.split("-")
            return (float(parts[0]) + float(parts[1])) * 1000 / 2 if len(parts) == 2 else 0
        if "-" in s:
            s = s.replace("k", "").replace("K", "")
            parts = s.split("-")
            return (float(parts[0]) + float(parts[1])) / 2 if len(parts) == 2 else 0
        return 0
    except Exception:
        return 0


def main():
    if not os.path.exists(CSV_PATH):
        print(f"CSV 不存在: {CSV_PATH}")
        return
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    df.columns = df.columns.str.strip()
    name_col = "岗位名称"
    if name_col not in df.columns:
        print("CSV 缺少列: 岗位名称")
        return

    df["avg_salary"] = df["薪资范围"].apply(parse_salary)

    job_types = ["算法工程师", "前端", "硬件", "后端", "Java", "Python", "测试", "产品", "数据", "UI"]
    all_graphs = {}

    for job_type in job_types:
        # 1. 晋升路径（4 级，基于真实数据）
        levels = []
        keywords = [
            f"初级.*{job_type}|{job_type}.*初级",
            job_type,
            f"高级.*{job_type}|{job_type}.*高级",
            f"专家|架构师|资深.*{job_type}",
        ]
        level_names = ["初级", "中级", "高级", "专家/架构师"]

        for i, (kw, name) in enumerate(zip(keywords, level_names)):
            matched = df[df[name_col].astype(str).str.contains(kw, na=False, case=False, regex=True)]
            if len(matched) > 0:
                sample = matched.iloc[0]
                salary_val = sample.get("薪资范围", "")
                company_val = sample.get("公司名称", "")[:20] if "公司名称" in sample.index else ""
                addr_val = sample.get("地址", "") if "地址" in sample.index else ""
                desc_val = sample.get("岗位详情", "")
                if isinstance(desc_val, str):
                    desc_val = desc_val[:100].replace("\n", " ")
                else:
                    desc_val = ""
                levels.append({
                    "level": name,
                    "name": str(sample[name_col]),
                    "salary": str(salary_val),
                    "company": company_val,
                    "location": addr_val,
                    "skills": desc_val,
                })
            else:
                levels.append({
                    "level": name,
                    "name": f"{name}{job_type}",
                    "salary": f"{10 + i * 10}k-{20 + i * 15}k",
                    "company": "知名互联网公司",
                    "location": "北京/上海/深圳",
                    "skills": "技能要求详见岗位详情",
                })

        # 2. 转岗路径（6 个相关岗位，基于真实数据）
        transfer_jobs = []
        related = df[df[name_col].astype(str).str.contains(job_type, na=False, case=False)]
        if len(related) > 0:
            related_sorted = related.sort_values("avg_salary", ascending=False)
            seen_names = set()
            for _, row in related_sorted.iterrows():
                job_name = str(row[name_col])
                if job_name not in seen_names and len(transfer_jobs) < 6:
                    seen_names.add(job_name)
                    transfer_jobs.append({
                        "name": job_name,
                        "salary": str(row.get("薪资范围", "")),
                        "company": str(row.get("公司名称", ""))[:30] if "公司名称" in row.index else "",
                        "location": str(row.get("地址", "")) if "地址" in row.index else "",
                        "industry": str(row.get("所属行业", "")) if "所属行业" in row.index else "",
                        "scale": str(row.get("公司规模", "")) if "公司规模" in row.index else "",
                        "match": min(95, 70 + len(transfer_jobs) * 5),
                        "difficulty": ["容易", "中等", "较难"][len(transfer_jobs) % 3],
                        "time": ["3-6个月", "6-12个月", "12-18个月"][len(transfer_jobs) % 3],
                    })

        all_graphs[job_type] = {
            "career_path": levels,
            "transfer_paths": transfer_jobs,
        }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_graphs, f, ensure_ascii=False, indent=2)

    print(f"✅ 生成完成，共 {len(all_graphs)} 个岗位图谱")
    for job, data in all_graphs.items():
        print(f"  {job}: {len(data['career_path'])} 级晋升 + {len(data['transfer_paths'])} 个转岗")


if __name__ == "__main__":
    main()
