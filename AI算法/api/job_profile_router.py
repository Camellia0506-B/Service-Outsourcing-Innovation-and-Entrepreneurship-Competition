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
            model_name = (rag_conf or {}).get("chat_model_name", "qwen3-max")
            model = ChatTongyi(model=model_name)
            template = PromptTemplate.from_template(
                _JOB_AGENT_SYSTEM_PROMPT
                + "\n\n用户输入：{user_text}\n\n只输出JSON："
            )
            chain = template | model | StrOutputParser()
            raw = chain.invoke({"user_text": text})
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
    """从缓存的 DataFrame 按岗位名模糊匹配，最多返回 size 条；含岗位编码、来源地址。"""
    if not job_name or not job_name.strip():
        return []
    keyword = (job_name[:4] if len(job_name) >= 4 else job_name).strip()
    if not keyword:
        return []
    df = get_cached_data()
    if df.empty:
        return []
    # 列名兼容：a13 为 岗位名称/地址/公司名称/岗位详情/公司详情/岗位编码/岗位来源地址 等
    name_col = "岗位名称" if "岗位名称" in df.columns else "职位名称"
    if name_col not in df.columns:
        return []
    try:
        mask = df[name_col].astype(str).str.contains(keyword, na=False, regex=False)
        filtered = df.loc[mask].head(size)
    except Exception as e:
        logger.warning(f"[real-data] 筛选异常: {e}", exc_info=True)
        return []
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
    return results


@job_bp.route("/real-data", methods=["GET"])
def get_real_data():
    job_name = (request.args.get("jobName") or "").strip()
    try:
        size = int(request.args.get("size", 30))
        size = max(1, min(size, 100))
    except (TypeError, ValueError):
        size = 30

    results = _search_csv(job_name, size)

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
                model="qwen3-max",
                messages=[{"role": "user", "content": prompt}],
                result_format="message",
            )
            content = (response.output.choices[0].message.content or "").strip()
            content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            jobs = data.get("jobs", [])[:size]
            results = []
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

    return success_response(results)


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
    """Generator: yield SSE events (data: {...}\n\n). 使用 dashscope Generation 流式调用。"""
    prompt = f"""你是职业规划专家。根据岗位「{job_name}」和描述「{job_description}」生成岗位画像。

【重要】差异化要求，避免与其它岗位雷同：
- 学历(education)、经验(experience)：根据该岗位实际要求写，可写大专及以上/本科及以上/硕士优先、应届生/1-3年/3-5年等，不同岗位要有区别。
- 竞赛加分(competition)：必须写与该岗位直接相关的竞赛名称，不要写“推荐竞赛经历”等笼统句。例如：软件测试→全国大学生软件测试大赛、中国软件杯、蓝桥杯软件测试赛项；实施/运维→华为ICT大赛、全国大学生计算机设计大赛、蓝桥杯；算法/研发→天池、Kaggle、中国软件杯；前端/后端→蓝桥杯、ACM、中国高校计算机大赛等。
- 实习要求(internship)：针对该岗位写具体时长与方向，不要所有岗位都用“推荐3个月以上相关实习经历，大厂或AI实验室优先”；可写该岗位更看重的实习类型（如测试岗强调测试/质量实习，实施岗强调项目交付实习）。
- 工作地点(location)：写该岗位招聘量大的3～5个城市，用顿号或逗号分隔；技术研发多为北上深杭成，实施/交付可含更多二线，测试/运维可侧重一线与省会。
- 公司规模(company_size)：用一句话概括目标企业类型，如“中小型科技公司及大型互联网企业”“中大型企业(200人以上)或科技型中小企业”等，与岗位类型匹配。
- 岗位描述(description)：写职责、工作内容与角色定位，约150～200字；不要与下方 skills_core 简单重复同一批关键词，描述侧重“做什么、和谁协作、产出什么”。
- 综合能力(abilities)：每条 desc 必须针对「{job_name}」具体化，说明在该岗位上为何需要该能力、如何体现，避免各岗位用同一套话术；keywords 用该岗位相关术语。

严格按以下JSON格式输出，不加任何多余内容，不加markdown代码块：
{{
  "salary": "根据岗位写薪资范围，如8K-20K或6K-15K",
  "location": "3～5个该岗位招聘量大的城市，顿号或逗号分隔",
  "company_size": "与该岗位匹配的公司规模描述",
  "demand_score": 75～95之间的整数，不同岗位可不同,
  "trend": "上升或稳定或下降",
  "experience": "针对该岗位的经验要求，如应届生/1-3年/3-5年",
  "education": "针对该岗位的学历要求，如大专及以上/本科及以上/硕士优先",
  "competition": "与该岗位直接相关的竞赛名称与加分说明，具体到赛事名",
  "english": "该岗位的英语要求，若无则写暂无或四级即可",
  "internship": "针对该岗位的实习时长与方向，具体化",
  "description": "职责与工作内容描述，不与skills_core重复罗列",
  "skills_core": ["该岗位核心技能1","核心技能2","核心技能3","核心技能4","核心技能5"],
  "skills_advanced": ["进阶技能1","进阶技能2","进阶技能3"],
  "skills_plus": ["加分技能1","加分技能2"],
  "abilities": [
    {{"icon":"🧠","name":"学习能力","level":"高/中/基础要求其一","level_type":"high/medium/base","desc":"针对{job_name}为何需要、如何体现学习能力，约80字","keywords":["该岗位相关词"]}},
    {{"icon":"💡","name":"创新能力","level":"高/中/基础要求","level_type":"high/medium/base","desc":"针对{job_name}的创新能力要求，具体化","keywords":["相关词"]}},
    {{"icon":"🔥","name":"抗压能力","level":"高/中/基础要求","level_type":"high/medium/base","desc":"针对{job_name}的抗压场景与要求，具体化","keywords":["相关词"]}},
    {{"icon":"💬","name":"沟通能力","level":"高/中/基础要求","level_type":"high/medium/base","desc":"针对{job_name}的沟通对象与要求，具体化","keywords":["相关词"]}},
    {{"icon":"🤝","name":"团队协作","level":"高/中/基础要求","level_type":"high/medium/base","desc":"针对{job_name}的协作场景，具体化","keywords":["相关词"]}},
    {{"icon":"🏢","name":"实习能力","level":"高/中/基础要求","level_type":"high/medium/base","desc":"针对{job_name}的实习时长与方向建议，具体化","keywords":["相关词"]}}
  ],
  "certs": [
    {{"icon":"🏅","name":"与该岗位相关的证书名","desc":"说明与要求","type":"必须","type_code":"must"}},
    {{"icon":"📜","name":"证书名称","desc":"说明","type":"加分项","type_code":"plus"}},
    {{"icon":"🌐","name":"证书名称","desc":"说明","type":"推荐","type_code":"opt"}}
  ],
  "intern_directions": [
    {{"type":"与该岗位相关的方向","icon":"🏢","role":"推荐实习岗位名","companies":["公司类型或代表企业"]}},
    {{"type":"方向类型","icon":"🔬","role":"推荐实习岗位名","companies":["公司1","公司2"]}}
  ]
}}
abilities 必须包含以上6项且顺序不变，level_type 只能是 high/medium/base，type_code 只能是 must/plus/opt。所有字段值必须针对「{job_name}」生成，不要与其它岗位通用化。"""

    try:
        from dashscope import Generation
        response = Generation.call(
            model="qwen3-max",
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
            stream=True,
        )
        for chunk in response:
            content = ""
            if getattr(chunk, "output", None) and getattr(chunk.output, "choices", None):
                choices = chunk.output.choices
                if choices and len(choices) > 0:
                    msg = getattr(choices[0], "message", None)
                    if msg is not None:
                        content = getattr(msg, "content", None) or ""
            if content:
                yield f"data: {_json.dumps({'text': content}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"[API] generate-profile-stream 异常: {e}", exc_info=True)
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
        job_description = (body.get("job_description") or "").strip() or ""

        def stream_generator():
            for chunk in _stream_job_profile_generate(job_name, job_description):
                yield chunk

        return Response(
            stream_generator(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )
    except Exception as e:
        logger.error(f"[API] /job/generate-profile-stream 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 获取行业列表（供前端筛选下拉动态加载）
# GET /api/v1/job/industries
# ============================================================
@job_bp.route("/industries", methods=["GET"])
def get_job_industries():
    """返回所有岗位中的去重行业列表"""
    try:
        service = get_job_profile_service()
        industries = service.get_industries()
        return success_response({"industries": industries})
    except Exception as e:
        logger.error(f"[API] /job/industries 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.2 获取岗位详细画像
# POST /api/v1/job/profile/detail
# ============================================================
def _minimal_profile_from_target_jobs(job_id_or_name):
    """当 store 中无该岗位时，用 target_jobs 配置兜底，避免「岗位画像」按钮 404。与真实数据接口互独立。"""
    target = job_profile_conf.get("target_jobs", [])
    job_id_or_name = (job_id_or_name or "").strip()
    if not job_id_or_name:
        return None
    for j in target:
        if j.get("job_id") == job_id_or_name or (j.get("name") or "").strip() == job_id_or_name:
            name = j.get("name", "")
            level_map = {1: "实习/助理", 2: "初级", 3: "中级", 4: "高级", 5: "架构师", 6: "总监"}
            level = level_map.get(j.get("layer_level"), "中级")
            return {
                "job_id": j.get("job_id", ""),
                "job_name": name,
                "basic_info": {
                    "industry": j.get("category", "互联网/AI"),
                    "level": level,
                    "level_range": [level],
                    "avg_salary": "面议",
                    "work_locations": [],
                    "company_scales": [],
                    "description": f"该岗位暂无详细画像，可在「AI生成」页输入「{name}」生成完整画像。",
                },
                "market_analysis": {"demand_score": 80, "growth_trend": "上升"},
                "description": f"来自岗位配置：{name}（{j.get('category', '')}）。点击 AI 生成可获取完整画像。",
            }
    for j in target:
        if job_id_or_name in (j.get("name") or ""):
            return _minimal_profile_from_target_jobs(j.get("name"))
    return None


@job_bp.route("/profile/detail", methods=["POST"])
def get_job_profile_detail():
    """
    获取单个岗位的完整详细画像
    请求体：{ job_id } 或 { job_name }
    """
    try:
        body = request.get_json(silent=True) or {}
        job_id = body.get("job_id")
        job_name = body.get("job_name")

        if not job_id and not job_name:
            return error_response(400, "请提供 job_id 或 job_name 参数")

        service = get_job_profile_service()
        profile = None

        if job_id:
            profile = service.get_profile_detail(job_id)
        if not profile and job_name:
            profile = service.get_profile_by_name(job_name)
        if not profile and job_id:
            profile = service.get_profile_by_name(job_id)

        # 若仍无画像（如列表来自精选配置 job_001 但 store 来自 CSV），用 target_jobs 兜底，避免 404
        if not profile:
            profile = _minimal_profile_from_target_jobs(job_id or job_name)

        if not profile:
            return error_response(404, f"未找到岗位画像：{job_id or job_name}")

        return success_response(profile)

    except Exception as e:
        logger.error(f"[API] /job/profile/detail 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.3 获取岗位关联图谱
# POST /api/v1/job/relation-graph
# ============================================================
def _empty_graph_data(center_job_id=None, message="暂无数据"):
    """返回前端期望的空图谱结构，避免空响应或缺失字段导致加载失败"""
    return {
        "center_job": {"job_id": center_job_id or "", "job_name": "", "level": 0, "salary_range": "", "avg_salary": "", "demand_score": None},
        "vertical_graph": {"nodes": [], "edges": [], "track_name": "", "message": message},
        "transfer_graph": {"nodes": [], "edges": [], "message": message},
        "career_path": {"promotion_path": []},
    }


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
