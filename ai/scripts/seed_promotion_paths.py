"""
为所有主要岗位补充晋升路径数据，写入 job_promotion_path 表。
1）算法工程师（job_011）插入给定 4 阶段；
2）其余岗位用 AI 生成 4 阶段后写入。
运行：在 AI算法 目录下执行 python scripts/seed_promotion_paths.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yaml
from utils.path_tool import get_abs_path
from utils.logger_handler import logger

JOB_PROFILE_CONFIG = get_abs_path("config/job_profile.yml")

# 算法工程师晋升路径（用户给定）
ALGORITHM_ENGINEER_PROMOTION = [
    {"stage_name": "初级算法工程师", "years_range": "0-2年", "salary_range": "10k-18k", "role_title": "初级算法工程师", "skills": ["Python", "基础机器学习", "数据结构"], "icon": "🌱"},
    {"stage_name": "算法工程师", "years_range": "2-4年", "salary_range": "20k-35k", "role_title": "算法工程师", "skills": ["深度学习", "模型调优", "业务建模"], "icon": "🌿"},
    {"stage_name": "高级算法工程师", "years_range": "4-7年", "salary_range": "35k-55k", "role_title": "高级算法工程师", "skills": ["算法架构", "团队带教", "技术选型"], "icon": "🌳"},
    {"stage_name": "算法专家/AI技术总监", "years_range": "7年+", "salary_range": "60k+", "role_title": "算法专家/AI技术总监", "skills": ["战略规划", "技术领导力", "跨部门协作"], "icon": "🏆"},
]


def load_target_jobs():
    with open(JOB_PROFILE_CONFIG, "r", encoding="utf-8") as f:
        conf = yaml.load(f, Loader=yaml.FullLoader)
    return conf.get("target_jobs", [])


def main():
    from job_profile.job_relations_db import init_db, insert_promotion_path, get_promotion_path_by_job_id
    from job_profile.career_path_generator import generate_career_path

    init_db()
    target_jobs = load_target_jobs()
    if not target_jobs:
        logger.warning("未找到 target_jobs 配置")
        return

    # 1) 算法工程师 job_011 插入给定数据
    job_011_id = "job_011"
    insert_promotion_path(job_011_id, ALGORITHM_ENGINEER_PROMOTION)
    logger.info("已写入 job_011 算法工程师晋升路径（4 阶段）")

    # 2) 其余岗位用 AI 生成并写入
    default_icons = ["🌱", "🌿", "🌳", "🏆"]
    for j in target_jobs:
        job_id = j.get("job_id", "")
        name = (j.get("name") or "").strip()
        if not job_id or not name:
            continue
        if job_id == job_011_id:
            continue
        try:
            raw = generate_career_path(name)
            stages = []
            for i, s in enumerate(raw[:4]):
                stages.append({
                    "stage_name": (s.get("name") or "").strip() or f"阶段{i+1}",
                    "years_range": (s.get("time_range") or "").strip() or ["0-2年", "2-4年", "4-7年", "7年+"][i],
                    "salary_range": (s.get("salary_increase") or "").strip() or "—",
                    "role_title": (s.get("name") or "").strip(),
                    "skills": s.get("key_skills") or [],
                    "icon": (s.get("icon") or "").strip() or default_icons[i],
                })
            insert_promotion_path(job_id, stages)
            logger.info("已写入 %s %s 晋升路径（4 阶段）", job_id, name)
        except Exception as e:
            logger.warning("生成 %s %s 失败: %s", job_id, name, e)

    # 统计
    total = 0
    for j in target_jobs:
        job_id = j.get("job_id", "")
        if not job_id:
            continue
        rows = get_promotion_path_by_job_id(job_id)
        if len(rows) >= 4:
            total += 1
    logger.info("晋升路径填充完成，共 %d 个岗位有 4 阶段数据", total)


if __name__ == "__main__":
    main()
