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
                    auto_updates = {}

                    # basic_info：只取简历里有值的字段，不覆盖用户已填的
                    bi = parsed.get("basic_info") or {}
                    if bi:
                        auto_updates["basic_info"] = {
                            k: v for k, v in bi.items() if v not in (None, "")
                        }

                    # education：取第一条教育经历映射到 education_info
                    edu_list = parsed.get("education") or []
                    if edu_list:
                        first_edu = edu_list[0]
                        auto_updates["education_info"] = {
                            k: v for k, v in first_edu.items() if v not in (None, "")
                        }

                    # 列表型字段：有内容才覆盖
                    for field in ("skills", "certificates", "internships", "projects", "awards"):
                        val = parsed.get(field)
                        if val:
                            auto_updates[field] = val

                    if auto_updates:
                        self.update_profile(user_id, auto_updates)
                        logger.info(f"[ProfileService] 简历解析结果已自动回填档案 user_id={user_id}")
                except Exception as fill_err:
                    # 回填失败不影响解析任务本身的状态
                    logger.warning(f"[ProfileService] 自动回填档案失败: {fill_err}")

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

        # 提取 confidence_score 和 suggestions（从模型输出中分离）
        confidence_score = parsed.pop("confidence_score", 0.85)
        suggestions = parsed.pop("suggestions", [])

        # parsed 剩余部分就是 parsed_data
        return {
            "parsed_data": parsed,
            "confidence_score": confidence_score,
            "suggestions": suggestions
        }

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
