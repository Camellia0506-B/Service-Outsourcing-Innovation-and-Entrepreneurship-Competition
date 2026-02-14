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
    请求体：{ job_name, sample_size } 或 { job_names, sample_size_per_job }（批量）
    """
    try:
        body = request.get_json(silent=True) or {}
        job_name = body.get("job_name")          # 单个岗位
        job_names = body.get("job_names", [])    # 批量岗位（对应API文档8.2）
        sample_size = int(body.get("sample_size", 30))

        if not job_name and not job_names:
            return error_response(400, "请提供 job_name 或 job_names 参数")

        service = get_job_profile_service()
        target_jobs = job_profile_conf.get("target_jobs", [])

        # 生成任务ID
        ts = datetime.now().strftime("%Y%m%d%H%M%S")

        if job_name:
            # 单个岗位生成
            task_id = f"job_gen_{ts}_{job_name[:8]}"
            job_config = next((j for j in target_jobs if j["name"] == job_name), None)

            if not job_config:
                return error_response(404, f"未找到岗位配置：{job_name}，支持的岗位：{[j['name'] for j in target_jobs]}")

            def _generate_single():
                profile = service.generate_profile(job_config)
                service.profiles_store[job_config["job_id"]] = profile
                from job_profile.job_profile_service import _save_profiles_store
                _save_profiles_store(service.profiles_store)
                return {"job_id": job_config["job_id"], "job_name": job_name}

            _run_task_async(task_id, _generate_single)

            return success_response({
                "task_id": task_id,
                "status": "processing",
                "estimated_time": 30,
                "job_name": job_name
            }, msg="AI画像生成中...")

        else:
            # 批量生成（对应API文档8.2）
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
                        profile = service.generate_profile(cfg)
                        service.profiles_store[cfg["job_id"]] = profile
                        results[name] = cfg["job_id"]
                    except Exception as ex:
                        errors[name] = str(ex)
                from job_profile.job_profile_service import _save_profiles_store
                if isinstance(service.profiles_store, dict):
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
            response_data["result"] = task["result"]
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
# 系统触发批量生成（对应API文档 8.2 /system/generate-job-profiles）
# POST /api/v1/job/batch-generate
# ============================================================
@job_bp.route("/batch-generate", methods=["POST"])
def batch_generate_profiles():
    """
    批量生成所有预配置岗位的画像
    对应 /system/generate-job-profiles（权限验证由外层中间件处理）
    请求体：{ force_regenerate: bool }
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
