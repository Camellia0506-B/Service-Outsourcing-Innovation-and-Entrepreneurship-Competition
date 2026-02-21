// API配置
const API_CONFIG = {
    baseURL: 'http://localhost:5000/api/v1',            // Java 后端（登录、个人档案等）
    assessmentBaseURL: 'http://127.0.0.1:5001/api/v1',  // AI 算法服务（职业测评 / 岗位画像），当前 Flask 日志显示运行在 5001 端口
    timeout: 30000,
    mockMode: true   // 模拟模式：true=使用模拟数据（结果会随机变化），false=连接真实 AI 服务生成个性化报告
};

// API工具类
class API {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.aiBaseURL = API_CONFIG.assessmentBaseURL || this.baseURL;
    }

    // 请求 AI 服务（测评、岗位画像），与 request 相同协议 { code, msg, data }
    async requestToAI(endpoint, options = {}) {
        const url = `${this.aiBaseURL}${endpoint}`;
        const token = localStorage.getItem('token');
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
        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }
        try {
            const response = await fetch(url, config);
            const result = await response.json();
            if (result.code === 200) {
                return { success: true, data: result.data, msg: result.msg };
            }
            return { success: false, msg: result.msg, code: result.code };
        } catch (error) {
            console.error('API请求错误(AI):', error);
            const msg = (error.message && error.message.toLowerCase().includes('fetch'))
                ? '无法连接 AI 服务 (http://localhost:5001)，请确认已启动'
                : (error.message || '网络错误');
            return { success: false, msg };
        }
    }

    postToAI(endpoint, data) {
        return this.requestToAI(endpoint, { method: 'POST', body: data });
    }

    // 通用请求方法（职业测评、职业规划报告走 AI 服务 5001，其余走 Java 5000）
    async request(endpoint, options = {}) {
        const useAI = endpoint.startsWith('/assessment/') || endpoint.startsWith('/career/');
        const base = useAI ? (API_CONFIG.assessmentBaseURL || this.baseURL) : this.baseURL;
        const url = `${base}${endpoint}`;
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
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (_) {
                // 服务返回了 HTML 或非 JSON（如 501 错误页），给出明确提示
                const isAssessment = endpoint.startsWith('/assessment/');
                const hint = response.status === 501
                    ? '当前地址不支持 POST，请确认已启动 AI 测评服务 (http://localhost:5001)'
                    : (isAssessment ? '请确认 AI 测评服务已运行 (http://localhost:5001)' : '请确认后端服务已运行');
                return { success: false, msg: `服务返回异常 (${response.status}): ${hint}` };
            }
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
                ? '无法连接后端，请确认已启动对应服务 (Java:5000 / 测评:5001)' 
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

    // GET请求（query 参数对象）
    async get(endpoint, params = {}) {
        if (!Object.keys(params).length) return this.request(endpoint, { method: 'GET' });
        const qs = new URLSearchParams(params).toString();
        const sep = endpoint.indexOf('?') !== -1 ? '&' : '?';
        return this.request(endpoint + sep + qs, { method: 'GET' });
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
            case '/auth/forgot-password/send-code':
                return { success: true, data: { email: options.body?.email || '', expire_minutes: 10 }, msg: '验证码已发送' };
            case '/auth/forgot-password/reset':
                return { success: true, msg: '密码重置成功' };
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
                return { success: true, data: { report_id: 'report_' + Date.now(), status: 'processing' }, msg: '测评提交成功，正在生成报告...' };
            case '/assessment/report':
                const reportData = this.mockAssessmentReport();
                reportData.status = 'completed';  // 轮询时前端据此判断报告已生成
                return { success: true, data: reportData };
            case '/job/profiles':
            case '/job/list':
                return { success: true, data: { total: 5, page: 1, size: 20, list: this.mockJobs() } };
            case '/job/profile/detail':
            case '/job/detail':
                return { success: true, data: this.mockJobDetail(options.body?.job_id || options.body?.job_name) };
            case '/job/relation-graph':
                const centerJob = this.mockJobDetail(options.body?.job_id || options.body?.job_name);
                return {
                    success: true,
                    data: {
                        center_job: { job_id: centerJob.job_id, job_name: centerJob.job_name },
                        vertical_graph: {
                            nodes: [
                                { job_id: 'j1', job_name: '初级工程师', level: 1 },
                                { job_id: 'j2', job_name: centerJob.job_name || '目标岗位', level: 2 },
                                { job_id: 'j3', job_name: '高级/专家', level: 3 }
                            ],
                            edges: []
                        },
                        transfer_graph: {
                            nodes: [
                                { job_id: 't1', job_name: '技术经理' },
                                { job_id: 't2', job_name: '架构师' }
                            ],
                            edges: []
                        }
                    }
                };
            case '/job/ai-generate-profile':
                return { success: true, data: { task_id: 'task_' + Date.now(), status: 'processing', estimated_time: 30 } };
            case '/job/ai-generate-result':
                return { success: true, data: { status: 'completed', job_profile: this.mockJobDetail(options.body?.job_name), ai_confidence: 0.88, data_sources: { total_samples: 50, valid_samples: 47 } } };
            case '/job/search':
                return { success: true, data: { total: 5, list: this.mockJobs() } };
            case '/student/ability-profile':
                return { success: true, data: this.mockAbilityProfile() };
            case '/student/ai-generate-profile':
                return { success: true, data: { task_id: 'stu_gen_' + Date.now(), status: 'processing' }, msg: 'AI画像生成中...' };
            case '/student/update-profile':
                return { success: true, data: { updated_at: new Date().toISOString(), new_total_score: 78, score_change: 2 }, msg: '画像更新成功' };
            case '/matching/recommend-jobs':
                const jobs = this.mockJobs().slice(0, 6);
                const recommendations = jobs.map((j, i) => this.mockRecommendation(j, 85 - i * 3 + Math.floor(Math.random() * 5)));
                return { success: true, data: { total_matched: 45, recommendations } };
            case '/matching/analyze':
                const jobId = options.body?.job_id || options.body?.job_name;
                return { success: true, data: this.mockMatchAnalysis(jobId) };
            case '/career/generate-report':
                return { success: true, data: { task_id: 'task_' + Date.now() }, msg: '报告生成中' };
            case '/career/report-status':
                return { success: true, data: { status: 'completed', report_id: 'report_001' } };
            case '/career/view-report':
                return { success: true, data: this.mockCareerReport() };
            case '/career/report-history':
                return { success: true, data: { total: 1, list: [this.mockCareerReport()] } };
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

    mockJobs() {
        return [
            { job_id: 'job_001', job_name: '算法工程师', avg_salary: '15k-25k', demand_score: 85, growth_trend: '上升', tags: ['人工智能', '机器学习'], industry: '互联网', level: '中级', skills: ['Python', 'TensorFlow', 'PyTorch', '机器学习'] },
            { job_id: 'job_002', job_name: '前端开发工程师', avg_salary: '12k-20k', demand_score: 90, growth_trend: '稳定', tags: ['React', 'Vue'], industry: '互联网', level: '中级', skills: ['JavaScript', 'Vue', 'React', 'TypeScript'] },
            { job_id: 'job_003', job_name: '后端开发工程师', avg_salary: '13k-22k', demand_score: 88, growth_trend: '上升', tags: ['Java', 'Go'], industry: '互联网', level: '中级', skills: ['Java', 'Go', 'MySQL', 'Redis'] },
            { job_id: 'job_004', job_name: '数据分析师', avg_salary: '10k-18k', demand_score: 80, growth_trend: '上升', tags: ['Python', 'SQL'], industry: '互联网', level: '初级', skills: ['Python', 'SQL', 'Excel', '数据可视化'] },
            { job_id: 'job_005', job_name: '产品经理', avg_salary: '15k-25k', demand_score: 75, growth_trend: '稳定', tags: ['产品设计', '需求分析'], industry: '互联网', level: '中级', skills: ['需求分析', '原型设计', '用户研究'] }
        ];
    }

    mockJobDetail(jobIdOrName) {
        const jobs = this.mockJobs();
        const job = jobs.find(j => j.job_id === jobIdOrName || j.job_name === jobIdOrName) || jobs[0];
        return {
            job_id: job.job_id,
            job_name: job.job_name,
            basic_info: {
                industry: job.industry || '互联网',
                level: job.level || '中级',
                avg_salary: job.avg_salary || '12k-20k',
                work_locations: ['北京', '上海', '广州', '深圳'],
                company_scales: ['50-200人', '200-500人', '500人以上'],
                description: job.job_name === '算法工程师' ? '负责机器学习算法的研究、开发和优化，参与AI产品落地' :
                    job.job_name === '前端开发工程师' ? '负责Web前端开发，使用Vue/React等技术栈构建用户界面' :
                    job.job_name === '后端开发工程师' ? '负责服务端开发，设计API、数据库与系统架构' :
                    job.job_name === '数据分析师' ? '负责数据采集、清洗、分析与可视化，支撑业务决策' :
                    '负责产品规划、需求分析与项目管理'
            },
            requirements: {
                basic_requirements: {
                    education: { level: '本科及以上', preferred_majors: ['计算机科学与技术', '软件工程', '数据科学'] }
                },
                professional_skills: {
                    programming_languages: job.skills ? job.skills.slice(0, 3).map(s => ({ skill: s, level: '熟练' })) : [],
                    frameworks_tools: job.tags ? job.tags.map(t => ({ skill: t, level: '了解' })) : []
                }
            },
            market_analysis: {
                demand_score: job.demand_score || 80,
                growth_trend: '上升',
                salary_range: { min: 10000, max: 25000 }
            },
            career_path: {
                current_level: job.level || '中级',
                promotion_path: [
                    { level: '初级', years_required: '0-2年', key_requirements: ['掌握基础技能', '参与项目实践'] },
                    { level: '中级', years_required: '2-5年', key_requirements: ['独立负责模块', '带新人'] },
                    { level: '高级', years_required: '5年+', key_requirements: ['架构设计', '技术攻坚'] }
                ]
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
        return {
            report_id: 'report_001',
            created_at: now.toISOString(),
            generated_at: now.toISOString(),
            primary_career: '算法工程师',
            completeness: 85,
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

// ==================== 岗位画像模块（走 AI 服务，符合文档 4） ====================

// 4.1 获取岗位画像列表
async function getJobProfiles(page = 1, size = 20, keyword = '', industry = '', level = '') {
    const body = { page, size };
    if (keyword) body.keyword = keyword;
    if (industry) body.industry = industry;
    if (level) body.level = level;
    return await api.postToAI('/job/profiles', body);
}

// 兼容旧调用：获取岗位列表（等同 getJobProfiles，返回 data.list）
async function getJobList(page = 1, size = 20, keyword = '', industry = '', level = '') {
    return await getJobProfiles(page, size, keyword, industry, level);
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

// 4.3 获取岗位关联图谱
async function getJobRelationGraph(jobId, graphType = 'all') {
    return await api.postToAI('/job/relation-graph', { job_id: jobId, graph_type: graphType });
}

// 4.4 AI 生成岗位画像
async function jobAiGenerateProfile(jobName, jobDescriptions, sampleSize = 50) {
    return await api.postToAI('/job/ai-generate-profile', {
        job_name: jobName,
        job_descriptions: jobDescriptions,
        sample_size: sampleSize
    });
}

// 4.5 获取 AI 生成结果
async function getJobAiGenerateResult(taskId) {
    return await api.postToAI('/job/ai-generate-result', { task_id: taskId });
}

// app.js 调用的别名
async function aiGenerateJobProfile(jobName, jobDescriptions, sampleSize = 50) {
    return await jobAiGenerateProfile(jobName, jobDescriptions, sampleSize);
}

// 搜索岗位（使用 4.1 带 keyword）
async function searchJobs(keyword, page = 1, size = 20) {
    return await getJobProfiles(page, size, keyword);
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

// 获取推荐岗位（支持 filters: cities, salary_min, industries）
async function getRecommendedJobs(userId, topN = 10, filters = {}) {
    const body = { user_id: userId, top_n: topN };
    if (filters && Object.keys(filters).length) body.filters = filters;
    return await api.post('/matching/recommend-jobs', body);
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
// 获取测评历史报告列表（GET，走测评服务 5001）
async function getReportHistory(userId) {
    return await api.get('/assessment/report-history', { user_id: userId });
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
