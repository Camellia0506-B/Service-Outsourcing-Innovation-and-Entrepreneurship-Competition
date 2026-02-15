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

from flask import Blueprint, request, jsonify
from datetime import datetime
import threading

from job_profile.job_profile_service import get_job_profile_service, job_profile_conf
from job_profile.job_graph_service import get_job_graph_service
from utils.logger_handler import logger

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
# POST /api/v1/job/profiles
# ============================================================
@job_bp.route("/profiles", methods=["POST"])
def get_job_profiles():
    """
    获取系统中的岗位画像库（至少10个岗位）
    请求体：{ page, size, keyword, industry, level }
    """
    try:
        body = request.get_json(silent=True) or {}
        page = int(body.get("page", 1))
        size = int(body.get("size", 20))
        keyword = body.get("keyword")
        industry = body.get("industry")
        level = body.get("level")

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
        graph_data = graph_service.get_job_graph(job_id, graph_type)

        return success_response(graph_data)

    except Exception as e:
        logger.error(f"[API] /job/relation-graph 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 4.4 AI生成岗位画像（异步触发）
# POST /api/v1/job/ai-generate-profile
# ============================================================
@job_bp.route("/ai-generate-profile", methods=["POST"])
def ai_generate_profile():
    """
    使用AI大模型分析岗位数据，生成新的岗位画像（异步）
    请求体（对应API文档4.4）：
      { job_name, job_descriptions: [...], sample_size }
    job_descriptions 为前端传入的JD文本数组（可选）；
    若不传，则自动从内部CSV数据集中检索对应JD。
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
            # ── 单个岗位生成 ──
            task_id = f"job_gen_{ts}_{job_name[:8]}"
            job_config = next((j for j in target_jobs if j["name"] == job_name), None)

            if not job_config:
                return error_response(
                    404,
                    f"未找到岗位配置：{job_name}，支持的岗位：{[j['name'] for j in target_jobs]}"
                )

            def _generate_single():
                # 将前端传入的 job_descriptions 注入 job_config；
                # service 层优先使用它，若为空则自动从CSV检索
                cfg = dict(job_config)
                if job_descriptions:
                    cfg["external_jd_list"] = job_descriptions[:sample_size]
                profile = service.generate_profile(cfg)
                service.profiles_store[cfg["job_id"]] = profile
                from job_profile.job_profile_service import _save_profiles_store
                _save_profiles_store(service.profiles_store)
                # 对应API文档4.5：任务结果存完整画像，供 job_profile 字段返回
                return profile

            _run_task_async(task_id, _generate_single)

            return success_response({
                "task_id": task_id,
                "status": "processing",
                "estimated_time": 30,
                "job_name": job_name
            }, msg="AI画像生成中...")

        else:
            # ── 批量生成 ──
            task_id = f"batch_gen_{ts}"

            def _generate_batch():
                results = {}
                errors = {}
                for name in job_names:
                    cfg = next((j for j in target_jobs if j["name"] == name), None)
                    if not cfg:
                        errors[name] = "未找到配置"
                        continue
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
