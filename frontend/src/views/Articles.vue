<template>
    <div class="articles-polish-page">
        <!-- 聊天消息区域 -->
        <div class="chat-container" ref="chatContainer">
            <div
                v-for="(message, index) in messages"
                :key="index"
                :class="['chat-message', message.role]"
            >
                <div class="message-content">
                    <div class="message-text" v-html="formatMessage(message.content)"></div>
                    <div v-if="message.files" class="message-files">
                        <div v-for="(file, idx) in message.files" :key="idx" class="file-tag">
                            📄 {{ file.name }}
                        </div>
                    </div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
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
                    <span class="file-size">({{ formatFileSize(file.size) }})</span>
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
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    @change="handleFileSelect"
                    style="display: none"
                />

                <button class="icon-btn upload-btn" @click="$refs.fileInput.click()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </button>

                <input
                    v-model="inputMessage"
                    type="text"
                    class="text-input"
                    placeholder="问我：文书润色 / 保研定位（如：我想保研XX方向，给我择校梯度）或拖拽文件..."
                    @keydown.enter="handleSendMessage"
                />

                <button
                    class="icon-btn send-btn"
                    :disabled="!canSend"
                    @click="handleSendMessage"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                </button>
            </div>

            <div class="input-hint">
                支持 PDF、Word、PowerPoint、TXT（单个≤10MB）｜也可直接发：绩点/排名/科研/竞赛/英语/目标方向做保研定位
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'

const messages = ref([])
const inputMessage = ref('')
const uploadedFiles = ref([])
const isLoading = ref(false)
const isDragging = ref(false)
const chatContainer = ref(null)
const fileInput = ref(null)

const canSend = computed(() => {
    return !isLoading.value && (inputMessage.value.trim() || uploadedFiles.value.length > 0)
})

onMounted(() => {
  messages.value.push({
    role: 'assistant',
    content:
      '你好！我是「保研指南针」AI 助手 🎓\n\n我可以帮你两件事：\n1）文书润色：简历/个人陈述/套磁信/汇报PPT 的结构、语言、逻辑优化\n2）保研定位：根据你的背景与偏好，给出院校/专业方向/导师/项目匹配建议、梯度分层与备选方案\n\n你可以直接：\n• 发送你的基本信息（绩点/排名/科研竞赛/英语/目标方向/城市偏好等）让我做定位\n• 或上传文书/简历让我润色并反推定位短板\n\n支持 PDF、DOCX、PPTX、TXT（单个≤10MB）',
    timestamp: new Date()
  })
})

// 监听消息变化自动滚动
watch(() => messages.value.length, () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
    })
})

const formatMessage = (content) => {
    return content.replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
    const hours = timestamp.getHours().toString().padStart(2, '0')
    const minutes = timestamp.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleFileSelect = (event) => {
    handleFileUpload(Array.from(event.target.files))
    event.target.value = ''
}

const handleDrop = (event) => {
    isDragging.value = false
    handleFileUpload(Array.from(event.dataTransfer.files))
}

const handleFileUpload = async (files) => {
    const validFiles = files.filter(file => {
        const validExtensions = /\.(pdf|docx?|pptx?|txt)$/i
        const maxSize = 10 * 1024 * 1024

        if (!validExtensions.test(file.name)) {
            alert(`文件 "${file.name}" 格式不支持`)
            return false
        }
        if (file.size > maxSize) {
            alert(`文件 "${file.name}" 超过 10MB 限制`)
            return false
        }
        return true
    })

    if (validFiles.length === 0) return

    const newFiles = validFiles.map(file => ({
        name: file.name,
        size: file.size,
        file: file
    }))

    uploadedFiles.value.push(...newFiles)

    const fileNames = newFiles.map(f => f.name).join('、')
    messages.value.push({
        role: 'user',
        content: `已上传文件：${fileNames}`,
        files: newFiles,
        timestamp: new Date()
    })

    isLoading.value = true

    try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1500))

        messages.value.push({
            role: 'assistant',
            content: `我已收到文件：${fileNames}\n\n我可以帮你：\n• 文书润色：结构、逻辑、措辞、说服力提升（可给出可直接替换的修改稿）\n• 保研定位：根据你的背景给出冲/稳/保梯度建议与提升路线\n\n如果你希望我做「保研定位」，请补充任意几项：\n1) 本科院校/专业\n2) GPA/排名（或百分位）\n3) 英语（四/六级、雅思/托福）\n4) 科研/论文/项目/竞赛\n5) 目标方向（如：AI/信管/软工/计科…）\n6) 地区偏好与限制\n\n你也可以直接说：\n“我想做XX方向的保研定位，给我冲稳保方案”`,
            timestamp: new Date()
        })

    } catch (error) {
        messages.value.push({
            role: 'assistant',
            content: '抱歉，文件处理遇到问题，请重试。',
            timestamp: new Date()
        })
    } finally {
        isLoading.value = false
    }
}

const removeFile = (index) => {
    uploadedFiles.value.splice(index, 1)
}

const handleSendMessage = async () => {
  if (!canSend.value) return

  // 1) 处理“用户没输入文字但上传了文件”的情况
  const userMsg = inputMessage.value.trim()
  const displayMsg =
    userMsg ||
    (uploadedFiles.value.length ? '请根据我上传的材料给建议（可包含保研定位与文书优化）' : '')

  // 2) 先把用户消息塞进聊天列表（用于页面展示）
  messages.value.push({
    role: 'user',
    content: displayMsg,
    timestamp: new Date()
  })

  inputMessage.value = ''
  isLoading.value = true

  try {
    // 3) System Prompt：让模型同时支持 文书润色 + 保研定位
    const systemPrompt = `
你是「保研指南针」AI 助手，面向中国本科生的推免（保研）申请。
你必须同时擅长两类任务：
A. 文书润色：简历/个人陈述/套磁信/汇报PPT 的结构与表达优化，给出可直接替换的修改稿与修改理由。
B. 保研定位：根据用户背景（成绩、排名、科研、竞赛、英语、方向、偏好约束）给出择校/择导/院系方向匹配建议，并提供梯度分层（冲/稳/保）、风险点与提升路径。

【意图识别与路由】
- 若用户问“择校/定位/冲稳保/方向/导师/院系/学校推荐/我能去哪/匹配度/定位建议”等 => 走B。
- 若用户上传文件或明确说“润色/修改/优化措辞/改结构”等 => 走A。
- 若两者都出现 => 先做B（定位结论），再做A（润色建议与改写示例）。

【输出格式】
1) 任务识别：一句话说明你将做“定位/润色/两者”
2) 结论摘要：3-6条要点
3) 详细建议：
   - 若定位(B)：给出“方向判断→梯度分层（冲/稳/保）→理由（匹配点/短板）→行动清单（1-4周/1-3月）”
   - 若润色(A)：给出“结构问题→语言问题→改写示例（原句→改写）→一版可直接粘贴的段落/要点”
4) 需要补充的信息：用清单列出缺失字段（例如：学校层次、专业、GPA/排名、科研论文、竞赛奖项、英语、目标地区、是否偏学硕/专硕/直博等）

【约束】
- 不要编造用户背景；信息不足必须在第4部分提出要补充的字段。
- 建议要可执行、可落地，避免空话。
`.trim()

    // 4) User Prompt：把当前输入 + 已上传文件名打包
    const userPrompt = `
用户输入：${displayMsg || '(空)'}
已上传文件：${uploadedFiles.value.map(f => f.name).join(', ') || '无'}

请按上述规则回答。
`.trim()

    // 5) 把历史对话也带上（减少模型“断档”）
    //    注意：Anthropic 的 messages 中 role 只能是 user / assistant。
    //    这里我们把你页面里的 messages 简化为文本历史。
    const history = messages.value
      .slice(-12) // 控制长度，避免上下文太长（可调）
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: String(m.content || '')
      }))

    // 6) 构造最终发送给模型的 messages
    //    你的写法没有 system 字段，所以用 “SYSTEM: ... USER: ...” 拼接增强兼容性
    //    如果你要改成官方 system 字段，我也可以给你另一份版本。
    const outboundMessages = [
      ...history,
      {
        role: 'user',
        content: `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`
      }
    ]

    // 7) 调用 API（注意：你原代码缺少鉴权头，真实环境需要补）
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // ✅ 真实调用一般需要：
        // 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
        // 'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: outboundMessages
      })
    })

    // 8) 更稳的错误处理：HTTP 非 2xx 也能读到错误信息
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        `请求失败（HTTP ${response.status}）`
      throw new Error(errMsg)
    }

    // 9) 解析 Anthropic 返回
    const aiResponse =
      data?.content?.map(item => item.text || '').join('\n') ||
      '我已收到你的需求，但模型暂时没有返回有效内容。你可以再试一次或补充你的背景信息。'

    // 10) 追加 AI 消息到页面
    messages.value.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: `抱歉，暂时无法回复：${error?.message || '未知错误'}\n\n你可以：\n1）稍后重试\n2）检查接口 Key/版本头是否配置\n3）减少一次性上传/输入内容长度`,
      timestamp: new Date()
    })
  } finally {
    isLoading.value = false
  }
}

</script>

<style scoped>
.articles-polish-page {
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

.message-files {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.file-tag {
    font-size: 12px;
    opacity: 0.9;
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
    0%, 60%, 100% {
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