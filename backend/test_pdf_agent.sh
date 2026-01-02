#!/bin/bash

# PDF 智能体测试脚本
# 使用方法: ./test_pdf_agent.sh [pdf_file_path]

BASE_URL="http://localhost:5000/api/v1/pdf"
PDF_FILE=${1:-"src/main/resources/test.pdf"}

echo "=========================================="
echo "PDF 智能体测试脚本"
echo "=========================================="
echo ""

# 检查服务是否运行
echo "1. 检查服务状态..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/upload" | grep -q "405\|400"; then
    echo "✓ 服务正在运行"
else
    echo "✗ 服务未运行，请先启动后端服务"
    exit 1
fi
echo ""

# 上传 PDF
echo "2. 上传 PDF 文件: $PDF_FILE"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/upload" \
    -F "file=@$PDF_FILE")

echo "$UPLOAD_RESPONSE" | jq '.'

SESSION_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.session_id // empty')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
    echo "✗ PDF 上传失败"
    exit 1
fi

echo "✓ PDF 上传成功，session_id: $SESSION_ID"
echo ""

# 提问
echo "3. 提问: 这个文档的主要内容是什么？"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/chat" \
    -H "Content-Type: application/json" \
    -d "{
        \"question\": \"这个文档的主要内容是什么？\",
        \"session_id\": \"$SESSION_ID\"
    }")

echo "$CHAT_RESPONSE" | jq '.'
echo ""

# 清除会话
echo "4. 清除会话..."
CLEAR_RESPONSE=$(curl -s -X POST "$BASE_URL/clear" \
    -H "Content-Type: application/json" \
    -d "{
        \"session_id\": \"$SESSION_ID\"
    }")

echo "$CLEAR_RESPONSE" | jq '.'
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

