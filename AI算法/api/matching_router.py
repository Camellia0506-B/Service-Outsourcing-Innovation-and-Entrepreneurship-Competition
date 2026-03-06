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
    基于学生能力画像，推荐匹配的岗位（分页）
    请求体：{ user_id, pageNum?, pageSize?, filters?, ability_profile? }
    - pageNum: 页码（从1开始，默认1）
    - pageSize: 每页条数（默认20，最大50）
    ability_profile: 可选，由 Java 传入的能力画像，有则优先使用

    返回：
    {
      "total_count": 123,
      "page_num": 1,
      "page_size": 20,
      "jobs": [ ... 当前页推荐岗位 ... ]
    }
    """
    try:
        import time
        t0 = time.time()
        body = request.get_json(silent=True) or {}
        logger.info("[API] /matching/recommend-jobs 请求进入, user_id=%s", body.get("user_id"))
        user_id = body.get("user_id")
        # 兼容旧字段 top_n，但优先使用 pageNum/pageSize
        page_num = int(body.get("pageNum") or body.get("page_num") or 1)
        page_size = int(body.get("pageSize") or body.get("page_size") or body.get("top_n") or 20)
        filters = body.get("filters", {})
        ability_profile = body.get("ability_profile")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if page_num < 1:
            page_num = 1
        if page_size < 1:
            page_size = 20
        if page_size > 50:
            return error_response(400, "pageSize 参数应在1-50之间")

        # 为减少一次性计算量，仅取到当前页为止的 TopK
        top_n = page_num * page_size
        try:
            t1 = time.time()
            service = get_job_matching_service()
            logger.info("[API] get_job_matching_service 耗时 %.2fs", time.time() - t1)
            t2 = time.time()
            result = service.recommend_jobs(user_id, top_n, filters, ability_profile=ability_profile)
            logger.info("[API] recommend_jobs 计算耗时 %.2fs", time.time() - t2)
        except ValueError as ve:
            logger.info("[API] /matching/recommend-jobs 业务校验: %s", ve)
            return error_response(400, str(ve))
        except Exception as svc_err:
            logger.warning(f"[API] /matching/recommend-jobs 匹配服务不可用，返回空列表: {svc_err}")
            return success_response({
                "total_count": 0,
                "page_num": page_num,
                "page_size": page_size,
                "jobs": [],
            })

        recs = result.get("recommendations") or result.get("jobs") or []
        total = int(result.get("total_matched", len(recs)))
        start = (page_num - 1) * page_size
        end = start + page_size
        page_items = recs[start:end]

        data = {
            "total_count": total,
            "page_num": page_num,
            "page_size": page_size,
            "jobs": page_items,
        }

        logger.info(f"[API] 为用户{user_id}推荐岗位：page={page_num}, size={page_size}, total={total}")
        return success_response(data)

    except ValueError as e:
        return error_response(400, str(e))
    except Exception as e:
        logger.error(f"[API] /matching/recommend-jobs 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 6.x 语义岗位搜索（Embedding + FAISS）
# POST /api/v1/matching/search-jobs
# ============================================================
@matching_bp.route("/search-jobs", methods=["POST"])
def search_jobs():
    """
    使用语义搜索获取岗位列表（分页）。
    请求体：{ keyword?, pageNum?, pageSize?, filters? }
    - pageNum: 页码（从1开始，默认1）
    - pageSize: 每页条数（默认20，最大50）

    返回：
    {
      "total_count": 123,
      "page_num": 1,
      "page_size": 20,
      "jobs": [{ job_id, job_name, industry, level, avg_salary, tags, semantic_score }]
    }
    """
    try:
        body = request.get_json(silent=True) or {}
        keyword = body.get("keyword", "") or ""
        page_num = int(body.get("pageNum") or body.get("page_num") or 1)
        page_size = int(body.get("pageSize") or body.get("page_size") or body.get("top_n") or 20)
        filters = body.get("filters", {}) or {}

        if page_num < 1:
            page_num = 1
        if page_size < 1:
            page_size = 20
        if page_size > 50:
            return error_response(400, "pageSize 参数应在1-50之间")

        service = get_job_matching_service()
        # 为了让前端有多页可翻，这里不再按「pageNum * pageSize」裁剪，
        # 而是一次性取固定上限的 TopK，再在路由层做分页。
        # 对当前数据量，200 条足够覆盖主要岗位，同时避免一次性全量遍历过慢。
        top_n = max(200, page_size * 10)
        result = service.search_jobs(keyword, top_n, filters)

        jobs = result.get("jobs") or []
        total = int(result.get("total", len(jobs)))
        start = (page_num - 1) * page_size
        end = start + page_size
        page_items = jobs[start:end]

        data = {
            "total_count": total,
            "page_num": page_num,
            "page_size": page_size,
            "jobs": page_items,
        }

        logger.info(f"[API] 语义搜索岗位，keyword='{keyword}', page={page_num}, size={page_size}, total={total}")
        return success_response(data)

    except Exception as e:
        logger.error(f"[API] /matching/search-jobs 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 6.x 语义岗位搜索（岗位归类视图）
# POST /api/v1/matching/search-jobs-grouped
# ============================================================
@matching_bp.route("/search-jobs-grouped", methods=["POST"])
def search_jobs_grouped():
    """
    「主动探索」岗位归类视图（热度排序）：
    请求体：{ keyword?, pageNum?, pageSize?, filters? }
    - pageNum: 页码（从1开始，默认1）
    - pageSize: 每页岗位种类数（默认5，最大100）

    返回：
    {
      "total_group_count": 123,
      "page_num": 1,
      "page_size": 30,
      "groups": [
        {
          "job_name": "...",
          "company_count": 47,
          "tags": ["新能源", "电力/热力", "工业自动化"],
          "salary_range": { "min": 5000, "max": 14000 },
          "companies": [
            { "job_id": "...", "company": "...", "industry": "...", "avg_salary": "...", "match_score": null }
          ]
        }
      ]
    }
    """
    try:
        body = request.get_json(silent=True) or {}
        keyword = body.get("keyword", "") or ""
        user_id = body.get("user_id")
        ability_profile = body.get("ability_profile")
        page_num = int(body.get("pageNum") or body.get("page_num") or 1)
        page_size = int(body.get("pageSize") or body.get("page_size") or 5)
        filters = body.get("filters", {}) or {}

        if page_num < 1:
            page_num = 1
        if page_size < 1:
            page_size = 5
        if page_size > 100:
            return error_response(400, "pageSize 参数应在1-100之间")

        service = get_job_matching_service()
        result = service.search_jobs_grouped(
            keyword,
            page_num=page_num,
            page_size=page_size,
            filters=filters,
            user_id=user_id,
            ability_profile=ability_profile,
        )

        logger.info(f"[API] 岗位归类搜索，keyword='{keyword}', page={page_num}, size={page_size}, groups={result.get('total_group_count', 0)}")
        return success_response(result)

    except Exception as e:
        logger.error(f"[API] /matching/search-jobs-grouped 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 6.2 获取单个岗位匹配分析
# POST /api/v1/matching/analyze
# ============================================================
@matching_bp.route("/analyze", methods=["POST"])
def analyze_job():
    """
    分析学生与指定岗位的匹配情况
    请求体：{ user_id, job_id [, ability_profile] }
    ability_profile: 可选，由 Java 传入的能力画像数据，有则优先使用（避免本地存储不同步）
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        job_id = body.get("job_id")
        ability_profile = body.get("ability_profile")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if not job_id:
            return error_response(400, "请提供 job_id 参数")

        service = get_job_matching_service()
        result = service.analyze_single_job(user_id, job_id, ability_profile=ability_profile)

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
        ability_profile = body.get("ability_profile")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if not job_ids or not isinstance(job_ids, list):
            return error_response(400, "请提供有效的 job_ids 数组")

        if len(job_ids) > 20:
            return error_response(400, "job_ids 数量不能超过20个")

        service = get_job_matching_service()
        result = service.batch_analyze(user_id, job_ids, ability_profile=ability_profile)

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
