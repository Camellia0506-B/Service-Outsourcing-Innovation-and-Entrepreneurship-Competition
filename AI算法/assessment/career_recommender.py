"""
职业测评报告 - 计算机相关岗位推荐
结合 Holland Code、MBTI 与岗位数据集（求职岗位信息数据.csv）生成：
- 适合职业领域推荐（suitable_fields）
- 最匹配职业（suitable_careers，来自数据集）
"""

import csv
import os
from typing import List, Dict, Any, Optional, Tuple
from utils.logger_handler import logger
from utils.path_tool import get_abs_path


# 适合职业领域：固定为计算机相关岗位类型（用于报告展示）
STANDARD_IT_FIELDS = [
    "前端开发工程师",
    "后端开发工程师",
    "算法工程师",
    "产品经理",
    "UI/UX设计师",
    "数据分析师",
    "测试工程师",
    "运维工程师",
    "项目经理",
    "网络安全工程师",
]

# 职位名称关键词 -> 标准领域（用于从 CSV 职位归类）
JOB_TITLE_TO_FIELD = [
    (["前端", "web前端", "vue", "react", "前端开发"], "前端开发工程师"),
    (["后端", "java开发", "python开发", "go开发", "服务端", "后台开发", "开发工程师", "软件开发"], "后端开发工程师"),
    (["算法", "机器学习", "深度学习", "AI", "人工智能", "算法工程师"], "算法工程师"),
    (["产品经理", "产品专员", "ITBP", "产品助理"], "产品经理"),
    (["UI", "UX", "交互设计", "界面设计", "视觉设计", "设计师"], "UI/UX设计师"),
    (["数据分析", "数据开发", "数据工程师", "BI", "数据科学"], "数据分析师"),
    (["测试", "QA", "测试工程师", "测试开发"], "测试工程师"),
    (["运维", "运维工程师", "DevOps", "SRE", "IT运维", "系统运维", "运维开发"], "运维工程师"),
    (["项目经理", "项目主管", "PM", "项目管理", "实施经理"], "项目经理"),
    (["安全", "网络安全", "信息安全", "安全工程师", "渗透"], "网络安全工程师"),
]

# Holland 类型 -> 更匹配的标准领域（用于按兴趣排序）
HOLLAND_TO_FIELDS = {
    "R": ["运维工程师", "网络安全工程师", "测试工程师"],  # 实用型
    "I": ["算法工程师", "数据分析师", "后端开发工程师"],   # 研究型
    "A": ["前端开发工程师", "UI/UX设计师", "产品经理"],   # 艺术型
    "S": ["产品经理", "项目经理", "数据分析师"],          # 社会型
    "E": ["产品经理", "项目经理", "运维工程师"],          # 企业型
    "C": ["测试工程师", "数据分析师", "运维工程师"],       # 常规型
}


def _load_jobs_csv() -> List[Dict[str, str]]:
    """加载求职岗位信息数据.csv，只保留计算机/IT 相关岗位。"""
    path = get_abs_path("data/求职岗位信息数据.csv")
    if not os.path.exists(path):
        logger.warning("[CareerRecommender] 岗位数据文件不存在: %s", path)
        return []

    rows = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return []
            for row in reader:
                job_id = (row.get("职位编号") or "").strip()
                title = (row.get("职位名称") or "").strip()
                # 筛选：职位编号以 IT- 开头，或职位名称包含计算机相关关键词
                if job_id.startswith("IT-"):
                    rows.append({"职位名称": title, "职位编号": job_id, "职位描述": row.get("职位描述", "")})
                    continue
                low = title.lower()
                if any(k in low or k in title for k in ["开发", "算法", "测试", "运维", "产品经理", "数据", "IT", "软件", "程序员", "工程师", "项目经理", "信息化", "网络安全"]):
                    rows.append({"职位名称": title, "职位编号": job_id, "职位描述": row.get("职位描述", "")})
    except Exception as e:
        logger.error("[CareerRecommender] 读取岗位CSV失败: %s", e, exc_info=True)
        return []
    return rows


def _normalize_title_to_field(title: str) -> Optional[str]:
    """将职位名称映射到标准领域之一。"""
    if not title:
        return None
    for keywords, field in JOB_TITLE_TO_FIELD:
        if any(kw in title for kw in keywords):
            return field
    return None


def _score_job_by_holland(title: str, field: Optional[str], holland_code: str, holland_scores: Optional[Dict[str, int]] = None) -> float:
    """根据 Holland 三码和（可选）各维度分数，计算岗位匹配度 0~100。"""
    code = (holland_code or "")[:3].upper()
    if not code:
        return 70.0
    score = 0.0
    for i, letter in enumerate(code):
        weight = 3 - i  # 第一码权重最高
        fields_for_type = HOLLAND_TO_FIELDS.get(letter, [])
        if field and field in fields_for_type:
            score += weight * 25
        elif field:
            score += weight * 5
        else:
            score += weight * 10
    if holland_scores:
        for letter in code:
            score += (holland_scores.get(letter) or 0) * 0.15
    return min(100.0, max(40.0, score))


def _dedup_titles(titles: List[str], max_count: int = 20) -> List[str]:
    """去重、规整职位名称，保留前 max_count 个。"""
    seen = set()
    out = []
    for t in titles:
        t = (t or "").strip()
        if not t or t in seen:
            continue
        # 同一岗位多种写法保留一种
        key = t[:20] if len(t) > 20 else t
        if key in seen:
            continue
        seen.add(t)
        seen.add(key)
        out.append(t)
        if len(out) >= max_count:
            break
    return out


def recommend_fields_and_careers(
    holland_code: str,
    mbti_type: str,
    interest_distribution: Optional[List[Dict[str, Any]]] = None,
    top_fields: int = 10,
    top_careers: int = 5,
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    结合 Holland Code、MBTI 与岗位数据集，返回：
    - suitable_fields: 适合职业领域（计算机相关，按匹配度排序）
    - suitable_careers: 最匹配职业列表，来自数据集，每项 {career, match_score, reasons}
    """
    code = (holland_code or "")[:3].upper()
    mbti = (mbti_type or "").strip().upper()[:4]

    # 1) 适合职业领域：从标准列表中按 Holland 排序
    field_scores = []
    for f in STANDARD_IT_FIELDS:
        s = 50.0
        for i, letter in enumerate(code):
            w = 3 - i
            if f in HOLLAND_TO_FIELDS.get(letter, []):
                s += w * 15
        field_scores.append((f, s))
    field_scores.sort(key=lambda x: -x[1])
    suitable_fields = [f for f, _ in field_scores[:top_fields]]
    if not suitable_fields:
        suitable_fields = list(STANDARD_IT_FIELDS)[:top_fields]

    # 2) 从数据集筛选计算机岗位并打分
    jobs = _load_jobs_csv()
    if not jobs:
        # 无数据集时返回标准领域作为“职业”展示
        suitable_careers = [
            {"career": f, "match_score": max(60, 90 - i * 5), "reasons": [f"与你的Holland代码{code}匹配", "计算机相关岗位"]}
            for i, f in enumerate(suitable_fields[:top_careers])
        ]
        return suitable_fields, suitable_careers

    # 构建 Holland 分数字典（从 interest_distribution 解析）
    holland_scores = {}
    if interest_distribution:
        type_to_letter = {"实用型(R)": "R", "研究型(I)": "I", "艺术型(A)": "A", "社会型(S)": "S", "企业型(E)": "E", "常规型(C)": "C"}
        for item in interest_distribution:
            t = item.get("type") or ""
            letter = type_to_letter.get(t)
            if letter is not None:
                holland_scores[letter] = int(item.get("score") or 0)

    scored = []
    for j in jobs:
        title = j.get("职位名称") or ""
        field = _normalize_title_to_field(title)
        s = _score_job_by_holland(title, field, code, holland_scores)
        scored.append((title, field, s))

    scored.sort(key=lambda x: -x[2])
    titles_ordered = _dedup_titles([t for t, _, _ in scored], max_count=top_careers * 3)

    # 取前 top_careers 个作为最匹配职业，并生成简短理由
    suitable_careers = []
    for i, (title, field, match_score) in enumerate(scored):
        if len(suitable_careers) >= top_careers:
            break
        if not title or title in [c.get("career") for c in suitable_careers]:
            continue
        reasons = []
        if code:
            reasons.append(f"与你的Holland代码{code}匹配")
        if field:
            reasons.append(f"属于{field}方向")
        reasons.append("来自计算机/IT岗位数据集")
        suitable_careers.append({
            "career": title,
            "match_score": int(min(98, max(60, match_score))),
            "reasons": reasons[:3],
        })

    if not suitable_careers and jobs:
        for i, j in enumerate(jobs[:top_careers]):
            title = (j.get("职位名称") or "").strip()
            if title:
                suitable_careers.append({
                    "career": title,
                    "match_score": 75 - i * 3,
                    "reasons": ["计算机相关岗位", "来自岗位数据集"],
                })

    return suitable_fields, suitable_careers


def inject_career_recommendations(report: dict) -> dict:
    """
    根据报告中的 interest_analysis 与 personality_analysis，用数据集推荐结果
    覆盖 report 的 suitable_fields 和 recommendations.suitable_careers。
    """
    interest = report.get("interest_analysis") or {}
    personality = report.get("personality_analysis") or {}
    holland_code = interest.get("holland_code") or ""
    mbti_type = personality.get("mbti_type") or ""
    distribution = interest.get("interest_distribution") or []

    fields, careers = recommend_fields_and_careers(
        holland_code=holland_code,
        mbti_type=mbti_type,
        interest_distribution=distribution,
        top_fields=10,
        top_careers=5,
    )

    if "interest_analysis" not in report:
        report["interest_analysis"] = {}
    report["interest_analysis"]["suitable_fields"] = fields

    if "recommendations" not in report:
        report["recommendations"] = {}
    report["recommendations"]["suitable_careers"] = careers

    logger.info("[CareerRecommender] 已注入适合领域 %s 条、最匹配职业 %s 条", len(fields), len(careers))
    return report
