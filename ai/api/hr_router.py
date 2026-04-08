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
import requests

from utils.logger_handler import logger
from utils.path_tool import get_abs_path

# 当配置了 Java 后端地址时，浏览学生列表优先从 Java（MySQL）拉取，实现学生端与 HR 端打通
JAVA_BACKEND_URL = (os.environ.get("JAVA_BACKEND_URL") or os.environ.get("BACKEND_URL") or "").rstrip("/")
if JAVA_BACKEND_URL:
    logger.info("[HR] JAVA_BACKEND_URL 已设置: %s → HR 学生列表将优先从 Java 拉取", JAVA_BACKEND_URL)
else:
    logger.info("[HR] JAVA_BACKEND_URL 未设置 → HR 学生列表仅使用本地文件（设 JAVA_BACKEND_URL 可打通学生端）")

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


def _coerce_resume_anonymous_id(resume: dict) -> dict:
    """HR 列表/详情统一使用 student_XXX；兼容历史 anonymous_id 为 求职者_XXX 的旧数据。"""
    if not isinstance(resume, dict):
        return resume
    uid = resume.get("user_id")
    aid = (resume.get("anonymous_id") or "").strip()
    if uid is None:
        return resume
    try:
        n = int(uid)
    except (TypeError, ValueError):
        return resume
    std = f"student_{n:03d}"
    if not aid or aid.startswith("求职者_"):
        return {**resume, "anonymous_id": std}
    return resume


def _get_evaluation_store_path():
    """获取评估邀请存储路径"""
    path = get_abs_path("data/evaluations")
    os.makedirs(path, exist_ok=True)
    return path


def _get_hr_accounts_path():
    """获取 HR 账号存储文件路径"""
    path = get_abs_path("data")
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, "hr_accounts.json")


def _load_hr_accounts():
    """加载已注册的 HR 账号列表"""
    file_path = _get_hr_accounts_path()
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[HR] 加载 HR 账号失败: {e}")
    return []


def _save_hr_accounts(accounts):
    """保存 HR 账号列表"""
    file_path = _get_hr_accounts_path()
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(accounts, f, ensure_ascii=False, indent=2)


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
    # 默认隐私设置：无设置文件时全部默认开启
    return {
        "user_id": user_id,
        "consents": {
            "resume_visible_to_hr": True,
            "allow_hr_contact": True,
            "allow_algorithm_optimization": True,
            "allow_research": True,
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
    anonymous_id = f"student_{uid:03d}"

    education_level = "本科"
    major_category = "计算机相关"
    gpa_level = "良好（3.3-3.7）"
    ability_tags = []
    highlight = "该候选人尚未主动投递简历，以下信息由系统根据其职业规划档案自动生成，供参考。"
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

    target_job = ""
    if profile:
        basic = profile.get("basic_info") or {}
        target_job = (basic.get("target_job") or "").strip()
    if not target_job and ability_profile:
        basic = ability_profile.get("basic_info") or {}
        target_job = (basic.get("target_job") or "").strip()

    return {
        "user_id": uid,
        "anonymous_id": anonymous_id,
        "target_job": target_job or None,
        "education_level": education_level,
        "major_category": major_category,
        "gpa_level": gpa_level,
        "system_match_score": total_score,
        "ability_tags": ability_tags[:8],
        "highlight": highlight[:200] if highlight else "",
        "is_open_to_contact": True,
        "source": "student_profile",
    }


def _filter_resumes(resumes, target_job, min_match_score, education_level):
    """按 target_job / min_match_score / education_level 筛选简历列表"""
    filtered = []
    for resume in resumes:
        match = True
        if target_job and (resume.get("target_job") or "").strip() != target_job:
            match = False
        if min_match_score:
            try:
                if resume.get("system_match_score", 0) < int(min_match_score):
                    match = False
            except (TypeError, ValueError):
                pass
        if education_level and resume.get("education_level") != education_level:
            match = False
        if match:
            filtered.append(resume)
    return filtered


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
                            if not resume.get("anonymous_id"):
                                try:
                                    resume = {**resume, "anonymous_id": f"student_{int(user_id):03d}"}
                                except (TypeError, ValueError):
                                    pass
                            resume = _coerce_resume_anonymous_id(resume)
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
        resumes.append(_coerce_resume_anonymous_id(entry))
        seen_user_ids.add(user_id)

    return resumes


def _save_evaluation_invitation(invitation):
    """保存评估邀请"""
    store_path = _get_evaluation_store_path()
    os.makedirs(store_path, exist_ok=True)
    file_path = os.path.join(store_path, f"invitation_{invitation['invitation_id']}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(invitation, f, ensure_ascii=False, indent=2)
    logger.info(f"[HR] 已保存邀请: {invitation.get('invitation_id')} -> {file_path}")


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
    """HR登录：校验用户名密码，返回注册时保存的 real_name、company_name 等"""
    try:
        body = request.get_json(silent=True) or {}
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""

        if not username or not password:
            return error_response(400, "请提供用户名和密码")

        accounts = _load_hr_accounts()
        for i, acc in enumerate(accounts):
            if (acc.get("username") or "").strip().lower() == username.lower():
                if acc.get("password") != password:
                    return error_response(401, "密码错误")
                hr_id = acc.get("hr_id") or ("hr_%03d" % (i + 1))
                hr_data = {
                    "hr_id": hr_id,
                    "real_name": acc.get("real_name") or "HR",
                    "company_name": acc.get("company_name") or "",
                    "token": "mock_hr_token_" + str(int(datetime.now().timestamp())),
                    "unread_evaluations": acc.get("unread_evaluations", 0)
                }
                logger.info(f"[HR] HR登录: {username}, 公司: {hr_data.get('company_name')}")
                return success_response(hr_data, "登录成功")

        # 未注册用户：返回默认占位，便于演示（可选改为 401）
        hr_data = {
            "hr_id": "hr_001",
            "real_name": "HR管理员",
            "company_name": "星途智探",
            "token": "mock_hr_token_" + str(int(datetime.now().timestamp())),
            "unread_evaluations": 0
        }
        logger.info(f"[HR] HR登录(未注册): {username}")
        return success_response(hr_data, "登录成功")
    except Exception as e:
        logger.error(f"[HR] /hr/login 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/register", methods=["POST"])
def hr_register():
    """HR注册：保存账号、真实姓名、公司名称等，与登录返回信息同步"""
    try:
        # 支持 JSON 或 FormData（前端 modal 用 FormData）
        if request.is_json:
            body = request.get_json(silent=True) or {}
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""
            real_name = (body.get("real_name") or "").strip()
            company_name = (body.get("company_name") or "").strip()
            company_size = body.get("company_size") or ""
            industry = body.get("industry") or ""
            hr_role = body.get("hr_role") or ""
        else:
            form = request.form or {}
            username = (form.get("username") or "").strip()
            password = form.get("password") or ""
            real_name = (form.get("real_name") or "").strip()
            company_name = (form.get("company_name") or "").strip()
            company_size = form.get("company_size") or ""
            industry = form.get("industry") or ""
            hr_role = form.get("hr_role") or ""

        if not username or not password:
            return error_response(400, "请提供用户名和密码")
        if not company_name:
            return error_response(400, "请填写企业名称")

        accounts = _load_hr_accounts()
        for acc in accounts:
            if (acc.get("username") or "").strip().lower() == username.lower():
                return error_response(400, "该账号已注册，请直接登录")

        hr_id = "hr_%03d" % (len(accounts) + 1)
        new_account = {
            "hr_id": hr_id,
            "username": username,
            "password": password,
            "real_name": real_name or "HR",
            "company_name": company_name,
            "company_size": company_size,
            "industry": industry,
            "hr_role": hr_role,
            "unread_evaluations": 0
        }
        accounts.append(new_account)
        _save_hr_accounts(accounts)

        logger.info(f"[HR] HR注册: {username}, 公司: {company_name}")
        return success_response({}, "注册成功，请等待审核")
    except Exception as e:
        logger.error(f"[HR] /hr/register 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


def _load_job_options_from_config():
    """从 job_profile 配置读取岗位名称列表，用于岗位筛选下拉框无数据时的兜底"""
    try:
        import yaml
        path = get_abs_path(os.path.join("config", "job_profile.yml"))
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                conf = yaml.safe_load(f)
            jobs = conf.get("target_jobs") or []
            return [j.get("name") for j in jobs if j.get("name")]
    except Exception as e:
        logger.warning(f"[HR] 读取岗位配置失败: {e}")
    return []


@hr_bp.route("/students/job-options", methods=["GET"])
def get_student_job_options():
    """获取招聘岗位筛选下拉选项（基于当前数据集中的 target_job + 配置兜底）"""
    try:
        all_resumes = _load_all_resumes()
        jobs_set = set()
        for r in all_resumes:
            j = (r.get("target_job") or "").strip()
            if j:
                jobs_set.add(j)
        jobs = sorted(jobs_set)
        if not jobs:
            jobs = _load_job_options_from_config()
        return success_response({"jobs": jobs})
    except Exception as e:
        logger.error(f"[HR] /hr/students/job-options 异常: {e}", exc_info=True)
        return error_response(500, str(e))


# ========== 学生简历浏览 ==========
@hr_bp.route("/students/browse", methods=["GET"])
def browse_students():
    """
    浏览学生简历列表
    参数：hr_id, page, size, target_job, min_match_score, education_level
    若配置了 JAVA_BACKEND_URL，优先从 Java 后端（MySQL）拉取，保证学生注册后 HR 端可见。
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

        if JAVA_BACKEND_URL:
            try:
                url = f"{JAVA_BACKEND_URL}/api/v1/hr/students/browse?{request.query_string.decode()}"
                logger.info("[HR] 请求 Java 浏览接口: %s", url)
                r = requests.get(url, timeout=10)
                body = r.json() if r.headers.get("content-type", "").startswith("application/json") else None
                if r.status_code == 200 and isinstance(body, dict):
                    data = body.get("data")
                    if data is not None and isinstance(data.get("list"), list):
                        java_list = data.get("list", [])
                        java_total = data.get("total", 0)
                        logger.info("[HR] Java 返回: total=%s, list_len=%s", java_total, len(java_list))
                        if len(java_list) > 0:
                            return success_response(data)
                        # Java 返回空列表时，用本地数据兜底，避免一直显示 0 条
                        all_resumes = _load_all_resumes()
                        if all_resumes:
                            filtered_resumes = _filter_resumes(all_resumes, target_job, min_match_score, education_level)
                            total = len(filtered_resumes)
                            start = (page - 1) * size
                            end = start + size
                            page_resumes = filtered_resumes[start:end]
                            return success_response({"list": page_resumes, "total": total, "page": page, "size": size})
                        return success_response(data)
                logger.warning("[HR] Java 浏览接口返回非常规: status=%s, 回退本地数据", r.status_code)
            except Exception as e:
                logger.warning("[HR] 请求 Java 浏览接口失败: %s, 回退本地数据", e)

        all_resumes = _load_all_resumes()
        filtered_resumes = _filter_resumes(all_resumes, target_job, min_match_score, education_level)
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


@hr_bp.route("/students/detail", methods=["GET"])
def student_detail():
    """
    获取学生个人档案完整信息（供 HR 浏览简历详情）。
    若配置了 JAVA_BACKEND_URL 且 anonymous_id 为 student_XXX，优先从 Java（user_profiles）拉取真实档案，保证学生端填写的信息在 HR 详情中展示。
    否则从本地 profiles.json / ability_profiles.json 读取。
    """
    try:
        anonymous_id = (request.args.get("anonymous_id") or "").strip()
        if not anonymous_id:
            return error_response(400, "请提供 anonymous_id 参数")

        java_aid = anonymous_id
        if java_aid.startswith("求职者_"):
            try:
                _n = int(java_aid.replace("求职者_", "").strip())
                java_aid = f"student_{_n:03d}"
            except (TypeError, ValueError):
                pass
        if JAVA_BACKEND_URL and java_aid.startswith("student_"):
            try:
                r = requests.get(
                    f"{JAVA_BACKEND_URL}/api/v1/hr/students/detail",
                    params={"anonymous_id": java_aid},
                    timeout=10,
                )
                if r.status_code == 200:
                    body = r.json()
                    if isinstance(body, dict) and body.get("code") == 200 and body.get("data") is not None:
                        return success_response(body["data"])
                logger.warning("[HR] Java 学生详情返回非常规: status=%s，回退本地数据", r.status_code)
            except Exception as e:
                logger.warning("[HR] 请求 Java 学生详情失败: %s，回退本地数据", e)

        user_id = None
        if anonymous_id.startswith("求职者_"):
            try:
                user_id = int(anonymous_id.replace("求职者_", "").strip())
            except (TypeError, ValueError):
                pass
        if user_id is None and anonymous_id.startswith("student_"):
            try:
                user_id = int(anonymous_id.replace("student_", "").strip())
            except (TypeError, ValueError):
                pass
        if user_id is None:
            all_resumes = _load_all_resumes()
            for r in all_resumes:
                if r.get("anonymous_id") == anonymous_id:
                    user_id = r.get("user_id")
                    break
        if user_id is None:
            return error_response(404, "未找到该学生档案")

        profile_store = _load_profile_store()
        ability_store = _load_ability_profiles_store()
        profile = profile_store.get(str(user_id))
        ability_profile = ability_store.get(f"profile_{user_id}")

        if not profile and not ability_profile:
            return error_response(404, "未找到该学生档案")

        data = {
            "anonymous_id": f"student_{user_id:03d}",
            "user_id": user_id,
            "profile": profile or {},
            "ability_profile": ability_profile or {},
        }
        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/students/detail 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 评估邀请 ==========
@hr_bp.route("/evaluation/invite", methods=["POST"])
def send_invitation():
    """发起评估邀请"""
    try:
        body = request.get_json(silent=True) or {}
        hr_id = body.get("hr_id")
        anonymous_student_id = (body.get("anonymous_student_id") or "").strip()
        if anonymous_student_id.startswith("求职者_"):
            try:
                anonymous_student_id = f"student_{int(anonymous_student_id.replace('求职者_', '').strip()):03d}"
            except (TypeError, ValueError):
                pass
        target_job = body.get("target_job")
        message = body.get("message")

        if not hr_id or not anonymous_student_id:
            return error_response(400, "请提供必要参数")

        # 根据anonymous_student_id查找对应的user_id
        all_resumes = _load_all_resumes()
        user_id = None
        for resume in all_resumes:
            rid = (resume.get("anonymous_id") or "").strip()
            if rid == anonymous_student_id:
                user_id = resume.get("user_id")
                break
        
        if not user_id:
            ids_in_list = [str((r.get("anonymous_id") or "").strip()) for r in all_resumes[:5]]
            logger.warning(f"[HR] 邀约未找到 student: anonymous_student_id={repr(anonymous_student_id)}, 当前列表前几条 anonymous_id={ids_in_list}")
            return error_response(404, "未找到该 student 对应信息")

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
            "hr_id": str(hr_id) if hr_id is not None else "",
            "anonymous_student_id": anonymous_student_id,
            "user_id": int(user_id),
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
        hr_id_str = str(hr_id) if hr_id is not None else ""
        filtered_invitations = [inv for inv in all_invitations if str(inv.get("hr_id") or "") == hr_id_str]

        if status_filter:
            filtered_invitations = [inv for inv in filtered_invitations if inv.get("status") == status_filter]

        data = {
            "list": filtered_invitations
        }

        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/invitations 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 学生端：查看与响应 HR 评估邀请 ==========
def _get_hr_info_by_id(hr_id):
    """根据 hr_id 从 hr_accounts 取 company_name、real_name"""
    if not hr_id:
        return {"company_name": "", "real_name": ""}
    accounts = _load_hr_accounts()
    for acc in accounts:
        if str(acc.get("hr_id") or "") == str(hr_id):
            return {
                "company_name": (acc.get("company_name") or "").strip(),
                "real_name": (acc.get("real_name") or "").strip()
            }
    return {"company_name": "", "real_name": ""}


@hr_bp.route("/student/invitations", methods=["GET"])
def student_get_invitations():
    """学生获取自己收到的评估邀请列表（按 user_id 过滤）。邀请存盘时已含 user_id，与 anonymous_student_id 对应。"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        all_invitations = _load_all_invitations()
        user_id_norm = int(user_id)
        filtered = []
        for inv in all_invitations:
            try:
                if inv.get("user_id") is not None and int(inv["user_id"]) == user_id_norm:
                    hr_info = _get_hr_info_by_id(inv.get("hr_id"))
                    item = dict(inv)
                    item["company_name"] = hr_info["company_name"]
                    item["hr_name"] = hr_info["real_name"]
                    filtered.append(item)
            except (TypeError, ValueError):
                pass
        return success_response({"list": filtered})
    except Exception as e:
        logger.error(f"[HR] /hr/student/invitations 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/student/invitation/<invitation_id>/respond", methods=["POST"])
def student_respond_invitation(invitation_id):
    """学生接受或拒绝评估邀请。body: { user_id, action: \"accept\" | \"decline\" }"""
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        action = (body.get("action") or "").strip().lower()

        if not user_id or action not in ("accept", "decline"):
            return error_response(400, "请提供 user_id 和 action（accept 或 decline）")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        store_path = _get_evaluation_store_path()
        file_path = os.path.join(store_path, f"invitation_{invitation_id}.json")
        if not os.path.exists(file_path):
            return error_response(404, "邀请不存在或已失效")

        with open(file_path, "r", encoding="utf-8") as f:
            inv = json.load(f)

        try:
            inv_user_id = int(inv.get("user_id")) if inv.get("user_id") is not None else None
        except (TypeError, ValueError):
            inv_user_id = None
        if inv_user_id is None or inv_user_id != int(user_id):
            return error_response(403, "无权操作该邀请")

        if inv.get("status") != "pending":
            return error_response(400, f"该邀请已{inv.get('status')}，无法重复操作")

        inv["status"] = "accepted" if action == "accept" else "declined"
        inv["responded_at"] = datetime.now().isoformat()
        _save_evaluation_invitation(inv)

        logger.info(f"[HR] 学生 {user_id} {action} 邀请 {invitation_id}")
        return success_response(inv, "操作成功")
    except Exception as e:
        logger.error(f"[HR] /hr/student/invitation/respond 异常: {e}", exc_info=True)
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
        hr_id_str = str(hr_id) if hr_id is not None else ""
        filtered_evaluations = [e for e in all_evaluations if str(e.get("hr_id") or "") == hr_id_str]

        if status_filter:
            filtered_evaluations = [ev for ev in filtered_evaluations if ev.get("status") == status_filter]

        data = {
            "list": filtered_evaluations
        }

        return success_response(data)
    except Exception as e:
        logger.error(f"[HR] /hr/evaluation/evaluations 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/evaluation/<evaluation_id>/submit", methods=["POST"])
def submit_evaluation(evaluation_id):
    """提交评估（evaluation_id 即对应邀请的 invitation_id）"""
    try:
        body = request.get_json(silent=True) or {}
        hr_id = body.get("hr_id")
        evaluation_form = body.get("evaluation_form", {})

        if not hr_id or not evaluation_id:
            return error_response(400, "请提供必要参数")

        # 从对应邀请中带入候选人、岗位等信息，便于评估结果列表展示
        anonymous_student_id = ""
        target_job = ""
        inv_path = os.path.join(_get_evaluation_store_path(), f"invitation_{evaluation_id}.json")
        if os.path.exists(inv_path):
            try:
                with open(inv_path, "r", encoding="utf-8") as f:
                    inv = json.load(f)
                    if inv.get("hr_id") == hr_id:
                        anonymous_student_id = inv.get("anonymous_student_id") or ""
                        target_job = inv.get("target_job") or ""
            except Exception as e:
                logger.warning(f"[HR] 读取邀请信息失败: {e}")

        evaluation = {
            "evaluation_id": evaluation_id,
            "hr_id": hr_id,
            "anonymous_student_id": anonymous_student_id,
            "target_job": target_job,
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


# ========== 学生端：查看 HR 评估报告 ==========
def _invitation_user_id(invitation_id):
    """根据 invitation_id 读取对应邀请文件，返回 user_id（不存在或无 user_id 返回 None）"""
    store_path = _get_evaluation_store_path()
    file_path = os.path.join(store_path, f"invitation_{invitation_id}.json")
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            inv = json.load(f)
        uid = inv.get("user_id")
        return int(uid) if uid is not None else None
    except Exception:
        return None


@hr_bp.route("/student/evaluation-reports", methods=["GET"])
def student_get_evaluation_reports():
    """学生获取自己收到的 HR 评估报告列表。按 user_id 过滤（邀请中存了 user_id）。"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        all_ev = _load_all_evaluations()
        result = []
        for ev in all_ev:
            inv_user_id = _invitation_user_id(ev.get("evaluation_id"))
            if inv_user_id is None or inv_user_id != user_id:
                continue
            hr_info = _get_hr_info_by_id(ev.get("hr_id"))
            submitted = ev.get("submitted_at") or ""
            if submitted and len(submitted) > 19:
                submitted = submitted[:19].replace("T", " ")
            result.append({
                "evaluation_id": ev.get("evaluation_id"),
                "target_job": ev.get("target_job") or "",
                "company_name": hr_info.get("company_name") or "",
                "hr_name": hr_info.get("real_name") or "",
                "submitted_at": submitted,
                "status": "completed" if ev.get("status") == "completed" else "in_progress",
            })
        result.sort(key=lambda x: x.get("submitted_at") or "", reverse=True)
        return success_response({"list": result})
    except Exception as e:
        logger.error(f"[HR] /hr/student/evaluation-reports 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


@hr_bp.route("/student/evaluation-reports/<evaluation_id>", methods=["GET"])
def student_get_evaluation_report_detail(evaluation_id):
    """学生查看某条评估报告详情（维度分数、评语等）。"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return error_response(400, "user_id 必须为数字")

        inv_user_id = _invitation_user_id(evaluation_id)
        if inv_user_id is None or inv_user_id != user_id:
            return error_response(404, "报告不存在或无权查看")

        store_path = _get_evaluation_store_path()
        file_path = os.path.join(store_path, f"evaluation_{evaluation_id}.json")
        if not os.path.exists(file_path):
            return error_response(404, "报告不存在")
        with open(file_path, "r", encoding="utf-8") as f:
            ev = json.load(f)
        hr_info = _get_hr_info_by_id(ev.get("hr_id"))
        detail = dict(ev)
        detail["company_name"] = hr_info.get("company_name") or ""
        detail["hr_name"] = hr_info.get("real_name") or ""
        return success_response(detail)
    except Exception as e:
        logger.error(f"[HR] /hr/student/evaluation-reports/<id> 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")

