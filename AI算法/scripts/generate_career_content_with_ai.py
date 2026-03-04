"""
AI 生成个性化晋升路径内容
- 使用千问 API（qwen-max / qwen3-max）
- 输入：岗位名称（如 测试工程师、前端工程师）
- 输出：4 个级别的完整发展路径 JSON
- 批量生成 5-10 个常见岗位，保存到 data/career_paths_ai_generated.json
"""

import json
import os
import re
import sys

# 项目根目录
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

OUT_PATH = os.path.join(ROOT, "data", "career_paths_ai_generated.json")

# 默认批量岗位（可改）
DEFAULT_JOBS = [
    "测试工程师",
    "前端工程师",
    "算法工程师",
    "产品经理",
    "Java工程师",
    "Python工程师",
    "运维工程师",
    "数据分析师",
]

PROMPT_TEMPLATE = '''为"{job_name}"生成职业发展路径（4个级别）。
要求：
1. 每个级别包含：级别名、年限、薪资范围、薪资涨幅、角色定位
2. 核心要求：3-5条，具体可落地
3. 晋升行动：5-6条，带数字和时间（如"完成500+测试用例"、"主导2个大型项目"）
4. 技能标签：4-6个，技术栈相关
5. 薪资递增合理（初级约8-15k → 中级15-25k → 高级25-40k → 总监40-80k）

JSON格式（只输出JSON，不要其他文字）：
{{
  "levels": [
    {{
      "level": "初级XX工程师",
      "year": "0-2年",
      "salary": "8k-15k",
      "salaryIncrease": null,
      "role": "执行者",
      "badge": "入职期",
      "icon": "🌱",
      "requirements": ["要求1", "要求2", "要求3"],
      "actions": ["行动1（带数字）", "行动2（带时间）", "..."],
      "skills": ["技能1", "技能2", "技能3", "技能4"]
    }},
    {{ "level": "...", "year": "2-4年", "salary": "15k-25k", "salaryIncrease": "约+60%", "role": "骨干", "badge": "进阶期", "icon": "🌿", "requirements": [], "actions": [], "skills": [] }},
    {{ "level": "...", "year": "4-7年", "salary": "25k-40k", "salaryIncrease": "约+60%", "role": "技术负责人", "badge": "专家期", "icon": "🌳", "requirements": [], "actions": [], "skills": [] }},
    {{ "level": "...", "year": "7年+", "salary": "40k-80k", "salaryIncrease": "约+80%", "role": "总监", "badge": "领导期", "icon": "🏆", "requirements": [], "actions": [], "skills": [] }}
  ]
}}
只输出上述 JSON，不要 markdown 代码块或其它说明。'''


def _clean_markdown_json(text: str) -> str:
    """去掉 ```json 和 ``` 等标记"""
    if not text or not isinstance(text, str):
        return ""
    s = text.strip()
    for start in ("```json", "```"):
        if s.startswith(start):
            s = s[len(start):].strip()
        if s.endswith("```"):
            s = s[:-3].strip()
    return s


def _ensure_api_key():
    """从环境变量或 config/rag.yml 读取千问 API 密钥。"""
    api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if api_key:
        return
    try:
        import yaml
        cfg_path = os.path.join(ROOT, "config", "rag.yml")
        if os.path.isfile(cfg_path):
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
            if isinstance(cfg, dict):
                key = cfg.get("api_key") or cfg.get("dashscope_api_key") or cfg.get("DASHSCOPE_API_KEY")
                if key and isinstance(key, str) and key.strip():
                    os.environ["DASHSCOPE_API_KEY"] = key.strip()
    except Exception:
        pass


def _call_qwen(job_name: str, model: str = "qwen-max") -> dict | None:
    """调用千问 API 生成单个岗位的晋升路径 JSON。"""
    try:
        from dashscope import Generation
    except ImportError:
        print("请安装 dashscope: pip install dashscope")
        return None

    _ensure_api_key()
    api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        print("未设置 DASHSCOPE_API_KEY，请在环境变量或 config/rag.yml 中配置千问 API 密钥")
        return None

    prompt = PROMPT_TEMPLATE.format(job_name=job_name)
    try:
        response = Generation.call(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
        )
        content = (response.output.choices[0].message.content or "").strip()
        content = _clean_markdown_json(content)
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            start, end = content.find("{"), content.rfind("}")
            if start >= 0 and end > start:
                try:
                    data = json.loads(content[start : end + 1])
                except Exception:
                    raise
            else:
                raise
        if isinstance(data, dict) and "levels" in data and isinstance(data["levels"], list):
            return data
        if isinstance(data, dict) and "levels" not in data:
            data["levels"] = data.get("stages", [])[:4]
            return data
        return None
    except Exception as e:
        print(f"  [ERROR] 千问调用失败: {e}")
        return None


def _normalize_level(level: dict, index: int) -> dict:
    """规范化单个级别字段，保证前端所需字段存在。"""
    icons = ["🌱", "🌿", "🌳", "🏆"]
    badges = ["入职期", "进阶期", "专家期", "领导期"]
    out = {
        "level": str(level.get("level", "")).strip() or f"阶段{index+1}",
        "year": str(level.get("year", "")).strip() or "",
        "salary": str(level.get("salary", "")).strip() or "",
        "salaryIncrease": level.get("salaryIncrease"),
        "role": str(level.get("role", "")).strip() or "",
        "badge": str(level.get("badge", "")).strip() or (badges[index] if index < len(badges) else ""),
        "icon": str(level.get("icon", "")).strip() or (icons[index] if index < len(icons) else "📌"),
        "requirements": level.get("requirements") if isinstance(level.get("requirements"), list) else [],
        "actions": level.get("actions") if isinstance(level.get("actions"), list) else [],
        "skills": level.get("skills") if isinstance(level.get("skills"), list) else [],
    }
    if out["salaryIncrease"] is not None:
        out["salaryIncrease"] = str(out["salaryIncrease"]).strip() or None
    out["requirements"] = [str(x).strip() for x in out["requirements"] if x][:6]
    out["actions"] = [str(x).strip() for x in out["actions"] if x][:8]
    out["skills"] = [str(x).strip() for x in out["skills"] if x][:8]
    return out


def generate_one(job_name: str, model: str = "qwen-max") -> dict | None:
    """为单个岗位生成晋升路径，返回 { "levels": [...] } 或 None。"""
    data = _call_qwen(job_name, model=model)
    if not data or not data.get("levels"):
        return None
    levels = []
    for i, lev in enumerate(data["levels"][:4]):
        if isinstance(lev, dict):
            levels.append(_normalize_level(lev, i))
    if len(levels) < 4:
        return None
    return {"levels": levels}


def main():
    # 可从配置文件读取模型名
    model = "qwen-max"
    try:
        from utils.path_tool import get_abs_path
        import yaml
        cfg_path = get_abs_path("config/rag.yml")
        if os.path.isfile(cfg_path):
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
                if cfg and cfg.get("chat_model_name"):
                    model = cfg["chat_model_name"]
    except Exception:
        pass

    jobs = DEFAULT_JOBS
    if len(sys.argv) > 1:
        jobs = [j.strip() for j in sys.argv[1:] if j.strip()]

    all_data = {}
    for i, job_name in enumerate(jobs):
        print(f"[{i+1}/{len(jobs)}] 生成: {job_name}")
        result = generate_one(job_name, model=model)
        if result and result.get("levels"):
            all_data[job_name] = result
            print(f"  -> 成功，{len(result['levels'])} 个级别")
            # 预览第一条
            first = result["levels"][0]
            print(f"  -> 预览: {first.get('level')} | {first.get('salary')} | {first.get('badge')}")
        else:
            print(f"  -> 跳过（生成失败或格式不符）")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"\n已保存: {OUT_PATH}")
    print(f"岗位数: {len(all_data)}")
    # 结果预览
    for job_name, result in list(all_data.items())[:3]:
        levels = result.get("levels", [])
        print(f"  预览 [{job_name}]: {[lev.get('level') for lev in levels]}")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
