"""
AI职业规划智能体 - 主应用入口
整合所有模块，启动Flask服务
"""

from flask import Flask, jsonify, request
from utils.logger_handler import logger

app = Flask(__name__)

# ========== CORS：允许前端 (localhost:8080) 跨域访问 ==========
def _cors_headers():
    return {
        "Access-Control-Allow-Origin": request.origin if request.origin and ("localhost" in request.origin or "127.0.0.1" in request.origin) else "http://localhost:8080",
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

# TODO: 后续功能模块按需注册
# from api.auth_router import auth_bp
# app.register_blueprint(auth_bp)
# from api.student_profile_router import student_bp
# app.register_blueprint(student_bp)


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
    # 使用 5001 端口，避免与前端静态服务(常占 8080) 冲突
    app.run(host="0.0.0.0", port=5001, debug=True)
