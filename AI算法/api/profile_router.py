"""
个人档案模块 API 路由
对应 API 文档第 2 章：Profile 模块

路由列表：
  POST /api/v1/profile/info                - 2.1 获取个人档案
  POST /api/v1/profile/update              - 2.2 更新个人档案
  POST /api/v1/profile/upload-resume       - 2.3 上传简历（AI解析触发）
  POST /api/v1/profile/resume-parse-result - 2.4 获取简历解析结果
"""

import os
import random
import threading
from datetime import datetime

from flask import Blueprint, request, jsonify

from profile.profile_service import get_profile_service
from utils.logger_handler import logger
from utils.path_tool import get_abs_path
import yaml

# 创建Blueprint
profile_bp = Blueprint("profile", __name__, url_prefix="/api/v1/profile")


# ========== 统一响应格式（对应API文档 0.3）==========

def success_response(data, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data})


def error_response(code, msg, data=None):
    return jsonify({"code": code, "msg": msg, "data": data}), code


# ============================================================
# 2.1 获取个人档案
# POST /api/v1/profile/info
# ============================================================
@profile_bp.route("/info", methods=["POST"])
def get_profile_info():
    """
    获取用户完整档案，含 profile_completeness。
    请求体：{ user_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        service = get_profile_service()
        profile = service.get_profile(int(user_id))

        if not profile:
            # 用户档案不存在时返回空模板（符合前端初次进入场景）
            return success_response({
                "user_id": user_id,
                "basic_info": {},
                "education_info": {},
                "skills": [],
                "certificates": [],
                "internships": [],
                "projects": [],
                "awards": [],
                "profile_completeness": 0,
                "updated_at": None
            })

        return success_response(profile)

    except Exception as e:
        logger.error(f"[API] /profile/info 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 2.2 更新个人档案
# POST /api/v1/profile/update
# ============================================================
@profile_bp.route("/update", methods=["POST"])
def update_profile():
    """
    更新档案，支持局部更新（只传需要更新的字段）。
    请求体：{ user_id, basic_info?, education_info?, skills?, certificates?, ... }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        # 提取可更新的字段（去掉user_id本身）
        updatable = {
            k: v for k, v in body.items()
            if k in ("basic_info", "education_info", "skills",
                     "certificates", "internships", "projects", "awards")
        }

        if not updatable:
            return error_response(400, "请提供至少一个需要更新的字段")

        service = get_profile_service()
        result = service.update_profile(int(user_id), updatable)

        return success_response(result, msg="档案更新成功")

    except Exception as e:
        logger.error(f"[API] /profile/update 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


# ============================================================
# 2.3 上传简历（AI解析触发）
# POST /api/v1/profile/upload-resume
# ============================================================
@profile_bp.route("/upload-resume", methods=["POST"])
def upload_resume():
    """
    接收简历文件（PDF/TXT），提取文本后触发AI异步解析。
    请求格式：multipart/form-data
    参数：user_id（必填）、resume_file（必填，PDF/TXT，≤10MB）
    """
    try:
        user_id = request.form.get("user_id")
        if not user_id:
            return error_response(400, "请提供 user_id 参数")

        resume_file = request.files.get("resume_file")
        if not resume_file:
            return error_response(400, "请上传简历文件 resume_file")

        # 文件类型检查
        filename = resume_file.filename or ""
        allowed_ext = {".pdf", ".txt", ".doc", ".docx"}
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed_ext:
            return error_response(400, f"不支持的文件格式 {ext}，请上传 PDF/TXT/DOC/DOCX")

        # 文件大小检查（10MB）
        resume_file.seek(0, 2)
        file_size = resume_file.tell()
        resume_file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return error_response(400, "文件大小超过10MB限制")

        # 保存文件
        upload_dir = get_abs_path(
            yaml.load(
                open(get_abs_path("config/profile.yml"), encoding="utf-8"),
                Loader=yaml.FullLoader
            )["resume_upload_dir"]
        )
        os.makedirs(upload_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]  # 精确到毫秒
        save_name = f"{user_id}_{ts}{ext}"
        save_path = os.path.join(upload_dir, save_name)
        resume_file.save(save_path)

        # 提取文本
        resume_text = _extract_text(save_path, ext)
        if not resume_text or len(resume_text.strip()) < 50:
            return error_response(400, "无法从文件中提取有效文本，请确认文件内容不为空")

        # 生成task_id：毫秒时间戳 + 随机数，确保唯一
        random_num = random.randint(1000, 999999)
        task_id = f"resume_parse_{ts}_{user_id}_{random_num}"
        service = get_profile_service()
        service.parse_resume_async(int(user_id), resume_text, task_id)

        logger.info(f"[API] 简历上传成功，user_id={user_id}, task_id={task_id}")
        return success_response(
            {"task_id": task_id, "status": "processing"},
            msg="简历上传成功，正在解析..."
        )

    except Exception as e:
        logger.error(f"[API] /profile/upload-resume 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")


def _extract_text(file_path: str, ext: str) -> str:
    """
    从文件提取纯文本内容。
    PDF优先用 pymupdf（fitz），提取效果更好，兼容内嵌字体；
    未安装则降级用 pdfplumber；再不行读原始字节。
    """
    try:
        if ext == ".pdf":
            # 方案1：pymupdf（推荐，对中文内嵌字体支持最好）
            try:
                import fitz  # pymupdf
                doc = fitz.open(file_path)
                pages_text = []
                for page in doc:
                    text = page.get_text("text")
                    if text.strip():
                        pages_text.append(text)
                doc.close()
                result = "\n".join(pages_text)
                if result.strip():
                    logger.info(f"[Profile] pymupdf提取成功，字符数={len(result)}")
                    return result
            except ImportError:
                logger.warning("[Profile] pymupdf未安装，降级使用pdfplumber")
            except Exception as e:
                logger.warning(f"[Profile] pymupdf提取失败({e})，降级使用pdfplumber")

            # 方案2：pdfplumber（备用）
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    result = "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
                if result.strip():
                    logger.info(f"[Profile] pdfplumber提取成功，字符数={len(result)}")
                    return result
            except ImportError:
                logger.warning("[Profile] pdfplumber未安装")
            except Exception as e:
                logger.warning(f"[Profile] pdfplumber提取失败({e})")

            # 方案3：读原始字节（最后兜底）
            logger.warning("[Profile] 降级为原始字节读取")
            with open(file_path, "rb") as f:
                return f.read().decode("utf-8", errors="ignore")

        elif ext in (".docx", ".doc"):
            try:
                import docx
                doc = docx.Document(file_path)
                return "\n".join(p.text for p in doc.paragraphs)
            except ImportError:
                logger.warning("[Profile] python-docx未安装，无法解析Word文档")
                return ""

        else:  # .txt 及其他
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

    except Exception as e:
        logger.error(f"[Profile] 文本提取失败 {file_path}: {e}")
        return ""


# ============================================================
# 2.4 获取简历解析结果
# POST /api/v1/profile/resume-parse-result
# ============================================================
@profile_bp.route("/resume-parse-result", methods=["POST"])
def get_resume_parse_result():
    """
    轮询获取AI简历解析结果。
    请求体：{ user_id, task_id }
    """
    try:
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        task_id = body.get("task_id")

        if not user_id:
            return error_response(400, "请提供 user_id 参数")
        if not task_id:
            return error_response(400, "请提供 task_id 参数")

        service = get_profile_service()
        result = service.get_parse_result(task_id)

        if result is None:
            return error_response(404, f"任务不存在或已过期: {task_id}")

        return success_response(result)

    except Exception as e:
        logger.error(f"[API] /profile/resume-parse-result 异常: {e}", exc_info=True)
        return error_response(500, f"服务器内部错误: {str(e)}")
