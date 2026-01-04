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
                        class="message-text markdown-body assistant-markdown"
                        v-html="renderMarkdown(message.content)"
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
                        !sessionId
                            ? '请先上传PDF文件'
                            : !typeConfirmed
                            ? '请先选择材料类型（简历/面试PPT/套磁邮件/面试稿/模拟提问）'
                            : '向我提问文档内容...'
                    "
                    :disabled="!sessionId || !typeConfirmed"
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
        <!-- ✅ 材料类型选择弹窗 -->
        <div v-if="showTypeModal" class="modal-mask" @click.self="() => {}">
            <div class="modal-card">
                <div class="modal-title">请选择材料类型</div>
                <div class="modal-sub">
                    选择后我会按对应“保研场景”输出更精准的结构与模板。
                </div>

                <div class="type-grid">
                    <button
                        v-for="opt in DOC_TYPE_OPTIONS"
                        :key="opt.value"
                        class="type-btn"
                        :class="{ active: docType === opt.value }"
                        @click="docType = opt.value"
                    >
                        {{ opt.label }}
                    </button>
                </div>

                <div class="modal-actions">
                    <button
                        class="confirm-btn"
                        @click="
                            () => {
                                typeConfirmed = true
                                showTypeModal = false
                                messages.push({
                                    role: 'assistant',
                                    content: `✅ 已选择：${
                                        DOC_TYPE_OPTIONS.find(
                                            x => x.value === docType
                                        )?.label
                                    }。\n现在可以开始提问了！`,
                                    timestamp: new Date()
                                })
                            }
                        "
                    >
                        确认
                    </button>
                </div>
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

const PG_SYSTEM_PROMPT = `
你是「保研/推免申请」方向的文书与材料优化助手，而不是就业求职简历顾问。
请始终以“保研/夏令营/预推免/九推/导师套磁/科研经历展示/学术能力证明”为核心目标来分析与建议。

【必须遵守】
1) 不要把重点放在“找工作/企业招聘/大厂实习/HR筛选/面试技巧/岗位匹配”等就业语境上，除非用户明确要求。
2) 输出内容优先服务：保研简历（学术版）、个人陈述/自述、套磁信、科研/竞赛经历表述、推荐信素材、PPT汇报（学术汇报/面试）等。
3) 若用户问题模糊，请你先默认按“保研材料优化”来回答，并在开头用一句话说明你的保研视角。
4) 建议尽量“可落地”：给可直接替换的表述模板、要点列表、可量化指标（论文/项目/比赛/排名/奖学金/科研产出等）。
5) 语言风格：学术申请场景，强调动机、方法、贡献、结果、复现、影响力；避免HR话术。

【输出结构建议】
- 结论/定位（1-2句）
- 亮点（保研向）
- 风险点/短板（保研向）
- 可直接改写的示例（给出1-3段可复制文案）
- 下一步补充材料清单（如需要）
`.trim()

// ✅ 用户选择的材料类型：resume / ppt / email / script / mock
const docType = ref('resume')

// ✅ 材料类型选项（用于UI展示）
const DOC_TYPE_OPTIONS = [
    { value: 'resume', label: '简历（学术版）' },
    { value: 'ppt', label: '面试PPT' },
    { value: 'email', label: '联系导师邮件（套磁）' },
    { value: 'script', label: '面试文字稿（自我介绍/回答）' },
    { value: 'mock', label: '模拟提问（面试官Q&A）' }
]

// ✅ 五类专项提示词：短、狠、可控（建议别太长，避免占token）
const TYPE_PROMPTS = {
    resume: `
你正在优化的是【保研学术简历】（非就业简历）。
关注：科研/项目/论文/竞赛/排名/课程/技能/奖项的学术含金量与可验证性。
必须输出：
1) 一句话定位（研究方向+优势证据）
2) 亮点条目（用“动作+方法+结果+量化”写法，每条≤2行）
3) 风险点（保研视角：科研深度、方向匹配、产出可信度）
4) 给出可直接替换的简历条目改写（至少3条）
避免：HR话术、岗位匹配、企业实习优先级（除非用户要求）。
`.trim(),

    ppt: `
你正在优化的是【保研面试PPT】（学术汇报/面试展示）。
关注：结构清晰、研究动机、方法路线、实验结果、贡献、未来计划、与导师方向匹配。
必须输出：
1) 推荐PPT目录（8-12页的页标题）
2) 每页要点（每页3-5个bullet，讲什么、怎么讲）
3) 2-3个“最容易被追问”的点 + 防守话术
4) 可直接用的“开场/收尾”讲稿各1段
避免：商务汇报风、求职汇报套路。
`.trim(),

    email: `
你正在优化的是【联系导师套磁邮件】（不是求职邮件）。
关注：礼貌简洁、背景匹配、研究兴趣、你能提供的价值、可验证材料、明确诉求。
必须输出：
1) 邮件主题（给2-3个备选）
2) 邮件正文（中文/英文按用户语言；默认中文，可附英文版本）
3) 结构：问候-自我介绍-研究匹配-你做过什么-想要什么-附件/链接-致谢
4) 给出“可替换变量位”（导师课题/你项目/论文/链接）
避免：夸张吹捧、长篇流水账、把导师当HR。
`.trim(),

    script: `
你正在优化的是【面试文字稿】（自我介绍/项目讲解/常见问题回答）。
关注：1分钟/3分钟两版，自洽、可追问、可落地。
必须输出：
1) 1分钟自我介绍稿 + 3分钟自我介绍稿
2) 项目讲解模板：背景-目标-方法-你的贡献-结果-不足与改进（每段给示例句）
3) 3个高频追问点 + 参考回答（简洁有证据）
避免：空泛形容词、没有证据的“我很热爱科研”。
`.trim(),

    mock: `
你现在扮演【面试官】，为保研/夏令营进行模拟提问与追问。
规则：
1) 先基于PDF内容给出：10个问题（由浅入深，覆盖动机/方向/项目/科研方法/基础知识/未来计划）
2) 每个问题给“考察点”
3) 再随机挑3题进行二次追问（更尖锐、更细节）
4) 最后给“回答建议框架”（STAR/科研五段式等）
避免：企业面试题、八股求职题（除非用户要求）。
`.trim()
}

const showTypeModal = ref(false)
const typeConfirmed = ref(false)

const buildQuestion = userMsg => {
    const typePrompt = TYPE_PROMPTS[docType.value] || ''
    const typeLabel =
        DOC_TYPE_OPTIONS.find(x => x.value === docType.value)?.label ||
        docType.value

    return `${PG_SYSTEM_PROMPT}

【材料类型】
${typeLabel}

【该类型专项要求】
${typePrompt}

【用户问题】
${userMsg}

【注意】
请结合已上传PDF内容作答；默认按保研/推免申请场景输出；给出可直接复制的修改示例。`
}

import md from '@/utils/markdown'
import DOMPurify from 'dompurify'

const renderMarkdown = text => {
    const html = md.render(text || '')
    return DOMPurify.sanitize(html)
}

// 计算属性
const canSend = computed(() => {
    return (
        !isLoading.value &&
        inputMessage.value.trim() &&
        sessionId.value &&
        typeConfirmed.value // ✅ 必须先选类型
    )
})

// 初始化欢迎消息
onMounted(() => {
    messages.value.push({
        role: 'assistant',
        content:
            '你好！我是「保研文书AI助手」📄\n\n我可以帮你阅读和打磨简历/套磁信/PPT内容：\n\n• 上传PDF文件（支持拖拽上传）\n\n• 询问文档中的任何内容\n\n• 多轮对话，记住上下文\n\n• 智能提取关键信息\n\n请上传一份PDF文件开始吧！支持最多10页的文档分析。',
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
        // ✅ 上传后要求先选择材料类型
        showTypeModal.value = true
        typeConfirmed.value = false

        messages.value.push({
            role: 'assistant',
            content:
                '📌 请先选择这份PDF属于哪种材料：\n\n (1) 简历  (2) 面试PPT  (3) 套磁邮件  (4) 面试文字稿  (5) 模拟提问 \n\n选择后我会按对应场景给你更精准的建议。',
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
        const body = await chatPdfAPI({
            session_id: sessionId.value,
            question: buildQuestion(userMsg)
        })
        // 这里 body 就是 { code:200, data:{answer:...}, msg:... }
        messages.value.push({
            role: 'assistant',
            content: body.data.answer,
            timestamp: new Date()
        })
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
    padding: 14px 18px;
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

/* 专门给 AI 输出用 */
.assistant-markdown {
    padding: 6px 4px; /* 👈 关键 */
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

/* GitHub 风格 */
.markdown-body {
    font-size: 14px;
    line-height: 1.7;
}

.markdown-body h3 {
    margin-top: 1em;
    font-weight: 600;
}

.markdown-body ul {
    padding-left: 1.2em;
}

.markdown-body strong {
    font-weight: 600;
}

.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.modal-card {
    width: min(520px, 92vw);
    background: #fff;
    border-radius: 16px;
    padding: 18px 18px 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-title {
    font-size: 16px;
    font-weight: 700;
    color: #111;
}

.modal-sub {
    margin-top: 6px;
    font-size: 13px;
    color: #666;
    line-height: 1.5;
}

.type-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.type-btn {
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: 0.15s;
}

.type-btn:hover {
    transform: translateY(-1px);
}

.type-btn.active {
    border-color: #667eea;
    background: #eef2ff;
}

.modal-actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
}

.confirm-btn {
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
