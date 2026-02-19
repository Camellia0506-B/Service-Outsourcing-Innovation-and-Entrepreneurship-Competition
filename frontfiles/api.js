// API配置
const API_CONFIG = {
    baseURL: 'http://localhost:5000/api/v1',  // 后端地址（后端默认端口 5000）
    timeout: 30000,
    mockMode: false  // 模拟模式：true=使用模拟数据，false=连接真实后端API
};

// API工具类
class API {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem('token');
        
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

        try {
            const response = await fetch(url, config);
            const result = await response.json();
            
            // 根据code判断是否成功
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            } else if (result.code === 401) {
                // Token失效，跳转到登录页
                localStorage.removeItem('token');
                window.location.reload();
                throw new Error('请重新登录');
            } else {
                return { success: false, msg: result.msg, code: result.code };
            }
        } catch (error) {
            console.error('API请求错误:', error);
            const msg = (error.message && error.message.toLowerCase().includes('fetch')) 
                ? '无法连接后端，请确认已启动后端服务 (http://localhost:5000)' 
                : (error.message || '网络错误，请稍后重试');
            return { success: false, msg };
        }
    }

    // POST请求
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    // 文件上传请求
    async upload(endpoint, formData) {
        const token = localStorage.getItem('token');
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
                ? '无法连接后端，请确认已启动后端服务 (http://localhost:5000)'
                : (error.message || '上传失败');
            return { success: false, msg };
        }
    }

    // 模拟请求方法
    async mockRequest(endpoint, options) {
        console.log('Mock请求:', endpoint, options);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const data = options.body || {};
        
        switch(endpoint) {
            case '/auth/login':
                return this.mockLogin(data);
            case '/auth/register':
                return this.mockRegister(data);
            case '/auth/logout':
                return { success: true, msg: '退出成功' };
            case '/profile/info':
                return { success: true, data: this.mockProfileData() };
            case '/profile/update':
                return { success: true, data: { profile_completeness: 90 }, msg: '档案更新成功' };
            case '/profile/upload-resume':
                return { success: true, data: { task_id: 'task_' + Date.now() }, msg: '简历上传成功' };
            case '/profile/resume-parse-result':
                return { success: true, data: { status: 'completed', parsed_data: {} } };
            case '/assessment/questionnaire':
                return { success: true, data: this.mockQuestions() };
            case '/assessment/submit':
                return { success: true, data: { report_id: 'report_' + Date.now() }, msg: '测评提交成功' };
            case '/assessment/report':
                return { success: true, data: this.mockAssessmentReport() };
            case '/job/list':
                return { success: true, data: { jobs: this.mockJobs() } };
            case '/job/detail':
                return { success: true, data: this.mockJobDetail(data.job_name) };
            case '/job/search':
                return { success: true, data: { jobs: this.mockJobs() } };
            case '/student/ability-profile':
                return { success: true, data: this.mockAbilityProfile() };
            case '/matching/recommend-jobs':
                return { success: true, data: { jobs: this.mockJobs().slice(0, 5) } };
            case '/matching/analyze':
                return { success: true, data: this.mockMatchAnalysis(data.job_name) };
            case '/career/generate-report':
                return { success: true, data: { task_id: 'task_' + Date.now() }, msg: '报告生成中' };
            case '/career/report-status':
                return { success: true, data: { status: 'completed' } };
            case '/career/view-report':
                return { success: true, data: this.mockCareerReport() };
            case '/career/report-history':
                return { success: true, data: { reports: [this.mockCareerReport()] } };
            default:
                return { success: false, msg: '未知的API端点' };
        }
    }

    mockLogin(data) {
        // 预设的用户账号
        const mockUsers = [
            { username: 'admin', password: '123456', nickname: '管理员', user_id: 10001 },
            { username: 'test', password: '123456', nickname: '测试用户', user_id: 10002 },
            { username: 'demo', password: '123456', nickname: '演示用户', user_id: 10003 },
            { username: 'student', password: '123456', nickname: '学生用户', user_id: 10004 }
        ];
        
        // 查找匹配的用户
        const user = mockUsers.find(u => u.username === data.username && u.password === data.password);
        
        if (user) {
            return {
                success: true,
                data: {
                    user_id: user.user_id,
                    username: user.username,
                    nickname: user.nickname,
                    avatar: '',
                    token: 'mock_token_' + Date.now(),
                    profile_completed: false,
                    assessment_completed: false
                },
                msg: '登录成功'
            };
        }
        return { success: false, msg: '用户名或密码错误' };
    }

    mockRegister(data) {
        // 预设的用户账号（用于检查重复）
        const existingUsers = ['admin', 'test', 'demo', 'student'];
        
        // 检查用户名是否已存在
        if (existingUsers.includes(data.username)) {
            return {
                success: false,
                msg: '用户名已存在'
            };
        }
        
        return {
            success: true,
            data: {
                user_id: 10000 + Math.floor(Math.random() * 9000),
                username: data.username,
                nickname: data.nickname,
                avatar: '',
                created_at: new Date().toISOString()
            },
            msg: '注册成功'
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
            assessment_id: 'assess_' + Date.now(),
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
                            question_text: '你更倾向于从事哪类工作？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '技术开发' },
                                { option_id: 'B', option_text: '产品设计' },
                                { option_id: 'C', option_text: '市场运营' }
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
                                { option_id: 'A', option_text: '主动与人交流' },
                                { option_id: 'B', option_text: '选择倾听' },
                                { option_id: 'C', option_text: '视情况而定' }
                            ]
                        },
                        {
                            question_id: 'q005',
                            question_text: '面对新任务时，你通常？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '立即开始行动' },
                                { option_id: 'B', option_text: '先制定详细计划' },
                                { option_id: 'C', option_text: '寻求他人建议' }
                            ]
                        },
                        {
                            question_id: 'q006',
                            question_text: '你更喜欢哪种工作环境？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '安静独立' },
                                { option_id: 'B', option_text: '热闹协作' },
                                { option_id: 'C', option_text: '灵活多样' }
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
                                { option_id: '1', option_text: '较弱' },
                                { option_id: '2', option_text: '一般' },
                                { option_id: '3', option_text: '较强' },
                                { option_id: '4', option_text: '很强' },
                                { option_id: '5', option_text: '非常强' }
                            ]
                        },
                        {
                            question_id: 'q008',
                            question_text: '你的学习能力如何？',
                            question_type: 'scale',
                            options: [
                                { option_id: '1', option_text: '较弱' },
                                { option_id: '2', option_text: '一般' },
                                { option_id: '3', option_text: '较强' },
                                { option_id: '4', option_text: '很强' },
                                { option_id: '5', option_text: '非常强' }
                            ]
                        },
                        {
                            question_id: 'q009',
                            question_text: '你的创新能力如何？',
                            question_type: 'scale',
                            options: [
                                { option_id: '1', option_text: '较弱' },
                                { option_id: '2', option_text: '一般' },
                                { option_id: '3', option_text: '较强' },
                                { option_id: '4', option_text: '很强' },
                                { option_id: '5', option_text: '非常强' }
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
                                { option_id: 'A', option_text: '技术挑战' },
                                { option_id: 'B', option_text: '薪资待遇' },
                                { option_id: 'C', option_text: '工作稳定' }
                            ]
                        },
                        {
                            question_id: 'q011',
                            question_text: '你希望从工作中获得什么？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '成就感' },
                                { option_id: 'B', option_text: '学习成长' },
                                { option_id: 'C', option_text: '团队归属感' }
                            ]
                        },
                        {
                            question_id: 'q012',
                            question_text: '你认为理想的工作状态是？',
                            question_type: 'single_choice',
                            options: [
                                { option_id: 'A', option_text: '不断挑战自我' },
                                { option_id: 'B', option_text: '稳定发展' },
                                { option_id: 'C', option_text: '平衡生活与工作' }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    mockAssessmentReport() {
        return {
            report_id: 'report_001',
            interest_analysis: {
                holland_code: 'RIA',
                primary_interest: {
                    type: '研究型(I)',
                    score: 85,
                    description: '喜欢观察、学习、研究、分析、评估和解决问题'
                },
                suitable_fields: ['软件开发', '数据分析', '算法工程师', '人工智能研发']
            },
            personality_analysis: {
                mbti_type: 'INTJ',
                traits: [
                    { trait_name: '外向性', score: 45, level: '偏内向' },
                    { trait_name: '开放性', score: 82, level: '高' },
                    { trait_name: '尽责性', score: 78, level: '高' }
                ]
            },
            ability_analysis: {
                strengths: [
                    { ability: '逻辑分析能力', score: 88, description: '擅长发现问题本质和规律' },
                    { ability: '学习能力', score: 85, description: '能够快速掌握新知识和技能' }
                ],
                areas_to_improve: [
                    { ability: '沟通表达能力', score: 62, suggestions: ['多参加团队讨论和技术分享', '练习清晰表达技术方案'] }
                ]
            },
            values_analysis: {
                top_values: [
                    { value: '成就感', score: 90, description: '追求技术突破和个人成长' },
                    { value: '学习发展', score: 88, description: '重视持续学习和能力提升' }
                ]
            },
            recommendations: {
                suitable_careers: [
                    { career: '算法工程师', match_score: 92, reasons: ['与你的研究型兴趣高度匹配', '充分发挥逻辑分析和学习能力', '符合追求成就感的价值观'] },
                    { career: '后端开发工程师', match_score: 87, reasons: ['与你的技术能力匹配', '适合独立思考的工作方式'] }
                ],
                development_suggestions: [
                    '加强沟通表达能力的训练',
                    '多参与团队项目提升协作能力',
                    '保持技术深度的同时拓展技术广度'
                ]
            }
        };
    }

    mockJobs() {
        return [
            { job_id: 'job_001', job_name: '算法工程师', avg_salary: '15k-25k', demand_score: 85, tags: ['人工智能', '机器学习'] },
            { job_id: 'job_002', job_name: '前端开发工程师', avg_salary: '12k-20k', demand_score: 90, tags: ['React', 'Vue'] },
            { job_id: 'job_003', job_name: '后端开发工程师', avg_salary: '13k-22k', demand_score: 88, tags: ['Java', 'Go'] },
            { job_id: 'job_004', job_name: '数据分析师', avg_salary: '10k-18k', demand_score: 80, tags: ['Python', 'SQL'] },
            { job_id: 'job_005', job_name: '产品经理', avg_salary: '15k-25k', demand_score: 75, tags: ['产品设计', '需求分析'] }
        ];
    }

    mockJobDetail(jobName) {
        return {
            job_id: 'job_001',
            job_name: jobName || '算法工程师',
            avg_salary: '15k-25k',
            description: '负责机器学习算法的研究、开发和优化',
            requirements: {
                education: { level: '本科及以上', preferred_majors: ['计算机科学与技术', '软件工程'] },
                skills: ['Python', 'TensorFlow', '机器学习算法']
            }
        };
    }

    mockAbilityProfile() {
        return {
            dimensions: [
                { name: '技术能力', score: 85 },
                { name: '学习能力', score: 90 },
                { name: '沟通能力', score: 70 },
                { name: '创新能力', score: 80 }
            ]
        };
    }

    mockMatchAnalysis(jobName) {
        return {
            job_name: jobName || '算法工程师',
            match_score: 85,
            strengths: ['技术能力匹配', '学习能力突出'],
            gaps: ['需要加强沟通能力', '建议补充项目经验'],
            suggestions: ['多参与团队项目', '提升技术深度']
        };
    }

    mockCareerReport() {
        return {
            report_id: 'report_001',
            generated_at: new Date().toISOString(),
            summary: '根据您的测评结果和档案分析，您适合从事技术类工作',
            recommendations: [
                { career: '算法工程师', match_score: 92 },
                { career: '后端开发工程师', match_score: 87 }
            ],
            development_plan: [
                '加强算法基础知识',
                '参与实际项目开发',
                '提升团队协作能力'
            ]
        };
    }
}

// 创建API实例
const api = new API();

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

// 上传简历
async function uploadResume(userId, resumeFile) {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('resume_file', resumeFile);
    
    return await api.upload('/profile/upload-resume', formData);
}

// 获取简历解析结果
async function getResumeParseResult(userId, taskId) {
    return await api.post('/profile/resume-parse-result', {
        user_id: userId,
        task_id: taskId
    });
}

// ==================== 职业测评模块 ====================

// 获取测评问卷
async function getQuestionnaire(userId) {
    return await api.post('/assessment/questionnaire', { user_id: userId });
}

// 提交测评答案
async function submitAssessment(userId, assessmentId, answers, timeSpent = 0) {
    return await api.post('/assessment/submit', {
        user_id: userId,
        assessment_id: assessmentId,
        answers: answers,
        time_spent: timeSpent
    });
}

// 获取测评报告
async function getAssessmentReport(userId, reportId) {
    return await api.post('/assessment/report', {
        user_id: userId,
        report_id: reportId
    });
}

// ==================== 岗位画像模块 ====================

// 获取岗位列表
async function getJobList(page = 1, size = 20, keyword = '') {
    return await api.post('/job/list', {
        page,
        size,
        keyword
    });
}

// 获取岗位详情
async function getJobDetail(jobName) {
    return await api.post('/job/detail', { job_name: jobName });
}

// 搜索岗位
async function searchJobs(keyword) {
    return await api.post('/job/search', { keyword });
}

// ==================== 学生能力画像模块 ====================

// 获取能力画像
async function getAbilityProfile(userId) {
    return await api.post('/student/ability-profile', { user_id: userId });
}

// ==================== 人岗匹配模块 ====================

// 获取推荐岗位
async function getRecommendedJobs(userId, topN = 10) {
    return await api.post('/matching/recommend-jobs', {
        user_id: userId,
        top_n: topN
    });
}

// 人岗匹配分析
async function analyzeJobMatch(userId, jobName) {
    return await api.post('/matching/analyze', {
        user_id: userId,
        job_name: jobName
    });
}

// 批量匹配分析
async function batchAnalyze(userId, jobNames) {
    return await api.post('/matching/batch-analyze', {
        user_id: userId,
        job_names: jobNames
    });
}

// ==================== 职业规划报告模块 ====================

// 生成职业规划报告
async function generateCareerReport(userId) {
    return await api.post('/career/generate-report', { user_id: userId });
}

// 获取报告生成状态
async function getReportStatus(taskId) {
    return await api.post('/career/report-status', { task_id: taskId });
}

// 查看报告内容
async function getReportContent(reportId) {
    return await api.post('/career/view-report', { report_id: reportId });
}

// 获取历史报告列表
async function getReportHistory(userId, page = 1, size = 10) {
    return await api.post('/career/report-history', {
        user_id: userId,
        page,
        size
    });
}

// 导出报告
async function exportReport(reportId, format = 'pdf') {
    return await api.post('/career/export-report', {
        report_id: reportId,
        format: format,
        include_sections: ['all'],
        template_style: 'professional'
    });
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
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

// 获取本地存储的用户信息
function getUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

// 清除用户信息
function clearUserInfo() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
}

// 检查是否已登录
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

// 获取当前用户ID
function getCurrentUserId() {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.user_id : null;
}
