"""
test_profile_accuracy.py
=======================
比赛指标自动化验证 - 标准B：岗位画像 + 学生画像关键信息准确率 >= 90%

你给的口径是：
- 抽 10 名“匹配成功”的学生
- 核对 3 项：学历、专业、证书 是否满足岗位要求
- 3 项全符合才算该学生合格；合格率 >= 90% 通过

本项目现状说明（按代码与表结构落地）：
- 学生画像数据在 MySQL（users/user_profiles/profile_skills/profile_certificates）
- 岗位画像与岗位要求在 AI 服务（/job/profile/detail 返回 requirements.basic_requirements 等）
- “匹配状态=成功”数据库里没有独立 MatchResult 表；因此本脚本以“recommend-jobs 能返回 Top1 岗位”
  作为“匹配成功”的可运行定义（更贴近系统实际可用性）。

脚本流程：
1) 从 MySQL 拉取候选用户（优先有 user_profiles + skills 的用户）
2) 逐个调用 /matching/recommend-jobs，直到收集到 10 名“匹配成功”样本
3) 对每个样本：
   - 从 MySQL 取学生：degree/major + 证书列表
   - 从 AI 取岗位画像：requirements.basic_requirements.education.level、preferred_majors、certifications
   - 校验 学历/专业/证书 三项
4) 输出明细并写入 test_results/profile_accuracy_report.json
5) 若已存在标准A报告，同时生成/更新 test_results/final_report.md（答辩可展示）

运行示例：
  python test_profile_accuracy.py
  python test_profile_accuracy.py --sample-size 10
  python test_profile_accuracy.py --ai-base-url http://127.0.0.1:5002/api/v1
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
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

        conn = pymysql.connect(host=host, port=port, db=db, user=user, password=password or "", charset="utf8mb4", autocommit=True)
        return conn
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
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
    except (URLError, OSError) as e:
        return {"code": 0, "msg": f"连接失败: {e}", "data": None}
    try:
        return json.loads(raw) if raw else {}
    except Exception:
        return {"code": 500, "msg": f"Non-JSON response: {raw[:200]}", "data": None}


_EDU_LEVEL = {"专科": 1, "本科": 2, "硕士": 3, "博士": 4}


def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _edu_ok(student_degree: str, required_degree: str) -> Tuple[bool, str]:
    sd = (student_degree or "").strip()
    rd = (required_degree or "").strip()
    if not rd:
        return True, "岗位未给学历要求"
    # 去掉“及以上”
    rd_core = rd.replace("及以上", "").strip()
    s_lv = _EDU_LEVEL.get(sd, None)
    r_lv = _EDU_LEVEL.get(rd_core, None)
    if s_lv is None or r_lv is None:
        # 容错：无法映射时用包含判断
        ok = (rd_core in sd) or (sd in rd_core) or (not sd and False)
        return ok, f"无法映射学历等级：student='{sd}' required='{rd}'"
    return s_lv >= r_lv, f"{sd} >= {rd_core}"


def _major_ok(student_major: str, preferred_majors: List[str]) -> Tuple[bool, str]:
    sm = (student_major or "").strip()
    prefs = [p for p in (preferred_majors or []) if isinstance(p, str) and p.strip()]
    if not prefs:
        return True, "岗位未给专业偏好"
    if not sm:
        return False, "学生专业为空"
    ok = any(p in sm for p in prefs)
    return ok, f"student_major='{sm}' preferred={prefs}"


def _cert_ok(student_certs: List[str], required_certs: List[str]) -> Tuple[bool, str]:
    sc = [c for c in student_certs if isinstance(c, str) and c.strip()]
    rc = [c for c in (required_certs or []) if isinstance(c, str) and c.strip()]
    if not rc:
        return True, "岗位未给证书要求"
    if not sc:
        return False, "学生证书为空"
    sc_norm = [_norm(x) for x in sc]
    for r in rc:
        rn = _norm(r)
        if not rn:
            continue
        # 任一证书命中任一学生证书（子串）
        if any(rn in s or s in rn for s in sc_norm):
            return True, f"required='{r}' hit"
    return False, f"required={rc} student={sc}"


def _load_job_requirements(job_profile: Dict[str, Any]) -> Dict[str, Any]:
    req = (job_profile.get("requirements") or {}).get("basic_requirements") or {}
    edu = req.get("education") or {}
    if isinstance(edu, str):
        edu = {"level": edu}
    preferred_majors = edu.get("preferred_majors") or []
    if not isinstance(preferred_majors, list):
        preferred_majors = []
    certifications = req.get("certifications") or req.get("certificates") or []
    if not isinstance(certifications, list):
        certifications = []
    return {
        "required_degree": (edu.get("level") or "").strip(),
        "preferred_majors": preferred_majors,
        "required_certs": certifications,
    }


def _write_final_report(repo_root: str) -> None:
    """
    读取两个 json 报告（若存在），写 final_report.md。
    """
    tr_dir = os.path.join(repo_root, "test_results")
    a_path = os.path.join(tr_dir, "skill_match_report.json")
    b_path = os.path.join(tr_dir, "profile_accuracy_report.json")
    a = None
    b = None
    if os.path.isfile(a_path):
        try:
            a = json.loads(_read_text(a_path))
        except Exception:
            a = None
    if os.path.isfile(b_path):
        try:
            b = json.loads(_read_text(b_path))
        except Exception:
            b = None

    lines: List[str] = []
    lines.append("## GradQuest 比赛评分标准自动化测试汇总\n")
    lines.append(f"- 生成时间：`{_dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`\n")

    lines.append("### 指标汇总\n")
    lines.append("| 指标 | 阈值 | 实测 | 判定 | 说明 |\n")
    lines.append("|---|---:|---:|---|---|\n")
    if a and a.get("standard") == "A" and a.get("average_accuracy") is not None:
        lines.append(f"| 标准A：技能匹配准确率 | 80% | {a.get('average_accuracy')}% | {'通过' if a.get('passed') else '不通过'} | 随机3名学生×Top1岗位 |\n")
    else:
        lines.append("| 标准A：技能匹配准确率 | 80% | - | - | 未生成 `skill_match_report.json` |\n")
    if b and b.get("standard") == "B" and b.get("pass_rate") is not None:
        lines.append(f"| 标准B：画像关键信息准确率 | 90% | {b.get('pass_rate')}% | {'通过' if b.get('passed') else '不通过'} | 10名匹配成功样本×3项核对 |\n")
    else:
        lines.append("| 标准B：画像关键信息准确率 | 90% | - | - | 未生成 `profile_accuracy_report.json` |\n")

    if b and isinstance(b.get("per_student"), list):
        lines.append("\n### 标准B 明细（10名样本）\n")
        lines.append("| user_id | job | 学历 | 专业 | 证书 | 合格 |\n")
        lines.append("|---:|---|---|---|---|---|\n")
        for row in b["per_student"]:
            uid = row.get("user_id")
            job = row.get("job_name") or row.get("job_id") or ""
            edu = "✓" if row.get("education_ok") else "✗"
            major = "✓" if row.get("major_ok") else "✗"
            cert = "✓" if row.get("cert_ok") else "✗"
            ok = "✓" if row.get("qualified") else "✗"
            lines.append(f"| {uid} | {job} | {edu} | {major} | {cert} | {ok} |\n")

    out_path = os.path.join(tr_dir, "final_report.md")
    os.makedirs(tr_dir, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=os.path.dirname(os.path.abspath(__file__)))
    parser.add_argument("--ai-base-url", default=os.environ.get("AI_BASE_URL", DEFAULT_AI_BASE_URL))
    parser.add_argument("--sample-size", type=int, default=10)
    parser.add_argument("--max-candidates", type=int, default=300)
    parser.add_argument("--mysql-host", default=os.environ.get("MYSQL_HOST", ""))
    parser.add_argument("--mysql-port", type=int, default=int(os.environ.get("MYSQL_PORT", "0") or "0"))
    parser.add_argument("--mysql-db", default=os.environ.get("MYSQL_DB", ""))
    parser.add_argument("--mysql-user", default=os.environ.get("MYSQL_USER", ""))
    parser.add_argument("--mysql-password", default=os.environ.get("MYSQL_PASSWORD", None))
    args = parser.parse_args()

    yml_cfg = _parse_mysql_from_application_yml(args.repo_root)
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

    # 候选用户：尽量选有档案/技能的
    rows = _mysql_fetch_all(
        conn,
        f"""
        SELECT DISTINCT u.id
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN profile_skills ps ON ps.user_id = u.id
        WHERE (up.user_id IS NOT NULL OR ps.user_id IS NOT NULL)
        ORDER BY u.id DESC
        LIMIT {int(args.max_candidates)}
        """,
    )
    cand_ids = [int(r[0]) for r in rows]
    if not cand_ids:
        msg = "测试数据不足，请先录入mock数据（MySQL 中需要 users/user_profiles/profile_skills 至少有数据）"
        os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
        out_path = os.path.join(args.repo_root, "test_results", "profile_accuracy_report.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"status": "insufficient_data", "reason": msg}, f, ensure_ascii=False, indent=2)
        print(msg)
        print(f"已写入：{out_path}")
        return 1

    ai_base = args.ai_base_url.rstrip("/")
    sample_target = int(args.sample_size)

    per_student: List[Dict[str, Any]] = []
    matched_count = 0
    qualified_count = 0
    ai_unavailable_msg: Optional[str] = None

    for uid in cand_ids:
        if matched_count >= sample_target:
            break

        # 定义“匹配成功”：recommend-jobs 能返回 Top1
        rec = _http_post_json(f"{ai_base}/matching/recommend-jobs", {"user_id": uid, "pageNum": 1, "pageSize": 1, "top_n": 1}, timeout_s=90)
        if rec.get("code") == 0:
            ai_unavailable_msg = rec.get("msg") or "AI 服务连接失败"
            break
        if rec.get("code") != 200:
            continue
        data = rec.get("data") or {}
        jobs = data.get("jobs") or data.get("recommendations") or []
        if not jobs:
            continue
        top = jobs[0] if isinstance(jobs, list) else {}
        job_id = (top.get("job_id") or "").strip()
        job_name = (top.get("job_name") or "").strip()

        # 学生信息（MySQL）
        prof_rows = _mysql_fetch_all(
            conn,
            "SELECT degree, major FROM user_profiles WHERE user_id=%s",
            (uid,),
        )
        degree = ""
        major = ""
        if prof_rows:
            degree = (prof_rows[0][0] or "") if len(prof_rows[0]) > 0 else ""
            major = (prof_rows[0][1] or "") if len(prof_rows[0]) > 1 else ""

        cert_rows = _mysql_fetch_all(
            conn,
            "SELECT name FROM profile_certificates WHERE user_id=%s",
            (uid,),
        )
        student_certs = [str(r[0]) for r in cert_rows if r and r[0]]

        # 岗位画像（AI）
        jp_resp = _http_post_json(
            f"{ai_base}/job/profile/detail",
            {"job_id": job_id} if job_id else {"job_name": job_name},
            timeout_s=60,
        )
        if jp_resp.get("code") == 0:
            ai_unavailable_msg = jp_resp.get("msg") or "AI 服务连接失败"
            break
        if jp_resp.get("code") != 200:
            continue
        job_profile = jp_resp.get("data") or {}
        req = _load_job_requirements(job_profile)

        edu_ok, edu_reason = _edu_ok(degree, req["required_degree"])
        major_ok, major_reason = _major_ok(major, req["preferred_majors"])
        cert_ok, cert_reason = _cert_ok(student_certs, req["required_certs"])
        qualified = bool(edu_ok and major_ok and cert_ok)

        matched_count += 1
        if qualified:
            qualified_count += 1

        per_student.append(
            {
                "user_id": uid,
                "job_id": job_id,
                "job_name": job_name,
                "student_degree": degree,
                "student_major": major,
                "student_certificates": student_certs,
                "required_degree": req["required_degree"],
                "preferred_majors": req["preferred_majors"],
                "required_certificates": req["required_certs"],
                "education_ok": edu_ok,
                "major_ok": major_ok,
                "cert_ok": cert_ok,
                "qualified": qualified,
                "reasons": {
                    "education": edu_reason,
                    "major": major_reason,
                    "cert": cert_reason,
                },
            }
        )

    if ai_unavailable_msg:
        out = {
            "status": "ai_service_unavailable",
            "reason": f"AI 服务 ({ai_base}) 未启动或无法连接。请先启动 AI 服务后再运行测试。",
        }
        os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
        out_path = os.path.join(args.repo_root, "test_results", "profile_accuracy_report.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(out["reason"])
        print(f"已写入：{out_path}")
        return 2

    if matched_count < sample_target:
        msg = f"测试数据不足：候选用户中仅找到 {matched_count}/{sample_target} 名“匹配成功”样本（recommend-jobs 有返回）。"
        out = {"status": "insufficient_data", "reason": msg, "found": matched_count, "expected": sample_target, "per_student": per_student}
        os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
        out_path = os.path.join(args.repo_root, "test_results", "profile_accuracy_report.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(msg)
        print(f"已写入：{out_path}")
        _write_final_report(args.repo_root)
        return 1

    pass_rate = (qualified_count / matched_count) if matched_count else 0.0
    passed = pass_rate >= 0.90

    report: Dict[str, Any] = {
        "standard": "B",
        "generated_at": _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "ai_base_url": ai_base,
        "mysql": {"host": mysql_host, "port": mysql_port, "db": mysql_db, "user": mysql_user},
        "sample_size": matched_count,
        "qualified_count": qualified_count,
        "pass_rate": round(pass_rate * 100, 2),
        "pass_threshold": 90.0,
        "passed": passed,
        "per_student": per_student,
    }

    os.makedirs(os.path.join(args.repo_root, "test_results"), exist_ok=True)
    out_path = os.path.join(args.repo_root, "test_results", "profile_accuracy_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("=== 标准B：画像关键信息准确率 ===")
    print("| user_id | job | 学历 | 专业 | 证书 | 合格 |")
    print("|---:|---|---|---|---|---|")
    for r in per_student:
        uid = r["user_id"]
        job = r.get("job_name") or r.get("job_id") or ""
        edu = "✓" if r["education_ok"] else "✗"
        maj = "✓" if r["major_ok"] else "✗"
        cert = "✓" if r["cert_ok"] else "✗"
        ok = "✓" if r["qualified"] else "✗"
        print(f"| {uid} | {job} | {edu} | {maj} | {cert} | {ok} |")
    print(f"合格率：{report['pass_rate']}%")
    print("判定：{}".format("通过" if passed else "不通过"))
    print(f"已写入：{out_path}")

    _write_final_report(args.repo_root)
    print(f"已更新：{os.path.join(args.repo_root, 'test_results', 'final_report.md')}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())

