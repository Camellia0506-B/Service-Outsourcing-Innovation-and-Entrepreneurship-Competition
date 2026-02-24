import pandas as pd
import os

# 检查xlrd是否安装
try:
    import xlrd
    print(f"xlrd版本: {xlrd.__version__}")
except ImportError:
    print("xlrd未安装")

# 读取Excel文件
excel_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\a13基于AI的大学生职业规划智能体-JD采样数据.xls"
csv_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\求职岗位信息数据.csv"

# 尝试直接查看文件大小
print("\nExcel文件大小:")
print(f"{os.path.getsize(excel_path) / 1024 / 1024:.2f} MB")

# 读取CSV文件进行对比
try:
    csv_df = pd.read_csv(csv_path, encoding='utf-8')
    print("\nCSV文件读取成功！")
    print(f"CSV文件形状: {csv_df.shape}")
    print("\nCSV文件列名:")
    print(csv_df.columns.tolist())
    print("\nCSV文件前5行数据:")
    print(csv_df.head())
except Exception as e:
    print(f"读取CSV文件失败: {e}")

# 尝试使用xlrd直接读取
try:
    import xlrd
    print("\n尝试使用xlrd直接读取Excel文件...")
    workbook = xlrd.open_workbook(excel_path)
    sheet = workbook.sheet_by_index(0)
    print(f"Sheet名称: {sheet.name}")
    print(f"行数: {sheet.nrows}")
    print(f"列数: {sheet.ncols}")
    print("\n前5行数据:")
    for i in range(min(5, sheet.nrows)):
        print(sheet.row_values(i))
except Exception as e:
    print(f"使用xlrd读取Excel文件失败: {e}")
