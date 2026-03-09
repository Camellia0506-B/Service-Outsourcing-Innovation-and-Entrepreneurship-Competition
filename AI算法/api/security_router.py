"""
安全与隐私设置模块 API 路由
对应 API 文档第 14 章：Security & Privacy 模块

路由列表：
  PUT  /api/v1/security/privacy/consent - 14.1 更新数据隐私同意设置
  GET  /api/v1/security/privacy/consent - 获取用户隐私设置
  GET  /api/v1/security/access/logs      - 获取数据访问日志
"""

import os
import json
from datetime import datetime

from flask import Blueprint, request, jsonify

from utils.logger_handler import logger
from utils.path_tool import get_abs_path

# 创建Blueprint
security_bp = Blueprint("security", __name__, url_prefix="/api/v1/security")

# 隐私设置数据存储路径
PRIVACY_DATA_PATH = get_abs_path("data/privacy_settings")
os.makedirs(PRIVACY_DATA_PATH, exist_ok=True)


# ========== 统一响应格式（对应API文档 0.3）==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


def _get_privacy_file_path(user_id):
    """获取用户隐私设置文件路径"""
    return os.path.join(PRIVACY_DATA_PATH, f"privacy_{user_id}.json")


def _load_privacy_settings(user_id):
    """加载用户隐私设置，如果不存在则返回默认值"""
    file_path = _get_privacy_file_path(user_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[Security] 加载隐私设置失败 user_id={user_id}: {e}")
    # 默认隐私设置
    return {
        "user_id": user_id,
        "consents": {
            "resume_visible_to_hr": False,
            "allow_hr_contact": False,
            "allow_algorithm_optimization": True,
            "allow_research": False,
            "data_retention_years": 3
        },
        "updated_at": None
    }


def _save_privacy_settings(user_id, settings):
    """保存用户隐私设置"""
    file_path = _get_privacy_file_path(user_id)
    settings["updated_at"] = datetime.now().isoformat()
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"[Security] 保存隐私设置失败 user_id={user_id}: {e}")
        return False


# ============================================================
# 14.1 更新数据隐私同意设置
# PUT /api/v1/security/privacy/consent
# ============================================================
@security_bp.route("/privacy/consent", methods=["PUT"])
def update_privacy_consent():
    """
    更新用户数据隐私同意设置
    请求体：{ user_id, consents: { resume_visible_to_hr, allow_hr_contact, ... } }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        consents = body.get("consents")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not consents or not isinstance(consents, dict):
            return error_response(400, "请提供有效的 consents 参数")

        # 加载现有设置
        settings = _load_privacy_settings(user_id)
        
        # 更新同意设置
        allowed_fields = [
            "resume_visible_to_hr",
            "allow_hr_contact",
            "allow_algorithm_optimization",
            "allow_research",
            "data_retention_years"
        ]
        
        for field in allowed_fields:
            if field in consents:
                settings["consents"][field] = consents[field]
        
        # 保存设置
        success = _save_privacy_settings(user_id, settings)
        
        if success:
            return success_response({
                "user_id": user_id,
                "consents": settings["consents"],
                "consents_updated": True,
                "updated_at": settings["updated_at"]
            }, msg="隐私设置更新成功")
        else:
            return error_response(500, "保存隐私设置失败")

    except Exception as e:
        logger.error(f"[API] /security/privacy/consent 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 获取用户隐私设置
# GET /api/v1/security/privacy/consent
# ============================================================
@security_bp.route("/privacy/consent", methods=["GET"])
def get_privacy_consent():
    """
    获取用户隐私设置
    查询参数：user_id
    """
    try:
        user_id = request.args.get("user_id")
        
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        settings = _load_privacy_settings(user_id)
        
        return success_response({
            "user_id": settings["user_id"],
            "consents": settings["consents"],
            "updated_at": settings["updated_at"]
        })

    except Exception as e:
        logger.error(f"[API] /security/privacy/consent GET 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 获取数据访问日志
# GET /api/v1/security/access/logs
# ============================================================
@security_bp.route("/access/logs", methods=["GET"])
def get_access_logs():
    """
    获取用户数据访问日志
    查询参数：user_id, limit(可选, 默认20)
    """
    try:
        user_id = request.args.get("user_id")
        limit = int(request.args.get("limit", 20))
        
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        # 访问日志存储路径
        log_file_path = os.path.join(PRIVACY_DATA_PATH, f"access_logs_{user_id}.json")
        
        logs = []
        if os.path.exists(log_file_path):
            try:
                with open(log_file_path, "r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception as e:
                logger.warning(f"[Security] 加载访问日志失败 user_id={user_id}: {e}")
        
        # 按时间倒序排列，限制数量
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        logs = logs[:limit]
        
        return success_response({
            "user_id": user_id,
            "logs": logs,
            "total": len(logs)
        })

    except Exception as e:
        logger.error(f"[API] /security/access/logs 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 记录数据访问（内部函数，供其他模块调用）
# ============================================================
def log_data_access(user_id, access_type, accessor_info=None):
    """
    记录数据访问事件
    """
    try:
        log_file_path = os.path.join(PRIVACY_DATA_PATH, f"access_logs_{user_id}.json")
        
        # 加载现有日志
        logs = []
        if os.path.exists(log_file_path):
            try:
                with open(log_file_path, "r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception as e:
                logger.warning(f"[Security] 加载访问日志失败: {e}")
        
        # 添加新日志
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "access_type": access_type,
            "accessor_info": accessor_info or {},
            "id": f"log_{int(datetime.now().timestamp())}"
        }
        logs.append(log_entry)
        
        # 保存日志（保留最近100条）
        logs = logs[-100:]
        with open(log_file_path, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
        
        logger.info(f"[Security] 记录数据访问 user_id={user_id}, type={access_type}")
        return True
    except Exception as e:
        logger.error(f"[Security] 记录数据访问失败: {e}")
        return False


# ============================================================
# 14.2 导出用户数据
# GET /api/v1/security/data/export
# ============================================================
@security_bp.route("/data/export", methods=["GET"])
def export_user_data():
    """
    导出用户所有数据
    查询参数：user_id
    """
    try:
        user_id = request.args.get("user_id")
        
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        logger.info(f"[Security] 用户 {user_id} 请求导出数据")
        
        # 记录访问日志
        log_data_access(user_id, "data_export", {"action": "export_request"})
        
        # 收集用户数据
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.now().isoformat(),
            "privacy_settings": _load_privacy_settings(user_id),
            "data": {}
        }
        
        # 加载用户简历数据
        resume_path = get_abs_path(f"data/resumes/resume_{user_id}.json")
        if os.path.exists(resume_path):
            try:
                with open(resume_path, "r", encoding="utf-8") as f:
                    export_data["data"]["resume"] = json.load(f)
            except Exception as e:
                logger.warning(f"[Security] 加载简历数据失败: {e}")
        
        # 加载用户能力画像数据
        ability_path = get_abs_path(f"data/student_abilities/student_{user_id}.json")
        if os.path.exists(ability_path):
            try:
                with open(ability_path, "r", encoding="utf-8") as f:
                    export_data["data"]["ability_profile"] = json.load(f)
            except Exception as e:
                logger.warning(f"[Security] 加载能力画像数据失败: {e}")
        
        # 加载用户访问日志
        log_file_path = os.path.join(PRIVACY_DATA_PATH, f"access_logs_{user_id}.json")
        if os.path.exists(log_file_path):
            try:
                with open(log_file_path, "r", encoding="utf-8") as f:
                    export_data["data"]["access_logs"] = json.load(f)
            except Exception as e:
                logger.warning(f"[Security] 加载访问日志失败: {e}")
        
        return success_response(export_data, "数据导出成功")
        
    except Exception as e:
        logger.error(f"[API] /security/data/export 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 14.3 删除用户数据
# DELETE /api/v1/security/data/delete
# ============================================================
@security_bp.route("/data/delete", methods=["DELETE"])
def delete_user_data():
    """
    删除用户所有数据（不可恢复）
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        logger.warning(f"[Security] 用户 {user_id} 请求删除所有数据！")
        
        # 记录访问日志
        log_data_access(user_id, "data_delete", {"action": "delete_request"})
        
        deleted_files = []
        
        # 删除隐私设置文件
        privacy_file = _get_privacy_file_path(user_id)
        if os.path.exists(privacy_file):
            os.remove(privacy_file)
            deleted_files.append("privacy_settings")
        
        # 删除简历文件
        resume_path = get_abs_path(f"data/resumes/resume_{user_id}.json")
        if os.path.exists(resume_path):
            os.remove(resume_path)
            deleted_files.append("resume")
        
        # 删除能力画像文件
        ability_path = get_abs_path(f"data/student_abilities/student_{user_id}.json")
        if os.path.exists(ability_path):
            os.remove(ability_path)
            deleted_files.append("ability_profile")
        
        # 删除访问日志文件
        log_file_path = os.path.join(PRIVACY_DATA_PATH, f"access_logs_{user_id}.json")
        if os.path.exists(log_file_path):
            os.remove(log_file_path)
            deleted_files.append("access_logs")
        
        return success_response({
            "user_id": user_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_items": deleted_files
        }, "数据删除成功")
        
    except Exception as e:
        logger.error(f"[API] /security/data/delete 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 14.4 获取用户数据统计
# GET /api/v1/security/data/summary
# ============================================================
@security_bp.route("/data/summary", methods=["GET"])
def get_data_summary():
    """
    获取用户数据统计信息
    查询参数：user_id
    """
    try:
        user_id = request.args.get("user_id")
        
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        
        summary = {
            "user_id": user_id,
            "has_resume": False,
            "has_ability_profile": False,
            "access_log_count": 0,
            "data_created_at": None
        }
        
        # 检查简历
        resume_path = get_abs_path(f"data/resumes/resume_{user_id}.json")
        if os.path.exists(resume_path):
            summary["has_resume"] = True
            try:
                with open(resume_path, "r", encoding="utf-8") as f:
                    resume_data = json.load(f)
                    if "generated_at" in resume_data:
                        summary["data_created_at"] = resume_data["generated_at"]
            except:
                pass
        
        # 检查能力画像
        ability_path = get_abs_path(f"data/student_abilities/student_{user_id}.json")
        summary["has_ability_profile"] = os.path.exists(ability_path)
        
        # 统计访问日志
        log_file_path = os.path.join(PRIVACY_DATA_PATH, f"access_logs_{user_id}.json")
        if os.path.exists(log_file_path):
            try:
                with open(log_file_path, "r", encoding="utf-8") as f:
                    logs = json.load(f)
                    summary["access_log_count"] = len(logs)
            except:
                pass
        
        return success_response(summary)
        
    except Exception as e:
        logger.error(f"[API] /security/data/summary 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
