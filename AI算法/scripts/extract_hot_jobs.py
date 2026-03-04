# -*- coding: utf-8 -*-
"""从 a13 CSV 提取热门岗位，生成 data/hot_jobs.json（Top 12）"""
import pandas as pd
import json
import os

def standardize_job_name(name):
    if pd.isna(name):
        return None
    name = str(name).split('（')[0].split('(')[0]
    if '·' in name:
        name = name.split('·')[-1]
    name = name.strip()

    if 'java' in name.lower() and '开发' in name:
        return 'Java开发工程师'
    if 'python' in name.lower() and '开发' in name:
        return 'Python开发工程师'
    if '前端' in name:
        return '前端开发工程师'
    if '后端' in name and 'java' not in name.lower():
        return '后端开发工程师'
    if '算法' in name:
        return '算法工程师'
    if '数据分析' in name:
        return '数据分析师'
    if '产品经理' in name or '产品' in name:
        return '产品经理'
    if '测试' in name:
        return '测试工程师'
    if '运维' in name:
        return '运维工程师'
    if 'ui' in name.lower() or 'ux' in name.lower() or '设计' in name:
        return 'UI/UX设计师'

    return name

def categorize_job(job_name):
    if any(x in job_name for x in ['开发', '工程师', '架构', '算法', '测试', '运维']):
        return '技术研发'
    elif '产品' in job_name:
        return '产品运营'
    elif '设计' in job_name:
        return '设计创意'
    elif '数据' in job_name or '分析' in job_name:
        return '数据分析'
    else:
        return '其他'

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    csv_path = os.path.join(root, 'data', 'a13基于AI的大学生职业规划智能体-JD采样数据.csv')
    out_path = os.path.join(root, 'data', 'hot_jobs.json')

    if not os.path.exists(csv_path):
        print(f"CSV 不存在: {csv_path}")
        return

    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    df.columns = df.columns.str.strip()
    name_col = '岗位名称' if '岗位名称' in df.columns else '职位名称'
    if name_col not in df.columns:
        print("未找到岗位名称列")
        return

    df['标准岗位名称'] = df[name_col].apply(standardize_job_name)
    df = df[df['标准岗位名称'].notna()]

    job_counts = df['标准岗位名称'].value_counts()
    print(f"总数据量: {len(df)}条")
    print("\nTop 20 岗位频次:")
    for job, count in job_counts.head(20).items():
        print(f"  {job}: {count}条")

    result = []
    for job_name, count in job_counts.head(12).items():
        job_data = df[df['标准岗位名称'] == job_name]
        salary_col = '薪资范围' if '薪资范围' in job_data.columns else 'salary'
        industry_col = '所属行业' if '所属行业' in job_data.columns else 'industry'
        salary = job_data[salary_col].mode().iloc[0] if salary_col in job_data.columns and len(job_data[salary_col].mode()) > 0 else '15k-25k'
        industry = job_data[industry_col].mode().iloc[0] if industry_col in job_data.columns and len(job_data[industry_col].mode()) > 0 else '互联网'
        if hasattr(salary, 'replace'):
            salary = str(salary).replace('元', '').strip()
        else:
            salary = str(salary)
        industry = str(industry).strip() if pd.notna(industry) else '互联网'

        result.append({
            'jobName': job_name,
            'level': '中级',
            'salaryRange': salary,
            'category': categorize_job(job_name),
            'industry': industry,
            'heat': min(int((count / job_counts.max()) * 100), 100),
            'tags': ['技术', '经验', '学历'],
            'dataCount': int(count)
        })

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n已保存12个热门岗位到 {out_path}")
    for i, job in enumerate(result, 1):
        print(f"{i}. {job['jobName']}: {job['dataCount']}条数据")

if __name__ == '__main__':
    main()
