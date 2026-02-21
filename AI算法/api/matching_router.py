"""
人岗匹配模块 API 路由
对应 API 文档第 6 章：Job Matching 模块

路由列表：
  POST /api/v1/matching/recommend-jobs    - 6.1 获取推荐岗位
  POST /api/v1/matching/analyze           - 6.2 获取单个岗位匹配分析
  POST /api/v1/matching/batch-analyze     - 6.3 批量匹配分析
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

from matching.matching_service import get_job_matching_service
from utils.logger_handler import logger

# 创建Blueprint
matching_bp = Blueprint("matching", __name__, url_prefix="/api/v1/matching")


# ========== 统一响应格式 ==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ============================================================
# 6.1 获取推荐岗位
# POST /api/v1/matching/recommend-jobs
# ============================================================
@matching_bp.route("/recommend-jobs", methods=["POST"])
def recommend_jobs():
    """
    基于学生能力画像，推荐匹配的岗位
    请求体：{ user_id, top_n, filters }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        top_n = body.get("top_n", 10)
        filters = body.get("filters", {})

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if top_n < 1 or top_n > 50:
            return error_response(400, "top_n 参数应在1-50之间")

        service = get_job_matching_service()
        result = service.recommend_jobs(user_id, top_n, filters)

        logger.info(f"[API] 为用户{user_id}推荐{len(result['recommendations'])}个岗位")
        
        return success_response(result)

    except ValueError as e:
        return error_response(404, str(e))
    except Exception as e:
        logger.error(f"[API] /matching/recommend-jobs 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 6.2 获取单个岗位匹配分析
# POST /api/v1/matching/analyze
# ============================================================
@matching_bp.route("/analyze", methods=["POST"])
def analyze_job():
    """
    分析学生与指定岗位的匹配情况
    请求体：{ user_id, job_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        job_id = body.get("job_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if not job_id:
            return error_response(400, "请提供 job_id 参数")

        service = get_job_matching_service()
        result = service.analyze_single_job(user_id, job_id)

        logger.info(f"[API] 用户{user_id}与岗位{job_id}匹配度: {result['match_score']}分")
        
        return success_response(result)

    except ValueError as e:
        return error_response(404, str(e))
    except Exception as e:
        logger.error(f"[API] /matching/analyze 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 6.3 批量匹配分析
# POST /api/v1/matching/batch-analyze
# ============================================================
@matching_bp.route("/batch-analyze", methods=["POST"])
def batch_analyze():
    """
    分析学生与多个岗位的匹配情况
    请求体：{ user_id, job_ids }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        job_ids = body.get("job_ids", [])

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if not job_ids or not isinstance(job_ids, list):
            return error_response(400, "请提供有效的 job_ids 数组")

        if len(job_ids) > 20:
            return error_response(400, "job_ids 数量不能超过20个")

        service = get_job_matching_service()
        result = service.batch_analyze(user_id, job_ids)

        logger.info(f"[API] 批量分析用户{user_id}与{len(job_ids)}个岗位的匹配")
        
        return success_response(result)

    except Exception as e:
        logger.error(f"[API] /matching/batch-analyze 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 辅助接口：匹配度统计
# ============================================================
@matching_bp.route("/statistics", methods=["POST"])
def get_matching_statistics():
    """
    获取匹配度统计信息
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        service = get_job_matching_service()
        
        # 推荐所有岗位，不限制数量
        all_matches = service.recommend_jobs(user_id, top_n=100, filters={})
        
        # 统计匹配度分布
        high_match = len([r for r in all_matches["recommendations"] if r["match_score"] >= 85])
        medium_match = len([r for r in all_matches["recommendations"] if 70 <= r["match_score"] < 85])
        low_match = len([r for r in all_matches["recommendations"] if r["match_score"] < 70])
        
        # 平均匹配度
        avg_score = sum([r["match_score"] for r in all_matches["recommendations"]]) / len(all_matches["recommendations"]) if all_matches["recommendations"] else 0
        
        statistics = {
            "total_jobs": all_matches["total_matched"],
            "high_match_count": high_match,
            "medium_match_count": medium_match,
            "low_match_count": low_match,
            "average_match_score": int(avg_score),
            "distribution": {
                "85-100分": high_match,
                "70-84分": medium_match,
                "0-69分": low_match
            }
        }
        
        return success_response(statistics)

    except Exception as e:
        logger.error(f"[API] /matching/statistics 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
