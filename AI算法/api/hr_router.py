"""
HR模块 API 路由
对应 HR 模块功能：
- 学生简历浏览
- 评估邀请管理
- 评估提交
"""

import json
import os
from datetime import datetime
from flask import Blueprint, request, jsonify

from utils.logger_handler import logger
from utils.path_tool import get_abs_path

# 创建Blueprint
hr_bp = Blueprint("hr", __name__, url_prefix="/api/v1/hr")


# ========== 统一响应格式 ==========
def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ========== 工具函数 ==========
def _get_resume_store_path():
    """获取简历存储路径"""
    path = get_abs_path("data/resumes")
    os.makedirs(path, exist_ok=True)
    return path


def _get_evaluation_store_path():
    """获取评估邀请存储路径"""
    path = get_abs_path("data/evaluations")
    os.makedirs(path, exist_ok=True)
    return path


def _get_privacy_settings_path():
    """获取隐私设置存储路径"""
    path = get_abs_path("data/privacy_settings")
    os.makedirs(path, exist_ok=True)
    return path


def _load_user_privacy_settings(user_id):
    """加载用户隐私设置"""
    privacy_path = _get_privacy_settings_path()
    file_path = os.path.join(privacy_path, f"privacy_{user_id}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[HR] 加载隐私设置失败 user_id={user_id}: {e}")
    # 默认隐私设置
    return {
        "user_id": user_id,
        "consents": {
            "resume_visible_to_hr": False,
            "allow_hr_contact": False,
            "allow_algorithm_optimization": True,
            "allow_research": False,
            "data_retention_years": 3
        }
    }


def _log_data_access(user_id, access_type, accessor_info=None):
    """记录数据访问日志"""
    try:
        from api.security_router import log_data_access as security_log
        security_log(user_id, access_type, accessor_info)
    except Exception as e:
        logger.warning(f"[HR] 记录访问日志失败: {e}")


def _load_all_resumes():
    """加载所有已生成的简历（仅返回已授权对HR可见的简历）"""
    store_path = _get_resume_store_path()
    resumes = []
    if os.path.exists(store_path):
        for filename in os.listdir(store_path):
            if filename.startswith("resume_") and filename.endswith(".json"):
                file_path = os.path.join(store_path, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        resume = json.load(f)
                        user_id = resume.get("user_id")
                        if user_id:
                            privacy_settings = _load_user_privacy_settings(user_id)
                            if privacy_settings.get("consents", {}).get("resume_visible_to_hr", False):
                                resumes.append(resume)
                except Exception as e:
                    logger.warning(f"[HR] 加载简历失败 {filename}: {e}")
    return resumes


def _save_evaluation_invitation(invitation):
    """保存评估邀请"""
    store_path = _get_evaluation_store_path()
    file_path = os.path.join(store_path, f"invitation_{invitation['invitation_id']}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(invitation, f, ensure_ascii=False, indent=2)


def _load_all_invitations():
    """加载所有评估邀请"""
    store_path = _get_evaluation_store_path()
    invitations = []
    if os.path.exists(store_path):
        for filename in os.listdir(store_path):
            if filename.startswith("invitation_") and filename.endswith(".json"):
                file_path = os.path.join(store_path, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        invitation = json.load(f)
                        invitations.append(invitation)
                except Exception as e:
                    logger.warning(f"[HR] 加载邀请失败 {filename}: {e}")
    return invitations


def _save_evaluation(evaluation):
    """保存评估"""
    store_path = _get_evaluation_store_path()
    file_path = os.path.join(store_path, f"evaluation_{evaluation['evaluation_id']}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(evaluation, f, ensure_ascii=False, indent=2)


def _load_all_evaluations():
    """加载所有评估"""
    store_path = _get_evaluation_store_path()
    evaluations = []
    if os.path.exists(store_path):
        for filename in os.listdir(store_path):
            if filename.startswith("evaluation_") and filename.endswith(".json"):
                file_path = os.path.join(store_path, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        evaluation = json.load(f)
                        evaluations.append(evaluation)
                except Exception as e:
                    logger.warning(f"[HR] 加载评估失败 {filename}: {e}")
    return evaluations


# ========== HR 登录/注册（简化版） ==========
@hr_bp.route("/login", methods=["POST"])
def hr_login():
    """HR登录（简化版）"""
    try:
        body = request.get_json(silent=True) or {}
        username = body.get("username")
        password = body.get("password")

        if not username or not password:
            return error_response(400, "请提供用户名和密码")

        hr_data = {
            "hr_id": "hr_001",
            "real_name": "HR管理员",
            "company_name": "示例公司",
            "token": "mock_hr_token_" + str(int(datetime.now().timestamp())),
            "unread_evaluations": 0
        }

        logger.info(f"[HR] HR登录: {username}")
        return success_response(hr_data, "登录成功")
    except Exception as e:
        logger.error(f"[HR] /hr/login 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/register", methods=["POST"])
def hr_register():
    """HR注册（简化版）"""
    try:
        return success_response({}, "注册成功，请等待审核")
    except Exception as e:
        logger.error(f"[HR] /hr/register 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 学生简历浏览 ==========
@hr_bp.route("/students/browse", methods=["GET"])
def browse_students():
    """
    浏览学生简历列表
    参数：hr_id, page, size, target_job, min_match_score, education_level
    """
    try:
        hr_id = request.args.get("hr_id")
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 10))
        target_job = request.args.get("target_job")
        min_match_score = request.args.get("min_match_score")
        education_level = request.args.get("education_level")

        if not hr_id:
            return error_response(400, "请提供 hr_id 参数")

        logger.info(f"[HR] HR {hr_id} 浏览学生列表: page={page}, size={size}")

        all_resumes = _load_all_resumes()

        filtered_resumes = []
        for resume in all_resumes:
            match = True

            if min_match_score:
                try:
                    if resume.get("system_match_score", 0) < int(min_match_score):
                        match = False
                except:
                    pass

            if education_level and resume.get("education_level") != education_level:
                match = False

            if match:
                filtered_resumes.append(resume)

        total = len(filtered_resumes)
        start = (page - 1) * size
        end = start + size
        page_resumes = filtered_resumes[start:end]

        data = {
            "list": page_resumes,
            "total": total,
            "page": page,
            "size": size
        }

        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/students/browse 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 评估邀请 ==========
@hr_bp.route("/evaluation/invite", methods=["POST"])
def send_invitation():
    """发起评估邀请"""
    try:
        body = request.get_json(silent=True) or {}
        hr_id = body.get("hr_id")
        anonymous_student_id = body.get("anonymous_student_id")
        target_job = body.get("target_job")
        message = body.get("message")

        if not hr_id or not anonymous_student_id:
            return error_response(400, "请提供必要参数")

        # 根据anonymous_student_id查找对应的user_id
        all_resumes = _load_all_resumes()
        user_id = None
        for resume in all_resumes:
            if resume.get("anonymous_id") == anonymous_student_id:
                user_id = resume.get("user_id")
                break
        
        if not user_id:
            return error_response(404, "未找到该求职者信息")

        # 检查用户隐私设置
        privacy_settings = _load_user_privacy_settings(user_id)
        if not privacy_settings.get("consents", {}).get("allow_hr_contact", False):
            return error_response(403, "该用户未授权HR发起评估邀请")

        # 记录数据访问日志
        _log_data_access(user_id, "hr_evaluation_invite", {
            "hr_id": hr_id,
            "anonymous_student_id": anonymous_student_id,
            "target_job": target_job
        })

        invitation_id = f"inv_{int(datetime.now().timestamp())}"
        invitation = {
            "invitation_id": invitation_id,
            "hr_id": hr_id,
            "anonymous_student_id": anonymous_student_id,
            "user_id": user_id,
            "target_job": target_job or "",
            "message": message or "",
            "status": "pending",
            "sent_at": datetime.now().isoformat()
        }

        _save_evaluation_invitation(invitation)
        logger.info(f"[HR] 发出评估邀请: {invitation_id}")

        return success_response(invitation, "邀请已发送")
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/invite 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/evaluation/invitations", methods=["GET"])
def get_invitations():
    """获取评估邀请列表"""
    try:
        hr_id = request.args.get("hr_id")
        status_filter = request.args.get("status")

        if not hr_id:
            return error_response(400, "请提供 hr_id 参数")

        all_invitations = _load_all_invitations()
        filtered_invitations = [inv for inv in all_invitations if inv.get("hr_id") == hr_id]

        if status_filter:
            filtered_invitations = [inv for inv in filtered_invitations if inv.get("status") == status_filter]

        data = {
            "list": filtered_invitations
        }

        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/invitations 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 评估管理 ==========
@hr_bp.route("/evaluation/evaluations", methods=["GET"])
def get_evaluations():
    """获取评估列表"""
    try:
        hr_id = request.args.get("hr_id")
        status_filter = request.args.get("status")

        if not hr_id:
            return error_response(400, "请提供 hr_id 参数")

        all_evaluations = _load_all_evaluations()
        filtered_evaluations = [eval for eval in all_evaluations if eval.get("hr_id") == hr_id]

        if status_filter:
            filtered_evaluations = [eval for eval in filtered_evaluations if eval.get("status") == status_filter]

        data = {
            "list": filtered_evaluations
        }

        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/evaluations 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/evaluation/<evaluation_id>/submit", methods=["POST"])
def submit_evaluation(evaluation_id):
    """提交评估"""
    try:
        body = request.get_json(silent=True) or {}
        hr_id = body.get("hr_id")
        evaluation_form = body.get("evaluation_form", {})

        if not hr_id or not evaluation_id:
            return error_response(400, "请提供必要参数")

        evaluation = {
            "evaluation_id": evaluation_id,
            "hr_id": hr_id,
            "status": "completed",
            "overall_impression": evaluation_form.get("overall_impression"),
            "dimension_scores": evaluation_form.get("dimension_scores", {}),
            "hiring_intent": evaluation_form.get("hiring_intent"),
            "strengths_noted": evaluation_form.get("strengths_noted"),
            "weaknesses_noted": evaluation_form.get("weaknesses_noted"),
            "recommended_positions": evaluation_form.get("recommended_positions", []),
            "evaluation_basis": evaluation_form.get("evaluation_basis"),
            "submitted_at": datetime.now().isoformat()
        }

        _save_evaluation(evaluation)
        logger.info(f"[HR] 提交评估: {evaluation_id}")

        return success_response(evaluation, "评估提交成功")
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/submit 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")

