"""
AI职业规划智能体 - 主应用入口
整合所有模块，启动Flask服务
"""

from flask import Flask, jsonify
from utils.logger_handler import logger

app = Flask(__name__)

# ========== 注册路由蓝图 ==========

# 岗位画像模块（第一个功能）
from api.job_profile_router import job_bp, _register_system_route
app.register_blueprint(job_bp)
_register_system_route(app)   # 注册 8.2: POST /api/v1/system/generate-job-profiles
logger.info("[App] 注册路由: 岗位画像模块 /api/v1/job/*")
logger.info("[App] 注册路由: 系统管理模块 /api/v1/system/*")

# TODO: 后续功能模块按需注册
# from api.auth_router import auth_bp
# app.register_blueprint(auth_bp)
# from api.student_profile_router import student_bp
# app.register_blueprint(student_bp)
# from api.career_report_router import career_bp
# app.register_blueprint(career_bp)


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
    app.run(host="0.0.0.0", port=8080, debug=True)
