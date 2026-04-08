"""
岗位画像初始化脚本（v2 - 模型知识主导版）
========================================================
支持：
  - 全量生成 35个岗位
  - 按大类生成（避免一次调用太多）
  - 断点续传（已生成的自动跳过）
  - 合规性验证

使用方式：
  python init_job_profiles.py                    # 查看当前状态
  python init_job_profiles.py --all              # 生成全部35个（含图谱）
  python init_job_profiles.py --all --force      # 强制重新生成全部
  python init_job_profiles.py --category 后端开发  # 只生成某类
  python init_job_profiles.py --graph            # 只重建图谱
  python init_job_profiles.py --verify           # 合规性验证
  python init_job_profiles.py --list             # 列出所有岗位配置
"""
import sys
import json
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from utils.logger_handler import logger
from job_profile.job_profile_service import (
    get_job_profile_service, job_profile_conf, _save_profiles_store
)
from job_profile.job_graph_service import get_job_graph_service


def banner():
    print("\n" + "=" * 65)
    print("  AI职业规划智能体 v2 — 岗位画像初始化（模型知识主导版）")
    print("  覆盖：计算机行业35个主流岗位 × 8大方向")
    print("=" * 65)


def show_status():
    """显示当前生成状态"""
    service = get_job_profile_service()
    summary = service.get_category_summary()

    print("\n📊 当前岗位画像生成状态：\n")
    total_done = total_all = 0
    for cat, info in summary.items():
        done = info["generated"]
        total = info["total"]
        total_done += done
        total_all  += total
        bar = "█" * done + "░" * (total - done)
        print(f"  [{bar}] {cat}：{done}/{total}")
        for j in info["jobs"]:
            mark = "✅" if j["done"] else "⏳"
            print(f"         {mark} {j['name']}")
    print(f"\n  总进度：{total_done}/{total_all} 个岗位画像已生成")


def list_all_jobs():
    """列出所有预配置岗位"""
    jobs = job_profile_conf.get("target_jobs", [])
    print(f"\n📋 预配置岗位列表（共{len(jobs)}个）：\n")
    cur_cat = ""
    for j in jobs:
        cat = j.get("category", "")
        if cat != cur_cat:
            cur_cat = cat
            print(f"\n  ▌ {cat}")
        print(f"     {j['job_id']:8s}  {j['name']}")


def generate_all(force=False):
    """生成全部35个岗位画像"""
    service = get_job_profile_service()
    target_jobs = job_profile_conf.get("target_jobs", [])

    to_generate = [
        j for j in target_jobs
        if force or j["job_id"] not in service.profiles_store
    ]

    if not to_generate:
        print("\n✅ 所有岗位画像已存在，无需重新生成（使用 --force 强制重新生成）")
        return

    print(f"\n🚀 开始生成 {len(to_generate)}/{len(target_jobs)} 个岗位画像...")
    print("   （策略：模型行业知识主导 + CSV本地市场数据辅助补充）\n")

    success, failed = [], []
    start_time = time.time()

    for i, job_config in enumerate(to_generate, 1):
        job_name = job_config["name"]
        category = job_config.get("category", "")
        print(f"  [{i:2d}/{len(to_generate)}] 生成中... {category} › {job_name}", end="", flush=True)

        t0 = time.time()
        try:
            profile = service.generate_profile(job_config)
            service.profiles_store[job_config["job_id"]] = profile
            _save_profiles_store(service.profiles_store)
            elapsed = time.time() - t0
            print(f"  ✅ ({elapsed:.1f}s)")
            success.append(job_name)
        except Exception as e:
            elapsed = time.time() - t0
            print(f"  ❌ ({elapsed:.1f}s) {e}")
            failed.append((job_name, str(e)))

    total_elapsed = time.time() - start_time
    print(f"\n{'─'*50}")
    print(f"✨ 画像生成完成！耗时 {total_elapsed:.1f}s")
    print(f"   成功：{len(success)} 个")
    print(f"   失败：{len(failed)} 个")
    if failed:
        print("\n❌ 失败列表：")
        for name, err in failed:
            print(f"   {name}: {err}")


def generate_category(category_name: str, force=False):
    """生成指定大类的岗位"""
    service = get_job_profile_service()
    result = service.generate_by_category(category_name, force_regenerate=force)
    print(f"\n类别【{category_name}】生成完成：")
    print(f"  成功：{result['success_count']} 个")
    print(f"  失败：{result.get('error_count', 0)} 个")
    if result.get("errors"):
        for job_id, err in result["errors"].items():
            print(f"  ❌ {job_id}: {err}")


def build_graph():
    """构建岗位关联图谱"""
    print("\n🔗 构建岗位关联图谱（垂直晋升 + 横向换岗）...")
    graph_service = get_job_graph_service()
    graph = graph_service.get_full_graph(force_regenerate=True)

    print(f"   ✅ 垂直赛道：{len(graph['vertical_graphs'])} 条")
    print(f"   ✅ 换岗节点：{len(graph['transfer_graph']['nodes'])} 个岗位")
    print(f"   ✅ 换岗路径：{len(graph['transfer_graph']['edges'])} 条")
    print(f"   ✅ 热门路径：{len(graph['hot_transfer_paths'])} 条")


def verify():
    """验证命题合规性"""
    print("\n🔍 命题合规性验证\n" + "─" * 40)
    service = get_job_profile_service()
    graph_service = get_job_graph_service()

    # 1. 岗位画像数量
    count = len(service.profiles_store)
    ok1 = "✅" if count >= 10 else "❌"
    print(f"{ok1} 岗位画像数量: {count}/35 （命题要求≥10）")

    # 2. 维度完整性
    required_keys = ["professional_skills", "certificates", "soft_skills", "experience"]
    soft_keys     = ["innovation_ability","learning_ability","pressure_resistance",
                     "communication_ability","teamwork_ability"]
    all_ok = True
    for pid, profile in service.profiles_store.items():
        req  = profile.get("requirements", {})
        miss = [k for k in required_keys if k not in req]
        if miss:
            print(f"  ⚠️  {profile.get('job_name')} 缺少: {miss}")
            all_ok = False
        soft = req.get("soft_skills", {})
        smiss = [k for k in soft_keys if k not in soft]
        if smiss:
            print(f"  ⚠️  {profile.get('job_name')} 软技能缺少: {smiss}")
            all_ok = False
    if all_ok and count > 0:
        print("✅ 画像维度完整（专业技能/证书/创新/学习/抗压/沟通/实习 均已覆盖）")

    # 3. 换岗路径（至少5个岗位，每个≥2条）
    summary = graph_service.get_all_transfer_paths_summary()
    q_jobs  = {k: v for k, v in summary.items() if v["transfer_count"] >= 2}
    ok3 = "✅" if len(q_jobs) >= 5 else "❌"
    print(f"{ok3} 换岗路径: {len(q_jobs)}个岗位各有≥2条路径（命题要求≥5个岗位）")
    for jid, info in summary.items():
        mark = "✅" if info["transfer_count"] >= 2 else "⚠️ "
        print(f"    {mark} {info['job_name']}: {info['transfer_count']}条")

    # 4. 垂直图谱
    graph  = graph_service.get_full_graph()
    ok4 = "✅" if len(graph["vertical_graphs"]) >= 3 else "⚠️"
    print(f"{ok4} 垂直晋升图谱: {len(graph['vertical_graphs'])}条赛道")
    for vg in graph["vertical_graphs"]:
        print(f"    📈 {vg['career_track']}: {len(vg['nodes'])}级")

    print("\n" + "─" * 40)
    print("✅ 合规性验证完成！")


if __name__ == "__main__":
    banner()
    args = sys.argv[1:]
    force = "--force" in args

    if not args or "--status" in args:
        show_status()

    elif "--list" in args:
        list_all_jobs()

    elif "--all" in args:
        generate_all(force=force)
        build_graph()
        verify()

    elif "--category" in args:
        idx = args.index("--category")
        cat = args[idx + 1] if idx + 1 < len(args) else ""
        if cat:
            generate_category(cat, force=force)
        else:
            print("请指定类别名，如: --category 后端开发")
            print("可用类别:", list({j.get("category") for j in job_profile_conf.get("target_jobs", [])}))

    elif "--graph" in args:
        build_graph()

    elif "--verify" in args:
        verify()

    else:
        print("未知参数，使用 --help 查看用法")
        print(__doc__)
