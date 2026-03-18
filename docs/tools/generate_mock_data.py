"""
generate_mock_data.py
====================
快速生成比赛自动化测试所需的 mock 数据：

- MySQL（Java 后端库 gradquest）：
  - 插入 10 名用户（users）
  - 插入 10 份档案（user_profiles）
  - 插入 skills（profile_skills.items 为 JSON 数组）
  - 插入证书（profile_certificates）

- AI 服务岗位画像 store（AI算法/config/job_profile.yml 里 job_profiles_store，默认为 AI算法/data/job_profiles/profiles.json）：
  - 写入/合并 3 个岗位画像（job_011/ job_001/ job_023），包含 requirements.basic_requirements 与 professional_skills

注意：
1) 该脚本不会依赖大模型，不会调用外部 API。
2) 证书/专业/学历/技能字段都按本系统实际读取路径设计，确保 test_* 脚本能抽样成功。

运行示例：
  python generate_mock_data.py
  python generate_mock_data.py --mysql-password Gradquest123!
  python generate_mock_data.py --write-job-profiles-only

依赖：
- 标准库 + MySQL 驱动（mysql-connector-python 或 pymysql）
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import random
import re
import sys
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple


DEFAULT_MYSQL_HOST = "127.0.0.1"
DEFAULT_MYSQL_PORT = 3306
DEFAULT_MYSQL_DB = "gradquest"
DEFAULT_MYSQL_USER = "gradquest"


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _parse_mysql_from_application_yml(repo_root: str) -> Dict[str, Any]:
    yml_path = os.path.join(repo_root, "backend", "src", "main", "resources", "application.yml")
    if not os.path.isfile(yml_path):
        return {}
    text = _read_text(yml_path)
    m_url = re.search(r"datasource:\s*[\s\S]*?url:\s*([^\n\r#]+)", text)
    m_user = re.search(r"datasource:\s*[\s\S]*?username:\s*([^\n\r#]+)", text)
    m_pwd = re.search(r"datasource:\s*[\s\S]*?password:\s*([^\n\r#]+)", text)

    url = (m_url.group(1).strip() if m_url else "")
    username = (m_user.group(1).strip() if m_user else "")
    password = (m_pwd.group(1).strip() if m_pwd else "")
    password = password.strip('"').strip("'")

    host = DEFAULT_MYSQL_HOST
    port = DEFAULT_MYSQL_PORT
    db = DEFAULT_MYSQL_DB
    if url.startswith("jdbc:mysql://"):
        u = url[len("jdbc:mysql://") :]
        u = u.split("?", 1)[0]
        if "/" in u:
            hp, dbname = u.split("/", 1)
            db = dbname.strip() or db
        else:
            hp = u
        if ":" in hp:
            host, p = hp.split(":", 1)
            try:
                port = int(p)
            except Exception:
                port = DEFAULT_MYSQL_PORT
        else:
            host = hp.strip() or host

    out: Dict[str, Any] = {"host": host, "port": port, "db": db}
    if username:
        out["user"] = username
    if password:
        out["password"] = password
    return out


def _connect_mysql(host: str, port: int, db: str, user: str, password: Optional[str]):
    try:
        import mysql.connector  # type: ignore

        conn = mysql.connector.connect(host=host, port=port, database=db, user=user, password=password or "")
        return conn
    except Exception:
        pass
    try:
        import pymysql  # type: ignore

        conn = pymysql.connect(host=host, port=port, db=db, user=user, password=password or "", charset="utf8mb4", autocommit=False)
        return conn
    except Exception as e:
        raise RuntimeError(
            "无法连接 MySQL：缺少驱动或连接失败。\n"
            "请安装其一：pip install mysql-connector-python  或  pip install pymysql\n"
            f"原始错误：{e}"
        )


def _mysql_exec(conn, sql: str, params: Optional[Sequence[Any]] = None) -> int:
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        try:
            return int(cur.rowcount or 0)
        except Exception:
            return 0
    finally:
        try:
            cur.close()
        except Exception:
            pass


def _mysql_fetch_one(conn, sql: str, params: Optional[Sequence[Any]] = None):
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        return cur.fetchone()
    finally:
        try:
            cur.close()
        except Exception:
            pass


def _load_job_profile_store_path(repo_root: str) -> str:
    # 默认读取 AI算法/config/job_profile.yml 的 job_profiles_store: data/job_profiles/profiles.json
    yml_path = os.path.join(repo_root, "AI算法", "config", "job_profile.yml")
    if not os.path.isfile(yml_path):
        return os.path.join(repo_root, "AI算法", "data", "job_profiles", "profiles.json")
    text = _read_text(yml_path)
    m = re.search(r"job_profiles_store:\s*([^\n\r#]+)", text)
    rel = (m.group(1).strip() if m else "data/job_profiles/profiles.json").strip().strip('"').strip("'")
    # 该路径是相对 AI算法 目录的
    return os.path.join(repo_root, "AI算法", rel.replace("/", os.sep))


def _merge_job_profiles(store_path: str, new_profiles: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(store_path), exist_ok=True)
    existing: Dict[str, Any] = {}
    if os.path.isfile(store_path):
        try:
            existing = json.loads(_read_text(store_path)) or {}
        except Exception:
            existing = {}
    if not isinstance(existing, dict):
        existing = {}
    existing.update(new_profiles)
    with open(store_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)


def _mock_job_profiles() -> Dict[str, Any]:
    # 3 个岗位画像：后端/算法/产品，要求字段覆盖 B 标准：education/majors/certs
    return {
        "job_001": {
            "job_id": "job_001",
            "job_name": "Java后端开发工程师",
            "basic_info": {"industry": "后端开发", "level": "初级", "avg_salary": "15k", "work_locations": ["北京"]},
            "requirements": {
                "basic_requirements": {
                    "education": {"level": "本科", "preferred_majors": ["计算机", "软件工程", "网络"]},
                    "gpa": {"min_requirement": "3.0/4.0"},
                    "certifications": ["计算机二级"],
                },
                "professional_skills": {
                    "programming_languages": [{"skill": "Java", "level": "熟悉", "importance": "核心", "weight": 0.1}],
                    "frameworks_tools": [{"skill": "Spring Boot", "level": "熟悉", "importance": "重要", "weight": 0.08}, {"skill": "MySQL", "level": "熟悉", "importance": "重要", "weight": 0.06}],
                    "domain_knowledge": [{"skill": "后端开发", "level": "熟悉", "importance": "重要", "weight": 0.06}],
                },
            },
        },
        "job_011": {
            "job_id": "job_011",
            "job_name": "机器学习/算法工程师",
            "basic_info": {"industry": "AI与算法", "level": "中级", "avg_salary": "20k", "work_locations": ["上海"]},
            "requirements": {
                "basic_requirements": {
                    "education": {"level": "硕士", "preferred_majors": ["计算机", "数学", "人工智能", "统计学"]},
                    "gpa": {"min_requirement": "3.2/4.0"},
                    "certifications": ["英语六级"],
                },
                "professional_skills": {
                    "programming_languages": [{"skill": "Python", "level": "熟悉", "importance": "核心", "weight": 0.1}],
                    "frameworks_tools": [{"skill": "PyTorch", "level": "熟悉", "importance": "重要", "weight": 0.08}],
                    "domain_knowledge": [{"skill": "机器学习", "level": "熟悉", "importance": "核心", "weight": 0.1}, {"skill": "算法", "level": "熟悉", "importance": "重要", "weight": 0.06}],
                },
            },
        },
        "job_023": {
            "job_id": "job_023",
            "job_name": "产品经理",
            "basic_info": {"industry": "产品与设计", "level": "中级", "avg_salary": "18k", "work_locations": ["深圳"]},
            "requirements": {
                "basic_requirements": {
                    "education": {"level": "本科", "preferred_majors": ["信息管理", "工商管理", "市场营销", "计算机"]},
                    "gpa": {"min_requirement": "3.0/4.0"},
                    "certifications": ["PMP"],
                },
                "professional_skills": {
                    "programming_languages": [],
                    "frameworks_tools": [{"skill": "Axure", "level": "熟悉", "importance": "重要", "weight": 0.06}],
                    "domain_knowledge": [{"skill": "需求分析", "level": "熟悉", "importance": "核心", "weight": 0.1}, {"skill": "项目管理", "level": "熟悉", "importance": "重要", "weight": 0.06}],
                },
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=os.path.dirname(os.path.abspath(__file__)))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--mysql-host", default=os.environ.get("MYSQL_HOST", ""))
    parser.add_argument("--mysql-port", type=int, default=int(os.environ.get("MYSQL_PORT", "0") or "0"))
    parser.add_argument("--mysql-db", default=os.environ.get("MYSQL_DB", ""))
    parser.add_argument("--mysql-user", default=os.environ.get("MYSQL_USER", ""))
    parser.add_argument("--mysql-password", default=os.environ.get("MYSQL_PASSWORD", None))
    parser.add_argument("--write-job-profiles-only", action="store_true")
    parser.add_argument("--mysql-only", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    repo_root = args.repo_root

    # 1) 写岗位画像 store
    if not args.mysql_only:
        store_path = _load_job_profile_store_path(repo_root)
        _merge_job_profiles(store_path, _mock_job_profiles())
        print(f"[OK] 已写入/合并岗位画像：{store_path}")
        if args.write_job_profiles_only:
            return 0

    # 2) 写 MySQL mock 学生数据
    yml_cfg = _parse_mysql_from_application_yml(repo_root)
    mysql_host = args.mysql_host or yml_cfg.get("host", DEFAULT_MYSQL_HOST)
    mysql_port = args.mysql_port or yml_cfg.get("port", DEFAULT_MYSQL_PORT)
    mysql_db = args.mysql_db or yml_cfg.get("db", DEFAULT_MYSQL_DB)
    mysql_user = args.mysql_user or yml_cfg.get("user", DEFAULT_MYSQL_USER)
    mysql_password = args.mysql_password or yml_cfg.get("password")

    try:
        conn = _connect_mysql(mysql_host, mysql_port, mysql_db, mysql_user, mysql_password)
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 2

    now = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # 10 名 mock 用户
    # 注意：users.password 字段要求是 BCrypt 哈希；为了演示与测试，我们写一个占位字符串（不用于真实登录）
    mock_users = []
    for i in range(10):
        uname = f"mock_user_{int(time.time())}_{i}"
        nick = f"Mock学生{i+1}"
        mock_users.append((uname, "{bcrypt}$2a$10$mockhashmockhashmockhashmockhashmockhashmockhashmock", nick, now))

    created_user_ids: List[int] = []
    try:
        for uname, pwd, nick, created_at in mock_users:
            _mysql_exec(
                conn,
                "INSERT INTO users (username, password, nickname, created_at) VALUES (%s, %s, %s, %s)",
                (uname, pwd, nick, created_at),
            )
            row = _mysql_fetch_one(conn, "SELECT id FROM users WHERE username=%s", (uname,))
            if row and row[0]:
                created_user_ids.append(int(row[0]))

        if len(created_user_ids) < 10:
            conn.rollback()
            print("[ERR] 插入 users 失败：未能获取到 10 个 user_id（可能用户名冲突或权限问题）")
            return 1

        # 为不同岗位准备 3 套画像倾向（技能/专业/证书与岗位要求一致）
        tracks = [
            # Java 后端
            {
                "degree": "本科",
                "major": "计算机科学与技术",
                "school": "Mock大学",
                "gpa": "3.4/4.0",
                "certs": ["计算机二级"],
                "skills": [
                    {"category": "编程语言", "items": ["Java"]},
                    {"category": "工具与框架", "items": ["Spring Boot", "MySQL", "Redis"]},
                    {"category": "专业技能", "items": ["后端开发", "接口设计"]},
                ],
            },
            # 算法
            {
                "degree": "硕士",
                "major": "人工智能",
                "school": "Mock大学",
                "gpa": "3.6/4.0",
                "certs": ["英语六级"],
                "skills": [
                    {"category": "编程语言", "items": ["Python"]},
                    {"category": "工具与框架", "items": ["PyTorch", "NumPy"]},
                    {"category": "专业技能", "items": ["机器学习", "算法", "统计分析"]},
                ],
            },
            # 产品
            {
                "degree": "本科",
                "major": "信息管理与信息系统",
                "school": "Mock大学",
                "gpa": "3.3/4.0",
                "certs": ["PMP"],
                "skills": [
                    {"category": "专业技能", "items": ["需求分析", "项目管理", "产品规划"]},
                    {"category": "工具与框架", "items": ["Axure", "XMind"]},
                ],
            },
        ]

        for idx, uid in enumerate(created_user_ids):
            t = tracks[idx % len(tracks)]
            _mysql_exec(
                conn,
                """
                INSERT INTO user_profiles (user_id, school, major, degree, expected_graduation, gpa, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (uid, t["school"], t["major"], t["degree"], "2027-06", t["gpa"], now),
            )
            # skills
            for s in t["skills"]:
                _mysql_exec(
                    conn,
                    "INSERT INTO profile_skills (user_id, category, items) VALUES (%s, %s, %s)",
                    (uid, s["category"], json.dumps(s["items"], ensure_ascii=False)),
                )
            # certs
            for c in t["certs"]:
                _mysql_exec(
                    conn,
                    "INSERT INTO profile_certificates (user_id, name, issue_date, cert_url) VALUES (%s, %s, %s, %s)",
                    (uid, c, "2024-06", ""),
                )

        conn.commit()
        print(f"[OK] 已写入 MySQL mock 学生数据：users={len(created_user_ids)}（含档案/技能/证书）")
        return 0
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[ERR] 写入 mock 数据失败：{e}", file=sys.stderr)
        return 1
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())

