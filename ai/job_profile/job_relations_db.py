"""
岗位关联关系表（SQLite）
用于存储 AI 生成的晋升/转岗关系，供 relation-graph 接口秒级查询，避免实时调用 AI。
晋升路径表 job_promotion_path：存储各岗位 4 阶段晋升数据，供前端展示真实内容。
"""
import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from utils.path_tool import get_abs_path
from utils.logger_handler import logger


def _to_standard_name(name: str) -> str:
    """与 job_profile_service.to_standard_name 一致，避免循环导入时在此实现一份"""
    import re
    if not name or not isinstance(name, str):
        return name or ""
    s = re.sub(r"\s*[（(].*?[)）]\s*", "", name).strip()
    return s or name.strip()

DB_DIR = get_abs_path("data")
DB_PATH = os.path.join(DB_DIR, "job_relations.db")

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS job_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_job_id VARCHAR(50) NOT NULL,
    to_job_id VARCHAR(50) NOT NULL,
    relation_type VARCHAR(20) NOT NULL,
    difficulty INTEGER,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_relations_from ON job_relations(from_job_id);
CREATE INDEX IF NOT EXISTS idx_job_relations_type ON job_relations(relation_type);

CREATE TABLE IF NOT EXISTS job_promotion_path (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id VARCHAR(50) NOT NULL,
    stage_order INTEGER NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    years_range VARCHAR(20) NOT NULL,
    salary_range VARCHAR(80) NOT NULL,
    role_title VARCHAR(100),
    skills TEXT,
    icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_promotion_path_job ON job_promotion_path(job_id);
"""


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db():
    """创建表（若不存在）"""
    conn = get_connection()
    try:
        conn.executescript(CREATE_SQL)
        conn.commit()
        logger.info("[job_relations_db] 表已就绪: %s", DB_PATH)
    finally:
        conn.close()


def insert_relations(rows: List[Dict]) -> int:
    """批量插入。每行: from_job_id, to_job_id, relation_type, difficulty, reason"""
    if not rows:
        return 0
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.executemany(
            "INSERT INTO job_relations (from_job_id, to_job_id, relation_type, difficulty, reason) VALUES (?, ?, ?, ?, ?)",
            [
                (
                    r.get("from_job_id") or r.get("from"),
                    r.get("to_job_id") or r.get("to"),
                    r.get("relation_type") or r.get("type", "transfer"),
                    r.get("difficulty"),
                    r.get("reason") or "",
                )
                for r in rows
            ],
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def get_relations_by_from_job(from_job_id: str, relation_type: Optional[str] = None) -> List[Dict]:
    """查询某岗位作为起点的所有关系。relation_type: promote / transfer / None(全部)"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        if relation_type:
            cur.execute(
                "SELECT from_job_id, to_job_id, relation_type, difficulty, reason FROM job_relations WHERE from_job_id = ? AND relation_type = ? ORDER BY id",
                (from_job_id, relation_type),
            )
        else:
            cur.execute(
                "SELECT from_job_id, to_job_id, relation_type, difficulty, reason FROM job_relations WHERE from_job_id = ? ORDER BY relation_type, id",
                (from_job_id,),
            )
        rows = cur.fetchall()
        return [
            {"from_job_id": r[0], "to_job_id": r[1], "relation_type": r[2], "difficulty": r[3], "reason": r[4] or ""}
            for r in rows
        ]
    finally:
        conn.close()


def get_all_relations() -> List[Dict]:
    """查询全部关系（用于构建完整图）"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT from_job_id, to_job_id, relation_type, difficulty, reason FROM job_relations ORDER BY id")
        rows = cur.fetchall()
        return [
            {"from_job_id": r[0], "to_job_id": r[1], "relation_type": r[2], "difficulty": r[3], "reason": r[4] or ""}
            for r in rows
        ]
    finally:
        conn.close()


def count_relations() -> int:
    """返回关系条数"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM job_relations")
        return cur.fetchone()[0]
    finally:
        conn.close()


# ========== 晋升路径表 job_promotion_path ==========

def get_promotion_path_by_job_id(job_id: str) -> List[Dict[str, Any]]:
    """按 job_id 查询 4 阶段晋升路径，按 stage_order 排序。返回 [{ stage_name, years_range, salary_range, role_title, skills, icon }, ...]"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT stage_order, stage_name, years_range, salary_range, role_title, skills, icon FROM job_promotion_path WHERE job_id = ? ORDER BY stage_order",
            (job_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "stage_order": r[0],
                "stage_name": r[1] or "",
                "years_range": r[2] or "",
                "salary_range": r[3] or "",
                "role_title": r[4] or r[1] or "",
                "skills": r[5] if r[5] else "",
                "icon": r[6] or "",
            }
            for r in rows
        ]
    finally:
        conn.close()


def insert_promotion_path(
    job_id: str,
    stages: List[Dict[str, Any]],
) -> int:
    """批量插入或替换某岗位的晋升路径。stages: [{ stage_name, years_range, salary_range, role_title?, skills?, icon? }, ...] 至少4项"""
    if not job_id or not stages:
        return 0
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM job_promotion_path WHERE job_id = ?", (job_id,))
        default_icons = ["🌱", "🌿", "🌳", "🏆"]
        for i, s in enumerate(stages[:4]):
            stage_order = i + 1
            stage_name = (s.get("stage_name") or s.get("stage") or s.get("name") or "").strip() or f"阶段{stage_order}"
            years_range = (s.get("years_range") or s.get("years") or "").strip() or ["0-2年", "2-4年", "4-7年", "7年+"][i]
            salary_range = (s.get("salary_range") or s.get("salary") or "").strip() or "—"
            role_title = (s.get("role_title") or stage_name or "").strip()
            skills_raw = s.get("skills") or s.get("key_skills")
            skills = json.dumps(skills_raw, ensure_ascii=False) if isinstance(skills_raw, list) else (skills_raw or "")
            icon = (s.get("icon") or default_icons[i] or "").strip()
            cur.execute(
                "INSERT INTO job_promotion_path (job_id, stage_order, stage_name, years_range, salary_range, role_title, skills, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (job_id, stage_order, stage_name, years_range, salary_range, role_title, skills, icon),
            )
        conn.commit()
        return min(4, len(stages))
    finally:
        conn.close()


def build_graph_data_from_db(
    job_id: str,
    graph_type: str,
    job_index: Dict[str, Any],
) -> Optional[Dict]:
    """
    从 job_relations 表构建图谱数据，与 get_relation_graph 返回的 data 结构一致。
    job_index: job_id -> { name, layer_level, category }（来自 target_jobs）
    若该岗位在 DB 中无任何关系，返回 None，便于上层回退到实时 AI。
    """
    relations = get_relations_by_from_job(job_id, None)
    if not relations:
        return None
    promote = [r for r in relations if r["relation_type"] == "promote"]
    transfer = [r for r in relations if r["relation_type"] == "transfer"]
    if graph_type == "vertical" and not promote:
        return None
    if graph_type == "transfer" and not transfer:
        return None
    if graph_type == "all" and not promote and not transfer:
        return None

    def node_info(jid):
        j = job_index.get(jid, {})
        raw_name = j.get("name", jid)
        return {
            "job_id": jid,
            "job_name": raw_name,
            "standard_name": _to_standard_name(raw_name),
            "level": j.get("layer_level", 0),
            "category": j.get("category", ""),
            "salary_range": "",
            "description": "",
        }

    center = job_index.get(job_id, {})
    center_raw_name = center.get("name", job_id)
    center_job = {
        "job_id": job_id,
        "job_name": center_raw_name,
        "standard_name": _to_standard_name(center_raw_name),
        "level": center.get("layer_level", 0),
        "salary_range": "",
        "avg_salary": "",
        "demand_score": None,
    }
    result = {"center_job": center_job}

    if graph_type in ["vertical", "all"] and promote:
        nodes_ids = {job_id}
        for r in promote:
            nodes_ids.add(r["to_job_id"])
        nodes = [node_info(nid) for nid in nodes_ids]
        edges = [
            {
                "from": r["from_job_id"],
                "to": r["to_job_id"],
                "years": "2-3年",
                "requirements": [r["reason"]] if r.get("reason") else [],
            }
            for r in promote
        ]
        result["vertical_graph"] = {"track_name": "晋升路径", "nodes": nodes, "edges": edges}
    else:
        result["vertical_graph"] = {"nodes": [], "edges": [], "track_name": "", "message": "未请求或暂无数据"}

    if graph_type in ["transfer", "all"] and transfer:
        nodes_ids = {job_id}
        for r in transfer:
            nodes_ids.add(r["to_job_id"])
        nodes = [node_info(nid) for nid in nodes_ids]
        # difficulty 1-5 -> match_score 约 90-50
        edges = [
            {
                "from": r["from_job_id"],
                "to": r["to_job_id"],
                "relevance_score": max(50, 90 - (r.get("difficulty") or 3) * 10),
                "match_score": max(50, 90 - (r.get("difficulty") or 3) * 10),
                "difficulty": ["低", "中低", "中", "中高", "高"][min(4, (r.get("difficulty") or 3) - 1)],
                "time": "6-12个月",
                "skills_gap": [r["reason"]] if r.get("reason") else [],
            }
            for r in transfer
        ]
        result["transfer_graph"] = {"nodes": nodes, "edges": edges}
    else:
        result["transfer_graph"] = {"nodes": [], "edges": [], "message": "未请求或暂无数据"}

    result["career_path"] = {"promotion_path": []}
    return result
