import pandas as pd
import json
import os

# 文件路径
csv_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\求职岗位信息数据.csv"
json_path = r"D:\服创2026.A13\Service-Outsourcing-Innovation-and-Entrepreneurship-Competition\AI算法\data\job_profiles\profiles.json"

# 读取CSV文件
try:
    print("读取CSV文件...")
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"CSV文件读取成功！形状: {df.shape}")
    print("\nCSV文件列名:")
    print(df.columns.tolist())
except Exception as e:
    print(f"读取CSV文件失败: {e}")
    exit(1)

# 读取原始JSON文件以了解其结构
try:
    with open(json_path, 'r', encoding='utf-8') as f:
        original_json = json.load(f)
    print("\n原始JSON文件读取成功！")
    print(f"原始JSON文件包含 {len(original_json)} 个岗位画像")
except Exception as e:
    print(f"读取原始JSON文件失败: {e}")
    exit(1)

# 转换数据
print("\n开始转换数据...")

# 创建新的岗位画像数据
new_profiles = {}

# 生成岗位ID的前缀
prefixes = ['IT', 'SALES', 'MARKET', 'ADM', 'HR', 'FIN', 'ENG', 'RD', 'OP']

for index, row in df.iterrows():
    # 提取CSV中的字段
    job_name = row.get('职位名称', '')
    work_address = row.get('工作地址', '')
    salary_range = row.get('薪资范围', '')
    company_type = row.get('企业性质', '')
    company_name = row.get('公司全称', '')
    company_size = row.get('人员规模', '')
    industry = row.get('所属行业', '')
    job_description = row.get('职位描述', '')
    company_intro = row.get('公司简介', '')
    job_id = row.get('职位编号', '')
    
    # 生成岗位ID
    if not job_id:
        # 使用行业前缀和索引生成ID
        prefix = prefixes[index % len(prefixes)]
        job_id = f"{prefix}-{str(index).zfill(4)}"
    else:
        # 使用CSV中的职位编号作为岗位ID
        job_id = str(job_id)
    
    # 确定岗位级别
    level = "初级"
    if "高级" in job_name or "资深" in job_name:
        level = "高级"
    elif "中级" in job_name or "工程师" in job_name:
        level = "中级"
    
    # 构建岗位画像结构
    profile = {
        "job_id": job_id,
        "job_name": job_name,
        "basic_info": {
            "industry": industry,
            "level": level,
            "level_range": [level],
            "salary_range": salary_range,
            "avg_salary": salary_range,
            "location": work_address,
            "work_locations": [work_address],
            "company": company_name,
            "company_scale": company_size,
            "company_type": company_type
        },
        "requirements": {
            "professional_skills": {
                "programming_languages": [],
                "frameworks_tools": [],
                "domain_knowledge": []
            },
            "basic_requirements": {
                "education": {
                    "level": "本科",
                    "preferred_majors": ["计算机", "软件工程", "电子信息"]
                },
                "gpa": {
                    "min_requirement": "3.0/4.0",
                    "preferred": "3.5/4.0以上",
                    "weight": 0.05
                }
            },
            "soft_skills": {
                "innovation": "中",
                "learning": "高",
                "communication": "高",
                "pressure": "中"
            }
        },
        "description": job_description,
        "company_intro": company_intro,
        "market_analysis": {
            "demand_score": 75,
            "growth_trend": "稳定"
        }
    }
    
    # 添加到新的岗位画像数据中
    new_profiles[job_id] = profile

print(f"转换完成！生成 {len(new_profiles)} 个岗位画像")

# 保存为JSON文件
print("\n保存为JSON文件...")
try:
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(new_profiles, f, ensure_ascii=False, indent=2)
    print(f"JSON文件保存成功！路径: {json_path}")
    print(f"保存的岗位画像数量: {len(new_profiles)}")
except Exception as e:
    print(f"保存JSON文件失败: {e}")
