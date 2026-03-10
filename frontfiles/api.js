// 安全 storage（与 app.js 一致）：浏览器防跟踪可能拦截 localStorage，用内存兜底
var _storage = (function () {
    try {
        _storage.setItem('_', '_');
        _storage.removeItem('_');
        return localStorage;
    } catch (e) {
        var o = {};
        return {
            getItem: function (k) { return o[k] != null ? o[k] : null; },
            setItem: function (k, v) { o[k] = String(v); },
            removeItem: function (k) { delete o[k]; }
        };
    }
})();

// API配置
const API_CONFIG = {
    // Windows 上 localhost 有时会解析到 IPv6 ::1，导致“服务明明启动了但连不上”
    // 这里默认使用 127.0.0.1 更稳。
    baseURL: 'http://127.0.0.1:5000/api/v1',            // Java 后端（登录、档案更新等）
    assessmentBaseURL: 'http://127.0.0.1:5002/api/v1', // Python AI 服务（默认 5002）
    jobProfilesBaseURL: 'http://127.0.0.1:5002/api/v1', // 岗位画像 → Flask AI
    // 默认超时：60s（Windows 本地首次构建索引/加载数据时，30s 容易误触发 AbortError）
    timeout: 60000,
    mockMode: false  // true=模拟数据；false=连接真实后端（Java:5000 / AI:5002）
};

// 5002 未启动时统一提示（岗位匹配、主动探索、岗位列表等）
const AI_SERVICE_START_HINT = 'AI 服务 (5002) 未连接，请先启动：在项目根目录运行 start_ai_service.ps1 或 cd AI算法 && python app.py。';

// 规范化 baseURL：若缺少 host（如 http://:5002）或非 http(s) 则补全为 localhost，避免 404
function normalizeBaseURL(url, defaultOrigin) {
    const def = defaultOrigin || 'http://127.0.0.1:5002/api/v1';
    if (!url || typeof url !== 'string') return def;
    var s = url.trim();
    if (!s.startsWith('http://') && !s.startsWith('https://')) return def;
    try {
        const u = new URL(s);
        if (!u.hostname || u.hostname === '') {
            u.hostname = '127.0.0.1';
            return u.origin + (u.pathname || '/api/v1');
        }
        return s;
    } catch (_) {
        return def;
    }
}

// ==================== 大模型解析（Agent核心：自然语言 → JSON，走本地AI服务） ====================
// 与后端其它模块保持一致：由 Flask + ChatTongyi(qwen-max) 调通义千问，
// 前端只请求本地接口 /api/v1/job/agent/parse-requirement，不直接暴露外部 API Key。
async function agentParseJobProfileRequirement(userText) {
    if (!userText || !String(userText).trim()) {
        return { success: false, msg: '请输入岗位画像生成需求' };
    }
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL, 'http://127.0.0.1:5002/api/v1');
    const url = `${base}/job/agent/parse-requirement`.replace(/\/api\/v1\/?$/, '/api/v1/job/agent/parse-requirement');
    // LLM 解析可能较慢，单独拉长超时（默认 60s）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: String(userText).trim() }),
            signal: controller.signal
        });
        const data = await resp.json().catch(() => ({}));
        if (data.code === 200 && data.data) {
            return { success: true, data: data.data };
        }
        const msg = data.msg || '智能解析失败，请手动填写表单';
        return { success: false, msg };
    } catch (e) {
        console.error('[Agent] 智能解析接口异常:', e);
        return {
            success: false,
            msg: (e && e.name === 'AbortError')
                ? '智能解析超时（60s），请确认 AI 服务 (http://127.0.0.1:5002) 已启动且网络正常'
                : '智能解析失败，请确认 AI 服务 (http://127.0.0.1:5002) 已启动',
            error: e
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

// API工具类
class API {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.aiBaseURL = API_CONFIG.assessmentBaseURL || this.baseURL;
        // 从localStorage加载mock职业规划报告
        const storedReports = localStorage.getItem('mockCareerReports');
        if (storedReports) {
            try {
                this.mockCareerReports = JSON.parse(storedReports);
            } catch (e) {
                console.error('Failed to parse stored reports:', e);
                this.mockCareerReports = this.getDefaultMockCareerReports();
            }
        } else {
            this.mockCareerReports = this.getDefaultMockCareerReports();
        }
        const storedInterviews = localStorage.getItem('mockInterviews');
        if (storedInterviews) {
            try {
                this.mockInterviews = JSON.parse(storedInterviews);
            } catch (e) {
                console.error('Failed to parse stored interviews:', e);
                this.mockInterviews = this.getDefaultMockInterviews();
            }
        } else {
            this.mockInterviews = this.getDefaultMockInterviews();
        }
    }
    
    // 获取默认的mock职业规划报告
    getDefaultMockCareerReports() {
        return [
            { report_id: 'report_career_001', created_at: new Date().toISOString(), status: 'completed', primary_career: '算法工程师', completeness: 95, last_viewed: new Date().toISOString() },
            { report_id: 'report_career_002', created_at: new Date(Date.now()-86400000).toISOString(), status: 'archived', primary_career: '后端开发工程师', completeness: 88 }
        ];
    }
    
    // 保存mock职业规划报告到localStorage
    saveMockCareerReports() {
        localStorage.setItem('mockCareerReports', JSON.stringify(this.mockCareerReports));
    }
    
    // 获取默认的mock面试记录
    getDefaultMockInterviews() {
        return [
            {
                interview_id: 'int_001',
                user_id: 'test_user',
                target_position: '前端开发工程师',
                interview_type: 'behavioral',
                difficulty: 'medium',
                duration: 30,
                created_at: new Date(Date.now()-86400000*3).toISOString(),
                status: 'completed',
                total_score: 85,
                messages: [
                    { role: 'interviewer', content: '你好！欢迎参加本次模拟面试。请先简单介绍一下自己。', timestamp: Date.now()-86400000*3 },
                    { role: 'user', content: '您好！我是一名有3年经验的前端开发工程师，熟悉React、Vue等前端框架。', timestamp: Date.now()-86400000*3+10000 }
                ]
            }
        ];
    }
    
    // 保存mock面试记录到localStorage
    saveMockInterviews() {
        localStorage.setItem('mockInterviews', JSON.stringify(this.mockInterviews));
    }

    // 请求 AI 服务（测评、岗位画像），与 request 相同协议 { code, msg, data }，带超时避免一直加载
    async requestToAI(endpoint, options = {}) {
        const url = `${this.aiBaseURL}${endpoint}`;
        const token = _storage.getItem('token');
        if (API_CONFIG.mockMode) {
            return this.mockRequest(endpoint, options);
        }
        // 为避免网络/防火墙导致 fetch 长时间挂起，这里为所有请求加超时控制
        // 并对容易慢的接口做默认加长（仅在调用方未显式传 timeout 时生效）
        let timeoutMs = options.timeout != null ? options.timeout : (API_CONFIG.timeout || 60000);
        if (options.timeout == null) {
            // 推荐岗位默认 90s（首屏匹配计算需时；调用方显式传 timeout 时以调用方为准）
            if (endpoint.startsWith('/matching/recommend-jobs')) timeoutMs = 90000;
            if (endpoint.startsWith('/assessment/report')) timeoutMs = 120000;
            if (endpoint.startsWith('/career/generate-report')) timeoutMs = 180000;
            if (endpoint.startsWith('/career/report')) timeoutMs = 120000;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const config = {
            method: options.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            signal: controller.signal,
            ...options
        };
        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }
        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            const result = await response.json();
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            }
            return { success: false, msg: result.msg, code: result.code };
        } catch (error) {
            clearTimeout(timeoutId);
            // 有自动回退的接口（如 recommend-jobs）仅打一行提示，避免控制台报错刷屏
            const hasFallback = endpoint.startsWith('/matching/recommend-jobs');
            if (hasFallback) {
                console.warn('[AI]', endpoint, '暂未连通，正在尝试 Java 后端 (5000)');
            } else {
                console.error('API请求错误(AI):', { endpoint, url, timeoutMs, error });
            }
            const msg = error.name === 'AbortError'
                ? '请求超时，请确认 AI 服务 (http://127.0.0.1:5002) 已启动且网络正常'
                : (error.message && error.message.toLowerCase().includes('fetch'))
                    ? '无法连接 AI 服务 (http://127.0.0.1:5002)，请确认已启动'
                    : (error.message || '网络错误');
            return { success: false, msg };
        }
    }

    postToAI(endpoint, data) {
        return this.requestToAI(endpoint, { method: 'POST', body: data });
    }

    // 通用请求方法（测评、职业规划报告、人岗匹配、求职跟踪走 AI 服务 5002，其余走 Java 5000）
    async request(endpoint, options = {}) {
        const useAI = endpoint.startsWith('/assessment/')
            || endpoint.startsWith('/career/')
            || endpoint.startsWith('/matching/')
            || endpoint.startsWith('/job/')
            || endpoint.startsWith('/system/')
            || endpoint.startsWith('/tracking/')
            || endpoint.startsWith('/resume/')
            || endpoint.startsWith('/security/');
        const raw = useAI ? (API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || this.baseURL) : this.baseURL;
        const base = normalizeBaseURL(raw, useAI ? 'http://127.0.0.1:5002/api/v1' : 'http://127.0.0.1:5000/api/v1');
        const url = `${base}${endpoint}`;
        const token = _storage.getItem('token');
        
        // 模拟模式
        if (API_CONFIG.mockMode) {
            return this.mockRequest(endpoint, options);
        }
        
        const config = {
            method: options.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        // 如果有body且不是FormData，转换为JSON
        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }

        // 为避免网络/防火墙导致 fetch 长时间挂起，这里为所有请求加超时控制
        let timeoutMs = options.timeout != null ? options.timeout : (API_CONFIG.timeout || 30000);
        if (options.timeout == null && endpoint.startsWith('/career/report')) timeoutMs = 90000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...config, signal: controller.signal });
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (_) {
                // 服务返回了 HTML 或非 JSON（如 501 错误页），给出明确提示
                const isAssessment = endpoint.startsWith('/assessment/');
                const hint = response.status === 501
                    ? '当前地址不支持 POST，请确认已启动 AI 服务 (http://127.0.0.1:5002)'
                    : (isAssessment ? '请确认已启动 AI 服务 (http://127.0.0.1:5002)' : '请确认后端服务已运行');
                return { success: false, msg: `服务返回异常 (${response.status}): ${hint}` };
            }
            // 根据code判断是否成功
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            } else if (result.code === 401) {
                // Token失效，跳转到登录页
                _storage.removeItem('token');
                window.location.reload();
                throw new Error('请重新登录');
            } else {
                return { success: false, msg: result.msg, code: result.code };
            }
        } catch (error) {
            console.error('API请求错误:', { endpoint, url, timeoutMs, error });
            const serviceHint = useAI
                ? 'AI 服务 (http://127.0.0.1:5002)'
                : 'Java 后端 (http://127.0.0.1:5000/api/v1)';
            const msg = (error && error.name === 'AbortError')
                ? `请求超时（${timeoutMs / 1000}s）：请确认 ${serviceHint} 已启动且网络未被拦截`
                : (error.message && error.message.toLowerCase().includes('fetch'))
                    ? `无法连接后端，请确认已启动 ${serviceHint}`
                    : (error.message || '网络错误，请稍后重试');
            return { success: false, msg };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // POST 请求（根据 endpoint 自动选择 5000/5002）
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    // 明确请求 Java 后端 5000（用于 5002 返回 404 时的回退）
    async postToJava(endpoint, data) {
        const base = normalizeBaseURL(this.baseURL, 'http://127.0.0.1:5000/api/v1');
        const url = `${base}${endpoint}`;
        const token = _storage.getItem('token');
        if (API_CONFIG.mockMode) return this.mockRequest(endpoint, { method: 'POST', body: data });
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
                body: JSON.stringify(data || {})
            });
            const text = await response.text();
            let result;
            try { result = JSON.parse(text); } catch (_) { return { success: false, msg: `服务返回异常 (${response.status})`, code: response.status }; }
            if (result.code === 200) return { success: true, data: result.data, msg: result.msg };
            return { success: false, msg: result.msg, code: result.code };
        } catch (e) {
            return { success: false, msg: e.message || '网络错误' };
        }
    }

    // GET请求（query 参数对象）
    async get(endpoint, params = {}) {
        if (!Object.keys(params).length) return this.request(endpoint, { method: 'GET' });
        const qs = new URLSearchParams(params).toString();
        const sep = endpoint.indexOf('?') !== -1 ? '&' : '?';
        return this.request(endpoint + sep + qs, { method: 'GET' });
    }

    // 文件上传请求（走 Java 后端）
    async upload(endpoint, formData) {
        const token = _storage.getItem('token');
        const url = `${this.baseURL}${endpoint}`;
        
        // 模拟模式
        if (API_CONFIG.mockMode) {
            return this.mockRequest(endpoint, { formData });
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            } else {
                return { success: false, msg: result.msg, code: result.code };
            }
        } catch (error) {
            console.error('文件上传错误:', error);
            const msg = (error.message && error.message.toLowerCase().includes('fetch'))
                ? '无法连接后端，请确认已启动 Java 后端 (http://localhost:5000/api/v1)，并在项目 backend 目录运行'
                : (error.message || '上传失败');
            return { success: false, msg };
        }
    }

    // 向 AI 服务（Python）上传文件，用于简历 AI 解析等
    async uploadToAI(endpoint, formData) {
        const token = _storage.getItem('token');
        const url = `${this.aiBaseURL}${endpoint}`;
        if (API_CONFIG.mockMode) {
            return this.mockRequest(endpoint, { formData });
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });
            const result = await response.json();
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            }
            return { success: false, msg: result.msg, code: result.code };
        } catch (error) {
            console.error('AI 服务上传错误:', error);
            const msg = (error.message && error.message.toLowerCase().includes('fetch'))
                ? '无法连接 AI 服务 (http://localhost:5002)，请确认已启动 Python AI 算法服务'
                : (error.message || '上传失败');
            return { success: false, msg };
        }
    }

    // 将 File 转为 data URL（mock 下存头像用）
    _fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(new Error('头像读取失败'));
            r.readAsDataURL(file);
        });
    }

    // 模拟请求方法
    async mockRequest(endpoint, options) {
        console.log('Mock请求:', endpoint, options);
        await new Promise(resolve => setTimeout(resolve, 150));
        let data = options.body || {};
        if (options.formData && options.formData instanceof FormData) {
            const obj = {};
            options.formData.forEach((v, k) => { obj[k] = v; });
            data = obj;
        }
        // 注册时若有头像文件，转为 data URL 以便 mock 存储并在导航栏显示
        if (endpoint === '/auth/register' && data.avatar instanceof File) {
            try {
                data.avatar = await this._fileToDataUrl(data.avatar);
            } catch (_) {
                data.avatar = '';
            }
        }
        switch(endpoint) {
            case '/auth/login':
                return this.mockLogin(data);
            case '/auth/register':
                return this.mockRegister(data);
            case '/auth/logout':
                return { success: true, msg: '退出成功' };
            case '/auth/forgot-password/send-code':
                return { success: true, data: { email: options.body?.email || '', expire_minutes: 10 }, msg: '验证码已发送' };
            case '/auth/forgot-password/reset':
                return { success: true, msg: '密码重置成功' };
            case '/profile/info': {
                const userId = options.body?.user_id;
                const saved = userId ? this._getProfileSaved(userId) : false;
                const profileData = saved ? this.mockProfileData() : this.mockEmptyProfile(userId);
                return { success: true, data: profileData };
            }
            case '/profile/update': {
                const userId = options.body?.user_id;
                if (userId) this._setProfileSaved(userId);
                return { success: true, data: { profile_completeness: 90 }, msg: '档案更新成功' };
            }
            case '/profile/upload-resume':
                return { success: true, data: { task_id: 'task_' + Date.now() }, msg: '简历上传成功' };
            case '/profile/resume-parse-result': {
                // Mock 返回示例解析结果，便于前端能正确填充表单（真实环境由 Python 服务返回）
                const mockParsedData = {
                    basic_info: {
                        name: '张三',
                        gender: '男',
                        birth_date: '2000-06-15',
                        phone: '13800138000',
                        email: 'zhangsan@example.com',
                        summary: '计算机专业，有实习与项目经历。'
                    },
                    education: [
                        { school: '某某大学', major: '计算机科学与技术', degree: '本科', grade: '2022级', expected_graduation: '2026-06', gpa: '3.6/4.0' }
                    ],
                    skills: [
                        { category: '编程语言', items: ['Python', 'Java', 'JavaScript'] },
                        { category: '框架与工具', items: ['React', 'Spring Boot', 'MySQL'] }
                    ],
                    internships: [],
                    projects: []
                };
                return { success: true, data: { status: 'completed', parsed_data: mockParsedData } };
            }
            case '/assessment/questionnaire':
                return { success: true, data: this.mockQuestions() };
            case '/assessment/submit':
                return { success: true, data: { report_id: 'report_' + Date.now(), status: 'processing' }, msg: '测评提交成功，正在生成报告...' };
            case '/assessment/report':
                const reportData = this.mockAssessmentReport();
                reportData.status = 'completed';  // 轮询时前端据此判断报告已生成
                return { success: true, data: reportData };
            case '/job/profiles':
            case '/job/list': {
                let allJobs = this.mockJobs();
                const keyword = (data.keyword || (options.body && options.body.keyword) || '').trim();
                allJobs = this._filterJobsByKeyword(allJobs, keyword);
                allJobs = this._filterJobsByFilters(allJobs, {
                    city: data.city,
                    industry: data.industry,
                    salary: data.salary,
                    company_nature: data.company_nature
                });
                const page = data.page || (options.body && options.body.page) || 1;
                const size = data.size || (options.body && options.body.size) || 20;
                const start = (page - 1) * size;
                const paged = allJobs.slice(start, start + size);
                return { success: true, data: { total: allJobs.length, page, size, list: paged } };
            }
            case '/job/industries':
                return { success: true, data: { industries: ['互联网', '互联网/AI', '金融', '制造业', '教育', '医疗', '新能源', '咨询'] } };
            case '/job/profile/detail':
            case '/job/detail':
                return { success: true, data: this.mockJobDetail(options.body?.job_id || options.body?.job_name) };
            case '/job/relation-graph':
                const graphData = this._jobRelationGraphData();
                const jobs = this.mockJobs();
                const inputId = (options.body?.job_id || options.body?.job_name || 'job_001').toString().trim();
                const centerJob = jobs.find(j => j.job_id === inputId || j.job_name === inputId) || jobs[0];
                const cjId = centerJob.job_id;
                const vert = graphData.vertical[cjId] || graphData.vertical['job_001'];
                const trans = graphData.transfer[cjId] || graphData.transfer['job_001'] || [];
                return {
                    success: true,
                    data: {
                        center_job: { job_id: centerJob.job_id, job_name: centerJob.job_name },
                        vertical_graph: {
                            nodes: vert || [{ job_id: 'j1', job_name: '初级', level: 1 }, { job_id: cjId, job_name: centerJob.job_name, level: 2 }, { job_id: 'j3', job_name: '高级/专家', level: 3 }],
                            edges: []
                        },
                        transfer_graph: {
                            nodes: trans.slice(0, 5).map(t => ({ job_id: t.to, job_name: (t.path || '').split('→')[1] || t.to })),
                            edges: trans,
                            paths: trans
                        },
                        self_check: graphData.selfCheck,
                        action_guide: graphData.actionGuide
                    }
                };
            case '/job/ai-generate-profile':
                return { success: true, data: { task_id: 'task_' + Date.now(), status: 'processing', estimated_time: 30 } };
            case '/job/ai-generate-result':
                return { success: true, data: { status: 'completed', job_profile: this.mockJobDetail(options.body?.job_name), ai_confidence: 0.88, data_sources: { total_samples: 50, valid_samples: 47 } } };
            case '/job/search': {
                let allJobs = this.mockJobs();
                const keyword = (data.keyword || '').trim();
                allJobs = this._filterJobsByKeyword(allJobs, keyword);
                allJobs = this._filterJobsByFilters(allJobs, {
                    city: data.city,
                    industry: data.industry,
                    salary: data.salary,
                    company_nature: data.company_nature
                });
                return { success: true, data: { total: allJobs.length, list: allJobs } };
            }
            case '/student/ability-profile':
                return { success: true, data: this.mockAbilityProfile() };
            case '/student/ai-generate-profile':
                return { success: true, data: { task_id: 'stu_gen_' + Date.now(), status: 'processing' }, msg: 'AI画像生成中...' };
            case '/student/update-profile':
                return { success: true, data: { updated_at: new Date().toISOString(), new_total_score: 78, score_change: 2 }, msg: '画像更新成功' };
            case '/matching/recommend-jobs':
                const recJobList = this.mockJobs().slice(0, 6);
                const recommendations = recJobList.map((j, i) => this.mockRecommendation(j, 85 - i * 3 + Math.floor(Math.random() * 5)));
                return { success: true, data: { total_matched: 45, recommendations } };
            case '/matching/analyze':
                const jobId = options.body?.job_id || options.body?.job_name;
                return { success: true, data: this.mockMatchAnalysis(jobId) };
            case '/career/generate-report': {
                const reportId = 'report_career_' + Date.now();
                // 创建新的mock报告
                const newReport = {
                    report_id: reportId,
                    created_at: new Date().toISOString(),
                    status: 'completed',
                    primary_career: '职业规划报告',
                    completeness: 90,
                    last_viewed: new Date().toISOString()
                };
                // 添加到mock报告数组
                this.mockCareerReports.unshift(newReport);
                // 保存到localStorage
                this.saveMockCareerReports();
                return { success: true, data: { report_id: reportId, status: 'processing' }, msg: '报告生成中，预计需要30秒...' };
            }
            case '/career/report':
            case '/career/view-report':
                return { success: true, data: this.mockCareerReportFull() };
            case '/career/report-history':
                return { success: true, data: { total: this.mockCareerReports.length, list: this.mockCareerReports } };
            case '/career/edit-report':
                return { success: true, data: { updated_at: new Date().toISOString() }, msg: '报告编辑成功' };
            case '/career/ai-polish-report':
                return { success: true, data: { task_id: 'polish_' + Date.now(), status: 'processing' }, msg: 'AI优化中...' };
            case '/career/export-report':
                return { success: true, data: { download_url: '/downloads/career_report.pdf', file_size: '2.5MB', expires_at: new Date(Date.now()+7*86400000).toISOString() }, msg: '报告导出成功' };
            case '/career/check-completeness':
                return { success: true, data: this.mockCareerCompleteness() };
            default:
                if (typeof endpoint === 'string' && endpoint.startsWith('/tracking/')) {
                    if (endpoint.startsWith('/tracking/record/') && endpoint.includes('/update')) {
                        const recordId = (endpoint.match(/\/record\/([^/]+)\/update/) || [])[1];
                        try {
                            const raw = _storage.getItem('mock_tracking_records');
                            const arr = raw ? JSON.parse(raw) : [];
                            const idx = arr.findIndex(r => r.record_id === recordId);
                            if (idx >= 0 && (data.stage || data.result != null)) {
                                if (data.stage) arr[idx].current_stage = data.stage;
                                if (data.result != null) arr[idx].result = data.result;
                                arr[idx].last_updated = (data.stage_date || new Date().toISOString().slice(0, 10));
                                if (data.notes != null) arr[idx].notes = data.notes;
                                _storage.setItem('mock_tracking_records', JSON.stringify(arr));
                            }
                        } catch (_) {}
                        return { success: true, data: { record_id: recordId, current_stage: data.stage, result: data.result, agent_tip: '进展已更新' }, msg: '进展已更新' };
                    }
                    if (endpoint.startsWith('/tracking/record/create')) {
                        const rid = 'track_' + Date.now();
                        const today = new Date().toISOString().slice(0, 10);
                        const newRecord = { record_id: rid, job_title: data.job_title || '', company_name: data.company_name || '', current_stage: 'applied', last_updated: today, result: 'pending', apply_date: data.apply_date || today };
                        try {
                            const raw = _storage.getItem('mock_tracking_records');
                            const arr = raw ? JSON.parse(raw) : [];
                            arr.unshift(newRecord);
                            _storage.setItem('mock_tracking_records', JSON.stringify(arr));
                        } catch (_) {}
                        return { success: true, data: { record_id: rid, status: 'applied', created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }, msg: '跟踪记录已创建' };
                    }
                    if (endpoint.startsWith('/tracking/overview')) {
                        try {
                            const raw = _storage.getItem('mock_tracking_records');
                            const records = raw ? JSON.parse(raw) : [];
                            const total = records.length;
                            const rejected = records.filter(r => r.result === 'rejected' || r.result === 'failed').length;
                            const offer = records.filter(r => r.result === 'offer' || r.current_stage === 'offer').length;
                            const inProgress = records.filter(r => r.result !== 'offer' && r.current_stage !== 'offer' && r.result !== 'rejected' && r.result !== 'failed').length;
                            const written = records.filter(r => ['written_test','interview_1','interview_2','final','offer'].indexOf(r.current_stage) >= 0 || r.current_stage === 'written_test').length;
                            const wtRate = total > 0 && written > 0 ? Math.min(1, written / total) : 0;
                            const ivRate = written > 0 ? (offer + rejected) / written : 0;
                            return { success: true, data: {
                                summary: { total_applied: total, written_test_pass_rate: wtRate, interview_pass_rate: ivRate, offer_count: offer, rejected_count: rejected, in_progress_count: inProgress },
                                records: records.slice(0, 50).map(r => ({ record_id: r.record_id, job_title: r.job_title, company_name: r.company_name, current_stage: r.current_stage, last_updated: r.last_updated, has_failure_report: !!r.has_failure_report, result: r.result })),
                                agent_insight: total > 0 ? '根据你的求职数据，建议持续投递并做好面试复盘。' : null
                            } };
                        } catch (_) {
                            return { success: true, data: { summary: { total_applied: 0, written_test_pass_rate: 0, interview_pass_rate: 0, offer_count: 0, rejected_count: 0, in_progress_count: 0 }, records: [], agent_insight: null } };
                        }
                    }
                    if (endpoint.startsWith('/tracking/failure-reports')) {
                        try {
                            const raw = _storage.getItem('mock_tracking_reports');
                            const list = raw ? JSON.parse(raw) : [];
                            const page = parseInt((endpoint.match(/[?&]page=(\d+)/) || [])[1], 10) || 1;
                            const size = parseInt((endpoint.match(/[?&]size=(\d+)/) || [])[1], 10) || 10;
                            const start = (page - 1) * size;
                            return { success: true, data: { total: list.length, list: list.slice(start, start + size) } };
                        } catch (_) {
                            return { success: true, data: { total: 0, list: [] } };
                        }
                    }
                }
                if (typeof endpoint === 'string' && endpoint.startsWith('/assessment/report-history')) {
                    const q = endpoint.indexOf('?');
                    let userId = null;
                    if (q >= 0) {
                        const params = new URLSearchParams(endpoint.slice(q));
                        const u = params.get('user_id');
                        if (u != null) userId = parseInt(u, 10);
                    }
                    let list = [];
                    if (userId) {
                        try {
                            const raw = _storage.getItem('report_history_' + userId);
                            if (raw) list = JSON.parse(raw);
                            if (!Array.isArray(list)) list = [];
                        } catch (_) {}
                    }
                    return { success: true, data: list };
                }
                if (typeof endpoint === 'string' && endpoint.startsWith('/job/career-path')) {
                    const q = endpoint.indexOf('jobId='); const cpJobId = (q >= 0 ? (endpoint.slice(q + 6).split('&')[0] || '') : '') || 'job_001';
                    const cpJobs = this.mockJobs();
                    const cpJ = cpJobs.find(j => j.job_id === cpJobId || j.job_name === cpJobId) || cpJobs[0];
                    return { success: true, data: { path: [
                        { stage: '当前目标', jobName: cpJ.job_name || cpJ.name, years: '-', salary: '-', level: 'L2' },
                        { stage: '第一阶段', jobName: '中级工程师', years: '2-3年', salary: '-', level: 'L3' },
                        { stage: '第二阶段', jobName: '高级工程师', years: '3-5年', salary: '-', level: 'L4' },
                        { stage: '长期目标', jobName: '架构师/专家', years: '5年以上', salary: '-', level: 'L5' }
                    ], altPaths: [{ jobName: '数据科学家' }, { jobName: 'AI产品经理' }, { jobName: '项目经理' }] } };
                }
                if (typeof endpoint === 'string' && endpoint.startsWith('/job/profiles')) {
                    const list = this.mockJobs();
                    return { success: true, data: { total: list.length, page: 1, size: 12, list } };
                }
                return { success: false, msg: '未知的API端点' };
        }
    }

    // 获取已注册用户列表（localStorage 持久化，仅 mock 模式使用）
    _getRegisteredUsers() {
        const key = 'mock_registered_users';
        try {
            const raw = _storage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        // 首次使用：预置几个演示账号，写入 localStorage
        const preset = [
            { username: 'admin', password: '123456', nickname: '管理员', user_id: 10001 },
            { username: 'test', password: '123456', nickname: '测试用户', user_id: 10002 },
            { username: 'demo', password: '123456', nickname: '演示用户', user_id: 10003 },
            { username: 'student', password: '123456', nickname: '学生用户', user_id: 10004 }
        ];
        _storage.setItem(key, JSON.stringify(preset));
        return preset;
    }

    _saveRegisteredUsers(users) {
        try {
            _storage.setItem('mock_registered_users', JSON.stringify(users));
        } catch (_) {}
    }

    // 头像单独存储，避免大 data URL 撑爆用户列表导致保存失败
    _getMockAvatars() {
        try {
            const raw = _storage.getItem('mock_avatars');
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    }
    _saveMockAvatar(userId, dataUrl) {
        try {
            const avatars = this._getMockAvatars();
            avatars[String(userId)] = dataUrl;
            _storage.setItem('mock_avatars', JSON.stringify(avatars));
        } catch (_) {}
    }
    _getMockAvatar(userId) {
        const avatars = this._getMockAvatars();
        return avatars[String(userId)] || '';
    }

    mockLogin(data) {
        const uRaw = String(data.username || '').trim();
        const u = uRaw.toLowerCase();
        const p = String(data.password || '').trim();
        if (!u || u.length < 2) return { success: false, msg: '请输入账号（至少2位）' };
        if (!p || p.length < 6) return { success: false, msg: '请输入密码（至少6位）' };
        const registered = this._getRegisteredUsers();
        let user = registered.find(x => x.username.toLowerCase() === u && x.password === p);
        if (!user) {
            const exists = registered.some(x => x.username.toLowerCase() === u);
            if (exists) {
                return { success: false, msg: '账号或密码错误，请检查后重试。' };
            }
            // 模拟模式：新账号自动创建虚拟用户身份，无需事先注册（与启动指南一致）
            user = {
                username: uRaw,
                password: p,
                nickname: uRaw,
                user_id: 10000 + Math.floor(Math.random() * 9000)
            };
            registered.push(user);
            this._saveRegisteredUsers(registered);
        }
        const avatar = this._getMockAvatar(user.user_id) || user.avatar || '';
        return {
            success: true,
            data: {
                user_id: user.user_id,
                username: user.username,
                nickname: user.nickname || user.username,
                avatar: avatar,
                token: 'mock_token_' + Date.now(),
                profile_completed: false,
                assessment_completed: false
            },
            msg: '登录成功'
        };
    }

    mockRegister(data) {
        const u = String(data.username || '').trim();
        const p = String(data.password || '').trim();
        const nickname = String(data.nickname || '').trim() || u;
        if (!u || u.length < 2) return { success: false, msg: '请输入账号（至少2位）' };
        if (!p || p.length < 6) return { success: false, msg: '请输入密码（至少6位）' };
        const registered = this._getRegisteredUsers();
        const exists = registered.some(x => x.username.toLowerCase() === u.toLowerCase());
        if (exists) return { success: false, msg: '用户名已存在' };
        const avatarUrl = (typeof data.avatar === 'string' && data.avatar.startsWith('data:')) ? data.avatar : '';
        const newUser = {
            username: u,
            password: p,
            nickname: nickname,
            user_id: 10000 + Math.floor(Math.random() * 9000)
        };
        registered.push(newUser);
        this._saveRegisteredUsers(registered);
        if (avatarUrl) this._saveMockAvatar(newUser.user_id, avatarUrl);
        return {
            success: true,
            data: {
                user_id: newUser.user_id,
                username: newUser.username,
                nickname: newUser.nickname,
                avatar: avatarUrl,
                created_at: new Date().toISOString()
            },
            msg: '注册成功'
        };
    }

    _getProfileSaved(userId) {
        try {
            const saved = JSON.parse(_storage.getItem('mock_profile_saved') || '{}');
            return !!saved[String(userId)];
        } catch (_) { return false; }
    }

    _setProfileSaved(userId) {
        try {
            const saved = JSON.parse(_storage.getItem('mock_profile_saved') || '{}');
            saved[String(userId)] = true;
            _storage.setItem('mock_profile_saved', JSON.stringify(saved));
        } catch (_) {}
    }

    mockEmptyProfile(userId) {
        return {
            user_id: userId,
            basic_info: {},
            education_info: {},
            skills: [],
            profile_completeness: 0
        };
    }

    mockProfileData() {
        return {
            user_id: 10001,
            basic_info: {
                nickname: '演示用户',
                avatar: '',
                gender: '男',
                birth_date: '2002-05-15',
                phone: '13800138000',
                email: '[email protected]'
            },
            education_info: {
                school: '北京大学',
                major: '计算机科学与技术',
                degree: '本科',
                grade: '2021级',
                expected_graduation: '2026-06',
                gpa: '3.8/4.0'
            },
            skills: [
                {
                    category: '编程语言',
                    items: ['Python', 'Java', 'JavaScript']
                }
            ],
            profile_completeness: 85
        };
    }

    mockQuestions() {
        return {
            assessment_id: 'assess_mock_' + Date.now(),
            total_questions: 12,
            estimated_time: 10,
            dimensions: [
                {
                    dimension_id: 'interest',
                    dimension_name: '职业兴趣',
                    questions: [
                        {
                            question_id: 'q001',
                            question_text: '你更喜欢哪种工作方式？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '独立完成任务' },
                                { option_id: 'B', option_text: '团队协作完成' },
                                { option_id: 'C', option_text: '两者都可以' }
                            ]
                        },
                        {
                            question_id: 'q002',
                            question_text: '你对技术研究的兴趣程度？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '非常感兴趣' },
                                { option_id: 'B', option_text: '比较感兴趣' },
                                { option_id: 'C', option_text: '一般' }
                            ]
                        },
                        {
                            question_id: 'q003',
                            question_text: '你更看重工作的哪个方面？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '技术挑战' },
                                { option_id: 'B', option_text: '薪资待遇' },
                                { option_id: 'C', option_text: '工作稳定' }
                            ]
                        }
                    ]
                },
                {
                    dimension_id: 'personality',
                    dimension_name: '性格特质',
                    questions: [
                        {
                            question_id: 'q004',
                            question_text: '在社交场合中，你通常？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '主动交流' },
                                { option_id: 'B', option_text: '选择性交流' },
                                { option_id: 'C', option_text: '倾向于倾听' }
                            ]
                        },
                        {
                            question_id: 'q005',
                            question_text: '面对新任务时，你通常？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '立即行动' },
                                { option_id: 'B', option_text: '制定计划' },
                                { option_id: 'C', option_text: '寻求帮助' }
                            ]
                        },
                        {
                            question_id: 'q006',
                            question_text: '你更喜欢哪种工作环境？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '安静独立' },
                                { option_id: 'B', option_text: '团队协作' },
                                { option_id: 'C', option_text: '开放灵活' }
                            ]
                        }
                    ]
                },
                {
                    dimension_id: 'ability',
                    dimension_name: '能力倾向',
                    questions: [
                        {
                            question_id: 'q007',
                            question_text: '你的逻辑分析能力如何？',
                            question_type: 'scale',
                            options: [
                                { option_id: '1', option_text: '1分' },
                                { option_id: '2', option_text: '2分' },
                                { option_id: '3', option_text: '3分' },
                                { option_id: '4', option_text: '4分' },
                                { option_id: '5', option_text: '5分' }
                            ]
                        },
                        {
                            question_id: 'q008',
                            question_text: '你的学习能力如何？',
                            question_type: 'scale',
                            options: [
                                { option_id: '1', option_text: '1分' },
                                { option_id: '2', option_text: '2分' },
                                { option_id: '3', option_text: '3分' },
                                { option_id: '4', option_text: '4分' },
                                { option_id: '5', option_text: '5分' }
                            ]
                        },
                        {
                            question_id: 'q009',
                            question_text: '你的创新能力如何？',
                            question_type: 'scale',
                            options: [
                                { option_id: '1', option_text: '1分' },
                                { option_id: '2', option_text: '2分' },
                                { option_id: '3', option_text: '3分' },
                                { option_id: '4', option_text: '4分' },
                                { option_id: '5', option_text: '5分' }
                            ]
                        }
                    ]
                },
                {
                    dimension_id: 'values',
                    dimension_name: '职业价值观',
                    questions: [
                        {
                            question_id: 'q010',
                            question_text: '你更看重工作的哪个方面？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '成就感' },
                                { option_id: 'B', option_text: '稳定性' },
                                { option_id: 'C', option_text: '薪资待遇' }
                            ]
                        },
                        {
                            question_id: 'q011',
                            question_text: '你希望从工作中获得什么？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '技能提升' },
                                { option_id: 'B', option_text: '工作平衡' },
                                { option_id: 'C', option_text: '认可尊重' }
                            ]
                        },
                        {
                            question_id: 'q012',
                            question_text: '你认为理想的工作状态是？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '持续学习成长' },
                                { option_id: 'B', option_text: '稳定贡献' },
                                { option_id: 'C', option_text: '灵活自主' }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    mockAssessmentReport() {
        // 多组预设结果，每次随机选一组，模拟不同作答得到的不同报告
        const hollandOptions = [
            { code: 'RIA', type: '研究型(I)', desc: '喜欢观察、学习、研究、分析、评估和解决问题', fields: ['软件开发', '数据分析', '算法工程师', '人工智能研发'] },
            { code: 'ASE', type: '艺术型(A)', desc: '偏好创意表达，注重美感和想象力', fields: ['UI/UX设计', '产品经理', '内容创作', '品牌策划'] },
            { code: 'SEC', type: '社会型(S)', desc: '喜欢与人交流，善于协作和帮助他人', fields: ['人力资源', '教育培训', '咨询顾问', '客户成功'] },
            { code: 'EIC', type: '企业型(E)', desc: '富有领导力，善于说服和影响他人', fields: ['销售管理', '商务拓展', '项目经理', '创业者'] },
            { code: 'CRI', type: '常规型(C)', desc: '注重条理和规范，擅长数据处理', fields: ['财务分析', '运营管理', '审计', '行政'] },
            { code: 'RCE', type: '实用型(R)', desc: '喜欢动手操作，解决具体技术问题', fields: ['硬件工程师', '运维工程师', '嵌入式开发', '测试工程师'] }
        ];
        const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
        const traits = ['外向性', '开放性', '尽责性', '宜人性', '神经质'];
        const abilities = ['逻辑分析能力', '学习能力', '沟通表达能力', '团队协作能力', '创新能力', '抗压能力', '执行力', '时间管理能力'];
        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const randScore = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const h = pick(hollandOptions);
        const mbti = pick(mbtiOptions);
        const chosenAbilities = abilities.sort(() => Math.random() - 0.5).slice(0, 5);
        const strengths = chosenAbilities.slice(0, 2).map(a => ({ ability: a, score: randScore(75, 95) }));
        const areasToImprove = chosenAbilities.slice(2, 4).map(a => ({ ability: a, score: randScore(50, 72) }));
        const personalityTraits = traits.map(t => {
            const s = randScore(35, 85);
            const level = s < 40 ? '偏低' : s < 55 ? '一般' : s < 70 ? '偏高' : '高';
            return { trait_name: t, score: s, level };
        });
        return {
            report_id: 'report_' + Date.now(),
            created_at: new Date().toISOString(),
            interest_analysis: {
                holland_code: h.code,
                primary_interest: { type: h.type, score: randScore(75, 92), description: h.desc },
                suitable_fields: h.fields
            },
            personality_analysis: {
                mbti_type: mbti,
                traits: personalityTraits
            },
            ability_analysis: {
                strengths,
                areas_to_improve: areasToImprove
            }
        };
    }

    // 根据关键词模糊匹配岗位（岗位名、技能、标签、行业等）
    _filterJobsByKeyword(jobs, keyword) {
        if (!keyword || typeof keyword !== 'string') return jobs;
        const k = String(keyword).trim().toLowerCase();
        if (!k) return jobs;
        return jobs.filter(job => {
            const fields = [
                job.job_name || '',
                job.job_id || '',
                job.industry || '',
                job.level || '',
                ...(job.skills || []),
                ...(job.tags || []),
                (job.avg_salary || '').toString()
            ].filter(Boolean);
            return fields.some(f => String(f).toLowerCase().includes(k));
        });
    }

    // 根据城市、行业、薪资、企业性质筛选岗位
    _filterJobsByFilters(jobs, filters) {
        if (!filters || typeof filters !== 'object') return jobs;
        let list = jobs;
        if (filters.city) {
            const city = String(filters.city).trim();
            list = list.filter(j => (j.location || j.work_locations?.[0] || '').includes(city));
        }
        if (filters.industry) {
            const ind = String(filters.industry).trim();
            list = list.filter(j => (j.industry || '').includes(ind));
        }
        if (filters.salary) {
            const sal = String(filters.salary).trim();
            list = list.filter(j => {
                const s = (j.avg_salary || '').toString();
                const match = s.match(/(\d+)[kK]?\s*[-–]\s*(\d+)[kK]?/);
                let minK = 0, maxK = 999;
                if (match) {
                    minK = parseInt(match[1], 10);
                    maxK = parseInt(match[2], 10);
                }
                if (sal === '10k以下') return maxK < 10;
                if (sal === '10–20k') return minK <= 20 && maxK >= 10;
                if (sal === '20k以上') return minK >= 20;
                return true;
            });
        }
        if (filters.company_nature) {
            const nat = String(filters.company_nature).trim();
            list = list.filter(j => (j.company_nature || '').includes(nat));
        }
        return list;
    }

    // 不少于10个就业岗位画像，含专业技能、证书、创新、学习、抗压、沟通、实习能力、城市、企业性质
    mockJobs() {
        return [
            { job_id: 'job_001', job_name: '算法工程师', avg_salary: '20k-35k', demand_score: 92, growth_trend: '上升', tags: ['人工智能', '机器学习'], industry: '互联网/AI', level: '中级', skills: ['Python', 'TensorFlow', 'PyTorch', '机器学习算法'], location: '北京', company_nature: '私企' },
            { job_id: 'job_002', job_name: '前端开发工程师', avg_salary: '12k-22k', demand_score: 90, growth_trend: '稳定', tags: ['React', 'Vue', 'TypeScript'], industry: '互联网', level: '中级', skills: ['JavaScript', 'Vue', 'React', 'HTML5/CSS3'], location: '上海', company_nature: '私企' },
            { job_id: 'job_003', job_name: '后端开发工程师', avg_salary: '14k-25k', demand_score: 88, growth_trend: '上升', tags: ['Java', 'Go', '微服务'], industry: '互联网', level: '中级', skills: ['Java/Go', 'MySQL', 'Redis', '分布式'], location: '深圳', company_nature: '私企' },
            { job_id: 'job_004', job_name: '数据分析师', avg_salary: '10k-18k', demand_score: 85, growth_trend: '上升', tags: ['Python', 'SQL', '数据可视化'], industry: '互联网/金融', level: '初级', skills: ['Python', 'SQL', 'Excel', 'Tableau'], location: '北京', company_nature: '外资' },
            { job_id: 'job_005', job_name: '产品经理', avg_salary: '15k-28k', demand_score: 82, growth_trend: '稳定', tags: ['产品设计', '需求分析'], industry: '互联网', level: '中级', skills: ['需求分析', '原型设计', '用户研究'], location: '杭州', company_nature: '私企' },
            { job_id: 'job_006', job_name: '新能源电池工程师', avg_salary: '18k-30k', demand_score: 88, growth_trend: '上升', tags: ['锂电池', 'BMS'], industry: '新能源', level: '中级', skills: ['电化学', '电池管理', '测试验证'], location: '深圳', company_nature: '国企' },
            { job_id: 'job_007', job_name: 'UI/UX设计师', avg_salary: '12k-22k', demand_score: 80, growth_trend: '稳定', tags: ['Figma', '交互设计'], industry: '互联网', level: '中级', skills: ['Figma/Sketch', '交互设计', '视觉设计'], location: '杭州', company_nature: '私企' },
            { job_id: 'job_008', job_name: '测试开发工程师', avg_salary: '12k-20k', demand_score: 78, growth_trend: '稳定', tags: ['自动化测试', '性能测试'], industry: '互联网', level: '中级', skills: ['Python', 'Selenium', 'JMeter'], location: '北京', company_nature: '外资' },
            { job_id: 'job_009', job_name: '运维工程师', avg_salary: '11k-20k', demand_score: 75, growth_trend: '稳定', tags: ['Linux', 'K8s', '云原生'], industry: '互联网', level: '中级', skills: ['Linux', 'Docker', 'Kubernetes'], location: '广州', company_nature: '私企' },
            { job_id: 'job_010', job_name: 'AI应用工程师', avg_salary: '18k-32k', demand_score: 90, growth_trend: '上升', tags: ['大模型', 'RAG', 'Agent'], industry: 'AI/互联网', level: '中级', skills: ['Python', 'LLM', 'Prompt工程'], location: '北京', company_nature: '私企' },
            { job_id: 'job_011', job_name: '嵌入式软件工程师', avg_salary: '14k-24k', demand_score: 80, growth_trend: '上升', tags: ['C/C++', '嵌入式'], industry: '智能硬件/汽车', level: '中级', skills: ['C/C++', 'RTOS', '驱动开发'], location: '深圳', company_nature: '国企' },
            { job_id: 'job_012', job_name: '咨询顾问', avg_salary: '15k-30k', demand_score: 72, growth_trend: '稳定', tags: ['战略咨询', '商业分析'], industry: '咨询', level: '中级', skills: ['商业分析', 'PPT', '客户沟通'], location: '上海', company_nature: '外资' }
        ];
    }

    // 岗位完整画像：专业技能、证书、创新、学习、抗压、沟通、实习能力
    _jobProfileExtra(job) {
        const profiles = {
            'job_001': {
                certs: ['数学/计算机竞赛获奖优先', '算法类证书加分'],
                innovation: '高', learning: '高', pressure: '中高', communication: '中', internship: '有项目/实习优先'
            },
            'job_002': { certs: ['前端相关认证加分'], innovation: '中', learning: '高', pressure: '中', communication: '中', internship: '有作品集' },
            'job_003': { certs: ['云厂商认证'], innovation: '中', learning: '高', pressure: '中', communication: '中', internship: '有实习经历' },
            'job_004': { certs: ['数据分析师认证'], innovation: '中', learning: '高', pressure: '中', communication: '中高', internship: '有分析报告' },
            'job_005': { certs: ['PMP加分'], innovation: '高', learning: '高', pressure: '高', communication: '高', internship: '产品实习' },
            'job_006': { certs: ['电池/电化学相关'], innovation: '高', learning: '高', pressure: '中', communication: '中', internship: '车企/电池厂实习' },
            'job_007': { certs: ['设计类作品集'], innovation: '高', learning: '中高', pressure: '中', communication: '高', internship: '设计实习' },
            'job_008': { certs: ['ISTQB等'], innovation: '中', learning: '高', pressure: '中', communication: '中', internship: '测试实习' },
            'job_009': { certs: ['CKA/CKAD', '云认证'], innovation: '中', learning: '高', pressure: '中高', communication: '中', internship: '运维实习' },
            'job_010': { certs: ['AI相关课程/项目'], innovation: '高', learning: '极高', pressure: '中高', communication: '中', internship: 'AI项目' },
            'job_011': { certs: ['嵌入式/电子相关'], innovation: '中', learning: '高', pressure: '中', communication: '中', internship: '硬件/嵌入式实习' },
            'job_012': { certs: ['咨询实习经历'], innovation: '高', learning: '高', pressure: '高', communication: '极高', internship: '咨询实习' }
        };
        return profiles[job.job_id] || { certs: ['相关认证优先'], innovation: '中', learning: '高', pressure: '中', communication: '中', internship: '有实习优先' };
    }

    mockJobDetail(jobIdOrName) {
        const jobs = this.mockJobs();
        const job = jobs.find(j => j.job_id === jobIdOrName || j.job_name === jobIdOrName) || jobs[0];
        const ex = this._jobProfileExtra(job);
        const descMap = {
            'job_001': '负责机器学习/深度学习算法研发与优化，参与AI产品落地方案设计',
            'job_002': '负责Web/移动端前端开发，构建高性能、可维护的用户界面',
            'job_003': '负责服务端系统设计与开发，保障高可用、高并发业务',
            'job_004': '负责数据采集、清洗、建模与可视化，支撑业务决策',
            'job_005': '负责产品规划、需求分析与迭代，协调研发与业务',
            'job_006': '负责动力电池系统设计、BMS开发或测试验证',
            'job_007': '负责产品交互与视觉设计，提升用户体验',
            'job_008': '负责自动化测试、性能测试及质量保障体系建设',
            'job_009': '负责服务器运维、CI/CD、监控告警与故障排查',
            'job_010': '负责大模型应用、RAG、Agent等AI能力落地',
            'job_011': '负责嵌入式软件开发、驱动与RTOS适配',
            'job_012': '负责客户调研、战略分析与方案输出'
        };
        return {
            job_id: job.job_id,
            job_name: job.job_name,
            basic_info: {
                industry: job.industry || '互联网',
                level: job.level || '中级',
                avg_salary: job.avg_salary || '12k-22k',
                work_locations: ['北京', '上海', '广州', '深圳', '杭州'],
                company_scales: ['50-200人', '200-500人', '500人以上'],
                description: descMap[job.job_id] || job.description || '负责岗位相关核心工作'
            },
            requirements: {
                basic_requirements: {
                    education: { level: '本科及以上', preferred_majors: ['计算机', '软件工程', '电子', '数学', '自动化'] }
                },
                professional_skills: {
                    programming_languages: (job.skills || []).slice(0, 4).map(s => ({ skill: s, level: '熟练' })),
                    frameworks_tools: (job.tags || []).map(t => ({ skill: t, level: '了解' }))
                }
            },
            ability_requirements: {
                certificate: ex.certs,
                innovation_ability: ex.innovation,
                learning_ability: ex.learning,
                pressure_resistance: ex.pressure,
                communication_ability: ex.communication,
                internship_ability: ex.internship
            },
            market_analysis: {
                demand_score: job.demand_score || 80,
                growth_trend: job.growth_trend || '上升',
                salary_range: { min: 12000, max: 30000 }
            },
            career_path: {
                current_level: job.level || '中级',
                promotion_path: [
                    { level: '初级/应届', years_required: '0-2年', key_requirements: ['掌握基础技能', '参与项目实践', '完成导师任务'] },
                    { level: '中级', years_required: '2-5年', key_requirements: ['独立负责模块', '带新人', '跨团队协作'] },
                    { level: '高级/专家', years_required: '5年+', key_requirements: ['架构设计', '技术攻坚', '团队建设'] }
                ]
            }
        };
    }

    // 垂直岗位图谱 + 换岗路径图谱（至少5岗位各≥2条换岗路径）
    _jobRelationGraphData() {
        return {
            vertical: {
                'job_001': [
                    { job_id: 'j_a1', job_name: '算法实习生', level: 1, desc: '参与算法模型训练与调优' },
                    { job_id: 'job_001', job_name: '算法工程师', level: 2, desc: '独立负责算法研发与落地' },
                    { job_id: 'j_a3', job_name: '高级/专家算法', level: 3, desc: '技术攻坚、团队带教' },
                    { job_id: 'j_a4', job_name: '算法架构师/技术总监', level: 4, desc: '技术战略与团队建设' }
                ],
                'job_002': [
                    { job_id: 'j_b1', job_name: '前端实习生', level: 1 },
                    { job_id: 'job_002', job_name: '前端开发工程师', level: 2 },
                    { job_id: 'j_b3', job_name: '高级前端/技术专家', level: 3 }
                ],
                'job_005': [
                    { job_id: 'j_p1', job_name: '产品助理', level: 1 },
                    { job_id: 'job_005', job_name: '产品经理', level: 2 },
                    { job_id: 'j_p3', job_name: '高级产品/产品总监', level: 3 }
                ],
                'job_004': [
                    { job_id: 'j_d1', job_name: '数据分析助理', level: 1 },
                    { job_id: 'job_004', job_name: '数据分析师', level: 2 },
                    { job_id: 'j_d3', job_name: '高级分析师/数据科学家', level: 3 }
                ],
                'job_006': [
                    { job_id: 'j_n1', job_name: '电池工艺/测试助理', level: 1 },
                    { job_id: 'job_006', job_name: '新能源电池工程师', level: 2 },
                    { job_id: 'j_n3', job_name: '高级工程师/技术专家', level: 3 }
                ]
            },
            transfer: {
                'job_001': [
                    { from: 'job_001', to: 'job_010', path: '算法工程师→AI应用工程师', reason: '算法基础+工程能力',
                      actions: ['补充大模型API调用与Prompt工程实战', '完成1个RAG/Agent小项目放GitHub', '关注通义/文心等国产模型文档'],
                      validate: '暑期投AI应用岗实习，用实际项目验证兴趣与适配度',
                      risks: 'AI岗门槛高、迭代快，需持续学习；遇挫折可先做算法/数据岗积累' },
                    { from: 'job_001', to: 'job_004', path: '算法工程师→数据分析师', reason: '数据建模与统计基础',
                      actions: ['强化SQL与业务指标拆解', '做2-3份业务分析报告', '学Tableau/帆软等可视化'],
                      validate: '先做数据实习或课程项目，确认是否更喜欢业务侧',
                      risks: '薪资与算法岗有落差，需评估职业优先级' },
                    { from: 'job_001', to: 'job_005', path: '算法工程师→产品经理', reason: '对AI产品理解深入',
                      actions: ['参与产品需求评审，积累PRD阅读经验', '产出1份AI产品竞品分析', '学习Axure/Figma画原型'],
                      validate: '做产品实习或校园项目PM，验证沟通与决策偏好' }
                ],
                'job_002': [
                    { from: 'job_002', to: 'job_005', path: '前端工程师→产品经理', reason: '用户视角、交互理解',
                      actions: ['整理做过的页面，提炼用户痛点与改进点', '参与1次完整需求评审', '学习产品思维课程（如人人都是产品经理）'],
                      validate: '担任校园/课设项目PM，验证是否享受统筹与决策',
                      risks: 'PM竞争激烈，需突出技术+产品双重背景' },
                    { from: 'job_002', to: 'job_007', path: '前端工程师→UI/UX设计师', reason: '视觉与交互能力',
                      actions: ['系统学习Figma/Sketch，输出1套完整设计稿', '学习设计规范（Material/Apple HIG）', '做设计练习并收集反馈'],
                      validate: '接1-2个小项目设计需求，验证是否更喜欢视觉创作' },
                    { from: 'job_002', to: 'job_003', path: '前端工程师→全栈/后端', reason: '技术栈延伸',
                      actions: ['选一门后端语言（Node/Java/Go）系统学习', '独立完成前后端联调小项目', '了解数据库与API设计'],
                      validate: '做全栈或后端实习，确认技术深度偏好' }
                ],
                'job_003': [
                    { from: 'job_003', to: 'job_009', path: '后端工程师→运维/DevOps', reason: '系统与运维关联',
                      actions: ['学习Docker/K8s基础，本地部署应用', '参与线上问题排查1-2次', '了解CI/CD流程'],
                      validate: '争取运维/基础架构实习，体验7×24与稳定性压力',
                      risks: '运维需承担on-call，确认抗压与作息偏好' },
                    { from: 'job_003', to: 'job_005', path: '后端工程师→产品/技术PM', reason: '业务理解+技术背景',
                      actions: ['主动参与需求评审，提技术可行性建议', '写1份技术方案文档', '学习产品方法论'],
                      validate: '做技术PM或产品实习，验证沟通与推动能力' }
                ],
                'job_004': [
                    { from: 'job_004', to: 'job_001', path: '数据分析师→算法工程师', reason: '数据基础+建模能力',
                      actions: ['系统学习机器学习（吴恩达/李宏毅）', '完成Kaggle入门赛', '补充Python算法与模型调参'],
                      validate: '做算法实习或课题，确认是否喜欢钻研模型',
                      risks: '算法岗门槛高于分析岗，需提前半年以上准备' },
                    { from: 'job_004', to: 'job_012', path: '数据分析师→咨询顾问', reason: '商业分析与报告',
                      actions: ['练习结构化表达与PPT', '参与商赛或咨询Case练习', '积累行业研究报告阅读'],
                      validate: '做咨询PTA或商赛，验证高压与客户沟通偏好' },
                    { from: 'job_004', to: 'job_005', path: '数据分析师→产品经理', reason: '数据驱动决策',
                      actions: ['用数据为产品提优化建议', '学习A/B实验与埋点', '产出1份数据驱动产品分析'],
                      validate: '做数据产品或产品实习，验证决策与推动偏好' }
                ],
                'job_005': [
                    { from: 'job_005', to: 'job_012', path: '产品经理→咨询顾问', reason: '战略与商业分析',
                      actions: ['系统学习咨询框架（MECE、金字塔）', '参与商赛或Case Interview', '补充行业研究能力'],
                      validate: '做咨询PTA，体验高强度出差与报告压力',
                      risks: '咨询校招名额少，需提前积累实习' },
                    { from: 'job_005', to: 'job_002', path: '产品经理→前端/设计', reason: '转技术或设计方向',
                      actions: ['评估技术/设计兴趣与天赋', '系统学习前端或设计工具', '用业余项目验证动手能力'],
                      validate: '先做兼职或自由项目，确认转岗可行性' }
                ],
                'job_006': [
                    { from: 'job_006', to: 'job_011', path: '电池工程师→嵌入式工程师', reason: '硬件与BMS相关',
                      actions: ['补充C/嵌入式、RTOS', '做1个嵌入式小项目', '了解BMS软硬件接口'],
                      validate: '投嵌入式实习，验证软硬件结合偏好',
                      risks: '新能源热度高但波动大，关注行业周期' },
                    { from: 'job_006', to: 'job_003', path: '电池工程师→软件/后端', reason: '跨领域技术转岗',
                      actions: ['系统学习一门编程语言', '完成1个完整软件项目', '了解软件工程流程'],
                      validate: '做软件实习，确认是否更适合纯软件方向' }
                ]
            },
            selfCheck: [
                '我是否清楚自己的兴趣点（技术深度 vs 与人打交道）？',
                '我是否做过实习/项目验证过这个方向？',
                '热门行业（AI/新能源）是真实兴趣还是跟风？',
                '遇到求职挫折时，我是否有Plan B？'
            ],
            actionGuide: {
                validate: '建议：至少1段实习或2个实战项目验证规划，避免纸上谈兵',
                adjust: '遇挫时：不要全盘否定，可先降级目标（如大厂→中厂）、积累经验再调整',
                reality: '新兴领域（AI/新能源）：区分「真实需求」与「噱头」，多看JD与行业报告'
            }
        };
    }

    mockAbilityProfile() {
        return {
            user_id: 10001,
            profile_id: 'profile_10001',
            generated_at: new Date().toLocaleString('zh-CN'),
            basic_info: {
                education: '本科',
                major: '计算机科学与技术',
                school: '北京大学',
                gpa: '3.8/4.0',
                expected_graduation: '2026-06'
            },
            professional_skills: {
                programming_languages: [
                    { skill: 'Python', level: '熟练', evidence: ['3个Python项目经验', '开源贡献'], score: 85 },
                    { skill: 'Java', level: '熟悉', evidence: ['课程项目', '实习应用'], score: 70 }
                ],
                frameworks_tools: [
                    { skill: 'React', level: '熟练', evidence: ['2个前端项目'], score: 80 }
                ],
                domain_knowledge: [
                    { domain: '机器学习', level: '熟悉', evidence: ['相关课程', 'Kaggle竞赛'], score: 75 }
                ],
                overall_score: 78
            },
            certificates: {
                items: [{ name: '全国计算机等级考试二级', level: '二级', issue_date: '2023-03' }],
                score: 60,
                competitiveness: '中等'
            },
            innovation_ability: {
                projects: [{ name: '校园社交平台', innovation_points: ['首创校园匿名树洞', 'LBS校友发现'], impact: '1000+用户' }],
                competitions: [{ name: '中国大学生计算机设计大赛', award: '省级二等奖' }],
                score: 72,
                level: '中上'
            },
            learning_ability: {
                indicators: [
                    { indicator: 'GPA', value: 3.8, percentile: 85 },
                    { indicator: '自学新技术', evidence: ['1个月掌握React', '自学机器学习并完成项目'] }
                ],
                score: 85,
                level: '优秀'
            },
            pressure_resistance: {
                evidence: ['同时处理3门课程期末+实习', '项目deadline前高质量交付'],
                assessment_score: 75,
                level: '良好'
            },
            communication_ability: {
                teamwork: { evidence: ['担任3个项目的技术负责人'], score: 70 },
                presentation: { evidence: ['技术分享会演讲3次'], score: 75 },
                overall_score: 72,
                level: '良好'
            },
            practical_experience: {
                internships: [{
                    company: '腾讯科技', position: '前端开发实习生', duration: '3个月',
                    achievements: ['独立完成2个H5页面', '优化加载速度30%'], score: 80
                }],
                projects: [{ name: '校园社交平台', role: '项目负责人', complexity: '高', score: 85 }],
                overall_score: 82
            },
            overall_assessment: {
                total_score: 76,
                percentile: 78,
                completeness: 90,
                competitiveness: '中上',
                strengths: ['学习能力强，GPA优秀', '有完整项目和实习经验', '技术栈较为全面'],
                weaknesses: ['缺少技术证书', '沟通能力有提升空间', '创新项目影响力可以更大']
            }
        };
    }

    mockRecommendation(job, matchScore = 85) {
        const level = matchScore >= 90 ? '高度匹配' : matchScore >= 75 ? '较为匹配' : '一般匹配';
        return {
            job_id: job.job_id,
            job_name: job.job_name,
            match_score: matchScore,
            match_level: level,
            dimension_scores: {
                basic_requirements: { score: matchScore + 5, weight: 0.15, details: { education: { required: '本科', student: '本科', match: true }, major: { required: ['计算机'], student: '计算机科学与技术', match: true } } },
                professional_skills: { score: matchScore, weight: 0.40, details: { matched_skills: job.skills?.slice(0, 2).map(s => ({ skill: s, required_level: '熟练', student_level: '熟练', match: true })) || [], missing_skills: [], match_rate: 0.85 } },
                soft_skills: { score: matchScore + 3, weight: 0.30, details: { innovation_ability: { required: '高', student: '中上', score: 88 }, learning_ability: { required: '高', student: '优秀', score: 95 }, communication_ability: { required: '中', student: '良好', score: 90 } } },
                development_potential: { score: 93, weight: 0.15, details: { growth_mindset: '优秀', career_clarity: '清晰', motivation: '强' } }
            },
            highlights: ['学习能力强，符合岗位要求', '有相关实习经验', '技术栈覆盖大部分岗位需求'],
            gaps: [{ gap: '部分技能需进阶', importance: '重要', suggestion: '通过项目实践持续提升' }],
            job_info: { company: '多家公司', location: '北京/上海', salary: job.avg_salary || '15k-25k', experience: '应届生/1年经验' }
        };
    }

    mockMatchAnalysis(jobIdOrName) {
        const jobs = this.mockJobs();
        const job = jobs.find(j => j.job_id === jobIdOrName || j.job_name === jobIdOrName) || jobs[0];
        return this.mockRecommendation(job, 78 + Math.floor(Math.random() * 20));
    }

    mockCareerReport() {
        const now = new Date();
        return { report_id: 'report_001', created_at: now.toISOString(), primary_career: '算法工程师', completeness: 85 };
    }

    mockCareerReportFull() {
        const now = new Date().toISOString();
        
        // 随机生成不同类型的报告内容，模拟个性化
        const reportType = Math.floor(Math.random() * 3);
        let careerFocus, skillsFocus, targetJobs,个性化内容;
        
        switch (reportType) {
            case 0:
                // 算法工程师方向
                careerFocus = '算法工程师';
                skillsFocus = ['深度学习', '大数据处理', '算法优化'];
                targetJobs = ['算法工程师', '机器学习工程师', '数据科学家'];
                个性化内容 = {
                    strengths: ['学习能力强，快速掌握新技术', '逻辑思维能力突出', '有扎实的编程基础和项目经验'],
                    interests: ['对人工智能和算法有浓厚兴趣', '喜欢解决复杂技术问题', '追求技术深度'],
                    gap: '缺少大规模数据处理经验',
                    solution: '学习Spark等大数据框架',
                    timeline: '2-3个月'
                };
                break;
            case 1:
                // 后端开发方向
                careerFocus = '后端开发工程师';
                skillsFocus = ['分布式系统', '数据库设计', 'API开发'];
                targetJobs = ['后端开发工程师', '全栈工程师', '系统架构师'];
                个性化内容 = {
                    strengths: ['编程基础扎实', '系统设计能力良好', '代码质量高'],
                    interests: ['对系统架构设计感兴趣', '喜欢解决工程问题', '追求代码质量'],
                    gap: '分布式系统经验不足',
                    solution: '学习微服务架构和容器技术',
                    timeline: '3-4个月'
                };
                break;
            case 2:
                // 前端开发方向
                careerFocus = '前端开发工程师';
                skillsFocus = ['前端框架', '响应式设计', '用户体验'];
                targetJobs = ['前端开发工程师', '全栈工程师', 'UI/UX工程师'];
                个性化内容 = {
                    strengths: ['前端技术栈熟练', '用户界面设计感强', '学习能力强'],
                    interests: ['对用户体验设计感兴趣', '喜欢创造美观的界面', '关注前端技术发展'],
                    gap: '大型项目经验不足',
                    solution: '参与开源项目或大型前端工程',
                    timeline: '2-3个月'
                };
                break;
        }
        
        return {
            report_id: 'report_career_' + Date.now(),
            user_id: 10001,
            generated_at: now,
            status: 'completed',
            metadata: { version: 'v1.0', ai_model: 'claude-sonnet-4', confidence_score: 0.91, completeness: 95 },
            section_1_job_matching: {
                title: '职业探索与岗位匹配',
                self_assessment: {
                    strengths: 个性化内容.strengths,
                    interests: 个性化内容.interests,
                    values: ['重视个人技术成长', '追求工作成就感', '希望参与有影响力的项目']
                },
                recommended_careers: [
                    { career: careerFocus, match_score: 92,
                      match_analysis: {
                        why_suitable: ['你的兴趣与' + careerFocus + '岗位高度契合', '你的能力与岗位要求匹配度高', '你的价值观与职业发展方向一致'],
                        capability_match: { professional_skills: { score: 88, description: '技术栈覆盖80%岗位需求' }, soft_skills: { score: 90, description: '学习能力、创新能力与岗位要求高度匹配' } },
                        gaps_and_solutions: [
                            { gap: 个性化内容.gap, solution: 个性化内容.solution, priority: '高', timeline: 个性化内容.timeline }
                        ]
                      },
                      market_outlook: { demand: '高', growth_trend: '持续上升', salary_range: '15k-25k（应届）→ 25k-40k（2-3年）', key_trends: ['技术栈持续更新', '工程化要求提高'] }
                    },
                    { career: targetJobs[1], match_score: 85,
                      match_analysis: { why_suitable: ['你的技能可以迁移到' + targetJobs[1] + '岗位', '你有相关的能力基础'], capability_match: {}, gaps_and_solutions: [] },
                      market_outlook: { demand: '高', growth_trend: '稳定', salary_range: '12k-20k（应届）' }
                    }
                ],
                career_choice_advice: {
                    primary_recommendation: careerFocus,
                    reasons: ['与你的兴趣、能力、价值观高度契合', '市场需求旺盛，发展前景好', '能够充分发挥你的技术优势'],
                    alternative_option: targetJobs[1],
                    risk_mitigation: '建议同时关注相关技术领域，增加就业灵活性'
                }
            },
            section_2_career_path: {
                title: '职业目标设定与职业路径规划',
                short_term_goal: {
                    timeline: '2026.06 - 2026.06',
                    primary_goal: '成功入职' + careerFocus + '岗位，完成职业起步',
                    specific_targets: [
                        { target: '获得' + careerFocus + 'offer', metrics: '至少2个中大厂offer', deadline: '2026.06' },
                        { target: '快速融入团队', metrics: '3个月内独立负责核心模块', deadline: '2026.09' }
                    ]
                },
                mid_term_goal: {
                    timeline: '2026 - 2030',
                    primary_goal: '成长为中高级' + careerFocus + '，建立技术影响力',
                    specific_targets: [
                        { target: '晋升为中级' + careerFocus, metrics: '独立负责关键项目', deadline: '2027' },
                        { target: '技术深度突破', metrics: '在某一细分领域成为团队专家', deadline: '2028' }
                    ]
                },
                career_roadmap: {
                    path_type: '技术专家路线',
                    stages: [
                        { stage: '初级' + careerFocus, period: '1-2年', key_responsibilities: ['完成分配的开发任务', '优化现有代码性能'], success_criteria: ['独立完成模块开发', '代码质量达到团队标准'] },
                        { stage: '中级' + careerFocus, period: '2-3年', key_responsibilities: ['负责核心模块设计', '解决技术难题'], success_criteria: ['设计的系统性能提升显著', '攻克2-3个技术难点'] },
                        { stage: '高级' + careerFocus + '/技术专家', period: '3-5年', key_responsibilities: ['设计系统架构', '带领技术团队'], success_criteria: ['成为某领域的技术专家', '带领团队完成重要项目'] }
                    ],
                    alternative_paths: [
                        { path: '横向转岗 → ' + targetJobs[1], timing: '2-3年工作经验后', reason: '技能可迁移', preparation: ['学习相关技术栈', '参与相关项目'] },
                        { path: '向上转型 → 技术管理者', timing: '4-5年工作经验后', reason: '技术背景+管理能力', preparation: ['培养管理能力', '提升沟通和项目管理能力'] }
                    ]
                },
                industry_trends: {
                    current_status: careerFocus + '岗位需求持续旺盛',
                    key_trends: [
                        { trend: '技术栈持续更新', impact: '对工程师的学习能力要求提高', opportunity: '持续学习新技术将成为核心竞争力' },
                        { trend: '工程化要求提高', impact: '需要更注重代码质量和系统稳定性', opportunity: '提升工程化能力将脱颖而出' }
                    ],
                    '5_year_outlook': careerFocus + '将从纯技术岗位向技术+业务复合型人才转变'
                }
            },
            section_3_action_plan: {
                title: '行动计划与成果展示',
                short_term_plan: {
                    period: '2026.02 - 2026.08',
                    goal: '补齐能力短板，冲刺校招offer',
                    monthly_plans: [
                        { month: '2026.02 - 2026.03', focus: '技能提升',
                          tasks: [{ task: skillsFocus[0] + '进阶', '具体行动': ['完成相关课程学习', '实践项目开发'], '预期成果': '掌握核心技能', '时间投入': '每周15小时' }],
                          milestone: '完成2个相关项目' },
                        { month: '2026.04 - 2026.06', focus: '求职冲刺',
                          tasks: [{ task: '算法刷题/技术面试准备', '具体行动': ['刷LeetCode题目/准备技术面试'], '预期成果': '面试通过率80%+', '时间投入': '每周15小时' }],
                          milestone: '获得2-3个' + careerFocus + 'offer' }
                    ]
                },
                learning_path: {
                    technical_skills: [
                        { skill_area: skillsFocus[0], current_level: '熟悉', target_level: '精通', learning_resources: ['课程学习', '实践项目'], timeline: '6个月' },
                        { skill_area: skillsFocus[1], current_level: '了解', target_level: '熟练', learning_resources: ['官方文档', '实战项目'], timeline: '3个月' }
                    ],
                    soft_skills: [{ skill: '技术沟通', improvement_plan: ['每月1次技术分享', '撰写清晰的技术文档'], timeline: '持续提升' }]
                },
                achievement_showcase: {
                    portfolio_building: {
                        github: { goal: '打造个人技术品牌', actions: ['开源2-3个高质量项目', '维护技术博客 Star 500+'] },
                        technical_blog: { goal: '建立技术影响力', actions: ['每月1-2篇技术文章', '总阅读量10万+'] },
                        competitions: { goal: '验证技术能力', actions: ['参加相关技术竞赛'] }
                    }
                }
            },
            section_4_evaluation: {
                title: '评估周期与动态调整',
                evaluation_system: {
                    monthly_review: { frequency: '每月1次', review_items: ['学习目标完成度', '项目进展情况', '技能提升评估'] },
                    quarterly_review: { frequency: '每季度1次', review_items: ['能力画像更新', '人岗匹配度重新评估', '职业目标校准'] },
                    annual_review: { frequency: '每年1次', review_items: ['年度目标达成情况', '职业路径是否需要调整'] }
                },
                adjustment_scenarios: [
                    { scenario: '求职不顺利（offer<预期）', possible_reasons: ['技能储备不足', '面试表现欠佳'], adjustment_plan: { immediate_actions: ['分析面试反馈，针对性提升', '降低目标公司档次'], long_term_actions: ['系统提升薄弱技能', '积累更多项目经验'] } },
                    { scenario: '工作后发现不适合' + careerFocus + '岗', possible_reasons: ['兴趣不符', '能力不匹配'], adjustment_plan: { evaluation_period: '工作6个月内', fallback_options: [targetJobs[1], targetJobs[2], '相关技术岗位'] } }
                ],
                risk_management: {
                    identified_risks: [
                        { risk: '技术迭代导致部分岗位需求变化', probability: '中', impact: '高', mitigation: '保持学习，关注前沿技术' },
                        { risk: '市场竞争加剧', probability: '高', impact: '中', mitigation: '提前准备，建立差异化竞争力' }
                    ],
                    contingency_plans: ['plan A: 坚持' + careerFocus + '方向', 'plan B: 转向' + targetJobs[1], 'plan C: 转向相关技术领域']
                }
            },
            summary: {
                key_takeaways: ['你适合从事' + careerFocus + '职业', '短期目标是补齐技能短板，获得2-3个offer', '中期目标是3-5年内成长为中高级' + careerFocus, '需要重点提升' + skillsFocus[0] + '和' + skillsFocus[1] + '能力'],
                next_steps: ['立即开始：' + skillsFocus[0] + '学习（本周内）', '2周内：启动1个相关项目', '1个月内：完成' + skillsFocus[1] + '学习和实战', '3个月内：完成2个高质量项目并开源'],
                motivational_message: '你已经具备了成为优秀' + careerFocus + '的潜质。接下来的6个月是关键期，保持专注和持续行动，你一定能够实现职业目标。加油！'
            }
        };
    }

    mockCareerCompleteness() {
        return {
            completeness_score: 92,
            quality_score: 88,
            section_completeness: [
                { section: '职业探索与岗位匹配', completeness: 95, issues: [] },
                { section: '职业目标设定与职业路径规划', completeness: 90, issues: ['建议补充更多行业趋势分析'] },
                { section: '行动计划与成果展示', completeness: 88, issues: ['学习路径可以更具体'] }
            ],
            suggestions: [{ type: '内容完善', priority: '中', suggestion: '在行动计划中添加具体的时间管理方法' }],
            strengths: ['岗位匹配分析详细准确', '行动计划具体可执行', '职业路径规划清晰']
        };
    }

    // 模拟面试：创建会话（供 app.js 调用，避免 api.createMockInterview is not a function）
    async createMockInterview(userId, targetPosition, interviewType, difficulty, duration) {
        if (API_CONFIG.mockMode) {
            const interviewId = 'int_' + Date.now();
            const newInterview = {
                interview_id: interviewId,
                user_id: userId,
                target_position: targetPosition,
                interview_type: interviewType,
                difficulty: difficulty,
                duration: duration,
                created_at: new Date().toISOString(),
                status: 'in_progress',
                current_question_index: 0,
                messages: [
                    { role: 'interviewer', content: '你好！欢迎参加本次模拟面试。我是AI面试官，我们将围绕' + targetPosition + '岗位进行' + duration + '分钟的面试。准备好了吗？', timestamp: Date.now() }
                ]
            };
            if (!this.mockInterviews) this.mockInterviews = [];
            this.mockInterviews.unshift(newInterview);
            this.saveMockInterviews();
            return { success: true, data: newInterview };
        }
        try {
            const url = `${API_CONFIG.assessmentBaseURL}/mock-interview/session/create`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, target_job_title: targetPosition, interview_type: interviewType, difficulty: difficulty, duration_minutes: duration })
            });
            const result = await response.json();
            if (result.code === 200) {
                const interview = {
                    interview_id: result.data.interview_id,
                    user_id: userId,
                    target_position: targetPosition,
                    interview_type: interviewType,
                    difficulty: difficulty,
                    duration: duration,
                    created_at: result.data.started_at,
                    status: 'in_progress',
                    current_question_index: 0,
                    messages: [{ role: 'interviewer', content: result.data.opening_message, timestamp: Date.now() }],
                    interviewer_persona: result.data.interviewer_persona,
                    interview_plan: result.data.interview_plan
                };
                if (!this.mockInterviews) this.mockInterviews = [];
                this.mockInterviews.unshift(interview);
                this.saveMockInterviews();
                return { success: true, data: interview };
            }
            return { success: false, msg: result.msg || '创建面试失败' };
        } catch (e) {
            console.error('[MockInterview] 创建面试异常:', e);
            return { success: false, msg: '创建面试失败，请确认 AI 服务 (http://localhost:5002) 已启动。错误: ' + e.message, error: e };
        }
    }

    // 模拟面试：获取历史记录（供 app.js 调用）
    async getInterviewHistory(userId, page = 1, size = 10) {
        if (API_CONFIG.mockMode) {
            if (!this.mockInterviews) this.mockInterviews = [];
            const userInterviews = this.mockInterviews.filter(i => i.user_id === userId);
            return { success: true, data: { total: userInterviews.length, list: userInterviews.slice((page - 1) * size, page * size) } };
        }
        try {
            const url = new URL(`${API_CONFIG.assessmentBaseURL}/mock-interview/history`);
            url.searchParams.append('user_id', userId);
            url.searchParams.append('page', page);
            url.searchParams.append('size', size);
            const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            const result = await response.json();
            if (result.code === 200) return { success: true, data: result.data };
            return { success: false, msg: result.msg || '获取历史记录失败' };
        } catch (e) {
            console.error('[MockInterview] 获取历史记录异常:', e);
            return { success: false, msg: '获取历史记录失败，请确认 AI 服务 (http://localhost:5002) 已启动。错误: ' + e.message, error: e };
        }
    }
}

// 创建API实例
const api = new API();
// 绑定方法，避免 app.js 以 createFn = api.createMockInterview; createFn() 调用时 this 为 undefined
api.createMockInterview = api.createMockInterview.bind(api);
api.getInterviewHistory = api.getInterviewHistory.bind(api);

// ==================== 身份认证模块 ====================

// 用户注册
async function register(username, password, nickname, avatarFile = null) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('nickname', nickname);
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }
    
    return await api.upload('/auth/register', formData);
}

// 用户登录
async function login(username, password) {
    return await api.post('/auth/login', { username, password });
}

// 退出登录
async function logout(userId) {
    return await api.post('/auth/logout', { user_id: userId });
}

// 1.4.1 发送验证码（忘记密码）
async function sendForgotPasswordCode(username, email) {
    return await api.post('/auth/forgot-password/send-code', { username, email });
}

// 1.4.2 重置密码
async function resetPassword(username, code, newPassword) {
    return await api.post('/auth/forgot-password/reset', {
        username,
        code,
        new_password: newPassword
    });
}

// ==================== 个人档案模块 ====================

// 获取个人档案
async function getProfile(userId) {
    return await api.post('/profile/info', { user_id: userId });
}

// 更新个人档案
async function updateProfile(userId, profileData) {
    return await api.post('/profile/update', {
        user_id: userId,
        ...profileData
    });
}

// 上传简历（使用 Python AI 服务解析，走 5001）
async function uploadResume(userId, resumeFile) {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('resume_file', resumeFile);
    return await api.uploadToAI('/profile/upload-resume', formData);
}

// 获取简历解析结果（Python AI 服务，5001）
async function getResumeParseResult(userId, taskId) {
    return await api.postToAI('/profile/resume-parse-result', {
        user_id: userId,
        task_id: taskId
    });
}

// ==================== 职业测评模块（走 AI 服务，符合文档 3） ====================

// 3.1 获取测评问卷，返回含 assessment_id、dimensions
async function getQuestionnaire(userId, assessmentType = 'comprehensive') {
    return await api.postToAI('/assessment/questionnaire', {
        user_id: userId,
        assessment_type: assessmentType
    });
}

// 3.2 提交测评答案，answers 格式 [{ question_id, answer }]，answer 为选项 id（如 "A"）或量表 1-5
async function submitAssessment(userId, assessmentId, answers, timeSpentMinutes = 0) {
    return await api.postToAI('/assessment/submit', {
        user_id: userId,
        assessment_id: assessmentId,
        answers: answers,
        time_spent: timeSpentMinutes
    });
}

// 3.3 获取测评报告，需传 report_id（来自 3.2 返回）
async function getAssessmentReport(userId, reportId) {
    return await api.postToAI('/assessment/report', {
        user_id: userId,
        report_id: reportId
    });
}

// 智能评分：根据测评答案计算四维度能力分数与建议（学习/逻辑/执行/创新）
// answers: [{ question_id, answer }, ...] 或 { q1: 'A', q2: 'B', ... }
async function calculateAssessmentScores(answers) {
    const res = await api.postToAI('/assessment/calculate', { answers: answers });
    if (res && res.code === 200 && res.data) return { success: true, data: res.data };
    return { success: false, data: null };
}

// ==================== 岗位画像模块 ====================

// 4.1 获取岗位画像列表（统一使用 GET，与后端 Flask GET/POST 双支持一致，避免 405）
// 约定：GET /api/v1/job/profiles?page=1&size=12&keyword=&industry=&level=
// 兼容返回格式：{ total, page, size, list }（Flask）或 { total, pages, current, records }（Java）
async function getJobProfiles(page = 1, size = 20, keyword = '', industry = '', level = '', filters = null) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (keyword != null && keyword !== '') params.set('keyword', keyword);
    if (industry) params.set('industry', industry);
    if (level) params.set('level', level);
    if (filters && typeof filters === 'object') {
        if (filters.city) params.set('city', filters.city);
        if (filters.industry) params.set('industry', filters.industry || industry);
        if (filters.salary) params.set('salary', filters.salary);
        if (filters.company_nature) params.set('company_nature', filters.company_nature);
    }
    const url = `${base}/job/profiles?${params.toString()}`;
    try {
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const text = await response.text();
        if (!response.ok) {
            console.warn('岗位列表接口异常:', response.status, url);
            return { success: false, msg: response.status === 405 ? '请使用 GET 请求岗位列表' : '服务暂不可用', data: null };
        }
        if (!text || text.trim().startsWith('<')) {
            console.warn('岗位列表接口返回非 JSON:', url);
            return { success: false, msg: '服务暂不可用，请确认 AI 服务已启动（5002）', data: null };
        }
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('岗位列表接口返回非合法 JSON:', e);
            return { success: false, msg: '接口返回异常', data: null };
        }
        if (result.code !== 200 || !result.data) {
            return { success: false, msg: result.msg || '请求失败', data: null };
        }
        const d = result.data;
        let list;
        const total = d.total ?? 0;
        const currentPage = d.current ?? d.page ?? page;
        const pages = d.pages ?? Math.max(1, size ? Math.ceil((total || 0) / size) : 1);
        if (d.records && Array.isArray(d.records)) {
            list = d.records.map(r => ({
                job_id: r.jobId ?? r.job_id,
                job_name: r.jobName ?? r.job_name,
                industry: r.industry,
                level: r.level,
                avg_salary: r.salaryRange ?? r.avg_salary,
                skills: r.skills || [],
                tags: r.skills || r.tags || [],
                demand_score: r.demandScore ?? r.demand_score,
                growth_trend: r.trend ?? r.growth_trend
            }));
        } else if (d.list && Array.isArray(d.list)) {
            list = d.list.map(r => ({
                job_id: r.job_id,
                job_name: r.job_name,
                industry: r.industry,
                level: (r.level_range && r.level_range[0]) || r.level,
                avg_salary: r.avg_salary,
                skills: r.skills || [],
                tags: r.tags || r.skills || [],
                demand_score: r.demand_score,
                growth_trend: r.growth_trend
            }));
        } else {
            list = [];
        }
        return {
            success: true,
            data: { list, total: total || list.length, page: currentPage, size, pages }
        };
    } catch (err) {
        console.error('岗位列表接口请求错误:', err);
        const isRefused = (err && (err.message || '').toLowerCase().includes('fetch')) || (err && (err.message || '').includes('CONNECTION_REFUSED'));
        const msg = isRefused ? AI_SERVICE_START_HINT : (err && err.message ? err.message : '网络错误或服务未启动');
        return { success: false, msg, data: null };
    }
}

// 与 getJobProfiles 同义，供 loadJobProfileList 等调用
async function getJobProfilesFromBackend(page = 1, size = 12, keyword = '', industry = '', level = '') {
    return getJobProfiles(page, size, keyword, industry, level);
}

// 兼容：POST 方式（后端也支持 POST，按需使用）
async function getJobProfilesPost(page = 1, size = 20, keyword = '', industry = '', level = '') {
    const body = { page, size };
    if (keyword) body.keyword = keyword;
    if (industry) body.industry = industry;
    if (level) body.level = level;
    return await api.postToAI('/job/profiles', body);
}

// 获取行业列表（动态加载筛选下拉）
async function getJobIndustries() {
    const res = await api.requestToAI('/job/industries', { method: 'GET' });
    if (res.success && res.data && res.data.industries) return res;
    return { success: false, data: { industries: [] } };
}

// 热门岗位：GET /api/v1/job/hot-jobs（替换精选列表）
async function getHotJobs() {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const url = `${base}/job/hot-jobs`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.code === 200 && Array.isArray(data.data)) return { success: true, data: data.data };
        return { success: false, data: [] };
    } catch (e) {
        console.error('getHotJobs:', e);
        return { success: false, data: [] };
    }
}

// 真实招聘数据：GET http://localhost:5002/api/v1/job/real-data?jobName=xxx&size=5
async function getJobRealData(jobName, size = 5) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const url = `${base}/job/real-data?jobName=${encodeURIComponent(jobName || '')}&size=${Math.max(1, Math.min(200, size))}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.code === 200 && Array.isArray(data.data)) return { success: true, data: data.data };
        return { success: false, data: [] };
    } catch (e) {
        console.error('getJobRealData:', e);
        return { success: false, data: [] };
    }
}

// 兼容旧调用：获取岗位列表（等同 getJobProfiles，返回 data.list）
async function getJobList(page = 1, size = 20, keyword = '', industry = '', level = '', filters = null) {
    return await getJobProfiles(page, size, keyword, industry, level, filters);
}

// 4.2 获取岗位详细画像，参数为 job_id
async function getJobDetailByJobId(jobId) {
    return await api.postToAI('/job/profile/detail', { job_id: jobId });
}

// 兼容旧调用：按岗位名查详情（若仅有 job_name 可先列表再取 job_id，或部分服务支持 job_name）
async function getJobDetail(jobIdOrName) {
    return await api.postToAI('/job/profile/detail', { job_id: jobIdOrName });
}

// app.js 调用的封装：获取岗位详细画像
async function getJobProfileDetail(jobIdOrName, byName = false) {
    return await api.postToAI('/job/profile/detail', { job_id: jobIdOrName });
}

// 岗位画像流式生成接口 URL（供 app.js 使用 fetch + ReadableStream）
function getJobProfileStreamURL() {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || 'http://localhost:5002/api/v1', 'http://localhost:5002/api/v1');
    return base + '/job/generate-profile-stream';
}

// 4.3 获取岗位关联图谱
async function getJobRelationGraph(jobId, graphType = 'all') {
    return await api.postToAI('/job/relation-graph', { job_id: jobId, graph_type: graphType });
}

// 岗位关联图谱（基于真实数据集：晋升路径 + 转岗路径 + Top5 岗位）
async function getCareerGraph(jobName) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (jobName != null && String(jobName).trim() !== '') ? String(jobName).trim() : '算法工程师';
    const url = `${base}/job/career-graph?jobName=${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json();
        if (json.code === 200 && json.data) return { success: true, data: json.data };
        return { success: false, data: null };
    } catch (e) {
        console.error('getCareerGraph:', e);
        return { success: false, data: null };
    }
}

// 关联图谱：岗位搜索联想（基于 CSV，/api/v1/job/search）
async function searchJobsGraph(keyword) {
    return await api.postToAI('/job/search', { keyword });
}

// 多样化晋升路径（不同岗位不同阶段名称与年限，基于真实数据）
async function getCareerPathDiverse(jobType) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (jobType != null && String(jobType).trim() !== '') ? String(jobType).trim() : '算法';
    const url = `${base}/job/career-path-diverse/${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        if (json.code === 200 && json.data && Array.isArray(json.data.careerPath)) {
            return { success: true, data: json.data };
        }
        return { success: false, data: null };
    } catch (e) {
        console.error('getCareerPathDiverse:', e);
        return { success: false, data: null };
    }
}

// AI 生成个性化晋升路径（优先缓存，未命中时实时调用千问）
async function getCareerPathAI(jobName) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (jobName != null && String(jobName).trim() !== '') ? String(jobName).trim() : '算法工程师';
    const url = `${base}/job/career-path-ai/${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        if (json.code === 200 && json.data && Array.isArray(json.data.levels)) {
            return { success: true, data: json.data };
        }
        return { success: false, data: null };
    } catch (e) {
        console.error('getCareerPathAI:', e);
        return { success: false, data: null };
    }
}

// 4.3.1 获取岗位晋升路径（GET，基于 job_profiles 表动态数据）
async function getCareerPath(jobName) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (jobName != null && String(jobName).trim() !== '') ? String(jobName).trim() : '';
    if (!effective) return { code: 400, data: { path: [] }, msg: '请填写岗位名称' };
    const url = `${base}/job/career-path?jobName=${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return { code: res.status, data: { path: [] }, msg: '晋升路径接口异常，请确认 AI 服务 (5002) 已启动' };
        const json = await res.json().catch(() => ({ code: 500, data: { path: [] } }));
        return json;
    } catch (e) {
        console.error('getCareerPath:', e);
        return { code: 500, data: { path: [] }, msg: (e && e.message) ? e.message : '网络错误，请确认 AI 服务已启动' };
    }
}

// 转岗图谱（GET，基于 job_profiles 表动态匹配度）
async function getRelationGraphByJobName(jobName) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (jobName != null && String(jobName).trim() !== '') ? String(jobName).trim() : '';
    if (!effective) return { code: 400, data: [], center_job: null };
    const url = `${base}/job/relation-graph?jobName=${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json();
        return json;
    } catch (e) {
        console.error('getRelationGraphByJobName:', e);
        return { code: 500, data: [], center_job: null };
    }
}

// 换岗卡片「查看详情」：拉取 3～5 条 CSV 招聘信息
async function getJobRecruitments(keyword) {
    const base = normalizeBaseURL(API_CONFIG.jobProfilesBaseURL || API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL, 'http://localhost:5002/api/v1');
    const effective = (keyword != null && String(keyword).trim() !== '') ? String(keyword).trim() : '';
    if (!effective) return { code: 400, data: [] };
    const url = `${base}/job/recruitments?keyword=${encodeURIComponent(effective)}`;
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json();
        return json;
    } catch (e) {
        console.error('getJobRecruitments:', e);
        return { code: 500, data: [] };
    }
}

// 职业发展路径（按 jobId，队友侧：晋升+换岗，可与 getCareerPath(jobName) 并存）
async function getCareerPathByJobId(jobId) {
    const endpoint = '/job/career-path?jobId=' + encodeURIComponent(jobId);
    return await api.requestToAI(endpoint, { method: 'GET' });
}

// 4.4 AI 生成岗位画像（industry/experience 可选）
async function jobAiGenerateProfile(jobName, jobDescriptions, sampleSize = 30, industry = '', experience = '') {
    const body = {
        job_name: jobName,
        job_descriptions: jobDescriptions || [],
        sample_size: sampleSize
    };
    if (industry) body.industry = industry;
    if (experience) body.experience = experience;
    // 生成岗位画像可能调用大模型，单独拉长超时（默认 120s）
    return await api.requestToAI('/job/ai-generate-profile', {
        method: 'POST',
        body,
        timeout: 120000
    });
}

// 4.5 获取 AI 生成结果
async function getJobAiGenerateResult(taskId) {
    return await api.requestToAI('/job/ai-generate-result', {
        method: 'POST',
        body: { task_id: taskId },
        timeout: 60000
    });
}

// app.js 调用的别名
async function aiGenerateJobProfile(jobName, jobDescriptions, sampleSize = 30, industry = '', experience = '') {
    return await jobAiGenerateProfile(jobName, jobDescriptions, sampleSize, industry, experience);
}

// 搜索岗位（仅使用语义搜索 /matching/search-jobs，结果由 AI 岗位匹配模块统一分页）
// 传入 userId 时后端会对本页结果计算真实匹配度（match_score/match_level），否则列表显示「匹配 —」
async function searchJobs(keyword, page = 1, size = 21, filters = null, userId = null) {
    const body = {
        keyword: keyword || '',
        pageNum: page,
        pageSize: size,
        filters: filters || {}
    };
    if (userId != null) body.user_id = userId;
    // 单独为岗位搜索拉长超时时间（默认 3 分钟），避免首次大批量向量检索被过早中断
    const res = await api.requestToAI('/matching/search-jobs', {
        method: 'POST',
        body,
        timeout: 180000
    });
    if (res && res.success && res.data && Array.isArray(res.data.jobs)) {
        const list = res.data.jobs.map(j => ({
            job_id: j.job_id,
            job_name: j.job_name,
            industry: j.industry,
            level: j.level,
            avg_salary: j.avg_salary,
            tags: j.tags || [],
            semantic_score: j.semantic_score ?? null,
            match_score: j.match_score != null ? Number(j.match_score) : null,
            match_level: j.match_level || null,
            location: j.location || null,
            company: j.company || null
        }));
        return {
            success: true,
            data: {
                list,
                total: res.data.total_count ?? list.length,
                page: res.data.page_num ?? page,
                size: res.data.page_size ?? size,
                pages: 1
            }
        };
    }

    // 若 AI 接口异常，返回空结果（不再回退到旧接口，以避免页数/总数不一致）
    return {
        success: false,
        data: {
            list: [],
            total: 0,
            page,
            size,
            pages: 0
        },
        msg: (res && res.msg) || '语义岗位搜索接口异常'
    };
}

// 搜索岗位（按岗位归类视图，默认 5 个岗位种类/页）
async function searchJobsGrouped(keyword, page = 1, size = 5, filters = null, userId = null) {
    const body = {
        keyword: keyword || '',
        pageNum: page,
        pageSize: size,
        filters: filters || {}
    };
    if (userId != null) body.user_id = userId;
    let res;
    try {
        res = await api.requestToAI('/matching/search-jobs-grouped', {
            method: 'POST',
            body,
            timeout: 180000
        });
    } catch (e) {
        const isConnection = (e && String(e.message || '').toLowerCase().includes('fetch'));
        return {
            success: false,
            data: { groups: [], total: 0, page, size, pages: 0 },
            msg: isConnection ? AI_SERVICE_START_HINT : (e && e.message) || '岗位归类搜索异常'
        };
    }
    if (res && res.success && res.data && Array.isArray(res.data.groups)) {
        return {
            success: true,
            data: {
                groups: res.data.groups,
                total: res.data.total_group_count ?? res.data.total ?? res.data.groups.length,
                page: res.data.page_num ?? page,
                size: res.data.page_size ?? size,
                pages: 1
            }
        };
    }
    const msg = (res && res.msg) || '岗位归类搜索接口异常';
    const useStartHint = msg.includes('无法连接') || msg.includes('请确认已启动') || (msg.toLowerCase && msg.toLowerCase().includes('fetch'));
    return {
        success: false,
        data: { groups: [], total: 0, page, size, pages: 0 },
        msg: useStartHint ? AI_SERVICE_START_HINT : msg
    };
}

// ==================== 学生能力画像模块 ====================

// 获取能力画像
async function getAbilityProfile(userId) {
    return await api.post('/student/ability-profile', { user_id: userId });
}

// AI 生成能力画像（data_source: 'profile' | 'resume'）
async function aiGenerateAbilityProfile(userId, dataSource = 'profile') {
    return await api.post('/student/ai-generate-profile', { user_id: userId, data_source: dataSource });
}

// 更新能力画像
async function updateAbilityProfile(userId, updates) {
    return await api.post('/student/update-profile', { user_id: userId, updates });
}

// ==================== 人岗匹配模块 ====================

// 获取推荐岗位（支持 filters: cities, salary_min, industries；分页）
// 优先请求 AI 服务 5002，失败时自动回退到 Java 5000，始终返回 { success, data?, msg?, code? }
async function getRecommendedJobs(userId, pageNum = 1, pageSize = 10, filters = {}) {
    const body = { user_id: userId, pageNum, pageSize, top_n: pageSize };
    if (filters && Object.keys(filters).length) body.filters = filters;
    const connectionError = (r) => {
        if (!r || !r.msg) return false;
        const m = String(r.msg).toLowerCase();
        return m.includes('无法连接') || m.includes('failed to fetch') || m.includes('connection refused') || m.includes('网络');
    };
    try {
        let result = await api.requestToAI('/matching/recommend-jobs', {
            method: 'POST',
            body,
            timeout: 90000
        });
        const aiConnectionFailed = !result.success && connectionError(result);
        // AI 服务不可用（未启动、连接重置、超时、404）时回退到 Java 后端
        if (!result.success) {
            const javaResult = await api.postToJava('/matching/recommend-jobs', body);
            // 若先连 5002 失败，Java 又返回“能力画像”类错误，优先提示启动 AI 服务（根因多为 5002 未启动）
            if (aiConnectionFailed && !javaResult.success && String(javaResult.msg || '').includes('能力画像')) {
                return {
                    success: false,
                    msg: AI_SERVICE_START_HINT + '若已启动仍无推荐，请完善能力画像。',
                    code: javaResult.code
                };
            }
            result = javaResult;
        }
        // 要求真实数据：AI/Java 均不可用时返回失败，不再用演示数据
        if (!result.success) {
            return {
                success: false,
                msg: result.msg || (AI_SERVICE_START_HINT + '启动后刷新可获取基于能力画像的真实推荐。'),
                code: result.code
            };
        }
        return result;
    } catch (e) {
        const throwIsConnection = (err) => (err && (String(err.message || '').includes('Failed to fetch') || String(err.message || '').includes('Load failed')));
        try {
            const javaResult = await api.postToJava('/matching/recommend-jobs', body);
            if (!javaResult.success && throwIsConnection(e) && String(javaResult.msg || '').includes('能力画像')) {
                return {
                    success: false,
                    msg: AI_SERVICE_START_HINT + '若已启动仍无推荐，请完善能力画像。',
                    code: javaResult.code
                };
            }
            if (javaResult.success) return javaResult;
            return {
                success: false,
                msg: javaResult.msg || (AI_SERVICE_START_HINT + '启动后刷新可获取基于能力画像的真实推荐。'),
                code: javaResult.code
            };
        } catch (e2) {
            console.error('[getRecommendedJobs] 请求异常:', e2);
            return {
                success: false,
                msg: AI_SERVICE_START_HINT + '启动后刷新可获取基于能力画像的真实推荐。'
            };
        }
    }
}

/** AI/Java 均不可用时返回的演示数据结构，保证智能推荐页可正常展示 */
function getRecommendedJobsDemoData() {
    try {
        if (typeof api !== 'undefined' && api.mockJobs && api.mockRecommendation) {
            const recJobList = api.mockJobs().slice(0, 6);
            const recommendations = recJobList.map((j, i) => api.mockRecommendation(j, 85 - i * 3 + Math.floor(Math.random() * 5)));
            return { success: true, data: { total_matched: recommendations.length, recommendations }, msg: '当前为演示数据，推荐服务恢复后将显示真实推荐' };
        }
    } catch (_) {}
    return { success: true, data: { total_matched: 0, recommendations: [] }, msg: '暂无推荐数据，请稍后重试或完善能力画像后刷新' };
}

// 人岗匹配分析（API 使用 job_id）
async function analyzeJobMatch(userId, jobId) {
    return await api.post('/matching/analyze', {
        user_id: userId,
        job_id: jobId
    });
}

// 批量匹配分析
async function batchAnalyze(userId, jobIds) {
    return await api.post('/matching/batch-analyze', {
        user_id: userId,
        job_ids: jobIds
    });
}

// ==================== 职业规划报告模块 (API 7.x) ====================

// 7.1 生成职业规划报告
async function generateCareerReport(userId, options = {}) {
    return await api.post('/career/generate-report', {
        user_id: userId,
        target_jobs: options.target_jobs || [],
        preferences: options.preferences || {},
        user_context: options.user_context || {}
    });
}

// 7.2 获取职业规划报告
async function getCareerReport(userId, reportId) {
    return await api.post('/career/report', { user_id: userId, report_id: reportId });
}

// 兼容旧调用：查看报告内容（优先使用 /career/report）
async function getReportContent(reportId) {
    const userId = getCurrentUserId();
    return await api.post('/career/report', { user_id: userId || 10001, report_id: reportId });
}

// 7.3 编辑职业规划报告
async function editCareerReport(reportId, userId, edits) {
    return await api.post('/career/edit-report', { report_id: reportId, user_id: userId, edits });
}

// 7.4 AI 润色报告
async function polishCareerReport(reportId, polishOptions = {}) {
    return await api.post('/career/ai-polish-report', {
        report_id: reportId,
        polish_options: { improve_readability: true, add_examples: true, enhance_actionability: true, check_completeness: true, ...polishOptions }
    });
}

// 7.5 导出职业规划报告
async function exportCareerReport(reportId, format = 'pdf') {
    return await api.post('/career/export-report', {
        report_id: reportId,
        format,
        include_sections: ['all'],
        template_style: 'professional'
    });
}

// 7.6 报告完整性检查
async function checkCareerCompleteness(reportId) {
    return await api.post('/career/check-completeness', { report_id: reportId });
}

// 7.7 获取历史职业规划报告列表（仅职业规划模块使用，与测评历史分离）
async function getCareerReportHistory(userId, page = 1, size = 10) {
    return await api.post('/career/report-history', { user_id: userId, page, size });
}

// 测评报告历史（3.x 测评模块专用，/assessment/report-history，不与 7.7 职业规划历史混用）
async function getReportHistory(userId) {
    return await api.get('/assessment/report-history', { user_id: userId });
}

// ==================== 规划落地性跟踪模块 (Career Tracking 9.x) ====================
// 文档：§9 规划落地性跟踪模块，所有接口前缀 /api/v1，走 baseURL（Java 5000）

// 投递渠道前端值 → API 9.1 规定：system_recommend | self_found
function normalizeTrackingSource(source) {
    const v = (source || '').trim().toLowerCase();
    if (v === 'system_recommend') return 'system_recommend';
    return 'self_found'; // official/campus/referral/自行寻找 等统一为 self_found
}

// 9.1 创建求职跟踪记录
// 请求体：user_id, job_id, job_title, company_name, apply_date, source (system_recommend | self_found)
async function createTrackingRecord(userId, payload) {
    const applyDate = (payload.apply_date || '').trim();
    const body = {
        user_id: userId,
        job_id: payload.job_id || `job_apply_${Date.now()}`,
        job_title: (payload.job_title || '').trim(),
        company_name: (payload.company_name || '').trim(),
        apply_date: applyDate || new Date().toISOString().slice(0, 10),
        source: normalizeTrackingSource(payload.source)
    };
    return await api.post('/tracking/record/create', body);
}

// 9.2 更新求职进展
// PUT /tracking/record/{record_id}/update
// 请求体：user_id, stage, result, stage_date?, self_evaluation?, notes?, stage_notes?
async function updateTrackingRecord(recordId, payload) {
    const body = { ...payload };
    if (body.stage_date === undefined && body.stage) {
        body.stage_date = new Date().toISOString().slice(0, 10);
    }
    return await api.request(`/tracking/record/${encodeURIComponent(recordId)}/update`, {
        method: 'PUT',
        body
    });
}

// 9.4 获取求职跟踪总览
// GET /tracking/overview?user_id=xxx
// 响应：{ summary: { total_applied, written_test_pass_rate, interview_pass_rate, offer_count, rejected_count, in_progress_count }, records: [...], agent_insight? }
async function getTrackingOverview(userId) {
    return await api.get('/tracking/overview', { user_id: userId });
}

// 9.6 删除求职记录
// DELETE /tracking/record/{record_id}
// 请求体：user_id
async function deleteTrackingRecord(recordId, userId) {
    return await api.request(`/tracking/record/${encodeURIComponent(recordId)}/delete`, {
        method: 'DELETE',
        body: { user_id: userId }
    });
}

// 9.5 获取反馈优化报告列表
// GET /tracking/failure-reports?user_id=xxx&page=1&size=10
// 响应：{ total, list: [{ report_id, job_title, company_name, failure_stage, key_weakness, plan_updated, created_at }] }
async function getFailureReports(userId, page = 1, size = 10) {
    return await api.get('/tracking/failure-reports', { user_id: userId, page, size });
}

// 9.7 保存失败分析为报告
// POST /tracking/failure-reports/save
// 请求体：user_id, record_id
async function saveFailureReport(recordId, userId) {
    return await api.post('/tracking/failure-reports/save', {
        user_id: userId,
        record_id: recordId
    });
}

// 9.3 求职失败反馈分析（SSE）— 与 9.1/9.2/9.4/9.5 同属规划落地跟踪，走 AI 服务 5002
function getTrackingFailureAnalysisURL(recordId) {
    const base = normalizeBaseURL(API_CONFIG.assessmentBaseURL || API_CONFIG.jobProfilesBaseURL, 'http://127.0.0.1:5002/api/v1');
    return `${base}/tracking/record/${encodeURIComponent(recordId)}/failure-analysis`;
}

// 应对措施/计划定制（可执行计划生成，流式或一次性）
function getTrackingActionPlanURL() {
    const base = normalizeBaseURL(API_CONFIG.assessmentBaseURL || API_CONFIG.jobProfilesBaseURL, 'http://127.0.0.1:5002/api/v1');
    return `${base}/tracking/action-plan`;
}

// ==================== 知识库模块 ====================

// 查询知识库
async function searchKnowledge(userId, query, topK = 5, category = null) {
    return await api.post('/knowledge/search', {
        user_id: userId,
        query,
        top_k: topK,
        ...(category && { category })
    });
}

// ==================== 辅助函数 ====================

// 保存用户信息到本地存储
function saveUserInfo(userInfo) {
    _storage.setItem('userInfo', JSON.stringify(userInfo));
}

// 获取本地存储的用户信息
function getUserInfo() {
    const userInfo = _storage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

// 清除用户信息
function clearUserInfo() {
    _storage.removeItem('token');
    _storage.removeItem('userInfo');
}

// 检查是否已登录
function isLoggedIn() {
    return !!_storage.getItem('token');
}

// 获取当前用户ID
function getCurrentUserId() {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.user_id : null;
}

// ==================== 模拟面试模块 ====================

// 10.1 创建模拟面试会话
async function createMockInterview(userId, targetPosition, interviewType, difficulty, duration) {
    if (API_CONFIG.mockMode) {
        const interviewId = 'int_' + Date.now();
        const newInterview = {
            interview_id: interviewId,
            user_id: userId,
            target_position: targetPosition,
            interview_type: interviewType,
            difficulty: difficulty,
            duration: duration,
            created_at: new Date().toISOString(),
            status: 'in_progress',
            current_question_index: 0,
            messages: [
                {
                    role: 'interviewer',
                    content: '你好！欢迎参加本次模拟面试。我是AI面试官，我们将围绕' + targetPosition + '岗位进行' + duration + '分钟的面试。准备好了吗？',
                    timestamp: Date.now()
                }
            ]
        };
        api.mockInterviews.unshift(newInterview);
        api.saveMockInterviews();
        return { success: true, data: newInterview };
    }
    
    try {
        const url = `${API_CONFIG.assessmentBaseURL}/mock-interview/session/create`;
        console.log('[MockInterview] 创建面试，请求URL:', url);
        console.log('[MockInterview] 请求参数:', {
            user_id: userId,
            target_job_title: targetPosition,
            interview_type: interviewType,
            difficulty: difficulty,
            duration_minutes: duration
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                target_job_title: targetPosition,
                interview_type: interviewType,
                difficulty: difficulty,
                duration_minutes: duration
            })
        });
        
        console.log('[MockInterview] 响应状态:', response.status, response.statusText);
        const result = await response.json();
        console.log('[MockInterview] 响应数据:', result);
        
        if (result.code === 200) {
            const interview = {
                interview_id: result.data.interview_id,
                user_id: userId,
                target_position: targetPosition,
                interview_type: interviewType,
                difficulty: difficulty,
                duration: duration,
                created_at: result.data.started_at,
                status: 'in_progress',
                current_question_index: 0,
                messages: [
                    {
                        role: 'interviewer',
                        content: result.data.opening_message,
                        timestamp: Date.now()
                    }
                ],
                interviewer_persona: result.data.interviewer_persona,
                interview_plan: result.data.interview_plan
            };
            api.mockInterviews.unshift(interview);
            api.saveMockInterviews();
            return { success: true, data: interview };
        }
        return { success: false, msg: result.msg || '创建面试失败' };
    } catch (e) {
        console.error('[MockInterview] 创建面试异常:', e);
        return { success: false, msg: '创建面试失败，请确认 AI 服务 (http://localhost:5002) 已启动。错误: ' + e.message, error: e };
    }
}

// 10.1.5 恢复面试会话（后端重启后使用）
async function restoreMockInterview(interview) {
    if (API_CONFIG.mockMode) {
        return { success: true, data: { restored: true } };
    }
    
    try {
        const url = `${API_CONFIG.assessmentBaseURL}/mock-interview/session/restore`;
        console.log('[MockInterview] 恢复会话，请求URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interview)
        });
        
        const result = await response.json();
        if (result.code === 200) {
            return { success: true, data: result.data };
        }
        return { success: false, msg: result.msg || '恢复会话失败' };
    } catch (e) {
        console.error('[MockInterview] 恢复会话异常:', e);
        return { success: false, msg: '恢复会话失败: ' + e.message, error: e };
    }
}

// 10.2 发送面试回答（支持SSE流式响应）
async function sendInterviewAnswer(interviewId, userId, answer, onChunk = null, onNextQuestion = null) {
    if (API_CONFIG.mockMode) {
        const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
        if (!interview) {
            return { success: false, msg: '面试会话不存在' };
        }
        // 按模块统计：每模块 2 轮用户回答后进入下一模块，与后端一致
        const MODULE_QUESTIONS = [
            '请介绍一下你自己？',
            '你为什么想应聘这个岗位？',
            '请分享一个你参与过的项目经历？',
            '你遇到过的最大挑战是什么？你是如何解决的？',
            '你对未来3-5年的职业规划是什么？'
        ];
        const EXCHANGES_PER_MODULE = 2;
        const userCount = (interview.messages || []).filter(m => m.role === 'user').length;
        const currentModuleIndex = Math.min(5, Math.floor(userCount / EXCHANGES_PER_MODULE));
        interview.current_question_index = currentModuleIndex;
        const isComplete = currentModuleIndex >= 5;
        const isStartOfModule = (userCount > 0 && userCount % EXCHANGES_PER_MODULE === 0);
        let nextQuestion = isComplete
            ? '面试到此结束，感谢你的参与！'
            : (isStartOfModule ? MODULE_QUESTIONS[currentModuleIndex] : '请再具体说说。');
        if (isComplete) {
            interview.status = 'completed';
            interview.total_score = Math.floor(Math.random() * 30) + 70;
        }
        const delay = Math.random() * 2000 + 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (onChunk) {
            for (let i = 0; i < nextQuestion.length; i += 3) {
                onChunk(nextQuestion.substring(i, i + 3));
                await new Promise(r => setTimeout(r, 50));
            }
        }
        if (!onChunk) {
            interview.messages.push({
                role: 'interviewer',
                content: nextQuestion,
                timestamp: Date.now()
            });
        }
        api.saveMockInterviews();
        if (onNextQuestion) {
            const remaining = isComplete ? 0 : (5 - currentModuleIndex - 1);
            onNextQuestion(currentModuleIndex, remaining);
        }
        return { 
            success: true, 
            data: { 
                interview,
                is_complete: isComplete
            } 
        };
    }
    
    try {
        const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
        if (!interview) {
            return { success: false, msg: '面试会话不存在' };
        }
        
        let url = `${API_CONFIG.assessmentBaseURL}/mock-interview/session/${interviewId}/answer`;
        console.log('[MockInterview] 发送回答，请求URL:', url);
        console.log('[MockInterview] 请求参数:', {
            user_id: userId,
            interview_id: interviewId,
            answer_text: answer
        });
        
        let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                interview_id: interviewId,
                answer_text: answer
            })
        });
        
        // 如果会话不存在，尝试恢复会话
        if (response.status === 404) {
            console.log('[MockInterview] 会话不存在，尝试恢复...');
            const restoreResult = await restoreMockInterview(interview);
            if (restoreResult.success) {
                console.log('[MockInterview] 会话恢复成功，重新发送回答');
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        interview_id: interviewId,
                        answer_text: answer
                    })
                });
            }
        }
        
        console.log('[MockInterview] 响应状态:', response.status, response.statusText);
        console.log('[MockInterview] 响应头:', response.headers.get('content-type'));
        
        const contentType = response.headers.get('content-type') || '';
        console.log('[MockInterview] Content-Type:', contentType);
        if (contentType.includes('text/event-stream')) {
            console.log('[MockInterview] 开始处理SSE流式响应');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let isComplete = false;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('[MockInterview] SSE流结束');
                    break;
                }
                
                const chunk = decoder.decode(value);
                console.log('[MockInterview] 收到SSE数据块:', chunk);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    console.log('[MockInterview] 处理SSE行:', line);
                    
                    if (line.startsWith('data:')) {
                        const payload = line.substring(5).trim();
                        if (payload === '[DONE]') continue;
                        try {
                            const data = JSON.parse(payload);
                            console.log('[MockInterview] 解析的data:', data);
                            
                            if (data.chunk && onChunk) {
                                fullResponse += data.chunk;
                                onChunk(data.chunk);
                            }
                            if (data.event === 'next_question') {
                                if (data.remaining_questions === 0) isComplete = true;
                                const totalQuestions = 5;
                                const currentIndex = data.current_question_index != null
                                    ? data.current_question_index
                                    : (totalQuestions - 1 - (data.remaining_questions || 0));
                                if (currentIndex >= 0 && currentIndex <= totalQuestions) {
                                    interview.current_question_index = currentIndex;
                                    if (onNextQuestion) onNextQuestion(currentIndex, data.remaining_questions);
                                }
                            }
                        } catch (e) {
                            console.error('[MockInterview] 解析SSE数据失败:', e, '行内容:', line);
                        }
                    }
                }
            }
            
            // 仅保存 AI 回复文本，不保存评分（评分只在结束面试后展示）
            if (!onChunk) {
                interview.messages.push({
                    role: 'interviewer',
                    content: fullResponse,
                    timestamp: Date.now()
                });
            }
            
            if (isComplete) {
                interview.status = 'completed';
            }
            
            api.saveMockInterviews();
            return {
                success: true,
                data: {
                    interview,
                    is_complete: isComplete
                }
            };
        } else {
            const result = await response.json();
            if (result.code === 200) {
                return { success: true, data: result.data };
            }
            return { success: false, msg: result.msg || '发送回答失败' };
        }
    } catch (e) {
        console.error('[MockInterview] 发送回答异常:', e);
        return { 
            success: false, 
            msg: '发送回答失败，请确认 AI 服务 (http://localhost:5002) 已启动',
            error: e
        };
    }
}

// 10.3 结束面试并获取报告
async function getInterviewReport(interviewId, userId) {
    if (API_CONFIG.mockMode) {
        const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
        if (!interview) {
            return { success: false, msg: '面试会话不存在' };
        }
        var roundCount = (interview.messages && interview.messages.filter(function(m){ return m.role === 'user'; }).length) || 0;
        const report = {
            interview_id: interviewId,
            target_job: interview.target_position,
            overall_score: interview.total_score || 80,
            round_count: roundCount,
            dimension_scores: {
                expression: Math.floor(Math.random() * 30) + 70,
                logic: Math.floor(Math.random() * 30) + 70,
                content: Math.floor(Math.random() * 30) + 70,
                stress_resistance: 75,
                cultural_fit: 80
            },
            strengths: ['专业知识扎实', '沟通表达清晰', '逻辑思维能力强'],
            weaknesses: ['项目经验可以更丰富', '压力下的表现还有提升空间'],
            suggestions: ['建议多积累项目经验', '可以进行更多的模拟面试练习', '加强对行业动态的了解'],
            improvement_plan: {
                short_term: ['每天练习1道面试题', '每周进行2-3次模拟面试'],
                suggested_retry_days: 14
            },
            created_at: new Date().toISOString()
        };
        return { success: true, data: report };
    }
    
    try {
        const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
        
        const url = `${API_CONFIG.assessmentBaseURL}/mock-interview/session/${interviewId}/finish`;
        console.log('[MockInterview] 获取报告，请求URL:', url);
        console.log('[MockInterview] 请求参数:', {
            user_id: userId,
            interview_id: interviewId
        });
        
        let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                interview_id: interviewId
            })
        });
        console.log('[MockInterview] 获取报告 响应已返回 status:', response.status, response.statusText);
        
        // 如果会话不存在，尝试恢复会话
        if (response.status === 404 && interview) {
            console.log('[MockInterview] 会话不存在，尝试恢复...');
            const restoreResult = await restoreMockInterview(interview);
            if (restoreResult.success) {
                console.log('[MockInterview] 会话恢复成功，重新获取报告');
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        interview_id: interviewId
                    })
                });
            }
        }
        
        console.log('[MockInterview] 响应状态:', response.status, response.statusText);
        var result;
        try {
            var text = await response.text();
            try {
                result = text ? JSON.parse(text) : {};
            } catch (parseErr) {
                console.error('[MockInterview] 响应非JSON, text前200字:', text ? text.slice(0, 200) : '');
                return { success: false, msg: '服务返回格式错误，请检查后端是否正常。status=' + response.status };
            }
        } catch (e) {
            console.error('[MockInterview] 读取响应体异常:', e);
            return { success: false, msg: '读取响应失败: ' + (e && e.message ? e.message : '') };
        }
        console.log('[MockInterview] 响应数据:', result);
        
        if (result.code === 200) {
            const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
            if (interview) {
                interview.status = 'completed';
                interview.total_score = result.data.overall_score;
                api.saveMockInterviews();
            }
            return { success: true, data: result.data };
        }
        return { success: false, msg: result.msg || '获取报告失败' };
    } catch (e) {
        console.error('[MockInterview] 获取报告异常:', e);
        return { 
            success: false, 
            msg: '获取报告失败，请确认 AI 服务 (http://localhost:5002) 已启动。错误: ' + e.message,
            error: e
        };
    }
}

// 10.4 获取历史记录（默认每页 50 条，避免只显示少量记录）
async function getInterviewHistory(userId, page = 1, size = 50) {
    if (API_CONFIG.mockMode) {
        const userInterviews = api.mockInterviews.filter(i => i.user_id === userId);
        return { 
            success: true, 
            data: {
                total: userInterviews.length,
                list: userInterviews.slice((page - 1) * size, page * size)
            }
        };
    }
    
    try {
        const url = new URL(`${API_CONFIG.assessmentBaseURL}/mock-interview/history`);
        url.searchParams.append('user_id', userId);
        url.searchParams.append('page', page);
        url.searchParams.append('size', size);
        
        console.log('[MockInterview] 获取历史记录，请求URL:', url.toString());
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('[MockInterview] 响应状态:', response.status, response.statusText);
        const result = await response.json();
        console.log('[MockInterview] 响应数据:', result);
        
        if (result.code === 200) {
            return { success: true, data: result.data };
        }
        return { success: false, msg: result.msg || '获取历史记录失败' };
    } catch (e) {
        console.error('[MockInterview] 获取历史记录异常:', e);
        return { 
            success: false, 
            msg: '获取历史记录失败，请确认 AI 服务 (http://localhost:5002) 已启动。错误: ' + e.message,
            error: e
        };
    }
}

// ==================== AI简历生成模块 ====================

// 获取简历
async function getResume(userId) {
    return await api.requestToAI(`/resume/get?user_id=${userId}`, { method: 'GET' });
}

// AI生成简历
async function generateResume(userId) {
    return await api.postToAI('/resume/generate', { user_id: userId });
}

// 提交简历给HR
async function submitResumeToHr(userId) {
    return await api.postToAI('/resume/submit', { user_id: userId });
}

// ==================== 隐私设置模块 ====================

// 获取隐私设置
async function getPrivacySettings(userId) {
    return await api.requestToAI(`/security/privacy/consent?user_id=${userId}`, { method: 'GET' });
}

// 更新隐私设置
async function updatePrivacySettings(userId, consents) {
    return await api.requestToAI('/security/privacy/consent', {
        method: 'PUT',
        body: { user_id: userId, consents: consents }
    });
}

// 获取访问日志
async function getAccessLogs(userId, limit = 20) {
    return await api.requestToAI(`/security/access/logs?user_id=${userId}&limit=${limit}`, { method: 'GET' });
}

// 获取用户数据统计
async function getDataSummary(userId) {
    return await api.requestToAI(`/security/data/summary?user_id=${userId}`, { method: 'GET' });
}

// 导出用户数据
async function exportUserData(userId) {
    return await api.requestToAI(`/security/data/export?user_id=${userId}`, { method: 'GET' });
}

// 删除用户数据
async function deleteUserData(userId) {
    return await api.requestToAI('/security/data/delete', {
        method: 'DELETE',
        body: { user_id: userId }
    });
}
