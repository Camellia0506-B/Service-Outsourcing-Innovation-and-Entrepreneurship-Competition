# -*- coding: utf-8 -*-
"""
测评计分规则：按题目与选项差异化计分，避免各维度分数高度雷同。
- 性格特质：每题 A/B/C 对应不同分数（同一选项在不同题目权重不同）
- 能力倾向：每题量表 1–5 对应不同分数曲线（同一刻度在不同题目贡献不同）
与 question_bank_vector_store 中内置题目 question_id 一一对应；未在表中的题目回退为题目自带 option.score 或 scale*20。
"""
from typing import Optional

# 性格特质：每题选项得分（A/B/C）。同一选项在不同题分数不同，使各特质总分有区分度。
# 设计原则：每题满分不同、中间选项权重不同，避免“全选B”时五项特质得分一致。
PERSONALITY_OPTION_SCORES = {
    # 外向性 4 题
    "personality_e001": {"A": 5, "B": 3, "C": 1},
    "personality_e002": {"A": 6, "B": 2, "C": 0},
    "personality_e003": {"A": 4, "B": 4, "C": 2},
    "personality_e004": {"A": 5, "B": 3, "C": 0},
    # 开放性 4 题
    "personality_o001": {"A": 6, "B": 3, "C": 0},
    "personality_o002": {"A": 5, "B": 2, "C": 1},
    "personality_o003": {"A": 5, "B": 3, "C": 1},
    "personality_o004": {"A": 4, "B": 4, "C": 2},
    # 尽责性 4 题
    "personality_c001": {"A": 5, "B": 3, "C": 1},
    "personality_c002": {"A": 6, "B": 2, "C": 0},
    "personality_c003": {"A": 4, "B": 4, "C": 2},
    "personality_c004": {"A": 5, "B": 2, "C": 1},
    # 宜人性 4 题
    "personality_a001": {"A": 6, "B": 2, "C": 0},
    "personality_a002": {"A": 5, "B": 3, "C": 1},
    "personality_a003": {"A": 5, "B": 3, "C": 1},
    "personality_a004": {"A": 4, "B": 4, "C": 2},
    # 情绪稳定性 4 题
    "personality_n001": {"A": 5, "B": 3, "C": 1},
    "personality_n002": {"A": 6, "B": 2, "C": 0},
    "personality_n003": {"A": 4, "B": 4, "C": 2},
    "personality_n004": {"A": 5, "B": 2, "C": 1},
}

# 能力倾向：每题量表 1–5 对应的得分。索引 0 对应选 1，索引 4 对应选 5。
# 同一刻度在不同题目贡献不同，使五项能力总分有区分度。
ABILITY_SCALE_SCORES = {
    # 逻辑分析能力 3 题
    "ability_logic001": [18, 38, 55, 75, 92],
    "ability_logic002": [15, 35, 52, 72, 90],
    "ability_logic003": [20, 40, 58, 76, 94],
    # 学习能力 3 题
    "ability_learn001": [12, 32, 54, 74, 95],
    "ability_learn002": [16, 36, 56, 78, 92],
    "ability_learn003": [14, 34, 52, 70, 88],
    # 沟通表达能力 3 题
    "ability_comm001": [20, 40, 58, 76, 93],
    "ability_comm002": [15, 35, 55, 75, 90],
    "ability_comm003": [18, 38, 52, 70, 88],
    # 执行能力 3 题
    "ability_exec001": [16, 36, 54, 74, 91],
    "ability_exec002": [14, 34, 56, 78, 94],
    "ability_exec003": [22, 42, 58, 72, 90],
    # 创新能力 3 题
    "ability_innov001": [10, 30, 52, 76, 96],
    "ability_innov002": [18, 38, 55, 73, 89],
    "ability_innov003": [14, 34, 56, 78, 92],
}


def get_personality_option_score(question_id: str, option_id: str) -> Optional[int]:
    """根据题目与选项返回性格题得分；未配置则返回 None，由调用方用题目自带 score。"""
    q_scores = PERSONALITY_OPTION_SCORES.get(question_id)
    if not q_scores:
        return None
    key = str(option_id).strip().upper()
    if key:
        key = key[0]  # "A"/"B"/"C"
    return q_scores.get(key)


def get_ability_scale_score(question_id: str, scale_value: int) -> Optional[int]:
    """根据题目与量表值(1–5)返回能力题得分；未配置则返回 None，由调用方用 scale*20。"""
    scores = ABILITY_SCALE_SCORES.get(question_id)
    if not scores or len(scores) < 5:
        return None
    idx = max(0, min(4, int(scale_value) - 1))
    return scores[idx]
