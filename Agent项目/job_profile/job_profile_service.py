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
    store_path = _ensure_store_dir()
    if not os.path.exists(store_path):
        return {}
    with open(store_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_profiles_store(profiles: dict):
    store_path = _ensure_store_dir()
    with open(store_path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)


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

        # Step 1: 检索CSV数据集
        matched_rows = self.extractor.search(keywords, max_count)
        jd_block     = self.extractor.build_jd_block(matched_rows)
        market_meta  = self.extractor.get_market_meta(matched_rows)

        logger.info(f"  CSV检索: {len(matched_rows)}条匹配数据")

        # Step 2: 构建数据注入文本（两条分支清晰）
        if jd_block:
            # ★ 分支A：有数据集数据，基于真实JD生成
            data_section = (
                f"[数据来源：数据集 | 匹配条数：{len(matched_rows)}]\n"
                f"以下是数据集中检索到的真实招聘JD，请严格基于这些JD内容提炼岗位画像，"
                f"不要自由发挥超出JD范围的内容：\n\n"
                f"{jd_block}"
            )
            data_source_label = f"数据集JD分析（{len(matched_rows)}条样本）"
        else:
            # ★ 分支B：无匹配数据，模型知识兜底
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

        # Step 4: 解析JSON
        profile = _extract_json(raw_output)

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
        profiles = list(self.profiles_store.values())
        if keyword:
            profiles = [p for p in profiles if keyword in p.get("job_name", "")
                        or keyword in p.get("category", "")]
        if industry:
            profiles = [p for p in profiles
                        if industry in p.get("basic_info", {}).get("industry", "")]
        if level:
            profiles = [p for p in profiles
                        if level in p.get("basic_info", {}).get("level_range", [])]
        if category:
            profiles = [p for p in profiles if p.get("category") == category]

        total = len(profiles)
        page_data = profiles[(page - 1) * size: page * size]
        return {
            "total": total, "page": page, "size": size,
            "list": [{
                "job_id":       p.get("job_id"),
                "job_name":     p.get("job_name"),
                "job_code":     p.get("job_code"),
                "category":     p.get("category"),
                "industry":     p.get("basic_info", {}).get("industry"),
                "level_range":  p.get("basic_info", {}).get("level_range", []),
                "avg_salary":   p.get("basic_info", {}).get("salary_range", {}).get("junior", ""),
                "description":  p.get("basic_info", {}).get("description"),
                "demand_score": p.get("market_analysis", {}).get("demand_score", 0),
                "growth_trend": p.get("market_analysis", {}).get("growth_trend"),
                "tags":         p.get("market_analysis", {}).get("tags", []),
                "data_source":  p.get("data_source"),
                "created_at":   p.get("created_at"),
            } for p in page_data],
        }

    def get_profile_detail(self, job_id: str) -> Optional[dict]:
        return self.profiles_store.get(job_id)

    def get_profile_by_name(self, job_name: str) -> Optional[dict]:
        for p in self.profiles_store.values():
            if p.get("job_name") == job_name:
                return p
        for p in self.profiles_store.values():
            if job_name in p.get("job_name", ""):
                return p
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
                "strategy": "数据集JD分析" if matched else "模型知识兜底",
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
