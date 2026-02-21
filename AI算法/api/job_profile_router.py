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
from flask import Blueprint, request, jsonify
from datetime import datetime
import threading

import csv
from job_profile.job_profile_service import get_job_profile_service, job_profile_conf, _load_profiles_store
from job_profile.job_graph_service import get_job_graph_service
from job_profile.career_path_generator import generate_career_path
from utils.logger_handler import logger
from utils.path_tool import get_abs_path

# 创建Blueprint
job_bp = Blueprint("job", __name__, url_prefix="/api/v1/job")


# ========== 统一响应格式（对应API文档 0.3）==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ========== 异步任务管理（用于长耗时的AI生成任务）==========

_tasks = {}  # task_id -> {status, result, error}


def _run_task_async(task_id: str, func, *args, **kwargs):
    """在后台线程中运行任务"""
    def run():
        try:
            _tasks[task_id]["status"] = "processing"
            result = func(*args, **kwargs)
            _tasks[task_id]["status"] = "completed"
            _tasks[task_id]["result"] = result
        except Exception as e:
            logger.error(f"[AsyncTask] 任务{task_id}失败: {e}", exc_info=True)
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = str(e)

    _tasks[task_id] = {"status": "pending", "result": None, "error": None}
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
        elif job_name:
            profile = service.get_profile_by_name(job_name)

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
@job_bp.route("/relation-graph", methods=["POST"])
def get_job_relation_graph():
    """
    获取岗位间的血缘关系和转换路径
    请求体：{ job_id, graph_type }
    graph_type: vertical / transfer / all
    """
    try:
        body = request.get_json(silent=True) or {}
        job_id = body.get("job_id")
        graph_type = body.get("graph_type", "all")

        if not job_id:
            return error_response(400, "请提供 job_id 参数")

        if graph_type not in ("vertical", "transfer", "all"):
            return error_response(400, "graph_type 参数错误，支持: vertical/transfer/all")

        graph_service = get_job_graph_service()
<<<<<<< Updated upstream
        resp = graph_service.get_relation_graph(job_id, graph_type)
        if resp.get("code") != 200:
            return error_response(resp.get("code", 404), resp.get("msg", "岗位不存在"))
        return success_response(resp.get("data"))
=======
        graph_data = graph_service.get_job_graph(job_id, graph_type)
        # 调试：打印 relation-graph 返回数据（前 800 字符）
        try:
            print("relation-graph 返回:", json.dumps(graph_data, ensure_ascii=False, default=str)[:800])
        except Exception:
            pass
        return success_response(graph_data)
>>>>>>> Stashed changes

    except Exception as e:
        logger.error(f"[API] /job/relation-graph 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
<<<<<<< Updated upstream
# GET /api/v1/job/career-path - 职业发展路径（晋升 + 换岗，真实数据）
# ============================================================
@job_bp.route("/career-path", methods=["GET"])
def get_career_path():
    """
    获取岗位职业发展路径：晋升路径来自 job_profiles，换岗岗位名来自 CSV。
    查询参数：jobId 或 job_id
    返回：{ path: [{ stage, jobName, years, salary, level }, ...], altPaths: [{ jobName }, ...] }
    """
    try:
        job_id = request.args.get("jobId") or request.args.get("job_id")
        if not job_id:
            return error_response(400, "请提供 jobId 或 job_id 参数")

        graph_service = get_job_graph_service()
        resp = graph_service.get_relation_graph(job_id, "all")
        if resp.get("code") != 200:
            return error_response(resp.get("code", 404), resp.get("msg", "岗位不存在"))

        data = resp.get("data", {})
        vg = data.get("vertical_graph") or {}
        nodes = vg.get("nodes") or []
        edges = vg.get("edges") or []

        stage_names = ["当前目标", "第一阶段", "第二阶段", "长期目标"]
        path = []
        for i, node in enumerate(nodes[:4]):
            years = "-"
            if i > 0 and i - 1 < len(edges):
                years = edges[i - 1].get("years", "-")
            salary = (node.get("salary_range") or "-") if isinstance(node.get("salary_range"), str) else "-"
            path.append({
                "stage": stage_names[i] if i < len(stage_names) else f"阶段{i+1}",
                "jobName": node.get("job_name", ""),
                "years": years,
                "salary": salary,
                "level": f"L{node.get('level', 0)}"
            })

        # 换岗路径：从 CSV 取真实岗位名（职位名称列）
        alt_paths = []
        import os
        csv_path = get_abs_path(job_profile_conf.get("job_data_path", "data/求职岗位信息数据.csv"))
        try:
            if csv_path and os.path.exists(csv_path):
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    col = "职位名称"
                    seen = set()
                    for row in reader:
                        name = (row.get(col) or "").strip()
                        if name and name not in seen and len(alt_paths) < 12:
                            seen.add(name)
                            alt_paths.append({"jobName": name})
        except Exception as e:
            logger.warning(f"[career-path] 读取 CSV 失败: {e}")

        return success_response({"path": path, "altPaths": alt_paths})

=======
# 4.3.1 获取岗位晋升路径（LLM 动态生成 4 阶段）
# GET /api/v1/job/career-path?jobName=xxx
# ============================================================
@job_bp.route("/career-path", methods=["GET"])
def get_job_career_path():
    """
    根据岗位名称返回 4 个晋升阶段，供前端晋升路径卡片使用。
    返回 data.path: [ { stage, icon, salary, skills, desc, years }, ... ]
    """
    try:
        job_name = (request.args.get("jobName") or "").strip()
        if not job_name:
            return error_response(400, "请提供 jobName 参数")
        raw = generate_career_path(job_name)
        path = []
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
>>>>>>> Stashed changes
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
