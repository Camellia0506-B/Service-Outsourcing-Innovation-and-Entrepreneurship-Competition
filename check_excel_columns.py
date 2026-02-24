"""
检查Excel文件的列名
"""

import pandas as pd

# Excel文件路径
excel_path = "AI算法/data/a13基于AI的大学生职业规划智能体-JD采样数据.xls"

try:
    # 使用xlrd引擎读取xls文件
    data = pd.read_excel(excel_path, engine='xlrd')
    
    print("Excel文件列名:")
    for i, col in enumerate(data.columns):
        print(f"{i+1}. {col}")
    
    print(f"\n文件共有 {len(data)} 行数据")
    print("\n前3行数据:")
    print(data.head(3))
except Exception as e:
    print(f"读取Excel文件失败: {e}")
