"""
test_skill_match_accuracy.py
============================
比赛指标自动化验证 - 标准A：人岗匹配技能准确率 >= 80%

测试方法（按你给的口径实现）：
1) 从 MySQL 随机抽取 3 名学生（要求有 skills 标签）
2) 对每名学生调用 AI 接口 /matching/recommend-jobs 取匹配分最高岗位（Top1）
3) 获取岗位画像 /job/profile/detail，提取“岗位要求技能知识点列表”（从 requirements.professional_skills 中抽取 skill 字段）
4) 获取学生能力画像 /student/ability-profile，提取“学生已掌握技能知识点列表”（从 professional_skills 中抽取）
5) 计算准确率 = |交集| / |岗位要求| * 100%
6) 3 名学生平均准确率 >= 80% 视为通过

输出：
- 控制台打印每名学生明细 + 最终通过/不通过
- 写入 test_results/skill_match_report.json

运行方式（示例）：
  python test_skill_match_accuracy.py
  python test_skill_match_accuracy.py --ai-base-url http://127.0.0.1:5002/api/v1
  python test_skill_match_accuracy.py --mysql-host 127.0.0.1 --mysql-db gradquest --mysql-user gradquest

依赖：
- 仅标准库 + MySQL 驱动二选一（脚本会自动尝试导入）：
  - mysql-connector-python  或  pymysql
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
import urllib.request
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from urllib.error import URLError
except ImportError:
    URLError = OSError  # type: ignore


DEFAULT_AI_BASE_URL = "http://127.0.0.1:5002/api/v1"
DEFAULT_MYSQL_HOST = "127.0.0.1"
DEFAULT_MYSQL_PORT = 3306
DEFAULT_MYSQL_DB = "gradquest"
DEFAULT_MYSQL_USER = "gradquest"
DEFAULT_MYSQL_PASSWORD = None  # 优先从 application.yml 解析；仍允许 CLI/env 覆盖


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _parse_mysql_from_application_yml(repo_root: str) -> Dict[str, Any]:
    """
    从 backend/src/main/resources/application.yml 解析 spring.datasource.*。
    不依赖 PyYAML，仅用简单正则匹配（本项目 yml 结构固定且够用）。
    """
    yml_path = os.path.join(repo_root, "backend", "src", "main", "resources", "application.yml")
    if not os.path.isfile(yml_path):
        return {}

    text = _read_text(yml_path)
    # url: jdbc:mysql://127.0.0.1:3306/gradquest?...
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
        # jdbc:mysql://host:port/db?...
        u = url[len("jdbc:mysql://") :]
        u = u.split("?", 1)[0]
        # host:port/db
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

    out: Dict[str, Any] = {}
    if host:
        out["host"] = host
    if port:
        out["port"] = port
    if db:
        out["db"] = db
    if username:
        out["user"] = username
    if password:
        out["password"] = password
    return out


def _connect_mysql(host: str, port: int, db: str, user: str, password: Optional[str]):
    """
    返回 (conn, kind)；kind 用于差异化 SQL 写法（尽量兼容）。
    """
    # 1) mysql.connector
    try:
        import mysql.connector  # type: ignore

        conn = mysql.connector.connect(
            host=host,
            port=port,
            database=db,
            user=user,
            password=password or "",
        )
        return conn, "mysql.connector"
    except Exception:
        pass

    # 2) pymysql
    try:
        import pymysql  # type: ignore

        conn = pymysql.connect(
            host=host,
            port=port,
            db=db,
            user=user,
            password=password or "",
            charset="utf8mb4",
            autocommit=True,
        )
        return conn, "pymysql"
    except Exception as e:
        raise RuntimeError(
            "无法连接 MySQL：缺少驱动或连接失败。\n"
            "请安装其一：pip install mysql-connector-python  或  pip install pymysql\n"
            f"原始错误：{e}"
        )


def _mysql_fetch_all(conn, sql: str, params: Optional[Sequence[Any]] = None) -> List[Tuple[Any, ...]]:
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        rows = cur.fetchall()
        return list(rows) if rows else []
    finally:
        try:
            cur.close()
        except Exception:
            pass


def _http_post_json(url: str, payload: Dict[str, Any], timeout_s: int = 60) -> Dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
    except URLError as e:
        return {"code": 0, "msg": f"连接失败: {e.reason if getattr(e, 'reason', None) else e}", "data": None}
    except OSError as e:
        return {"code": 0, "msg": f"连接失败: {e}", "data": None}
    try:
        return json.loads(raw) if raw else {}
    except Exception:
        return {"code": 500, "msg": f"Non-JSON response: {raw[:200]}", "data": None}


def _norm_skill(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _extract_required_skills(job_profile: Dict[str, Any]) -> List[str]:
    reqs = (job_profile.get("requirements") or {}).get("professional_skills") or {}
    skills: List[str] = []
    for key in ("programming_languages", "frameworks_tools", "domain_knowledge"):
        arr = reqs.get(key) or []
        if isinstance(arr, list):
            for it in arr:
                if isinstance(it, dict):
                    name = it.get("skill") or it.get("name") or ""
                    if isinstance(name, str) and name.strip():
                        skills.append(name.strip())
                elif isinstance(it, str) and it.strip():
                    skills.append(it.strip())
    # 去重保持顺序
    seen = set()
    out = []
    for s in skills:
        ns = _norm_skill(s)
        if not ns or ns in seen:
            continue
        seen.add(ns)
        out.append(s)
    return out


def _extract_student_skills(ability_profile: Dict[str, Any]) -> List[str]:
    ps = ability_profile.get("professional_skills") or {}
    skills: List[str] = []
    for key in ("programming_languages", "frameworks_tools", "domain_knowledge"):
        arr = ps.get(key) or []
        if isinstance(arr, list):
            for it in arr:
                if isinstance(it, dict):
                    name = it.get("skill") or it.get("domain") or it.get("name") or ""
                    if isinstance(name, str) and name.strip():
                        skills.append(name.strip())
                elif isinstance(it, str) and it.strip():
                    skills.append(it.strip())
    seen = set()
    out = []
    for s in skills:
        ns = _norm_skill(s)
        if not ns or ns in seen:
            continue
        seen.add(ns)
        out.append(s)
    return out


def _calc_accuracy(required: List[str], mastered: List[str]) -> Tuple[float, List[str], List[str]]:
    """
    计算技能匹配准确率（带轻量模糊匹配）：
    - 精确匹配：规范化后字符串完全相同
    - 模糊匹配：两边长度都 >= 3，且一方包含另一方（如 "java" vs "精通java语言"）
    """
    # 规范化岗位技能，并保留原始文案
    req_pairs: List[Tuple[str, str]] = []
    for s in required:
        ns = _norm_skill(s)
        if ns:
            req_pairs.append((ns, s))

    # 规范化学生技能
    mas_norm = [_norm_skill(x) for x in mastered if _norm_skill(x)]

    matched_display: List[str] = []
    missing_display: List[str] = []

    def _is_fuzzy_match(a: str, b: str) -> bool:
        if not a or not b:
            return False
        if a == b:
            return True
        # 都太短时不做模糊匹配，避免比如 "c"、"go" 误伤
        if len(a) < 3 or len(b) < 3:
            return False
        return a in b or b in a

    matched_count = 0
    for ns, orig in req_pairs:
        hit = any(_is_fuzzy_match(ns, m) for m in mas_norm)
        if hit:
            matched_count += 1
            matched_display.append(orig)
        else:
            missing_display.append(orig)

    total_required = len(req_pairs)
    acc = (matched_count / total_required) if total_required else 0.0
    return acc, matched_display, missing_display


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ai-base-url", default=os.environ.get("AI_BASE_URL", DEFAULT_AI_BASE_URL))
    parser.add_argument("--repo-root", default=os.path.dirname(os.path.abspath(__file__)))
    parser.add_argument("--mysql-host", default=os.environ.get("MYSQL_HOST", DEFAULT_MYSQL_HOST))
    parser.add_argument("--mysql-port", type=int, default=int(os.environ.get("MYSQL_PORT", str(DEFAULT_MYSQL_PORT))))
    parser.add_argument("--mysql-db", default=os.environ.get("MYSQL_DB", DEFAULT_MYSQL_DB))
    parser.add_argument("--mysql-user", default=os.environ.get("MYSQL_USER", DEFAULT_MYSQL_USER))
    parser.add_argument("--mysql-password", default=os.environ.get("MYSQL_PASSWORD", DEFAULT_MYSQL_PASSWORD))
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    # 尝试从 application.yml 补全 MySQL 参数（仅在未显式传入/未设置 env 时）
    yml_cfg = _parse_mysql_from_application_yml(args.repo_root)
    mysql_host = args.mysql_host or yml_cfg.get("host", DEFAULT_MYSQL_HOST)
    mysql_port = args.mysql_port or yml_cfg.get("port", DEFAULT_MYSQL_PORT)
    mysql_db = args.mysql_db or yml_cfg.get("db", DEFAULT_MYSQL_DB)
    mysql_user = args.mysql_user or yml_cfg.get("user", DEFAULT_MYSQL_USER)
    mysql_password = args.mysql_password or yml_cfg.get("password")

    try:
        conn, driver_kind = _connect_mysql(mysql_host, mysql_port, mysql_db, mysql_user, mysql_password)
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 2

    # 抽样 3 名有 skills 的学生
    # profile_skills.items 为 JSON，要求至少一个元素
    # 兼容：JSON_LENGTH(items) 不可用时回退为 items != '[]'
    candidates: List[int] = []
    try:
        rows = _mysql_fetch_all(
            conn,
            """
            SELECT DISTINCT ps.user_id
            FROM profile_skills ps
            WHERE ps.items IS NOT NULL
              AND (JSON_LENGTH(ps.items) > 0)
            ORDER BY RAND()
            LIMIT 3
            """,
        )
        candidates = [int(r[0]) for r in rows]
    except Exception:
        rows = _mysql_fetch_all(
            conn,
            """
            SELECT DISTINCT ps.user_id
            FROM profile_skills ps
            WHERE ps.items IS NOT NULL
              AND CAST(ps.items AS CHAR(2000)) NOT IN ('[]', 'null', '')
            ORDER BY RAND()
            LIMIT 3
            """,
        )
        candidates = [int(r[0]) for r in rows]

    if len(candidates) < 3:
        msg = {
            "status": "insufficient_data",
            "reason": "测试数据不足，请先录入mock数据（需要至少3名学生且 profile_skills.items 非空）",
            "found_students": candidates,
        }
        os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
        out_path = os.path.join(args.repo_root, "test_results", "skill_match_report.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(msg, f, ensure_ascii=False, indent=2)
        print(msg["reason"])
        print(f"已写入：{out_path}")
        return 1

    ai_base = args.ai_base_url.rstrip("/")
    report: Dict[str, Any] = {
        "standard": "A",
        "generated_at": _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "ai_base_url": ai_base,
        "mysql": {"host": mysql_host, "port": mysql_port, "db": mysql_db, "user": mysql_user, "driver": driver_kind},
        "sample_user_ids": candidates,
        "per_student": [],
        "average_accuracy": None,
        "pass_threshold": 0.80,
        "passed": False,
    }

    accuracies: List[float] = []
    ai_unavailable_msg = None
    for uid in candidates:
        t0 = time.time()
        # 1) 推荐 Top1
        rec = _http_post_json(
            f"{ai_base}/matching/recommend-jobs",
            {"user_id": uid, "pageNum": 1, "pageSize": 1, "top_n": 1},
            timeout_s=90,
        )
        if rec.get("code") == 0:
            ai_unavailable_msg = rec.get("msg") or "AI 服务连接失败"
            break
        if rec.get("code") != 200:
            detail = {
                "user_id": uid,
                "error": f"recommend-jobs failed: code={rec.get('code')} msg={rec.get('msg')}",
                "accuracy": 0.0,
            }
            report["per_student"].append(detail)
            accuracies.append(0.0)
            continue

        data = rec.get("data") or {}
        jobs = data.get("jobs") or data.get("recommendations") or []
        if not jobs:
            detail = {
                "user_id": uid,
                "error": "recommend-jobs returned empty list",
                "accuracy": 0.0,
            }
            report["per_student"].append(detail)
            accuracies.append(0.0)
            continue

        top = jobs[0] if isinstance(jobs, list) else {}
        job_id = (top.get("job_id") or "").strip()
        job_name = (top.get("job_name") or "").strip()

        # 2) 岗位画像
        job_profile = _http_post_json(
            f"{ai_base}/job/profile/detail",
            {"job_id": job_id} if job_id else {"job_name": job_name},
            timeout_s=60,
        )
        if job_profile.get("code") == 0:
            ai_unavailable_msg = job_profile.get("msg") or "AI 服务连接失败"
            break
        if job_profile.get("code") != 200:
            detail = {
                "user_id": uid,
                "job_id": job_id,
                "job_name": job_name,
                "error": f"job/profile/detail failed: code={job_profile.get('code')} msg={job_profile.get('msg')}",
                "accuracy": 0.0,
            }
            report["per_student"].append(detail)
            accuracies.append(0.0)
            continue

        jp = job_profile.get("data") or {}
        required_skills = _extract_required_skills(jp)

        # 3) 学生能力画像
        stu = _http_post_json(
            f"{ai_base}/student/ability-profile",
            {"user_id": uid},
            timeout_s=60,
        )
        if stu.get("code") == 0:
            ai_unavailable_msg = stu.get("msg") or "AI 服务连接失败"
            break
        if stu.get("code") != 200:
            detail = {
                "user_id": uid,
                "job_id": job_id,
                "job_name": job_name,
                "required_skills": required_skills,
                "error": f"student/ability-profile failed: code={stu.get('code')} msg={stu.get('msg')}",
                "accuracy": 0.0,
            }
            report["per_student"].append(detail)
            accuracies.append(0.0)
            continue

        ap = stu.get("data") or {}
        mastered = _extract_student_skills(ap)

        acc, matched, missing = _calc_accuracy(required_skills, mastered)
        accuracies.append(acc)
        detail = {
            "user_id": uid,
            "job_id": job_id,
            "job_name": job_name,
            "required_skills_total": len(required_skills),
            "mastered_skills_total": len(mastered),
            "matched_skills": matched,
            "missing_skills": missing,
            "accuracy": round(acc * 100, 2),
            "elapsed_seconds": round(time.time() - t0, 3),
        }
        report["per_student"].append(detail)

    if ai_unavailable_msg:
        report["status"] = "ai_service_unavailable"
        report["reason"] = f"AI 服务 ({ai_base}) 未启动或无法连接。请先启动 AI 服务后再运行测试。"
        os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
        out_path = os.path.join(args.repo_root, "test_results", "skill_match_report.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(report["reason"])
        print(f"已写入：{out_path}")
        return 2

    avg = sum(accuracies) / len(accuracies) if accuracies else 0.0
    report["average_accuracy"] = round(avg * 100, 2)
    report["passed"] = avg >= float(report["pass_threshold"])

    os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
    out_path = os.path.join(args.repo_root, "test_results", "skill_match_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # 控制台摘要
    print("=== 标准A：技能匹配准确率 ===")
    for s in report["per_student"]:
        if s.get("error"):
            print(f"- user_id={s.get('user_id')}: ERROR: {s.get('error')}")
        else:
            print(
                f"- user_id={s['user_id']} -> job={s.get('job_name') or s.get('job_id')} | "
                f"acc={s['accuracy']}% (matched={len(s['matched_skills'])}/{s['required_skills_total']})"
            )
    print(f"平均准确率：{report['average_accuracy']}%")
    print("判定：{}".format("通过" if report["passed"] else "不通过"))
    print(f"已写入：{out_path}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

