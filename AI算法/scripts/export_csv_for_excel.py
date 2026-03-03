"""
把 JD 采样 CSV 用标准双引号重新导出，便于 Excel 正确显示全部 12 列。
原因：岗位详情、公司详情 等列内含大量逗号，若未用双引号包裹，Excel 会按逗号拆列，只看到 4 列。

用法（在 AI算法 目录下）：
  python scripts/export_csv_for_excel.py
  python scripts/export_csv_for_excel.py --input data/xxx.csv --output data/xxx_excel.csv
"""
import csv
import os
import sys

# 项目根目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

def main():
    import argparse
    p = argparse.ArgumentParser(description="导出带双引号的 CSV 供 Excel 正确打开")
    p.add_argument("--input", "-i", default=None, help="输入 CSV 路径（默认 data/a13基于AI的大学生职业规划智能体-JD采样数据.csv）")
    p.add_argument("--output", "-o", default=None, help="输出 CSV 路径（默认在输入同目录下，文件名加 _excel）")
    args = p.parse_args()

    default_name = "a13基于AI的大学生职业规划智能体-JD采样数据.csv"
    input_path = args.input or os.path.join(ROOT, "data", default_name)
    input_path = os.path.abspath(input_path)
    if not os.path.isfile(input_path):
        print(f"输入文件不存在: {input_path}")
        sys.exit(1)

    if args.output:
        output_path = os.path.abspath(args.output)
    else:
        base, ext = os.path.splitext(input_path)
        output_path = base + "_excel" + ext

    rows = []
    with open(input_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_NONNUMERIC)
        w.writeheader()
        w.writerows(rows)

    print(f"已写入 {len(rows)} 行 -> {output_path}")
    print("用 Excel 打开上述文件即可看到全部列（岗位名称、地址、薪资范围、公司名称、所属行业、公司规模、公司类型、岗位编码、岗位详情、更新日期、公司详情、岗位来源地址）。")


if __name__ == "__main__":
    main()
