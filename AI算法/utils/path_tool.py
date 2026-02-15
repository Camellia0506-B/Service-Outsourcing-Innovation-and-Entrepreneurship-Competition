"""
为整个工程提供统一的绝对路径 保证代码可移植性
"""
import os

def get_project_root()->str:
    """
    获取整个工程所在的根目录 （后续的相对路径可拼接其后）
    :return:字符串根目录
    """
    # 获取当前文件绝对路径
    current_file=os.path.abspath(__file__) #(python内置变量：当前代码文件）

    #获取util文件夹
    current_dir=os.path.dirname(current_file)

    #获取Agent工程根目录
    project_root=os.path.dirname(current_dir)

    return project_root


def get_abs_path(relative_path:str)->str:
    """
    传入相对路径 返回绝对路径
    :param relative_path: 相对路径
    :return: 绝对路径
    """

    project_root=get_project_root()
    return os.path.join(project_root, relative_path) #完整绝对路径

