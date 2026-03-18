"""
build_final_report.py
=====================
独立生成汇总报告 test_results/final_report.md。

使用方法：
  1) 先运行标准A与标准B脚本生成 JSON：
     python test_skill_match_accuracy.py
     python test_profile_accuracy.py
  2) 再运行：
     python build_final_report.py

如果某个 JSON 不存在，会在汇总里标注未生成。
"""

from __future__ import annotations

import datetime as _dt
import json
import os


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def main() -> int:
    repo_root = os.path.dirname(os.path.abspath(__file__))
    tr_dir = os.path.join(repo_root, "test_results")
    a_path = os.path.join(tr_dir, "skill_match_report.json")
    b_path = os.path.join(tr_dir, "profile_accuracy_report.json")

    a = None
    b = None
    if os.path.isfile(a_path):
        try:
            a = json.loads(_read_text(a_path))
        except Exception:
            a = None
    if os.path.isfile(b_path):
        try:
            b = json.loads(_read_text(b_path))
        except Exception:
            b = None

    lines = []
    lines.append("## GradQuest 比赛评分标准自动化测试汇总\n\n")
    lines.append(f"- 生成时间：`{_dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`\n\n")
    lines.append("### 指标汇总\n\n")
    lines.append("| 指标 | 阈值 | 实测 | 判定 | 说明 |\n")
    lines.append("|---|---:|---:|---|---|\n")
    if a and a.get("standard") == "A" and a.get("average_accuracy") is not None:
        lines.append(f"| 标准A：技能匹配准确率 | 80% | {a.get('average_accuracy')}% | {'通过' if a.get('passed') else '不通过'} | 随机3名学生×Top1岗位 |\n")
    else:
        lines.append("| 标准A：技能匹配准确率 | 80% | - | - | 未生成 `skill_match_report.json` |\n")
    if b and b.get("standard") == "B" and b.get("pass_rate") is not None:
        lines.append(f"| 标准B：画像关键信息准确率 | 90% | {b.get('pass_rate')}% | {'通过' if b.get('passed') else '不通过'} | 10名匹配成功样本×3项核对 |\n")
    else:
        lines.append("| 标准B：画像关键信息准确率 | 90% | - | - | 未生成 `profile_accuracy_report.json` |\n")

    if b and isinstance(b.get("per_student"), list):
        lines.append("\n### 标准B 明细（10名样本）\n\n")
        lines.append("| user_id | job | 学历 | 专业 | 证书 | 合格 |\n")
        lines.append("|---:|---|---|---|---|---|\n")
        for row in b["per_student"]:
            uid = row.get("user_id")
            job = row.get("job_name") or row.get("job_id") or ""
            edu = "✓" if row.get("education_ok") else "✗"
            major = "✓" if row.get("major_ok") else "✗"
            cert = "✓" if row.get("cert_ok") else "✗"
            ok = "✓" if row.get("qualified") else "✗"
            lines.append(f"| {uid} | {job} | {edu} | {major} | {cert} | {ok} |\n")

    os.makedirs(tr_dir, exist_ok=True)
    out_path = os.path.join(tr_dir, "final_report.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("".join(lines))
    print(f"已生成：{out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

