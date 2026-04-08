# -*- coding: utf-8 -*-
"""
智能评分脚本：基于用户答题计算各维度分数（学习/逻辑/执行/创新）
可与后端 /api/v1/assessment/calculate 共用同一套 question_mapping 逻辑。
"""
import json


def calculate_scores(answers):
    """
    基于用户答题情况计算各维度分数
    answers: dict 如 {"q1": "A", "q2": "C", ...} 或 list 如 [{"question_id":"1","answer":"A"}, ...]
    """
    if isinstance(answers, list):
        sorted_list = sorted(answers, key=lambda x: (_qkey(x.get("question_id")), x.get("question_id", "")))
        answers = {"q%d" % (i + 1): _norm_option(sorted_list[i].get("answer")) for i in range(min(20, len(sorted_list))) if i < len(sorted_list)}

    question_mapping = {
        "q1": {"dimension": "learning", "scores": {"A": 90, "B": 70, "C": 50, "D": 30}},
        "q2": {"dimension": "learning", "scores": {"A": 85, "B": 65, "C": 45, "D": 25}},
        "q3": {"dimension": "learning", "scores": {"A": 95, "B": 75, "C": 55, "D": 35}},
        "q4": {"dimension": "learning", "scores": {"A": 80, "B": 60, "C": 40, "D": 20}},
        "q5": {"dimension": "learning", "scores": {"A": 88, "B": 68, "C": 48, "D": 28}},
        "q6": {"dimension": "logic", "scores": {"A": 92, "B": 72, "C": 52, "D": 32}},
        "q7": {"dimension": "logic", "scores": {"A": 87, "B": 67, "C": 47, "D": 27}},
        "q8": {"dimension": "logic", "scores": {"A": 93, "B": 73, "C": 53, "D": 33}},
        "q9": {"dimension": "logic", "scores": {"A": 89, "B": 69, "C": 49, "D": 29}},
        "q10": {"dimension": "logic", "scores": {"A": 91, "B": 71, "C": 51, "D": 31}},
        "q11": {"dimension": "execution", "scores": {"A": 86, "B": 66, "C": 46, "D": 26}},
        "q12": {"dimension": "execution", "scores": {"A": 90, "B": 70, "C": 50, "D": 30}},
        "q13": {"dimension": "execution", "scores": {"A": 84, "B": 64, "C": 44, "D": 24}},
        "q14": {"dimension": "execution", "scores": {"A": 88, "B": 68, "C": 48, "D": 28}},
        "q15": {"dimension": "execution", "scores": {"A": 92, "B": 72, "C": 52, "D": 32}},
        "q16": {"dimension": "innovation", "scores": {"A": 94, "B": 74, "C": 54, "D": 34}},
        "q17": {"dimension": "innovation", "scores": {"A": 89, "B": 69, "C": 49, "D": 29}},
        "q18": {"dimension": "innovation", "scores": {"A": 91, "B": 71, "C": 51, "D": 31}},
        "q19": {"dimension": "innovation", "scores": {"A": 87, "B": 67, "C": 47, "D": 27}},
        "q20": {"dimension": "innovation", "scores": {"A": 93, "B": 73, "C": 53, "D": 33}},
    }

    dimension_scores = {"learning": [], "logic": [], "execution": [], "innovation": []}
    for q_id, answer in answers.items():
        if q_id in question_mapping:
            mapping = question_mapping[q_id]
            score = mapping["scores"].get(str(answer).upper() if answer else None, 50)
            dimension_scores[mapping["dimension"]].append(score)

    results = {}
    for dim, scores in dimension_scores.items():
        results[dim] = int(sum(scores) / len(scores)) if scores else 60
    return results


def _qkey(qid):
    if qid is None:
        return 999
    s = str(qid).strip()
    if s.startswith("q"):
        try:
            return int(s[1:])
        except ValueError:
            return 999
    try:
        return int(s)
    except ValueError:
        return 999


def _norm_option(a):
    if a is None:
        return ""
    s = str(a).strip().upper()
    return s[0] if s else ""


def generate_suggestions(scores):
    """根据分数生成具体建议"""
    suggestions = {}
    dim_names = {"learning": "学习能力", "logic": "逻辑分析能力", "execution": "执行能力", "innovation": "创新能力"}
    advice_map = {
        "learning": {
            "优秀": "你的学习能力很强！建议：1) 深入学习前沿技术（AI、云计算、区块链）；2) 通过阅读开源项目源码提升技术深度；3) 在技术社区分享学习心得，建立个人品牌。",
            "一般": "学习能力有提升空间。建议：1) 制定系统化学习计划，每周学习新技术；2) 通过慕课网、Coursera等平台系统学习；3) 参加技术读书会或学习小组。",
            "较弱": "学习能力需要加强。建议：1) 从基础知识开始系统学习；2) 寻找导师或报名培训班；3) 每天保持1-2小时专注学习时间。",
        },
        "logic": {
            "优秀": "逻辑思维强！建议：1) 参加算法竞赛（LeetCode周赛、ACM）提升算法能力；2) 深入学习数据结构与算法；3) 参与复杂系统的架构设计。",
            "一般": "逻辑能力中等。建议：1) 每天刷2-3道算法题，坚持3个月；2) 学习常见设计模式和数据结构；3) 参与Code Review，培养逻辑思维。",
            "较弱": "逻辑思维需提升。建议：1) 从简单算法题开始练习；2) 阅读《算法图解》等入门书籍；3) 多做逻辑推理和数学题训练。",
        },
        "execution": {
            "优秀": "执行力出色！建议：1) 主导项目开发，锻炼项目管理能力；2) 设定更高挑战目标；3) 培养团队协作和领导能力。",
            "一般": "执行力一般。建议：1) 使用任务管理工具（Notion、飞书）规划工作；2) 将大任务拆解为可执行的小目标；3) 设定明确的时间节点。",
            "较弱": "执行力待提升。建议：1) 培养时间管理习惯，使用番茄工作法；2) 从小项目开始，逐步完成；3) 找伙伴互相监督，提升完成率。",
        },
        "innovation": {
            "优秀": "创新能力突出！建议：1) 参与创新项目或技术创业；2) 关注前沿技术（AGI、量子计算）；3) 申请技术专利或发表论文。",
            "一般": "创新意识一般。建议：1) 参加黑客马拉松，锻炼快速创新能力；2) 尝试改进现有产品功能；3) 阅读《创新者的窘境》等书籍。",
            "较弱": "创新能力需培养。建议：1) 学习设计思维方法论；2) 多观察生活中的痛点和需求；3) 参与头脑风暴，激发创意。",
        },
    }
    for dim, score in scores.items():
        level = "优秀" if score >= 80 else "一般" if score >= 60 else "较弱"
        suggestions[dim] = {
            "name": dim_names[dim],
            "score": score,
            "level": level,
            "advice": advice_map[dim][level],
        }
    return suggestions


if __name__ == "__main__":
    test_answers = {
        "q1": "A", "q2": "B", "q3": "A", "q4": "C", "q5": "B",
        "q6": "A", "q7": "A", "q8": "B", "q9": "C", "q10": "B",
        "q11": "B", "q12": "A", "q13": "C", "q14": "B", "q15": "A",
        "q16": "A", "q17": "B", "q18": "A", "q19": "C", "q20": "B",
    }
    scores = calculate_scores(test_answers)
    suggestions = generate_suggestions(scores)
    print("测试结果:")
    for dim in ["learning", "logic", "execution", "innovation"]:
        print(f"  {suggestions[dim]['name']}: {scores[dim]}分 ({suggestions[dim]['level']})")
    print("OK")
