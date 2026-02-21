"""
岗位画像服务模块 v3 - 数据集优先策略
=============================================
生成策略：
  【优先】数据集JD分析：从CSV提取匹配岗位的职位描述(JD)，喂给模型分析提炼
  【兜底】模型知识生成：数据集无匹配数据时，由模型凭行业认知生成

与上一版本的核心区别：
  - 之前：从CSV只提取薪资/城市/公司3个字段（辅助信息）
  - 现在：从CSV提取完整职位描述JD（主要信息源），模型基于真实JD提炼画像

CSV字段说明（来自求职岗位信息数据.csv）：
  职位代码 / 职位名称 / 工作地址 / 薪资范围 /
  企业性质 / 公司全称 / 人员规模 / 所属行业 / 职位描述 / 公司简介

对应API：
  4.1 POST /job/profiles
  4.2 POST /job/profile/detail
  4.4 POST /job/ai-generate-profile
"""

import csv
import json
import os
import re
from datetime import datetime
from typing import Optional

import yaml
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from utils.logger_handler import logger
from utils.path_tool import get_abs_path


# ========== 加载配置 ==========
def _load_job_profile_config() -> dict:
    config_path = get_abs_path("config/job_profile.yml")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=yaml.FullLoader)


job_profile_conf = _load_job_profile_config()


# ========== 工具函数 ==========

def _load_prompt(prompt_key: str) -> str:
    prompts_config_path = get_abs_path("config/prompts.yml")
    with open(prompts_config_path, "r", encoding="utf-8") as f:
        prompts_conf = yaml.load(f, Loader=yaml.FullLoader)
    path = get_abs_path(prompts_conf[prompt_key])
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _ensure_store_dir() -> str:
    store_path = get_abs_path(job_profile_conf["job_profiles_store"])
    os.makedirs(os.path.dirname(store_path), exist_ok=True)
    return store_path


def _load_profiles_store() -> dict:
    """直接从 CSV 加载岗位数据，不再读取 profiles.json。"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "..", "data", "求职岗位信息数据.csv")
        csv_path = os.path.normpath(csv_path)
        print(f"CSV路径: {csv_path}, 存在: {os.path.exists(csv_path)}")
        if not os.path.exists(csv_path):
            logger.warning(f"[ProfileStore] CSV 不存在: {csv_path}，返回空字典")
            return {}
        profiles = {}
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                job_id = row.get("职位编号") or f"job_{i+1:04d}"
                job_name = row.get("职位名称", "").strip() or f"岗位_{i+1}"
                profiles[job_id] = {
                    "job_id": job_id,
                    "job_name": job_name,
                    "basic_info": {
                        "industry": row.get("所属行业", ""),
                        "level_range": ["初级"],
                        "salary_range": row.get("薪资范围", ""),
                        "location": row.get("工作地址", ""),
                        "company": row.get("公司全称", ""),
                        "company_scale": row.get("人员规模", ""),
                        "company_type": row.get("企业性质", ""),
                    },
                    "description": row.get("职位描述", ""),
                    "company_intro": row.get("公司简介", ""),
                    "market_analysis": {"demand_score": 75, "growth_trend": "稳定"},
                }
        print(f"CSV加载成功: {len(profiles)} 条")
        logger.info(f"[ProfileStore] 已从 CSV 加载 {len(profiles)} 条岗位数据: {csv_path}")
        return profiles
    except Exception as e:
        print(f"CSV加载失败: {e}")
        logger.warning(f"[ProfileStore] CSV 加载失败: {e}", exc_info=True)
        return {}


def _save_profiles_store(profiles: dict):
    # 只允许写入真实字典，防止 Mock 对象或非法数据损坏文件
    if not isinstance(profiles, dict):
        logger.error(f"[ProfileStore] 拒绝写入非dict对象: {type(profiles)}")
        return
    store_path = _ensure_store_dir()
    with open(store_path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)


def _normalize_profile(p: dict) -> dict:
    """
    兜底字段映射：确保画像返回字段与API文档4.2完全一致。
    同时兼容旧格式画像（使用旧字段名生成的）。
    只做补充和映射，不删除原有字段，保持向后兼容。
    """
    import copy
    p = copy.deepcopy(p)
    bi = p.get("basic_info", {})

    # basic_info.level：文档要求单字符串，兜底取 level_range[0]
    if "level" not in bi:
        lr = bi.get("level_range", [])
        bi["level"] = lr[0] if lr else "初级"

    # basic_info.avg_salary：文档要求单字符串；CSV 为字符串，旧画像为 dict
    if "avg_salary" not in bi:
        sr = bi.get("salary_range")
        bi["avg_salary"] = sr.get("junior", "") if isinstance(sr, dict) else (sr or "")

    # basic_info.company_scales：文档要求存在此字段
    if "company_scales" not in bi:
        bi["company_scales"] = ["100-500人", "500-2000人", "2000人以上"]

    p["basic_info"] = bi

    # requirements.basic_requirements.gpa：文档要求存在此字段
    br = p.get("requirements", {}).get("basic_requirements", {})
    if "gpa" not in br:
        br["gpa"] = {"min_requirement": "3.0/4.0", "preferred": "3.5/4.0以上", "weight": 0.05}
        if "basic_requirements" in p.get("requirements", {}):
            p["requirements"]["basic_requirements"] = br

    # market_analysis.hottest_cities：文档要求 {city, job_count}，旧格式是 {city, demand_level}
    cities = p.get("market_analysis", {}).get("hottest_cities", [])
    for c in cities:
        if "job_count" not in c:
            # demand_level → job_count 估算映射
            dm = c.pop("demand_level", "中")
            c["job_count"] = {"极高": 2000, "高": 1200, "中": 600, "低": 200}.get(dm, 600)
    if "market_analysis" in p:
        p["market_analysis"]["hottest_cities"] = cities

    # career_path.current_level：文档要求此字段名，旧字段名是 entry_level
    cp = p.get("career_path", {})
    if "current_level" not in cp and "entry_level" in cp:
        cp["current_level"] = cp.pop("entry_level")
        p["career_path"] = cp

    return p


def _extract_json(text: str) -> dict:
    """从模型输出中提取JSON，兼容markdown代码块包裹"""
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^```\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]+\}", text)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        raise ValueError(f"模型输出无法解析为JSON，片段: {text[:300]}")


def _normalize_job_profile(profile: dict) -> dict:
    """确保画像包含前端展示所需的所有字段结构，缺失时用空值兜底，避免页面全空"""
    if not isinstance(profile, dict):
        return {}
    # core_skills
    core = profile.get("core_skills")
    if not isinstance(core, dict):
        core = {}
    for list_key in ("professional", "tools", "certificates"):
        if not isinstance(core.get(list_key), list):
            core[list_key] = []
    soft = core.get("soft_skills")
    if not isinstance(soft, dict):
        soft = {}
    for key in ("innovation", "learning", "pressure", "communication", "internship"):
        if key not in soft or not (soft[key] and str(soft[key]).strip()):
            soft[key] = soft.get(key) or "暂无描述"
    core["soft_skills"] = soft
    profile["core_skills"] = core
    # reality_check
    rc = profile.get("reality_check")
    if not isinstance(rc, dict):
        rc = {}
    if not isinstance(rc.get("pros"), list):
        rc["pros"] = []
    if not isinstance(rc.get("cons"), list):
        rc["cons"] = []
    for key in ("misconceptions", "suitable_for", "not_suitable_for"):
        if key not in rc or not (rc[key] and str(rc[key]).strip()):
            rc[key] = rc.get(key) or "暂无"
    profile["reality_check"] = rc
    # entry_path
    ep = profile.get("entry_path")
    if not isinstance(ep, dict):
        ep = {}
    if not isinstance(ep.get("key_projects"), list):
        ep["key_projects"] = []
    ep.setdefault("fresh_grad", ep.get("fresh_grad") or "")
    ep.setdefault("timeline", ep.get("timeline") or "")
    profile["entry_path"] = ep
    # ai_summary
    if not (profile.get("ai_summary") and str(profile.get("ai_summary")).strip()):
        profile["ai_summary"] = profile.get("ai_summary") or profile.get("summary") or ""
    return profile


def _old_profile_to_new(profile: dict) -> dict:
    """
    若模型返回旧版 job_profile（含 basic_info/requirements 等），
    转换为前端与 4.5 接口约定的新结构：core_skills、reality_check、entry_path、ai_summary。
    """
    if not isinstance(profile, dict):
        return profile
    # 已有新结构（含 core_skills 的 professional/tools 或 reality_check）则不再转换
    core = profile.get("core_skills")
    if isinstance(core, dict) and ("professional" in core or "tools" in core):
        return profile
    if isinstance(profile.get("reality_check"), dict) and isinstance(profile.get("entry_path"), dict):
        return profile
    basic = profile.get("basic_info") or {}
    reqs = profile.get("requirements") or {}
    basic_req = reqs.get("basic_requirements") or {}
    career = profile.get("career_development") or {}
    prof_skills = reqs.get("professional_skills") or {}
    core_skills_old = reqs.get("core_skills") or {}

    # 专业技能：旧版 programming_languages + domain_knowledge 的 skill，或 core_skills.technical_skills
    professional = list(core_skills_old.get("technical_skills") or [])
    if not professional:
        for lang in prof_skills.get("programming_languages") or []:
            s = lang.get("skill") if isinstance(lang, dict) else lang
            if s:
                professional.append(s if isinstance(s, str) else str(s))
        for dom in prof_skills.get("domain_knowledge") or []:
            s = dom.get("skill") if isinstance(dom, dict) else dom
            if s:
                professional.append(s if isinstance(s, str) else str(s))

    # 工具
    tools = list(core_skills_old.get("tools") or [])
    if not tools:
        for t in prof_skills.get("frameworks_tools") or []:
            s = t.get("skill") if isinstance(t, dict) else t
            if s:
                tools.append(s if isinstance(s, str) else str(s))

    # 证书
    certs = list(basic_req.get("certifications") or [])
    if not certs and basic_req.get("education"):
        edu = basic_req["education"]
        if isinstance(edu, dict) and edu.get("level"):
            certs = [edu.get("level", "")]
        elif isinstance(edu, str):
            certs = [edu]

    # 软技能：旧版可能是列表或字典
    soft_list = core_skills_old.get("soft_skills")
    if isinstance(soft_list, list):
        soft_list = [str(s) for s in soft_list]
    elif not isinstance(soft_list, list):
        soft_list = []
    def _find_soft(keywords):
        for s in soft_list:
            if any(kw in str(s) for kw in keywords):
                return s
        return "暂无描述"
    soft_skills = {
        "innovation": _find_soft(["创新"]),
        "learning": _find_soft(["学习"]),
        "pressure": _find_soft(["压", "抗压"]),
        "communication": _find_soft(["沟通", "协作"]),
        "internship": (basic_req.get("experience") or career.get("experience") or "暂无描述"),
    }
    if isinstance(soft_skills["internship"], dict):
        soft_skills["internship"] = str(soft_skills["internship"]) or "暂无描述"

    profile["industry"] = basic.get("industry") or profile.get("industry") or ""
    profile["salary_range"] = basic.get("avg_salary") or profile.get("salary_range") or ""
    profile["demand_score"] = profile.get("demand_score") or (profile.get("market_analysis") or {}).get("demand_score") or 85
    profile["trend"] = (profile.get("market_info") or {}).get("trend") or (profile.get("market_analysis") or {}).get("trend") or "上升"
    profile["trend_desc"] = (profile.get("market_info") or {}).get("trend_desc") or ""

    profile["core_skills"] = {
        "professional": professional,
        "tools": tools,
        "certificates": certs,
        "soft_skills": soft_skills,
    }
    profile["reality_check"] = {
        "pros": list(career.get("advantages") or []),
        "cons": list(career.get("challenges") or []),
        "suitable_for": profile.get("suitable_for") or career.get("suitable_for") or "暂无",
        "not_suitable_for": profile.get("not_suitable_for") or career.get("not_suitable_for") or "暂无",
        "misconceptions": profile.get("misconceptions") or "暂无",
    }
    profile["entry_path"] = {
        "fresh_grad": career.get("entry_advice") or profile.get("entry_advice") or "",
        "key_projects": list(career.get("key_projects") or []),
        "timeline": career.get("timeline") or "",
    }
    profile["ai_summary"] = (profile.get("description") or profile.get("ai_summary") or profile.get("summary") or "").strip() or "AI已根据岗位数据生成画像摘要。"
    return profile


# ========== 数据集提取器（数据优先策略的核心）==========

class CsvDataExtractor:
    """
    从CSV数据集中提取岗位的完整信息。

    策略说明：
      - 提取完整的职位描述(JD)文本，作为模型分析的主要原料
      - 提取薪资/城市/公司等结构化信息作为辅助
      - 有数据 → 基于真实JD生成画像（数据驱动）
      - 无数据 → 标记为"无匹配数据"，交由模型知识生成（模型兜底）
    """

    # CSV各字段名（与实际文件保持一致）
    FIELD_NAME      = "职位名称"
    FIELD_ADDRESS   = "工作地址"
    FIELD_SALARY    = "薪资范围"
    FIELD_COMPANY   = "公司全称"
    FIELD_NATURE    = "企业性质"
    FIELD_SCALE     = "人员规模"
    FIELD_INDUSTRY  = "所属行业"
    FIELD_JD        = "职位描述"

    def __init__(self):
        self.data_path = get_abs_path(job_profile_conf["job_data_path"])
        self._all_rows: Optional[list] = None

    def _load_all(self) -> list:
        if self._all_rows is not None:
            return self._all_rows
        if not os.path.exists(self.data_path):
            logger.warning(f"[CsvDataExtractor] CSV文件不存在: {self.data_path}")
            self._all_rows = []
            return []
        rows = []
        with open(self.data_path, "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                rows.append(row)
        self._all_rows = rows
        logger.info(f"[CsvDataExtractor] 加载CSV: {len(rows)}条")
        return rows

    def search(self, keywords: list[str], max_count: int = 10) -> list[dict]:
        """
        关键词匹配职位名称，返回匹配到的完整行数据（含JD）。
        大小写不敏感，任意关键词命中即算匹配。
        """
        all_rows = self._load_all()
        keywords_lower = [kw.lower() for kw in keywords]
        matched = []
        for row in all_rows:
            name = row.get(self.FIELD_NAME, "").lower()
            if any(kw in name for kw in keywords_lower):
                matched.append(row)
            if len(matched) >= max_count:
                break
        return matched

    def build_jd_block(self, matched_rows: list[dict]) -> str:
        """
        将匹配到的职位数据组装成结构化文本块，供提示词注入。
        每条数据包含：职位名称 + 薪资 + 行业 + 职位描述(完整)
        """
        if not matched_rows:
            return ""  # 调用方检查空字符串决定走哪条分支

        blocks = []
        for i, row in enumerate(matched_rows, 1):
            jd_text = row.get(self.FIELD_JD, "").strip()
            # 截断过长的JD（防止prompt过大），保留前1500字
            if len(jd_text) > 1500:
                jd_text = jd_text[:1500] + "……（截断）"
            block = (
                f"【样本{i}】\n"
                f"  职位名称：{row.get(self.FIELD_NAME, '')}\n"
                f"  薪资范围：{row.get(self.FIELD_SALARY, '未知')}\n"
                f"  所属行业：{row.get(self.FIELD_INDUSTRY, '未知')}\n"
                f"  企业规模：{row.get(self.FIELD_SCALE, '未知')}\n"
                f"  职位描述：\n{jd_text}"
            )
            blocks.append(block)

        return "\n\n".join(blocks)

    def get_market_meta(self, matched_rows: list[dict]) -> dict:
        """提取结构化市场元数据（薪资/城市/公司），用于画像的market_analysis字段"""
        if not matched_rows:
            return {"salaries": [], "cities": [], "companies": [], "industries": []}
        return {
            "salaries":   list({r.get(self.FIELD_SALARY, "") for r in matched_rows if r.get(self.FIELD_SALARY)}),
            "cities":     list({r.get(self.FIELD_ADDRESS, "").split("·")[0] for r in matched_rows if r.get(self.FIELD_ADDRESS)}),
            "companies":  list({r.get(self.FIELD_COMPANY, "") for r in matched_rows if r.get(self.FIELD_COMPANY)})[:5],
            "industries": list({r.get(self.FIELD_INDUSTRY, "") for r in matched_rows if r.get(self.FIELD_INDUSTRY)}),
        }


# ========== 岗位画像生成服务 ==========

class JobProfileService:
    """
    岗位画像生成与管理服务

    生成策略（数据集优先）：
      有匹配JD → 模型基于真实JD提炼标准化画像
      无匹配JD → 模型凭行业认知生成（兜底）
    """

    def __init__(self):
        self.extractor = CsvDataExtractor()
        self.profiles_store = _load_profiles_store()
        self.model = self._init_model()

    def _init_model(self):
        try:
            from model.factory import chat_model
            return chat_model
        except ImportError:
            from langchain_community.chat_models.tongyi import ChatTongyi
            from utils.config_handler import rag_conf
            return ChatTongyi(model=rag_conf["chat_model_name"])

    def _build_chain(self):
        prompt_text = _load_prompt("job_profile_prompt_path")
        template = PromptTemplate.from_template(prompt_text)
        return template | self.model | StrOutputParser()

    # ===================================================
    # 核心：生成单个岗位画像
    # ===================================================
    def generate_profile(self, job_config: dict) -> dict:
        """
        生成岗位画像：
          1. 从CSV搜索匹配的JD数据
          2. 有数据 → 注入JD文本，让模型基于真实数据提炼
             无数据 → 注入明确提示，让模型凭知识生成（兜底）
          3. 调用模型，解析输出JSON
          4. 补充元数据并存储
        """
        job_id    = job_config["job_id"]
        job_name  = job_config["name"]
        category  = job_config.get("category", "")
        keywords  = job_config.get("csv_keywords", [job_name])
        weights   = job_config.get("dimension_weights", {})
        max_count = job_profile_conf.get("max_csv_sample_per_job", 10)

        logger.info(f"[JobProfileService] 开始生成: {job_name} ({job_id})")

        # Step 1: 获取JD数据（优先使用前端传入，其次CSV检索）
        external_jds = job_config.get("external_jd_list", [])  # 4.4接口前端传入

        if external_jds:
            # ★ 分支A1：前端直接传入JD列表（API文档4.4）
            jd_texts = "\n\n".join(
                f"【JD {i+1}】\n{jd}" for i, jd in enumerate(external_jds[:max_count])
            )
            jd_block    = jd_texts
            matched_rows = []
            market_meta  = {}
            logger.info(f"  使用前端传入JD: {len(external_jds)}条")
        else:
            # ★ 分支A2：从CSV数据集检索
            matched_rows = self.extractor.search(keywords, max_count)
            jd_block     = self.extractor.build_jd_block(matched_rows)
            market_meta  = self.extractor.get_market_meta(matched_rows)
            logger.info(f"  CSV检索: {len(matched_rows)}条匹配数据")

        # Step 2: 构建数据注入文本（三条分支清晰）
        if external_jds:
            # ★ 前端传入JD
            data_section = (
                f"[数据来源：前端传入JD | 条数：{len(external_jds)}]\n"
                f"以下是调用方传入的真实招聘JD，请严格基于这些JD内容提炼岗位画像，"
                f"不要自由发挥超出JD范围的内容：\n\n"
                f"{jd_block}"
            )
            data_source_label = f"前端传入JD分析（{len(external_jds)}条样本）"
        elif jd_block:
            # ★ CSV检索到数据
            data_section = (
                f"[数据来源：数据集 | 匹配条数：{len(matched_rows)}]\n"
                f"以下是数据集中检索到的真实招聘JD，请严格基于这些JD内容提炼岗位画像，"
                f"不要自由发挥超出JD范围的内容：\n\n"
                f"{jd_block}"
            )
            data_source_label = f"数据集JD分析（{len(matched_rows)}条样本）"
        else:
            # ★ 无任何数据，模型知识兜底
            data_section = (
                f"[数据来源：模型知识 | 数据集无匹配]\n"
                f"数据集中未检索到【{job_name}】的相关招聘数据。\n"
                f"请完全依据你对中国IT行业的专业认知，按2024-2025年市场标准生成画像。\n"
                f"薪资参照一线城市（北京/上海/深圳/杭州）行情。"
            )
            data_source_label = "模型行业知识生成（数据集无匹配）"

        # Step 3: 调用模型
        chain = self._build_chain()
        raw_output = chain.invoke({
            "job_name":     job_name,
            "job_id":       job_id,
            "category":     category,
            "data_section": data_section,
            "dim_weights":  json.dumps(weights, ensure_ascii=False),
        })
        # 调试：打印 qwen 完整返回内容（StrOutputParser 下 raw_output 即为模型输出字符串）
        content = raw_output if isinstance(raw_output, str) else getattr(raw_output, "content", str(raw_output))
        print("=== qwen完整返回 ===")
        print(content)
        print("=== 返回长度:", len(content), "===")

        # Step 4: 解析JSON
        try:
            profile = _extract_json(raw_output)
        except Exception as e:
            logger.error(f"  [画像] JSON解析失败，输出长度: {len(raw_output)}，前500字: {raw_output[:500]}")
            raise
        if not isinstance(profile, dict):
            profile = {}
        # 调试：打印解析后的 job_profile 关键字段（解析后、转换前的原始结构）
        req = profile.get("requirements") or {}
        core_skills = req.get("core_skills") or {}
        career = profile.get("career_development") or {}
        print("=== 解析后 profile 关键字段 ===")
        print("technical_skills:", core_skills.get("technical_skills"))
        print("soft_skills:", core_skills.get("soft_skills"))
        print("advantages:", career.get("advantages"))
        print("core_skills(新格式):", profile.get("core_skills"))
        print("reality_check(新格式):", profile.get("reality_check"))
        print("ai_summary/description:", profile.get("ai_summary") or profile.get("description"))
        print("================================")
        # 若模型返回旧版结构（basic_info/requirements），转为新结构（core_skills/reality_check/entry_path/ai_summary）
        profile = _old_profile_to_new(profile)
        # 规范化结构，确保前端所需字段存在（避免全空展示）
        profile = _normalize_job_profile(profile)
        has_core = bool(profile.get("core_skills", {}).get("professional") or profile.get("core_skills", {}).get("tools"))
        has_reality = bool(profile.get("reality_check", {}).get("pros") or profile.get("reality_check", {}).get("cons"))
        has_summary = bool(profile.get("ai_summary") and str(profile.get("ai_summary")).strip())
        if not (has_core or has_reality or has_summary):
            logger.warning(f"  [画像] 模型返回内容较少，核心技能/职场洞察/摘要多为空，请检查模型输出长度或 prompt。输出长度: {len(raw_output)}")

        # Step 5: 注入/校验关键元数据
        profile.setdefault("job_id",   job_id)
        profile.setdefault("job_name", job_name)
        profile.setdefault("category", category)
        profile["data_source"]      = data_source_label
        profile["csv_sample_count"] = len(matched_rows)
        profile["csv_market_meta"]  = market_meta
        profile["created_at"]       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        profile["updated_at"]       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        profile["status"]           = "completed"
        profile["_ai_confidence"]    = 0.88  # 供4.5接口 ai_confidence 字段使用
        profile["dimension_weights"] = weights

        logger.info(f"  ✅ 画像生成完成: {job_name} | 来源: {data_source_label}")
        return profile

    # ===================================================
    # 批量生成
    # ===================================================
    def generate_all_profiles(self, force_regenerate: bool = False) -> dict:
        target_jobs = job_profile_conf.get("target_jobs", [])
        results, errors = {}, {}

        for i, job_config in enumerate(target_jobs, 1):
            job_id   = job_config["job_id"]
            job_name = job_config["name"]
            logger.info(f"[批量生成] ({i}/{len(target_jobs)}) {job_name}")

            if not force_regenerate and job_id in self.profiles_store:
                logger.info(f"  跳过（已有缓存）")
                results[job_id] = self.profiles_store[job_id]
                continue

            try:
                profile = self.generate_profile(job_config)
                self.profiles_store[job_id] = profile
                results[job_id] = profile
                _save_profiles_store(self.profiles_store)
            except Exception as e:
                logger.error(f"  失败: {e}", exc_info=True)
                errors[job_id] = str(e)

        return {
            "results": results, "errors": errors,
            "total": len(target_jobs),
            "success_count": len(results), "error_count": len(errors),
        }

    def generate_by_category(self, category: str, force_regenerate: bool = False) -> dict:
        target_jobs = [j for j in job_profile_conf.get("target_jobs", [])
                       if j.get("category") == category]
        results, errors = {}, {}
        for job_config in target_jobs:
            job_id = job_config["job_id"]
            if not force_regenerate and job_id in self.profiles_store:
                results[job_id] = self.profiles_store[job_id]
                continue
            try:
                profile = self.generate_profile(job_config)
                self.profiles_store[job_id] = profile
                results[job_id] = profile
                _save_profiles_store(self.profiles_store)
            except Exception as e:
                errors[job_id] = str(e)
        return {"results": results, "errors": errors,
                "success_count": len(results), "error_count": len(errors)}

    # ===================================================
    # 查询接口
    # ===================================================
    def get_profile_list(self, page=1, size=20, keyword=None,
                         industry=None, level=None, category=None) -> dict:
        # 从全量数据开始，仅在有有效筛选条件时才过滤（空 keyword/全部行业/全部级别 不过滤）
        profiles = list(self.profiles_store.values())
        total_count_before_filter = len(profiles)  # 调试用：过滤前总数据量

        # 【问题1】仅当 keyword 非空时才按职位名称过滤，避免空字符串当条件导致结果为空或异常
        kw = (keyword or "").strip()
        if kw:
            profiles = [p for p in profiles
                        if kw.lower() in ((p.get("job_name") or "").lower())]
            def _relevance(p):
                name = (p.get("job_name") or "").lower()
                k = kw.lower()
                if name == k:
                    return 0
                if name.startswith(k):
                    return 1
                return 2
            profiles.sort(key=_relevance)

        # 行业：仅当传入有效值且非「全部」时才过滤
        if industry and industry not in ("", "全部行业", "全部"):
            profiles = [p for p in profiles
                        if industry in (p.get("basic_info") or {}).get("industry", "")]
        # 级别：仅当传入有效值且非「全部」时才过滤
        if level and level not in ("", "全部级别", "全部"):
            def _level_match(p):
                lr = (p.get("basic_info") or {}).get("level_range") or []
                if not isinstance(lr, list):
                    lr = [lr] if lr else []
                return level in lr
            profiles = [p for p in profiles if _level_match(p)]
        if category:
            profiles = [p for p in profiles if p.get("category") == category]

        # 按岗位名称相似度去重，保留每类岗位最具代表性的一条（去重后再分页）
        seen_names = set()
        deduped = []
        for p in profiles:
            core_name = re.sub(r"[（(].*?[)）]", "", p.get("job_name", "") or "").strip()
            core_name = re.sub(r"[·•\-·].*", "", core_name).strip()
            if core_name not in seen_names:
                seen_names.add(core_name)
                deduped.append(p)
        profiles = deduped

        total = len(profiles)
        # 调试日志：总数据量 / 过滤后条数 / keyword
        print(f"总数据量: {total_count_before_filter}, 过滤后: {len(profiles)}, keyword='{keyword or ''}'")
        # 【问题2】分页：start = (page-1)*size, end = start+size，取 records[start:end]
        start = (page - 1) * size
        end = start + size
        page_data = profiles[start:end]

        def _item(p):
            bi = p.get("basic_info", {})
            ma = p.get("market_analysis", {})
            skills = []
            req = p.get("requirements", {}) or {}
            ps = req.get("professional_skills") or {}
            if ps.get("programming_languages"):
                skills.extend([x.get("skill") for x in ps["programming_languages"] if x.get("skill")])
            if ps.get("frameworks_tools"):
                skills.extend([x.get("skill") for x in ps["frameworks_tools"] if x.get("skill")])
            if not skills and ma.get("tags"):
                skills = ma.get("tags", [])[:6]
            # salary_range：CSV 为字符串，旧画像为 dict，兼容两种
            sr = bi.get("salary_range")
            avg_salary = sr.get("junior", "") if isinstance(sr, dict) else (sr or "")
            # level_range：可能是 list 或单值
            lr = bi.get("level_range") or []
            if not isinstance(lr, list):
                lr = [lr] if lr else [""]
            level_str = lr[0] if lr else ""
            # industry / location / company_scale：CSV 为字符串，兼容旧数据
            ind = bi.get("industry")
            industry_str = ind if isinstance(ind, str) else (ind.get("name", "") if isinstance(ind, dict) else "")
            return {
                "job_id":       p.get("job_id"),
                "job_name":     p.get("job_name"),
                "job_code":     p.get("job_code"),
                "category":     p.get("category"),
                "industry":     industry_str,
                "level_range":  lr,
                "level":        level_str,
                "avg_salary":   avg_salary,
                "description":  bi.get("description"),
                "demand_score": ma.get("demand_score", 0),
                "growth_trend": ma.get("growth_trend"),
                "tags":         ma.get("tags", []),
                "skills":       skills,
                "data_source":  p.get("data_source"),
                "created_at":   p.get("created_at"),
            }
        return {
            "total": total, "page": page, "size": size,
            "list": [_item(p) for p in page_data],
        }

    def get_industries(self) -> list:
        """返回所有岗位中的去重行业列表，用于前端筛选下拉"""
        industries = set()
        for p in self.profiles_store.values():
            ind = (p.get("basic_info") or {}).get("industry")
            if ind:
                industries.add(ind.strip())
        return sorted(industries)

    def get_profile_detail(self, job_id: str) -> Optional[dict]:
        p = self.profiles_store.get(job_id)
        return _normalize_profile(p) if p else None

    def get_profile_by_name(self, job_name: str) -> Optional[dict]:
        for p in self.profiles_store.values():
            if p.get("job_name") == job_name:
                return _normalize_profile(p)
        for p in self.profiles_store.values():
            if job_name in p.get("job_name", ""):
                return _normalize_profile(p)
        return None

    def get_category_summary(self) -> dict:
        target_jobs = job_profile_conf.get("target_jobs", [])
        summary = {}
        for job_config in target_jobs:
            cat = job_config.get("category", "未分类")
            if cat not in summary:
                summary[cat] = {"total": 0, "generated": 0, "jobs": []}
            summary[cat]["total"] += 1
            done = job_config["job_id"] in self.profiles_store
            if done:
                summary[cat]["generated"] += 1
            profile = self.profiles_store.get(job_config["job_id"], {})
            summary[cat]["jobs"].append({
                "job_id":      job_config["job_id"],
                "name":        job_config["name"],
                "done":        done,
                "data_source": profile.get("data_source", "—"),
                "csv_samples": profile.get("csv_sample_count", 0),
            })
        return summary

    def preview_csv_match(self) -> dict:
        """预览各岗位能从CSV中匹配到多少条数据（不生成画像，只统计）"""
        result = {}
        for job_config in job_profile_conf.get("target_jobs", []):
            keywords = job_config.get("csv_keywords", [job_config["name"]])
            matched  = self.extractor.search(keywords, max_count=20)
            result[job_config["job_id"]] = {
                "name":    job_config["name"],
                "matched": len(matched),
                "samples": [r.get("职位名称", "") for r in matched],
                "strategy": "数据集JD分析" if matched else "模型生成",
            }
        return result

    def reload_store(self):
        self.profiles_store = _load_profiles_store()


# ========== 单例 ==========
_instance: Optional[JobProfileService] = None


def get_job_profile_service() -> JobProfileService:
    global _instance
    if _instance is None:
        _instance = JobProfileService()
    return _instance


# ========== CLI ==========
if __name__ == "__main__":
    import sys
    service = JobProfileService()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "--preview"

    if cmd == "--preview":
        print("=== CSV匹配预览（了解哪些岗位有真实数据）===\n")
        preview = service.preview_csv_match()
        for jid, info in preview.items():
            mark = "📊" if info["matched"] > 0 else "🤖"
            print(f"{mark} {jid} {info['name']:20s} | 匹配{info['matched']:2d}条 | {info['strategy']}")
            if info["samples"]:
                print(f"     匹配到: {', '.join(info['samples'][:3])}")

    elif cmd == "--status":
        summary = service.get_category_summary()
        for cat, info in summary.items():
            print(f"\n【{cat}】({info['generated']}/{info['total']})")
            for j in info["jobs"]:
                mark = "✅" if j["done"] else "⏳"
                src  = f"[{j['data_source']}]" if j["done"] else ""
                print(f"  {mark} {j['name']} {src}")

    elif cmd == "--generate":
        job_name = sys.argv[2] if len(sys.argv) > 2 else None
        target_jobs = job_profile_conf.get("target_jobs", [])
        cfg = next((j for j in target_jobs if j["name"] == job_name), None)
        if cfg:
            profile = service.generate_profile(cfg)
            service.profiles_store[cfg["job_id"]] = profile
            _save_profiles_store(service.profiles_store)
            print(f"来源: {profile['data_source']}")
            print(f"CSV样本数: {profile['csv_sample_count']}")
            print(json.dumps(profile, ensure_ascii=False, indent=2)[:2000])
        else:
            print(f"未找到: {job_name}")
