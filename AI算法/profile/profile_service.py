"""
个人档案服务模块
=============================================
对应 API 文档第 2 章：Profile 模块

功能职责：
  2.1 get_profile()        - 获取用户完整档案（含完整度计算）
  2.2 update_profile()     - 更新档案，重新计算完整度
  2.3 parse_resume_async() - 异步触发AI简历解析任务
  2.4 get_parse_result()   - 获取AI解析任务结果

AI核心：
  - 使用 Claude 大模型解析简历PDF/文本
  - 自动提取 basic_info / education / skills / internships / projects / awards
  - 计算解析置信度 confidence_score
  - 给出档案补充建议 suggestions
"""

import json
import os
import threading
from datetime import datetime
from typing import Optional

import yaml

from utils.logger_handler import logger
from utils.path_tool import get_abs_path


# ========== 加载配置 ==========

def _load_profile_config() -> dict:
    config_path = get_abs_path("config/profile.yml")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=yaml.FullLoader)


profile_conf = _load_profile_config()


# ========== 工具函数 ==========

def _load_prompt(prompt_key: str) -> str:
    """从配置加载指定prompt文本"""
    prompts_config_path = get_abs_path("config/prompts.yml")
    with open(prompts_config_path, "r", encoding="utf-8") as f:
        prompts_cfg = yaml.load(f, Loader=yaml.FullLoader)
    path = get_abs_path(prompts_cfg[prompt_key])
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)


# ========== 档案持久化 ==========

def _get_profile_store_path() -> str:
    p = get_abs_path(profile_conf["profile_store_path"])
    _ensure_dir(p)
    return p


def _load_profile_store() -> dict:
    path = _get_profile_store_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
            return json.loads(text) if text else {}
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"[ProfileStore] profiles.json 解析失败（{e}），重置为空")
        return {}


def _save_profile_store(store: dict):
    if not isinstance(store, dict):
        logger.error(f"[ProfileStore] 拒绝写入非dict对象: {type(store)}")
        return
    path = _get_profile_store_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


# ========== 简历任务持久化 ==========

def _get_task_store_path() -> str:
    p = get_abs_path(profile_conf["resume_task_store_path"])
    _ensure_dir(p)
    return p


def _load_task_store() -> dict:
    path = _get_task_store_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
            return json.loads(text) if text else {}
    except (json.JSONDecodeError, ValueError):
        return {}


def _save_task_store(store: dict):
    if not isinstance(store, dict):
        return
    path = _get_task_store_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


# ========== JSON 提取工具 ==========

def _extract_json(text: str) -> dict:
    """从模型输出中提取JSON，兼容markdown代码块包裹"""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # 去掉首尾的 ``` 行
        start = 1 if lines[0].startswith("```") else 0
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()
    return json.loads(text)


def _fallback_parse_resume_text(resume_text: str) -> dict:
    """
    当大模型未解析出有效结构时，使用正则从原始文本里兜底提取几项关键信息：
    - 姓名（匹配“姓名：XXX”或首行为 2-4 个汉字的中文名）
    - 出生日期（匹配“出生日期/生日：YYYY/MM/DD”或 YYYY-MM-DD）
    - 性别（匹配“性别：男/女”）
    - 手机号、邮箱
    - 教育经历中第一所学校和专业
    """
    import re

    text = (resume_text or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # 手机号
    phone_match = re.search(r"1[3-9]\d{9}", text)
    phone = phone_match.group(0) if phone_match else ""

    # 邮箱
    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    email = email_match.group(0) if email_match else ""

    # 姓名：优先“姓名：XXX”或“姓名 XXX”，否则用首行或前几行中“仅 2-4 汉字”的一行
    name = ""
    name_match = re.search(r"姓名\s*[:：]\s*([^\s，,。、\n]{2,4})", text)
    if name_match:
        name = name_match.group(1).strip()
    if not name:
        name_match = re.search(r"姓名\s+([\u4e00-\u9fa5]{2,4})(?:\s|$|[\|，])", text)
        if name_match:
            name = name_match.group(1).strip()
    if not name:
        for ln in lines[:5]:
            ln_clean = ln.strip()
            if re.match(r"^[\u4e00-\u9fa5]{2,4}$", ln_clean) and not re.search(
                r"手机|邮箱|教育|专业|技能|项目|实习|荣誉|证书|简历|大学|学院", ln_clean
            ):
                name = ln_clean
                break

    # 出生日期：支持 出生日期：2003/08/15、生日：2003/08/15、含全角/半角
    birth_date = ""
    for pattern in [
        r"出生日期\s*[:：]\s*(\d{4})\s*[/\-]\s*(\d{1,2})\s*[/\-]\s*(\d{1,2})",
        r"生日\s*[:：]\s*(\d{4})\s*[/\-]\s*(\d{1,2})\s*[/\-]\s*(\d{1,2})",
        r"出生日期\s*[:：]\s*(\d{4})\s*[/\-]\s*(\d{1,2})",
    ]:
        birth_match = re.search(pattern, text)
        if birth_match:
            g = birth_match.groups()
            y, m = g[0], g[1].zfill(2)
            d = g[2].zfill(2) if len(g) > 2 and g[2] else "01"
            birth_date = f"{y}-{m}-{d}"
            break

    # 性别
    gender = ""
    gender_match = re.search(r"性别\s*[:：]\s*([男女])", text)
    if gender_match:
        gender = gender_match.group(1).strip()

    # 学校/专业
    school = ""
    major = ""
    for ln in lines:
        if not school and ("大学" in ln or "学院" in ln):
            school = ln
        if "专业" in ln:
            m = re.search(r"专业\s*[:：]?\s*([\u4e00-\u9fa5A-Za-z0-9·\s]+?)(?:\s|$|学历|毕业)", ln)
            if m:
                major = m.group(1).strip()
        if school and major:
            break

    education = []
    if school or major:
        education.append({"school": school, "major": major})

    return {
        "basic_info": {
            "name": name,
            "nickname": name,
            "phone": phone,
            "email": email,
            "gender": gender,
            "birth_date": birth_date,
            "birthday": birth_date,
        },
        "education": education,
        "skills": [],
        "internships": [],
        "projects": [],
        "awards": [],
    }


def parse_basic_info_from_resume(resume_text: str) -> dict:
    """
    仅从简历文本中解析姓名、出生日期、性别（供 Java 等外部调用，走 Python 兜底正则 + 可扩展 LLM）。
    返回：{ "name", "nickname", "birth_date", "birthday", "gender" }，缺失则为空字符串。
    """
    fallback = _fallback_parse_resume_text(resume_text or "")
    bi = fallback.get("basic_info") or {}
    return {
        "name": (bi.get("name") or "").strip(),
        "nickname": (bi.get("nickname") or bi.get("name") or "").strip(),
        "birth_date": (bi.get("birth_date") or "").strip(),
        "birthday": (bi.get("birthday") or bi.get("birth_date") or "").strip(),
        "gender": (bi.get("gender") or "").strip(),
    }


# ============================================================
# 档案完整度计算
# ============================================================

def _calc_completeness(profile: dict) -> int:
    """
    计算档案完整度百分比（0-100）
    对应 API 文档 2.1 profile_completeness 字段
    """
    weights = profile_conf.get("completeness_weights", {})
    total_weight = sum(weights.values())  # 应为100
    earned = 0

    # ── basic_info ──
    bi = profile.get("basic_info") or {}
    bw = profile_conf.get("basic_info_fields", {})
    bi_earned = sum(bw.get(k, 0) for k, v in bi.items() if v not in (None, "", []))
    bi_total = sum(bw.values())
    if bi_total > 0:
        earned += weights.get("basic_info", 0) * (bi_earned / bi_total)

    # ── education_info ──
    ei = profile.get("education_info") or {}
    ew = profile_conf.get("education_info_fields", {})
    ei_earned = sum(ew.get(k, 0) for k, v in ei.items() if v not in (None, "", []))
    ei_total = sum(ew.values())
    if ei_total > 0:
        earned += weights.get("education_info", 0) * (ei_earned / ei_total)

    # ── 列表型字段：有内容即得满分 ──
    for field in ("skills", "certificates", "internships", "projects", "awards"):
        if profile.get(field):
            earned += weights.get(field, 0)

    # 四舍五入到整数，不超过100
    return min(100, round(earned))


# ============================================================
# 档案服务核心类
# ============================================================

class ProfileService:
    """个人档案服务，负责档案CRUD和简历AI解析"""

    def __init__(self):
        self.profile_store: dict = _load_profile_store()
        self.task_store: dict = _load_task_store()

    # ──────────────────────────────────────────────────────
    # 2.1 获取个人档案
    # ──────────────────────────────────────────────────────
    def get_profile(self, user_id: int) -> Optional[dict]:
        """
        获取用户完整档案，含动态计算的 profile_completeness。
        对应 API 文档 2.1
        """
        profile = self.profile_store.get(str(user_id))
        if not profile:
            return None

        # 每次获取时实时计算完整度（保证与当前数据一致）
        profile["profile_completeness"] = _calc_completeness(profile)
        return profile

    # ──────────────────────────────────────────────────────
    # 2.2 更新个人档案
    # ──────────────────────────────────────────────────────
    def update_profile(self, user_id: int, updates: dict) -> dict:
        """
        更新档案字段，重新计算完整度并持久化。
        对应 API 文档 2.2
        返回：{ profile_completeness, updated_at }
        """
        uid = str(user_id)
        existing = self.profile_store.get(uid) or {}

        # 逐字段合并（支持局部更新，不传的字段保留原值）
        updatable_fields = [
            "basic_info", "education_info", "skills",
            "certificates", "internships", "projects", "awards"
        ]
        for field in updatable_fields:
            if field in updates:
                if field in ("basic_info", "education_info"):
                    # 嵌套dict：合并而不是覆盖
                    existing[field] = {**(existing.get(field) or {}), **updates[field]}
                else:
                    # 列表型：直接覆盖（前端传来的是完整列表）
                    existing[field] = updates[field]

        # 元数据
        existing["user_id"] = user_id
        existing["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 计算完整度
        completeness = _calc_completeness(existing)
        existing["profile_completeness"] = completeness

        # 持久化
        self.profile_store[uid] = existing
        _save_profile_store(self.profile_store)

        logger.info(f"[ProfileService] user_id={user_id} 档案更新完成，完整度={completeness}%")
        return {
            "profile_completeness": completeness,
            "updated_at": existing["updated_at"]
        }

    # ──────────────────────────────────────────────────────
    # 2.3 简历解析（AI核心）
    # ──────────────────────────────────────────────────────
    def parse_resume_async(self, user_id: int, resume_text: str, task_id: str):
        """
        异步触发AI简历解析任务。
        - 后台线程调用 Claude 解析简历文本
        - 解析结果写入 task_store，前端通过 2.4 接口轮询
        对应 API 文档 2.3
        """
        # 初始化任务状态
        self.task_store[task_id] = {
            "status": "processing",
            "user_id": user_id,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "result": None,
            "error": None
        }
        _save_task_store(self.task_store)

        # 后台线程执行解析
        def _run():
            try:
                result = self._do_parse_resume(resume_text)
                self.task_store[task_id]["status"] = "completed"
                self.task_store[task_id]["result"] = result
                logger.info(f"[ProfileService] 简历解析完成 task_id={task_id}")

                # ── 解析成功后自动回填档案（无需前端再调 2.2 接口）──
                try:
                    parsed = result.get("parsed_data", {})
                    # 打印解析结果，方便排查字段映射问题
                    logger.info(f"[ProfileService] 解析结果parsed_data keys={list(parsed.keys())}")
                    logger.info(f"[ProfileService] basic_info={parsed.get('basic_info')}")
                    logger.info(f"[ProfileService] education={parsed.get('education')}")
                    logger.info(f"[ProfileService] skills={parsed.get('skills')}")
                    auto_updates = {}

                    # basic_info：只取简历里有值的字段，不覆盖用户已填的
                    bi = parsed.get("basic_info") or {}
                    if bi:
                        auto_updates["basic_info"] = {
                            k: v for k, v in bi.items() if v not in (None, "")
                        }

                    # education：模型返回字段名是 "education"，映射到档案的 "education_info"
                    # 同时兼容模型直接返回 "education_info" 的情况
                    edu_list = parsed.get("education") or parsed.get("education_info") or []
                    # 也兼容模型直接返回dict而不是list的情况
                    if isinstance(edu_list, dict):
                        edu_list = [edu_list]
                    if edu_list:
                        first_edu = edu_list[0]
                        edu_mapped = {k: v for k, v in first_edu.items() if v not in (None, "")}
                        if edu_mapped:
                            auto_updates["education_info"] = edu_mapped
                            logger.info(f"[ProfileService] education_info回填={edu_mapped}")

                    # 列表型字段：有内容才覆盖
                    for field in ("skills", "certificates", "internships", "projects", "awards"):
                        val = parsed.get(field)
                        if val:
                            auto_updates[field] = val

                    logger.info(f"[ProfileService] 准备回填字段={list(auto_updates.keys())}")
                    if auto_updates:
                        self.update_profile(user_id, auto_updates)
                        logger.info(f"[ProfileService] 简历解析结果已自动回填档案 user_id={user_id}")
                    else:
                        logger.warning(f"[ProfileService] auto_updates为空，没有任何字段被回填")
                except Exception as fill_err:
                    # 回填失败不影响解析任务本身的状态
                    logger.warning(f"[ProfileService] 自动回填档案失败: {fill_err}", exc_info=True)

            except Exception as e:
                self.task_store[task_id]["status"] = "failed"
                self.task_store[task_id]["error"] = str(e)
                logger.error(f"[ProfileService] 简历解析失败 task_id={task_id}: {e}", exc_info=True)
            finally:
                _save_task_store(self.task_store)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

    def _do_parse_resume(self, resume_text: str) -> dict:
        """
        调用通义大模型（qwen3-max）解析简历文本，读取 config/rag.yml。
        返回：parsed_data + confidence_score + suggestions（对应API文档2.4）
        """
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import PromptTemplate

        # 与 job_profile_service 保持相同的模型加载方式
        try:
            from model.factory import chat_model
            model = chat_model
        except ImportError:
            from langchain_community.chat_models.tongyi import ChatTongyi
            from utils.config_handler import rag_conf
            model = ChatTongyi(model=rag_conf["chat_model_name"])

        # 加载prompt模板
        prompt_template = _load_prompt("resume_parse_prompt_path")
        prompt = PromptTemplate(
            input_variables=["resume_text"],
            template=prompt_template
        )
        chain = prompt | model | StrOutputParser()

        # 调用模型
        raw_output = chain.invoke({"resume_text": resume_text})
        parsed = _extract_json(raw_output)

        # 如果模型没有解析出有效结构，用本地正则做一次兜底解析
        try:
            bi = (parsed.get("basic_info") or {}) if isinstance(parsed, dict) else {}
            no_basic = not bi or all(
                not (bi.get(k) or "").strip() for k in ("name", "phone", "email")
            )
        except Exception:
            bi = {}
            no_basic = True

        if no_basic:
            fallback = _fallback_parse_resume_text(resume_text)
            if isinstance(parsed, dict):
                for k, v in fallback.items():
                    if k not in parsed or not parsed[k]:
                        parsed[k] = v
            else:
                parsed = fallback

        # 始终用兜底结果补全 basic_info 中缺失的字段（解决模型未识别姓名、出生日期等问题）
        fallback = _fallback_parse_resume_text(resume_text)
        if isinstance(parsed, dict) and fallback.get("basic_info"):
            bi = parsed.setdefault("basic_info", {})
            fbi = fallback["basic_info"]
            for key in ("name", "nickname", "birth_date", "birthday", "gender"):
                fv = (fbi.get(key) or "").strip()
                if not fv:
                    continue
                if not (bi.get(key) or "").strip():
                    bi[key] = fv

        # 提取 confidence_score 和 suggestions（从模型输出中分离）
        confidence_score = parsed.pop("confidence_score", 0.85)
        suggestions = parsed.pop("suggestions", [])

        # 规范化 skills：保证 items 为字符串数组，便于前端「专业技能」等正确展示
        if isinstance(parsed.get("skills"), list):
            normalized_skills = []
            for s in parsed["skills"]:
                if not s:
                    continue
                if isinstance(s, str):
                    normalized_skills.append({"category": "专业技能", "items": [s]})
                elif isinstance(s, dict):
                    cat = s.get("category") or s.get("type") or "专业技能"
                    raw = s.get("items") or (s.get("name") and [s["name"]]) or []
                    if not isinstance(raw, list):
                        raw = [raw] if raw else []
                    items = []
                    for it in raw:
                        if isinstance(it, str):
                            items.append(it)
                        elif isinstance(it, dict):
                            items.append(it.get("name") or it.get("skill") or it.get("item") or "")
                        else:
                            items.append(str(it) if it else "")
                    items = [x.strip() for x in items if x and x.strip()]
                    if items:
                        normalized_skills.append({"category": cat, "items": items})
            parsed["skills"] = normalized_skills

        # 规范化 internships：剔除 company 仅为年份或无效词的条目不作为实习公司
        if isinstance(parsed.get("internships"), list):
            import re
            cleaned = []
            for i in parsed["internships"]:
                if not i or not isinstance(i, dict):
                    continue
                company = (i.get("company") or "").strip()
                # 若 company 仅为 4 位数字（年份）或明显无效词，则丢弃该条或仅保留 description
                if re.match(r"^\d{4}$", company) or company in ("提交有效", "无", "暂无", "—", "－"):
                    continue
                if len(company) < 2 and not (i.get("description") or "").strip():
                    continue
                cleaned.append(i)
            parsed["internships"] = cleaned

        # parsed 剩余部分就是 parsed_data
        return {
            "parsed_data": parsed,
            "confidence_score": confidence_score,
            "suggestions": suggestions
        }

    def parse_resume_sync(self, resume_text: str) -> Optional[dict]:
        """
        同步解析简历文本，供 Java 等外部服务调用。
        返回：{ "parsed_data": {...}, "confidence_score": 0.xx, "suggestions": [...] } 或 None
        """
        if not resume_text or len((resume_text or "").strip()) < 10:
            return None
        try:
            return self._do_parse_resume(resume_text)
        except Exception as e:
            logger.warning(f"[ProfileService] parse_resume_sync 失败: {e}", exc_info=True)
            return None

    # ──────────────────────────────────────────────────────
    # 2.4 获取解析结果
    # ──────────────────────────────────────────────────────
    def get_parse_result(self, task_id: str) -> Optional[dict]:
        """
        获取简历解析任务结果。
        对应 API 文档 2.4
        返回：{ status, parsed_data, confidence_score, suggestions }
        """
        task = self.task_store.get(task_id)
        if not task:
            return None

        response = {"status": task["status"]}
        if task["status"] == "completed" and task.get("result"):
            result = task["result"]
            response["parsed_data"]      = result.get("parsed_data", {})
            response["confidence_score"] = result.get("confidence_score", 0.85)
            response["suggestions"]      = result.get("suggestions", [])
        elif task["status"] == "failed":
            response["error"] = task.get("error", "解析失败")
        return response


# ========== 单例获取 ==========

_profile_service_instance: Optional[ProfileService] = None


def get_profile_service() -> ProfileService:
    global _profile_service_instance
    if _profile_service_instance is None:
        _profile_service_instance = ProfileService()
    return _profile_service_instance
