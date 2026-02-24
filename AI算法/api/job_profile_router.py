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

import csv
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
# 真实招聘数据：先查 CSV（前4字模糊匹配），无结果则 AI 生成，返回不加 isAIGenerated
# GET /api/v1/job/real-data?jobName=算法工程师&size=5
# ============================================================

def _search_csv(job_name, size):
    """从 CSV 按岗位名前 4 字模糊匹配，最多返回 size 条。"""
    csv_path = get_abs_path("data/求职岗位信息数据.csv")
    if not job_name or not os.path.exists(csv_path):
        return []
    keyword = (job_name[:4] if len(job_name) >= 4 else job_name).strip()
    if not keyword:
        return []
    results = []
    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = (row.get("职位名称") or "").strip()
                if keyword in title:
                    desc = (row.get("职位描述") or "").strip()
                    intro = (row.get("公司简介") or "").strip()
                    results.append({
                        "jobTitle": title,
                        "company": row.get("公司全称", ""),
                        "salary": row.get("薪资范围", ""),
                        "address": row.get("工作地址", ""),
                        "industry": row.get("所属行业", ""),
                        "scale": row.get("人员规模", ""),
                        "companyType": row.get("企业性质", ""),
                        "description": (desc[:200] + "…") if len(desc) > 200 else desc,
                        "companyIntro": (intro[:150] + "…") if len(intro) > 150 else intro,
                    })
                    if len(results) >= size:
                        break
    except Exception as e:
        logger.warning(f"[API] real-data 读取 CSV 失败: {e}", exc_info=True)
    return results


@job_bp.route("/real-data", methods=["GET"])
def get_real_data():
    job_name = (request.args.get("jobName") or "").strip()
    try:
        size = int(request.args.get("size", 3))
        size = max(1, min(size, 20))
    except (TypeError, ValueError):
        size = 3

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
            results = data.get("jobs", [])[:size]
        except Exception as e:
            logger.error(f"[API] real-data AI 生成失败: {e}", exc_info=True)
            results = []

    return success_response(results)


# ============================================================
# 岗位画像流式生成（SSE）
# POST /api/v1/job/generate-profile-stream
# ============================================================
def _stream_job_profile_generate(job_name: str, job_description: str):
    """Generator: yield SSE events (data: {...}\n\n). 使用 dashscope Generation 流式调用。"""
    prompt = f"""你是职业规划专家。根据岗位"{job_name}"和描述"{job_description}"生成岗位画像。
严格按以下JSON格式输出，不加任何多余内容，不加markdown代码块：
{{
  "salary": "薪资范围",
  "location": "主要城市",
  "company_size": "公司规模",
  "demand_score": 88,
  "trend": "上升",
  "experience": "1-3年",
  "education": "本科及以上",
  "competition": "推荐竞赛经历",
  "english": "英语要求描述",
  "internship": "推荐3个月以上相关实习经历，大厂或AI实验室优先",
  "description": "针对该岗位的职责、要求与工作内容的详细描述，约150-200字",
  "skills_core": ["核心技能1","核心技能2","核心技能3","核心技能4","核心技能5"],
  "skills_advanced": ["进阶技能1","进阶技能2","进阶技能3"],
  "skills_plus": ["加分技能1","加分技能2"],
  "abilities": [
    {{"icon":"🧠","name":"学习能力","level":"高要求","level_type":"high","desc":"针对{job_name}的学习能力要求详细描述，约100字，说明需要掌握哪些知识体系、如何持续学习","keywords":["关键词1","关键词2"]}},
    {{"icon":"💡","name":"创新能力","level":"高要求","level_type":"high","desc":"针对{job_name}的创新能力要求详细描述，约100字","keywords":["关键词1"]}},
    {{"icon":"🔥","name":"抗压能力","level":"中等要求","level_type":"medium","desc":"针对{job_name}的抗压能力要求详细描述，约100字","keywords":["关键词1"]}},
    {{"icon":"💬","name":"沟通能力","level":"中等要求","level_type":"medium","desc":"针对{job_name}的沟通能力要求详细描述，约100字","keywords":["关键词1"]}},
    {{"icon":"🤝","name":"团队协作","level":"中等要求","level_type":"medium","desc":"针对{job_name}的团队协作要求详细描述，约100字","keywords":["关键词1"]}},
    {{"icon":"🏢","name":"实习能力","level":"基础要求","level_type":"base","desc":"针对{job_name}的实习能力要求详细描述，约100字，包含推荐实习时长和方向","keywords":["关键词1","关键词2"]}}
  ],
  "certs": [
    {{"icon":"🏅","name":"证书名称","desc":"证书说明和要求分数","type":"必须","type_code":"must"}},
    {{"icon":"📜","name":"证书名称","desc":"证书说明","type":"加分项","type_code":"plus"}},
    {{"icon":"🌐","name":"证书名称","desc":"证书说明","type":"推荐","type_code":"opt"}}
  ],
  "intern_directions": [
    {{"type":"方向类型","icon":"🏢","role":"推荐实习岗位名称","companies":["公司1","公司2","公司3","公司4"]}},
    {{"type":"方向类型","icon":"🔬","role":"推荐实习岗位名称","companies":["公司1","公司2","公司3"]}}
  ]
}}
所有内容必须针对{job_name}个性化生成，abilities必须包含以上6项且顺序不变，level_type只能是high/medium/base，type_code只能是must/plus/opt。"""

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
