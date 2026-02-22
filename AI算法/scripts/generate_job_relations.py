"""
用 AI（qwen3-max）根据岗位列表自动生成晋升/转岗关系，写入 job_relations 表。
覆盖至少 10 个主要岗位，每个岗位有晋升路径 + 至少 2 条转岗路径。
运行：在 AI算法 目录下执行 python scripts/generate_job_relations.py
"""
import json
import os
import re
import sys

# 保证可导入上层模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yaml
from utils.path_tool import get_abs_path
from utils.logger_handler import logger

JOB_PROFILE_CONFIG = get_abs_path("config/job_profile.yml")
PROMPT_TEMPLATE = """你是一位职业规划专家。给定以下岗位列表（含技能标签、层级、类别），请分析并输出岗位间的关联关系。

【岗位列表】
{jobs_text}

【要求】
1. 垂直晋升关系（type="promote"）：同一赛道内从初级→中级→高级的路径，from 的 layer_level 必须小于 to 的 layer_level。
2. 横向转岗关系（type="transfer"）：技能重叠度高的不同岗位之间的转换路径，每个岗位至少给出 2 条转岗路径。
3. from、to 必须严格使用上面列表中的「岗位名称」原文，不要自造名称。
4. difficulty 为转换难度 1-5（1 最容易，5 最难）。
5. 至少覆盖 10 个主要岗位，每个岗位至少 1 条晋升 + 2 条转岗。

【输出格式】只返回一个 JSON 数组，不要 markdown 或其它说明：
[
  {{"from": "Java后端开发工程师", "to": "微服务/分布式开发工程师", "type": "promote", "difficulty": 2, "reason": "技术栈延续，需补充分布式经验"}},
  {{"from": "算法工程师", "to": "数据科学家", "type": "transfer", "difficulty": 3, "reason": "技能重叠度高，需加强统计与业务分析"}}
]
"""


def load_target_jobs():
    with open(JOB_PROFILE_CONFIG, "r", encoding="utf-8") as f:
        conf = yaml.load(f, Loader=yaml.FullLoader)
    return conf.get("target_jobs", [])


def build_jobs_text(jobs):
    lines = []
    for j in jobs:
        name = j.get("name", "")
        job_id = j.get("job_id", "")
        category = j.get("category", "")
        level = j.get("layer_level", 0)
        keywords = j.get("csv_keywords", [])
        skills = "、".join(keywords[:8]) if keywords else "—"
        lines.append(f"- 名称：{name}（id={job_id}）| 类别：{category} | 层级：{level} | 技能标签：{skills}")
    return "\n".join(lines)


def invoke_llm(prompt: str) -> str:
    try:
        from model.factory import chat_model
        response = chat_model.invoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        logger.error(f"[generate_job_relations] 调用模型失败: {e}", exc_info=True)
        raise


def parse_json_array(text: str) -> list:
    text = text.strip()
    # 去掉 markdown 代码块
    if "```" in text:
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if m:
            text = m.group(1).strip()
    # 找 [ ... ] 或 取整段解析
    start = text.find("[")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "[":
                depth += 1
            elif text[i] == "]":
                depth -= 1
                if depth == 0:
                    return json.loads(text[start : i + 1])
    return json.loads(text)


def name_to_job_id(name: str, jobs: list) -> str:
    """岗位名称 -> job_id。支持精确匹配和包含匹配。"""
    name = (name or "").strip()
    for j in jobs:
        if (j.get("name") or "").strip() == name:
            return j.get("job_id", name)
    for j in jobs:
        if name in (j.get("name") or ""):
            return j.get("job_id", name)
    return name


def main():
    from job_profile.job_relations_db import init_db, insert_relations
    # 若需清空后重跑，可先 DELETE；这里只追加
    init_db()
    jobs = load_target_jobs()
    if len(jobs) < 10:
        logger.warning("target_jobs 少于 10 个，将尽量覆盖全部")
    jobs_text = build_jobs_text(jobs)
    prompt = PROMPT_TEMPLATE.format(jobs_text=jobs_text)
    logger.info("正在调用 AI 生成岗位关联关系...")
    raw = invoke_llm(prompt)
    try:
        relations = parse_json_array(raw)
    except Exception as e:
        logger.error(f"解析 JSON 失败: {e}\n 原始片段: {raw[:500]}")
        raise
    if not isinstance(relations, list):
        relations = [relations]
    name_to_id = {j.get("name"): j.get("job_id") for j in jobs}
    rows = []
    for r in relations:
        from_name = r.get("from") or r.get("from_job_id")
        to_name = r.get("to") or r.get("to_job_id")
        if not from_name or not to_name:
            continue
        from_id = name_to_id.get(from_name) or name_to_job_id(from_name, jobs)
        to_id = name_to_id.get(to_name) or name_to_job_id(to_name, jobs)
        rows.append({
            "from_job_id": from_id,
            "to_job_id": to_id,
            "relation_type": (r.get("type") or r.get("relation_type") or "transfer").lower().replace("promotion", "promote"),
            "difficulty": r.get("difficulty") if r.get("difficulty") is not None else 3,
            "reason": r.get("reason") or "",
        })
    if not rows:
        logger.warning("AI 未返回有效关系，请检查 prompt 与模型输出")
        return
    inserted = insert_relations(rows)
    logger.info("已写入 job_relations 表 %d 条（晋升+转岗）", inserted)
    from job_profile.job_relations_db import count_relations
    logger.info("当前库中共 %d 条关系", count_relations())


if __name__ == "__main__":
    main()
