"""
测试岗位详情API
"""

import requests
import json

# API端点
url = "http://127.0.0.1:5002/api/v1/job/detail/query"

# 请求参数
payload = {
    "job_name": "前端",
    "limit": 3
}

# 发送请求
try:
    response = requests.post(url, json=payload)
    response.raise_for_status()  # 检查响应状态码
    
    # 解析响应
    result = response.json()
    print("API测试结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result.get("code") == 200:
        print("\n测试成功！")
        print(f"共找到 {result['data']['total']} 条记录")
        print(f"返回 {len(result['data']['list'])} 条记录")
    else:
        print(f"\n测试失败：{result.get('msg')}")
        
except Exception as e:
    print(f"测试失败：{e}")
