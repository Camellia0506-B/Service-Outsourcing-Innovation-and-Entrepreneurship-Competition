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
    # 默认隐私设置：无设置文件时视为对HR可见，便于HR浏览已填档案/投递简历的学生
    return {
        "user_id": user_id,
        "consents": {
            "resume_visible_to_hr": True,
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


def _load_profile_store():
    """加载学生个人档案（data/profiles/profiles.json）"""
    path = get_abs_path("data/profiles/profiles.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[HR] 加载档案失败: {e}")
    return {}


def _load_ability_profiles_store():
    """加载学生能力画像（data/student_profiles/ability_profiles.json）"""
    path = get_abs_path("data/student_profiles/ability_profiles.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[HR] 加载能力画像失败: {e}")
    return {}


def _build_resume_entry_from_student_sources(user_id, profile=None, ability_profile=None):
    """
    从学生档案和/或能力画像组装为 HR 浏览所需的简历条目。
    profile: data/profiles/profiles.json 中单条，含 basic_info, education_info, skills 等
    ability_profile: ability_profiles.json 中单条，含 basic_info, professional_skills, overall_assessment 等
    """
    try:
        uid = int(user_id) if user_id is not None else 0
    except (TypeError, ValueError):
        uid = 0
    anonymous_id = f"求职者_{uid:03d}"

    education_level = "本科"
    major_category = "计算机相关"
    gpa_level = "良好（3.3-3.7）"
    ability_tags = []
    highlight = "（由系统根据学生档案/能力画像生成，未单独投递简历）"
    total_score = 75

    if profile:
        edu = profile.get("education_info") or {}
        basic = profile.get("basic_info") or {}
        education_level = edu.get("degree") or basic.get("degree") or education_level
        major_category = edu.get("major") or major_category
        gpa_raw = edu.get("gpa") or basic.get("gpa") or ""
        if "3.7" in str(gpa_raw) or "优秀" in str(gpa_raw):
            gpa_level = "优秀（3.7+）"
        elif "3.0" in str(gpa_raw) or "中等" in str(gpa_raw):
            gpa_level = "中等（3.0-3.3）"
        skills_list = profile.get("skills") or []
        for cat in skills_list:
            if isinstance(cat, dict) and cat.get("items"):
                ability_tags.extend(cat.get("items", [])[:3])
            elif isinstance(cat, str):
                ability_tags.append(cat)
        if ability_tags:
            ability_tags = list(dict.fromkeys(ability_tags))[:8]

    if ability_profile:
        basic = ability_profile.get("basic_info") or {}
        if not profile:
            education_level = basic.get("education") or education_level
            major_category = basic.get("major") or major_category
            gpa_raw = basic.get("gpa") or ""
            if gpa_raw and "待补充" not in str(gpa_raw):
                if "3.7" in str(gpa_raw):
                    gpa_level = "优秀（3.7+）"
                elif "3.0" in str(gpa_raw):
                    gpa_level = "中等（3.0-3.3）"
        overall = ability_profile.get("overall_assessment") or {}
        total_score = overall.get("total_score", 75)
        if isinstance(total_score, (int, float)) and total_score <= 100:
            total_score = max(70, min(95, int(total_score) + 70))  # 映射到约 70–95
        else:
            total_score = 78
        pro_skills = ability_profile.get("professional_skills") or {}
        for key in ("programming_languages", "frameworks_tools", "domain_knowledge"):
            for item in (pro_skills.get(key) or []):
                if isinstance(item, dict) and item.get("skill"):
                    ability_tags.append(item["skill"])
                elif isinstance(item, str):
                    ability_tags.append(item)
        if not ability_tags and not (profile and profile.get("skills")):
            ability_tags = ["学习能力", "职业规划中"]
        ability_tags = list(dict.fromkeys(ability_tags))[:8]
        strengths = overall.get("strengths") or []
        if strengths:
            highlight = "；".join(strengths[:2]) if isinstance(strengths[0], str) else "（见能力画像）"

    return {
        "user_id": uid,
        "anonymous_id": anonymous_id,
        "education_level": education_level,
        "major_category": major_category,
        "gpa_level": gpa_level,
        "system_match_score": total_score,
        "ability_tags": ability_tags[:8],
        "highlight": highlight[:200] if highlight else "",
        "is_open_to_contact": True,
        "source": "student_profile",
    }


def _load_all_resumes():
    """加载所有已生成的简历（仅返回已授权对HR可见的简历）。
    数据来源：1) data/resumes/resume_*.json；2) 从学生端抽取：data/profiles/profiles.json、ability_profiles.json。
    """
    store_path = _get_resume_store_path()
    seen_user_ids = set()
    resumes = []

    # 1) 来自已投递的简历文件
    if os.path.exists(store_path):
        for filename in os.listdir(store_path):
            if filename.startswith("resume_") and filename.endswith(".json"):
                file_path = os.path.join(store_path, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        resume = json.load(f)
                        user_id = resume.get("user_id")
                        if user_id is not None:
                            privacy_settings = _load_user_privacy_settings(user_id)
                            if privacy_settings.get("consents", {}).get("resume_visible_to_hr", False):
                                resumes.append(resume)
                                seen_user_ids.add(int(user_id))
                except Exception as e:
                    logger.warning(f"[HR] 加载简历失败 {filename}: {e}")

    # 2) 从学生档案与能力画像抽取（未投递简历但有档案/能力画像的学生）
    profile_store = _load_profile_store()
    ability_store = _load_ability_profiles_store()
    all_user_ids = set()
    for uid_str in profile_store.keys():
        try:
            all_user_ids.add(int(uid_str))
        except (TypeError, ValueError):
            pass
    for key in ability_store.keys():
        if isinstance(key, str) and key.startswith("profile_"):
            try:
                all_user_ids.add(int(key.replace("profile_", "")))
            except (TypeError, ValueError):
                pass
        entry = ability_store.get(key)
        if isinstance(entry, dict) and entry.get("user_id") is not None:
            all_user_ids.add(int(entry["user_id"]))

    for user_id in all_user_ids:
        if user_id in seen_user_ids:
            continue
        profile = profile_store.get(str(user_id))
        ability_profile = ability_store.get(f"profile_{user_id}")
        if not profile and not ability_profile:
            continue
        privacy_settings = _load_user_privacy_settings(user_id)
        if not privacy_settings.get("consents", {}).get("resume_visible_to_hr", False):
            continue
        entry = _build_resume_entry_from_student_sources(user_id, profile, ability_profile)
        resumes.append(entry)
        seen_user_ids.add(user_id)

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

