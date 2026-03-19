# -*- coding: utf-8 -*-
"""Scan JD CSV for real-data counts (same columns as job_profile_router.get_real_data)."""
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, "data", "a13基于AI的大学生职业规划智能体-JD采样数据.csv")


def main():
    jobs = sys.argv[1:] or ["科研人员", "实施工程师", "算法工程师"]
    if not os.path.isfile(CSV):
        print("CSV not found:", CSV)
        return 1
    df = pd.read_csv(CSV, encoding="utf-8-sig")
    df.columns = df.columns.str.strip()
    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
    print("file:", CSV)
    print("total_rows:", len(df))
    print("name_col:", name_col)
    s = df[name_col].astype(str).str.strip()
    print()
    for job in jobs:
        exact = int((s == job).sum())
        contains_full = int(s.str.contains(job, na=False, regex=False).sum())
        kw4 = (job[:4] if len(job) >= 4 else job).strip()
        kw4_cnt = int(s.str.contains(kw4, na=False, regex=False).sum()) if kw4 else 0
        print("job=%r" % job)
        print("  exact_match:", exact)
        print("  contains_full:", contains_full)
        print("  keyword_4chars %r:" % kw4, kw4_cnt)
        print()
    # show breakdown for 科研
    mask_ke = s.str.contains("科研", na=False, regex=False)
    sub = df.loc[mask_ke, name_col].astype(str).str.strip()
    vc = sub.value_counts().head(30)
    print("top 30 job titles containing '科研':")
    print(vc.to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
