"""
简历生成模块 API 路由
路由列表：
  POST /api/v1/resume/generate - AI生成简历
  POST /api/v1/resume/submit   - 提交简历给HR
  GET  /api/v1/resume/get      - 获取已生成的简历
"""

import json
import os
import random
from datetime import datetime

from flask import Blueprint, request, jsonify
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from model.factory import chat_model
from utils.yaml_config import get_yaml_config

# 创建Blueprint
resume_bp = Blueprint("resume", __name__, url_prefix="/api/v1/resume")

# 配置
config = get_yaml_config()
rag_conf = config.get("rag", {})


# ========== 统一响应格式 ==========
def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ========== 工具函数 ==========
def _get_resume_store_path():
    path = get_abs_path("data/resumes")
    os.makedirs(path, exist_ok=True)
    return path


def _load_resume(user_id):
    store_path = _get_resume_store_path()
    file_path = os.path.join(store_path, f"resume_{user_id}.json")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_resume(user_id, resume_data):
    store_path = _get_resume_store_path()
    file_path = os.path.join(store_path, f"resume_{user_id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(resume_data, f, ensure_ascii=False, indent=2)


# ========== AI简历生成相关函数 ==========
def _build_resume_generation_chain():
    """构建简历生成链"""
    prompt_text = """你是一位专业的HR简历专家，擅长根据 student（学生/候选人）的个人信息生成高质量的求职简历。

请根据以下用户信息，为用户生成一份匿名简历，简历样式要适合企业HR查看。

用户个人信息：
- 基本信息：{basic_info}
- 教育信息：{education_info}
- 技能信息：{skills}
- 实习经历：{internships}
- 项目经历：{projects}

要求：
1. 生成的简历要包含以下字段（JSON格式）：
   - education_level: 学历（从教育信息中提取，如果没有则选择：本科/硕士/博士）
   - major_category: 专业类别（从教育信息中提取，如果没有则从计算机相关专业中选择）
   - gpa_level: 成绩水平（从基本信息中提取，如果没有则选择：优秀（3.7+）/良好（3.3-3.7）/中等（3.0-3.3））
   - ability_tags: 能力标签（数组，4-6个关键词，从技能信息中提取）
   - highlight: 个人亮点（一段100字左右的中文描述，突出用户的优势）
   - system_match_score: 系统匹配分（70-95之间的整数）
   - is_open_to_contact: 是否愿意被联系（固定为true）

2. 输出格式为纯JSON，不要包含任何其他文字
3. 如果用户信息为空，请提供合理的默认值（偏向计算机相关专业）

JSON输出："""
    
    template = PromptTemplate.from_template(prompt_text)
    return template | chat_model | StrOutputParser()


def _ai_generate_resume_from_profile(profile, user_id):
    """使用AI根据用户档案生成简历"""
    try:
        chain = _build_resume_generation_chain()
        
        basic_info = json.dumps(profile.get("basic_info", {}), ensure_ascii=False)
        education_info = json.dumps(profile.get("education_info", {}), ensure_ascii=False)
        skills = json.dumps(profile.get("skills", []), ensure_ascii=False)
        internships = json.dumps(profile.get("internships", []), ensure_ascii=False)
        projects = json.dumps(profile.get("projects", []), ensure_ascii=False)
        
        raw_output = chain.invoke({
            "basic_info": basic_info,
            "education_info": education_info,
            "skills": skills,
            "internships": internships,
            "projects": projects
        })
        
        content = raw_output if isinstance(raw_output, str) else getattr(raw_output, "content", str(raw_output))
        
        # 清理JSON内容
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        
        ai_data = json.loads(content)
        
        # 补充完整简历数据
        resume_data = {
            "user_id": user_id,
            "anonymous_id": f"student_{user_id:03d}",
            "education_level": ai_data.get("education_level", "本科"),
            "major_category": ai_data.get("major_category", "计算机科学与技术"),
            "gpa_level": ai_data.get("gpa_level", "良好（3.3-3.7）"),
            "system_match_score": ai_data.get("system_match_score", 80),
            "ability_tags": ai_data.get("ability_tags", ["Python", "Java", "项目管理", "团队协作"]),
            "highlight": ai_data.get("highlight", "具备扎实的计算机基础知识，有项目开发经验，学习能力强，善于团队协作"),
            "is_open_to_contact": ai_data.get("is_open_to_contact", True),
            "generated_at": datetime.now().isoformat(),
            "submitted_to_hr": False
        }
        
        return resume_data
        
    except Exception as e:
        logger.warning(f"[Resume] AI生成简历失败，使用模拟数据: {e}")
        return _generate_simulated_resume(profile, user_id)


def _generate_simulated_resume(profile, user_id):
    """生成模拟简历数据（作为AI失败时的后备方案）"""
    education_levels = ["本科", "硕士", "博士"]
    major_categories = ["计算机科学与技术", "软件工程", "人工智能", "数据科学", "电子信息工程"]
    gpa_levels = ["优秀（3.7+）", "良好（3.3-3.7）", "中等（3.0-3.3）"]
    ability_tags_list = [
        ["Python", "机器学习", "数据分析", "项目管理"],
        ["Java", "Spring Boot", "微服务", "Docker"],
        ["深度学习", "PyTorch", "计算机视觉", "NLP"],
        ["R", "Python", "统计分析", "数据可视化"],
        ["C++", "嵌入式", "单片机", "电路设计"]
    ]
    highlights = [
        "主导开发AI辅助系统，具备独立项目落地经验",
        "在大型互联网公司有实习经验，参与过百万级用户产品开发",
        "发表过会议论文，有算法竞赛获奖经历",
        "有丰富的数据分析项目经验，擅长从数据中发现商业价值",
        "参加过电子设计竞赛，有硬件开发经验"
    ]

    if profile:
        basic_info = profile.get("basic_info", {})
        education_info = profile.get("education_info", {})
        skills = profile.get("skills", [])
    else:
        basic_info = {}
        education_info = {}
        skills = []

    anonymous_id = f"student_{user_id:03d}"
    education_level = education_info.get("degree", random.choice(education_levels))
    major_category = education_info.get("major", random.choice(major_categories))
    gpa_level = basic_info.get("gpa", random.choice(gpa_levels))
    system_match_score = random.randint(70, 95)
    
    if skills:
        ability_tags = []
        for skill_cat in skills:
            if isinstance(skill_cat, dict) and "skills" in skill_cat:
                ability_tags.extend(skill_cat["skills"])
        if not ability_tags:
            ability_tags = random.choice(ability_tags_list)
    else:
        ability_tags = random.choice(ability_tags_list)
    
    highlight = random.choice(highlights)
    is_open_to_contact = True

    return {
        "user_id": user_id,
        "anonymous_id": anonymous_id,
        "education_level": education_level,
        "major_category": major_category,
        "gpa_level": gpa_level,
        "system_match_score": system_match_score,
        "ability_tags": ability_tags,
        "highlight": highlight,
        "is_open_to_contact": is_open_to_contact,
        "generated_at": datetime.now().isoformat(),
        "submitted_to_hr": False
    }


# ========== 2.1 AI生成简历 ==========
@resume_bp.route("/generate", methods=["POST"])
def generate_resume():
    """
    AI根据用户个人信息智能生成简历
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        # 从用户档案获取数据
        from profile.profile_service import get_profile_service
        service = get_profile_service()
        profile = service.get_profile(int(user_id))

        if not profile:
            profile = {}

        # 使用AI生成简历
        resume_data = _ai_generate_resume_from_profile(profile, user_id)

        # 保存生成的简历
        _save_resume(user_id, resume_data)

        return success_response(resume_data, msg="简历生成成功")

    except Exception as e:
        logger.error(f"[API] /resume/generate 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 2.2 提交简历给HR ==========
def _build_resume_from_profile_for_submit(user_id):
    """
    当用户未生成过简历时，根据个人档案与能力画像组装一份简历并返回，
    供提交给HR时保存，与 HR 端学生信息同步。
    """
    from api import hr_router
    profile_store = hr_router._load_profile_store()
    ability_store = hr_router._load_ability_profiles_store()
    uid = int(user_id) if user_id is not None else 0
    profile = profile_store.get(str(uid))
    ability_profile = ability_store.get(f"profile_{uid}")
    entry = hr_router._build_resume_entry_from_student_sources(uid, profile, ability_profile)
    resume_data = {
        **entry,
        "generated_at": datetime.now().isoformat(),
        "submitted_to_hr": True,
        "submitted_at": datetime.now().isoformat(),
    }
    return resume_data


@resume_bp.route("/submit", methods=["POST"])
def submit_resume():
    """
    提交简历给HR管理模块。若尚未生成简历，则根据个人档案与能力画像自动生成并提交，HR 端学生信息同步可见。
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        resume_data = _load_resume(user_id)
        if not resume_data:
            resume_data = _build_resume_from_profile_for_submit(user_id)
            _save_resume(user_id, resume_data)
        else:
            resume_data["submitted_to_hr"] = True
            resume_data["submitted_at"] = datetime.now().isoformat()
            _save_resume(user_id, resume_data)

        return success_response({
            "user_id": user_id,
            "submitted": True,
            "submitted_at": resume_data["submitted_at"]
        }, msg="简历已提交给HR")

    except Exception as e:
        logger.error(f"[API] /resume/submit 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ========== 2.3 获取已生成的简历 ==========
@resume_bp.route("/get", methods=["GET"])
def get_resume():
    """
    获取已生成的简历
    参数：user_id
    """
    try:
        user_id = request.args.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        resume_data = _load_resume(user_id)
        if not resume_data:
            return error_response(404, "未找到已生成的简历")

        return success_response(resume_data)

    except Exception as e:
        logger.error(f"[API] /resume/get 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
