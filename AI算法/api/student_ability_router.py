"""
学生能力画像模块 API 路由
对应 API 文档第 5 章：Student Ability Profile 模块

路由列表：
  POST /api/v1/student/ability-profile        - 5.1 获取学生能力画像
  POST /api/v1/student/ai-generate-profile    - 5.2 AI生成学生能力画像
  POST /api/v1/student/update-profile         - 5.3 更新能力画像
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

from student_ability.ability_profile_service import get_student_ability_service
from utils.logger_handler import logger

# 创建Blueprint
student_bp = Blueprint("student", __name__, url_prefix="/api/v1/student")


# ========== 统一响应格式 ==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ============================================================
# 5.1 获取学生能力画像
# POST /api/v1/student/ability-profile
# ============================================================
@student_bp.route("/ability-profile", methods=["POST"])
def get_ability_profile():
    """
    获取学生的就业能力画像和评分
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        service = get_student_ability_service()
        profile = service.get_ability_profile(user_id)

        if not profile:
            return error_response(404, f"用户{user_id}的能力画像不存在，请先生成")

        return success_response(profile)

    except Exception as e:
        logger.error(f"[API] /student/ability-profile 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 5.2 AI生成学生能力画像
# POST /api/v1/student/ai-generate-profile
# ============================================================
@student_bp.route("/ai-generate-profile", methods=["POST"])
def ai_generate_profile():
    """
    使用AI分析学生档案，生成能力画像
    请求体：{ user_id, data_source }
    data_source: "profile" 或 "resume"
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        data_source = body.get("data_source", "profile")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if data_source not in ["profile", "resume"]:
            return error_response(400, "data_source 必须是 profile 或 resume")

        service = get_student_ability_service()
        
        # 生成画像（这里简化为同步，实际项目应该用异步任务）
        result = service.generate_ability_profile(user_id, data_source)

        if result["status"] == "completed":
            return success_response({
                "task_id": result["task_id"],
                "status": "completed",
                "profile": result["profile"]
            }, msg="能力画像生成成功")
        else:
            return error_response(500, f"生成失败: {result.get('error', '未知错误')}")

    except Exception as e:
        logger.error(f"[API] /student/ai-generate-profile 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 5.3 更新能力画像
# POST /api/v1/student/update-profile
# ============================================================
@student_bp.route("/update-profile", methods=["POST"])
def update_profile():
    """
    手动更新或补充能力画像信息
    请求体：{ user_id, updates }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        updates = body.get("updates", {})

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        if not updates:
            return error_response(400, "请提供 updates 参数")

        service = get_student_ability_service()
        result = service.update_ability_profile(user_id, updates)

        return success_response(result, msg="画像更新成功")

    except ValueError as e:
        return error_response(404, str(e))
    except Exception as e:
        logger.error(f"[API] /student/update-profile 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 辅助接口：批量生成（可选）
# ============================================================
@student_bp.route("/batch-generate", methods=["POST"])
def batch_generate_profiles():
    """
    批量生成多个用户的能力画像
    请求体：{ user_ids: [1, 2, 3, ...] }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_ids = body.get("user_ids", [])

        if not user_ids:
            return error_response(400, "请提供 user_ids 参数")

        service = get_student_ability_service()
        results = []

        for user_id in user_ids:
            try:
                result = service.generate_ability_profile(user_id)
                results.append({
                    "user_id": user_id,
                    "status": result["status"],
                    "total_score": result.get("profile", {}).get("overall_assessment", {}).get("total_score", 0)
                })
            except Exception as e:
                results.append({
                    "user_id": user_id,
                    "status": "failed",
                    "error": str(e)
                })

        return success_response({
            "total": len(user_ids),
            "succeeded": len([r for r in results if r["status"] == "completed"]),
            "failed": len([r for r in results if r["status"] == "failed"]),
            "details": results
        })

    except Exception as e:
        logger.error(f"[API] /student/batch-generate 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
