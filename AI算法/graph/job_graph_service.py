# 关联图谱：岗位搜索与薪资上下文（基于 求职岗位信息数据.csv）
import pandas as pd
import re
import os
from functools import lru_cache

# 使用绝对路径确保正确加载
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', '求职岗位信息数据.csv')


@lru_cache(maxsize=1)
def load_jobs():
    """启动时加载一次，缓存内存，不要每次请求都读文件"""
    # 清除缓存以确保加载新数据
    load_jobs.cache_clear()
    df = pd.read_csv(CSV_PATH, encoding='utf-8')
    df = df.fillna('')
    print(f"加载岗位数据成功，共 {len(df)} 条记录")
    return df


def parse_salary(s: str) -> dict:
    """统一解析各种薪资格式为结构化数据"""
    if not s or str(s).strip() == '面议':
        return {"min": None, "max": None, "display": "面议"}
    s = re.sub(r'·\d+薪', '', str(s)).strip()
    m = re.search(r'([\d.]+)-([\d.]+)万', s)
    if m:
        lo, hi = int(float(m.group(1)) * 10000), int(float(m.group(2)) * 10000)
        return {"min": lo, "max": hi, "display": f"{lo//1000}k–{hi//1000}k"}
    m = re.search(r'(\d+)-(\d+)元', s)
    if m:
        lo, hi = int(m.group(1)), int(m.group(2))
        return {"min": lo, "max": hi, "display": f"{lo//1000}k–{hi//1000}k"}
    return {"min": None, "max": None, "display": str(s)}


JOB_CATEGORIES = {
    "算法工程师":     ["算法", "计算机视觉", "CV", "NLP", "深度学习", "AI工程", "大模型", "机器学习工程"],
    "数据分析师":     ["数据分析", "数据挖掘", "BI", "数据运营", "报表分析"],
    "产品经理":       ["产品经理", "产品总监", "AI产品", "产品负责人", "产品运营"],
    "后端开发工程师": ["后端", "Java工程师", "Python开发", "服务端", "Spring", "Go工程师", "Node.js"],
    "前端开发工程师": ["前端", "React", "Vue", "H5开发", "小程序开发", "Web开发"],
    "数据科学家":     ["数据科学", "机器学习", "统计建模", "量化建模"],
    "大数据架构师":   ["架构师", "大数据", "Spark", "Flink", "Hadoop", "系统架构", "技术总监"],
    "量化研究员":     ["量化", "策略研究", "量化交易", "对冲基金"],
    "AI研究员":       ["研究员", "research scientist", "AI研究", "创新算法", "前沿算法"],
    "运维工程师":     ["运维", "DevOps", "SRE", "k8s", "容器化", "云原生"],
}


def normalize_job(name: str) -> str:
    """将原始职位名标准化为标准岗位名"""
    for std, kws in JOB_CATEGORIES.items():
        for kw in kws:
            if kw.lower() in (name or '').lower():
                return std
    return name or ""


def search_jobs(keyword: str, top_n: int = 10) -> list:
    """从CSV检索岗位，支持精确/模糊/标准化/描述匹配，响应 < 100ms"""
    df = load_jobs()
    kw = keyword.lower().strip()
    results = []

    for _, row in df.iterrows():
        name = str(row.get('职位名称', ''))
        score = 0
        if kw == name.lower():
            score = 100
        elif kw in name.lower():
            score = 80
        elif normalize_job(name).lower() == kw:
            score = 70
        elif kw in normalize_job(name).lower():
            score = 60
        elif kw in str(row.get('职位描述', '')).lower():
            score = 30

        if score > 0:
            sal = parse_salary(str(row.get('薪资范围', '')))
            results.append({
                "job_id":        str(row.get('职位编号', '')),
                "job_name":      name,
                "standard_name": normalize_job(name),
                "salary":        sal,
                "location":      str(row.get('工作地址', '')),
                "company":       str(row.get('公司全称', '')),
                "industry":      str(row.get('所属行业', '')),
                "description":   str(row.get('职位描述', ''))[:300],
                "company_nature": str(row.get('企业性质', '')),
                "company_scale": str(row.get('人员规模', '')),
                "company_intro": str(row.get('公司简介', ''))[:500],
                "score":         score
            })

    results.sort(key=lambda x: -x['score'])
    return results[:top_n]


def get_salary_context(job_name: str) -> dict:
    """从数据集提取真实薪资上下文，供AI生成路径时参考"""
    results = search_jobs(job_name, top_n=50)
    salaries   = [r['salary']['display'] for r in results if r['salary']['display'] != '面议']
    industries = list(set(r['industry'] for r in results if r['industry']))[:5]
    companies  = list(set(r['company']  for r in results if r['company']))[:8]
    return {
        "total_found":    len(results),
        "salary_samples": salaries[:10],
        "industries":     industries,
        "companies":      companies,
    }
