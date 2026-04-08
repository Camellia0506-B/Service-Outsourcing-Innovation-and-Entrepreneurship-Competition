import yaml
from utils.path_tool import get_abs_path


def get_yaml_config(path: str | None = None):
    """
    读取指定路径的 YAML 配置文件并返回为字典。
    - 如果未传入 path，则为职业规划报告模块提供一个默认配置，
      其中包含 rag.chat_model_name，复用全局 rag.yml 中的配置。
    """
    # 无参调用：为 career_report_service 提供默认配置
    if path is None:
        try:
            from utils.config_handler import rag_conf
        except Exception:
            # 兜底：如果全局配置也不可用，返回一个内置默认模型名
            rag_conf = {"chat_model_name": "qwen3.5-plus"}
        return {"rag": rag_conf}

    # 传入路径时，按给定 YAML 加载
    abs_path = get_abs_path(path)
    with open(abs_path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=yaml.FullLoader)

