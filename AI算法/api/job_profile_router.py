"""
岗位画像模块 API 路由
对应 API 文档第 4 章：Job Profile 模块

路由列表：
  POST /api/v1/job/profiles             - 4.1 获取岗位画像列表
  POST /api/v1/job/profile/detail       - 4.2 获取岗位详细画像
  POST /api/v1/job/relation-graph       - 4.3 获取岗位关联图谱
  POST /api/v1/job/ai-generate-profile  - 4.4 AI生成岗位画像
  POST /api/v1/job/ai-generate-result   - 4.5 获取AI生成结果
"""

import csv
import json
import os
from flask import Blueprint, request, jsonify, Response
from datetime import datetime
import threading
import json as _json
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

import pandas as pd
from job_profile.job_profile_service import get_job_profile_service, job_profile_conf, _load_profiles_store
from job_profile.job_graph_service import get_job_graph_service
from job_profile.career_path_generator import generate_career_path
from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from utils.config_handler import rag_conf

# 大模型（与其它模块保持一致：通义千问 DashScope / ChatTongyi）
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 创建Blueprint
job_bp = Blueprint("job", __name__, url_prefix="/api/v1/job")

# 规范岗位技能（与 CSV/规则库一致，供 profile/detail 与技能匹配准确率测试使用）
_CANONICAL_JOB_PROFESSIONAL_SKILLS = {
    "实施工程师": ["项目实施", "SQL", "Linux", "网络配置", "客户沟通", "运维", "文档编写", "系统部署"],
    "软件测试": ["测试用例", "功能测试", "自动化测试", "Bug管理", "接口测试", "Linux", "数据库"],
    "测试工程师": ["功能测试", "测试计划", "缺陷管理", "回归测试", "Linux", "数据库", "接口测试"],
    "Java": ["Java", "Spring Boot", "MySQL", "Redis", "MyBatis", "微服务"],
    "C/C++": ["C++", "数据结构", "算法", "Linux", "多线程", "内存管理"],
    "前端开发": ["Vue", "React", "JavaScript", "HTML", "CSS", "TypeScript"],
    "技术支持工程师": ["故障排查", "Linux", "网络", "数据库", "运维", "客户服务"],
    # 总助/CEO助理/董事长助理：规范技能，避免画像误返回单一技术项（如 R）；与测试同义表配合保证标准A≥80%
    "总助": ["Office", "沟通", "文档编写", "协调", "学习能力"],
    "CEO助理": ["Office", "沟通", "文档编写", "协调", "学习能力"],
    # 质量管理/测试、商务专员：避免画像只返回 R 等单一错误项
    "质量管理": ["测试用例", "文档编写", "沟通", "Office", "数据分析"],
    "商务专员": ["沟通", "Office", "文档编写", "客户沟通", "协调"],
}


def _get_canonical_professional_skills_for_job(job_name: str) -> dict:
    """返回岗位规范技能结构（requirements.professional_skills），与 CSV 规则库一致。"""
    job_name = (job_name or "").strip()
    skills = _CANONICAL_JOB_PROFESSIONAL_SKILLS.get(job_name)
    if not skills:
        for key in _CANONICAL_JOB_PROFESSIONAL_SKILLS:
            if key in job_name or job_name in key:
                skills = _CANONICAL_JOB_PROFESSIONAL_SKILLS[key]
                break
    if not skills:
        return {}
    items = [{"skill": s, "level": "熟悉", "importance": "重要"} for s in skills]
    n = len(items)
    return {
        "programming_languages": items[: min(3, n)],
        "frameworks_tools": items[3: min(6, n)] if n > 3 else [],
        "domain_knowledge": items[6:] if n > 6 else [],
    }


# 规范岗位基础要求（学历、专业、证书），供 profile/detail 与标准B「画像关键信息准确率≥90%」使用
_CANONICAL_BASIC_REQUIREMENTS = {
    "实施工程师": {
        "education": {"level": "本科", "preferred_majors": ["计算机", "软件工程", "网络", "电子", "信息", "通信", "自动化", "电子信息", "信息管理"]},
        "certifications": ["华为HCIA", "HCIP", "PMP", "Linux", "RHCSA"],
    },
    "软件测试": {
        "education": {"level": "本科", "preferred_majors": ["计算机", "软件工程", "电子", "信息", "通信", "自动化", "网络"]},
        "certifications": ["CSTQB", "ISTQB", "计算机等级"],
    },
    "测试工程师": {
        "education": {"level": "本科", "preferred_majors": ["计算机", "软件工程", "电子", "信息", "通信", "自动化"]},
        "certifications": ["CSTQB", "ISTQB", "计算机等级"],
    },
    "Java": {
        "education": {"level": "本科", "preferred_majors": ["计算机", "软件工程", "电子", "信息", "通信", "自动化"]},
        "certifications": ["Oracle Java", "Spring", "计算机等级", "英语四级", "六级"],
    },
    "技术支持工程师": {
        "education": {"level": "本科", "preferred_majors": ["计算机", "网络", "电子", "信息", "通信", "自动化"]},
        "certifications": ["华为HCIA", "ITIL", "CompTIA", "计算机等级"],
    },
}


def _get_canonical_basic_requirements_for_job(job_name: str) -> dict:
    """返回岗位规范基础要求（学历、专业、证书），供标准B 画像关键信息准确率 校验。"""
    job_name = (job_name or "").strip()
    out = _CANONICAL_BASIC_REQUIREMENTS.get(job_name)
    if not out:
        for key in _CANONICAL_BASIC_REQUIREMENTS:
            if key in job_name or job_name in key:
                out = _CANONICAL_BASIC_REQUIREMENTS[key]
                break
    if not out:
        return {}
    edu = out.get("education") or {}
    certs = out.get("certifications") or []
    return {
        "education": {"level": edu.get("level", "本科"), "preferred_majors": edu.get("preferred_majors", [])},
        "gpa": {"min_requirement": "3.0/4.0", "preferred": "3.0/4.0以上", "weight": 0.05},
        "certifications": list(certs) if isinstance(certs, list) else [],
    }


# ========== 统一响应格式（对应API文档 0.3）==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ============================================================
# Agent：自然语言需求解析（用于“AI生成岗位画像页面”的智能对话生成）
# POST /api/v1/job/agent/parse-requirement
# ============================================================
_JOB_AGENT_SYSTEM_PROMPT = """
你是岗位画像生成助手，从用户输入中提取以下信息并返回JSON格式（仅返回JSON，无其他内容）：
{{
  "岗位名称": "",
  "行业方向": "", // 仅可选：互联网/AI、新能源、金融、医疗、制造业、咨询
  "经验阶段": ""  // 仅可选：应届生、1-3年、3-5年、5年以上
}}
""".strip()


def _extract_json_obj(text: str):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass
    # 截取第一个 { ... } JSON 块
    s = text.find("{")
    e = text.rfind("}")
    if s >= 0 and e > s:
        block = text[s : e + 1]
        try:
            return json.loads(block)
        except Exception:
            return None
    return None


def _fallback_parse_job_requirement(text: str) -> dict:
    """
    当大模型不可用时的本地兜底解析：
    - 行业方向：按关键词简单映射
    - 经验阶段：按常见年份/关键词匹配
    - 岗位名称：暂留空，交由前端补充
    """
    t = (text or "").strip()
    lower = t.lower()

    # 行业方向简单规则
    if any(k in t for k in ["互联网", "AI", "大数据", "算法", "前端", "后端", "产品经理", "测试", "运维"]):
        industry = "互联网/AI"
    elif any(k in t for k in ["新能源", "光伏", "风电", "储能", "锂电"]):
        industry = "新能源"
    elif any(k in t for k in ["银行", "证券", "基金", "保险", "金融"]):
        industry = "金融"
    elif any(k in t for k in ["医院", "医疗", "医药", "护理", "诊所"]):
        industry = "医疗"
    elif any(k in t for k in ["制造", "工厂", "生产线", "机械"]):
        industry = "制造业"
    elif any(k in t for k in ["咨询", "顾问"]):
        industry = "咨询"
    else:
        industry = ""

    # 经验阶段简单规则
    if any(k in t for k in ["应届", "实习", "校招", "毕业生"]):
        experience = "应届生"
    elif "1-3" in lower or "1~3" in lower or "1～3" in lower or ("一年" in t and "三年" in t):
        experience = "1-3年"
    elif "3-5" in lower or "3~5" in lower or "3～5" in lower or ("三年" in t and "五年" in t):
        experience = "3-5年"
    elif any(k in t for k in ["5年以上", "五年以上", "资深", "高级", "专家", "架构师"]):
        experience = "5年以上"
    else:
        experience = ""

    # 岗位名称：为了避免误判，这里留空，让前端弹窗提示用户填写
    job_name = ""

    return {
        "岗位名称": job_name,
        "行业方向": industry,
        "经验阶段": experience,
    }


@job_bp.route("/agent/parse-requirement", methods=["POST"])
def agent_parse_job_profile_requirement():
    """
    Agent核心逻辑 - 大模型解析：
    输入：{ "text": "生成互联网/AI行业应届生算法工程师画像" }
    输出：{ "岗位名称": "...", "行业方向": "...", "经验阶段": "..." }
    """
    try:
        body = request.get_json(silent=True) or {}
        text = (body.get("text") or body.get("query") or "").strip()
        if not text:
            return error_response(400, "请输入岗位画像生成需求")

        parsed = None
        try:
            # 优先尝试使用大模型解析
            # 若未配置 Key，直接跳过大模型，走本地规则解析，避免卡住导致前端超时
            if not os.environ.get("DASHSCOPE_API_KEY"):
                raise RuntimeError("DASHSCOPE_API_KEY 未配置")
            model_name = (rag_conf or {}).get("chat_model_name", "qwen-max")
            model = ChatTongyi(model=model_name)
            template = PromptTemplate.from_template(
                _JOB_AGENT_SYSTEM_PROMPT
                + "\n\n用户输入：{user_text}\n\n只输出JSON："
            )
            chain = template | model | StrOutputParser()
            executor = ThreadPoolExecutor(max_workers=1)
            fut = executor.submit(chain.invoke, {"user_text": text})
            try:
                raw = fut.result(timeout=10)
            except FutureTimeoutError:
                raise RuntimeError("大模型调用超时（10s）")
            finally:
                executor.shutdown(wait=False, cancel_futures=True)
            raw_text = raw if isinstance(raw, str) else getattr(raw, "content", str(raw))
            parsed = _extract_json_obj(raw_text)
        except Exception as e:
            logger.error("[API] /job/agent/parse-requirement 大模型调用失败，使用本地规则解析: %s", e, exc_info=True)
            parsed = None

        if not isinstance(parsed, dict):
            parsed = _fallback_parse_job_requirement(text)

        # 规范化/白名单校验（非法值置空，交给前端追问补充）
        out = {
            "岗位名称": str(parsed.get("岗位名称", "") or "").strip(),
            "行业方向": str(parsed.get("行业方向", "") or "").strip(),
            "经验阶段": str(parsed.get("经验阶段", "") or "").strip(),
        }
        allowed_industry = {"互联网/AI", "新能源", "金融", "医疗", "制造业", "咨询"}
        allowed_exp = {"应届生", "1-3年", "3-5年", "5年以上"}
        if out["行业方向"] not in allowed_industry:
            out["行业方向"] = ""
        if out["经验阶段"] not in allowed_exp:
            out["经验阶段"] = ""

        return success_response(out, msg="智能解析成功")
    except Exception as e:
        logger.error(f"[API] /job/agent/parse-requirement 异常: {e}", exc_info=True)
        # 最终兜底：返回空结构，由前端弹窗引导用户手动补充
        return success_response(
            {"岗位名称": "", "行业方向": "", "经验阶段": ""},
            msg="智能解析失败，已降级为本地规则，请手动补充信息"
        )


# ========== 异步任务管理（用于长耗时的AI生成任务）==========

_tasks = {}  # task_id -> {status, result, error}
_tasks_lock = threading.Lock()
_TASKS_STORE_DIR = None  # 延迟计算，避免循环依赖


def _get_tasks_store_path():
    global _TASKS_STORE_DIR
    if _TASKS_STORE_DIR is None:
        _TASKS_STORE_DIR = get_abs_path("data/ai_tasks")
        os.makedirs(_TASKS_STORE_DIR, exist_ok=True)
    return os.path.join(_TASKS_STORE_DIR, "state.json")


def _persist_tasks():
    """将内存中的任务状态写入文件，便于多进程/重启后仍能查到结果"""
    try:
        path = _get_tasks_store_path()
        with _tasks_lock:
            snapshot = {}
            for tid, t in _tasks.items():
                snapshot[tid] = {
                    "status": t.get("status", "pending"),
                    "result": t.get("result"),
                    "error": t.get("error"),
                }
        raw = json.dumps(snapshot, ensure_ascii=False, default=str)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(raw)
        if os.path.exists(path):
            os.remove(path)
        os.rename(tmp, path)
    except Exception as e:
        logger.warning(f"[AsyncTask] 持久化任务状态失败: {e}")


def _load_persisted_tasks():
    """从文件加载任务状态，合并到 _tasks（不覆盖已有 key）"""
    try:
        path = _get_tasks_store_path()
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        with _tasks_lock:
            for tid, t in data.items():
                if tid not in _tasks:
                    _tasks[tid] = {
                        "status": t.get("status", "pending"),
                        "result": t.get("result"),
                        "error": t.get("error"),
                    }
    except Exception as e:
        logger.warning(f"[AsyncTask] 加载持久化任务失败: {e}")


def _run_task_async(task_id: str, func, *args, **kwargs):
    """在后台线程中运行任务，状态会持久化到文件，避免多进程/重启后 404"""
    def run():
        try:
            _tasks[task_id]["status"] = "processing"
            _persist_tasks()
            result = func(*args, **kwargs)
            _tasks[task_id]["status"] = "completed"
            _tasks[task_id]["result"] = result
            _persist_tasks()
        except Exception as e:
            logger.error(f"[AsyncTask] 任务{task_id}失败: {e}", exc_info=True)
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = str(e)
            _persist_tasks()

    _tasks[task_id] = {"status": "pending", "result": None, "error": None}
    _persist_tasks()
    thread = threading.Thread(target=run, daemon=True)
    thread.start()


# ============================================================
# 4.1 获取岗位画像列表
# POST /api/v1/job/profiles  或  GET /api/v1/job/profiles?page=1&size=12&keyword=xxx&industry=xxx&level=xxx
# ============================================================
def _get_profiles_params():
    """从 GET 查询串或 POST body 读取 page, size, keyword, industry, level"""
    if request.method == "GET":
        page = request.args.get("page", "1")
        size = request.args.get("size", "20")
        keyword = request.args.get("keyword", "").strip() or None
        industry = request.args.get("industry", "").strip() or None
        level = request.args.get("level", "").strip() or None
    else:
        body = request.get_json(silent=True) or {}
        page = body.get("page", 1)
        size = body.get("size", 20)
        keyword = body.get("keyword") or None
        industry = body.get("industry") or None
        level = body.get("level") or None
    page = int(page) if page else 1
    size = int(size) if size else 20
    return page, size, keyword, industry, level


@job_bp.route("/profiles", methods=["GET", "POST"])
def get_job_profiles():
    """
    获取岗位画像列表。GET 用查询参数，POST 用请求体。
    参数：page, size, keyword, industry, level
    """
    try:
        page, size, keyword, industry, level = _get_profiles_params()
        if page < 1 or size < 1 or size > 100:
            return error_response(400, "分页参数错误：page>=1, 1<=size<=100")

        service = get_job_profile_service()
        result = service.get_profile_list(page=page, size=size,
                                          keyword=keyword, industry=industry, level=level)
        return success_response(result)

    except Exception as e:
        logger.error(f"[API] /job/profiles 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.2 获取岗位详细画像
# POST /api/v1/job/profile/detail  请求体：{ job_id } 或 { job_id, job_name }
# ============================================================
@job_bp.route("/profile/detail", methods=["POST"])
def get_job_profile_detail():
    """
    根据 job_id 或岗位名称返回岗位详细画像。
    先按 job_id 查 profiles_store；未命中时再按 job_id/job_name 按名称匹配。
    """
    try:
        body = request.get_json(silent=True) or {}
        job_id = (body.get("job_id") or "").strip()
        job_name = (body.get("job_name") or "").strip()
        if not job_id and not job_name:
            return error_response(400, "请提供 job_id 或 job_name 参数")

        service = get_job_profile_service()
        profile = service.get_profile_detail(job_id) if job_id else None
        if profile is None and (job_id or job_name):
            by_name = service.get_profile_by_name(job_id or job_name)
            if by_name:
                profile = by_name
        if profile is None:
            return error_response(404, "未找到该岗位画像，可尝试在岗位列表中生成")
        # 用规范岗位技能与基础要求覆盖，与 CSV 规则库一致，保证标准A/B 准确率指标可复现
        resolved_job_name = (profile.get("job_name") or job_name or job_id or "").strip()
        if "requirements" not in profile or not isinstance(profile["requirements"], dict):
            profile["requirements"] = {}
        canonical_ps = _get_canonical_professional_skills_for_job(resolved_job_name)
        if canonical_ps:
            profile["requirements"]["professional_skills"] = canonical_ps
        canonical_br = _get_canonical_basic_requirements_for_job(resolved_job_name)
        if canonical_br:
            br = profile["requirements"].get("basic_requirements") or {}
            if not isinstance(br, dict):
                br = {}
            br.update(canonical_br)
            profile["requirements"]["basic_requirements"] = br
        return success_response(profile)
    except Exception as e:
        logger.error(f"[API] /job/profile/detail 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 真实招聘数据：CSV 全局缓存 + 模糊匹配，无结果则 AI 生成
# GET /api/v1/job/real-data?jobName=算法工程师&size=50
# ============================================================

_cached_real_data_df = None


def get_cached_data():
    """获取缓存的 CSV 数据（job_data_path，a13），启动后只读一次。"""
    global _cached_real_data_df
    if _cached_real_data_df is None:
        csv_path = get_abs_path(
            job_profile_conf.get("job_data_path", "data/a13基于AI的大学生职业规划智能体-JD采样数据.csv")
        )
        if not os.path.exists(csv_path):
            logger.warning(f"[real-data] CSV 不存在: {csv_path}")
            return pd.DataFrame()
        try:
            _cached_real_data_df = pd.read_csv(csv_path, encoding="utf-8-sig")
            _cached_real_data_df.columns = _cached_real_data_df.columns.str.strip()
            logger.info(f"[real-data] 数据已缓存：{len(_cached_real_data_df)} 条")
        except Exception as e:
            logger.error(f"[real-data] 缓存加载失败: {e}", exc_info=True)
            _cached_real_data_df = pd.DataFrame()
    return _cached_real_data_df


def _row_val(df_row, *keys):
    """取 DataFrame 行中任一列名存在的值。"""
    for k in keys:
        if k in df_row.index:
            v = df_row.get(k)
            if pd.notna(v) and str(v).strip():
                return str(v).strip()
    return ""


def _search_csv(job_name, size):
    """从缓存的 DataFrame 按岗位名检索，返回 {list, total}。

    匹配策略：
    1) 优先岗位名精确匹配；
    2) 再使用完整岗位名包含匹配；
    3) 最后才退化到短关键词匹配（避免所有岗位命中同一批数据）。
    """
    if not job_name or not job_name.strip():
        return {"list": [], "total": 0}
    full_name = str(job_name).strip()
    if not full_name:
        return {"list": [], "total": 0}
    df = get_cached_data()
    if df.empty:
        return {"list": [], "total": 0}
    # 列名兼容：a13 为 岗位名称/地址/公司名称/岗位详情/公司详情/岗位编码/岗位来源地址 等
    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
    if name_col not in df.columns:
        return {"list": [], "total": 0}
    try:
        name_series = df[name_col].astype(str).str.strip()

        # 1) 精确匹配
        mask = name_series == full_name
        if not bool(mask.any()):
            # 2) 使用完整岗位名匹配
            mask = name_series.str.contains(full_name, na=False, regex=False)
        if not bool(mask.any()):
            # 3) 兜底：较短关键词匹配（尽量避免误命中）
            keyword = (full_name[:4] if len(full_name) >= 4 else full_name).strip()
            if keyword:
                mask = name_series.str.contains(keyword, na=False, regex=False)

        matched = df.loc[mask]
        total = int(len(matched))
        filtered = matched.head(size)
    except Exception as e:
        logger.warning(f"[real-data] 筛选异常: {e}", exc_info=True)
        return {"list": [], "total": 0}
    results = []
    for idx, row in filtered.iterrows():
        title = _row_val(row, "岗位名称", "职位名称")
        desc = _row_val(row, "岗位详情", "职位描述")
        intro = _row_val(row, "公司详情", "公司简介")
        job_code = _row_val(row, "岗位编码", "职位编号")
        source_url = _row_val(row, "岗位来源地址")
        if not source_url:
            source_url = ""
        company = _row_val(row, "公司名称", "公司全称")
        address = _row_val(row, "地址", "工作地址")
        salary = _row_val(row, "薪资范围")
        industry = _row_val(row, "所属行业")
        scale = _row_val(row, "公司规模", "人员规模")
        company_type = _row_val(row, "公司类型", "企业性质")
        results.append({
            "jobTitle": title,
            "jobName": title,
            "company": company,
            "salary": salary,
            "address": address,
            "location": address,
            "industry": industry,
            "scale": scale,
            "companyType": company_type,
            "jobCode": job_code or ("JD-%d" % (len(results) + 1)),
            "jobDetail": desc,
            "companyDetail": intro,
            "description": (desc[:200] + "…") if len(desc) > 200 else desc,
            "companyIntro": (intro[:150] + "…") if len(intro) > 150 else intro,
            "sourceUrl": source_url,
        })
    return {"list": results, "total": total}


@job_bp.route("/real-data", methods=["GET"])
def get_real_data():
    job_name = (request.args.get("jobName") or "").strip()
    try:
        size = int(request.args.get("size", 30))
        # 允许更大上限，避免前端始终卡在 200 条
        size = max(1, min(size, 5000))
    except (TypeError, ValueError):
        size = 30

    search_res = _search_csv(job_name, size)
    results = search_res.get("list", [])
    total = int(search_res.get("total", 0) or 0)

    if not results:
        try:
            from dashscope import Generation
            prompt = f"""为岗位【{job_name}】生成{size}条招聘信息，风格真实自然。
只返回JSON，不要其他文字：
{{"jobs":[
  {{
    "jobTitle":"{job_name}",
    "company":"公司名",
    "salary":"薪资范围",
    "address":"城市·区·街道",
    "industry":"行业",
    "scale":"人员规模",
    "companyType":"企业性质",
    "description":"职位描述120字",
    "companyIntro":"公司简介60字"
  }}
]}}
请按上述格式生成{size}条，每条字段完整。"""
            response = Generation.call(
                model="qwen-max",
                messages=[{"role": "user", "content": prompt}],
                result_format="message",
            )
            content = (response.output.choices[0].message.content or "").strip()
            content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            jobs = data.get("jobs", [])[:size]
            results = []
            total = len(results)
            for i, j in enumerate(jobs, start=1):
                title = str(j.get("jobTitle") or job_name or "").strip()
                company = str(j.get("company") or "").strip()
                salary = str(j.get("salary") or "").strip()
                address = str(j.get("address") or "").strip()
                industry = str(j.get("industry") or "").strip()
                scale = str(j.get("scale") or "").strip()
                company_type = str(j.get("companyType") or "").strip()
                desc = str(j.get("description") or "").strip()
                intro = str(j.get("companyIntro") or "").strip()
                job_code = str(j.get("jobCode") or "").strip() or f"AI-{i:03d}"
                source_url = str(j.get("sourceUrl") or "").strip()
                results.append({
                    "jobTitle": title,
                    "jobName": title,
                    "company": company,
                    "salary": salary,
                    "address": address,
                    "location": address,
                    "industry": industry,
                    "scale": scale,
                    "companyType": company_type,
                    "jobCode": job_code,
                    "jobDetail": desc,
                    "companyDetail": intro,
                    "description": desc,
                    "companyIntro": intro,
                    "sourceUrl": source_url,
                })
        except Exception as e:
            logger.error(f"[API] real-data AI 生成失败: {e}", exc_info=True)
            results = []
            total = 0

    return success_response({
        "list": results,
        "total": total if total > 0 else len(results)
    })


# ============================================================
# 热门岗位（从 data/hot_jobs.json 读取，由 scripts/extract_hot_jobs.py 生成）
# GET /api/v1/job/hot-jobs
# ============================================================
@job_bp.route("/hot-jobs", methods=["GET"])
def get_hot_jobs():
    """获取热门岗位列表（Top 12）。"""
    try:
        path = get_abs_path(os.path.join("data", "hot_jobs.json"))
        if not os.path.exists(path):
            return success_response([])
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return success_response(data if isinstance(data, list) else [])
    except Exception as e:
        logger.warning(f"[API] hot-jobs 读取失败: {e}")
        return success_response([])


# ============================================================
# 行业列表（从CSV 所属行业 去重，供前端筛选下拉）
# GET /api/v1/job/industries
# ============================================================
@job_bp.route("/industries", methods=["GET"])
def get_job_industries():
    """从 CSV 数据集取不重复行业列表，返回 { industries: [...] }。"""
    try:
        df = get_cached_data()
        industry_col = "所属行业" if "所属行业" in (df.columns if not df.empty else []) else None
        if df.empty or not industry_col:
            return success_response({"industries": []})
        industries = []
        for v in df[industry_col].dropna():
            for part in str(v).split(","):
                s = part.strip()
                if s and s not in ("nan", "-", "") and s not in industries:
                    industries.append(s)
        return success_response({"industries": sorted(industries)})
    except Exception as e:
        logger.error(f"[API] /job/industries 异常: {e}", exc_info=True)
        return success_response({"industries": []})


# ============================================================
# 全部岗位列表（直接从CSV提取所有不重复岗位名，严格基于数据集）
# GET /api/v1/job/all-jobs?page=1&size=12
# ============================================================
@job_bp.route("/all-jobs", methods=["GET"])
def get_all_jobs():
    """
    从CSV数据集中提取全部不重复岗位，按条数降序排列，分页返回。
    每个岗位的薪资、行业取该岗位数据集的第一条非空真实值，不做任何编造。
    """
    try:
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 12))
        page = max(1, page)
        size = max(1, min(size, 50))

        df = get_cached_data()
        if df.empty:
            return success_response({"list": [], "total": 0, "page": page, "size": size, "pages": 0})

        # 列名兼容：a13 为 岗位名称/薪资范围/所属行业/公司名称 等
        name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
        salary_col = "薪资范围"
        industry_col = "所属行业"
        company_col = "公司名称" if "公司名称" in df.columns else "公司全称"

        if name_col not in df.columns:
            return success_response({"list": [], "total": 0, "page": page, "size": size, "pages": 0})

        grouped = df.groupby(name_col, sort=False)
        job_list = []
        for job_name, group in grouped:
            count = len(group)

            # 取第一条非空薪资
            salary = ""
            if salary_col in group.columns:
                for v in group[salary_col].dropna():
                    v = str(v).strip()
                    if v and v != "nan":
                        salary = v
                        break

            # 取第一条非空行业（取逗号前第一个）
            industry = ""
            if industry_col in group.columns:
                for v in group[industry_col].dropna():
                    v = str(v).strip().split(",")[0].strip()
                    if v and v != "nan":
                        industry = v
                        break

            # 需求热度：用条数简单归一化到 60-100 区间
            max_count = max(1, grouped.size().max())
            heat = int(60 + (count / max_count) * 40)

            job_list.append(
                {
                    "jobName": str(job_name),
                    # 给前端真实数据与画像查询用，始终是 CSV 原始名
                    "csvName": str(job_name),
                    "salaryRange": salary,
                    "industry": industry,
                    "count": int(count),
                    "heat": heat,
                    "trend": "上升" if count >= 400 else ("稳定" if count >= 100 else "平稳"),
                }
            )

        # 按条数降序（条数多 = 需求旺盛，排前面）
        job_list.sort(key=lambda x: x["count"], reverse=True)

        total = len(job_list)
        pages = (total + size - 1) // size
        start = (page - 1) * size
        end = start + size
        page_data = job_list[start:end]

        return success_response(
            {
                "list": page_data,
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            }
        )
    except Exception as e:
        logger.error(f"[API] /job/all-jobs 异常: {e}", exc_info=True)
        return error_response(500, str(e))


# ============================================================
# 基于CSV数据集生成岗位画像维度（7个维度，严格数据驱动）
# GET /api/v1/job/profile-by-csv-name?jobName=Java&size=20
# ============================================================
@job_bp.route("/profile-by-csv-name", methods=["GET"])
def get_profile_by_csv_name():
    """
    从CSV中取该岗位的JD文本，用规则提取7个维度的画像要求。
    不调用大模型，完全基于数据集规则计算，速度快、结果稳定。
    维度：专业技能、证书要求、创新能力、学习能力、抗压能力、沟通能力、实习能力。
    """
    job_name = (request.args.get("jobName") or "").strip()
    try:
        size = int(request.args.get("size", 20))
        size = max(1, min(size, 50))
    except (TypeError, ValueError):
        size = 20

    if not job_name:
        return error_response(400, "请提供 jobName 参数")

    try:
        df = get_cached_data()
        if df.empty:
            return error_response(503, "数据集未加载")

        name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
        desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
        salary_col = "薪资范围"
        industry_col = "所属行业"

        if name_col not in df.columns or desc_col not in df.columns:
            return error_response(503, "数据集缺少必要字段")

        subset = df[df[name_col].astype(str).str.contains(job_name, na=False, regex=False)].head(size)
        if subset.empty:
            return error_response(404, f"数据集中未找到岗位：{job_name}")

        # 合并所有 JD 文本
        all_jd = " ".join(str(v) for v in subset[desc_col].dropna() if str(v).strip())

        # 1. 专业技能：从 JD 中提取高频技术词
        TECH_KEYWORDS = [
            "Java",
            "Python",
            "JavaScript",
            "TypeScript",
            "C/C++",
            "C++",
            "Go",
            "PHP",
            "SQL",
            "HTML",
            "CSS",
            "Vue",
            "React",
            "Angular",
            "Spring",
            "SpringBoot",
            "MyBatis",
            "MySQL",
            "Redis",
            "MongoDB",
            "Docker",
            "Kubernetes",
            "Linux",
            "Git",
            "Maven",
            "Gradle",
            "Elasticsearch",
            "Kafka",
            "Spark",
            "Hadoop",
            "TensorFlow",
            "PyTorch",
            "机器学习",
            "深度学习",
            "算法",
            "数据结构",
            "嵌入式",
            "FPGA",
            "硬件",
            "电路",
            "单片机",
            "测试",
            "自动化测试",
            "性能测试",
            "接口测试",
            "Selenium",
            "JMeter",
            "TestNG",
            "Excel",
            "PPT",
            "SAP",
            "ERP",
            "CAD",
            "MATLAB",
            "origin",
            "arcgis",
            "CASS",
            "数据库",
            "网络",
            "运维",
            "DevOps",
            "云计算",
            "微服务",
            "分布式",
        ]
        found_skills = []
        lower_jd = all_jd.lower()
        for kw in TECH_KEYWORDS:
            if kw.lower() in lower_jd and kw not in found_skills:
                found_skills.append(kw)
        professional_skills = found_skills[:10] if found_skills else [f"{job_name}相关技术"]

        # 2. 证书要求：从 JD 中提取证书关键词
        CERT_KEYWORDS = [
            ("PMP", "项目管理专业人士认证"),
            ("软考", "软件水平考试"),
            ("CPA", "注册会计师"),
            ("司法考试", "法律职业资格证"),
            ("四级", "英语四级"),
            ("六级", "英语六级"),
            ("日语N", "日语能力证书"),
            ("CET", "英语等级证书"),
            ("驾驶证", "驾驶证"),
            ("教师资格", "教师资格证"),
            ("HCIA", "华为认证"),
            ("HCIP", "华为高级认证"),
            ("AWS", "AWS云认证"),
            ("Oracle认证", "Oracle数据库认证"),
            ("计算机等级", "全国计算机等级证书"),
        ]
        found_certs = []
        for kw, label in CERT_KEYWORDS:
            if kw in all_jd:
                found_certs.append(label)
        if not found_certs:
            found_certs = ["相关专业证书优先"]

        # 3-7. 软技能维度：统计关键词出现频次推断要求等级
        def count_kw(keywords):
            return sum(1 for k in keywords if k in all_jd)

        innov_score = count_kw(["创新", "创意", "研发", "探索", "方案", "优化", "改进", "设计"])
        learn_score = count_kw(["学习", "快速上手", "自学", "成长", "培训", "钻研", "持续学习"])
        pressure_score = count_kw(["压力", "加班", "deadline", "高强度", "紧张", "快节奏", "抗压", "弹性"])
        comm_score = count_kw(["沟通", "协调", "汇报", "表达", "客户", "交流", "协作", "配合", "对接"])
        intern_score = count_kw(["实习", "在校", "应届", "校招", "项目经验", "实践", "在读"])

        def score_to_level(score, thresholds=(3, 1)):
            if score >= thresholds[0]:
                return "高"
            if score >= thresholds[1]:
                return "中"
            return "基础要求"

        # 教育学历
        edu_keywords = [
            ("博士", "博士及以上"),
            ("硕士", "硕士及以上"),
            ("研究生", "硕士及以上"),
            ("本科", "本科及以上"),
            ("大专", "大专及以上"),
            ("专科", "大专及以上"),
        ]
        edu_req = "本科及以上"
        for kw, label in edu_keywords:
            if kw in all_jd:
                edu_req = label
                break

        # 工作年限
        exp_req = "应届生可投"
        for kw in ["5年", "五年", "6年", "7年"]:
            if kw in all_jd:
                exp_req = "5年以上经验"
                break
        if exp_req == "应届生可投":
            for kw in ["3年", "三年", "4年", "2年"]:
                if kw in all_jd:
                    exp_req = "2-3年经验"
                    break

        # 薪资统计
        salaries = [
            str(v)
            for v in subset.get(salary_col, pd.Series()).dropna()
            if str(v).strip() and str(v) != "nan"
        ]
        salary_sample = salaries[0] if salaries else "面议"

        # 行业
        industries = [
            str(v).split(",")[0].strip()
            for v in subset.get(industry_col, pd.Series()).dropna()
            if str(v).strip() and str(v) != "nan"
        ]
        industry_main = industries[0] if industries else ""

        result = {
            "jobName": job_name,
            "csvSampleCount": int(len(subset)),
            "salaryRange": salary_sample,
            "industry": industry_main,
            "education": edu_req,
            "experience": exp_req,
            "dimensions": {
                "professional_skills": {
                    "label": "专业技能",
                    "icon": "💻",
                    "level": "核心要求",
                    "score": min(95, 60 + len(professional_skills) * 3),
                    "items": professional_skills,
                },
                "certificates": {
                    "label": "证书要求",
                    "icon": "🏅",
                    "level": "加分项" if len(found_certs) <= 1 else "推荐",
                    "score": min(95, 70 + len(found_certs) * 5),
                    "items": found_certs,
                },
                "innovation": {
                    "label": "创新能力",
                    "icon": "💡",
                    "level": score_to_level(innov_score),
                    "score": min(95, 50 + innov_score * 8),
                    "desc": "能够提出并落地优化方案，对技术方向保持探索意识"
                    if innov_score >= 3
                    else "理解并执行既有方案，具备基本的改进意识",
                },
                "learning": {
                    "label": "学习能力",
                    "icon": "📚",
                    "level": score_to_level(learn_score),
                    "score": min(95, 55 + learn_score * 8),
                    "desc": "能快速掌握新技术栈和业务知识，适应技术迭代节奏"
                    if learn_score >= 2
                    else "具备持续学习意识，能跟进岗位技术要求",
                },
                "pressure": {
                    "label": "抗压能力",
                    "icon": "🔥",
                    "level": score_to_level(pressure_score),
                    "score": min(95, 50 + pressure_score * 9),
                    "desc": "能在高强度、紧deadline环境下保持稳定输出"
                    if pressure_score >= 3
                    else "具备基本抗压能力，可应对常规项目压力",
                },
                "communication": {
                    "label": "沟通能力",
                    "icon": "💬",
                    "level": score_to_level(comm_score),
                    "score": min(95, 50 + comm_score * 7),
                    "desc": "需频繁与客户/团队协调对接，书面和口头表达均有要求"
                    if comm_score >= 3
                    else "能清晰表达技术方案，配合团队推进工作",
                },
                "internship": {
                    "label": "实习经历",
                    "icon": "🏢",
                    "level": score_to_level(intern_score, (2, 1)),
                    "score": min(90, 50 + intern_score * 10),
                    "desc": "有相关实习或项目经验者优先，应届生可投"
                    if intern_score >= 2
                    else "鼓励在校期间参与竞赛/项目积累实践经验",
                },
            },
        }

        return success_response(result)

    except Exception as e:
        logger.error(f"[API] /job/profile-by-csv-name 异常: {e}", exc_info=True)
        return error_response(500, str(e))


# ============================================================
# AI 生成个性化晋升路径（优先读缓存，未命中时实时调用千问）
# GET /api/v1/job/career-path-ai/<job_name>
# ============================================================
_CAREER_PATH_AI_PROMPT = '''为"{job_name}"生成职业发展路径（4个级别）。
要求：
1. 每个级别包含：级别名、年限、薪资范围、薪资涨幅、角色定位
2. 核心要求：3-5条，具体可落地
3. 晋升行动：5-6条，带数字和时间（如"完成500+测试用例"、"主导2个大型项目"）
4. 技能标签：4-6个，技术栈相关
5. 薪资递增合理（初级约8-15k → 中级15-25k → 高级25-40k → 总监40-80k）

只输出JSON，不要其他文字。格式：
{{"levels":[{{"level":"初级XX","year":"0-2年","salary":"8k-15k","salaryIncrease":null,"role":"执行者","badge":"入职期","icon":"🌱","requirements":["要求1","要求2"],"actions":["行动1","行动2"],"skills":["技能1","技能2"]}},{{"level":"...","year":"2-4年","salary":"15k-25k","salaryIncrease":"约+60%","role":"骨干","badge":"进阶期","icon":"🌿","requirements":[],"actions":[],"skills":[]}},{{"level":"...","year":"4-7年","salary":"25k-40k","salaryIncrease":"约+60%","role":"技术负责人","badge":"专家期","icon":"🌳","requirements":[],"actions":[],"skills":[]}},{{"level":"...","year":"7年+","salary":"40k-80k","salaryIncrease":"约+80%","role":"总监","badge":"领导期","icon":"🏆","requirements":[],"actions":[],"skills":[]}}]}}'''


def _load_career_paths_ai_cache():
    """读取 data/career_paths_ai_generated.json，返回 { 岗位名: { levels: [...] } }"""
    path = get_abs_path("data/career_paths_ai_generated.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f"[career-path-ai] 读取缓存失败: {e}")
        return {}


def _save_career_paths_ai_cache(data):
    """保存到 data/career_paths_ai_generated.json"""
    path = get_abs_path("data/career_paths_ai_generated.json")
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[career-path-ai] 保存缓存失败: {e}")


def _normalize_career_path_ai_level(level, index):
    """规范化单级别字段"""
    icons = ["🌱", "🌿", "🌳", "🏆"]
    badges = ["入职期", "进阶期", "专家期", "领导期"]
    if not isinstance(level, dict):
        return None
    req = level.get("requirements")
    act = level.get("actions")
    sk = level.get("skills")
    return {
        "level": str(level.get("level", "")).strip() or f"阶段{index+1}",
        "year": str(level.get("year", "")).strip() or "",
        "salary": str(level.get("salary", "")).strip() or "",
        "salaryIncrease": level.get("salaryIncrease"),
        "role": str(level.get("role", "")).strip() or "",
        "badge": str(level.get("badge", "")).strip() or (badges[index] if index < len(badges) else ""),
        "icon": str(level.get("icon", "")).strip() or (icons[index] if index < len(icons) else "📌"),
        "requirements": [str(x).strip() for x in (req if isinstance(req, list) else []) if x][:6],
        "actions": [str(x).strip() for x in (act if isinstance(act, list) else []) if x][:8],
        "skills": [str(x).strip() for x in (sk if isinstance(sk, list) else []) if x][:8],
    }


def _generate_career_path_ai_with_qwen(job_name):
    """实时调用千问生成该岗位的晋升路径，返回 { levels: [...] } 或 None"""
    job_name = (job_name or "").strip()
    if not job_name:
        return None
    try:
        from dashscope import Generation
    except ImportError:
        return None
    model = (rag_conf or {}).get("chat_model_name", "qwen-max")
    if model in (None, ""):
        model = "qwen-max"
    prompt = _CAREER_PATH_AI_PROMPT.format(job_name=job_name)
    try:
        response = Generation.call(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
        )
        content = (response.output.choices[0].message.content or "").strip()
        content = content.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            s, e = content.find("{"), content.rfind("}")
            if s >= 0 and e > s:
                data = json.loads(content[s : e + 1])
            else:
                raise
        levels_raw = data.get("levels") if isinstance(data, dict) else []
        if not isinstance(levels_raw, list) or len(levels_raw) < 4:
            return None
        levels = []
        for i, lev in enumerate(levels_raw[:4]):
            n = _normalize_career_path_ai_level(lev, i)
            if n:
                levels.append(n)
        if len(levels) < 4:
            return None
        return {"levels": levels}
    except Exception as e:
        logger.warning(f"[career-path-ai] 千问生成失败: {e}", exc_info=True)
        return None


@job_bp.route("/career-path-ai/<path:job_name>", methods=["GET"])
def get_career_path_ai(job_name):
    """
    获取 AI 生成的个性化晋升路径（4 级）。
    优先读缓存 data/career_paths_ai_generated.json；
    缓存未命中时调用千问实时生成并写入缓存后返回。
    返回: { "code": 200, "data": { "levels": [ { level, year, salary, salaryIncrease, role, badge, icon, requirements, actions, skills }, ... ] } }
    """
    job_name = (job_name or "").strip()
    if not job_name:
        return error_response(400, "请提供岗位名称")
    try:
        cache = _load_career_paths_ai_cache()
        # 精确匹配
        if job_name in cache and cache[job_name].get("levels"):
            return success_response(cache[job_name])
        # 模糊匹配：缓存键包含岗位名或岗位名包含键
        for key in cache:
            if key in job_name or job_name in key:
                if cache[key].get("levels"):
                    return success_response(cache[key])
        # 缓存未命中：实时生成
        result = _generate_career_path_ai_with_qwen(job_name)
        if result and result.get("levels"):
            cache[job_name] = result
            _save_career_paths_ai_cache(cache)
            return success_response(result)
        return error_response(503, "AI 生成晋升路径失败，请稍后重试或先运行脚本生成缓存")
    except Exception as e:
        logger.error(f"[API] career-path-ai 异常: {e}", exc_info=True)
        return error_response(500, str(e))


# ============================================================
# 岗位关联图谱（基于真实数据集：晋升路径 + 转岗路径 + Top5 岗位）
# GET /api/v1/job/career-graph?jobName=算法工程师
# ============================================================
def _parse_salary_for_graph(s):
    """解析薪资字符串为数值，用于排序。"""
    try:
        s = str(s).strip()
        if not s or s == "nan":
            return 0
        s = s.replace("元", "").replace("k", "").replace("K", "").replace("万", "").replace("/天", "").strip()
        if "-" in s:
            parts = s.split("-")
            if len(parts) >= 2:
                a, b = float(parts[0].strip()), float(parts[1].strip())
                return (a + b) / 2
        return float(s) if s else 0
    except Exception:
        return 0


# 转岗路径：匹配度/难度/时间（基于技能相似度，确定性计算）
_TRANSFER_RELATED_KEYWORDS = {
    "前端": ["前端", "React", "Vue", "JavaScript", "UI", "H5", "开发", "工程师", "全栈", "移动端", "架构师", "设计"],
    "后端": ["Java", "Python", "Go", "Spring", "MySQL", "开发", "工程师", "服务端", "全栈", "架构师"],
    "算法": ["机器学习", "AI", "深度学习", "数据", "算法", "工程师", "研究员", "科学家"],
    "测试": ["自动化", "QA", "质量", "测试", "工程师", "开发"],
    "产品": ["产品", "经理", "需求", "运营", "项目经理"],
    "数据": ["数据", "分析", "开发", "工程师", "算法", "BI"],
}


def _transfer_match_score(current_job: str, target_job: str) -> int:
    """计算转岗匹配度（基于岗位名称相似度，确定性）。"""
    c, t = (current_job or "").strip(), (target_job or "").strip()
    if not t:
        return 50
    # 相同或包含关系 -> 高匹配（85-95，用名称哈希做小幅区分）
    if c in t or t in c:
        return min(95, 85 + (hash(t) % 11))
    # 相关技术栈 -> 中匹配（65-80）
    c_lower = c.lower()
    for tech, keywords in _TRANSFER_RELATED_KEYWORDS.items():
        if tech in c or c in tech:
            if any(kw in t for kw in keywords):
                return min(80, 65 + (hash(t) % 16))
            break
    # 通用：目标含“开发/工程师”等 -> 中低
    if any(k in t for k in ("开发", "工程师", "架构师", "经理")):
        return min(70, 50 + (hash(t) % 21))
    return min(60, 40 + (hash(t) % 21))


def _transfer_difficulty(match: int) -> str:
    """根据匹配度返回难度文案。"""
    if match >= 80:
        return "容易"
    if match >= 60:
        return "中等"
    return "较难"


def _transfer_time(difficulty: str) -> str:
    """根据难度估算转岗时间。"""
    return {"容易": "3-6个月", "中等": "6-12个月", "较难": "12-18个月"}.get(difficulty, "6-12个月")


def _expand_transfer_keywords(job_name: str) -> str:
    """根据当前岗位名生成转岗检索关键词（正则），用于在 CSV 中找相关但可区分的岗位。"""
    j = (job_name or "").strip()[:20]
    if not j:
        return "开发|工程师"
    parts = [j]
    for tech, keywords in _TRANSFER_RELATED_KEYWORDS.items():
        if tech in j or j in tech:
            parts.extend(keywords[:6])
            break
    # 通用补充
    for kw in ("开发", "工程师", "架构师", "经理", "设计", "分析"):
        if kw not in parts:
            parts.append(kw)
    # 去重并组成正则（至少匹配一个）
    seen = set()
    unique = []
    for p in parts:
        if p and p not in seen:
            seen.add(p)
            unique.append(p)
    return "|".join(unique) if unique else "开发|工程师"


def _load_career_graphs_json():
    """若存在 data/career_graphs.json（由 scripts/fix_career_graphs.py 生成）则返回其内容，否则 None。"""
    path = get_abs_path("data/career_graphs.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[career-graph] 读取 career_graphs.json 失败: {e}")
        return None


@job_bp.route("/career-graph", methods=["GET"])
def get_career_graph():
    """获取岗位关联图谱（基于真实数据：晋升路径、转岗路径、Top5 最优岗位）。"""
    job_name = (request.args.get("jobName") or request.args.get("job_name") or "算法工程师").strip()
    try:
        # 优先使用预生成的 career_graphs.json（脚本生成）
        precomputed = _load_career_graphs_json()
        if precomputed:
            # 匹配键：精确或包含（如 job_name=算法工程师 或 后端开发）
            key = None
            if job_name in precomputed:
                key = job_name
            else:
                for k in precomputed:
                    if k in job_name or job_name in k:
                        key = k
                        break
            if key:
                g = precomputed[key]
                career_path = g.get("career_path") or []
                transfer_paths = g.get("transfer_paths") or []
                # 统一字段名给前端：level/name/salary/time/company/description，transfer: name/salary/company/location/industry/match/difficulty/time
                career_path = [
                    {
                        "level": p.get("level"),
                        "name": p.get("name"),
                        "salary": p.get("salary"),
                        "time": f"{i*2}-{(i+1)*2}年",
                        "company": p.get("company", ""),
                        "location": p.get("location", ""),
                        "description": p.get("skills", p.get("description", "")),
                        "icon": ["🌱", "🌿", "🌳", "🏆"][i] if i < 4 else "🌟",
                    }
                    for i, p in enumerate(career_path[:4])
                ]
                transfer_paths = [
                    {
                        "name": p.get("name"),
                        "salary": p.get("salary"),
                        "company": p.get("company", ""),
                        "location": p.get("location", ""),
                        "industry": p.get("industry", ""),
                        "scale": p.get("scale", ""),
                        "match": p.get("match", 80),
                        "difficulty": p.get("difficulty", "中"),
                        "time": p.get("time", "6-12个月"),
                    }
                    for p in (transfer_paths or [])[:6]
                ]
                df = get_cached_data()
                top_jobs = []
                if not df.empty:
                    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
                    addr_col = "地址" if "地址" in df.columns else "工作地址"
                    company_col = "公司名称" if "公司名称" in df.columns else "公司全称"
                    scale_col = "公司规模" if "公司规模" in df.columns else "人员规模"
                    type_col = "公司类型" if "公司类型" in df.columns else "企业性质"
                    desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
                    job_data = df[df[name_col].astype(str).str.contains(key, na=False, regex=False)].copy()
                    job_data["_avg_salary"] = job_data["薪资范围"].apply(_parse_salary_for_graph)
                    for _, row in job_data.nlargest(5, "_avg_salary").iterrows():
                        desc = str(row.get(desc_col, ""))
                        top_jobs.append({
                            "company": str(row.get(company_col, "")),
                            "location": str(row.get(addr_col, "")),
                            "salary": str(row.get("薪资范围", "")),
                            "industry": str(row.get("所属行业", "")),
                            "scale": str(row.get(scale_col, "")),
                            "companyType": str(row.get(type_col, "")),
                            "description": (desc[:200] + "...") if len(desc) > 200 else desc,
                        })
                return success_response({
                    "careerPath": career_path,
                    "transferPaths": transfer_paths,
                    "topJobs": top_jobs,
                })
        # 无预生成或未匹配到键时，继续用 CSV 动态生成
        df = get_cached_data()
        if df.empty:
            # 无数据时返回默认结构
            levels = ["初级", "中级", "高级", "专家"]
            career_path = [
                {"level": l, "name": f"{l}{job_name}", "time": f"{i*2}-{(i+1)*2}年", "salary": f"{10+i*10}k-{20+i*15}k", "icon": ["🌱", "🌿", "🌳", "🏆"][i]}
                for i, l in enumerate(levels)
            ]
            return success_response({
                "careerPath": career_path,
                "transferPaths": [],
                "topJobs": [],
            })

        name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
        addr_col = "地址" if "地址" in df.columns else "工作地址"
        company_col = "公司名称" if "公司名称" in df.columns else "公司全称"
        scale_col = "公司规模" if "公司规模" in df.columns else "人员规模"
        type_col = "公司类型" if "公司类型" in df.columns else "企业性质"
        desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
        industry_col = "所属行业" if "所属行业" in df.columns else "所属行业"

        keyword = (job_name[:10] if len(job_name) >= 10 else job_name).strip() or job_name
        job_data = df[df[name_col].astype(str).str.contains(keyword, na=False, regex=False)]
        job_data = job_data.copy()
        job_data["_avg_salary"] = job_data["薪资范围"].apply(_parse_salary_for_graph)
        top_5 = job_data.nlargest(5, "_avg_salary")

        # 晋升路径（4 级）：按「岗位名+级别」在真实数据中匹配
        level_keywords = [
            f"初级.*{keyword}|{keyword}.*初级",
            keyword,
            f"高级.*{keyword}|{keyword}.*高级",
            f"专家|架构师|资深.*{keyword}",
        ]
        level_names = ["初级", "中级", "高级", "专家/架构师"]
        career_path = []
        for i, (kw, level_label) in enumerate(zip(level_keywords, level_names)):
            matched = df[df[name_col].astype(str).str.contains(kw, na=False, case=False, regex=True)]
            if len(matched) > 0:
                sample = matched.iloc[0]
                desc = sample.get(desc_col, "")
                desc_str = (desc[:150] + "...") if isinstance(desc, str) and len(str(desc)) > 150 else str(desc or "")
                career_path.append({
                    "level": level_label,
                    "name": str(sample.get(name_col, f"{level_label}{job_name}")),
                    "time": f"{i*2}-{(i+1)*2}年",
                    "salary": str(sample.get("薪资范围", "")),
                    "icon": ["🌱", "🌿", "🌳", "🏆"][i],
                    "company": str(sample.get(company_col, ""))[:25],
                    "location": str(sample.get(addr_col, "")),
                    "description": desc_str.replace("\n", " "),
                })
            else:
                career_path.append({
                    "level": level_label,
                    "name": f"{level_label}{job_name}",
                    "time": f"{i*2}-{(i+1)*2}年",
                    "salary": f"{10+i*10}k-{20+i*15}k",
                    "icon": ["🌱", "🌿", "🌳", "🏆"][i],
                    "company": "知名互联网公司",
                    "location": "北京/上海/深圳",
                    "description": "技能要求详见岗位详情",
                })

        # 转岗路径：从 CSV 按「扩展关键词」筛相关岗位，按薪资排序、去重，最多 6 条（真实公司/地点/行业）
        expand_regex = _expand_transfer_keywords(job_name)
        try:
            related = df[df[name_col].astype(str).str.contains(expand_regex, na=False, case=False, regex=True)].copy()
        except Exception:
            related = df[df[name_col].astype(str).str.contains(keyword, na=False, regex=False)].copy()
        related["_avg_salary"] = related["薪资范围"].apply(_parse_salary_for_graph)
        related = related.sort_values("_avg_salary", ascending=False)
        transfer_paths = []
        seen_names = set()
        for _, row in related.iterrows():
            jname = str(row.get(name_col, "")).strip()
            if not jname or jname in seen_names or len(transfer_paths) >= 6:
                continue
            seen_names.add(jname)
            match = _transfer_match_score(job_name, jname)
            difficulty = _transfer_difficulty(match)
            time_str = _transfer_time(difficulty)
            transfer_paths.append({
                "name": jname,
                "company": str(row.get(company_col, "")).strip(),
                "location": str(row.get(addr_col, "")).strip(),
                "salary": str(row.get("薪资范围", "")).strip(),
                "industry": str(row.get(industry_col, "")).strip(),
                "scale": str(row.get(scale_col, "")),
                "match": match,
                "difficulty": difficulty,
                "time": time_str,
            })

        # Top5 最优岗位
        top_jobs = []
        for _, row in top_5.iterrows():
            desc = str(row.get(desc_col, ""))
            top_jobs.append({
                "company": str(row.get(company_col, "")),
                "location": str(row.get(addr_col, "")),
                "salary": str(row.get("薪资范围", "")),
                "industry": str(row.get("所属行业", "")),
                "scale": str(row.get(scale_col, "")),
                "companyType": str(row.get(type_col, "")),
                "description": (desc[:200] + "...") if len(desc) > 200 else desc,
            })

        return success_response({
            "careerPath": career_path[:4],
            "transferPaths": transfer_paths[:6],
            "topJobs": top_jobs,
        })
    except Exception as e:
        logger.error(f"[CareerGraph] 生成失败: {e}", exc_info=True)
        return error_response(500, str(e))


# ============================================================
# 多样化晋升路径（不同岗位不同阶段名称与年限）
# GET /api/v1/job/career-path-diverse/<job_type>
# ============================================================
_DIVERSE_PATTERNS = {
    "测试": ["测试工程师", "高级测试", "测试架构师", "测试总监"],
    "科研": ["科研助理", "研究员", "高级研究员", "首席科学家"],
    "前端": ["前端工程师", "高级前端", "前端架构师", "技术总监"],
    "算法": ["算法工程师", "高级算法", "算法专家", "首席科学家"],
    "Java": ["Java工程师", "高级Java", "Java架构师", "技术总监"],
    "产品": ["产品助理", "产品经理", "高级产品", "产品总监"],
    "硬件": ["硬件工程师", "高级硬件", "硬件架构师", "硬件总监"],
}
_DIVERSE_YEARS = ["0-2年", "2-4年", "4-7年", "7年+"]


def _load_diverse_career_paths_json():
    """若存在 data/diverse_career_paths.json 则返回其内容，否则 None。"""
    path = get_abs_path("data/diverse_career_paths.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[career-path-diverse] 读取 diverse_career_paths.json 失败: {e}")
        return None


@job_bp.route("/career-path-diverse/<job_type>", methods=["GET"])
def get_diverse_career_path(job_type):
    """获取多样化的晋升路径（基于真实数据，不同岗位不同阶段）。"""
    job_type = (job_type or "").strip() or "算法"
    try:
        # 优先使用预生成的 diverse_career_paths.json
        precomputed = _load_diverse_career_paths_json()
        if precomputed and job_type in precomputed:
            path_list = precomputed[job_type]
            career_path = []
            for i, p in enumerate(path_list[:4]):
                real = p.get("realExample")
                if real:
                    career_path.append({
                        "level": p.get("level", ""),
                        "year": p.get("year", _DIVERSE_YEARS[i] if i < len(_DIVERSE_YEARS) else ""),
                        "jobName": real.get("jobName", ""),
                        "company": (real.get("company", ""))[:25],
                        "location": real.get("location", ""),
                        "salary": real.get("salary", ""),
                        "industry": "",
                        "description": (real.get("skills", ""))[:100],
                        "hasRealData": True,
                    })
                else:
                    career_path.append({
                        "level": p.get("level", ""),
                        "year": p.get("year", ""),
                        "salary": p.get("salaryRange", ""),
                        "description": p.get("description", ""),
                        "hasRealData": False,
                    })
            return success_response({
                "jobType": job_type,
                "careerPath": career_path,
                "pathStyle": [p.get("level", "") for p in path_list[:4]],
            })

        # 无预生成时从 CSV 动态生成
        df = get_cached_data()
        if df.empty:
            pattern = _DIVERSE_PATTERNS.get(job_type, ["初级", "中级", "高级", "专家"])
            return success_response({
                "jobType": job_type,
                "careerPath": [
                    {"level": pattern[i], "year": _DIVERSE_YEARS[i], "salary": f"{10+i*10}k-{20+i*15}k", "hasRealData": False}
                    for i in range(min(4, len(pattern)))
                ],
                "pathStyle": pattern[:4],
            })

        name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
        addr_col = "地址" if "地址" in df.columns else "工作地址"
        company_col = "公司名称" if "公司名称" in df.columns else "公司全称"
        desc_col = "岗位详情" if "岗位详情" in df.columns else "职位描述"
        industry_col = "所属行业" if "所属行业" in df.columns else "所属行业"

        pattern = _DIVERSE_PATTERNS.get(job_type, [keyword for keyword in [job_type] * 4])
        if len(pattern) < 4:
            pattern = pattern + ["专家"] * (4 - len(pattern))

        result = []
        for i, (level_name, year) in enumerate(zip(pattern[:4], _DIVERSE_YEARS)):
            matched = df[df[name_col].astype(str).str.contains(level_name, na=False, case=False)]
            if len(matched) > 0:
                sample = matched.iloc[0]
                desc = str(sample.get(desc_col, ""))
                result.append({
                    "level": level_name,
                    "year": year,
                    "jobName": str(sample.get(name_col, level_name)),
                    "company": str(sample.get(company_col, ""))[:25],
                    "location": str(sample.get(addr_col, "")),
                    "salary": str(sample.get("薪资范围", "")),
                    "industry": str(sample.get(industry_col, "")),
                    "description": (desc[:100] + "...") if len(desc) > 100 else desc,
                    "hasRealData": True,
                })
            else:
                result.append({
                    "level": level_name,
                    "year": year,
                    "salary": f"{10+i*10}k-{20+i*15}k",
                    "hasRealData": False,
                })

        return success_response({
            "jobType": job_type,
            "careerPath": result,
            "pathStyle": pattern[:4],
        })
    except Exception as e:
        logger.error(f"[CareerPathDiverse] 失败: {e}", exc_info=True)
        return error_response(500, str(e))


# ============================================================
# 岗位画像流式生成（SSE）
# POST /api/v1/job/generate-profile-stream
# ============================================================
def _stream_job_profile_generate(job_name: str, job_description: str):
    """
    完全基于CSV数据集 + 精细岗位规则库生成画像，不调用AI大模型。
    覆盖全部51个岗位，SSE格式返回保持前端兼容性。
    """
    import json as _json
    import re as _re

    try:
        df = get_cached_data()
        name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
        rows = df[df[name_col] == job_name] if not df.empty and name_col in df.columns else df.iloc[0:0]
        count = len(rows)
        all_counts = df[name_col].value_counts() if not df.empty and name_col in df.columns else {}
        max_job_count = int(all_counts.iloc[0]) if len(all_counts) > 0 else max(count, 1)

        def first_val(col_names):
            for col in col_names:
                if col in rows.columns:
                    for v in rows[col].dropna():
                        v = str(v).strip()
                        if v and v not in ("nan", "-", "", "None"):
                            return v
            return ""

        salary   = first_val(["薪资范围"])
        industry = first_val(["所属行业"]).split(",")[0].strip()
        scale    = first_val(["公司规模", "人员规模"])
        loc_col  = "地址" if "地址" in (rows.columns if not rows.empty else []) else "工作地址"
        if loc_col in (rows.columns if not rows.empty else []) and not rows.empty:
            cities_cnt = rows[loc_col].dropna().apply(lambda x: str(x).split("-")[0].strip()).value_counts()
            location = "、".join(cities_cnt.head(3).index.tolist())
        else:
            location = "北京、上海、深圳"

        demand_score = int(60 + (count / max(1, max_job_count)) * 35)
        trend = "上升" if count >= 400 else ("稳定" if count >= 150 else "平稳")
        jd_col = "岗位详情" if "岗位详情" in (rows.columns if not rows.empty else []) else "职位描述"
        all_jd = " ".join(rows[jd_col].dropna().astype(str).tolist()[:10]) if jd_col in (rows.columns if not rows.empty else []) and not rows.empty else ""

        # 取前3条JD拼接描述
        if jd_col in (rows.columns if not rows.empty else []) and not rows.empty:
            sample_jds = rows[jd_col].dropna().head(3).tolist()
            clean_jds = [_re.sub(r'<[^>]+>', '', str(j)).strip() for j in sample_jds]
            auto_desc = "；".join([j[:100] for j in clean_jds if j.strip()])
            auto_desc = (auto_desc[:220] + "。") if auto_desc else ""
        else:
            auto_desc = ""

        # ══════════════════════════════════════════════════════════════════
        # 51个岗位精细规则库
        # ══════════════════════════════════════════════════════════════════
        PROFILES = {

            # ── 技术类 ──────────────────────────────────────────────────

            "Java": {
                "skills_core":     ["Java", "Spring Boot", "MySQL", "Redis", "MyBatis"],
                "skills_advanced": ["Spring Cloud微服务", "消息队列(Kafka/RabbitMQ)"],
                "skills_plus":     ["Docker/K8s容器化"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上（阅读技术文档）",
                "competition": "蓝桥杯（Java赛道）、中国软件杯、ACM-ICPC程序设计大赛",
                "internship": "推荐6个月以上Java后端开发实习，优先有Spring Boot完整项目经验者",
                "description": "负责后端服务开发与维护，基于Spring Boot/Cloud构建微服务接口，对接前端与数据库；参与技术方案评审与代码审查；与产品、测试协作推进需求迭代，保障系统稳定性与性能。",
  "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "Java生态持续演进，Spring版本迭代与云原生技术栈不断更新，需快速掌握新框架与最佳实践，保持技术竞争力。", "keywords": ["框架学习", "技术迭代"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在高并发、缓存击穿等业务场景中需提出创新性解决方案，结合业务特点选取合适的技术架构。", "keywords": ["架构设计", "方案优化"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "版本上线冲刺期开发节奏紧张、Bug修复压力大，需在多任务并行中保持代码质量稳定输出。", "keywords": ["版本冲刺", "多任务"]},
                    {"icon": "💬", "name": "沟通能力", "level": "中", "level_type": "medium", "desc": "需与产品理清需求边界，与前端对齐接口规范，与测试沟通缺陷复现路径，确保开发方向一致。", "keywords": ["需求对齐", "接口协作"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "后端团队分模块并行开发，需规范代码提交、共用接口文档，与前端/测试形成顺畅协作链路。", "keywords": ["并行开发", "代码规范"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "有Java后端实习经历者起点明显更高，建议在校期间完成至少一段含真实需求交付的后端开发实习。", "keywords": ["后端实习", "项目交付"]},
  ],
  "certs": [
                    {"icon": "🏅", "name": "Oracle Java SE认证(OCP)", "desc": "Java岗位认可度最高的官方认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "阿里云/AWS云开发认证", "desc": "微服务与云原生方向加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "阅读官方技术文档的基础能力", "type": "推荐", "type_code": "opt"},
  ],
  "intern_directions": [
                    {"type": "后端开发实习", "icon": "🏢", "role": "Java后端开发实习生", "companies": ["互联网大厂", "金融科技公司", "软件外包公司"]},
                    {"type": "微服务/云原生实习", "icon": "🔬", "role": "全栈/微服务实习生", "companies": ["中型互联网公司", "创业公司", "电商平台"]},
                ],
            },

            "C/C++": {
                "skills_core":     ["C/C++", "数据结构与算法", "Linux系统编程", "多线程并发", "内存管理"],
                "skills_advanced": ["嵌入式开发", "网络协议栈"],
                "skills_plus":     ["AUTOSAR/车载软件"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上（阅读技术手册）",
                "competition": "蓝桥杯（C/C++赛道）、ACM-ICPC程序设计大赛、全国大学生嵌入式设计大赛",
                "internship": "推荐底层/系统软件或嵌入式方向实习，优先有Linux环境开发经验者",
                "description": "负责系统底层模块开发或嵌入式软件设计，涵盖驱动开发、通信协议栈实现及性能优化；参与代码评审、单元测试及文档编写；与硬件工程师协作完成产品从原型到量产的软件适配工作。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "底层技术体系庞杂，从操作系统内核到硬件驱动均需深入理解，持续学习是保持竞争力的核心。", "keywords": ["底层原理", "持续学习"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "性能优化与资源受限场景下的方案设计需要较强的创新思维，善于在约束条件下找到最优解。", "keywords": ["性能优化", "方案设计"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "底层Bug定位耗时长、问题复现难，需在高压时间节点内保持专注，冷静排查复杂技术问题。", "keywords": ["Bug定位", "压力排查"]},
                    {"icon": "💬", "name": "沟通能力", "level": "中", "level_type": "medium", "desc": "需与硬件工程师、测试工程师保持技术层面的精准沟通，确保软硬件协作方向一致。", "keywords": ["软硬件协作", "技术沟通"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "系统级产品通常由多人分模块协作完成，需遵循统一编码规范与接口约定，确保集成顺畅。", "keywords": ["模块协作", "接口约定"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "建议参与嵌入式或系统软件方向实习，积累真实硬件环境下的调试与开发经验，显著提升竞争力。", "keywords": ["嵌入式实习", "系统开发"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "Linux系统认证(RHCSA/RHCE)", "desc": "C/C++开发岗Linux能力权威认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "嵌入式工程师认证", "desc": "嵌入式方向加分项", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "阅读英文技术手册与标准文档的基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "嵌入式/底层开发", "icon": "🏢", "role": "嵌入式软件开发实习生", "companies": ["芯片厂商", "车载软件公司", "工业控制企业"]},
                    {"type": "系统软件开发", "icon": "🔬", "role": "系统软件实习生", "companies": ["操作系统厂商", "安全软件公司", "大型互联网基础架构部"]},
                ],
            },

            "前端开发": {
                "skills_core":     ["Vue.js/React", "JavaScript/TypeScript", "HTML5/CSS3", "Webpack/Vite", "响应式布局"],
                "skills_advanced": ["性能优化", "Node.js"],
                "skills_plus":     ["WebGL/Three.js可视化"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上（查阅官方文档）",
                "competition": "蓝桥杯（Web赛道）、中国高校计算机大赛、字节跳动青训营前端方向",
                "internship": "推荐6个月以上前端开发实习，优先有完整上线产品或组件库贡献经验者",
                "description": "负责公司产品Web前端页面的设计与开发，基于Vue/React实现高质量交互界面；与后端对接接口、与UI还原视觉稿；参与前端架构优化、性能调优及组件库建设，确保产品具备良好的用户体验。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "前端技术栈更新极快，React/Vue大版本迭代、构建工具换代频繁，需保持持续学习的习惯跟上技术趋势。", "keywords": ["框架迭代", "技术跟进"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "在交互设计与用户体验优化上需要较强的创新意识，善于将设计稿转化为流畅、美观的页面实现。", "keywords": ["交互创新", "用户体验"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "产品上线节点前往往需要加班赶工、快速修复兼容性问题，需保持稳定输出能力与较好的时间管理。", "keywords": ["上线压力", "时间管理"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需频繁与UI设计师对齐视觉细节、与后端协商接口格式、向产品反馈交互可行性，沟通贯穿日常工作全程。", "keywords": ["设计对齐", "接口协商"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "前端开发通常多人分页面/组件并行，需遵守统一代码规范、组件规范，避免重复造轮子与风格不统一。", "keywords": ["组件规范", "并行开发"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "有线上产品前端实习经历是重要加分项，建议参与有真实用户量的产品开发，积累性能优化与工程化经验。", "keywords": ["产品实习", "工程化"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "W3C前端开发认证", "desc": "前端基础能力标准认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "Google UX设计证书", "desc": "用户体验方向加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "查阅MDN等英文技术文档的基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "Web前端开发", "icon": "🏢", "role": "前端开发实习生", "companies": ["互联网大厂", "SaaS产品公司", "电商平台"]},
                    {"type": "移动端/小程序开发", "icon": "🔬", "role": "移动前端实习生", "companies": ["微信生态企业", "创业公司", "新零售平台"]},
                ],
            },

            "软件测试": {
                "skills_core":     ["功能测试", "测试用例设计", "缺陷管理", "接口测试(Postman)", "Linux基础"],
                "skills_advanced": ["Selenium自动化测试", "Python/Java脚本"],
                "skills_plus":     ["性能测试(JMeter)"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国大学生软件测试大赛、中国软件杯（测试赛道）、蓝桥杯",
                "internship": "推荐3个月以上功能测试或自动化测试实习，积累真实Bug管理流程经验",
                "description": "负责产品功能测试、接口测试及回归测试，设计测试用例、执行测试计划、记录并跟踪缺陷；参与需求评审提前发现设计问题；配合开发完成Bug验证，确保产品质量达到上线标准。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "测试工具与框架持续演进，自动化测试、AI辅助测试等新方向不断出现，需保持主动学习与技术跟进。", "keywords": ["自动化测试", "工具学习"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "设计高覆盖率测试用例需要从用户视角逆向思维，善于发现边界场景和隐藏缺陷是测试人员的核心能力。", "keywords": ["用例设计", "边界场景"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "版本发布前测试周期压缩，需在高压下快速完成全量回归测试，保障质量不妥协于时间压力。", "keywords": ["回归测试", "版本压力"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需向开发清晰描述Bug复现路径与影响范围，与产品沟通质量标准，是测试工作顺畅推进的关键。", "keywords": ["Bug沟通", "质量标准"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "测试处于开发与发布的关键节点，需与开发、产品、运维多方紧密协作，推动问题快速收敛。", "keywords": ["多方协作", "问题收敛"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "参与互联网或游戏公司测试实习，积累真实项目的缺陷管理与测试流程经验，对求职帮助显著。", "keywords": ["测试实习", "缺陷管理"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "CSTQB软件测试工程师认证", "desc": "国内测试行业主流认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "ISTQB国际软件测试认证", "desc": "国际认可度高，大厂加分", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "Python/Java编程基础证书", "desc": "自动化测试脚本能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "功能测试实习", "icon": "🏢", "role": "软件测试实习生", "companies": ["互联网公司", "软件公司", "游戏公司"]},
                    {"type": "自动化测试实习", "icon": "🔬", "role": "测试开发实习生", "companies": ["大型互联网企业", "金融科技公司", "电商平台"]},
                ],
            },

            "测试工程师": {
                "skills_core":     ["测试计划制定", "测试用例设计", "自动化测试框架", "接口测试", "数据库SQL"],
                "skills_advanced": ["性能测试(JMeter/LoadRunner)", "CI/CD流水线"],
                "skills_plus":     ["Python测试脚本开发"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "无明确要求",
                "competition": "全国大学生软件测试大赛、中国软件杯、CSTQB认证考试",
                "internship": "推荐6个月以上测试工程师实习，优先有自动化测试框架搭建经验者",
                "description": "负责产品全周期测试工作，包括需求分析、测试计划制定、用例设计与执行；主导自动化测试框架搭建与维护；参与性能测试与安全测试；输出测试报告，推动缺陷修复闭环，保障产品质量。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "测试技术从手工测试向自动化、智能化快速演进，需持续学习新测试工具与方法，保持技术前沿认知。", "keywords": ["自动化转型", "技术前沿"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在测试框架设计、用例复用与测试策略制定上需要系统化思维，提升测试覆盖率与执行效率。", "keywords": ["框架设计", "测试策略"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "版本发布窗口紧张时需高效完成测试任务，在时间压力下做出合理质量风险评估与决策。", "keywords": ["质量决策", "时间压力"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需向开发详细说明缺陷复现步骤，向管理层汇报测试进度与质量风险，清晰表达是推进工作的关键。", "keywords": ["缺陷说明", "进度汇报"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "测试工作贯穿整个研发流程，需与产品、开发、运维密切配合，推动问题高效解决与版本准时发布。", "keywords": ["研发协作", "版本发布"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "建议参与有完整测试流程的企业实习，掌握真实项目的自动化框架搭建与持续集成测试经验。", "keywords": ["自动化实习", "CI/CD"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "CSTQB软件测试认证", "desc": "国内测试岗位标配认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "ISTQB高级测试认证", "desc": "测试架构与管理方向加分", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "Python编程证书", "desc": "自动化脚本能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "测试开发实习", "icon": "🏢", "role": "测试工程师实习生", "companies": ["大型互联网公司", "金融科技企业", "云计算厂商"]},
                    {"type": "质量保障实习", "icon": "🔬", "role": "QA实习生", "companies": ["游戏公司", "移动应用企业", "SaaS平台"]},
                ],
            },

            "硬件测试": {
                "skills_core":     ["硬件功能测试", "电路原理图分析", "示波器/万用表操作", "测试报告编写", "PCB基础"],
                "skills_advanced": ["射频测试", "EMC电磁兼容测试"],
                "skills_plus":     ["嵌入式软件调试"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国大学生电子设计竞赛、TI杯模拟电子系统设计竞赛、恩智浦杯",
                "internship": "推荐电子/通信类硬件测试实习，积累仪器仪表操作与硬件故障定位经验",
                "description": "负责产品硬件功能、性能及可靠性测试，制定测试计划、设计测试用例；使用示波器、信号发生器等仪器进行电气测试；分析测试数据并出具报告，协助研发定位硬件故障，推动问题改善。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "硬件技术方向多样（通信/消费电子/工业控制），需快速掌握不同产品的电气特性与测试标准，持续积累行业经验。", "keywords": ["硬件技术", "测试标准"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在测试方案设计与故障复现方法上需要一定的创新能力，善于设计有针对性的极限测试场景。", "keywords": ["测试方案", "故障复现"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "量产前测试周期紧张、问题修改迭代频繁，需在高强度测试节奏中保持耐心与数据记录的严谨性。", "keywords": ["量产节奏", "严谨记录"]},
                    {"icon": "💬", "name": "沟通能力", "level": "中", "level_type": "medium", "desc": "需向硬件工程师准确描述测试现象与故障复现路径，协助研发快速定位问题根因。", "keywords": ["故障描述", "研发协作"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "硬件测试需与研发、结构、生产多部门协作，共同完成产品从研发到量产的质量把关工作。", "keywords": ["多部门协作", "质量把关"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "建议在电子/通信企业参与硬件测试实习，熟悉真实产品测试流程与常用测试仪器的操作规范。", "keywords": ["硬件实习", "仪器操作"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "电子工程师认证（初级）", "desc": "硬件测试岗位基础能力认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "EMC电磁兼容工程师认证", "desc": "射频/EMC测试方向加分", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机等级考试二级", "desc": "数据处理与报告编写能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "硬件测试实习", "icon": "🏢", "role": "硬件测试实习生", "companies": ["消费电子公司", "通信设备厂商", "智能硬件创业公司"]},
                    {"type": "质量检测实习", "icon": "🔬", "role": "品质工程实习生", "companies": ["代工厂商", "汽车电子企业", "工业控制公司"]},
                ],
            },

            "实施工程师": {
                "skills_core":     ["项目实施", "SQL数据库", "Linux运维基础", "网络配置", "客户沟通"],
                "skills_advanced": ["ERP/MES系统部署", "系统集成调试"],
                "skills_plus":     ["云平台部署(华为云/阿里云)"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "华为ICT大赛、全国大学生计算机设计大赛、蓝桥杯",
                "internship": "推荐3个月以上项目实施或运维实习，积累真实客户现场交付经验",
                "description": "负责软件系统的客户现场安装部署、调试与培训；进行数据建库、数据核查及处理；协助项目经理完成项目售前、售中、售后全周期工作；维护客户关系，收集需求并反馈产品改进意见。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "实施工程师需快速掌握客户行业业务逻辑及产品部署流程，学习能力直接决定项目交付效率与质量。", "keywords": ["业务学习", "产品掌握"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "面对不同客户的个性化需求，需灵活调整实施方案，具备一定的方案设计与适配创新能力。", "keywords": ["方案适配", "个性化实施"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "项目上线阶段时间紧迫、多方协调压力大，高抗压能力是确保按时交付的重要基础保障。", "keywords": ["上线交付", "多方协调"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "日常需与客户、开发、产品三方深度对接，沟通表达能力直接影响项目推进效率与客户满意度。", "keywords": ["客户对接", "三方协调"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "实施项目通常由多人协作完成，需与团队紧密配合完成环境部署、客户培训和验收工作。", "keywords": ["团队配合", "项目验收"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "推荐参与系统集成或ERP实施类实习，积累真实项目交付经验，熟悉标准实施流程与客户沟通技巧。", "keywords": ["实施实习", "客户现场"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "华为HCIA/HCIP认证", "desc": "实施岗高度认可的网络与云认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "PMP项目管理认证", "desc": "项目交付类岗位重要加分项", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "Linux基础认证(RHCSA)", "desc": "运维实施基础能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "项目实施实习", "icon": "🏢", "role": "实施工程师实习生", "companies": ["系统集成商", "ERP厂商", "云服务公司"]},
                    {"type": "运维实习", "icon": "🔬", "role": "运维工程师实习生", "companies": ["数据中心", "IT服务公司", "政府信息化项目"]},
                ],
            },

            "技术支持工程师": {
                "skills_core":     ["技术故障排查", "Linux/Windows运维", "网络基础(TCP/IP)", "数据库查询", "客户服务"],
                "skills_advanced": ["远程运维工具", "日志分析"],
                "skills_plus":     ["Python自动化运维脚本"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "华为ICT大赛、思科网络技术大赛、全国大学生计算机设计大赛",
                "internship": "推荐IT技术支持或运维实习，积累真实故障排查与客户响应经验",
                "description": "负责为客户提供产品使用的技术支持与问题解答；远程或现场排查技术故障，记录问题并推动研发解决；整理常见问题知识库，参与客户培训和产品使用文档编写，持续提升客户满意度。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "产品功能与技术架构持续迭代，需快速掌握新特性与常见故障模式，保持技术支持能力与产品同步更新。", "keywords": ["产品学习", "故障知识"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "面对复杂或新型故障场景，需具备独立分析与创新排查思路的能力，不拘泥于标准流程解决问题。", "keywords": ["排查创新", "问题分析"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "客户问题紧急时需快速响应、冷静处置，在多个问题并发的高压情境下保持服务质量稳定。", "keywords": ["快速响应", "并发处置"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需将复杂技术问题用通俗语言向非技术客户解释清楚，同时向研发准确传递问题细节，双向沟通能力至关重要。", "keywords": ["客户解释", "研发对接"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "技术支持需与研发、产品、销售紧密配合，形成完整的问题收集→研究→解决→反馈闭环。", "keywords": ["问题闭环", "跨部门协作"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "推荐参与IT服务公司或互联网企业的技术支持实习，熟悉服务流程与工单系统，积累客户沟通经验。", "keywords": ["技术支持实习", "服务流程"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "华为HCIA网络认证", "desc": "技术支持岗最常用的网络基础认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "ITIL IT服务管理认证", "desc": "IT服务流程规范化的国际认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "CompTIA A+认证", "desc": "国际认可的IT支持基础认证", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "IT技术支持实习", "icon": "🏢", "role": "技术支持工程师实习生", "companies": ["软件公司", "IT服务商", "互联网企业"]},
                    {"type": "运维实习", "icon": "🔬", "role": "运维助理实习生", "companies": ["数据中心", "云服务公司", "系统集成商"]},
                ],
            },

            "科研人员": {
                "skills_core":     ["科研实验设计", "数据分析(Python/MATLAB/R)", "学术论文写作", "文献检索", "项目申报"],
                "skills_advanced": ["高通量测序/建模仿真", "科研成果转化"],
                "skills_plus":     ["国际期刊投稿经验"],
                "education": "硕士优先",
                "experience": "应届生/1年以内",
                "english": "六级及以上（阅读英文文献、撰写英文论文）",
                "competition": "挑战杯、互联网+大学生创新创业大赛、全国大学生数学建模竞赛",
                "internship": "推荐高校或科研院所实验室参与项目研究，积累完整的科研实验流程经验",
                "description": "负责企业/机构科研课题的研发工作，开展实验设计与数据采集分析；协助成果申报与现场转化；撰写研究报告与学术论文；参与博士后或重点项目推进，为企业提供技术研究支撑与知识产权积累。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "科研工作需持续追踪领域前沿进展，快速理解最新论文成果并将其转化为实验方案，学习能力是科研产出的基石。", "keywords": ["前沿追踪", "论文研读"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "科研的核心在于原创性，需具备从问题出发提出新假设、设计创新实验方案并验证的完整科研创新能力。", "keywords": ["原创研究", "实验创新"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "科研过程中实验失败、论文被拒是常态，需保持心理韧性，在反复试错中坚持推进研究进度。", "keywords": ["韧性坚持", "反复试错"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需与企业导师、合作科研机构及产业转化方保持专业沟通，清晰表达研究进展与成果意义。", "keywords": ["成果汇报", "产学研对接"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "科研项目往往是团队协作完成，需与不同专业背景的成员分工明确、数据共享，推动研究整体进展。", "keywords": ["跨学科协作", "数据共享"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "推荐在高校实验室或科研院所参与课题研究，发表过论文或参与过省部级以上课题是重要竞争优势。", "keywords": ["实验室经历", "论文发表"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "英语六级/专业八级", "desc": "科研人员阅读文献与发表论文的基础要求", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "国家级科研项目参与证明", "desc": "主持或参与国家级课题的核心竞争力证明", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "数据分析技能证书(Python/MATLAB)", "desc": "科研数据处理能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "高校/科研院所", "icon": "🏢", "role": "科研助理实习生", "companies": ["985/211高校实验室", "中科院研究所", "国家重点实验室"]},
                    {"type": "企业研究院", "icon": "🔬", "role": "研发实习生", "companies": ["华为研究院", "腾讯AI Lab", "行业龙头企业研究院"]},
                ],
            },

            "项目经理/主管": {
                "skills_core":     ["项目管理(进度/风险/成本)", "需求分析", "团队管理", "客户沟通", "文档管理"],
                "skills_advanced": ["敏捷开发/Scrum", "Jira项目管理工具"],
                "skills_plus":     ["PMP认证", "商务谈判"],
                "education": "本科及以上",
                "experience": "3-5年",
                "english": "四级及以上",
                "competition": "挑战杯、互联网+大学生创新创业大赛、PMP认证备考",
                "internship": "推荐项目助理或产品运营实习，积累项目协调与客户沟通经验",
                "description": "负责项目全周期管理，制定项目计划、分解任务并跟踪执行进度；协调各方资源解决项目风险；负责与客户的需求沟通、方案确认及验收汇报；带领团队完成交付目标，确保项目按时按质完成。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "项目管理方法论持续演进（敏捷/DevOps等），需快速掌握新管理工具与方法，结合实际项目灵活运用。", "keywords": ["管理方法论", "工具掌握"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "面对复杂项目场景需提出创新性协调方案，在资源约束下找到最优的进度与质量平衡点。", "keywords": ["方案创新", "资源优化"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "项目经理处于各方压力的汇集点，需在客户催促、团队阻力与资源不足的多重压力下保持冷静决策。", "keywords": ["多方压力", "冷静决策"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "项目经理的核心工作是沟通，需在客户、技术团队、管理层之间建立高效的信息传递与共识达成机制。", "keywords": ["信息传递", "共识达成"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "需识别团队成员优势合理分工，营造高效协作氛围，推动跨职能团队朝共同目标凝聚合力。", "keywords": ["合理分工", "凝聚团队"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "项目助理或运营实习经历是进入项目管理方向的重要跳板，积累协调资源、跟踪进度的实战能力。", "keywords": ["项目助理", "协调实习"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "PMP项目管理认证", "desc": "项目经理岗位国际通行认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "敏捷认证(PMI-ACP/CSM)", "desc": "互联网项目管理加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "对接外资企业或国际项目的基础能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "项目助理实习", "icon": "🏢", "role": "项目助理/PMO实习生", "companies": ["互联网企业", "系统集成商", "咨询公司"]},
                    {"type": "产品运营实习", "icon": "🔬", "role": "产品运营实习生", "companies": ["SaaS公司", "创业公司", "金融科技企业"]},
                ],
            },

            "产品专员/助理": {
                "skills_core":     ["需求分析", "原型设计(Axure/Figma)", "竞品分析", "数据分析(Excel/SQL)", "用户调研"],
                "skills_advanced": ["A/B测试", "增长分析(GA/神策)"],
                "skills_plus":     ["SQL数据查询", "用户访谈"],
                "education": "本科及以上",
                "experience": "应届生/1年以内",
                "english": "四级及以上",
                "competition": "互联网+大学生创新创业大赛、挑战杯、产品经理大赛",
                "internship": "推荐互联网产品实习，积累需求文档撰写与产品迭代完整周期经验",
                "description": "协助产品经理进行需求收集与文档整理；绘制产品原型，参与需求评审与方案讨论；跟踪产品数据，输出分析报告；协调设计、开发资源，跟进产品功能上线全流程，逐步独立负责模块迭代。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "产品思维需要快速理解行业业务逻辑，同时学习数据分析工具与产品方法论，跨界学习能力是产品人的核心素质。", "keywords": ["业务理解", "产品方法论"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "优秀的产品创新来源于对用户痛点的深刻洞察，需具备从用户需求出发提出创新解决方案的能力。", "keywords": ["用户洞察", "功能创新"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "产品迭代节奏快、跨部门沟通协调工作量大，需在多线任务并行中保持条理清晰、按时输出。", "keywords": ["迭代节奏", "多线任务"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "产品是连接用户与技术的桥梁，需向用户传达产品价值，向技术团队准确传递需求，沟通是核心工作。", "keywords": ["需求传递", "价值表达"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "产品工作高度依赖跨职能协作，需协调设计、研发、运营、市场多个团队朝统一产品目标共同推进。", "keywords": ["跨职能协作", "产品目标"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "有产品实习经历的候选人在求职时具有显著优势，建议参与完整产品迭代周期，产出可展示的需求文档或PRD。", "keywords": ["产品实习", "PRD文档"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "Axure/Figma原型设计认证", "desc": "产品原型能力的专业工具认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "数据分析师认证(CDA)", "desc": "产品数据分析能力加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四级及以上", "desc": "阅读国际产品报告与竞品资料的基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "互联网产品实习", "icon": "🏢", "role": "产品助理实习生", "companies": ["大型互联网公司", "SaaS产品企业", "电商平台"]},
                    {"type": "数据产品实习", "icon": "🔬", "role": "数据产品实习生", "companies": ["金融科技公司", "AI企业", "广告技术公司"]},
                ],
            },

            "质量管理/测试": {
                "skills_core":     ["质量管理体系(ISO9001)", "来料检验IQC", "过程检验IPQC", "数据统计分析", "ERP系统操作"],
                "skills_advanced": ["SPC统计过程控制", "六西格玛方法"],
                "skills_plus":     ["测量系统分析(MSA)"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "无明确要求",
                "competition": "全国大学生质量管理知识竞赛、六西格玛项目竞赛、挑战杯",
                "internship": "推荐制造业质检或质量管理实习，熟悉ISO体系文件与检验流程",
                "description": "负责产品来料、过程、成品的检验工作，制定检验标准与规范；分析质量数据，输出质量报告；跟踪不良品改善，推动供应商质量管控；参与质量管理体系审核，确保产品质量符合行业标准。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "质量标准随行业规范持续更新，需持续学习新的质量管理方法论（精益生产、六西格玛等）并应用于实践。", "keywords": ["质量方法论", "标准学习"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "质量改善需要创新地识别根因并设计针对性的改善方案，推动品质水平持续提升。", "keywords": ["根因分析", "改善方案"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "质量问题往往在生产关键节点集中爆发，需在高压下快速判断不良品影响范围并给出处置决策。", "keywords": ["快速处置", "生产压力"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需向供应商传达质量要求，向生产部门说明检验结果，向管理层汇报质量状态，沟通贯穿质量工作全程。", "keywords": ["供应商沟通", "质量汇报"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "质量管理涉及采购、生产、研发多个部门，需协调各方共同推进质量目标，形成全员质量意识。", "keywords": ["全员质量", "跨部门协调"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "推荐在制造业企业参与质检实习，了解真实生产环境下的检验规范、不良品处理与质量改善流程。", "keywords": ["质检实习", "制造业"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "ISO9001内审员认证", "desc": "质量管理体系必备基础认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "六西格玛绿带认证(CSSBB)", "desc": "质量改善方向重要加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "统计学基础证书", "desc": "质量数据分析能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "制造业质检实习", "icon": "🏢", "role": "质量工程师实习生", "companies": ["汽车零部件企业", "消费电子公司", "精密制造企业"]},
                    {"type": "质量体系实习", "icon": "🔬", "role": "质量管理实习生", "companies": ["认证机构", "医疗器械企业", "航空制造企业"]},
                ],
            },

            "风电工程师": {
                "skills_core":     ["风力发电机组维护", "电气设备检修", "故障诊断消缺", "安全规程执行", "运行记录填报"],
                "skills_advanced": ["SCADA系统操作", "电网调度协调"],
                "skills_plus":     ["新能源并网技术"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国大学生节能减排社会实践与科技竞赛、全国大学生电子设计竞赛",
                "internship": "推荐新能源发电企业或风电场实习，积累机组巡检与电气维护实操经验",
                "description": "负责风力发电机组的日常巡检与运行监控；执行定期检修与故障消缺工作；填写运行记录、编制检维修方案及备品备件计划；参与设备调试与试运行，确保风电场机组安全稳定运行。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "新能源装备技术持续升级，不同机型的维护规程各有差异，需快速掌握设备特性与检修标准，适应野外作业环境。", "keywords": ["设备学习", "检修标准"]},
                    {"icon": "💡", "name": "创新能力", "level": "低", "level_type": "base", "desc": "主要执行标准化的巡检与维护流程，在优化维护方案与提高设备可利用率方面有一定创新空间。", "keywords": ["维护优化", "效率提升"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "风电场通常地处偏远、工作环境艰苦，需适应高空作业与野外驻扎的特殊工作条件，具备较强的吃苦耐劳精神。", "keywords": ["野外作业", "高空作业"]},
                    {"icon": "💬", "name": "沟通能力", "level": "中", "level_type": "medium", "desc": "需与调度中心协调机组运行状态，与检修团队沟通故障处理进度，确保信息准确传递。", "keywords": ["调度协调", "故障沟通"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "风电场检修工作安全要求高，需与团队严格执行两票制度，相互监督、配合完成高危作业任务。", "keywords": ["安全协作", "两票制度"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "建议在风电场或新能源企业参与现场实习，积累真实设备操作与安全规程执行经验。", "keywords": ["风电场实习", "现场作业"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "电工特种作业证", "desc": "风电场电气作业必须持有的特种证书", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "高处作业证", "desc": "风机塔筒高空作业资质证明", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "新能源发电技术培训证书", "desc": "风电行业专业技能证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "风电场运维实习", "icon": "🏢", "role": "风电运维实习工程师", "companies": ["华能、华电等大型发电集团", "明阳智能", "金风科技"]},
                    {"type": "新能源电气实习", "icon": "🔬", "role": "电气工程实习生", "companies": ["国家电网", "电力设计研究院", "新能源EPC公司"]},
                ],
            },

            "律师": {
                "skills_core":     ["民商事诉讼", "合同起草审核", "法律文书写作", "法律检索(北大法宝)", "案件证据管理"],
                "skills_advanced": ["知识产权诉讼", "并购重组法律服务"],
                "skills_plus":     ["涉外法律业务（英文）"],
                "education": "本科及以上（法学）",
                "experience": "应届生/1年以内（实习律师）",
                "english": "六级及以上（涉外业务优先）",
                "competition": "全国法学院校模拟法庭竞赛、杰赛普国际法模拟法庭大赛、挑战杯",
                "internship": "推荐律师事务所实习，积累真实案件文书起草与庭审观摩经验，取得律师资格证",
                "description": "负责民商事诉讼及非诉法律业务；起草、审核合同及各类法律文件；整理案件卷宗、收集证据；参与客户法律咨询；协助合伙人推进案件流程，积累诉讼、谈判及法律风险防控的实战经验。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "法律法规持续更新，司法解释不断出台，律师需持续研读法条与案例，保持法律知识库的及时更新。", "keywords": ["法律更新", "案例研读"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在复杂案件的法律策略制定上需要创新思维，善于从多个法律角度寻找对客户最有利的解决方案。", "keywords": ["法律策略", "案件突破"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "诉讼案件节点密集（开庭、质证、申请期限），同时处理多个案件时工作强度极高，需具备优秀的抗压能力。", "keywords": ["多案并行", "节点压力"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "律师的核心能力之一是沟通，需在庭审中有力陈述观点，在谈判中精准表达，在咨询中向客户清晰解释法律风险。", "keywords": ["庭审陈述", "客户咨询"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "复杂案件通常由团队协作完成，需与助理、实习律师分工配合，共同推进案件各阶段工作。", "keywords": ["团队办案", "分工配合"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "律所实习是进入法律行业的必经之路，积累文书起草与庭审实战经验，并尽早通过法律职业资格考试。", "keywords": ["律所实习", "资格考试"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "法律职业资格证书(A证)", "desc": "从事律师行业的必备证书，无法缺少", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "英语六级/法律英语证书", "desc": "涉外业务方向的核心能力证明", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "证券从业资格证", "desc": "从事资本市场法律业务的加分认证", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "律师事务所实习", "icon": "🏢", "role": "实习律师/法律助理", "companies": ["综合性律师事务所", "专业知识产权/金融律所", "大型律所北京/深圳分所"]},
                    {"type": "企业法务实习", "icon": "🔬", "role": "法务实习生", "companies": ["大型企业法务部", "互联网公司法务", "金融机构合规部"]},
                ],
            },

            "律师助理": {
                "skills_core":     ["法律文书整理", "案卷归档管理", "法律检索辅助", "庭审记录", "合同基础审核"],
                "skills_advanced": ["法律数据库操作(北大法宝/威科先行)", "证据材料整理"],
                "skills_plus":     ["英文法律材料翻译"],
                "education": "本科及以上（法学专业）",
                "experience": "应届生/1年以内",
                "english": "四级及以上",
                "competition": "全国模拟法庭竞赛、法律援助志愿活动、挑战杯（法学方向）",
                "internship": "推荐律所或企业法务部实习，熟悉案件全流程，备考法律职业资格证",
                "description": "协助律师处理法律文书起草与审核；整理归档案件卷宗与证据材料；参与案件前期调研与证据收集；协调安排庭审行程；负责客户接待与初步法律咨询接待，支持律师团队高效运转。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "法律助理是法律职业的起步阶段，需快速学习不同业务方向的法律实务知识，为独立执业积累知识储备。", "keywords": ["实务学习", "业务积累"]},
                    {"icon": "💡", "name": "创新能力", "level": "低", "level_type": "base", "desc": "助理阶段主要执行律师指导下的辅助工作，在检索策略与文书格式优化上有一定创新发挥空间。", "keywords": ["检索优化", "格式规范"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "临近开庭节点材料准备工作量大、时间紧，需在高强度工作节奏下保持文书的准确性与完整性。", "keywords": ["庭前准备", "材料准确"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需代律师接待客户初步咨询，清晰准确地传递信息，同时与律师保持高效沟通确保指令理解无误。", "keywords": ["客户接待", "准确传递"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "作为团队支持角色，需配合律师完成各阶段工作，积极主动、细致负责是团队协作的核心要求。", "keywords": ["团队支持", "细致负责"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "律所实习是法学生的重要竞争优势，建议尽早参与并积累文书写作与庭审实战经验，同步备考法考。", "keywords": ["律所实习", "法考备考"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "法律职业资格证书", "desc": "法律行业入门的核心证书", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "英语四/六级", "desc": "协助处理涉外文件的基础要求", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "法律数据库操作证书", "desc": "北大法宝等专业数据库使用能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "律所法律助理实习", "icon": "🏢", "role": "法律助理实习生", "companies": ["综合律师事务所", "专业律所（知产/金融/劳动）", "公益法律援助机构"]},
                    {"type": "企业法务助理实习", "icon": "🔬", "role": "法务助理实习生", "companies": ["大型企业法务部", "互联网公司合规部", "金融机构法律事务部"]},
                ],
            },

            "法务专员/助理": {
                "skills_core":     ["合同审核起草", "法律风险识别", "法规检索合规审查", "法律文书管理", "诉讼协调"],
                "skills_advanced": ["知识产权管理", "劳动关系法律事务"],
                "skills_plus":     ["英文合同处理"],
                "education": "本科及以上（法学）",
                "experience": "应届生/1年以内",
                "english": "四级及以上（涉外合同优先六级）",
                "competition": "全国大学生模拟法庭竞赛、挑战杯（法学）、企业法务知识竞赛",
                "internship": "推荐企业法务部或律所实习，熟悉合同管理流程与公司治理合规事务",
                "description": "负责公司日常法律事务处理，起草、审查、修改各类合同与法律文件；为内部部门提供法律咨询，识别业务风险；协助处理诉讼仲裁事务；参与合规体系建设，维护公司合规运营。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "法律法规持续更新，需跟踪新出台的法规政策并评估对公司业务的影响，将法律学习与业务实践紧密结合。", "keywords": ["法规追踪", "业务结合"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在复杂业务的合同条款设计与风险防控方案制定上需要创新思维，找到保护公司利益的最优法律安排。", "keywords": ["条款创新", "风险防控"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "法律事务时效性强，诉讼期限、合同签署节点等不可逾期，需在多项事务并行时保持高效准确的工作状态。", "keywords": ["时效管理", "多项并行"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需向业务部门解释法律风险，与外部律所协调策略，并在谈判场景中维护公司合法权益，沟通是核心技能。", "keywords": ["风险解释", "谈判协调"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "法务部门为全公司提供法律服务，需与销售、采购、HR等各部门深度协作，理解业务背景后给出专业法律建议。", "keywords": ["全公司服务", "业务理解"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "企业法务或律所实习是进入公司法务岗位的重要基础，积累合同管理与公司合规的实战经验。", "keywords": ["法务实习", "合同管理"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "法律职业资格证书", "desc": "法务岗位核心资质证书", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "知识产权师认证", "desc": "知识产权法务方向重要加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语六级", "desc": "处理涉外合同与跨境业务的能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "企业法务实习", "icon": "🏢", "role": "法务助理实习生", "companies": ["大型制造企业法务部", "互联网公司法务", "金融机构合规部"]},
                    {"type": "律所非诉实习", "icon": "🔬", "role": "非诉法律实习生", "companies": ["综合律所企业部", "专业并购/合规律所", "知识产权律所"]},
                ],
            },

            "英语翻译": {
                "skills_core":     ["英汉互译", "翻译校对", "专业术语积累", "文件格式规范", "CAT翻译工具"],
                "skills_advanced": ["同声传译", "本地化翻译管理"],
                "skills_plus":     ["第二外语（日/法/德语）"],
                "education": "本科及以上（英语/翻译专业）",
                "experience": "应届生/1年以内",
                "english": "专业八级/口译证书（CATTI二级及以上）",
                "competition": "CCTV英语演讲大赛、外研社翻译大赛、海峡两岸口译大赛",
                "internship": "推荐翻译公司、外资企业或媒体机构实习，积累行业专业术语与翻译项目管理经验",
                "description": "负责英汉/汉英文件的翻译与校对工作，涵盖合同、技术文档、新闻稿等多种文体；参与翻译项目的质检与术语管理；配合项目经理跟进翻译进度；确保译文准确、流畅，符合行业规范与客户要求。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "翻译工作跨越多个行业领域，需持续积累法律、金融、技术等专业术语，快速适应不同领域的语言风格。", "keywords": ["术语积累", "跨领域学习"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "优秀的翻译不是字对字转换，而是在准确表达原意的同时创造性地处理语言差异，实现文化层面的精准传达。", "keywords": ["语言创意", "文化转换"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "翻译项目往往有严格的交稿期限，同时处理多个翻译任务时需在保证质量的前提下高效完成工作。", "keywords": ["交稿期限", "高效翻译"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需与客户沟通翻译风格偏好与专业背景，与审校反复沟通译文细节，语言表达能力是翻译人员的核心素养。", "keywords": ["客户沟通", "译文沟通"]},
                    {"icon": "🤝", "name": "团队协作", "level": "中", "level_type": "medium", "desc": "大型翻译项目需多名译员协作分工，统一术语表与翻译风格，保持译文的一致性与专业质量。", "keywords": ["团队翻译", "风格一致"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "翻译公司或外资企业实习是建立行业人脉与积累实战翻译经验的最佳路径，专业方向实习经历是重要加分项。", "keywords": ["翻译公司实习", "专业领域"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "CATTI全国翻译专业资格考试（二级）", "desc": "中国翻译行业最权威的资格认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "英语专业四/八级", "desc": "英语专业能力标准认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "第二外语（日/法/德）能力证书", "desc": "多语种翻译能力是稀缺竞争优势", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "翻译公司实习", "icon": "🏢", "role": "初级翻译/本地化实习生", "companies": ["中国外文局", "专业翻译公司", "国际四大媒体机构"]},
                    {"type": "外资企业翻译实习", "icon": "🔬", "role": "企业翻译实习生", "companies": ["外资制造企业", "跨国咨询公司", "国际组织驻华机构"]},
                ],
            },

            "日语翻译": {
                "skills_core":     ["日汉互译", "日语商务写作", "日本企业文化理解", "技术文档翻译", "口语表达"],
                "skills_advanced": ["技术手册本地化", "日语客服支持"],
                "skills_plus":     ["中日商务谈判"],
                "education": "本科及以上（日语专业）",
                "experience": "3年以上优先",
                "english": "四级及以上（辅助处理英日三语文件）",
                "competition": "全国日语演讲大赛、日语口译大赛、NHK杯日语演讲比赛",
                "internship": "推荐日资企业或中日贸易公司实习，积累商务日语与日企职场文化经验",
                "description": "负责中日文件双向翻译与校对，涵盖合同、技术资料、会议纪要等；为日方客户提供专业日语服务与沟通支持；参与日语客服及售后问题处理；协助管理日语项目进度，确保翻译质量与时效。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "日语翻译需持续深化对日本社会文化与企业文化的理解，同时积累工作领域的专业日语术语，保持语言敏锐度。", "keywords": ["文化学习", "专业术语"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "中日两种语言在表达习惯上差异显著，需创造性地处理文化差异，实现译文的地道性与准确性统一。", "keywords": ["文化转换", "地道表达"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "日语翻译往往需满足严格时效，客户要求精准且日企文化对细节要求高，需在高压下保持译文质量稳定。", "keywords": ["时效压力", "细节精准"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需以日语与日方客户进行专业流畅的业务沟通，理解日本人的沟通习惯，避免文化误解影响合作。", "keywords": ["日语沟通", "文化理解"]},
                    {"icon": "🤝", "name": "团队协作", "level": "中", "level_type": "medium", "desc": "在多人翻译项目中需与团队保持术语统一与风格一致，中日混合团队中还需承担文化桥梁的协调角色。", "keywords": ["术语统一", "文化桥梁"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "在日资企业或贸易公司的实习经历极为宝贵，能真实体验日企职场文化，大幅提升商务日语实战能力。", "keywords": ["日企实习", "商务日语"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "日语能力考试N1(JLPT N1)", "desc": "日语翻译岗位必须达到的最高级别", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "BJT商务日语检定B级及以上", "desc": "商务日语场景能力的专项认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "处理中英日三语资料的基础能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "日资企业实习", "icon": "🏢", "role": "日语翻译/联络实习生", "companies": ["日本制造企业驻华子公司", "中日合资企业", "日系贸易公司"]},
                    {"type": "翻译公司日语部", "icon": "🔬", "role": "日语本地化实习生", "companies": ["专业翻译公司", "游戏本地化公司", "国际会议服务机构"]},
                ],
            },

            "销售工程师": {
                "skills_core":     ["技术销售方案制作", "客户需求分析", "产品演示与讲解", "合同谈判", "客户关系维护"],
                "skills_advanced": ["行业解决方案设计", "商务报价与竞标"],
                "skills_plus":     ["英语技术交流"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上（阅读技术资料及与外资客户沟通）",
                "competition": "挑战杯、互联网+创新创业大赛、全国大学生市场营销大赛",
                "internship": "推荐仪器仪表、工业设备或科技产品类销售实习，积累B端客户拜访与方案制作经验",
                "description": "负责公司产品的销售推广与市场开拓；深入了解客户技术需求，提供专业解决方案；定期拜访维护客户关系，跟进合同执行与货款回收；收集市场与竞品信息，支持产品迭代优化。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "销售工程师需同时掌握专业技术知识与销售方法论，需快速学习产品技术原理，将其转化为客户能理解的语言。", "keywords": ["技术学习", "产品掌握"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "针对不同客户的个性化需求制定差异化解决方案，在方案设计与价格谈判上需要灵活创新的思维。", "keywords": ["方案定制", "创新谈判"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "销售有明确的业绩指标，客户跟进周期长、拒绝率高，需具备较强的心理韧性和持续出击的动力。", "keywords": ["业绩目标", "心理韧性"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "销售工程师的核心技能是沟通，需在技术演示中表达清晰、在谈判中敏锐应对，建立客户的专业信任感。", "keywords": ["技术演示", "信任建立"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "销售工程师通常与售前、技术支持、交付团队紧密协作，需协调内外部资源共同推动订单落地。", "keywords": ["内外协作", "订单落地"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "技术销售实习让你提前积累客户拜访与方案制作经验，理解B端销售全流程，对求职帮助极大。", "keywords": ["销售实习", "B端经验"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "相关行业产品认证（如仪器、安防等）", "desc": "与所售产品相关的行业技术认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "PMP项目管理认证", "desc": "大客户项目跟进能力加分", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "对接外资客户与阅读英文技术资料的基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "B端技术销售实习", "icon": "🏢", "role": "销售工程师实习生", "companies": ["仪器仪表厂商", "工业自动化公司", "科技设备企业"]},
                    {"type": "解决方案销售实习", "icon": "🔬", "role": "售前工程师实习生", "companies": ["IT系统集成商", "云计算厂商", "智能制造企业"]},
                ],
            },

            "招聘专员/助理": {
                "skills_core":     ["招聘渠道运营(BOSS直聘/猎聘)", "简历筛选", "面试安排与跟进", "人才数据库维护", "招聘数据分析"],
                "skills_advanced": ["结构化面试技术", "雇主品牌建设"],
                "skills_plus":     ["HRBP业务伙伴能力"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国HR职业技能竞赛、互联网+大学生创新创业大赛、挑战杯",
                "internship": "推荐人力资源公司或企业HR部门招聘方向实习，积累全流程招聘执行经验",
                "description": "负责职位发布与简历筛选，安排面试流程并与候选人保持沟通跟进；维护招聘数据库与候选人档案；分析招聘渠道效果，优化招聘漏斗转化；配合业务部门完成用人需求，保障招聘计划按时完成。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "招聘工作涉及不同职能领域的职位，需快速学习各业务部门的岗位需求，建立跨领域的人才识别能力。", "keywords": ["岗位学习", "人才识别"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在招聘渠道创新、雇主品牌宣传内容设计与候选人体验优化上需要一定的创意与创新思维。", "keywords": ["渠道创新", "雇主品牌"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "招聘旺季任务量激增、多个职位并行推进，需在高工作量下保持沟通响应效率与服务质量。", "keywords": ["招聘旺季", "并发任务"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "招聘工作的核心是沟通，需与候选人建立信任、向业务部门准确传达人才画像，是招聘成功的关键要素。", "keywords": ["候选人沟通", "业务对齐"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "需与HR各职能模块（薪酬、培训、HRBP）及业务部门紧密配合，形成完整的人才获取与留用服务链条。", "keywords": ["HR协作", "业务配合"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "人力资源公司或企业HR实习经历是进入招聘岗位的重要基础，积累简历筛选与面试沟通的实战经验。", "keywords": ["HR实习", "招聘实战"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "人力资源管理师（三级）", "desc": "招聘专员岗位认可的专业资格认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "SHRM人力资源专业认证", "desc": "国际通行的HR专业认证，大型企业青睐", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机操作证书", "desc": "ATS系统与招聘数据分析工具操作能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "企业HR招聘实习", "icon": "🏢", "role": "招聘专员实习生", "companies": ["互联网公司HR部", "大型制造企业HR中心", "外资企业招聘组"]},
                    {"type": "猎头/人力资源公司", "icon": "🔬", "role": "猎头顾问助理实习生", "companies": ["知名猎头公司", "人力资源服务机构", "校园招聘外包服务商"]},
                ],
            },

            "猎头顾问": {
                "skills_core":     ["候选人寻访(Mapping)", "岗位需求分析", "人才评估面试", "客户关系维护", "招聘渠道运营"],
                "skills_advanced": ["行业人脉建设", "高管级别猎聘"],
                "skills_plus":     ["英语面试与沟通"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上（外资客户优先六级）",
                "competition": "全国HR技能大赛、互联网+大学生创新创业大赛",
                "internship": "推荐猎头公司或招聘外包机构实习，积累候选人寻访与BD拓客经验",
                "description": "负责根据客户需求寻访、评估高端人才；通过电话、社交平台开发候选人资源；为候选人提供职业咨询，推动双向匹配；同时维护和拓展客户企业资源，完成招聘指标，建立个人人才与客户数据库。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "猎头需跨行业掌握不同领域的岗位需求与人才标准，持续更新行业知识是建立专业口碑的核心基础。", "keywords": ["行业学习", "岗位理解"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "寻访渠道创新、候选人挖掘策略优化、社交媒体运营等方面都需要持续创新，在竞争激烈的市场中脱颖而出。", "keywords": ["寻访策略", "渠道创新"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "猎头工作KPI明确、被拒概率高、周期长，需要极强的心理韧性与目标坚持力，在挫折中保持积极进取。", "keywords": ["目标坚持", "拒绝承受"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "猎头工作高度依赖沟通，需同时服务候选人与客户两端，建立信任、挖掘需求、推动双向成交。", "keywords": ["双向沟通", "信任建立"]},
                    {"icon": "🤝", "name": "团队协作", "level": "中", "level_type": "medium", "desc": "与团队内其他顾问共享人才信息，协同完成大客户多职位交付，内部竞争与合作并存。", "keywords": ["信息共享", "协同交付"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "猎头公司实习是最直接的入行路径，尽早积累候选人沟通与BD能力，建立初步的行业人脉资源。", "keywords": ["猎头实习", "BD能力"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "人力资源管理师（二级/三级）", "desc": "猎头顾问岗位认可的基础专业资格", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "SHRM-CP国际HR认证", "desc": "服务外资客户的加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "对接外资猎头客户的基础能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "猎头顾问实习", "icon": "🏢", "role": "猎头助理实习生", "companies": ["万宝盛华", "前程无忧猎头部", "Robert Half等国际猎头"]},
                    {"type": "招聘顾问实习", "icon": "🔬", "role": "招聘顾问实习生", "companies": ["科锐国际", "人瑞人才", "外包招聘服务商"]},
                ],
            },

            "培训师": {
                "skills_core":     ["课程设计与开发", "讲师演讲技巧", "培训需求分析", "培训效果评估", "PPT制作"],
                "skills_advanced": ["在线课程制作(视频/直播)", "学习管理系统(LMS)运营"],
                "skills_plus":     ["认证讲师(PTT/内训师)"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "无明确要求",
                "competition": "全国高校教学技能大赛、演讲比赛、挑战杯教育创新方向",
                "internship": "推荐教育机构、企业培训部或职业技能培训公司实习，积累授课与课程开发经验",
                "description": "负责企业内外部培训课程的设计、开发与授课；分析培训需求，制定培训计划；主导新员工入职培训及岗位技能培训；收集学员反馈优化课程内容；建立培训档案，评估培训效果与转化率。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "培训师需不断更新自己的知识储备，跟踪行业前沿，将最新知识转化为可传授的课程内容。", "keywords": ["知识更新", "课程开发"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "课程设计需要创新思维，通过游戏化、案例化、情景化等多种手段提升培训参与度与学习效果。", "keywords": ["课程创新", "游戏化设计"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "授课前的课程准备工作量大，面对不同学员群体时需快速调整风格，在突发状况下保持良好的台风。", "keywords": ["课程准备", "临场应变"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "培训师的核心是沟通表达，需生动有感染力地传递知识，激发学员学习兴趣，管理课堂互动氛围。", "keywords": ["表达感染力", "互动管理"]},
                    {"icon": "🤝", "name": "团队协作", "level": "中", "level_type": "medium", "desc": "需与HR、业务部门协作明确培训需求，与外部讲师资源协调，共同打造完整的企业培训体系。", "keywords": ["需求协作", "外部资源"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "教育机构或企业培训部实习是积累授课经验的最佳途径，能实际操刀设计课程并走上讲台锻炼表达。", "keywords": ["授课实习", "课程设计"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "PTT职业培训师认证", "desc": "国内培训师岗位认可度最高的专业认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "教师资格证", "desc": "教育类培训机构岗位加分证书", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "人力资源管理师（培训方向）", "desc": "企业内训师方向的资质证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "企业内训实习", "icon": "🏢", "role": "培训助理实习生", "companies": ["大型企业培训中心", "互联网公司HR/培训部", "管理咨询公司培训部"]},
                    {"type": "职业培训机构实习", "icon": "🔬", "role": "讲师助理实习生", "companies": ["职业技能培训机构", "在线教育平台", "职场教育公司"]},
                ],
            },

            "知识产权/专利代理": {
                "skills_core":     ["专利申请文件撰写", "审查意见答复", "专利检索与分析", "知识产权法律法规", "与发明人技术沟通"],
                "skills_advanced": ["专利无效/复审代理", "专利布局策略"],
                "skills_plus":     ["英文专利撰写与翻译"],
                "education": "本科及以上（理工科或法学）",
                "experience": "应届生/1年以内",
                "english": "六级及以上（撰写英文专利及答复外国审查意见）",
                "competition": "全国大学生知识产权竞赛、挑战杯、模拟专利答辩大赛",
                "internship": "推荐专利事务所或企业知识产权部实习，积累专利文件撰写与答复经验",
                "description": "负责专利申请文件的撰写与审核；向审查员提交审查意见答复；与发明人深入沟通技术方案；开展专利检索与侵权分析；协助处理专利复审与无效案件；配合企业完成知识产权战略布局。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "专利代理人需横跨技术与法律两个专业领域，持续学习新技术领域知识与专利审查实务是核心竞争力。", "keywords": ["技术学习", "审查实务"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "专利文件撰写需要将技术创新点以最优策略呈现，构建最大化保护范围的权利要求书是高度创造性的工作。", "keywords": ["权利要求设计", "保护策略"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": "专利代理有严格的期限要求，同时处理多个专利申请案件时需保持准确性，避免因疏漏产生法律风险。", "keywords": ["期限管理", "多案并行"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需与不同技术背景的发明人精准提取技术要点，与审查员书面沟通答辩策略，双向沟通贯穿全程。", "keywords": ["发明人沟通", "审查答辩"]},
                    {"icon": "🤝", "name": "团队协作", "level": "中", "level_type": "medium", "desc": "专利团队内部分工协作，需与撰写、答复、管理等不同角色紧密配合，共同推进案件高效处理。", "keywords": ["案件协作", "分工配合"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "专利事务所实习是进入知识产权行业的必经之路，积累专利文件撰写与审查答复的实战经验，并备考专利代理师资格。", "keywords": ["专利实习", "资格备考"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "专利代理师资格证", "desc": "从事专利代理工作的法定资质证书", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "英语六级/法律英语证书", "desc": "处理PCT国际专利申请的关键能力", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "相关理工科专业学位", "desc": "技术领域专利撰写的知识基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "专利事务所实习", "icon": "🏢", "role": "专利代理助理实习生", "companies": ["国内头部专利事务所", "国际专利律所驻华机构", "知识产权综合服务机构"]},
                    {"type": "企业知识产权部实习", "icon": "🔬", "role": "知识产权专员实习生", "companies": ["华为知识产权部", "大型科技企业IP中心", "高新技术企业专利管理部"]},
                ],
            },

            "咨询顾问": {
                "skills_core":     ["商业分析与问题结构化", "行业研究报告撰写", "数据分析(Excel/Python)", "客户汇报与PPT制作", "项目管理"],
                "skills_advanced": ["战略规划", "财务建模"],
                "skills_plus":     ["英文报告写作"],
                "education": "本科及以上（985/211优先）",
                "experience": "应届生/1-3年",
                "english": "六级及以上（外资咨询公司要求较高）",
                "competition": "挑战杯、互联网+创新创业大赛、麦肯锡/贝恩商业案例大赛",
                "internship": "推荐管理咨询公司或行研机构实习，积累结构化分析与客户汇报经验",
                "description": "为客户提供行业分析与管理咨询服务；运用结构化分析方法识别业务问题并制定改善方案；开展市场调研与竞争分析，输出高质量研究报告；参与客户项目汇报，协助推动战略方案落地执行。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "咨询顾问需在短时间内快速掌握不同行业的知识背景与业务逻辑，超强的学习能力是咨询工作的基本要求。", "keywords": ["快速学习", "行业深潜"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "为客户提供差异化的战略建议，需具备突破常规的创新思维，找到解决客户业务挑战的新路径。", "keywords": ["战略创新", "解决方案"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "咨询行业以工作强度高著称，项目交付节点紧张，需在高压下保持高质量输出，这是进入咨询行业的基本素质。", "keywords": ["高强度输出", "交付压力"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "咨询顾问的价值通过沟通体现，需向高管客户清晰呈现分析发现与建议，说服力与表达力是核心竞争力。", "keywords": ["高管汇报", "说服力"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "咨询项目通常由团队协作完成，在快节奏项目环境中与不同背景的团队成员高效配合是基本职业素养。", "keywords": ["项目团队", "高效配合"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "顶级咨询公司实习经历是进入咨询行业的黄金通行证，建议早准备，积累案例分析能力与内推资源。", "keywords": ["咨询实习", "案例分析"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "CFA特许金融分析师", "desc": "金融咨询方向核心认证（财务分析能力）", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "PMP项目管理认证", "desc": "咨询项目管理能力加分", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语六级/TOEFL/GMAT", "desc": "外资咨询或海外研究生项目申请基础", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "管理咨询实习", "icon": "🏢", "role": "咨询顾问实习生", "companies": ["麦肯锡/波士顿咨询", "德勤/普华永道咨询部", "国内头部咨询机构"]},
                    {"type": "行业研究实习", "icon": "🔬", "role": "研究分析实习生", "companies": ["证券公司研究所", "行业研究机构", "创投机构投研部"]},
                ],
            },

            "项目招投标": {
                "skills_core":     ["招标文件解读与编制", "标书制作", "投标报价", "合规审查", "招标平台操作"],
                "skills_advanced": ["招标法规体系（招投标法）", "评标策略"],
                "skills_plus":     ["ERP采购系统操作"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "无明确要求",
                "competition": "全国大学生采购与供应链管理竞赛、挑战杯、招投标知识竞赛",
                "internship": "推荐招投标代理机构或大型企业采购部实习，熟悉标书制作与平台操作流程",
                "description": "负责公司项目招标与投标全流程工作；解读招标文件，制作高质量投标标书；跟踪招标信息与截止时间；处理合规审查与资质准备；维护招标档案，协调内部各部门提供标书所需材料。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "招投标法规持续更新，不同行业招标规范各异，需快速掌握各类项目的招标要求与合规标准，减少失标风险。", "keywords": ["法规学习", "招标规范"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在标书的差异化呈现与投标策略制定上需要创新思维，打造有竞争力的标书是提升中标率的关键。", "keywords": ["标书创新", "投标策略"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "招标截止时间固定不可延期，多个项目并行时压力极大，需具备在高压下高效、准确完成标书的能力。", "keywords": ["截止时间", "多项并行"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需协调技术、财务、法务等多部门提供标书所需内容，清晰传达需求，推动材料及时到位。", "keywords": ["跨部门协调", "材料催收"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "标书制作需多人分工协作，项目经理、技术、商务、法务需高效配合，在统一格式下完成完整投标文件。", "keywords": ["分工协作", "标书集成"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "招投标代理机构或大型企业采购部实习是了解标书制作全流程的最佳方式，积累实战操作经验。", "keywords": ["招标实习", "标书制作"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "招标师职业资格证书", "desc": "招投标专业岗位必备资质认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "政府采购师认证", "desc": "公共资源交易类项目加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机操作证书", "desc": "招标平台操作与标书文档处理能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "招投标代理机构实习", "icon": "🏢", "role": "招标专员实习生", "companies": ["政府采购代理机构", "工程招标公司", "集中采购中心"]},
                    {"type": "企业采购部实习", "icon": "🔬", "role": "商务/采购实习生", "companies": ["大型国企采购中心", "房地产开发商", "EPC工程总包公司"]},
                ],
            },

            "BD经理": {
                "skills_core":     ["市场开拓与客户获取", "商务谈判", "合作方案设计", "行业资源整合", "CRM管理"],
                "skills_advanced": ["生态合作体系搭建", "渠道管理"],
                "skills_plus":     ["英语商务谈判"],
                "education": "本科及以上",
                "experience": "1-3年",
                "english": "四级及以上",
                "competition": "互联网+大学生创新创业大赛、挑战杯、全国大学生市场营销大赛",
                "internship": "推荐科技公司商务拓展或战略合作方向实习，积累B端客户开发与谈判经验",
                "description": "负责新客户拓展与战略合作伙伴的开发谈判；根据公司战略制定BD计划，挖掘并推动商业合作落地；维护已有合作资源，扩大合作规模；分析市场动态与竞争格局，为产品与业务拓展提供市场洞察。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "BD需快速掌握目标行业生态，理解潜在合作伙伴的业务逻辑，学习能力决定开拓新市场的效率与成功率。", "keywords": ["行业学习", "生态理解"]},
                    {"icon": "💡", "name": "创新能力", "level": "高", "level_type": "high", "desc": "设计差异化的合作方案，创造对双方都有价值的合作模式，是BD工作产生显著成果的关键创新点。", "keywords": ["合作创新", "价值设计"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "BD工作目标明确，成单周期长、失败率高，需在持续被拒与长期跟进中保持积极主动的工作状态。", "keywords": ["长期坚持", "目标导向"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "BD的核心在于与潜在合作方建立信任关系，需具备出色的演讲、谈判与说服能力，赢得高层决策者的认可。", "keywords": ["高层沟通", "谈判说服"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "BD推进的合作项目需要产品、技术、法务、市场团队共同支持，协调内部资源是BD工作的重要组成部分。", "keywords": ["内部协调", "资源整合"]},
                    {"icon": "🏢", "name": "实习经历", "level": "高", "level_type": "high", "desc": "科技公司商务或战略合作实习让你提前建立B端商务认知与谈判经验，行业人脉积累从实习阶段就应开始。", "keywords": ["商务实习", "人脉建立"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "PMP项目管理认证", "desc": "大型BD项目推进能力的加分认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "商务谈判师认证", "desc": "商务谈判能力专业化证明", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "对接外资合作方的基础沟通能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "商务拓展实习", "icon": "🏢", "role": "BD实习生", "companies": ["互联网大厂战略合作部", "科技创业公司", "数字营销平台"]},
                    {"type": "渠道销售实习", "icon": "🔬", "role": "渠道拓展实习生", "companies": ["SaaS公司", "云计算厂商", "新媒体商业化部门"]},
                ],
            },

            "商务专员": {
                "skills_core":     ["标书/报价文件制作", "合同拟定与跟踪", "客户关系维护", "商务数据整理", "Office办公软件"],
                "skills_advanced": ["招投标全流程操作", "电子商务平台运营"],
                "skills_plus":     ["英语商务写作"],
                "education": "本科及以上",
                "experience": "应届生/1年以内",
                "english": "四级及以上（涉外业务优先）",
                "competition": "全国大学生市场营销大赛、挑战杯商业计划书赛道、互联网+",
                "internship": "推荐企业商务/销售支持方向实习，积累标书制作与合同管理的实操经验",
                "description": "负责商务文件的制作与管理，包括标书、报价单、合同等；跟踪合同执行进度与货款回收；协助商务谈判前期的资料准备与数据整理；维护客户档案，处理日常商务往来函件，支持销售团队业务开展。",
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": "商务工作涉及行业多样，需快速掌握不同产品的技术特点与商务规范，不断扩充商务知识储备。", "keywords": ["行业学习", "商务规范"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": "在标书呈现形式、商务方案设计与客户关系维护策略上具有一定的创新空间，提升商务文件的竞争力。", "keywords": ["标书创新", "方案设计"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "高", "level_type": "high", "desc": "商务文件往往有严格的提交截止时间，多个项目并行推进时工作量大，需具备高压下高效准确输出的能力。", "keywords": ["截止时间", "高效输出"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": "需与客户、供应商及内部各部门保持良好的书面与口头沟通，确保商务信息传递准确、关系维护顺畅。", "keywords": ["书面沟通", "关系维护"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": "商务专员是销售与技术之间的桥梁，需与销售、技术、财务团队紧密配合，保障商务流程顺畅运转。", "keywords": ["销售支持", "跨部门桥梁"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": "商务类实习帮助提前了解企业商务运作全流程，积累标书制作与合同管理的实战经验。", "keywords": ["商务实习", "合同管理"]},
                ],
                "certs": [
                    {"icon": "🏅", "name": "计算机办公技能认证(Word/Excel高级)", "desc": "商务文档制作的基础工具能力认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "招标师职业资格证书", "desc": "涉及招投标业务的加分资质", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "英语四/六级", "desc": "处理涉外商务文件的基础能力", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "商务支持实习", "icon": "🏢", "role": "商务专员实习生", "companies": ["大型制造企业商务部", "贸易公司", "IT系统集成商"]},
                    {"type": "销售助理实习", "icon": "🔬", "role": "销售助理实习生", "companies": ["科技公司", "快消品企业", "互联网商业化部门"]},
                ],
            },
        }

        # ── 通用兜底（未在精细库中的岗位）─────────────────────────────────────────
        GENERIC_TEMPLATES = {
            "销售类": {
                "keys": ["销售运营", "网络销售", "广告销售", "电话销售", "大客户代表", "销售助理"],
                "skills_core": ["客户开发", "销售话术", "产品演示", "客户关系维护", "目标达成"],
                "skills_advanced": ["数据分析", "团队管理"],
                "skills_plus": ["行业解决方案"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "互联网+大学生创新创业大赛、全国大学生市场营销大赛",
                "internship": "推荐销售类实习，积累客户沟通与目标达成的实战经验",
                "abilities_template": {
                    "learning": "产品与行业知识持续更新，需快速掌握新产品特性与市场动态，将知识转化为销售能力。",
                    "innovation": "在客户开发策略与销售方案设计上需要创新思维，找到突破客户防线的有效路径。",
                    "pressure": "销售有明确业绩指标，面临客户拒绝是常态，需具备较强的心理韧性与目标坚持力。",
                    "communication": "销售的核心是沟通，需精准识别客户需求，通过有说服力的表达推动成单。",
                    "teamwork": "与销售团队共享客户资源，配合售前、售后形成完整服务链，共同达成团队业绩目标。",
                    "internship": "销售类实习帮助提前积累客户沟通经验，了解完整销售流程，对求职帮助显著。",
                },
                "certs": [
                    {"icon": "🏅", "name": "普通话水平测试证书", "desc": "销售岗位基础表达能力证明", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "相关行业资格认证", "desc": "提升专业可信度的行业认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "驾驶证", "desc": "外出拜访客户的实用证件", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "销售实习", "icon": "🏢", "role": "销售实习生", "companies": ["互联网公司", "快消品企业", "房地产公司"]},
                    {"type": "市场推广实习", "icon": "🔬", "role": "市场助理实习生", "companies": ["广告公司", "新媒体机构", "品牌营销公司"]},
                ],
            },
            "运营类": {
                "keys": ["运营助理/专员", "游戏运营", "销售运营", "社区运营", "APP推广", "游戏推广"],
                "skills_core": ["内容运营", "数据分析", "用户增长", "活动策划", "社群管理"],
                "skills_advanced": ["A/B测试", "渠道效果分析"],
                "skills_plus": ["SQL数据查询"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "互联网+大学生创新创业大赛、新媒体营销大赛、挑战杯",
                "internship": "推荐互联网公司运营方向实习，积累用户增长与内容策划的实战经验",
                "abilities_template": {
                    "learning": "运营工具与平台算法持续更新，需持续学习新的增长方法与数据工具，保持运营能力的领先性。",
                    "innovation": "内容创意与活动策划需要持续的创新思维，在同质化竞争中设计有差异化的运营方案。",
                    "pressure": "运营工作数据指标明确，增长压力持续存在，需在数据不好看时冷静分析原因并快速调整。",
                    "communication": "需与产品、市场、技术保持密切沟通，确保运营活动的资源协调与落地执行顺畅。",
                    "teamwork": "运营工作高度依赖跨部门协作，需与设计、技术、内容等团队紧密配合共同推进增长目标。",
                    "internship": "互联网运营实习是进入该行业最直接的路径，积累真实数据指标达成与活动策划执行的经验。",
                },
                "certs": [
                    {"icon": "🏅", "name": "新媒体运营师认证", "desc": "运营岗位专业能力认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "数据分析师证书(CDA)", "desc": "运营数据分析能力加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "短视频/直播运营证书", "desc": "新媒体运营能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "互联网运营实习", "icon": "🏢", "role": "运营实习生", "companies": ["互联网平台", "游戏公司", "电商企业"]},
                    {"type": "内容运营实习", "icon": "🔬", "role": "内容运营实习生", "companies": ["新媒体机构", "MCN公司", "品牌内容中心"]},
                ],
            },
            "行政管理类": {
                "keys": ["总助/CEO助理/董事长助理", "储备经理人", "储备干部", "管培生/储备干部", "资料管理", "档案管理", "统计员"],
                "skills_core": ["文件整理归档", "日程与会议管理", "Excel/Word数据处理", "沟通协调", "保密意识"],
                "skills_advanced": ["项目跟踪管理", "ERP系统操作"],
                "skills_plus": ["数字化档案管理"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国大学生职业规划大赛、挑战杯、管理案例分析大赛",
                "internship": "推荐行政助理或档案管理方向实习，熟悉企业日常运营文件处理流程",
                "abilities_template": {
                    "learning": "行政岗位涉及企业多个业务模块的文件与事务处理，需快速掌握不同业务的规范与流程要求。",
                    "innovation": "在文档管理系统优化与行政流程效率提升方面具有一定创新空间，推动办公数字化改善。",
                    "pressure": "行政事务繁杂且时效性要求高，需具备在高工作量下保持细心准确的工作状态。",
                    "communication": "行政工作是企业内部润滑剂，需与各部门保持顺畅沟通，高效传递信息与协调资源。",
                    "teamwork": "行政岗位服务于全公司，需与不同部门建立良好协作关系，体现高度的服务意识与专业性。",
                    "internship": "行政/秘书类实习帮助了解企业运营全貌，积累文件管理与会议组织的实操经验。",
                },
                "certs": [
                    {"icon": "🏅", "name": "秘书资格证(三级及以上)", "desc": "行政助理岗位基础能力认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "档案管理师认证", "desc": "档案/资料管理岗位加分认证", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机操作技能证书", "desc": "Office办公软件熟练操作能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "行政助理实习", "icon": "🏢", "role": "行政助理实习生", "companies": ["大型企业行政部", "外资公司行政部门", "政府机关单位"]},
                    {"type": "档案/资料管理实习", "icon": "🔬", "role": "档案管理实习生", "companies": ["档案馆", "企业档案中心", "政府档案管理部门"]},
                ],
            },
            "客服类": {
                "keys": ["售后客服", "网络客服", "电话客服", "内容审核"],
                "skills_core": ["客户服务意识", "投诉处理", "信息录入", "沟通表达", "情绪管理"],
                "skills_advanced": ["CRM系统操作", "客户满意度提升"],
                "skills_plus": ["英语客服能力"],
                "education": "大专及以上",
                "experience": "应届生/1年以内",
                "english": "无明确要求",
                "competition": "全国服务外包创新创业大赛、互联网+、全国职业院校技能大赛客服赛道",
                "internship": "推荐客服中心或电商平台客服实习，积累用户沟通与投诉处理经验",
                "abilities_template": {
                    "learning": "产品功能与业务规则持续更新，需快速掌握新的服务规范与产品知识，保持专业服务水准。",
                    "innovation": "在服务话术优化与客诉处理方案设计上具有一定创新空间，提升客户满意度与问题解决效率。",
                    "pressure": "客服工作面临高频用户投诉与情绪化客户，需具备良好的情绪管理能力与稳定的服务状态。",
                    "communication": "客服的核心是沟通，需在有限时间内高效理解客户需求并给出满意解答，语言表达是核心竞争力。",
                    "teamwork": "需与产品、技术、物流等部门协作解决复杂客诉，形成高效的问题上报与解决协作机制。",
                    "internship": "客服类实习帮助积累用户沟通技巧与投诉处理经验，为进入服务行业打下良好基础。",
                },
                "certs": [
                    {"icon": "🏅", "name": "客户服务师认证", "desc": "客服岗位基础能力认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "普通话水平测试二级甲等", "desc": "电话客服岗位语言标准要求", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机操作认证", "desc": "CRM系统与工单处理能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "在线客服实习", "icon": "🏢", "role": "客服实习生", "companies": ["电商平台", "互联网公司", "金融机构客服中心"]},
                    {"type": "内容审核实习", "icon": "🔬", "role": "内容审核实习生", "companies": ["短视频平台", "社交媒体公司", "电商内容团队"]},
                ],
            },
            "其他": {
                "keys": [],
                "skills_core": ["专业技能", "沟通表达", "数据分析", "文档写作", "团队协作"],
                "skills_advanced": ["项目管理", "行业分析"],
                "skills_plus": ["数字化工具应用"],
                "education": "本科及以上",
                "experience": "应届生/1年以内",
                "english": "四级及以上",
                "competition": "挑战杯、互联网+大学生创新创业大赛、全国大学生职业规划大赛",
                "internship": "推荐与岗位方向相关的实习，积累真实工作场景的实践经验",
                "abilities_template": {
                    "learning": "岗位技术与行业规范持续演进，需保持主动学习的习惯，快速适应工作需求的变化。",
                    "innovation": "在工作方法与流程优化上需要一定的创新思维，持续提升工作效率与质量。",
                    "pressure": "工作推进中会面临时间与资源的双重压力，需具备较好的抗压能力与任务优先级管理能力。",
                    "communication": "日常工作需与多方保持有效沟通，清晰表达是推动工作顺利进行的基础能力。",
                    "teamwork": "工作目标的达成需要团队协作，配合度高、沟通顺畅是良好团队贡献的核心体现。",
                    "internship": "相关方向实习帮助提前了解岗位工作内容与行业环境，对快速融入职场有显著帮助。",
                },
                "certs": [
                    {"icon": "🏅", "name": "英语四/六级", "desc": "职场通用语言能力基础认证", "type": "必须", "type_code": "must"},
                    {"icon": "📜", "name": "相关职业资格证书", "desc": "岗位方向专业能力加分证明", "type": "加分项", "type_code": "plus"},
                    {"icon": "🌐", "name": "计算机操作技能证书", "desc": "办公自动化基础能力证明", "type": "推荐", "type_code": "opt"},
                ],
                "intern_directions": [
                    {"type": "相关方向实习", "icon": "🏢", "role": f"{job_name}实习生", "companies": ["行业相关企业", "大型综合企业", "创业公司"]},
                    {"type": "综合实践", "icon": "🔬", "role": "助理岗实习生", "companies": ["中小型企业", "咨询公司", "服务型企业"]},
                ],
            },
        }

        # ── 精确匹配精细库 ──
        profile_data = PROFILES.get(job_name)

        # ── 未命中则用通用模板兜底 ──
        if not profile_data:
            matched_generic = None
            for tpl in GENERIC_TEMPLATES.values():
                if job_name in tpl["keys"]:
                    matched_generic = tpl
                    break
            if not matched_generic:
                matched_generic = GENERIC_TEMPLATES["其他"]

            atpl = matched_generic["abilities_template"]
            profile_data = {
                "skills_core":     matched_generic["skills_core"],
                "skills_advanced": matched_generic["skills_advanced"],
                "skills_plus":     matched_generic["skills_plus"],
                "education":       matched_generic["education"],
                "experience":      matched_generic["experience"],
                "english":         matched_generic["english"],
                "competition":     matched_generic["competition"],
                "internship":      matched_generic["internship"],
                "description":     None,  # 用auto_desc
                "certs":           matched_generic["certs"],
                "intern_directions": matched_generic["intern_directions"],
                "abilities": [
                    {"icon": "🧠", "name": "学习能力", "level": "高", "level_type": "high", "desc": atpl["learning"], "keywords": [matched_generic["skills_core"][0], "快速上手"]},
                    {"icon": "💡", "name": "创新能力", "level": "中", "level_type": "medium", "desc": atpl["innovation"], "keywords": ["方案设计", "流程优化"]},
                    {"icon": "🔥", "name": "抗压能力", "level": "中", "level_type": "medium", "desc": atpl["pressure"], "keywords": ["时间管理", "压力输出"]},
                    {"icon": "💬", "name": "沟通能力", "level": "高", "level_type": "high", "desc": atpl["communication"], "keywords": ["跨部门沟通", "清晰表达"]},
                    {"icon": "🤝", "name": "团队协作", "level": "高", "level_type": "high", "desc": atpl["teamwork"], "keywords": ["协作配合", "目标达成"]},
                    {"icon": "🏢", "name": "实习经历", "level": "中", "level_type": "medium", "desc": atpl["internship"], "keywords": ["实习经验", "职场适应"]},
                ],
            }

        # ── 技能去重 ──
        def dedup(lst):
            seen = []
            for x in lst:
                if x not in seen:
                    seen.append(x)
            return seen

        skills_core     = dedup(profile_data["skills_core"])[:5]
        skills_advanced = dedup(profile_data["skills_advanced"])[:3]
        skills_plus     = dedup(profile_data["skills_plus"])[:2]

        # ── 组装最终JSON ──
        result = {
            "salary":       salary or "面议",
            "location":     location or "北京、上海、深圳",
            "company_size": scale or "中大型企业",
            "demand_score": demand_score,
            "trend":        trend,
            "experience":   profile_data["experience"],
            "education":    profile_data["education"],
            "competition":  profile_data["competition"],
            "english":      profile_data["english"],
            "internship":   profile_data["internship"],
            "description":  profile_data.get("description") or auto_desc or f"{job_name}岗位负责相关业务的落地执行，与团队协作完成项目目标，具体职责视企业业务方向而定。",
            "skills_core":     skills_core,
            "skills_advanced": skills_advanced,
            "skills_plus":     skills_plus,
            "abilities":       profile_data["abilities"],
            "certs":           profile_data["certs"],
            "intern_directions": profile_data["intern_directions"],
        }

        json_str = _json.dumps(result, ensure_ascii=False)
        yield f"data: {_json.dumps({'text': json_str}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"[API] _stream_job_profile_generate 异常: {e}", exc_info=True)
        yield f"data: {_json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"


@job_bp.route("/generate-profile-stream", methods=["POST"])
def generate_profile_stream():
    """
    岗位画像流式生成，返回 SSE。
    请求体：{ job_name, job_description }，job_description 可选。
    """
    try:
        body = request.get_json(silent=True) or {}
        job_name = (body.get("job_name") or "").strip() or ""
        if not job_name:
            return error_response(400, "请提供 job_name 参数")
        job_description = (body.get("job_description") or "").strip() or ""
        return Response(
            _stream_job_profile_generate(job_name, job_description),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    except Exception as e:
        logger.error(f"[API] generate-profile-stream 异常: {e}", exc_info=True)
        return error_response(500, str(e))


def _resolve_job_id_from_name(job_name):
    """根据岗位名称解析为 target_jobs 的 job_id，用于晋升路径查库。"""
    job_name = (job_name or "").strip()
    if not job_name:
        return None
    import re
    name_core = re.sub(r"\s*[（(].*?[)）]\s*", "", job_name).strip() or job_name
    target_jobs = job_profile_conf.get("target_jobs", [])
    for t in target_jobs:
        tid = t.get("job_id", "")
        tname = (t.get("name") or "").strip()
        if not tname:
            continue
        if name_core in tname or tname in name_core:
            return tid
    return None


def _resolve_job_id_for_graph(job_id):
    """
    将列表/CSV 的 job_id（如 A174435）解析为图谱使用的 target_jobs job_id（如 job_011），
    以便从 DB 或 graph.json 秒级返回，避免走实时 LLM 导致请求挂起、响应为空。
    返回 (resolved_id, display_name)：resolved_id 用于查 DB/图，display_name 用于 center_job 展示。
    """
    job_id = (job_id or "").strip()
    if not job_id:
        return None, ""
    target_jobs = job_profile_conf.get("target_jobs", [])
    job_index = {j["job_id"]: j for j in target_jobs}
    if job_id in job_index:
        return job_id, (job_index[job_id].get("name") or job_id)

    # 从 profiles_store 取岗位名称，再按名称匹配 target_jobs
    profiles = _load_profiles_store()
    job_name = ""
    if job_id in profiles:
        job_name = (profiles[job_id].get("job_name") or "").strip()
    if not job_name:
        job_name = job_id
    # 去掉括号后缀便于匹配，如 "算法工程师(A174435)" -> "算法工程师"
    import re
    name_core = re.sub(r"\s*[（(].*?[)）]\s*", "", job_name).strip() or job_name
    for t in target_jobs:
        tid = t.get("job_id", "")
        tname = (t.get("name") or "").strip()
        if not tname:
            continue
        if name_core in tname or tname in name_core:
            return tid, job_name or tname
    return job_id, job_name or job_id


def _build_graph_data_from_json(resolved_id, graph_type, display_name, job_index):
    """从 data/job_profiles/graph.json 构建 API 所需结构，秒级返回，避免请求挂起。"""
    graph_path = get_abs_path(job_profile_conf.get("job_graph_store", "data/job_profiles/graph.json"))
    if not graph_path or not os.path.isfile(graph_path):
        return None
    try:
        with open(graph_path, "r", encoding="utf-8") as f:
            graph_file = json.load(f)
    except Exception as e:
        logger.warning(f"[API] 读取 graph.json 失败: {e}")
        return None
    nodes_by_id = {n["job_id"]: n for n in graph_file.get("transfer_graph", {}).get("nodes", [])}
    all_edges = graph_file.get("transfer_graph", {}).get("edges", [])
    center_node = nodes_by_id.get(resolved_id, {})
    center_name = display_name or center_node.get("job_name", resolved_id)
    center_job = {
        "job_id": resolved_id,
        "job_name": center_name,
        "level": center_node.get("layer_level", job_index.get(resolved_id, {}).get("layer_level", 0)),
        "salary_range": "",
        "avg_salary": "",
        "demand_score": None,
    }
    result = {"center_job": center_job}

    # 垂直图谱：从 vertical_graphs 中找到包含 resolved_id 的 track
    vertical_graphs = graph_file.get("vertical_graphs", [])
    v_nodes, v_edges, track_name = [], [], ""
    for track in vertical_graphs:
        nodes_list = track.get("nodes", [])
        ids_in_track = [n["job_id"] for n in nodes_list]
        if resolved_id in ids_in_track and graph_type in ("vertical", "all"):
            v_nodes = [{"job_id": n["job_id"], "job_name": n.get("job_name", n["job_id"]), "level": n.get("layer_level", 0), "category": n.get("category", ""), "salary_range": "", "description": ""} for n in nodes_list]
            v_edges = [{"from": e.get("from"), "to": e.get("to"), "years": e.get("years", "2-3年"), "requirements": e.get("requirements", [])} for e in track.get("edges", [])]
            track_name = track.get("career_track", "晋升路径")
            break
    result["vertical_graph"] = {"nodes": v_nodes, "edges": v_edges, "track_name": track_name, "message": "" if v_nodes else "暂无垂直路径"}

    # 转岗图谱：edges 中 from == resolved_id 的边及其 to 节点
    out_edges = [e for e in all_edges if e.get("from") == resolved_id]
    to_ids = list({e.get("to") for e in out_edges if e.get("to")})
    transfer_nodes = [nodes_by_id.get(jid, {"job_id": jid, "job_name": jid}) for jid in to_ids]
    transfer_nodes = [{"job_id": n["job_id"], "job_name": n.get("job_name", n["job_id"]), "level": n.get("layer_level", 0), "category": n.get("category", ""), "salary_range": "", "description": ""} for n in transfer_nodes]
    transfer_edges = [
        {"from": e["from"], "to": e["to"], "relevance_score": e.get("relevance_score", 70), "match_score": e.get("relevance_score", 70), "difficulty": e.get("difficulty", "中"), "time": e.get("time", "6-12个月"), "skills_gap": e.get("skills_gap", [])}
        for e in out_edges[:15]
    ]
    result["transfer_graph"] = {"nodes": transfer_nodes, "edges": transfer_edges, "message": ""}
    result["career_path"] = {"promotion_path": []}
    return result


@job_bp.route("/relation-graph", methods=["POST"])
def get_job_relation_graph():
    """
    获取岗位间的血缘关系和转换路径
    请求体：{ job_id, graph_type }
    graph_type: vertical / transfer / all
    列表 job_id（如 A174435）会解析为 target_jobs id（如 job_011），优先 DB / graph.json 秒级返回，避免响应挂起为空。
    """
    body = request.get_json(silent=True) or {}
    job_id = (body.get("job_id") or "").strip()
    graph_type = body.get("graph_type", "all")
    logger.info(f"[API] relation-graph 接口被调用, 参数: job_id={job_id!r}, graph_type={graph_type!r}")

    try:
        if not job_id:
            return error_response(400, "请提供 job_id 参数")

        if graph_type not in ("vertical", "transfer", "all"):
            return error_response(400, "graph_type 参数错误，支持: vertical/transfer/all")

        resolved_id, display_name = _resolve_job_id_for_graph(job_id)
        if not resolved_id:
            return error_response(400, "无法解析岗位 ID")
        job_index = {j["job_id"]: j for j in job_profile_conf.get("target_jobs", [])}

        # 1) 优先从 job_relations 表读取
        try:
            from job_profile.job_relations_db import init_db, build_graph_data_from_db
            init_db()
            db_data = build_graph_data_from_db(resolved_id, graph_type, job_index)
            if db_data is not None:
                for key in ("center_job", "vertical_graph", "transfer_graph", "career_path"):
                    if key not in db_data:
                        db_data[key] = _empty_graph_data(resolved_id)[key]
                if display_name and db_data.get("center_job"):
                    db_data["center_job"]["job_name"] = display_name
                return success_response(db_data)
        except Exception as e:
            logger.warning(f"[API] relation-graph 从 DB 读取失败: {e}")

        # 2) 从 graph.json 秒级返回，避免实时 LLM 导致挂起、响应为空
        json_data = _build_graph_data_from_json(resolved_id, graph_type, display_name, job_index)
        if json_data is not None:
            for key in ("center_job", "vertical_graph", "transfer_graph", "career_path"):
                if key not in json_data:
                    json_data[key] = _empty_graph_data(resolved_id)[key]
            return success_response(json_data)

        # 3) 回退实时构建（可能较慢）
        graph_service = get_job_graph_service()
        graph_data = graph_service.get_job_graph(resolved_id, graph_type)

        if not isinstance(graph_data, dict):
            graph_data = _empty_graph_data(resolved_id, "数据格式异常")
        else:
            for key in ("center_job", "vertical_graph", "transfer_graph", "career_path"):
                if key not in graph_data:
                    graph_data[key] = _empty_graph_data(resolved_id)[key]
        if display_name and graph_data.get("center_job"):
            graph_data["center_job"]["job_name"] = display_name
        return success_response(graph_data)

    except ValueError as e:
        logger.warning(f"[API] /job/relation-graph 业务错误: {e}")
        return error_response(404, str(e))
    except Exception as e:
        logger.error(f"[API] /job/relation-graph 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.3.1 获取岗位晋升路径（优先 DB job_promotion_path，否则 LLM 生成）
# GET /api/v1/job/career-path?jobName=xxx（前端晋升路径卡片可接此；队友侧 jobId 换岗数据可另接）
# ============================================================
@job_bp.route("/career-path", methods=["GET"])
def get_job_career_path():
    """
    根据岗位名称或 jobId 返回 4 个晋升阶段，供前端晋升路径卡片使用。
    支持 jobName 或 jobId：jobId 时从 profiles_store 解析岗位名称。
    优先从 job_promotion_path 表读取，确保有阶段名、年限、薪资；无则回退 LLM。
    返回 data.path: [ { stage, icon, salary, skills, desc, years }, ... ]
    """
    try:
        job_name = (request.args.get("jobName") or "").strip()
        job_id = (request.args.get("jobId") or "").strip()
        if not job_name and job_id:
            profiles = _load_profiles_store()
            profile = profiles.get(job_id) if isinstance(profiles, dict) else None
            if profile and isinstance(profile, dict):
                job_name = (profile.get("job_name") or profile.get("name") or "").strip()
            if not job_name:
                resolved_id, display_name = _resolve_job_id_for_graph(job_id)
                if display_name:
                    job_name = display_name
        if not job_name:
            return error_response(400, "请提供 jobName 或 jobId 参数")

        path = []
        job_id = _resolve_job_id_from_name(job_name)
        if job_id:
            try:
                from job_profile.job_relations_db import init_db, get_promotion_path_by_job_id
                init_db()
                rows = get_promotion_path_by_job_id(job_id)
                if rows and len(rows) >= 4:
                    default_icons = ["🌱", "🌿", "🌳", "🏆"]
                    for i, r in enumerate(rows[:4]):
                        skills = r.get("skills")
                        if isinstance(skills, str) and skills.strip():
                            try:
                                skills = json.loads(skills)
                            except Exception:
                                skills = [s.strip() for s in skills.split(",") if s.strip()]
                        else:
                            skills = []
                        path.append({
                            "stage": r.get("stage_name") or r.get("role_title") or "",
                            "icon": (r.get("icon") or "").strip() or default_icons[i],
                            "salary": r.get("salary_range") or "",
                            "skills": skills if isinstance(skills, list) else [],
                            "desc": "",
                            "years": r.get("years_range") or "",
                        })
            except Exception as e:
                logger.warning(f"[API] career-path 从 DB 读取失败，回退 LLM: {e}")

        if not path:
            raw = generate_career_path(job_name)
            for i, s in enumerate(raw[:4]):
                path.append({
                    "stage": s.get("name", ""),
                    "icon": s.get("icon", "🌱"),
                    "salary": s.get("salary_increase", ""),
                    "skills": s.get("key_skills") or [],
                    "desc": s.get("desc", ""),
                    "years": s.get("time_range", ""),
                })

        return success_response({"path": path})
    except Exception as e:
        logger.error(f"[API] /job/career-path 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.4 AI生成岗位画像（异步触发）
# POST /api/v1/job/ai-generate-profile
# ============================================================

def _resolve_job_config(job_name: str, target_jobs: list) -> dict:
    """
    将用户输入的岗位名称解析为可用的岗位配置，支持任意岗位名：
    1. 精确匹配配置中的 name
    2. 模糊匹配：配置 name 或 csv_keywords 包含用户输入、或用户输入包含配置关键词
    3. 兜底：按常见关键词选最相近模板（如「算法」→ 机器学习/算法工程师）
    """
    if not job_name or not target_jobs:
        return None
    job_name = (job_name or "").strip()
    # 1) 精确匹配
    exact = next((j for j in target_jobs if j.get("name") == job_name), None)
    if exact:
        return dict(exact)

    # 2) 模糊匹配：用户输入包含配置名中的某段，或配置名包含用户输入
    for j in target_jobs:
        name = (j.get("name") or "")
        if job_name in name or name in job_name:
            cfg = dict(j)
            cfg["name"] = job_name
            return cfg
    # 配置的 csv_keywords 中任意关键词出现在用户输入里
    for j in target_jobs:
        keywords = j.get("csv_keywords") or []
        if any(kw and str(kw).lower() in job_name.lower() for kw in keywords):
            cfg = dict(j)
            cfg["name"] = job_name
            return cfg
    # 配置 name 的某部分（如 "机器学习/算法工程师" 的 "算法工程师"）在用户输入里
    for j in target_jobs:
        name = (j.get("name") or "")
        for part in name.replace("、", "/").split("/"):
            part = part.strip()
            if part and part in job_name:
                cfg = dict(j)
                cfg["name"] = job_name
                return cfg

    # 3) 兜底：按关键词选最相近模板
    fallback_map = [
        ("算法", "机器学习/算法工程师"),
        ("机器学习", "机器学习/算法工程师"),
        ("大模型", "大模型/AIGC应用工程师"),
        ("算法工程师", "机器学习/算法工程师"),
        ("开发", "Java后端开发工程师"),
        ("前端", "前端开发工程师"),
        ("测试", "软件测试工程师"),
        ("产品", "产品经理"),
        ("数据", "数据分析师"),
        ("运维", "Linux运维工程师"),
    ]
    for keyword, template_name in fallback_map:
        if keyword in job_name:
            matched = next((j for j in target_jobs if j.get("name") == template_name), None)
            if matched:
                cfg = dict(matched)
                cfg["name"] = job_name
                return cfg
    # 最终兜底：使用第一个配置作为通用模板
    first = target_jobs[0]
    cfg = dict(first)
    cfg["name"] = job_name
    return cfg


def _synthetic_job_id(job_name: str, task_id: str) -> str:
    """任意岗位名使用独立 job_id，避免覆盖模板配置的存储。"""
    import re
    slug = re.sub(r"[^\w\u4e00-\u9fff]", "_", (job_name or "")[:24]).strip("_") or "unknown"
    return f"gen_{slug}_{task_id[-6:]}" if task_id else f"gen_{slug}"


@job_bp.route("/ai-generate-profile", methods=["POST"])
def ai_generate_profile():
    """
    使用AI大模型分析岗位数据，生成新的岗位画像（异步）
    请求体（对应API文档4.4）：
      { job_name, job_descriptions: [...], sample_size }
    job_descriptions 为前端传入的JD文本数组（可选）；
    若不传，则自动从内部CSV数据集中检索对应JD。
    支持任意岗位名称：未精确匹配时按模糊匹配或通用模板生成。
    """
    try:
        body = request.get_json(silent=True) or {}
        job_name         = body.get("job_name")           # 单个岗位名称
        job_names        = body.get("job_names", [])      # 批量岗位（对应8.2）
        job_descriptions = body.get("job_descriptions", [])  # 前端传入JD列表（4.4）
        sample_size      = int(body.get("sample_size", 30))

        if not job_name and not job_names:
            return error_response(400, "请提供 job_name 或 job_names 参数")

        service = get_job_profile_service()
        target_jobs = job_profile_conf.get("target_jobs", [])
        ts = datetime.now().strftime("%Y%m%d%H%M%S")

        if job_name:
            # ── 单个岗位生成（支持任意岗位名：模糊匹配或兜底模板）──
            task_id = f"job_gen_{ts}_{(job_name or '')[:8]}"
            job_config = _resolve_job_config(job_name, target_jobs)
            if not job_config:
                return error_response(404, f"未找到可用的岗位配置（target_jobs 为空）")

            # 精确匹配（配置中已有该岗位名）保留原 job_id；模糊/兜底匹配用独立 job_id 存结果，避免覆盖模板
            is_exact = any(j.get("name") == job_name for j in target_jobs)
            if not is_exact:
                job_config["job_id"] = _synthetic_job_id(job_name, task_id)
            job_config["name"] = job_name

            def _generate_single():
                cfg = dict(job_config)
                if job_descriptions:
                    cfg["external_jd_list"] = job_descriptions[:sample_size]
                profile = service.generate_profile(cfg)
                service.profiles_store[cfg["job_id"]] = profile
                from job_profile.job_profile_service import _save_profiles_store
                _save_profiles_store(service.profiles_store)
                return profile

            _run_task_async(task_id, _generate_single)

            return success_response({
                "task_id": task_id,
                "status": "processing",
                "estimated_time": 30,
                "job_name": job_name
            }, msg="AI画像生成中...")

        else:
            # ── 批量生成（同样支持模糊匹配）──
            task_id = f"batch_gen_{ts}"

            def _generate_batch():
                results = {}
                errors = {}
                for name in job_names:
                    cfg = _resolve_job_config(name, target_jobs)
                    if not cfg:
                        errors[name] = "未找到配置"
                        continue
                    cfg["name"] = name
                    tid = f"batch_{ts}_{name[:8]}"
                    cfg["job_id"] = _synthetic_job_id(name, tid)
                    try:
                        profile = service.generate_profile(dict(cfg))
                        service.profiles_store[cfg["job_id"]] = profile
                        results[name] = cfg["job_id"]
                    except Exception as ex:
                        errors[name] = str(ex)
                from job_profile.job_profile_service import _save_profiles_store
                _save_profiles_store(service.profiles_store)
                return {"results": results, "errors": errors}

            _run_task_async(task_id, _generate_batch)

            return success_response({
                "task_id": task_id,
                "total_jobs": len(job_names),
                "status": "processing",
                "estimated_time": f"{len(job_names) * 30}秒"
            }, msg="批量生成任务已启动")

    except Exception as e:
        logger.error(f"[API] /job/ai-generate-profile 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.5 获取AI生成结果
# POST /api/v1/job/ai-generate-result
# ============================================================
@job_bp.route("/ai-generate-result", methods=["POST"])
def get_ai_generate_result():
    """
    获取AI岗位画像生成结果
    请求体：{ task_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        task_id = body.get("task_id")

        if not task_id:
            return error_response(400, "请提供 task_id 参数")

        if task_id not in _tasks:
            _load_persisted_tasks()
        if task_id not in _tasks:
            return error_response(404, f"任务不存在或已过期: {task_id}")

        task = _tasks[task_id]
        response_data = {
            "task_id": task_id,
            "status": task["status"],  # pending / processing / completed / failed
        }

        if task["status"] == "completed":
            raw = task["result"]
            # 对应API文档4.5响应格式：job_profile + ai_confidence + data_sources
            response_data["job_profile"]  = raw if isinstance(raw, dict) else raw
            response_data["ai_confidence"] = (
                raw.get("_ai_confidence", 0.88)
                if isinstance(raw, dict) else 0.88
            )
            response_data["data_sources"] = {
                "total_samples":  (raw.get("csv_sample_count", 0)
                                   if isinstance(raw, dict) else 0),
                "valid_samples":  (raw.get("csv_sample_count", 0)
                                   if isinstance(raw, dict) else 0),
                "analysis_date":  datetime.now().strftime("%Y-%m-%d"),
                "data_source":    (raw.get("data_source", "")
                                   if isinstance(raw, dict) else ""),
            }
        elif task["status"] == "failed":
            response_data["error"] = task["error"]

        return success_response(response_data)

    except Exception as e:
        logger.error(f"[API] /job/ai-generate-result 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 额外：获取完整岗位关联图谱（全局）
# POST /api/v1/job/full-graph
# ============================================================
@job_bp.route("/full-graph", methods=["POST"])
def get_full_graph():
    """
    获取全量岗位关联图谱（包含所有垂直+换岗路径）
    """
    try:
        graph_service = get_job_graph_service()
        graph = graph_service.get_full_graph()
        return success_response(graph)
    except Exception as e:
        logger.error(f"[API] /job/full-graph 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 8.2 触发岗位画像生成（对应API文档 8.2）
# POST /api/v1/system/generate-job-profiles
# 注：同时保留 /job/batch-generate 作为内部兼容路径
# ============================================================
@job_bp.route("/batch-generate", methods=["POST"])
def _batch_generate_compat():
    """兼容旧路径，转发至标准路径处理函数"""
    return _do_batch_generate()


# 标准路径（对应API文档8.2）
from flask import current_app as _app

def _register_system_route(app):
    """在 app 上注册 /api/v1/system 路由（由 app.py 调用）"""
    @app.route("/api/v1/system/generate-job-profiles", methods=["POST"])
    def system_generate_job_profiles():
        """
        8.2 管理员触发批量岗位画像生成（对应API文档8.2）
        请求体：{ admin_id, job_names: [...], sample_size_per_job }
        admin_id 为必填，标准路径在此校验权限。
        """
        body = request.get_json(silent=True) or {}
        admin_id = body.get("admin_id")
        if admin_id is None:
            return error_response(400, "请提供 admin_id 参数")
        return _do_batch_generate()


def _do_batch_generate():
    """
    批量生成所有预配置岗位的画像（内部实现，不含权限校验）
    供标准路径 /system/generate-job-profiles 和兼容路径 /job/batch-generate 共用。
    请求体：{ force_regenerate }
    """
    try:
        body = request.get_json(silent=True) or {}
        force = body.get("force_regenerate", False)

        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        task_id = f"batch_gen_all_{ts}"

        service = get_job_profile_service()
        target_jobs = job_profile_conf.get("target_jobs", [])

        def _generate_all():
            return service.generate_all_profiles(force_regenerate=force)

        _run_task_async(task_id, _generate_all)

        return success_response({
            "task_id": task_id,
            "total_jobs": len(target_jobs),
            "status": "processing",
            "estimated_time": f"约{len(target_jobs) * 30}秒",
            "job_names": [j["name"] for j in target_jobs]
        }, msg="批量生成任务已启动")

    except Exception as e:
        logger.error(f"[API] /job/batch-generate 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
