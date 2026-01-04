<template>
    <div class="pdf-agent-page">
        <!-- 聊天消息区域 -->
        <div class="chat-container" ref="chatContainer">
            <div
                v-for="(message, index) in messages"
                :key="index"
                :class="['chat-message', message.role]"
            >
                <div class="message-content">
                    <div
                        class="message-text"
                        v-html="formatMessage(message.content)"
                    ></div>
                    <div class="message-time">
                        {{ formatTime(message.timestamp) }}
                    </div>
                </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading" class="chat-message assistant">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-section">
            <!-- 已上传文件显示 -->
            <div v-if="uploadedFiles.length > 0" class="uploaded-files">
                <div
                    v-for="(file, index) in uploadedFiles"
                    :key="index"
                    class="file-chip"
                >
                    <span>📎 {{ file.name }}</span>
                    <span class="file-size"
                        >({{ formatFileSize(file.size) }})</span
                    >
                    <span v-if="pdfInfo" class="file-pages"
                        >📄 {{ pdfInfo.page_count }}页</span
                    >
                    <span class="remove-btn" @click="removeFile(index)">×</span>
                </div>
            </div>

            <!-- 输入框 -->
            <div
                class="input-box"
                :class="{ 'drag-over': isDragging }"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
            >
                <input
                    ref="fileInput"
                    type="file"
                    accept=".pdf"
                    @change="handleFileSelect"
                    style="display: none"
                />

                <button
                    class="icon-btn upload-btn"
                    @click="$refs.fileInput.click()"
                    title="上传PDF文件"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        ></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </button>

                <input
                    v-model="inputMessage"
                    type="text"
                    class="text-input"
                    :placeholder="
                        sessionId ? '向我提问文档内容...' : '请先上传PDF文件'
                    "
                    :disabled="!sessionId"
                    @keydown.enter="handleSendMessage"
                />

                <button
                    class="icon-btn send-btn"
                    :disabled="!canSend"
                    @click="handleSendMessage"
                    title="发送消息"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                </button>
            </div>

            <div class="input-hint">
                支持PDF格式文档（≤10MB）｜拖拽上传或点击按钮｜分析前10页内容｜多轮对话记住上下文
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { uploadPdfAPI, chatPdfAPI, clearPdfSessionAPI } from '@/api/pdf'

// 响应式数据
const messages = ref([])
const inputMessage = ref('')
const uploadedFiles = ref([])
const isLoading = ref(false)
const isDragging = ref(false)
const sessionId = ref(null)
const pdfInfo = ref(null)

// DOM引用
const chatContainer = ref(null)
const fileInput = ref(null)

// 计算属性
const canSend = computed(() => {
    return !isLoading.value && inputMessage.value.trim() && sessionId.value
})

// 初始化欢迎消息
onMounted(() => {
    messages.value.push({
        role: 'assistant',
        content:
            '你好！我是「保研文书AI助手」📄\n\n我可以帮你阅读和打磨简历/套磁信/PPT内容：\n• 上传PDF文件（支持拖拽上传）\n• 询问文档中的任何内容\n• 多轮对话，记住上下文\n• 智能提取关键信息\n\n请上传一份PDF文件开始吧！支持最多10页的文档分析。',
        timestamp: new Date()
    })
})

// 监听消息变化自动滚动
watch(
    () => messages.value.length,
    () => {
        nextTick(() => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight
            }
        })
    }
)

// 组件卸载前清除会话
onBeforeUnmount(() => {
    clearSession()
})

// 格式化消息内容
const formatMessage = content => content.replace(/\n/g, '<br>')

// 格式化时间
const formatTime = timestamp => {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

// 格式化文件大小
const formatFileSize = bytes => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 清除会话
const clearSession = async () => {
    if (!sessionId.value) return
    try {
        await clearPdfSessionAPI(sessionId.value)
    } catch (error) {
        console.error('清除会话失败:', error)
    }
}

// 文件选择处理
const handleFileSelect = event => {
    handleFileUpload(Array.from(event.target.files || []))
    event.target.value = ''
}

// 拖拽放置处理
const handleDrop = event => {
    isDragging.value = false
    handleFileUpload(Array.from(event.dataTransfer.files || []))
}

// 文件上传处理（axios版）
const handleFileUpload = async files => {
    const validFiles = files.filter(file => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert(`文件 "${file.name}" 不是PDF格式`)
            return false
        }
        if (file.size > 10 * 1024 * 1024) {
            alert(`文件 "${file.name}" 超过 10MB 限制`)
            return false
        }
        return true
    })
    if (validFiles.length === 0) return

    const file = validFiles[0]

    // 如果已有会话，先清除
    if (sessionId.value) {
        await clearSession()
        sessionId.value = null
        pdfInfo.value = null
    }

    isLoading.value = true

    try {
        // ✅ 1️⃣ 在这里明确创建 formData
        const formData = new FormData()
        formData.append('file', file)

        // ✅ 2️⃣ 调用 API（注意：返回的就是 body）
        const body = await uploadPdfAPI(formData)

        // ✅ 3️⃣ 走到这里 = 一定成功
        uploadedFiles.value = [{ name: file.name, size: file.size, file }]

        sessionId.value = body.data.session_id
        pdfInfo.value = body.data

        messages.value.push({
            role: 'assistant',
            content: `✅ PDF文件上传成功！\n\n文件名：${
                body.data.filename
            }\n页数：${body.data.page_count} 页\n${
                body.data.page_count > 10 ? '（将分析前10页内容）\n' : ''
            }\n现在你可以向我提问关于这份文档的任何问题了！`,
            timestamp: new Date()
        })
    } catch (err) {
        console.error('[upload err]', err)

        messages.value.push({
            role: 'assistant',
            content: `❌ 上传失败：${err.message || '未知错误'}`,
            timestamp: new Date()
        })
    } finally {
        isLoading.value = false
    }
}

// 移除文件
const removeFile = async () => {
    if (sessionId.value) {
        await clearSession()
        sessionId.value = null
        pdfInfo.value = null
    }
    uploadedFiles.value = []
    messages.value.push({
        role: 'assistant',
        content: '文件已移除，请上传新的PDF文件开始对话。',
        timestamp: new Date()
    })
}

// 发送消息（axios版）
const handleSendMessage = async () => {
    if (!canSend.value) return

    if (!sessionId.value) {
        messages.value.push({
            role: 'assistant',
            content: '⚠️ 请先上传PDF文件后再提问。',
            timestamp: new Date()
        })
        return
    }

    const userMsg = inputMessage.value.trim()

    messages.value.push({
        role: 'user',
        content: userMsg,
        timestamp: new Date()
    })

    inputMessage.value = ''
    isLoading.value = true

    try {
        const res = await chatPdfAPI({
            session_id: sessionId.value,
            question: userMsg
        })
        const data = res?.data

        if (data?.code === 200) {
            messages.value.push({
                role: 'assistant',
                content: data.data.answer,
                timestamp: new Date()
            })
        } else {
            throw new Error(data?.msg || '请求失败')
        }
    } catch (error) {
        const msg =
            error?.response?.data?.msg ||
            error?.response?.data?.message ||
            error?.message ||
            '回答失败'

        messages.value.push({
            role: 'assistant',
            content: `❌ 回答失败：${msg}\n\n可能的原因：\n• 会话已过期，请重新上传PDF\n• 服务器连接失败（检查 /api 代理、后端端口、跨域配置）\n• API调用异常`,
            timestamp: new Date()
        })
    } finally {
        isLoading.value = false
    }
}
</script>

<style scoped>
.pdf-agent-page {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    background-color: var(--home-bg, #ffffff);
    margin-top: 60px;
}

/* 聊天容器 */
.chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.chat-message {
    display: flex;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.chat-message.user {
    justify-content: flex-end;
}

.chat-message.assistant {
    justify-content: flex-start;
}

.message-content {
    max-width: 70%;
    padding: 12px 18px;
    border-radius: 12px;
    background: var(--card-bg, #fff);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-message.user .message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
}

.chat-message.assistant .message-content {
    background: var(--card-bg, #fff);
    color: var(--text-primary, #333);
    border-bottom-left-radius: 4px;
    border: 1px solid var(--border-color, #e0e0e0);
}

.message-text {
    line-height: 1.6;
    word-break: break-word;
}

.message-time {
    margin-top: 6px;
    font-size: 11px;
    opacity: 0.6;
    text-align: right;
}

/* 打字动画 */
.typing-indicator {
    display: flex;
    gap: 4px;
    padding: 4px 0;
}

.typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #667eea;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
    animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%,
    60%,
    100% {
        transform: translateY(0);
        opacity: 0.5;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}

/* 输入区域 */
.input-section {
    padding: 16px 40px 20px;
    background: var(--card-bg, #fff);
    border-top: 1px solid var(--border-color, #e0e0e0);
}

.uploaded-files {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.file-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f0f4ff;
    border-radius: 16px;
    font-size: 13px;
    color: #333;
}

.file-size {
    color: #999;
    font-size: 11px;
}

.file-pages {
    color: #667eea;
    font-size: 11px;
    font-weight: 500;
}

.remove-btn {
    cursor: pointer;
    color: #999;
    font-size: 18px;
    line-height: 1;
    margin-left: 4px;
    transition: color 0.2s;
}

.remove-btn:hover {
    color: #f56c6c;
}

.input-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--home-bg, #fafafa);
    border: 2px dashed var(--border-color, #e0e0e0);
    border-radius: 12px;
    transition: all 0.3s;
}

.input-box.drag-over {
    background: #e8f0fe;
    border-color: #667eea;
}

.icon-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.icon-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.icon-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
}

.text-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: var(--text-primary, #333);
}

.text-input::placeholder {
    color: var(--text-tertiary, #999);
}

.text-input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.input-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-tertiary, #999);
    text-align: center;
}

/* 滚动条 */
.chat-container::-webkit-scrollbar {
    width: 6px;
}

.chat-container::-webkit-scrollbar-track {
    background: transparent;
}

.chat-container::-webkit-scrollbar-thumb {
    background: var(--border-color, #d0d0d0);
    border-radius: 3px;
}

.chat-container::-webkit-scrollbar-thumb:hover {
    background: #b0b0b0;
}

/* 响应式 */
@media (max-width: 768px) {
    .chat-container {
        padding: 16px 20px;
    }

    .input-section {
        padding: 12px 20px 16px;
    }

    .message-content {
        max-width: 85%;
    }
}
</style>
