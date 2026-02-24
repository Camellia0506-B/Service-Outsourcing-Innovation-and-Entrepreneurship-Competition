"""
AI职业规划智能体 - 主应用入口
整合所有模块，启动Flask服务
"""
import os
import sys

# 保证无论从何目录执行 python app.py，工作目录均为本文件所在目录（AI算法）
_script_dir = os.path.dirname(os.path.abspath(__file__))
if os.getcwd() != _script_dir:
    os.chdir(_script_dir)
    sys.path.insert(0, _script_dir)

from flask import Flask, jsonify, request
from utils.logger_handler import logger

app = Flask(__name__)

# ========== CORS：允许前端 (localhost:8080) 跨域访问 ==========
def _cors_headers():
    return {
        "Access-Control-Allow-Origin": request.origin if request.origin and ("localhost" in request.origin or "127.0.0.1" in request.origin) else "http://localhost:3000",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }

@app.after_request
def _add_cors(resp):
    for k, v in _cors_headers().items():
        resp.headers[k] = v
    return resp

@app.before_request
def _handle_preflight():
    if request.method == "OPTIONS":
        from flask import make_response
        r = make_response("", 204)
        for k, v in _cors_headers().items():
            r.headers[k] = v
        return r

# ========== 注册路由蓝图 ==========

# 岗位画像模块（第一个功能）
from api.job_profile_router import job_bp, _register_system_route
app.register_blueprint(job_bp)
_register_system_route(app)   # 注册 8.2: POST /api/v1/system/generate-job-profiles
logger.info("[App] 注册路由: 岗位画像模块 /api/v1/job/*")
logger.info("[App] 注册路由: 系统管理模块 /api/v1/system/*")

# 个人档案模块（第二个功能）
from api.profile_router import profile_bp
from api.assessment_router import assessment_bp
app.register_blueprint(profile_bp)
app.register_blueprint(assessment_bp)
logger.info("[App] 注册路由: 职业测评模块 /api/v1/assessment/*")
logger.info("[App] 注册路由: 个人档案模块 /api/v1/profile/*")

# 职业规划报告模块（与测评报告打通，走同一份报告数据）
from api.career_report_router import career_bp
app.register_blueprint(career_bp)
logger.info("[App] 注册路由: 职业规划报告模块 /api/v1/career/*")


from api.matching_router import matching_bp
from api.student_ability_router import student_bp
from api.graph_router import graph_bp
from api.agent_chat_router import agent_chat_bp
from api.tracking_router import tracking_bp

app.register_blueprint(matching_bp)
app.register_blueprint(student_bp)
app.register_blueprint(graph_bp)
app.register_blueprint(agent_chat_bp)
app.register_blueprint(tracking_bp)
logger.info("[App] 注册路由: 关联图谱模块 /api/v1/job/search, /api/v1/job/promotion-path, /api/v1/job/transfer-path")
logger.info("[App] 注册路由: 智能体对话模块 /api/v1/agent/chat")
logger.info("[App] 注册路由: Career Tracking 模块 /api/v1/tracking/*")

# 岗位详情模块
from api.job_detail_api import job_detail_bp
app.register_blueprint(job_detail_bp)
logger.info("[App] 注册路由: 岗位详情模块 /api/v1/job/detail/*")

# TODO: 后续功能模块按需注册
# from api.auth_router import auth_bp
# app.register_blueprint(auth_bp)
# from api.student_profile_router import student_bp
# app.register_blueprint(student_bp)


# ========== 调试：列出所有已注册路由（排查 404 时用）==========
@app.route("/api/v1/routes", methods=["GET"])
def list_routes():
    routes = [{"rule": r.rule, "methods": list(r.methods - {"HEAD", "OPTIONS"})} for r in app.url_map.iter_rules()]
    return jsonify({"code": 200, "msg": "ok", "data": routes})


# ========== 健康检查接口 ==========
@app.route("/api/v1/health", methods=["GET"])
def health_check():
    return jsonify({
        "code": 200,
        "msg": "服务运行正常",
        "data": {
            "service": "AI职业规划智能体",
            "version": "v1.0",
            "modules": [
                "岗位画像模块（已启用）",
                "学生画像模块（待开发）",
                "职业规划报告模块（待开发）",
            ]
        }
    })


# ========== 404 处理 ==========
@app.errorhandler(404)
def not_found(e):
    return jsonify({"code": 404, "msg": "接口不存在", "data": None}), 404


# ========== 500 处理 ==========
@app.errorhandler(500)
def server_error(e):
    return jsonify({"code": 500, "msg": "服务器内部错误", "data": None}), 500


if __name__ == "__main__":
    logger.info("启动 AI职业规划智能体 服务...")
    # 默认 5002：Windows 常保留 5000-5001，导致“以一种访问权限不允许的方式做了一个访问套接字的尝试”
    port = int(os.environ.get("AI_SERVICE_PORT", "5002"))
    logger.info("AI 服务端口: %s（可通过环境变量 AI_SERVICE_PORT 修改）", port)
    app.run(host="0.0.0.0", port=port, debug=True)
