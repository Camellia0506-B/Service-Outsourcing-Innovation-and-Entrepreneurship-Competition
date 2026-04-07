"""
AI职业规划智能体 - 主应用入口
整合所有模块，启动Flask服务
"""
import os
import sys
import uuid
import tempfile
import threading

# 保证无论从何目录执行 python app.py，工作目录均为本文件所在目录（AI算法）
_script_dir = os.path.dirname(os.path.abspath(__file__))
if os.getcwd() != _script_dir:
    os.chdir(_script_dir)
    sys.path.insert(0, _script_dir)

from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from utils.logger_handler import logger

app = Flask(__name__)
app.config['SECRET_KEY'] = 'gradquest_secret_key_2026'
# 显式 threading，避免 Windows 上误选 eventlet 等导致跨线程 emit 丢失
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# 项目根目录下的 frontend（与 AI算法 同级），供本机直接打开 http://127.0.0.1:5002/ 使用，避免在仓库根目录起 http.server 导致 404 File not found
_project_root = os.path.dirname(_script_dir)
_frontend_dir = os.path.join(_project_root, "frontend")


def _safe_frontend_file(rel_path: str):
    """若文件存在于 frontend 目录内则返回绝对路径，否则返回 None（防目录穿越）。"""
    if not rel_path:
        return None
    rel_path = rel_path.replace("\\", "/").lstrip("/")
    if ".." in rel_path.split("/"):
        return None
    base = os.path.normpath(os.path.abspath(_frontend_dir))
    full = os.path.normpath(os.path.join(base, rel_path))
    if not full.startswith(base + os.sep) and full != base:
        return None
    return full if os.path.isfile(full) else None

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
from api.mock_interview_router import mock_interview_bp, interview_sessions
from api.security_router import security_bp
from api.resume_router import resume_bp
from api.hr_router import hr_bp

app.register_blueprint(matching_bp)
app.register_blueprint(student_bp)
app.register_blueprint(graph_bp)
app.register_blueprint(agent_chat_bp)
app.register_blueprint(tracking_bp)
app.register_blueprint(mock_interview_bp)
app.register_blueprint(security_bp)
app.register_blueprint(resume_bp)
app.register_blueprint(hr_bp)
logger.info("[App] 注册路由: 安全与隐私设置模块 /api/v1/security/*")

# ========== 启动时自动初始化所有向量库 ==========
def _auto_init_vector_stores():
    """
    服务启动时在后台线程中依次初始化三个 ChromaDB Collection：
    1. interview_questions  —— 模拟面试题库（JSONL → ChromaDB）
    2. assessment_questions —— 职业测评题库（内置题目 / question_bank.json）
    3. agent                —— RAG 知识库（data/ 目录下的 txt/pdf）
    全部使用幂等检查，已有数据则跳过，不影响服务正常启动。
    """

    # ── 1. 模拟面试题库 ──────────────────────────────────────────────
    try:
        from langchain_chroma import Chroma
        from model.factory import embedding_model
        from utils.config_handler import chroma_conf

        vs = Chroma(
            collection_name="interview_questions",
            embedding_function=embedding_model,
            persist_directory=chroma_conf["persist_directory"],
        )
        existing = vs.get()
        count = len(existing["ids"]) if existing and existing.get("ids") else 0
        if count == 0:
            logger.info("[App] 面试题库为空，开始自动导入...")
            from scripts.import_questions import import_questions
            import_questions()
            logger.info("[App] 面试题库导入完成")
        else:
            logger.info(f"[App] 面试题库已有 {count} 道题目，跳过导入")
    except Exception as e:
        logger.warning(f"[App] 面试题库自动导入失败（不影响启动）: {e}")

    # ── 2. 职业测评题库 ──────────────────────────────────────────────
    try:
        from assessment.question_bank_vector_store import QuestionBankVectorStore
        store = QuestionBankVectorStore()
        store.load_questions()
        logger.info("[App] 职业测评题库初始化完成")
    except Exception as e:
        logger.warning(f"[App] 职业测评题库初始化失败（不影响启动）: {e}")

    # ── 3. RAG 知识库 ────────────────────────────────────────────────
    try:
        from rag.vector_store import VectorStoreService
        rag_vs = VectorStoreService()
        rag_vs.load_document()
        logger.info("[App] RAG 知识库加载完成")
    except Exception as e:
        logger.warning(f"[App] RAG 知识库加载失败（不影响启动）: {e}")


threading.Thread(target=_auto_init_vector_stores, daemon=True).start()
logger.info("[App] 注册路由: 简历生成模块 /api/v1/resume/*")
logger.info("[App] 注册路由: HR管理模块 /api/v1/hr/*")
logger.info("[App] 注册路由: 关联图谱模块 /api/v1/job/search, /api/v1/job/promotion-path, /api/v1/job/transfer-path")
logger.info("[App] 注册路由: 智能体对话模块 /api/v1/agent/chat")
logger.info("[App] 注册路由: Career Tracking 模块 /api/v1/tracking/*")
logger.info("[App] 注册路由: 模拟面试模块 /api/v1/mock-interview/*")

# ========== WebSocket 事件处理 ==========
active_streams = {}


def _ffmpeg_webm_to_wav(webm_path: str, wav_path: str) -> bool:
    """pydub 不可用时（未装 ffmpeg 等），尝试直接调用 ffmpeg 将 webm 转为 16k 单声道 wav。"""
    import shutil
    import subprocess

    ffmpeg_exe = shutil.which("ffmpeg")
    if not ffmpeg_exe:
        return False
    try:
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                webm_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "wav",
                wav_path,
            ],
            check=True,
            capture_output=True,
            timeout=120,
        )
        return os.path.isfile(wav_path) and os.path.getsize(wav_path) > 0
    except Exception as e:
        logger.warning("[WebSocket] ffmpeg webm->wav 失败: %s", e)
        return False


def _parse_dashscope_asr_result(result):
    """从 DashScope Recognition.call 返回值解析转写文本与句子列表（兼容不同 SDK 返回结构）。"""
    full_text = ""
    sentences = []
    if hasattr(result, "get_sentence"):
        try:
            full_text = result.get_sentence() or ""
        except Exception:
            pass
    if not full_text and hasattr(result, "output"):
        out = result.output
        if hasattr(out, "text") and out.text:
            full_text = str(out.text)
        elif hasattr(out, "results") and out.results:
            for item in out.results:
                if hasattr(item, "sentence") and item.sentence:
                    sent = item.sentence
                    t = sent.text if hasattr(sent, "text") else str(sent)
                    sentences.append(
                        {
                            "text": t,
                            "begin_time": sent.begin_time if hasattr(sent, "begin_time") else 0,
                            "end_time": sent.end_time if hasattr(sent, "end_time") else 0,
                        }
                    )
                    full_text += t
        elif isinstance(out, dict):
            if out.get("text"):
                full_text = str(out["text"])
            elif out.get("sentence"):
                full_text = str(out["sentence"])
            raw_list = out.get("sentences") or out.get("results")
            if isinstance(raw_list, list):
                for s in raw_list:
                    if isinstance(s, dict):
                        t = s.get("text") or s.get("sentence") or ""
                        if t:
                            sentences.append(
                                {
                                    "text": str(t),
                                    "begin_time": int(s.get("begin_time", 0) or 0),
                                    "end_time": int(s.get("end_time", 0) or 0),
                                }
                            )
                            full_text += str(t)
    full_text = (full_text or "").strip()
    if not sentences and full_text:
        sentences = [{"text": full_text, "begin_time": 0, "end_time": 10000}]
    return full_text, sentences


@socketio.on('connect')
def handle_connect():
    from flask import request
    sid = request.sid
    logger.info(f"[WebSocket] 客户端连接: {sid}")
    emit('connected', {'sid': sid})

def _stop_stream_recognition_session(sid, join_timeout=6.0):
    """断开时关闭 DashScope 实时识别；stop() 可能长时间阻塞，故带超时避免卡死 Socket 线程。"""
    sess = active_streams.pop(sid, None)
    if not sess:
        return
    rec = sess.get("recognition")
    if not rec:
        return
    done = threading.Event()

    def _run_stop():
        try:
            from dashscope.common.error import InvalidParameter

            rec.stop()
        except InvalidParameter:
            pass
        except Exception as e:
            logger.warning("[WebSocket] recognition.stop 异常 sid=%s: %s", sid, e)
        finally:
            done.set()

    t = threading.Thread(target=_run_stop, daemon=True)
    t.start()
    if not done.wait(timeout=join_timeout):
        logger.warning(
            "[WebSocket] recognition.stop 超时(%ss) sid=%s，后续会话将新建识别实例",
            join_timeout,
            sid,
        )


def _create_realtime_asr_callback(client_sid, interview_id):
    """为每个连接构造 DashScope RecognitionCallback（实时 PCM 流）。"""
    from dashscope.audio.asr import RecognitionCallback, RecognitionResult
    from api.mock_interview_router import calculate_speech_metrics

    job_title = "后端开发工程师"
    job_type = None
    if interview_id and interview_id in interview_sessions:
        iv = interview_sessions[interview_id]
        job_title = iv.get("target_job_title", job_title)
        job_type = iv.get("job_type")

    class RealtimeASRCallback(RecognitionCallback):
        def __init__(self):
            self.sid = client_sid
            self.completed_sentences = []
            self.latest_full_text = ""

        def on_open(self) -> None:
            logger.info("[WebSocket] DashScope 实时识别已连接 sid=%s", self.sid)

        @staticmethod
        def _normalize_sentence(s):
            if not isinstance(s, dict):
                return {"text": str(s), "begin_time": 0, "end_time": 0}
            return {
                "text": s.get("text") or "",
                "begin_time": int(s.get("begin_time") or 0),
                "end_time": int(s.get("end_time") or 0),
            }

        def on_event(self, result: RecognitionResult) -> None:
            sentence = result.get_sentence()
            if not isinstance(sentence, dict) or "text" not in sentence:
                return
            text = sentence.get("text") or ""
            ended = RecognitionResult.is_sentence_end(sentence)
            if ended and text:
                self.completed_sentences.append(self._normalize_sentence(sentence))
            stable = "".join(s.get("text", "") for s in self.completed_sentences)
            full = stable if ended else stable + text
            self.latest_full_text = full
            try:
                socketio.emit(
                    "asr_partial",
                    {"transcript": full, "sentence_end": ended},
                    room=self.sid,
                )
            except Exception as ex:
                logger.warning("[WebSocket] emit asr_partial 失败: %s", ex)

        def _emit_stopped_and_cleanup(self, stop_status, stop_message, transcript):
            speech_meta = None
            try:
                if self.completed_sentences:
                    speech_meta = calculate_speech_metrics(
                        self.completed_sentences, job_title, job_type
                    )
                else:
                    speech_meta = {
                        "words_per_minute": 0,
                        "pause_count": 0,
                        "confidence_keywords": [],
                        "fluency_score": 0,
                        "total_duration_seconds": 0,
                    }
                socketio.emit(
                    "streaming_stopped",
                    {
                        "status": stop_status,
                        "message": stop_message,
                        "transcript": transcript,
                        "speech_meta": {
                            "words_per_minute": speech_meta.get("words_per_minute", 0),
                            "pause_count": speech_meta.get("pause_count", 0),
                            "confidence_keywords": speech_meta.get(
                                "confidence_keywords", []
                            ),
                            "fluency_score": speech_meta.get("fluency_score", 0),
                        },
                    },
                    room=self.sid,
                )
            finally:
                active_streams.pop(self.sid, None)

        def on_complete(self) -> None:
            transcript = (self.latest_full_text or "").strip()
            if not transcript:
                transcript = "".join(
                    s.get("text", "") for s in self.completed_sentences
                ).strip()
            if transcript:
                self._emit_stopped_and_cleanup("success", "", transcript)
            else:
                self._emit_stopped_and_cleanup(
                    "warning",
                    "未识别到有效语音，请重试",
                    "",
                )
            logger.info(
                "[WebSocket] 实时识别完成 sid=%s transcript_len=%s",
                self.sid,
                len(transcript),
            )

        def on_error(self, result: RecognitionResult) -> None:
            msg = getattr(result, "message", None) or "语音识别失败"
            logger.error("[WebSocket] 实时识别错误 sid=%s: %s", self.sid, msg)
            try:
                socketio.emit(
                    "streaming_stopped",
                    {
                        "status": "error",
                        "message": msg,
                        "transcript": (self.latest_full_text or "").strip(),
                        "speech_meta": None,
                    },
                    room=self.sid,
                )
            finally:
                active_streams.pop(self.sid, None)

    return RealtimeASRCallback()


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid
    logger.info(f"[WebSocket] 客户端断开连接: {sid}")
    _stop_stream_recognition_session(sid)


@socketio.on('start_streaming')
def handle_start_streaming(data):
    """开始实时流式语音识别（前端发送 16kHz 单声道 PCM s16le，见 audio_chunk）。

    必须在当前 Socket 事件处理线程内 emit：在部分环境下子线程里 socketio.emit 无法送达客户端，
    会导致前端一直等 streaming_started。DashScope recognition.start() 本身会起线程，此处同步调用即可。
    """
    from flask import request
    from utils.config_handler import rag_conf

    sid = request.sid
    try:
        logger.info("[WebSocket] 收到 start_streaming sid=%s payload=%s", sid, data)
        emit("streaming_progress", {"step": "received"}, to=sid)

        interview_id = data.get("interview_id", "")
        user_id = data.get("user_id", "")

        api_key = (
            rag_conf.get("api_key")
            or rag_conf.get("dashscope_api_key")
            or rag_conf.get("DASHSCOPE_API_KEY")
        )
        if not api_key:
            api_key = os.environ.get("DASHSCOPE_API_KEY")
        if not api_key:
            emit(
                "streaming_failed",
                {"message": "未配置 DashScope API Key，无法进行实时语音识别"},
                to=sid,
            )
            return

        import dashscope
        from dashscope.audio.asr import Recognition

        dashscope.api_key = api_key
        emit("streaming_progress", {"step": "closing_previous"}, to=sid)
        _stop_stream_recognition_session(sid)

        emit("streaming_progress", {"step": "starting_dashscope"}, to=sid)
        callback = _create_realtime_asr_callback(sid, interview_id)
        recognition = Recognition(
            model="paraformer-realtime-v2",
            format="pcm",
            sample_rate=16000,
            language_hints=["zh", "en"],
            callback=callback,
        )
        recognition.start()
        active_streams[sid] = {
            "interview_id": interview_id,
            "user_id": user_id,
            "recognition": recognition,
            "callback": callback,
            "mode": "realtime_pcm",
        }
        emit(
            "streaming_started",
            {"status": "success", "message": "实时语音识别已启动"},
            to=sid,
        )
        logger.info(
            "[WebSocket] 实时流式语音识别已启动 sid=%s user_id=%s",
            sid,
            user_id,
        )
    except Exception as e:
        logger.error(
            "[WebSocket] start_streaming 失败 sid=%s: %s", sid, e, exc_info=True
        )
        active_streams.pop(sid, None)
        try:
            emit(
                "streaming_failed",
                {"message": f"启动实时识别失败: {str(e)}"},
                to=sid,
            )
        except Exception:
            pass


@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """接收 PCM 音频帧（base64，16kHz 单声道 s16le），推送到 DashScope 实时识别。"""
    try:
        import base64
        from flask import request

        sid = request.sid
        if sid not in active_streams:
            return

        session = active_streams[sid]
        if session.get("mode") != "realtime_pcm":
            return

        b64 = data.get("audio_data") or data.get("pcm_base64")
        if not b64:
            return

        pcm = base64.b64decode(b64)
        if not pcm:
            return

        rec = session.get("recognition")
        if not rec:
            return

        try:
            rec.send_audio_frame(pcm)
        except Exception as e:
            logger.warning("[WebSocket] send_audio_frame 失败 sid=%s: %s", sid, e)

    except Exception as e:
        logger.error(f"[WebSocket] 处理音频数据失败: {e}", exc_info=True)


@socketio.on('stop_streaming')
def handle_stop_streaming():
    """结束实时识别：停止推流并阻塞等待 DashScope 收尾，on_complete 会 emit streaming_stopped。"""
    try:
        from flask import request
        from dashscope.common.error import InvalidParameter

        sid = request.sid
        session = active_streams.get(sid)
        if not session:
            emit("streaming_stopped", {
                "status": "warning",
                "message": "会话已结束",
                "transcript": "",
                "speech_meta": None,
            })
            return

        rec = session.get("recognition")
        logger.info("[WebSocket] 停止实时流式语音识别 sid=%s", sid)

        if rec:
            try:
                rec.stop()
            except InvalidParameter:
                pass
            except Exception as e:
                logger.warning("[WebSocket] recognition.stop: %s", e)

        if sid in active_streams:
            cb = session.get("callback")
            transcript = ""
            if cb and hasattr(cb, "completed_sentences"):
                transcript = "".join(
                    s.get("text", "") for s in cb.completed_sentences
                ).strip()
            active_streams.pop(sid, None)
            emit(
                "streaming_stopped",
                {
                    "status": "warning" if not transcript else "success",
                    "message": "" if transcript else "识别会话已结束",
                    "transcript": transcript,
                    "speech_meta": None,
                },
            )
            logger.warning(
                "[WebSocket] stop 后会话仍残留，已兜底 emit sid=%s",
                sid,
            )

    except Exception as e:
        logger.error(f"[WebSocket] 停止流式语音识别失败: {e}", exc_info=True)
        emit("error", {"message": f"处理失败: {str(e)}"})

# TODO: 后续功能模块按需注册
# from api.auth_router import auth_bp
# app.register_blueprint(auth_bp)
# from api.student_profile_router import student_bp
# app.register_blueprint(student_bp)

# ========== 岗位数据预加载：启动时在后台加载 CSV，首屏「岗位匹配」会更快 ==========
def _preload_job_data():
    try:
        from job_profile.job_profile_service import get_job_profile_service
        get_job_profile_service()
        logger.info("[App] 岗位数据预加载已触发（后台加载中，首请求将更快）")
    except Exception as e:
        logger.warning("[App] 岗位数据预加载失败: %s", e)

_thread = threading.Thread(target=_preload_job_data, daemon=True)
_thread.start()

logger.info(
    "[App] 前端托管目录: %s （存在=%s，可直接打开 http://127.0.0.1:<端口>/ 访问页面）",
    _frontend_dir,
    os.path.isdir(_frontend_dir),
)

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


# ========== 托管前端静态资源（仅 GET；/api/* 仍走上方蓝图）==========
@app.route("/", methods=["GET"])
def _serve_frontend_index():
    if not os.path.isdir(_frontend_dir):
        logger.warning("[App] frontend 目录不存在: %s", _frontend_dir)
        return jsonify({"code": 503, "msg": "frontend 目录未找到", "data": {"path": _frontend_dir}}), 503
    return send_from_directory(_frontend_dir, "index.html")


@app.route("/<path:subpath>", methods=["GET"])
def _serve_frontend_static(subpath: str):
    # 未匹配到更具体的 /api/... 路由时才会进入；若路径以 api/ 开头则视为错误 API 路径
    if subpath.startswith("api/"):
        return jsonify({"code": 404, "msg": "接口不存在", "data": None}), 404
    fp = _safe_frontend_file(subpath)
    if fp:
        directory, basename = os.path.split(fp)
        return send_from_directory(directory, basename)
    # 无后缀路径当作前端路由，回退 index.html（SPA）
    if "." not in os.path.basename(subpath):
        index_html = os.path.join(_frontend_dir, "index.html")
        if os.path.isfile(index_html):
            return send_from_directory(_frontend_dir, "index.html")
    return jsonify({"code": 404, "msg": "文件不存在", "data": None}), 404


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
    # 默认 5002：Windows 常保留 5000-5001，导致"以一种访问权限不允许的方式做了一个访问套接字的尝试"
    port = int(os.environ.get("AI_SERVICE_PORT", "5002"))
    logger.info("AI 服务端口: %s（可通过环境变量 AI_SERVICE_PORT 修改）", port)
    # use_reloader=False：避免双进程导致 WebSocket 连到子进程而事件在父进程丢失、客户端一直等不到 streaming_started
    socketio.run(app, host="0.0.0.0", port=port, debug=True, use_reloader=False)
