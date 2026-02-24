import pandas as pd
import os

# 文件路径
excel_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\a13基于AI的大学生职业规划智能体-JD采样数据.xls"
csv_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\求职岗位信息数据.csv"

# 读取Excel文件
try:
    print("读取Excel文件...")
    # 使用xlrd引擎读取xls文件
    df = pd.read_excel(excel_path, engine='xlrd')
    print(f"Excel文件读取成功！形状: {df.shape}")
    print("\nExcel文件列名:")
    print(df.columns.tolist())
except Exception as e:
    print(f"读取Excel文件失败: {e}")
    exit(1)

# 读取原始CSV文件以了解其结构
try:
    csv_df = pd.read_csv(csv_path, encoding='utf-8')
    print("\n原始CSV文件结构:")
    print(f"形状: {csv_df.shape}")
    print("列名:")
    print(csv_df.columns.tolist())
except Exception as e:
    print(f"读取CSV文件失败: {e}")

# 转换数据
print("\n开始转换数据...")

# 创建转换后的DataFrame
converted_data = []

for index, row in df.iterrows():
    # 提取Excel中的字段
    job_name = row[0] if len(row) > 0 else ''
    work_address = row[1] if len(row) > 1 else ''
    salary_range = row[2] if len(row) > 2 else ''
    company_name = row[3] if len(row) > 3 else ''
    industry = row[4] if len(row) > 4 else ''
    company_size = row[5] if len(row) > 5 else ''
    financing = row[6] if len(row) > 6 else ''
    job_id = row[7] if len(row) > 7 else ''
    job_description = row[8] if len(row) > 8 else ''
    publish_date = row[9] if len(row) > 9 else ''
    company_intro = row[10] if len(row) > 10 else ''
    job_link = row[11] if len(row) > 11 else ''  # 忽略此字段
    
    # 对应到CSV的字段
    # CSV字段：职位名称,工作地址,薪资范围,企业性质,公司全称,人员规模,所属行业,职位描述,公司简介,职位编号
    converted_row = {
        '职位名称': job_name,
        '工作地址': work_address,
        '薪资范围': salary_range,
        '企业性质': financing,  # Excel中的融资情况对应CSV中的企业性质
        '公司全称': company_name,
        '人员规模': company_size,
        '所属行业': industry,
        '职位描述': job_description,
        '公司简介': company_intro,
        '职位编号': job_id
    }
    
    converted_data.append(converted_row)

# 创建DataFrame
converted_df = pd.DataFrame(converted_data)
print(f"转换完成！生成数据行数: {len(converted_df)}")
print("\n转换后的数据前5行:")
print(converted_df.head())

# 保存为CSV文件
print("\n保存为CSV文件...")
try:
    converted_df.to_csv(csv_path, index=False, encoding='utf-8')
    print(f"CSV文件保存成功！路径: {csv_path}")
    print(f"保存的文件行数: {len(converted_df)}")
except Exception as e:
    print(f"保存CSV文件失败: {e}")
