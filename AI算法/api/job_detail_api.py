"""
岗位详情API服务
用于从Excel文件查询符合条件的岗位详情
"""

import pandas as pd
from flask import Blueprint, request, jsonify

from utils.logger_handler import logger
from utils.path_tool import get_abs_path

job_detail_bp = Blueprint("job_detail", __name__)

# Excel文件路径
EXCEL_PATH = get_abs_path("data/a13基于AI的大学生职业规划智能体-JD采样数据.xls")

# 缓存Excel数据，避免重复读取
_cached_data = None
_cached_time = None

def _load_excel_data():
    """加载Excel数据"""
    global _cached_data
    try:
        # 使用xlrd引擎读取xls文件
        data = pd.read_excel(EXCEL_PATH, engine='xlrd')
        logger.info(f"[JobDetail] 已加载Excel数据，共{len(data)}条记录")
        _cached_data = data
        return data
    except Exception as e:
        logger.error(f"[JobDetail] 加载Excel数据失败: {e}")
        return None


def _get_excel_data():
    """获取Excel数据（使用缓存）"""
    if _cached_data is None:
        return _load_excel_data()
    return _cached_data


@job_detail_bp.route("/api/v1/job/detail/query", methods=["POST"])
def query_job_detail():
    """
    查询符合条件的岗位详情
    
    请求参数：
    {
        "job_name": "岗位名称",  # 如 "算法工程师"
        "limit": 5  # 返回数量限制
    }
    
    返回：
    {
        "code": 200,
        "msg": "success",
        "data": {
            "total": 10,
            "list": [
                {
                    "职位编号": "...",
                    "职位名称": "...",
                    "工作地址": "...",
                    "薪资范围": "...",
                    "企业性质": "...",
                    "公司全称": "...",
                    "人员规模": "...",
                    "所属行业": "...",
                    "职位描述": "...",
                    "公司简介": "...",
                    "更新地址": "...",
                    "岗位来源地址": "..."
                }
            ]
        }
    }
    """
    try:
        # 获取请求参数
        req_data = request.json or {}
        job_name = req_data.get("job_name", "").strip()
        limit = int(req_data.get("limit", 5))
        
        if not job_name:
            return jsonify({
                "code": 400,
                "msg": "岗位名称不能为空",
                "data": None
            })
        
        # 加载Excel数据
        data = _get_excel_data()
        if data is None:
            return jsonify({
                "code": 500,
                "msg": "Excel数据加载失败",
                "data": None
            })
        
        # 过滤数据：岗位名称包含指定关键词
        filtered_data = data[data["岗位名称"].astype(str).str.contains(job_name, na=False)]
        
        # 限制返回数量
        filtered_data = filtered_data.head(limit)
        
        # 转换为字典列表，并映射字段名
        result_list = []
        for _, row in filtered_data.iterrows():
            result_list.append({
                "职位编号": row.get('岗位编码', ''),
                "职位名称": row.get('岗位名称', ''),
                "工作地址": row.get('地址', ''),
                "薪资范围": row.get('薪资范围', ''),
                "企业性质": row.get('公司类型', ''),
                "公司全称": row.get('公司名称', ''),
                "人员规模": row.get('公司规模', ''),
                "所属行业": row.get('所属行业', ''),
                "职位描述": row.get('岗位详情', ''),
                "公司简介": row.get('公司详情', '')
            })
        
        return jsonify({
            "code": 200,
            "msg": "success",
            "data": {
                "total": len(filtered_data),
                "list": result_list
            }
        })
        
    except Exception as e:
        logger.error(f"[JobDetail] 查询失败: {e}")
        return jsonify({
            "code": 500,
            "msg": f"查询失败: {str(e)}",
            "data": None
        })


@job_detail_bp.route("/api/v1/job/detail/refresh", methods=["GET"])
def refresh_data():
    """刷新Excel数据缓存"""
    try:
        _load_excel_data()
        return jsonify({
            "code": 200,
            "msg": "数据已刷新",
            "data": None
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"刷新失败: {str(e)}",
            "data": None
        })


# 注册蓝图
def register_blueprint(app):
    app.register_blueprint(job_detail_bp)
