"""
晋升路径生成器 - 使用 qwen3-max 根据岗位名称动态生成 4 个晋升阶段
每个阶段包含：name、time_range、salary_increase、key_skills、icon
"""

import json
from typing import List, Dict, Any, Optional

from model.factory import chat_model
from utils.logger_handler import logger


def _extract_json_from_response(text: str) -> Optional[Any]:
    """从 LLM 响应中提取 JSON（支持数组或对象）"""
    try:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        return json.loads(text)
    except Exception:
        return None


def _default_stages(job_name: str) -> List[Dict[str, Any]]:
    """LLM 失败时的默认 4 阶段"""
    base = (job_name or "岗位").replace("初级", "").replace("中级", "").replace("高级", "").strip() or "岗位"
    return [
        {"name": f"初级{base}", "time_range": "0-2年", "salary_increase": "入职期", "key_skills": ["基础技能", "学习能力"], "icon": "🌱", "current": True},
        {"name": base, "time_range": "2-4年", "salary_increase": "较当前+30%", "key_skills": ["独立负责", "协作能力"], "icon": "🌿", "current": False},
        {"name": f"高级{base}", "time_range": "4-7年", "salary_increase": "较当前+80%", "key_skills": ["专业深度", "带人能力"], "icon": "🌳", "current": False},
        {"name": f"{base}专家/架构师", "time_range": "7年+", "salary_increase": "较当前+150%", "key_skills": ["战略视野", "技术领导力"], "icon": "🏆", "current": False},
    ]


def generate_career_path(job_name: str) -> List[Dict[str, Any]]:
    """
    根据岗位名称，调用 LLM（qwen3-max）动态生成 4 个晋升阶段。

    每个阶段包含：
    - name: 阶段名称（如「初级Java工程师」）
    - time_range: 经验年限（如「0-2年」）
    - salary_increase: 薪资涨幅描述（如「较当前+30%」）
    - key_skills: 该阶段关键技能列表
    - icon: 一个 emoji 表示阶段（如 🌱🌿🌳🏆）
    - current: 是否为「当前阶段」（仅第一阶段为 true）

    参数：
        job_name: 岗位名称（如「Java后端开发」「产品经理」）

    返回：
        长度为 4 的列表，每项为上述结构的字典
    """
    if not (job_name and str(job_name).strip()):
        return _default_stages("岗位")

    job_name = str(job_name).strip()

    prompt = f"""你是一位资深职业规划师。请针对「{job_name}」这一岗位，生成一条从入门到顶尖的**四个晋升阶段**，要求内容贴合该岗位真实发展路径，且必须与岗位名称强相关、不同岗位输出明显不同。

请**仅**输出一个 JSON 数组，不要其他解释。数组长度为 4，每项为对象，包含以下字段（必须使用以下字段名）：
- name: 阶段名称（字符串，必须体现「{job_name}」或该职业的专属职级，不要用通用词）
- time_range: 经验年限区间（如 "0-2年"、"2-4年"、"4-7年"、"7年+"）
- salary_increase: 相对入职期的薪资涨幅描述（如 "较当前+30%" 或 "约为入门期2倍"）
- key_skills: 该阶段需要具备的关键技能列表（数组，2-4 个字符串，针对本岗位）
- icon: 一个 emoji 表示该阶段（从 🌱 🌿 🌳 🏆 中选）

要求：
1. 阶段名称必须与「{job_name}」强绑定。例如：UI/视觉设计岗→「UI/视觉设计师」「资深体验设计组长」「设计总监/创意总监」；算法岗→「初级算法工程师」「算法工程师」「高级/资深算法工程师」「算法专家/架构师」；产品岗→「产品助理/专员」「产品经理」「高级产品经理」「产品总监」。
2. 不同岗位的输出必须有明显差异，不要所有岗位都用同一套“初级/中级/高级/专家”泛化名称。
3. 技术岗可体现初级→中级→高级→专家/架构师；设计岗体现设计师→组长→总监/创意总监；产品/运营同理。
4. key_skills 要具体可操作，针对该岗位。

示例（格式参考，名称与技能必须按「{job_name}」重写）：
[{{"name": "初级/助理（本岗位）", "time_range": "0-2年", "salary_increase": "入职期", "key_skills": ["技能A", "技能B"], "icon": "🌱"}}, {{"name": "中级（本岗位）", "time_range": "2-4年", "salary_increase": "较当前+30%", "key_skills": ["技能C"], "icon": "🌿"}}, {{"name": "高级/资深（本岗位）", "time_range": "4-7年", "salary_increase": "较当前+80%", "key_skills": ["技能E"], "icon": "🌳"}}, {{"name": "专家/总监（本岗位）", "time_range": "7年+", "salary_increase": "较当前+150%", "key_skills": ["技能G"], "icon": "🏆"}}]

请针对「{job_name}」直接输出 JSON 数组："""

    try:
        response = chat_model.invoke(prompt)
        result_text = response.content if hasattr(response, "content") else str(response)
        parsed = _extract_json_from_response(result_text)

        if isinstance(parsed, list) and len(parsed) >= 4:
            stages = []
            for i, item in enumerate(parsed[:4]):
                if not isinstance(item, dict):
                    return _default_stages(job_name)
                stage = {
                    "name": str(item.get("name", "")).strip() or f"阶段{i+1}",
                    "time_range": str(item.get("time_range", "")).strip() or "—",
                    "salary_increase": str(item.get("salary_increase", "")).strip() or "—",
                    "key_skills": item.get("key_skills") if isinstance(item.get("key_skills"), list) else [],
                    "icon": str(item.get("icon", "")).strip() or ("🌱" if i == 0 else "🌿" if i == 1 else "🌳" if i == 2 else "🏆"),
                    "current": i == 0,
                }
                stage["key_skills"] = [str(s).strip() for s in stage["key_skills"] if s][:5]
                stages.append(stage)
            logger.info(f"[CareerPath] 已为「{job_name}」生成 {len(stages)} 个晋升阶段")
            return stages
        if isinstance(parsed, dict) and "stages" in parsed and isinstance(parsed["stages"], list):
            return generate_career_path_from_list(parsed["stages"], job_name)
    except Exception as e:
        logger.warning(f"[CareerPath] LLM 生成失败，使用默认阶段: {e}")

    return _default_stages(job_name)


def generate_career_path_from_list(raw: List[Dict], job_name: str) -> List[Dict[str, Any]]:
    """从 LLM 返回的 stages 列表规范化为统一结构"""
    stages = []
    for i, item in enumerate(raw[:4]):
        if not isinstance(item, dict):
            continue
        stage = {
            "name": str(item.get("name", "")).strip() or f"阶段{i+1}",
            "time_range": str(item.get("time_range", "")).strip() or "—",
            "salary_increase": str(item.get("salary_increase", "")).strip() or "—",
            "key_skills": item.get("key_skills") if isinstance(item.get("key_skills"), list) else [],
            "icon": str(item.get("icon", "")).strip() or ("🌱" if i == 0 else "🌿" if i == 1 else "🌳" if i == 2 else "🏆"),
            "current": i == 0,
        }
        stage["key_skills"] = [str(s).strip() for s in stage["key_skills"] if s][:5]
        stages.append(stage)
    if len(stages) < 4:
        return _default_stages(job_name)
    return stages
