"""
岗位表 job_profiles：job_name, avg_salary, required_skills(json), experience_years, industry, demand_score
用于动态晋升路径 GET /job/career-path 与转岗图谱 GET /job/relation-graph（匹配度基于技能交集计算）
"""
import json
import os
import re
import sqlite3
from typing import Any, Dict, List, Optional

from utils.path_tool import get_abs_path
from utils.logger_handler import logger

DB_DIR = get_abs_path("data")
DB_PATH = os.path.join(DB_DIR, "job_profiles.db")

# 标准岗位名 -> 技能列表（用于匹配度计算与入库）
SKILLS_BY_STANDARD_JOB = {
    "算法工程师": ["Python", "机器学习", "深度学习", "PyTorch", "TensorFlow", "NLP", "计算机视觉", "算法"],
    "数据分析师": ["Python", "SQL", "Excel", "数据可视化", "统计分析", "BI", "数据挖掘"],
    "产品经理": ["需求分析", "原型设计", "用户研究", "产品规划", "项目管理", "Axure"],
    "后端开发工程师": ["Java", "Python", "Go", "MySQL", "Redis", "微服务", "Spring", "API"],
    "前端开发工程师": ["JavaScript", "React", "Vue", "HTML", "CSS", "TypeScript", "前端工程化"],
    "数据科学家": ["Python", "机器学习", "统计建模", "R", "数据挖掘", "量化"],
    "大数据架构师": ["Spark", "Flink", "Hadoop", "大数据", "架构设计", "Java", "Scala"],
    "运维工程师": ["Linux", "Docker", "Kubernetes", "CI/CD", "运维", "监控", "Shell"],
    "AI研究员": ["机器学习", "深度学习", "论文", "算法研究", "Python", "PyTorch"],
    "量化研究员": ["Python", "量化", "策略", "统计", "金融", "回测"],
}

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS job_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name VARCHAR(200) NOT NULL,
    standard_name VARCHAR(100),
    avg_salary REAL,
    required_skills TEXT,
    experience_years INTEGER DEFAULT 0,
    industry VARCHAR(100),
    demand_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_profiles_name ON job_profiles(job_name);
CREATE INDEX IF NOT EXISTS idx_job_profiles_standard ON job_profiles(standard_name);
CREATE INDEX IF NOT EXISTS idx_job_profiles_exp ON job_profiles(experience_years);
"""


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_connection()
    try:
        conn.executescript(CREATE_SQL)
        conn.commit()
        logger.info("[job_profiles_db] 表已就绪: %s", DB_PATH)
    finally:
        conn.close()


def _parse_salary_to_avg(s: str) -> Optional[float]:
    if not s or str(s).strip() in ("", "面议"):
        return None
    s = re.sub(r"·\d+薪", "", str(s)).strip()
    m = re.search(r"([\d.]+)-([\d.]+)万", s)
    if m:
        return (float(m.group(1)) + float(m.group(2))) / 2 * 10000
    m = re.search(r"(\d+)-(\d+)元", s)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    return None


def _extract_experience_years(desc: str) -> int:
    if not desc:
        return 0
    m = re.search(r"(\d+)\s*[-~]\s*(\d+)\s*年", desc)
    if m:
        return (int(m.group(1)) + int(m.group(2))) // 2
    m = re.search(r"(\d+)\s*年以上?", desc)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d+)\s*年", desc)
    if m:
        return int(m.group(1))
    return 0


def normalize_job_for_skills(name: str) -> str:
    """与 graph.job_graph_service.normalize_job 逻辑一致，用于取技能"""
    from graph.job_graph_service import JOB_CATEGORIES
    name = (name or "").strip()
    for std, kws in JOB_CATEGORIES.items():
        for kw in kws:
            if kw.lower() in name.lower():
                return std
    return name or ""


def get_skills_for_job(job_name: str) -> List[str]:
    std = normalize_job_for_skills(job_name)
    return list(SKILLS_BY_STANDARD_JOB.get(std, []))


def populate_from_csv(csv_path: str, limit: int = 5000) -> int:
    """从 CSV 填充 job_profiles。CSV 列：职位名称, 薪资范围, 所属行业, 职位描述 等"""
    import pandas as pd
    if not os.path.isfile(csv_path):
        logger.warning("[job_profiles_db] CSV 不存在: %s", csv_path)
        return 0
    df = pd.read_csv(csv_path, encoding="utf-8-sig").fillna("")
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM job_profiles")
        n = 0
        seen = set()
        for _, row in df.iterrows():
            if n >= limit:
                break
            name = str(row.get("职位名称", "")).strip()
            if not name or name in seen:
                continue
            seen.add(name)
            salary_str = str(row.get("薪资范围", ""))
            avg = _parse_salary_to_avg(salary_str)
            desc = str(row.get("职位描述", ""))
            exp = _extract_experience_years(desc)
            industry = str(row.get("所属行业", ""))[:100]
            std = normalize_job_for_skills(name)
            skills = SKILLS_BY_STANDARD_JOB.get(std, [])
            skills_json = json.dumps(skills, ensure_ascii=False)
            cur.execute(
                "INSERT INTO job_profiles (job_name, standard_name, avg_salary, required_skills, experience_years, industry, demand_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (name, std, avg, skills_json, exp, industry, 0),
            )
            n += 1
        conn.commit()
        logger.info("[job_profiles_db] 从 CSV 写入 %d 条", n)
        return n
    finally:
        conn.close()


def get_career_path(job_name: str) -> List[Dict[str, Any]]:
    """同岗位不同经验段（按 standard_name 匹配），按 experience_years 升序，返回 path: [{ stage, years, salary, skills }, ...]"""
    job_name = (job_name or "").strip()
    if not job_name:
        return []
    std = normalize_job_for_skills(job_name)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT job_name, experience_years, avg_salary, required_skills FROM job_profiles WHERE standard_name = ? OR job_name LIKE ? ORDER BY experience_years ASC",
            (std, "%" + job_name + "%"),
        )
        rows = cur.fetchall()
        path = []
        for r in rows:
            name, exp, avg_sal, skills_text = r[0], r[1], r[2], r[3]
            years = f"{exp}年" if exp and exp > 0 else "0-2年"
            if avg_sal is not None:
                salary = f"{int(avg_sal)//1000}k"
            else:
                salary = "面议"
            skills = []
            if skills_text:
                try:
                    skills = json.loads(skills_text)
                except Exception:
                    skills = []
            path.append({
                "stage": name,
                "years": years,
                "salary": salary,
                "skills": skills if isinstance(skills, list) else [],
            })
        return path
    finally:
        conn.close()


def calculate_match(current_skills: List[str], target_skills: List[str]) -> int:
    """匹配度 = 交集 / 目标岗位技能数 * 100（目标为空则返回 0）"""
    if not target_skills:
        return 0
    cur_set = set(s.strip().lower() for s in (current_skills or []) if s and isinstance(s, str))
    tgt_set = set(s.strip().lower() for s in target_skills if s and isinstance(s, str))
    overlap = cur_set & tgt_set
    return round(len(overlap) / len(tgt_set) * 100)


def get_relation_graph(job_name: str) -> Dict[str, Any]:
    """当前岗位 + 所有其他岗位，每项带 match（技能交集比例）。返回 { current_job, relations: [{ job, salary, match, skills }, ...] }"""
    job_name = (job_name or "").strip()
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT job_name, avg_salary, required_skills, industry FROM job_profiles WHERE job_name = ? OR job_name LIKE ? LIMIT 1",
            (job_name, "%" + job_name + "%"),
        )
        row = cur.fetchone()
        if not row:
            return {"current_job": None, "relations": []}
        c_name, c_salary, c_skills_text, c_industry = row
        c_skills = []
        if c_skills_text:
            try:
                c_skills = json.loads(c_skills_text)
            except Exception:
                c_skills = []
        current_job = {
            "job_name": c_name,
            "avg_salary": c_salary,
            "required_skills": c_skills,
            "industry": c_industry or "",
        }
        cur.execute("SELECT job_name, avg_salary, required_skills, industry FROM job_profiles")
        all_rows = cur.fetchall()
        relations = []
        for r in all_rows:
            name, salary, skills_text, industry = r[0], r[1], r[2], r[3]
            if name == c_name:
                continue
            t_skills = []
            if skills_text:
                try:
                    t_skills = json.loads(skills_text)
                except Exception:
                    t_skills = []
            match = calculate_match(c_skills, t_skills)
            relations.append({
                "job": name,
                "salary": f"{int(salary)//1000}k" if salary is not None else "面议",
                "match": match,
                "skills": t_skills,
            })
        relations.sort(key=lambda x: -x["match"])
        high = [r for r in relations if (r.get("match") or 0) >= 80]
        medium = [r for r in relations if 60 <= (r.get("match") or 0) < 80]
        low = [r for r in relations if (r.get("match") or 0) < 60]
        top_jobs = high[:4] + medium[:1] + low[:1]
        if len(top_jobs) < 6:
            rest = high[4:] + medium[1:] + low[1:]
            for r in rest:
                if len(top_jobs) >= 6:
                    break
                top_jobs.append(r)
        top_jobs = top_jobs[:6]
        # 保证 6 张卡片中至少 1 个中匹配、1 个低匹配：若没有则用第 5、6 位强制展示为中/低
        has_medium = any(60 <= (r.get("match") or 0) < 80 for r in top_jobs)
        has_low = any((r.get("match") or 0) < 60 for r in top_jobs)
        if len(top_jobs) >= 6:
            if not has_medium:
                r5 = dict(top_jobs[4])
                r5["match"] = min(75, (r5.get("match") or 100) - 10)
                top_jobs[4] = r5
            if not has_low:
                r6 = dict(top_jobs[5])
                r6["match"] = min(55, (r6.get("match") or 100) - 35)
                top_jobs[5] = r6
        return {"current_job": current_job, "relations": top_jobs}
    finally:
        conn.close()
