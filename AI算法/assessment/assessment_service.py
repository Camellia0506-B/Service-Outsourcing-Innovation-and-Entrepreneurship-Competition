"""
职业测评模块 - 服务层
对应 API 文档第 3 章
包含AI核心算法:
1. 动态问卷生成
2. 多维度计分算法(霍兰德/MBTI/能力/价值观)
3. AI综合报告生成
"""

import json
import os
import threading
import random
from datetime import datetime
from typing import Dict, List, Optional
from utils.logger_handler import logger
from assessment.question_bank_vector_store import QuestionBankVectorStore


# ===== 辅助函数 =====

def _load_assessment_config() -> dict:
    """加载assessment配置"""
    import yaml
    from utils.path_tool import get_abs_path
    path = get_abs_path("config/assessment.yml")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=yaml.FullLoader)


def _load_prompt(prompt_key: str) -> str:
    """从prompts.yml加载指定prompt模板"""
    from utils.config_handler import prompts_conf
    from utils.path_tool import get_abs_path
    prompt_path = prompts_conf.get(prompt_key)
    if not prompt_path:
        raise ValueError(f"Prompt key '{prompt_key}' not found in prompts.yml")
    abs_path = get_abs_path(prompt_path)
    with open(abs_path, "r", encoding="utf-8") as f:
        return f.read()


def _ensure_data_dir():
    """确保数据目录存在"""
    from utils.path_tool import get_abs_path
    data_dir = get_abs_path("data/assessment")
    os.makedirs(data_dir, exist_ok=True)


def _load_store(store_path_key: str) -> dict:
    """加载JSON存储文件"""
    _ensure_data_dir()
    from utils.path_tool import get_abs_path
    config = _load_assessment_config()
    path = get_abs_path(config[store_path_key])
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_store(store_path_key: str, data: dict):
    """保存JSON存储文件"""
    _ensure_data_dir()
    from utils.path_tool import get_abs_path
    config = _load_assessment_config()
    path = get_abs_path(config[store_path_key])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _extract_json(raw_text: str) -> dict:
    """从模型输出中提取JSON（兼容markdown包裹）"""
    text = raw_text.strip()
    # 移除markdown代码块标记
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    return json.loads(text)


def _ensure_question_options(q: dict) -> dict:
    """确保题目有 options 供前端渲染。量表题若只有 labels 则转为 options。"""
    if not q or not isinstance(q, dict):
        return q
    opts = q.get("options")
    if opts and isinstance(opts, list) and len(opts) > 0:
        return q
    labels = q.get("labels")
    if isinstance(labels, list) and len(labels) > 0 and q.get("question_type") == "scale":
        q = dict(q)
        q["options"] = [
            {"option_id": str(i + 1), "option_text": labels[i], "score": i + 1}
            for i in range(len(labels))
        ]
    return q


# ===== 核心服务类 =====

class AssessmentService:
    """职业测评服务：问卷生成 + AI计分 + 报告生成"""

    def __init__(self):
        self.config = _load_assessment_config()
        self.questionnaires = _load_store("questionnaire_store_path")
        self.answers = _load_store("answers_store_path")
        self.reports = _load_store("reports_store_path")
        self.tasks = _load_store("report_tasks_store_path")
        # 题库向量数据库（RAG检索）
        self.question_bank = QuestionBankVectorStore()
        # 确保题库已加载
        try:
            self.question_bank.load_questions()
        except Exception as e:
            logger.warning(f"[Assessment] 题库加载异常: {e}")

    # ==================================================
    # 3.1 获取测评问卷
    # ==================================================
    def get_questionnaire(self, user_id: int, assessment_type: str) -> dict:
        """
        生成/获取职业测评问卷。
        assessment_type: comprehensive(综合) / quick(快速)
        对应 API 文档 3.1
        """
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
        assessment_id = f"assess_{ts}_{user_id}"

        # 检查类型合法性
        type_config = self.config["assessment_types"].get(assessment_type)
        if not type_config:
            raise ValueError(f"Invalid assessment_type: {assessment_type}")

        # 生成问卷（调用问卷生成算法，每维度 5 题）
        dimensions_data = self._generate_questions(assessment_type)
        total = sum(len(d.get("questions", [])) for d in dimensions_data)

        questionnaire = {
            "assessment_id": assessment_id,
            "user_id": user_id,
            "assessment_type": assessment_type,
            "total_questions": total,
            "estimated_time": min(10, max(5, total // 2)),  # 约 5–10 分钟
            "dimensions": dimensions_data,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # 持久化
        self.questionnaires[assessment_id] = questionnaire
        _save_store("questionnaire_store_path", self.questionnaires)

        logger.info(f"[Assessment] 生成问卷 assessment_id={assessment_id}, type={assessment_type}")
        return questionnaire

    def _generate_questions(self, assessment_type: str) -> List[dict]:
        """
        问卷生成算法：从题库向量数据库检索题目（RAG方式）。
        每个维度固定 5 题，共 20 题。
        为了让每次测评看到的题目组合有所不同，这里会按维度随机抽题。
        """
        # 每个维度均 5 题
        QUESTIONS_PER_DIMENSION = 5
        dim_configs = {
            "interest": {"dimension_id": "interest", "dimension_name": "职业兴趣", "count": QUESTIONS_PER_DIMENSION},
            "personality": {"dimension_id": "personality", "dimension_name": "性格特质", "count": QUESTIONS_PER_DIMENSION},
            "ability": {"dimension_id": "ability", "dimension_name": "能力倾向", "count": QUESTIONS_PER_DIMENSION},
            "values": {"dimension_id": "values", "dimension_name": "职业价值观", "count": QUESTIONS_PER_DIMENSION},
        }
        dimensions = []

        for dim_id, dim_cfg in dim_configs.items():
            try:
                # 一次多取一些题，再随机抽取目标数量，保证每次问卷题目组合不同
                retrieve_count = dim_cfg["count"] * 3
                raw_questions = self.question_bank.retrieve_by_dimension(
                    dimension_id=dim_id,
                    count=retrieve_count
                )
                # 确保每题都有 options（量表题从 labels 转为 options）
                raw_questions = [_ensure_question_options(q) for q in raw_questions]

                # 随机打乱并截取前 N 题；若题库不足则全部使用
                questions = list(raw_questions) if raw_questions else []
                if len(questions) > dim_cfg["count"]:
                    random.shuffle(questions)
                    questions = questions[:dim_cfg["count"]]
                dimensions.append({
                    "dimension_id": dim_id,
                    "dimension_name": dim_cfg["dimension_name"],
                    "questions": questions
                })
                logger.info(f"[Assessment] 从RAG检索 {dim_id} 维度题目: {len(questions)}题")
            except Exception as e:
                logger.error(f"[Assessment] 检索 {dim_id} 维度题目失败: {e}")
                dimensions.append({
                    "dimension_id": dim_id,
                    "dimension_name": dim_cfg["dimension_name"],
                    "questions": []
                })

        return dimensions

    # ==================================================
    # 3.2 提交测评答案（触发AI报告生成）
    # ==================================================
    def submit_answers(self, user_id: int, assessment_id: str, answers: List[dict], time_spent: int) -> dict:
        """
        提交测评答卷，触发后台AI报告生成。
        对应 API 文档 3.2
        """
        # 校验assessment_id
        if assessment_id not in self.questionnaires:
            raise ValueError(f"Invalid assessment_id: {assessment_id}")

        # 生成report_id
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
        report_id = f"report_{ts}_{user_id}"

        # 保存答案
        answer_record = {
            "assessment_id": assessment_id,
            "user_id": user_id,
            "answers": answers,
            "time_spent": time_spent,
            "submitted_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        self.answers[assessment_id] = answer_record
        _save_store("answers_store_path", self.answers)

        # 初始化任务状态
        self.tasks[report_id] = {
            "status": "processing",
            "user_id": user_id,
            "assessment_id": assessment_id,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "result": None,
            "error": None
        }
        _save_store("report_tasks_store_path", self.tasks)

        # 后台线程生成报告
        def _run():
            try:
                # 1. 计分
                scores = self._calculate_scores(assessment_id, answers)
                # 2. 调用AI生成报告
                report = self._generate_report_with_ai(user_id, assessment_id, answers, scores)
                # 2.5 用后端计分覆盖能力分析、兴趣匹配度（保证能力有区分度、兴趣匹配度基于 Holland）
                report = self._inject_scores_into_report(report, scores)
                # 2.55 能力详细分析：AI 生成每项能力的文字描述（不写死）
                report = self._generate_ability_descriptions(report)
                # 2.6 注入计算机相关岗位推荐（适合职业领域 + 最匹配职业，来自数据集 + Holland/MBTI）
                try:
                    from assessment.career_recommender import inject_career_recommendations
                    report = inject_career_recommendations(report)
                except Exception as inj:
                    logger.warning("[Assessment] 注入职业推荐失败，保留AI原结果: %s", inj)
                # 3. 保存报告
                report["report_id"] = report_id
                report["user_id"] = user_id
                report["assessment_date"] = datetime.now().strftime("%Y-%m-%d")
                report["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                report["status"] = "completed"
                self.reports[report_id] = report
                _save_store("reports_store_path", self.reports)

                self.tasks[report_id]["status"] = "completed"
                self.tasks[report_id]["result"] = {"report_id": report_id}
                logger.info(f"[Assessment] 报告生成完成 report_id={report_id}")
            except Exception as e:
                self.tasks[report_id]["status"] = "failed"
                self.tasks[report_id]["error"] = str(e)
                logger.error(f"[Assessment] 报告生成失败 report_id={report_id}: {e}", exc_info=True)
            finally:
                _save_store("report_tasks_store_path", self.tasks)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

        logger.info(f"[Assessment] 答案提交成功，触发报告生成 report_id={report_id}")
        return {"report_id": report_id, "status": "processing"}

    def _calculate_scores(self, assessment_id: str, answers: List[dict]) -> dict:
        """
        多维度计分算法：
        - 霍兰德6类型分数
        - 5大性格特质分数
        - 5项能力分数
        - 5个价值观分数
        """
        questionnaire = self.questionnaires[assessment_id]
        answer_map = {a["question_id"]: a["answer"] for a in answers}

        # 初始化分数
        holland_scores = {"R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0}
        trait_scores = {"外向性": 0, "开放性": 0, "尽责性": 0, "宜人性": 0, "情绪稳定性": 0}
        ability_scores = {"逻辑分析能力": 0, "学习能力": 0, "沟通表达能力": 0, "执行能力": 0, "创新能力": 0}
        value_scores = {"成就感": 0, "学习发展": 0, "工作稳定": 0, "薪资待遇": 0, "工作环境": 0}

        # 遍历问卷题目，累加分数
        for dim in questionnaire["dimensions"]:
            dim_id = dim["dimension_id"]
            for q in dim["questions"]:
                qid = q["question_id"]
                user_answer = answer_map.get(qid)
                if not user_answer:
                    continue

                # 根据题目类型计分
                if q["question_type"] == "single_choice":
                    options = q.get("options") or []
                    score = None
                    for idx, opt in enumerate(options):
                        # 兼容 option_id 与 user_answer 类型不一致（如 "A" vs "A"，或前端传索引 0/1/2）
                        if str(opt.get("option_id", "")) == str(user_answer):
                            score = opt.get("score", 0)
                            break
                    if score is None and options and isinstance(user_answer, (int, float)):
                        # 前端可能传的是选项索引 0/1/2
                        idx = int(user_answer)
                        if 0 <= idx < len(options):
                            score = options[idx].get("score", 0)
                    if score is not None:
                        if dim_id == "interest":
                            holland_type = q.get("holland_type", "R")
                            holland_scores[holland_type] += score
                        elif dim_id == "personality":
                            trait = q.get("trait", "外向性")
                            trait_scores[trait] += score
                            logger.debug(
                                "[性格计分] qid=%s trait=%s user_answer=%s score=%s",
                                qid, trait, user_answer, score
                            )
                        elif dim_id == "values":
                            val_type = q.get("value_type", "成就感")
                            value_scores[val_type] += score
                    elif dim_id == "personality":
                        logger.warning(
                            "[性格计分] 未匹配到选项 qid=%s trait=%s user_answer=%s options=%s",
                            qid, q.get("trait"), user_answer,
                            [{"option_id": o.get("option_id"), "score": o.get("score")} for o in options]
                        )

                elif q["question_type"] == "scale":
                    # 量表题（1-5分）
                    scale_score = int(user_answer) if isinstance(user_answer, (int, str)) else 3
                    if dim_id == "ability":
                        ability = q.get("ability", "逻辑分析能力")
                        ability_scores[ability] += scale_score * 20  # 每题 20–100，3 题合计 60–300

        # 性格特质：每维度 4 题、每题 1–5 分，原始分 4–20，*5 归一为 20–100
        logger.info("[性格计分] 归一前原始分 trait_scores=%s", dict(trait_scores))
        for k in trait_scores:
            trait_scores[k] = min(100, int(trait_scores[k] * 5))
        logger.info("[性格计分] 归一后 trait_scores=%s", dict(trait_scores))

        # 归一化到 0–100
        for k in holland_scores:
            holland_scores[k] = min(100, int(holland_scores[k] * 5))  # 假设每类型最多20分原始分
        for k in value_scores:
            value_scores[k] = min(100, int(value_scores[k] * 10))
        # 能力分数：每题 1–5 分×20=20–100，每能力 3 题共 60–300，归一为 60–100（有区分度，避免全 60）
        raw_ability = dict(ability_scores)
        for k in ability_scores:
            raw = ability_scores[k]
            # 映射 0–300 -> 60–100：0->60, 150->80, 300->100
            if raw <= 0:
                normalized = 60
            else:
                normalized = 60 + (raw / 300.0) * 40
            ability_scores[k] = max(60, min(100, int(round(normalized))))
        logger.info("[能力计分] 原始分 raw_ability=%s 归一后 abilities=%s", raw_ability, dict(ability_scores))

        return {
            "holland": holland_scores,
            "traits": trait_scores,
            "abilities": ability_scores,
            "values": value_scores
        }

    def _inject_scores_into_report(self, report: dict, scores: dict) -> dict:
        """
        用后端计分结果覆盖报告中的能力分析、兴趣匹配度，保证数据有区分度且基于 Holland 计算。
        """
        # 1) 能力分析：按实际能力分数拆成优势(>=75)与待提升(<70)
        abilities = scores.get("abilities") or {}
        type_names = {"R": "实用型(R)", "I": "研究型(I)", "A": "艺术型(A)", "S": "社会型(S)", "E": "企业型(E)", "C": "常规型(C)"}
        strengths = []
        areas_to_improve = []
        for name, score in abilities.items():
            item = {"ability": name, "score": score}
            if score >= 75:
                strengths.append({**item, "description": "该项能力表现突出"})
            elif score < 70:
                areas_to_improve.append({**item, "suggestions": ["可通过练习与项目实践持续提升"]})
        strengths.sort(key=lambda x: -x["score"])
        areas_to_improve.sort(key=lambda x: x["score"])
        if "ability_analysis" not in report:
            report["ability_analysis"] = {}
        report["ability_analysis"]["strengths"] = strengths
        report["ability_analysis"]["areas_to_improve"] = areas_to_improve

        # 2) 性格特质：始终用后端计分覆盖五项，最低 20 分（避免 AI 或旧数据出现 0 分）
        trait_scores = scores.get("traits") or {}
        trait_names = ["外向性", "开放性", "尽责性", "宜人性", "情绪稳定性"]
        level_map = lambda s: "高" if s >= 70 else "偏高" if s >= 55 else "中等" if s >= 40 else "偏低" if s >= 25 else "低"
        report["personality_analysis"] = report.get("personality_analysis") or {}
        report["personality_analysis"]["traits"] = [
            {
                "trait_name": name,
                "score": min(100, max(20, int(trait_scores.get(name, 0)))),
                "level": level_map(max(20, trait_scores.get(name, 0))),
                "description": ""
            }
            for name in trait_names
        ]

        # 3) 兴趣匹配度：取 Holland 最高维度作为主要兴趣类型，其分数即兴趣匹配度
        holland = scores.get("holland") or {}
        if holland:
            order = sorted(holland.keys(), key=lambda k: -holland[k])
            top_letter = order[0] if order else "I"
            top_score = holland.get(top_letter, 0)
            code = "".join(order[:3]) if len(order) >= 3 else (order[0] * 3)
            if "interest_analysis" not in report:
                report["interest_analysis"] = {}
            if "primary_interest" not in report["interest_analysis"]:
                report["interest_analysis"]["primary_interest"] = {}
            desc_map = {"R": "喜欢动手、操作与机械", "I": "喜欢观察、研究与分析", "A": "喜欢创作、表达与审美", "S": "喜欢与人沟通、助人", "E": "喜欢影响他人、领导", "C": "喜欢条理、数据与规范"}
            report["interest_analysis"]["primary_interest"]["type"] = type_names.get(top_letter, top_letter)
            report["interest_analysis"]["primary_interest"]["score"] = min(100, max(0, int(top_score)))
            report["interest_analysis"]["primary_interest"]["description"] = report["interest_analysis"]["primary_interest"].get("description") or desc_map.get(top_letter, "")
            report["interest_analysis"]["holland_code"] = code
            dist = [{"type": type_names.get(k, k), "score": holland[k]} for k in ["R", "I", "A", "S", "E", "C"]]
            dist.sort(key=lambda x: -x["score"])
            report["interest_analysis"]["interest_distribution"] = dist
        return report

    def _match_ability_key(self, report_ability: str, keys_from_ai: dict) -> Optional[str]:
        """根据报告中的能力名从 AI 返回的 key 中匹配（支持简称/全称不一致）"""
        if not report_ability or not keys_from_ai:
            return None
        report_ability = (report_ability or "").strip()
        if report_ability in keys_from_ai:
            return report_ability
        for k in keys_from_ai:
            if (k or "").strip() == report_ability:
                return k
            if report_ability in (k or "") or (k or "") in report_ability:
                return k
        return None

    def _generate_ability_descriptions(self, report: dict) -> dict:
        """
        用 AI 为能力分析中的优势与待提升项生成简短文字描述，不写死在前后端。
        写入 ability_analysis.strengths[].description 与 areas_to_improve[].suggestions
        """
        aa = report.get("ability_analysis") or {}
        strengths = list(aa.get("strengths") or [])
        areas = list(aa.get("areas_to_improve") or [])
        if not strengths and not areas:
            return report
        ability_data = json.dumps(
            {"strengths": [{"ability": x.get("ability"), "score": x.get("score")} for x in strengths],
             "areas_to_improve": [{"ability": x.get("ability"), "score": x.get("score")} for x in areas]},
            ensure_ascii=False, indent=2
        )
        try:
            from langchain_core.output_parsers import StrOutputParser
            from langchain_core.prompts import PromptTemplate
            try:
                from model.factory import chat_model
                model = chat_model
            except ImportError:
                from langchain_community.chat_models.tongyi import ChatTongyi
                from utils.config_handler import rag_conf
                model = ChatTongyi(model=rag_conf["chat_model_name"])
            prompt_template = _load_prompt("ability_descriptions_prompt_path")
            prompt = PromptTemplate(input_variables=["ability_data"], template=prompt_template)
            chain = prompt | model | StrOutputParser()
            raw = chain.invoke({"ability_data": ability_data})
            out = _extract_json(raw)
            desc_by_ability = {str(x.get("ability", "")).strip(): (x.get("description") or "").strip() for x in (out.get("strengths") or []) if x.get("ability")}
            sugg_by_ability = {str(x.get("ability", "")).strip(): (x.get("suggestions") or []) for x in (out.get("areas_to_improve") or []) if x.get("ability")}
            for s in strengths:
                key = self._match_ability_key(s.get("ability"), desc_by_ability)
                if key and desc_by_ability.get(key):
                    s["description"] = desc_by_ability[key]
                elif not s.get("description"):
                    s["description"] = "该项能力表现较好，可在职业发展中持续发挥。"
            for a in areas:
                key = self._match_ability_key(a.get("ability"), sugg_by_ability)
                if key and sugg_by_ability.get(key):
                    a["suggestions"] = [str(x).strip() for x in sugg_by_ability[key] if x]
                elif not a.get("suggestions"):
                    a["suggestions"] = ["可通过练习与项目实践持续提升。"]
            report["ability_analysis"]["strengths"] = strengths
            report["ability_analysis"]["areas_to_improve"] = areas
            logger.info("[Assessment] 能力描述 AI 生成完成，待提升 %s 条已写入", len(areas))
        except Exception as e:
            logger.warning("[Assessment] 能力描述 AI 生成失败，保留原描述: %s", e, exc_info=True)
        return report

    def _generate_report_with_ai(self, user_id: int, assessment_id: str, answers: List[dict], scores: dict) -> dict:
        """
        AI核心算法：调用通义大模型（qwen3-max）生成综合测评报告。
        输入：用户档案 + 答题数据 + 计分结果
        输出：霍兰德分析 + MBTI分析 + 能力分析 + 价值观分析 + 职业建议
        """
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import PromptTemplate

        # 模型加载（与profile_service保持一致）
        try:
            from model.factory import chat_model
            model = chat_model
        except ImportError:
            from langchain_community.chat_models.tongyi import ChatTongyi
            from utils.config_handler import rag_conf
            model = ChatTongyi(model=rag_conf["chat_model_name"])

        # 加载用户档案（如果有的话）
        try:
            from profile.profile_service import ProfileService
            profile_service = ProfileService()
            user_profile_data = profile_service.get_profile(user_id)
            user_profile = json.dumps(user_profile_data, ensure_ascii=False, indent=2)
        except Exception:
            user_profile = "用户档案暂无"

        # 构造prompt输入
        prompt_template = _load_prompt("assessment_report_prompt_path")
        prompt = PromptTemplate(
            input_variables=["user_profile", "answers_data", "dimension_scores"],
            template=prompt_template
        )
        chain = prompt | model | StrOutputParser()

        # 调用模型
        raw_output = chain.invoke({
            "user_profile": user_profile,
            "answers_data": json.dumps(answers, ensure_ascii=False, indent=2),
            "dimension_scores": json.dumps(scores, ensure_ascii=False, indent=2)
        })

        # 解析JSON
        report_data = _extract_json(raw_output)
        logger.info(f"[Assessment] AI报告生成完成，confidence={report_data.get('confidence_score', 0)}")
        return report_data

    # ==================================================
    # 3.3 获取测评报告
    # ==================================================
    def get_report(self, user_id: int, report_id: str) -> Optional[dict]:
        """
        获取测评报告（轮询任务状态）。
        对应 API 文档 3.3
        """
        # 先查任务状态
        task = self.tasks.get(report_id)
        if not task:
            return None

        if task["status"] == "processing":
            return {
                "report_id": report_id,
                "status": "processing",
                "message": "报告生成中，请稍后查询"
            }
        elif task["status"] == "failed":
            return {
                "report_id": report_id,
                "status": "failed",
                "error": task.get("error", "未知错误")
            }
        else:  # completed
            report = self.reports.get(report_id)
            if not report:
                return None
            return report

    # ==================================================
    # 历史报告列表（供 GET /assessment/report-history）
    # ==================================================
    def list_reports_for_user(self, user_id: int) -> List[dict]:
        """
        查询该用户所有已完成的测评报告，按创建时间倒序。
        返回简要信息：report_id, created_at, holland_code, mbti, match_score
        """
        out = []
        for rid, report in self.reports.items():
            if report.get("user_id") != user_id:
                continue
            if report.get("status") != "completed":
                continue
            interest = report.get("interest_analysis") or {}
            primary = interest.get("primary_interest") or {}
            personality = report.get("personality_analysis") or {}
            created = report.get("created_at") or ""
            # 格式化为 "2026-02-20 17:28"
            if len(created) >= 16:
                created = created[:16].rstrip()
            elif created and len(created) == 19:
                created = created[:16]
            out.append({
                "report_id": rid,
                "created_at": created,
                "holland_code": interest.get("holland_code") or "",
                "mbti": personality.get("mbti_type") or "",
                "match_score": primary.get("score") if primary.get("score") is not None else 0
            })
        out.sort(key=lambda x: x["created_at"] or "", reverse=True)
        return out


# ===== 单例获取 =====
_service_instance = None


def get_assessment_service() -> AssessmentService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AssessmentService()
    return _service_instance
