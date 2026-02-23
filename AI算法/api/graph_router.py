"""
关联图谱 API：岗位搜索、晋升路径流式生成、转岗路径流式生成
动态数据：GET /job/career-path、GET /job/relation-graph 基于 job_profiles 表
"""
import json as _json
from flask import Blueprint, request, Response, stream_with_context

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from graph.job_graph_service import search_jobs, get_salary_context
from utils.logger_handler import logger

graph_bp = Blueprint('graph', __name__, url_prefix='/api/v1')


_job_profiles_ready = False


def _ensure_job_profiles():
    global _job_profiles_ready
    if _job_profiles_ready:
        return
    try:
        from job_profile.job_profiles_db import init_db, populate_from_csv, get_connection
        from utils.path_tool import get_abs_path
        init_db()
        conn = get_connection()
        try:
            cur = conn.execute("SELECT COUNT(*) FROM job_profiles")
            if cur.fetchone()[0] == 0:
                csv_path = get_abs_path(os.path.join("data", "求职岗位信息数据.csv"))
                populate_from_csv(csv_path, limit=5000)
        finally:
            conn.close()
        _job_profiles_ready = True
    except Exception as e:
        logger.warning("[graph] job_profiles 初始化/填充失败: %s", e)


@graph_bp.route('/job/career-path', methods=['GET'])
def get_career_path():
    """基于 job_profiles 表动态晋升路径：同岗位按 experience_years 升序，薪资与技能来自库"""
    job_name = (request.args.get("jobName") or "").strip()
    if not job_name:
        return _json.dumps({"code": 400, "msg": "jobName 不能为空", "data": None}, ensure_ascii=False), 400, {"Content-Type": "application/json"}
    try:
        _ensure_job_profiles()
        from job_profile.job_profiles_db import get_career_path as db_get_path
        path = db_get_path(job_name)
        return _json.dumps({"code": 200, "msg": "success", "data": {"path": path}}, ensure_ascii=False), 200, {"Content-Type": "application/json"}
    except Exception as e:
        logger.exception("[graph] career-path 异常")
        return _json.dumps({"code": 500, "msg": str(e), "data": {"path": []}}, ensure_ascii=False), 500, {"Content-Type": "application/json"}


@graph_bp.route('/job/relation-graph', methods=['GET'])
def get_relation_graph():
    """基于 job_profiles 表动态转岗图谱：当前岗位 + 全表，匹配度 = 技能交集/目标技能数*100"""
    job_name = (request.args.get("jobName") or "").strip()
    if not job_name:
        return _json.dumps({"code": 400, "msg": "jobName 不能为空", "data": None}, ensure_ascii=False), 400, {"Content-Type": "application/json"}
    try:
        _ensure_job_profiles()
        from job_profile.job_profiles_db import get_relation_graph as db_get_graph
        out = db_get_graph(job_name)
        # 前端期望 data 为 relations 数组（或兼容格式）
        data = out.get("relations", [])
        return _json.dumps({"code": 200, "msg": "success", "data": data, "center_job": out.get("current_job")}, ensure_ascii=False), 200, {"Content-Type": "application/json"}
    except Exception as e:
        logger.exception("[graph] relation-graph 异常")
        return _json.dumps({"code": 500, "msg": str(e), "data": []}, ensure_ascii=False), 500, {"Content-Type": "application/json"}


@graph_bp.route('/job/recruitments', methods=['GET'])
def job_recruitments():
    """根据岗位关键词返回 3～5 条 CSV 招聘信息，供换岗卡片「查看详情」表格展示"""
    keyword = (request.args.get("keyword") or "").strip()
    if not keyword:
        return _json.dumps({"code": 400, "msg": "keyword 不能为空", "data": []}, ensure_ascii=False), 400, {"Content-Type": "application/json"}
    try:
        results = search_jobs(keyword, top_n=5)
        list_ = []
        for r in results:
            sal = r.get("salary") or {}
            salary_display = sal.get("display", "") if isinstance(sal, dict) else str(sal)
            list_.append({
                "职位编号": r.get("job_id", ""),
                "职位名称": r.get("job_name", ""),
                "工作地址": r.get("location", ""),
                "薪资范围": salary_display,
                "企业性质": r.get("company_nature", ""),
                "公司全称": r.get("company", ""),
                "人员规模": r.get("company_scale", ""),
                "所属行业": r.get("industry", ""),
                "职位描述": r.get("description", ""),
                "公司简介": r.get("company_intro", ""),
            })
        return _json.dumps({"code": 200, "msg": "success", "data": list_}, ensure_ascii=False), 200, {"Content-Type": "application/json"}
    except Exception as e:
        logger.exception("[graph] job/recruitments 异常")
        return _json.dumps({"code": 500, "msg": str(e), "data": []}, ensure_ascii=False), 500, {"Content-Type": "application/json"}


@graph_bp.route('/job/search', methods=['POST'])
def job_search():
    keyword = (request.get_json(silent=True) or {}).get('keyword', '').strip()
    if not keyword:
        return _json.dumps({'code': 400, 'msg': '关键词不能为空', 'data': None}, ensure_ascii=False), 400, {'Content-Type': 'application/json'}
    try:
        results = search_jobs(keyword, top_n=10)
        return _json.dumps({'code': 200, 'msg': 'success', 'data': {'jobs': results, 'total': len(results)}}, ensure_ascii=False), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.exception("[graph] job/search 异常")
        return _json.dumps({'code': 500, 'msg': str(e), 'data': None}, ensure_ascii=False), 500, {'Content-Type': 'application/json'}


def _stream_llm(prompt: str):
    """流式调用 qwen3-max，yield SSE data: {text: content}"""
    try:
        from dashscope import Generation
        response = Generation.call(
            model="qwen3-max",
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
            stream=True,
        )
        for chunk in response:
            content = ""
            if getattr(chunk, "output", None) and getattr(chunk.output, "choices", None):
                choices = chunk.output.choices
                if choices and len(choices) > 0:
                    msg = getattr(choices[0], "message", None)
                    if msg is not None:
                        content = getattr(msg, "content", None) or ""
            if content:
                yield f"data: {_json.dumps({'text': content}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.exception("[graph] LLM stream 异常")
        yield f"data: {_json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"


@graph_bp.route('/job/promotion-path', methods=['POST'])
def promotion_path():
    job_name = (request.get_json(silent=True) or {}).get('job_name', '').strip()
    if not job_name:
        return _json.dumps({'code': 400, 'msg': 'job_name不能为空', 'data': None}, ensure_ascii=False), 400, {'Content-Type': 'application/json'}

    ctx = get_salary_context(job_name)
    salary_sample = (ctx.get('salary_samples') or [])[:6]
    industries = ctx.get('industries') or []

    prompt = f"""你是职业规划专家。为"{job_name}"生成4阶段晋升路径。
数据集真实信息：找到{ctx.get('total_found', 0)}个相关岗位，薪资参考：{salary_sample}，行业：{industries}

严格返回如下JSON，不加任何多余文字和markdown代码块：
{{"stages":[
  {{"level":1,"title":"初级{job_name}","years":"0-2年","salary":"根据数据推断","badge":"入门级","description":"职责描述60字以内","skills":["技能1","技能2","技能3","技能4"],"companies":"中小型公司","promotion_hint":"晋升到下一级需要什么"}},
  {{"level":2,"title":"{job_name}","years":"2-4年","salary":"根据数据推断","badge":"当前岗位","is_current":true,"description":"职责描述60字以内","skills":["技能1","技能2","技能3","技能4","技能5"],"companies":"大中型公司","promotion_hint":"晋升提示"}},
  {{"level":3,"title":"高级{job_name}","years":"4-7年","salary":"根据数据推断","badge":"进阶","description":"职责描述60字以内","skills":["技能1","技能2","技能3","技能4","技能5","新增技能6"],"companies":"大厂/独角兽","promotion_hint":"晋升提示"}},
  {{"level":4,"title":"顶端分叉","years":"7+年","salary":"根据数据推断","badge":"顶端","forks":[
    {{"route":"专家路线","title":"{job_name}专家/研究员","description":"40字描述","skills":["技能1","技能2","技能3"],"companies":"头部企业"}},
    {{"route":"管理路线","title":"{job_name}负责人/总监","description":"40字描述","skills":["技能1","技能2","技能3"],"companies":"头部企业"}}
  ]}}
]}}"""

    def generate():
        for chunk in _stream_llm(prompt):
            yield chunk

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive'}
    )


@graph_bp.route('/job/transfer-path', methods=['POST'])
def transfer_path():
    job_name = (request.get_json(silent=True) or {}).get('job_name', '').strip()
    if not job_name:
        return _json.dumps({'code': 400, 'msg': 'job_name不能为空', 'data': None}, ensure_ascii=False), 400, {'Content-Type': 'application/json'}

    ctx = get_salary_context(job_name)
    salary_sample = (ctx.get('salary_samples') or [])[:8]
    industries = ctx.get('industries') or []

    prompt = f"""你是职业规划专家。为"{job_name}"生成换岗血缘图谱。
数据集薪资参考：{salary_sample}，行业：{industries}

要求：
1. 至少6个转岗目标岗位
2. 每个岗位的 kinship_edges 至少包含2个其他节点id（表示岗位间血缘关系，可互转）
3. 薪资必须基于上方真实数据推断，不能瞎编

严格返回JSON，不加任何多余文字和markdown代码块：
{{"center_job":"{job_name}","transfer_nodes":[
  {{"id":"node1","name":"目标岗位名","icon":"📊","salary":"参考数据","match_score":85,"difficulty":"低","transition_months":"3-6个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node2","node3"]}},
  {{"id":"node2","name":"目标岗位名","icon":"📱","salary":"参考数据","match_score":80,"difficulty":"低","transition_months":"3-6个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node1","node4"]}},
  {{"id":"node3","name":"目标岗位名","icon":"⚙️","salary":"参考数据","match_score":72,"difficulty":"中","transition_months":"6-12个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node1","node5"]}},
  {{"id":"node4","name":"目标岗位名","icon":"📈","salary":"参考数据","match_score":68,"difficulty":"中","transition_months":"6-12个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node2","node6"]}},
  {{"id":"node5","name":"目标岗位名","icon":"🧪","salary":"参考数据","match_score":55,"difficulty":"高","transition_months":"12-24个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node3","node6"]}},
  {{"id":"node6","name":"目标岗位名","icon":"🏗️","salary":"参考数据","match_score":50,"difficulty":"高","transition_months":"18-24个月","transferable_skills":"可迁移的技能","description":"30字描述","edge_label":"转型方向标签","kinship_edges":["node4","node5"]}}
]}}"""

    def generate():
        for chunk in _stream_llm(prompt):
            yield chunk

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive'}
    )
