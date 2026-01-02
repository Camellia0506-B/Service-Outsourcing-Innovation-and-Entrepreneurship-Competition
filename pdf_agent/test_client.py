"""
PDF 智能体服务测试客户端
用于测试 API 接口功能
"""
import requests
import sys
import os


def test_health_check():
    """测试健康检查接口"""
    print("=" * 50)
    print("测试 1: 健康检查")
    print("=" * 50)
    
    try:
        response = requests.get("http://localhost:8000/")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        print("✓ 健康检查通过\n")
        return True
    except Exception as e:
        print(f"✗ 健康检查失败: {e}\n")
        return False


def test_upload_pdf(pdf_path):
    """测试上传 PDF"""
    print("=" * 50)
    print("测试 2: 上传 PDF 文件")
    print("=" * 50)
    
    if not os.path.exists(pdf_path):
        print(f"✗ PDF 文件不存在: {pdf_path}\n")
        return None
    
    try:
        with open(pdf_path, 'rb') as f:
            files = {'file': (os.path.basename(pdf_path), f, 'application/pdf')}
            response = requests.post(
                "http://localhost:8000/api/v1/pdf/upload",
                files=files
            )
        
        result = response.json()
        print(f"状态码: {response.status_code}")
        print(f"响应: {result}")
        
        if result.get('code') == 200:
            session_id = result['data']['session_id']
            print(f"✓ PDF 上传成功，session_id: {session_id}\n")
            return session_id
        else:
            print(f"✗ PDF 上传失败: {result.get('msg')}\n")
            return None
            
    except Exception as e:
        print(f"✗ PDF 上传异常: {e}\n")
        return None


def test_chat(session_id, question):
    """测试对话接口"""
    print("=" * 50)
    print(f"测试 3: 提问 - {question}")
    print("=" * 50)
    
    if not session_id:
        print("✗ session_id 为空，跳过测试\n")
        return False
    
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/pdf/chat",
            json={
                "session_id": session_id,
                "question": question
            },
            headers={"Content-Type": "application/json"}
        )
        
        result = response.json()
        print(f"状态码: {response.status_code}")
        
        if result.get('code') == 200:
            answer = result['data']['answer']
            print(f"✓ 提问成功")
            print(f"回答: {answer}\n")
            return True
        else:
            print(f"✗ 提问失败: {result.get('msg')}\n")
            return False
            
    except Exception as e:
        print(f"✗ 提问异常: {e}\n")
        return False


def test_clear_session(session_id):
    """测试清除会话"""
    print("=" * 50)
    print("测试 4: 清除会话")
    print("=" * 50)
    
    if not session_id:
        print("✗ session_id 为空，跳过测试\n")
        return False
    
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/pdf/clear",
            json={"session_id": session_id},
            headers={"Content-Type": "application/json"}
        )
        
        result = response.json()
        print(f"状态码: {response.status_code}")
        print(f"响应: {result}")
        
        if result.get('code') == 200:
            print("✓ 会话清除成功\n")
            return True
        else:
            print(f"✗ 会话清除失败: {result.get('msg')}\n")
            return False
            
    except Exception as e:
        print(f"✗ 会话清除异常: {e}\n")
        return False


def main():
    """主测试函数"""
    print("\n" + "=" * 50)
    print("PDF 智能体服务测试")
    print("=" * 50 + "\n")
    
    # 检查服务是否运行
    if not test_health_check():
        print("服务未运行，请先启动服务：python main.py")
        sys.exit(1)
    
    # 获取 PDF 文件路径
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        # 尝试使用项目中的测试 PDF
        pdf_path = "../backend/src/main/resources/test.pdf"
        if not os.path.exists(pdf_path):
            pdf_path = input("请输入 PDF 文件路径: ").strip()
            if not pdf_path:
                print("未提供 PDF 文件，跳过上传测试")
                sys.exit(0)
    
    # 测试上传
    session_id = test_upload_pdf(pdf_path)
    
    if session_id:
        # 测试对话
        test_chat(session_id, "这个文档的主要内容是什么？")
        test_chat(session_id, "文档有多少页？")
        
        # 测试清除会话
        test_clear_session(session_id)
    
    print("=" * 50)
    print("测试完成")
    print("=" * 50)


if __name__ == "__main__":
    main()

