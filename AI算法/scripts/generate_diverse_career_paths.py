# -*- coding: utf-8 -*-
"""
生成多样化晋升路径 JSON（不同岗位不同阶段名称与年限）。
CSV 列名：岗位名称, 地址, 薪资范围, 公司名称, 所属行业, 公司规模, 岗位详情
"""
import os
import sys
import json
import pandas as pd

_script_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_script_dir)
if _root not in sys.path:
    sys.path.insert(0, _root)
os.chdir(_root)

CSV_PATH = os.path.join(_root, "data", "a13基于AI的大学生职业规划智能体-JD采样数据.csv")
OUT_PATH = os.path.join(_root, "data", "diverse_career_paths.json")

NAME_COL = "岗位名称"
COMPANY_COL = "公司名称"
ADDR_COL = "地址"
SALARY_COL = "薪资范围"
DESC_COL = "岗位详情"

CAREER_PATTERNS = {
    "测试": [
        {"level": "测试工程师", "year": "0-2年", "salary_range": (8, 15)},
        {"level": "高级测试工程师", "year": "2-4年", "salary_range": (15, 25)},
        {"level": "测试架构师/测试专家", "year": "4-7年", "salary_range": (25, 40)},
        {"level": "测试总监/质量负责人", "year": "7年+", "salary_range": (40, 60)},
    ],
    "科研": [
        {"level": "科研助理", "year": "0-2年", "salary_range": (6, 12)},
        {"level": "研究员", "year": "2-4年", "salary_range": (12, 20)},
        {"level": "高级研究员/副研究员", "year": "4-7年", "salary_range": (20, 35)},
        {"level": "首席科学家/研究所长", "year": "7年+", "salary_range": (35, 80)},
    ],
    "前端": [
        {"level": "前端开发工程师", "year": "0-2年", "salary_range": (10, 18)},
        {"level": "高级前端工程师", "year": "2-5年", "salary_range": (18, 30)},
        {"level": "前端技术专家/架构师", "year": "5-8年", "salary_range": (30, 50)},
        {"level": "前端技术总监/CTO", "year": "8年+", "salary_range": (50, 100)},
    ],
    "算法": [
        {"level": "算法工程师", "year": "0-3年", "salary_range": (15, 30)},
        {"level": "高级算法工程师", "year": "3-5年", "salary_range": (30, 50)},
        {"level": "算法专家/技术负责人", "year": "5-8年", "salary_range": (50, 80)},
        {"level": "首席科学家/AI Lab负责人", "year": "8年+", "salary_range": (80, 150)},
    ],
    "Java": [
        {"level": "Java开发工程师", "year": "0-3年", "salary_range": (10, 20)},
        {"level": "高级Java工程师", "year": "3-5年", "salary_range": (20, 35)},
        {"level": "Java架构师/技术专家", "year": "5-8年", "salary_range": (35, 60)},
        {"level": "技术总监/CTO", "year": "8年+", "salary_range": (60, 120)},
    ],
    "产品": [
        {"level": "产品助理/初级PM", "year": "0-2年", "salary_range": (8, 15)},
        {"level": "产品经理", "year": "2-4年", "salary_range": (15, 30)},
        {"level": "高级产品经理/产品专家", "year": "4-7年", "salary_range": (30, 50)},
        {"level": "产品总监/CPO", "year": "7年+", "salary_range": (50, 100)},
    ],
    "硬件": [
        {"level": "硬件工程师", "year": "0-3年", "salary_range": (8, 16)},
        {"level": "高级硬件工程师", "year": "3-5年", "salary_range": (16, 28)},
        {"level": "硬件架构师/硬件专家", "year": "5-8年", "salary_range": (28, 45)},
        {"level": "硬件总监/技术VP", "year": "8年+", "salary_range": (45, 80)},
    ],
}


def main():
    if not os.path.exists(CSV_PATH):
        print(f"CSV 不存在: {CSV_PATH}")
        return
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    df.columns = df.columns.str.strip()
    if NAME_COL not in df.columns:
        print("CSV 缺少列: 岗位名称")
        return

    results = {}
    for job_type, pattern in CAREER_PATTERNS.items():
        matched = df[df[NAME_COL].astype(str).str.contains(job_type, na=False, case=False)]
        if len(matched) == 0:
            continue

        career_path = []
        for level_info in pattern:
            first_part = level_info["level"].split("/")[0].split("|")[0]
            level_matched = matched[
                matched[NAME_COL].astype(str).str.contains(first_part, na=False, case=False)
            ]
            if len(level_matched) > 0:
                sample = level_matched.iloc[0]
                desc = sample.get(DESC_COL, "")
                desc_str = (str(desc)[:120].replace("\n", " ") if isinstance(desc, str) else "")
                career_path.append({
                    "level": level_info["level"],
                    "year": level_info["year"],
                    "realExample": {
                        "jobName": str(sample[NAME_COL]),
                        "company": str(sample.get(COMPANY_COL, ""))[:30],
                        "location": str(sample.get(ADDR_COL, "")),
                        "salary": str(sample.get(SALARY_COL, "")),
                        "skills": desc_str,
                    },
                })
            else:
                lo, hi = level_info["salary_range"]
                career_path.append({
                    "level": level_info["level"],
                    "year": level_info["year"],
                    "salaryRange": f"{lo}k-{hi}k",
                    "description": f"{level_info['level']}阶段需要{level_info['year']}工作经验",
                })

        results[job_type] = career_path

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"✅ 生成 {len(results)} 种多样化晋升路径")
    for job, path in results.items():
        levels = [p["level"] for p in path]
        print(f"  {job}: {' → '.join(levels)}")


if __name__ == "__main__":
    main()
