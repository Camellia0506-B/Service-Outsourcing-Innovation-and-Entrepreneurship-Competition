"""
智能体对话模块 - API 路由
对应 API 文档第 8 章：智能体对话与自主规划
在平台右下角提供智能体小智悬浮窗：意图识别 + 平台数据拉取 + 流式回复
"""

import json
from flask import Blueprint, request, Response, stream_with_context
from utils.logger_handler import logger

agent_chat_bp = Blueprint("agent_chat", __name__)

# 意图关键词与平台能力对应（与文档 8、现有模块一致）
INTENT_PATTERNS = [
    {"keywords": ["测评", "测试结果", "测评报告", "能力测评", "霍兰德", "MBTI"], "intent": "get_assessment"},
    {"keywords": ["岗位推荐", "推荐岗位", "适合什么工作", "匹配岗位", "人岗匹配"], "intent": "get_matching"},
    {"keywords": ["职业规划", "规划报告", "生成报告", "职业报告", "规划建议"], "intent": "get_career_report"},
    {"keywords": ["个人档案", "我的信息", "个人信息", "档案", "简历"], "intent": "get_profile"},
    {"keywords": ["能力画像", "我的能力", "能力分析", "学生能力"], "intent": "get_ability"},
    {"keywords": ["岗位画像", "岗位详情", "岗位信息", "某个岗位"], "intent": "get_job_profile"},
]


def detect_intent(message: str) -> str:
    for p in INTENT_PATTERNS:
        if any(kw in message for kw in p["keywords"]):
            return p["intent"]
    return "general_chat"


def call_platform_api(intent: str, user_id: int, token: str) -> dict:
    """调用平台已有接口获取数据（与 API 文档 2~7 章一致）"""
    import requests
    base = "http://127.0.0.1:5001/api/v1"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        if intent == "get_assessment":
            r = requests.get(f"{base}/assessment/report-history", params={"user_id": user_id}, headers=headers, timeout=8)
            if r.status_code != 200:
                return {}
            data = r.json().get("data") or []
            if not data:
                return {"hint": "暂无测评报告，请先完成职业测评"}
            report_id = data[0].get("report_id") if isinstance(data[0], dict) else None
            if not report_id:
                return {"hint": "暂无测评报告"}
            r2 = requests.post(f"{base}/assessment/report", json={"user_id": user_id, "report_id": report_id}, headers=headers, timeout=10)
            return (r2.json() or {}).get("data", {})
        elif intent == "get_matching":
            r = requests.post(f"{base}/matching/recommend-jobs", json={"user_id": user_id, "top_n": 5}, headers=headers, timeout=8)
            return (r.json() or {}).get("data", {})
        elif intent == "get_career_report":
            r = requests.post(f"{base}/career/report-history", json={"user_id": user_id, "page": 1, "size": 1}, headers=headers, timeout=8)
            hist = (r.json() or {}).get("data", {})
            list_val = hist.get("list") if isinstance(hist, dict) else []
            if not list_val:
                return {"hint": "暂无职业规划报告，请先生成报告"}
            report_id = list_val[0].get("report_id")
            if not report_id:
                return {"hint": "暂无职业规划报告"}
            r2 = requests.post(f"{base}/career/report", json={"user_id": user_id, "report_id": report_id}, headers=headers, timeout=10)
            return (r2.json() or {}).get("data", {})
        elif intent == "get_profile":
            r = requests.post(f"{base}/profile/info", json={"user_id": user_id}, headers=headers, timeout=8)
            return (r.json() or {}).get("data", {})
        elif intent == "get_ability":
            r = requests.post(f"{base}/student/ability-profile", json={"user_id": user_id}, headers=headers, timeout=8)
            return (r.json() or {}).get("data", {})
        elif intent == "get_job_profile":
            r = requests.post(f"{base}/job/profiles", json={"page": 1, "size": 5}, headers=headers, timeout=8)
            d = (r.json() or {}).get("data", {})
            return {"job_list": (d.get("list") or d.get("records") or [])[:5]}
    except Exception as e:
        logger.warning(f"[Agent] call_platform_api {intent} 异常: {e}")
        return {"error": str(e)}
    return {}


@agent_chat_bp.route("/api/v1/agent/chat", methods=["POST"])
def agent_chat():
    """
    智能体对话（流式 SSE）。
    请求体：{ message, history: [{role, content}], user_id }
    """
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    user_id = int(data.get("user_id") or 0)
    token = (request.headers.get("Authorization") or "").replace("Bearer ", "").strip()

    if not message:
        return Response(
            json.dumps({"code": 400, "msg": "消息不能为空"}, ensure_ascii=False),
            status=400,
            mimetype="application/json",
        )

    intent = detect_intent(message)
    platform_data = {}
    if intent != "general_chat":
        platform_data = call_platform_api(intent, user_id, token)

    system_prompt = """你是基于AI的职业规划平台的智能体小智。
你能帮助用户了解他们的测评结果、岗位匹配情况、职业规划报告、个人档案、能力画像等信息。
回答要简洁、友好、专业，适当使用emoji，不超过300字。
如果有平台数据，优先基于真实数据回答，不要编造。
你具备主动分析、规划建议、跨模块联动的能力。"""

    # 组装为 dict 列表，在 generate() 内转为 LangChain 消息后 stream
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-20:]:
        role = (h.get("role") or "user").strip().lower()
        content = (h.get("content") or "").strip()
        if not content:
            continue
        messages.append({"role": "assistant" if role == "assistant" else "user", "content": content})
    user_content = message
    if platform_data and "error" not in platform_data:
        user_content += "\n\n[平台数据参考]:\n" + json.dumps(platform_data, ensure_ascii=False, indent=2)[:2000]
    messages.append({"role": "user", "content": user_content})

    def generate():
        try:
            from langchain_core.prompts import PromptTemplate
            from langchain_core.output_parsers import StrOutputParser
            from langchain_community.chat_models.tongyi import ChatTongyi
            from model.factory import chat_model
            from utils.config_handler import rag_conf

            # qwen3.5-plus 等为多模态模型，走多模态端点；ChatTongyi 纯文本接口会报 url error，智能体改用纯文本模型
            model_name = (rag_conf or {}).get("chat_model_name", "qwen3-max")
            if any(model_name.startswith(m) for m in ("qwen3.5-plus", "qwen3.5-plus-")) or "vl" in (model_name or "").lower():
                agent_llm = ChatTongyi(model="qwen-plus")
            else:
                agent_llm = chat_model

            # 把历史消息拼成字符串上下文
            history_text = ""
            for m in messages[1:]:  # 跳过system
                role = "用户" if m["role"] == "user" else "小智"
                history_text += f"{role}：{m['content']}\n"

            # 构建prompt
            template = PromptTemplate.from_template("""
{system}

对话历史：
{history}
用户：{input}
小智：""")

            chain = template | agent_llm | StrOutputParser()

            # 流式输出
            for chunk in chain.stream({
                "system": messages[0]["content"],  # system prompt
                "history": history_text,
                "input": message
            }):
                if chunk:
                    yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"

        except Exception as e:
            print(f"[ERROR] generate失败: {e}")
            yield f"data: {json.dumps({'text': f'出错了：{str(e)}'}, ensure_ascii=False)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
