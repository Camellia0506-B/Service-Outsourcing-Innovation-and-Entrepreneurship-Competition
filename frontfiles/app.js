// 精选岗位列表（前端写死，搜索框为空时始终展示，不走接口）
const featuredJobs = [
    { jobId: 'job_001', jobName: '算法工程师', industry: '互联网/AI', level: '中级', salaryRange: '20k-35k', skills: ['人工智能', '机器学习'], techSkills: ['Python', 'TensorFlow', 'PyTorch', '机器学习算法'], demandScore: 92, trend: '上升' },
    { jobId: 'job_002', jobName: '前端开发工程师', industry: '互联网', level: '中级', salaryRange: '12k-22k', skills: ['React', 'Vue', 'TypeScript'], techSkills: ['JavaScript', 'Vue', 'React', 'HTML5/CSS3'], demandScore: 90, trend: '稳定' },
    { jobId: 'job_003', jobName: '后端开发工程师', industry: '互联网', level: '中级', salaryRange: '14k-25k', skills: ['Java', 'Go', '微服务'], techSkills: ['Java/Go', 'MySQL', 'Redis', '分布式'], demandScore: 88, trend: '上升' },
    { jobId: 'job_004', jobName: '数据分析师', industry: '互联网/金融', level: '初级', salaryRange: '10k-18k', skills: ['Python', 'SQL', '数据可视化'], techSkills: ['Python', 'SQL', 'Excel', 'Tableau'], demandScore: 85, trend: '上升' },
    { jobId: 'job_005', jobName: '产品经理', industry: '互联网', level: '中级', salaryRange: '15k-28k', skills: ['产品设计', '需求分析'], techSkills: ['需求分析', '原型设计', '用户研究'], demandScore: 82, trend: '稳定' },
    { jobId: 'job_006', jobName: '新能源电池工程师', industry: '新能源', level: '中级', salaryRange: '18k-30k', skills: ['锂电池', 'BMS'], techSkills: ['电化学', '电池管理', '测试验证'], demandScore: 88, trend: '上升' },
    { jobId: 'job_007', jobName: 'UI/UX设计师', industry: '互联网', level: '中级', salaryRange: '12k-22k', skills: ['Figma', '交互设计'], techSkills: ['Figma/Sketch', '交互设计', '视觉设计'], demandScore: 80, trend: '稳定' },
    { jobId: 'job_008', jobName: '测试开发工程师', industry: '互联网', level: '中级', salaryRange: '12k-20k', skills: ['自动化测试', '性能测试'], techSkills: ['Python', 'Selenium', 'JMeter'], demandScore: 78, trend: '稳定' },
    { jobId: 'job_009', jobName: '运维工程师', industry: '互联网', level: '中级', salaryRange: '11k-20k', skills: ['Linux', 'K8s', '云原生'], techSkills: ['Linux', 'Docker', 'Kubernetes'], demandScore: 75, trend: '稳定' },
    { jobId: 'job_010', jobName: 'AI应用工程师', industry: 'AI/互联网', level: '中级', salaryRange: '18k-32k', skills: ['大模型', 'RAG', 'Agent'], techSkills: ['Python', 'LLM', 'PromptEngineering'], demandScore: 90, trend: '上升' },
    { jobId: 'job_011', jobName: '嵌入式软件工程师', industry: '智能硬件/汽车', level: '中级', salaryRange: '14k-24k', skills: ['C/C++', '嵌入式'], techSkills: ['C/C++', 'RTOS', '驱动开发'], demandScore: 80, trend: '上升' },
    { jobId: 'job_012', jobName: '咨询顾问', industry: '咨询', level: '中级', salaryRange: '15k-30k', skills: ['战略咨询', '商业分析'], techSkills: ['商业分析', 'PPT', '客户沟通'], demandScore: 72, trend: '稳定' },
];

// 应用主类
class CareerPlanningApp {
    constructor() {
        this.currentPage = 'login';
        this.currentUser = null;
        this.currentAssessmentId = null;  // 3.1 返回，提交测评时使用
        this.currentReportId = null;       // 3.2 返回，获取报告时使用
        this.init();
    }

    // 初始化应用
    init() {
        try {
            // 检查登录状态
            if (isLoggedIn()) {
                this.currentUser = getUserInfo();
                this.showMainApp();
            } else {
                this.showPage('loginPage');
            }
        } catch (e) {
            console.error('[App] init 异常，仍继续绑定事件', e);
            try {
                this.showPage('loginPage');
            } catch (_) {}
        }
        // 绑定事件（确保无论 init 是否报错都会执行）
        this.bindEvents();
    }

    // 绑定所有事件
    bindEvents() {
        // 登录表单提交
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 创建账户 - 注册表单提交
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegisterForm();
        });

        // 登录页「创建账户」跳转到注册页
        document.getElementById('goRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('registerPage').classList.remove('hidden');
        });

        // 注册页「立即登录」跳转到登录页
        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('loginPage');
            document.getElementById('registerPage').classList.add('hidden');
        });

        // 导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });

        // 退出登录
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // 仪表板快捷操作
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = card.dataset.action;
                this.navigateTo(action);
            });
        });

        // 个人档案相关
        document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('viewProfileBtn')?.addEventListener('click', () => {
            this.viewCompleteProfile();
        });

        document.getElementById('addSkillCategory')?.addEventListener('click', () => {
            this.addSkillCategory();
        });

        document.getElementById('uploadResumeBtn')?.addEventListener('click', () => {
            document.getElementById('resumeUpload').click();
        });

        document.getElementById('resumeUpload')?.addEventListener('change', (e) => {
            this.handleResumeUpload(e.target.files[0]);
        });

        // 职业测评相关
        document.getElementById('submitAssessmentBtn')?.addEventListener('click', () => {
            this.submitAssessment();
        });

        document.getElementById('viewReportBtn')?.addEventListener('click', () => {
            const btn = document.getElementById('viewReportBtn');
            if (btn && btn.disabled) return;
            this.viewAssessmentReport();
        });

        // 岗位匹配相关 Tab 切换
        document.querySelectorAll('#matchingPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 岗位画像相关 Tab 切换（仅显示/隐藏内容，不重新请求列表数据）
        document.querySelectorAll('#jobProfilePage .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = (e.currentTarget && e.currentTarget.dataset.tab) || e.target.dataset.tab;
                if (tab) this.switchJobProfileTab(tab);
            });
        });

        document.getElementById('searchJobBtn')?.addEventListener('click', () => {
            this.searchJobs();
        });
        document.getElementById('jobSearchInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.searchJobs();
        });
        ['searchFilterCity', 'searchFilterIndustry', 'searchFilterSalary', 'searchFilterCompanyType'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.searchJobs());
        });

        document.getElementById('analyzeBtn')?.addEventListener('click', () => {
            this.analyzeJobMatch();
        });
        document.getElementById('anaBackBtn')?.addEventListener('click', () => {
            this.switchTab('recommend');
        });
        document.getElementById('anaReportBtn')?.addEventListener('click', () => {
            this.navigateTo('report');
        });

        // 职业规划报告相关
        document.getElementById('generateReportBtn')?.addEventListener('click', () => {
            const form = document.getElementById('reportPreferencesForm');
            if (form) form.classList.toggle('hidden');
        });
        document.getElementById('confirmGenerateBtn')?.addEventListener('click', () => this.startGenerateCareerReport());
        document.getElementById('viewHistoryBtn')?.addEventListener('click', () => this.viewCareerReportHistory());
        document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
            document.getElementById('reportHistory')?.classList.add('hidden');
        });
        document.getElementById('reportBackBtn')?.addEventListener('click', () => this.showReportGenerateArea());
        document.getElementById('reportCheckCompletenessBtn')?.addEventListener('click', () => this.checkReportCompleteness());
        document.getElementById('reportPolishBtn')?.addEventListener('click', () => this.polishCareerReport());

        // 岗位画像相关：搜索防抖 300ms，清空按钮，返回精选
        let jobProfileSearchDebounce = null;
        document.getElementById('jobProfileKeyword')?.addEventListener('input', () => {
            this.updateJobProfileClearButton();
            clearTimeout(jobProfileSearchDebounce);
            jobProfileSearchDebounce = setTimeout(() => {
                const kw = (document.getElementById('jobProfileKeyword')?.value || '').trim();
                if (!kw) this._jobListShowAll = false;
                this.loadJobProfileList(1);
            }, 300);
        });
        document.getElementById('jobProfileKeywordClear')?.addEventListener('click', () => this.clearJobProfileSearch());
        document.getElementById('jobProfileSearchBtn')?.addEventListener('click', () => {
            const keyword = (document.getElementById('jobProfileKeyword')?.value || '').trim();
            console.log('搜索按钮点击，关键词：', keyword || '(空)');
            this.loadJobProfileList(1);
        });
        document.getElementById('jobProfileIndustry')?.addEventListener('change', () => this.loadJobProfileList(1));
        document.getElementById('jobProfileLevel')?.addEventListener('change', () => this.loadJobProfileList(1));

        document.getElementById('jobProfileGraphBtn')?.addEventListener('click', () => {
            this.loadJobRelationGraphBySearch();
        });

        // 关联图谱：按岗位名称搜索，输入时下拉提示
        const graphJobNameInput = document.getElementById('graphJobName');
        const graphSuggestionsEl = document.getElementById('graphJobSuggestions');
        if (graphJobNameInput && graphSuggestionsEl) {
            let graphSuggestDebounce = null;
            graphJobNameInput.addEventListener('input', () => {
                this.selectedGraphJobId = null;
                const keyword = graphJobNameInput.value.trim();
                clearTimeout(graphSuggestDebounce);
                if (!keyword) {
                    graphSuggestionsEl.classList.add('hidden');
                    graphSuggestionsEl.innerHTML = '';
                    return;
                }
                graphSuggestDebounce = setTimeout(async () => {
                    const result = await getJobProfiles(1, 15, keyword, '', '');
                    if (result.success && result.data.list && result.data.list.length > 0) {
                        this._graphJobSuggestions = result.data.list;
                        graphSuggestionsEl.innerHTML = result.data.list.map(job =>
                            `<div class="graph-suggestion-item" data-job-id="${(job.job_id || '')}">${(job.job_name || '-').replace(/</g, '&lt;')}</div>`
                        ).join('');
                        graphSuggestionsEl.classList.remove('hidden');
                        graphSuggestionsEl.querySelectorAll('.graph-suggestion-item').forEach(el => {
                            el.addEventListener('click', () => {
                                graphJobNameInput.value = el.textContent || '';
                                this.selectedGraphJobId = el.dataset.jobId || null;
                                graphSuggestionsEl.classList.add('hidden');
                            });
                        });
                    } else {
                        this._graphJobSuggestions = [];
                        graphSuggestionsEl.innerHTML = '<div class="graph-suggestion-empty">暂无匹配岗位</div>';
                        graphSuggestionsEl.classList.remove('hidden');
                    }
                }, 300);
            });
            graphJobNameInput.addEventListener('blur', () => {
                setTimeout(() => graphSuggestionsEl.classList.add('hidden'), 200);
            });
            graphJobNameInput.addEventListener('focus', () => {
                if (this._graphJobSuggestions && this._graphJobSuggestions.length > 0) {
                    graphSuggestionsEl.classList.remove('hidden');
                }
            });
        }

        document.getElementById('jobDetailModalClose')?.addEventListener('click', () => this.closeJobDetailModal());
        document.getElementById('jobDetailModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'jobDetailModal') this.closeJobDetailModal();
        });

        document.getElementById('realDataModalClose')?.addEventListener('click', () => this.closeRealDataModal());
        document.getElementById('realDataModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'realDataModal') this.closeRealDataModal();
        });

        document.getElementById('aiGenerateJobBtn')?.addEventListener('click', () => {
            this.generateJobProfile();
        });
        this._initAIGenTab();

        // 档案详情模态框关闭
        document.getElementById('closeProfileModal')?.addEventListener('click', () => {
            const modal = document.getElementById('profileModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });

        // 点击遮罩空白处也关闭模态框
        document.getElementById('profileModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'profileModal') {
                e.target.classList.add('hidden');
            }
        });

        // 能力画像相关
        document.getElementById('generateAbilityProfileBtn')?.addEventListener('click', () => {
            this.aiGenerateAbilityProfile();
        });
        document.getElementById('refreshAbilityProfileBtn')?.addEventListener('click', () => {
            this.loadAbilityProfile();
        });

        // 首页卡片按钮相关
        document.querySelectorAll('.main-card .card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const card = btn.closest('.main-card');
                if (card) {
                    const action = card.dataset.action;
                    if (action) {
                        this.navigateTo(action);
                    }
                }
            });
        });
    }

    // 显示页面
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(pageId).classList.remove('hidden');
    }

    // 显示主应用（登录后）
    showMainApp() {
        document.getElementById('navbar').classList.remove('hidden');
        this.updateUserInfo();
        this.navigateTo('dashboard');
        this.loadDashboardData();
    }

    // 更新用户信息显示
    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.nickname || this.currentUser.username;
            document.getElementById('welcomeName').textContent = this.currentUser.nickname || this.currentUser.username;
            
            const avatarUrl = this.currentUser.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-size="40">👤</text></svg>';
            document.getElementById('userAvatar').src = avatarUrl;
        }
    }

    // 导航到指定页面
    navigateTo(page) {
        // 更新导航高亮
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // 显示对应页面
        this.showPage(page + 'Page');
        this.currentPage = page;

        // 加载页面数据
        this.loadPageData(page);
    }

    // 加载页面数据
    async loadPageData(page) {
        switch(page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'profile':
                await this.loadProfileData();
                break;
            case 'assessment':
                await this.loadAssessmentData();
                break;
            case 'abilityProfile':
                await this.loadAbilityProfile();
                break;
            case 'matching':
                await this.loadMatchingData();
                break;
            case 'jobProfile':
                await this.loadJobProfileData();
                break;
            case 'report':
                this.showReportGenerateArea();
                break;
        }
    }

    // 处理登录
    async handleLogin() {
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const usernameError = document.getElementById('loginUsernameError');
        const passwordError = document.getElementById('loginPasswordError');
        
        const username = (usernameInput?.value || '').trim();
        const password = (passwordInput?.value || '').trim();

        // 清除之前的错误状态
        usernameInput.classList.remove('error');
        passwordInput.classList.remove('error');
        usernameError.classList.remove('show');
        passwordError.classList.remove('show');

        // 验证账号格式
        if (!username) {
            usernameInput.classList.add('error');
            usernameError.textContent = '请输入账号';
            usernameError.classList.add('show');
            return;
        }

        if (username.length < 3) {
            usernameInput.classList.add('error');
            usernameError.textContent = '账号长度不能少于3位';
            usernameError.classList.add('show');
            return;
        }

        if (username.length > 20) {
            usernameInput.classList.add('error');
            usernameError.textContent = '账号长度不能超过20位';
            usernameError.classList.add('show');
            return;
        }

        // 验证密码格式
        if (!password) {
            passwordInput.classList.add('error');
            passwordError.textContent = '请输入密码';
            passwordError.classList.add('show');
            return;
        }

        if (password.length < 6) {
            passwordInput.classList.add('error');
            passwordError.textContent = '密码长度不能少于6位';
            passwordError.classList.add('show');
            return;
        }

        this.showLoading();
        try {
            const result = await login(username, password);
            if (result.success) {
                localStorage.setItem('token', result.data.token);
                saveUserInfo(result.data);
                this.currentUser = result.data;
                this.showToast('登录成功', 'success');
                this.showMainApp();
            } else {
                this.showToast(result.msg || '登录失败', 'error');
            }
        } catch (e) {
            console.error('登录异常:', e);
            this.showToast('登录失败: ' + (e.message || '网络异常，请检查 mock 模式或后端服务'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 显示快速注册对话框
    showQuickRegisterModal() {
        document.getElementById('quickRegisterModal').classList.remove('hidden');
        document.getElementById('quickRegisterText').focus();
    }

    // 隐藏快速注册对话框
    hideQuickRegisterModal() {
        document.getElementById('quickRegisterModal').classList.add('hidden');
        document.getElementById('quickRegisterText').value = '';
    }

    // 处理快速注册
    async handleQuickRegister() {
        const introduction = document.getElementById('quickRegisterText').value.trim();
        const submitBtn = document.getElementById('handleQuickRegisterBtn');
        
        if (!introduction) {
            this.showToast('请介绍一下自己，帮助我们更好地为您服务', 'error');
            document.getElementById('quickRegisterText').focus();
            return;
        }
        
        if (introduction.length < 5) {
            this.showToast('介绍内容太短，请至少输入5个字符', 'error');
            return;
        }

        // 禁用按钮，显示加载状态
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-text">正在生成账号...</span>';
        }

        // 根据介绍生成用户信息
        const userInfo = this.generateUserInfoFromIntro(introduction);
        
        this.showLoading();
        const result = await register(userInfo.username, userInfo.password, userInfo.nickname);
        this.hideLoading();

        if (result.success) {
            this.showToast('注册成功！正在为您登录...', 'success');
            // 自动登录
            setTimeout(() => {
                this.autoLogin(userInfo.username, userInfo.password);
            }, 1000);
        } else {
            this.showToast(result.msg || '注册失败，请稍后重试', 'error');
            // 恢复按钮
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="btn-text">开始我的职业规划</span><span class="btn-arrow">→</span>';
            }
        }
    }

    // 根据介绍生成用户信息
    generateUserInfoFromIntro(introduction) {
        // 简单的用户信息生成逻辑
        const timestamp = Date.now();
        const username = 'user_' + timestamp.toString().slice(-6);
        const password = '123456'; // 默认密码
        let nickname = '新用户';
        
        // 尝试从介绍中提取信息
        if (introduction.includes('学生')) {
            nickname = '学生用户';
        } else if (introduction.includes('转行')) {
            nickname = '转行用户';
        } else if (introduction.includes('设计')) {
            nickname = '设计爱好者';
        } else if (introduction.includes('技术') || introduction.includes('开发')) {
            nickname = '技术达人';
        } else if (introduction.includes('大三')) {
            nickname = '大三学生';
        }
        
        return { username, password, nickname };
    }

    // 自动登录
    async autoLogin(username, password) {
        this.hideQuickRegisterModal();
        const result = await login(username, password);
        
        if (result.success) {
            localStorage.setItem('token', result.data.token);
            saveUserInfo(result.data);
            this.currentUser = result.data;
            this.showMainApp();
            const name = (result.data.nickname || result.data.username || '').trim() || '用户';
            this.showToast('登录成功，欢迎 ' + name, 'success');
        } else {
            this.showToast(result.msg || '登录失败', 'error');
        }
    }

    // 忘记密码弹窗
    openForgotPasswordModal() {
        document.getElementById('forgotPasswordModal').classList.remove('hidden');
        document.getElementById('forgotPasswordStep1').classList.remove('hidden');
        document.getElementById('forgotPasswordStep2').classList.add('hidden');
        document.getElementById('forgotUsername').value = '';
        document.getElementById('forgotEmail').value = '';
        document.getElementById('forgotCode').value = '';
        document.getElementById('forgotNewPassword').value = '';
        document.getElementById('forgotPasswordMsg').textContent = '';
    }

    closeForgotPasswordModal() {
        document.getElementById('forgotPasswordModal').classList.add('hidden');
    }

    async handleForgotSendCode() {
        const username = document.getElementById('forgotUsername').value.trim();
        const email = document.getElementById('forgotEmail').value.trim();
        if (!username || !email) {
            document.getElementById('forgotPasswordMsg').textContent = '请填写账号和邮箱';
            return;
        }
        document.getElementById('forgotPasswordMsg').textContent = '发送中...';
        const result = await sendForgotPasswordCode(username, email);
        if (result.success) {
            document.getElementById('forgotPasswordMsg').textContent = '验证码已发送到邮箱，' + (result.data.expire_minutes || 10) + ' 分钟内有效';
            document.getElementById('forgotPasswordStep1').classList.add('hidden');
            document.getElementById('forgotPasswordStep2').classList.remove('hidden');
            document.getElementById('forgotPasswordMsg').textContent = '';
        } else {
            document.getElementById('forgotPasswordMsg').textContent = result.msg || '发送失败';
        }
    }

    async handleForgotReset() {
        const username = document.getElementById('forgotUsername').value.trim();
        const code = document.getElementById('forgotCode').value.trim();
        const newPassword = document.getElementById('forgotNewPassword').value.trim();
        if (!username || !code || !newPassword) {
            document.getElementById('forgotPasswordMsg').textContent = '请填写验证码和新密码';
            return;
        }
        document.getElementById('forgotPasswordMsg').textContent = '提交中...';
        const result = await resetPassword(username, code, newPassword);
        if (result.success) {
            this.showToast('密码已重置，请登录', 'success');
            this.closeForgotPasswordModal();
        } else {
            document.getElementById('forgotPasswordMsg').textContent = result.msg || '重置失败';
        }
    }

    // 创建账户表单：注册后自动登录并进入首页
    async handleRegisterForm() {
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');
        const nicknameInput = document.getElementById('regNickname');
        const usernameError = document.getElementById('regUsernameError');
        const passwordError = document.getElementById('regPasswordError');
        const nicknameError = document.getElementById('regNicknameError');
        const avatarInput = document.getElementById('regAvatar');
        const avatarFile = avatarInput && avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const nickname = nicknameInput.value.trim();

        // 清除之前的错误状态
        usernameInput.classList.remove('error');
        passwordInput.classList.remove('error');
        nicknameInput.classList.remove('error');
        usernameError.classList.remove('show');
        passwordError.classList.remove('show');
        nicknameError.classList.remove('show');

        // 验证用户名
        if (!username) {
            usernameInput.classList.add('error');
            usernameError.textContent = '请输入用户名';
            usernameError.classList.add('show');
            return;
        }

        if (username.length < 3) {
            usernameInput.classList.add('error');
            usernameError.textContent = '用户名长度不能少于3位';
            usernameError.classList.add('show');
            return;
        }

        if (username.length > 20) {
            usernameInput.classList.add('error');
            usernameError.textContent = '用户名长度不能超过20位';
            usernameError.classList.add('show');
            return;
        }

        // 验证密码
        if (!password) {
            passwordInput.classList.add('error');
            passwordError.textContent = '请输入密码';
            passwordError.classList.add('show');
            return;
        }

        if (password.length < 6) {
            passwordInput.classList.add('error');
            passwordError.textContent = '密码长度不能少于6位';
            passwordError.classList.add('show');
            return;
        }

        // 验证姓名
        if (!nickname) {
            nicknameInput.classList.add('error');
            nicknameError.textContent = '请输入姓名';
            nicknameError.classList.add('show');
            return;
        }

        if (nickname.length < 2) {
            nicknameInput.classList.add('error');
            nicknameError.textContent = '姓名长度不能少于2位';
            nicknameError.classList.add('show');
            return;
        }

        if (nickname.length > 20) {
            nicknameInput.classList.add('error');
            nicknameError.textContent = '姓名长度不能超过20位';
            nicknameError.classList.add('show');
            return;
        }

        this.showLoading();
        const result = await register(username, password, nickname, avatarFile);
        this.hideLoading();

        if (!result.success) {
            this.showToast(result.msg || '注册失败', 'error');
            return;
        }

        this.showToast('注册成功，正在登录...', 'success');
        const loginResult = await login(username, password);
        if (loginResult.success) {
            localStorage.setItem('token', loginResult.data.token);
            saveUserInfo(loginResult.data);
            this.currentUser = loginResult.data;
            this.showMainApp();
            this.loadDashboardData();
            const name = (loginResult.data.nickname || loginResult.data.username || '').trim() || username;
            this.showToast('欢迎 ' + name + '！请记住您的账号和密码，下次可在本页登录。', 'success');
        } else {
            this.showToast('注册成功，请在本页用账号「' + username + '」和您设置的密码登录。', 'success');
        }
    }



    // 处理退出登录
    async handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            const userId = getCurrentUserId();
            await logout(userId);
            clearUserInfo();
            this.currentUser = null;
            document.getElementById('navbar').classList.add('hidden');
            this.showPage('loginPage');
            this.showToast('已退出登录', 'success');
        }
    }

    // 加载仪表板数据
    async loadDashboardData() {
        const userId = getCurrentUserId();
        if (!userId) return;

        // 获取个人档案信息
        const profileResult = await getProfile(userId);
        if (profileResult.success) {
            const completeness = profileResult.data.profile_completeness || 0;
            document.getElementById('profileCompleteness').textContent = completeness + '%';
        }

        // 测评状态：以登录返回的 assessment_completed 为准（3.3 获取报告需 report_id，不在此轮询）
        const completed = this.currentUser && this.currentUser.assessment_completed;
        document.getElementById('assessmentStatus').textContent = completed ? '已完成' : '未完成';

        // 获取推荐岗位数量（API 返回 recommendations 或 total_matched）
        const matchingResult = await getRecommendedJobs(userId, 10);
        if (matchingResult.success && matchingResult.data) {
            const count = matchingResult.data.recommendations?.length ?? matchingResult.data.total_matched ?? matchingResult.data.jobs?.length ?? 0;
            document.getElementById('matchedJobs').textContent = count;
        }
    }

    // 加载个人档案数据
    async loadProfileData() {
        const userId = getCurrentUserId();
        if (!userId) return;

        this.showLoading();
        const result = await getProfile(userId);
        this.hideLoading();

        if (result.success) {
            this.fillProfileForm(result.data);
        }
    }

    // 填充个人档案表单（merge 模式：仅更新有值的字段，用于加载已有档案）
    fillProfileForm(data) {
        if (data.basic_info) {
            const basic = data.basic_info;
            const nicknameInput = document.getElementById('nickname');
            const genderInput = document.getElementById('gender');
            const birthInput = document.getElementById('birthDate');
            const phoneInput = document.getElementById('phone');
            const emailInput = document.getElementById('email');

            if (basic.nickname !== undefined) nicknameInput.value = basic.nickname || '';
            if (basic.gender !== undefined) genderInput.value = basic.gender || '';
            if (basic.birth_date !== undefined) birthInput.value = this.formatDateForDisplay(basic.birth_date || '');
            if (basic.phone !== undefined) phoneInput.value = basic.phone || '';
            if (basic.email !== undefined) emailInput.value = basic.email || '';
        }
        
        this.initDateInput();

        if (data.education_info) {
            const edu = data.education_info;
            const schoolInput = document.getElementById('school');
            const majorInput = document.getElementById('major');
            const degreeInput = document.getElementById('degree');
            const gradeInput = document.getElementById('grade');
            const gradInput = document.getElementById('expectedGraduation');
            const gpaInput = document.getElementById('gpa');

            if (edu.school !== undefined) schoolInput.value = edu.school || '';
            if (edu.major !== undefined) majorInput.value = edu.major || '';
            if (edu.degree !== undefined) degreeInput.value = edu.degree || '';
            if (edu.grade !== undefined) gradeInput.value = edu.grade || '';
            if (edu.expected_graduation !== undefined) gradInput.value = this.formatMonthForDisplay(edu.expected_graduation || '');
            if (edu.gpa !== undefined) gpaInput.value = edu.gpa || '';
        }

        if (data.skills !== undefined) {
            const container = document.getElementById('skillsContainer');
            if (container) {
                container.innerHTML = '';
                (data.skills || []).forEach(skill => {
                    const div = document.createElement('div');
                    div.className = 'skill-category';
                    const items = Array.isArray(skill.items) ? skill.items : [];
                    div.innerHTML = `
                        <input type="text" placeholder="技能分类" class="skill-category-input" value="${(skill.category || '').replace(/"/g, '&quot;')}">
                        <input type="text" placeholder="技能列表" class="skill-items-input" value="${items.join(', ').replace(/"/g, '&quot;')}">
                    `;
                    container.appendChild(div);
                });
            }
        }
    }

    // 用简历解析结果覆盖表单（overwrite 模式：新简历为权威，全部覆盖之前填充的内容）
    fillProfileFormFromResume(profileData) {
        const basic = profileData.basic_info || {};
        const edu = profileData.education_info || {};
        const skills = profileData.skills || [];

        const nicknameInput = document.getElementById('nickname');
        const genderInput = document.getElementById('gender');
        const birthInput = document.getElementById('birthDate');
        const phoneInput = document.getElementById('phone');
        const emailInput = document.getElementById('email');
        const schoolInput = document.getElementById('school');
        const majorInput = document.getElementById('major');
        const degreeInput = document.getElementById('degree');
        const gradeInput = document.getElementById('grade');
        const gradInput = document.getElementById('expectedGraduation');
        const gpaInput = document.getElementById('gpa');

        if (nicknameInput) nicknameInput.value = basic.nickname || '';
        if (genderInput) genderInput.value = basic.gender || '';
        if (birthInput) birthInput.value = this.formatDateForDisplay(basic.birth_date || '');
        if (phoneInput) phoneInput.value = basic.phone || '';
        if (emailInput) emailInput.value = basic.email || '';
        if (schoolInput) schoolInput.value = edu.school || '';
        if (majorInput) majorInput.value = edu.major || '';
        if (degreeInput) degreeInput.value = edu.degree || '';
        if (gradeInput) gradeInput.value = edu.grade || '';
        if (gradInput) gradInput.value = this.formatMonthForDisplay(edu.expected_graduation || '');
        if (gpaInput) gpaInput.value = edu.gpa || '';

        this.initDateInput();

        const container = document.getElementById('skillsContainer');
        if (container) {
            container.innerHTML = '';
            skills.forEach(skill => {
                const div = document.createElement('div');
                div.className = 'skill-category';
                const items = Array.isArray(skill.items) ? skill.items : [];
                div.innerHTML = `
                    <input type="text" placeholder="技能分类" class="skill-category-input" value="${(skill.category || '').replace(/"/g, '&quot;')}">
                    <input type="text" placeholder="技能列表" class="skill-items-input" value="${items.join(', ').replace(/"/g, '&quot;')}">
                `;
                container.appendChild(div);
            });
        }
    }

    // 将简历解析结果转换为档案结构，便于直接填充表单（输出完整结构，用于覆盖模式）
    transformParsedResumeData(parsed) {
        if (!parsed || typeof parsed !== 'object') {
            return { basic_info: {}, education_info: {}, skills: [] };
        }

        const basic = parsed.basic_info || {};
        const firstEdu = Array.isArray(parsed.education)
            ? (parsed.education[0] || {})
            : (parsed.education || {});
        const skillsFromResume = Array.isArray(parsed.skills) ? parsed.skills : [];

        const profileData = {
            basic_info: {
                nickname: basic.name || basic.nickname || '',
                gender: basic.gender || '',
                birth_date: basic.birth_date || basic.birthday || '',
                phone: basic.phone || '',
                email: basic.email || ''
            },
            education_info: {
                school: firstEdu.school || firstEdu.school_name || '',
                major: firstEdu.major || '',
                degree: firstEdu.degree || firstEdu.education || '',
                grade: firstEdu.grade || '',
                expected_graduation: firstEdu.expected_graduation || firstEdu.graduation_date || firstEdu.end_date || '',
                gpa: firstEdu.gpa || ''
            },
            skills: []
        };

        if (skillsFromResume.length > 0) {
            if (typeof skillsFromResume[0] === 'string') {
                profileData.skills.push({ category: '简历技能', items: skillsFromResume });
            } else {
                skillsFromResume.forEach(s => {
                    if (!s) return;
                    if (typeof s === 'string') {
                        profileData.skills.push({ category: '简历技能', items: [s] });
                    } else {
                        const category = s.category || s.type || '简历技能';
                        const items = Array.isArray(s.items) ? s.items : (s.name ? [s.name] : []);
                        if (items.length > 0) {
                            profileData.skills.push({ category, items });
                        }
                    }
                });
            }
        }

        return profileData;
    }

    // 将后端日期 YYYY-MM-DD → 界面显示 YYYY/MM/DD
    formatDateForDisplay(value) {
        if (!value) return '';
        // HTML5 date input 需要 YYYY-MM-DD 格式，直接返回（浏览器会自动本地化显示）
        // 如果后端返回的是其他格式，先转换为 YYYY-MM-DD
        const dateStr = value.trim();
        // 如果已经是 YYYY-MM-DD 格式，直接返回
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        // 如果是 YYYY/MM/DD 或其他格式，转换为 YYYY-MM-DD
        const normalized = dateStr.replace(/[./年月日]/g, '-').replace(/\/+/g, '-');
        const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) {
            const mm = m[2].padStart(2, '0');
            const dd = m[3].padStart(2, '0');
            return `${m[1]}-${mm}-${dd}`;
        }
        return value; // 格式不对就原样返回
    }

    // 初始化出生日期输入框（稳定版）：文本框手输 + 右侧按钮弹出原生日历
    initDateInput() {
        const textInput = document.getElementById('birthDate');
        const nativeInput = document.getElementById('birthDateNative');
        if (!textInput || !nativeInput) return;

        if (textInput.dataset.dateInitDone === '1') return;
        textInput.dataset.dateInitDone = '1';

        const toYmd = (value) => {
            if (!value) return '';
            const v = String(value).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
            const normalized = v.replace(/[年月日]/g, '-').replace(/[./]/g, '-').replace(/-+/g, '-');
            const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (!m) return v;
            const mm = m[2].padStart(2, '0');
            const dd = m[3].padStart(2, '0');
            const formatted = `${m[1]}-${mm}-${dd}`;
            const d = new Date(formatted);
            if (d.getFullYear() === Number(m[1]) && (d.getMonth() + 1) === Number(m[2]) && d.getDate() === Number(m[3])) {
                return formatted;
            }
            return v;
        };

        // 初始同步：如果文本框已有值，写回 native；如果 native 有值，写回文本框
        if (textInput.value && !nativeInput.value) nativeInput.value = toYmd(textInput.value);
        if (nativeInput.value && !textInput.value) textInput.value = toYmd(nativeInput.value);

        textInput.addEventListener('blur', () => {
            const v = toYmd(textInput.value);
            textInput.value = v;
            nativeInput.value = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
        });

        nativeInput.addEventListener('change', () => {
            const v = toYmd(nativeInput.value);
            if (v) textInput.value = v;
        });
    }

    // 将界面输入 YYYY-MM-DD（HTML5 date input 格式）→ 后端存储 YYYY-MM-DD
    normalizeDateForStorage(value) {
        if (!value) return '';
        // HTML5 date input 的值已经是 YYYY-MM-DD 格式
        const v = value.trim();
        // 验证格式：YYYY-MM-DD
        const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) {
            const mm = m[2].padStart(2, '0');
            const dd = m[3].padStart(2, '0');
            return `${m[1]}-${mm}-${dd}`;
        }
        // 如果不是标准格式，尝试转换（兼容旧的手动输入）
        const normalized = v.replace(/[./年月日]/g, '-').replace(/\/+/g, '-');
        const m2 = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m2) {
            const mm = m2[2].padStart(2, '0');
            const dd = m2[3].padStart(2, '0');
            return `${m2[1]}-${mm}-${dd}`;
        }
        return value; // 格式不对就原样返回，避免卡死用户
    }

    // 将后端月份 YYYY-MM → 界面显示 YYYY/MM
    formatMonthForDisplay(value) {
        if (!value) return '';
        return value.replace(/-/g, '/');
    }

    // 将界面输入 YYYY/MM 或 YYYY-MM → 后端存储 YYYY-MM
    normalizeMonthForStorage(value) {
        if (!value) return '';
        const v = value.trim().replace(/[./年月]/g, '-').replace(/\/+/g, '-');
        const m = v.match(/^(\d{4})-(\d{1,2})$/);
        if (!m) return value;
        const mm = m[2].padStart(2, '0');
        return `${m[1]}-${mm}`;
    }

    // 保存个人档案
    async saveProfile() {
        const userId = getCurrentUserId();
        if (!userId) return;

        const profileData = {
            basic_info: {
                nickname: document.getElementById('nickname').value,
                gender: document.getElementById('gender').value,
                birth_date: this.normalizeDateForStorage(document.getElementById('birthDate').value),
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value
            },
            education_info: {
                school: document.getElementById('school').value,
                major: document.getElementById('major').value,
                degree: document.getElementById('degree').value,
                grade: document.getElementById('grade').value,
                expected_graduation: this.normalizeMonthForStorage(document.getElementById('expectedGraduation').value),
                gpa: document.getElementById('gpa').value
            },
            skills: this.collectSkills()
        };

        console.log('保存档案数据:', JSON.stringify(profileData, null, 2));

        this.showLoading();
        const result = await updateProfile(userId, profileData);
        this.hideLoading();

        console.log('保存结果:', result);

        if (result.success) {
            this.showToast('档案保存成功', 'success');
            if (result.data.profile_completeness) {
                document.getElementById('profileCompleteness').textContent = 
                    result.data.profile_completeness + '%';
            }
        } else {
            this.showToast(result.msg || '保存失败', 'error');
        }
    }

    // 收集技能数据
    collectSkills() {
        const skills = [];
        document.querySelectorAll('.skill-category').forEach(category => {
            const categoryName = category.querySelector('.skill-category-input').value;
            const itemsStr = category.querySelector('.skill-items-input').value;
            if (categoryName && itemsStr) {
                skills.push({
                    category: categoryName,
                    items: itemsStr.split(',').map(s => s.trim()).filter(s => s)
                });
            }
        });
        return skills;
    }

    // 添加技能分类
    addSkillCategory() {
        const container = document.getElementById('skillsContainer');
        const div = document.createElement('div');
        div.className = 'skill-category';
        div.innerHTML = `
            <input type="text" placeholder="技能分类 (如: 编程语言)" class="skill-category-input">
            <input type="text" placeholder="技能列表 (用逗号分隔)" class="skill-items-input">
        `;
        container.appendChild(div);
    }

    // 查看完整档案
    async viewCompleteProfile() {
        const userId = getCurrentUserId();
        if (!userId) return;

        this.showLoading();
        const result = await getProfile(userId);
        this.hideLoading();

        if (result.success) {
            this.showProfileModal(result.data);
        }
    }

    // 显示档案模态框
    showProfileModal(data) {
        const modal = document.getElementById('profileModal');
        const content = document.getElementById('profileModalContent');
        
        let html = '<div class="profile-tables">';
        
        if (data.basic_info) {
            html += `
                <div class="profile-section">
                    <h4>基本信息</h4>
                    <table class="profile-table">
                        <tr><th>姓名</th><td>${data.basic_info.nickname || '-'}</td></tr>
                        <tr><th>性别</th><td>${data.basic_info.gender || '-'}</td></tr>
                        <tr><th>出生日期</th><td>${data.basic_info.birth_date || '-'}</td></tr>
                        <tr><th>手机号</th><td>${data.basic_info.phone || '-'}</td></tr>
                        <tr><th>邮箱</th><td>${data.basic_info.email || '-'}</td></tr>
                    </table>
                </div>
            `;
        }
        
        if (data.education_info) {
            html += `
                <div class="profile-section">
                    <h4>教育信息</h4>
                    <table class="profile-table">
                        <tr><th>学校</th><td>${data.education_info.school || '-'}</td></tr>
                        <tr><th>专业</th><td>${data.education_info.major || '-'}</td></tr>
                        <tr><th>学历</th><td>${data.education_info.degree || '-'}</td></tr>
                        <tr><th>年级</th><td>${data.education_info.grade || '-'}</td></tr>
                        <tr><th>预计毕业时间</th><td>${data.education_info.expected_graduation || '-'}</td></tr>
                        <tr><th>GPA</th><td>${data.education_info.gpa || '-'}</td></tr>
                    </table>
                </div>
            `;
        }
        
        if (data.skills && data.skills.length > 0) {
            html += `
                <div class="profile-section">
                    <h4>技能</h4>
                    <table class="profile-table">
            `;
            data.skills.forEach(skill => {
                html += `<tr><th>${skill.category}</th><td>${skill.items.join(', ')}</td></tr>`;
            });
            html += `
                    </table>
                </div>
            `;
        }
        
        if (data.certificates && data.certificates.length > 0) {
            html += `
                <div class="profile-section">
                    <h4>证书</h4>
                    <table class="profile-table">
            `;
            data.certificates.forEach(cert => {
                html += `<tr><th>${cert.name}</th><td>${cert.issue_date || '-'}</td></tr>`;
            });
            html += `
                    </table>
                </div>
            `;
        }
        
        if (data.profile_completeness !== undefined) {
            html += `
                <div class="profile-section">
                    <h4>档案完整度</h4>
                    <table class="profile-table">
                        <tr><th>完整度</th><td><span class="completeness-badge">${data.profile_completeness}%</span></td></tr>
                    </table>
                </div>
            `;
        }
        
        html += '</div>';
        
        content.innerHTML = html;
        modal.classList.remove('hidden');
    }

    // 处理简历上传
    async handleResumeUpload(file) {
        if (!file) return;

        if (file.type !== 'application/pdf') {
            this.showToast('请上传PDF格式的简历', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showToast('文件大小不能超过10MB', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.textContent = '上传中...';
        statusDiv.style.background = '#e0f2fe';

        const result = await uploadResume(userId, file);

        if (result.success) {
            statusDiv.textContent = '上传成功，正在解析...';
            statusDiv.style.background = '#dcfce7';
            
            // 轮询获取解析结果
            this.pollResumeParseResult(userId, result.data.task_id);
        } else {
            statusDiv.textContent = '上传失败: ' + result.msg;
            statusDiv.style.background = '#fee2e2';
        }
    }

    // 轮询简历解析结果
    async pollResumeParseResult(userId, taskId, maxAttempts = 10) {
        let attempts = 0;
        const statusDiv = document.getElementById('uploadStatus');

        const poll = async () => {
            if (attempts >= maxAttempts) {
                statusDiv.textContent = '解析超时，请稍后查看';
                return;
            }

            const result = await getResumeParseResult(userId, taskId);

            if (result.success) {
                if (result.data.status === 'completed') {
                    statusDiv.textContent = '解析完成！已自动填充档案信息';
                    statusDiv.style.background = '#dcfce7';
                    
                    // 如果后端返回了解析后的档案结构，转换后填充表单并自动保存
                    const parsedData = result.data.parsed_data || result.data.profile || null;
                    const hasValidData = parsedData && typeof parsedData === 'object' &&
                        ((parsedData.basic_info && Object.keys(parsedData.basic_info).some(k => {
                            const v = parsedData.basic_info[k];
                            return v != null && String(v).trim() !== '';
                        })) ||
                        (Array.isArray(parsedData.education) && parsedData.education.length > 0) ||
                        (Array.isArray(parsedData.skills) && parsedData.skills.length > 0));

                    if (hasValidData) {
                        try {
                            const profileData = this.transformParsedResumeData(parsedData);
                            this.fillProfileFormFromResume(profileData);
                            await this.saveProfile();
                            this.showToast('简历解析完成，档案已保存，正在重新生成能力画像…', 'success');
                            // 用新档案重新生成能力画像，这样「能力画像」和「岗位匹配」会随新简历更新
                            aiGenerateAbilityProfile(userId, 'profile').then((res) => {
                                if (res.success) {
                                    this.showToast('能力画像已更新，岗位匹配将基于新简历', 'success');
                                }
                            }).catch(() => {});
                        } catch (e) {
                            console.error('应用简历解析结果到表单时出错:', e);
                            this.showToast('填充失败: ' + (e.message || '未知错误'), 'error');
                        }
                    } else {
                        statusDiv.textContent = '解析完成，但未提取到有效信息（请确保PDF为文本型）';
                        statusDiv.style.background = '#fef3c7';
                        this.showToast('简历解析未提取到有效信息，请检查PDF是否为可复制文本型', 'warning');
                    }

                    const fileInput = document.getElementById('resumeUpload');
                    if (fileInput) fileInput.value = '';
                    this.loadDashboardData();
                } else if (result.data.status === 'failed') {
                    statusDiv.textContent = '解析失败，请重试';
                    statusDiv.style.background = '#fee2e2';
                } else {
                    attempts++;
                    setTimeout(poll, 3000);
                }
            } else {
                attempts++;
                setTimeout(poll, 3000);
            }
        };

        poll();
    }

    // 持久化：保存最近一次测评报告 ID（按用户）
    saveLastAssessmentReportId(reportId) {
        const userId = getCurrentUserId();
        if (userId && reportId) localStorage.setItem('last_assessment_report_id_' + userId, reportId);
    }

    // 恢复：读取当前用户最近一次测评报告 ID
    getLastAssessmentReportId() {
        const userId = getCurrentUserId();
        return userId ? localStorage.getItem('last_assessment_report_id_' + userId) : null;
    }

    // 是否有历史报告（兼容 last_assessment_report_id_ 与 report_history_ 两种 key）
    hasHistoryReport() {
        const id1 = this.getLastAssessmentReportId();
        if (id1) return true;
        const userId = getCurrentUserId();
        if (!userId) return false;
        const raw = localStorage.getItem('report_history_' + userId);
        if (!raw) return false;
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.length > 0 : !!raw;
        } catch (_) {
            return !!raw;
        }
    }

    // 加载职业测评数据
    async loadAssessmentData() {
        const userId = getCurrentUserId();
        if (!userId) return;

        const savedReportId = this.getLastAssessmentReportId();
        if (savedReportId) this.currentReportId = savedReportId;

        // 有历史报告时：不显示问卷，显示「查看最新报告」和「重新测评」
        if (this.hasHistoryReport() && this.currentReportId) {
            this.showAssessmentWelcomeWithHistory();
            return;
        }

        // 无历史报告：拉取问卷并直接显示
        await this.fetchAndShowQuestionnaire();
    }

    // 有历史报告时展示的入口（两个按钮）
    showAssessmentWelcomeWithHistory() {
        const container = document.getElementById('questionnaireContainer');
        const actionsEl = document.getElementById('assessmentActions');
        if (actionsEl) actionsEl.classList.add('hidden');
        container.innerHTML = `
            <div class="assessment-welcome-card">
                <p class="assessment-welcome-text">您已有测评报告，可查看最新报告或重新测评。</p>
                <div class="assessment-welcome-actions">
                    <button type="button" id="btnViewLatestReport" class="btn-primary">查看最新报告</button>
                    <button type="button" id="btnRetakeAssessment" class="btn-secondary">重新测评</button>
                </div>
            </div>
        `;
        document.getElementById('btnViewLatestReport')?.addEventListener('click', () => {
            this.showPage('reportPage');
            this.loadAssessmentReportContent(this.currentReportId);
        });
        document.getElementById('btnRetakeAssessment')?.addEventListener('click', () => {
            if (!confirm('重新测评将生成新报告，是否继续？')) return;
            this.fetchAndShowQuestionnaire();
        });
    }

    // 拉取问卷并显示（用于首次进入或点击「重新测评」后）
    async fetchAndShowQuestionnaire() {
        const userId = getCurrentUserId();
        if (!userId) return;
        const assessmentType = 'comprehensive';
        const container = document.getElementById('questionnaireContainer');
        const actionsEl = document.getElementById('assessmentActions');
        container.innerHTML = '<div class="loading-message">加载问卷中...</div>';
        if (actionsEl) actionsEl.classList.add('hidden');

        this.showLoading();
        const result = await getQuestionnaire(userId, assessmentType);
        this.hideLoading();

        if (result.success) {
            this.currentAssessmentId = result.data.assessment_id || null;
            this._assessmentStartTime = Date.now();
            this.renderQuestionnaire(result.data);
            if (actionsEl) actionsEl.classList.remove('hidden');
            document.getElementById('submitAssessmentBtn').classList.remove('hidden');
            const viewBtn = document.getElementById('viewReportBtn');
            if (viewBtn) {
                viewBtn.classList.add('hidden');
                viewBtn.disabled = false;
                viewBtn.classList.remove('view-report-generating');
            }
        } else {
            container.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '') + '</div>';
        }
    }

    // 渲染测评问卷
    renderQuestionnaire(assessmentData) {
        const container = document.getElementById('questionnaireContainer');
        const actionsEl = document.getElementById('assessmentActions');
        container.innerHTML = '';

        console.log('renderQuestionnaire - assessmentData:', assessmentData);

        if (!assessmentData || assessmentData.dimensions == null) {
            console.error('renderQuestionnaire - Invalid assessmentData:', assessmentData);
            container.innerHTML = '<div class="hint-text">数据格式错误，请重试</div>';
            if (actionsEl) actionsEl.classList.remove('hidden');
            return;
        }

        const dimensions = assessmentData.dimensions;
        const dimensionsList = Array.isArray(dimensions) ? dimensions : [];

        try {
            dimensionsList.forEach((dimension, dimIndex) => {
                if (!dimension || typeof dimension !== 'object') return;
                const dimensionDiv = document.createElement('div');
                dimensionDiv.className = 'dimension-section';
                const questions = Array.isArray(dimension.questions) ? dimension.questions : [];
                let questionsHtml = '';
                questions.forEach((q, qIndex) => {
                    if (!q || typeof q !== 'object') return;
                    let optionsHtml = '';
                    let options = Array.isArray(q.options) ? q.options : [];
                    // 量表题可能只有 labels 没有 options，前端兜底生成选项
                    if (options.length === 0 && Array.isArray(q.labels) && q.labels.length > 0) {
                        options = q.labels.map((text, i) => ({
                            option_id: String(i + 1),
                            option_text: text || '',
                            score: i + 1
                        }));
                    }
                    const safeOption = (opt) => (opt && typeof opt === 'object' ? opt : { option_id: '', option_text: '' });
                    options.forEach((option) => {
                        const o = safeOption(option);
                        const name = `question_${q.question_id || qIndex}`;
                        const type = (q.question_type === 'scale') ? 'scale' : 'single_choice';
                        optionsHtml += `
                            <label class="option-item ${type === 'scale' ? 'scale-option' : ''}">
                                <input type="radio" name="${name}" value="${o.option_id || ''}">
                                <span>${o.option_text || ''}</span>
                            </label>
                        `;
                    });

                    questionsHtml += `
                        <div class="question-card" data-question-id="${q.question_id || ''}" data-question-type="${q.question_type || 'single_choice'}">
                            <div class="question-header">
                                <div class="question-number">${qIndex + 1}</div>
                                <div class="question-text">${q.question_text != null ? q.question_text : ''}</div>
                            </div>
                            <div class="options">${optionsHtml}</div>
                        </div>
                    `;
                });

                const dimName = (dimension.dimension_name != null) ? dimension.dimension_name : '未命名维度';
                dimensionDiv.innerHTML = `
                    <div class="dimension-header">
                        <h3>${dimName}</h3>
                    </div>
                    <div class="dimension-questions">
                        ${questionsHtml}
                    </div>
                `;

                container.appendChild(dimensionDiv);
            });
        } catch (err) {
            console.error('renderQuestionnaire 渲染异常:', err);
            container.innerHTML = '<div class="hint-text">部分题目渲染失败，请刷新重试。若可看到题目，仍可作答并提交。</div>';
        }

        // 无论是否报错都显示提交按钮
        if (actionsEl) actionsEl.classList.remove('hidden');

        // 添加选项点击效果（安全：querySelectorAll 总返回 NodeList，可 forEach）
        const optionItems = container.querySelectorAll('.option-item');
        if (optionItems && optionItems.forEach) {
            optionItems.forEach((item) => {
                item.addEventListener('click', function() {
                    const radio = this.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;
                    const name = radio && radio.name;
                    if (name) {
                        container.querySelectorAll(`input[name="${name}"]`).forEach((r) => {
                            const parent = r.closest('.option-item');
                            if (parent) parent.classList.remove('selected');
                        });
                    }
                    this.classList.add('selected');
                });
            });
        }
    }

    // 提交测评（答案格式符合文档：{ question_id, answer }，answer 为 option_id 如 "A" 或量表 1-5）
    async submitAssessment() {
        if (!this.currentAssessmentId) {
            this.showToast('请先加载测评问卷', 'error');
            return;
        }

        const answers = [];
        const questions = document.querySelectorAll('.question-card');

        questions.forEach(questionCard => {
            const selectedOption = questionCard.querySelector('input[type="radio"]:checked');
            if (selectedOption) {
                const questionId = selectedOption.name.replace('question_', '');
                let answer = selectedOption.value;
                if (questionCard.dataset.questionType === 'scale') {
                    answer = parseInt(answer, 10) || answer;
                }
                answers.push({ question_id: questionId, answer: answer });
            }
        });

        if (answers.length < questions.length) {
            this.showToast('请回答所有问题', 'error');
            return;
        }

        if (!this.currentAssessmentId) {
            this.showToast('请先加载问卷', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const timeSpent = Math.max(0, Math.round((Date.now() - (this._assessmentStartTime || Date.now())) / 60000));
        this.showLoading();
        const result = await submitAssessment(userId, this.currentAssessmentId, answers, timeSpent);
        this.hideLoading();

        if (result.success) {
            const reportId = result.data.report_id;
            this.currentReportId = reportId;
            this.saveLastAssessmentReportId(reportId);
            this.showToast('测评提交成功，正在生成报告...', 'success');
            this.setViewReportButtonState('generating');
            
            // 轮询获取报告
            setTimeout(() => {
                this.pollAssessmentReport();
            }, 2000);
        } else {
            this.showToast(result.msg || '提交失败', 'error');
        }
    }

    // 轮询测评报告（3.3）
    async pollAssessmentReport(maxAttempts = 40) {
        if (!this.currentReportId) {
            this.showToast('报告ID不存在', 'error');
            return;
        }

        const userId = getCurrentUserId();
        let attempts = 0;
        const container = document.getElementById('questionnaireContainer');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'assessment-status';
        statusDiv.style.cssText = 'padding: 20px; text-align: center; background: #f0f9ff; border-radius: 8px; margin: 20px 0;';
        container.appendChild(statusDiv);

        const poll = async () => {
            if (attempts >= maxAttempts) {
                statusDiv.innerHTML = '<p style="color: #dc2626;">报告生成超时，请稍后查看</p>';
                return;
            }

            const result = await getAssessmentReport(userId, this.currentReportId);

            if (result.success) {
                if (result.data.status === 'completed') {
                    this.saveLastAssessmentReportId(this.currentReportId);
                    statusDiv.remove();
                    this.setViewReportButtonState('ready');
                    // 切换到报告页面
                    this.showPage('reportPage');
                    // 渲染报告内容
                    this.renderReportContent(result.data);
                    this.showToast('报告生成完成！', 'success');
                } else if (result.data.status === 'failed') {
                    statusDiv.innerHTML = `<p style="color: #dc2626;">报告生成失败: ${result.data.error || '未知错误'}</p>`;
                    this.setViewReportButtonState('ready');
                } else {
                    // processing：保持按钮为「报告生成中…」禁用态
                    this.setViewReportButtonState('generating');
                    attempts++;
                    statusDiv.innerHTML = `<p>报告生成中... (${attempts * 3}秒)</p>`;
                    setTimeout(poll, 3000);
                }
            } else {
                this.setViewReportButtonState('generating');
                attempts++;
                statusDiv.innerHTML = `<p>获取报告状态中... (${attempts * 3}秒)</p>`;
                setTimeout(poll, 3000);
            }
        };

        poll();
    }

    // 更新「查看测评报告」按钮状态：generating = 禁用灰字「报告生成中…」，ready = 可点「查看测评报告 →」
    setViewReportButtonState(state) {
        const btn = document.getElementById('viewReportBtn');
        if (!btn) return;
        btn.classList.remove('hidden');
        if (state === 'generating') {
            btn.disabled = true;
            btn.classList.add('view-report-generating');
            btn.textContent = '报告生成中…';
        } else {
            btn.disabled = false;
            btn.classList.remove('view-report-generating');
            btn.textContent = '查看测评报告 →';
            btn.classList.add('view-report-ready-flash');
            setTimeout(() => btn.classList.remove('view-report-ready-flash'), 600);
        }
    }

    // 查看测评报告（手动触发）
    async viewAssessmentReport() {
        if (!this.currentReportId) {
            this.showToast('请先完成并提交测评', 'error');
            return;
        }
        const userId = getCurrentUserId();
        this.showLoading();
        const result = await getAssessmentReport(userId, this.currentReportId);
        this.hideLoading();

        if (result.success) {
            this.showPage('reportPage');
            this.renderReportContent(result.data);
        } else {
            this.showToast('获取报告失败: ' + (result.msg || '未知错误'), 'error');
        }
    }

    // 加载岗位匹配数据（能力画像已独立到「能力画像」页）
    async loadMatchingData() {
        await this.loadRecommendedJobs();
        await this.loadJobList();
    }

    // 加载学生能力画像
    async loadAbilityProfile() {
        const userId = getCurrentUserId();
        const container = document.getElementById('abilityProfileContent');
        if (!container) return;

        container.innerHTML = '<div class="loading-message">加载能力画像中...</div>';
        const result = await getAbilityProfile(userId);

        if (result.success && result.data) {
            this.renderAbilityProfile(result.data, container);
        } else {
            container.innerHTML = '<div class="hint-text">暂无能力画像，请先完善个人档案并完成测评</div>';
        }
    }

    // AI生成学生能力画像
    async aiGenerateAbilityProfile() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        this.showLoading();
        const result = await aiGenerateAbilityProfile(userId, 'profile');
        this.hideLoading();

        if (result.success) {
            this.showToast('AI画像生成中，请稍后刷新页面查看', 'success');
            // 3秒后自动刷新能力画像
            setTimeout(() => {
                this.loadAbilityProfile();
            }, 3000);
        } else {
            this.showToast(result.msg || '生成失败', 'error');
        }
    }

    // 更新学生能力画像
    async updateAbilityProfile(updates) {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        this.showLoading();
        const result = await updateAbilityProfile(userId, updates);
        this.hideLoading();

        if (result.success) {
            this.showToast('画像更新成功', 'success');
            // 刷新能力画像
            this.loadAbilityProfile();
        } else {
            this.showToast(result.msg || '更新失败', 'error');
        }
    }

    // 渲染学生能力画像（符合 API 文档 §5）
    renderAbilityProfile(data, container) {
        const bi = data.basic_info || {};
        const ps = data.professional_skills || {};
        const cert = data.certificates || {};
        const innovation = data.innovation_ability || {};
        const learning = data.learning_ability || {};
        const pressure = data.pressure_resistance || {};
        const comm = data.communication_ability || {};
        const exp = data.practical_experience || {};
        const overall = data.overall_assessment || {};

        const skillItem = (arr, key) => (arr || []).map(item => {
            const name = item[key] || item.skill || item.domain || '-';
            const level = item.level || '';
            const score = item.score != null ? ` ${item.score}分` : '';
            return `<span class="ability-tag">${name}${level ? '(' + level + ')' : ''}${score}</span>`;
        }).join('') || '<span class="hint-text">暂无</span>';

        let html = `
            <div class="ability-profile-grid">
                <div class="ability-profile-card">
                    <h3>📋 基础信息</h3>
                    <div class="ability-section">
                        <p><strong>学历:</strong> ${bi.education || '-'} | <strong>专业:</strong> ${bi.major || '-'}</p>
                        <p><strong>学校:</strong> ${bi.school || '-'} | <strong>GPA:</strong> ${bi.gpa || '-'}</p>
                        <p><strong>预计毕业:</strong> ${bi.expected_graduation || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>💻 专业技能</h3>
                    <div class="ability-section">
                        <p><strong>编程语言:</strong> ${skillItem(ps.programming_languages, 'skill')}</p>
                        <p><strong>框架工具:</strong> ${skillItem(ps.frameworks_tools, 'skill')}</p>
                        <p><strong>领域知识:</strong> ${skillItem(ps.domain_knowledge, 'domain')}</p>
                        <p><strong>综合技能得分:</strong> <span class="score-highlight">${ps.overall_score ?? '-'}分</span></p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>🏆 证书资质</h3>
                    <div class="ability-section">
                        ${(cert.items || []).length ? (cert.items.map(c => `<p>${c.name || '-'} ${c.level ? '(' + c.level + ')' : ''}</p>`).join('')) : '<p class="hint-text">暂无</p>'}
                        <p><strong>竞争力:</strong> ${cert.competitiveness || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>✨ 创新能力</h3>
                    <div class="ability-section">
                        <p><strong>项目:</strong> ${(innovation.projects || []).map(p => p.name).join('、') || '-'}</p>
                        <p><strong>竞赛:</strong> ${(innovation.competitions || []).map(c => c.name + (c.award ? '(' + c.award + ')' : '')).join('、') || '-'}</p>
                        <p><strong>得分:</strong> ${innovation.score ?? '-'} | <strong>等级:</strong> ${innovation.level || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>📚 学习能力</h3>
                    <div class="ability-section">
                        <p><strong>得分:</strong> ${learning.score ?? '-'} | <strong>等级:</strong> ${learning.level || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>💪 压力承受能力</h3>
                    <div class="ability-section">
                        <p><strong>得分:</strong> ${pressure.score ?? '-'} | <strong>等级:</strong> ${pressure.level || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>💬 沟通能力</h3>
                    <div class="ability-section">
                        <p><strong>得分:</strong> ${comm.overall_score ?? '-'} | <strong>等级:</strong> ${comm.level || '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card">
                    <h3>📁 实习/项目经验</h3>
                    <div class="ability-section">
                        <p><strong>实习:</strong> ${(exp.internships || []).map(i => `${i.company} - ${i.position}`).join('；') || '-'}</p>
                        <p><strong>项目:</strong> ${(exp.projects || []).map(p => `${p.name}(${p.role || ''})`).join('；') || '-'}</p>
                        <p><strong>综合得分:</strong> ${exp.overall_score ?? '-'}</p>
                    </div>
                </div>
                <div class="ability-profile-card highlight">
                    <h3>📊 综合评估</h3>
                    <div class="ability-section">
                        <p><strong>总分:</strong> <span class="score-highlight">${overall.total_score ?? '-'}</span> | <strong>百分位:</strong> ${overall.percentile ?? '-'} | <strong>竞争力:</strong> ${overall.competitiveness || '-'}</p>
                        <p><strong>优势:</strong> ${(overall.strengths || []).join('；') || '-'}</p>
                        <p><strong>待提升:</strong> ${(overall.weaknesses || []).join('；') || '-'}</p>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }

    // 加载推荐岗位
    async loadRecommendedJobs() {
        const userId = getCurrentUserId();
        const container = document.getElementById('recommendedJobs');
        if (!container) return;

        container.innerHTML = '<div class="loading-message">加载推荐岗位中...</div>';
        const result = await getRecommendedJobs(userId, 24);

        const recommendations = result.data?.recommendations ?? result.data?.jobs ?? [];
        this.currentRecommendations = recommendations || [];
        this.recFilter = 'all';

        if (result.success && this.currentRecommendations.length) {
            this.updateRecStats(this.currentRecommendations);
            this.renderRecommendedJobs(this.currentRecommendations, container);
            this.bindRecStatTiles();
            this.bindRecCardClicks();
        } else {
            container.innerHTML = '<div class="hint-text">暂无推荐岗位，请先完善能力画像</div>';
            this.updateRecStats([]);
        }
    }

    updateRecStats(recommendations) {
        const total = recommendations.length;
        const high = recommendations.filter(r => (r.match_score ?? 0) >= 85).length;
        const mid = recommendations.filter(r => { const s = r.match_score ?? 0; return s >= 65 && s < 85; }).length;
        const low = recommendations.filter(r => (r.match_score ?? 0) < 65).length;
        const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
        set('recStatAll', total);
        set('recStatHigh', high);
        set('recStatMid', mid);
        set('recStatLow', low);
        const badge = document.getElementById('recBadge');
        if (badge) { badge.textContent = total; badge.style.display = total ? 'inline' : 'none'; }
        const title = document.getElementById('cardsTitle');
        if (title) title.textContent = `全部推荐岗位 · ${total} 个`;
    }

    bindRecStatTiles() {
        document.querySelectorAll('#matchingPage .stat-tile').forEach(tile => {
            tile.onclick = () => {
                const filter = tile.dataset.filter;
                this.recFilter = filter;
                document.querySelectorAll('#matchingPage .stat-tile').forEach(t => t.classList.remove('active'));
                tile.classList.add('active');
                const highN = this.currentRecommendations.filter(r => (r.match_score ?? 0) >= 85).length;
                const midN = this.currentRecommendations.filter(r => { const s = r.match_score ?? 0; return s >= 65 && s < 85; }).length;
                const lowN = this.currentRecommendations.filter(r => (r.match_score ?? 0) < 65).length;
                const titles = {
                    all: `全部推荐岗位 · ${this.currentRecommendations.length} 个`,
                    high: `高度匹配 · ${highN} 个`,
                    mid: `较为匹配 · ${midN} 个`,
                    low: `一般匹配 · ${lowN} 个`
                };
                const titleEl = document.getElementById('cardsTitle');
                if (titleEl) titleEl.textContent = titles[filter] || titles.all;
                document.querySelectorAll('#matchingPage .job-card-match').forEach(card => {
                    const level = card.dataset.level || 'mid';
                    card.style.display = (filter === 'all' || level === filter) ? '' : 'none';
                });
            };
        });
    }

    bindRecCardClicks() {
        document.querySelectorAll('#matchingPage .job-card-match[data-rec-index]').forEach(card => {
            card.onclick = (e) => {
                if (e.target.closest('.analyze-btn')) return;
                const idx = parseInt(card.dataset.recIndex, 10);
                const rec = this.currentRecommendations[idx];
                if (rec) {
                    this.switchTab('analysis');
                    const select = document.getElementById('jobSelect');
                    if (select) { select.value = rec.job_id || rec.job_name; }
                    this.analyzeJobMatch();
                }
            };
        });
        document.querySelectorAll('#matchingPage .analyze-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const card = btn.closest('.job-card-match');
                const idx = card ? parseInt(card.dataset.recIndex, 10) : -1;
                const rec = idx >= 0 ? this.currentRecommendations[idx] : null;
                if (rec) {
                    this.switchTab('analysis');
                    const select = document.getElementById('jobSelect');
                    if (select) select.value = rec.job_id || rec.job_name;
                    this.analyzeJobMatch();
                }
            };
        });
    }

    // 渲染推荐岗位（新 UI：统计栏 + 卡片网格 + 分析匹配按钮）
    renderRecommendedJobs(recommendations, container) {
        const filter = this.recFilter || 'all';
        const list = recommendations || [];
        const level = (score) => (score >= 85 ? 'high' : score >= 65 ? 'mid' : 'low');
        const badgeText = (score) => (score >= 85 ? '高度匹配' : score >= 65 ? '较为匹配' : '一般匹配');
        const companyLogoColors = ['#1a3fa8', '#0d7a3e', '#d4380d', '#d48806', '#722ed1', '#cf1322', '#096dd9', '#389e0d', '#531dab', '#08979c'];
        const getLogoColor = (i) => companyLogoColors[i % companyLogoColors.length];

        container.innerHTML = list.map((rec, i) => {
            const job = rec.job_name ? rec : { job_name: rec.job_name || '-', job_id: rec.job_id, ...rec };
            const matchScore = rec.match_score ?? 0;
            const lev = level(matchScore);
            const jobInfo = rec.job_info || {};
            const dims = (rec.dimension_scores && Object.entries(rec.dimension_scores).slice(0, 4)) || [];
            const dimHtml = dims.map(([k, d]) => {
                const s = d && (d.score != null) ? d.score : 0;
                const cls = s >= 80 ? 'ok' : s >= 60 ? 'warn' : '';
                const label = { basic_requirements: '基础✓', professional_skills: '技能', soft_skills: '素养', development_potential: '潜力' }[k] || k;
                return `<span class="dim-pill ${cls}">${label} ${s >= 80 ? '✓' : s >= 60 ? '⚡' : ''}</span>`;
            }).join('') || '<span class="dim-pill">匹配度 ' + matchScore + '%</span>';

            return `<div class="job-card-match ${lev}" data-level="${lev}" data-rec-index="${i}" style="${filter !== 'all' && lev !== filter ? 'display:none' : ''}">
                <div class="card-head">
                    <div style="display:flex;align-items:flex-start;flex:1;gap:10px;">
                        <div class="card-co-logo" style="background:${getLogoColor(i)}">${(jobInfo.company || job.job_name || '岗').slice(0, 2)}</div>
                        <div class="card-co-info">
                            <div class="card-job-name">${job.job_name || '-'}</div>
                            <div class="card-co-name">${jobInfo.company || '多家公司'} · ${jobInfo.location || '-'}</div>
                        </div>
                    </div>
                    <span class="match-badge badge-${lev}">${badgeText(matchScore)}</span>
                </div>
<<<<<<< Updated upstream
                <div class="card-match-row">
                    <div class="match-pct-big pct-${lev}">${matchScore}%</div>
                    <div class="match-bar-wrap"><div class="match-bar-bg"><div class="match-bar-fill fill-${lev}" style="width:${matchScore}%"></div></div></div>
                </div>
                <div class="match-dim-pills">${dimHtml}</div>
                <div class="card-footer">
                    <span class="card-salary">${jobInfo.salary || '-'}</span>
                    <button type="button" class="analyze-btn">分析匹配 →</button>
                </div>
            </div>`;
        }).join('');

        this.bindRecCardClicks();
    }

    // 渲染岗位列表（搜索等场景，按图2模板：多色 logo、技能标签、预估匹配、分析匹配）
    renderJobs(jobs, container) {
        if (!container) return;
        const list = jobs || [];
        if (list.length === 0) {
            container.innerHTML = '<p class="hint-text">未找到相关岗位</p>';
            return;
        }
        const companyLogoColors = ['#2f54eb', '#d4380d', '#d46b08', '#08979c', '#531dab', '#1d39c4', '#0d7a3e', '#722ed1', '#096dd9', '#389e0d'];
        const getLogoColor = (i) => companyLogoColors[i % companyLogoColors.length];
        const tags = (job) => (job.tags || job.required_skills || []).slice(0, 4).map(t => `<span class="src-tag">${t}</span>`).join('');
        container.innerHTML = list.map((job, i) => {
            const name = job.job_name || '-';
            const abbr = (name.slice(0, 1) || '岗');
            const loc = job.location || job.job_info?.location || '';
            const salary = job.avg_salary || job.salary || job.job_info?.salary || '-';
            const matchPct = job.match_score != null ? job.match_score : (85 - i * 3);
            return `<div class="search-result-card" data-job-id="${job.job_id || ''}" data-job-name="${(job.job_name || '').replace(/"/g, '&quot;')}">
                <div class="src-head">
                    <div class="src-logo" style="background:${getLogoColor(i)}">${abbr}</div>
                    <div><div class="src-name">${name}</div><div class="src-co">${job.industry || job.company || job.job_info?.company || '-'}</div></div>
                </div>
                <div class="src-tags">${tags(job)}${loc ? `<span class="src-tag">📍${loc}</span>` : ''}</div>
                <div class="src-footer">
                    <span class="src-salary">${salary}${String(salary).includes('/') ? '' : '/月'}</span>
                    <span class="src-match">预估匹配 ${matchPct}%</span>
                    <button type="button" class="src-btn">分析匹配</button>
                </div>
            </div>`;
        }).join('');
        container.querySelectorAll('.search-result-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('src-btn')) {
                    e.stopPropagation();
                    const id = card.dataset.jobId || card.dataset.jobName;
                    this.switchTab('analysis');
                    const select = document.getElementById('jobSelect');
                    if (select) select.value = id;
                    this.analyzeJobMatch();
                }
=======
                <div class="job-tags">${tags}</div>
                <div class="job-meta">年薪：${job.avg_salary || '-'}</div>
            `;
            jobCard.style.cursor = 'pointer';
            jobCard.addEventListener('click', () => {
                this.switchTab('analysis');
                const select = document.getElementById('jobSelect');
                if (select) { select.value = job.job_id || job.job_name; this.analyzeJobMatch(); }
>>>>>>> Stashed changes
            });
        });
    }

    // 显示岗位详情（跳转到岗位画像详情）
    showJobDetail(job) {
        if (job.job_id || job.job_name) {
            this.navigateTo('jobProfile');
            setTimeout(() => this.showJobProfileDetail(job.job_id || job.job_name, !job.job_id), 300);
        }
    }

    // 加载岗位列表（用于分析）
    async loadJobList() {
        const result = await getJobList(1, 50);
        
        if (result.success && result.data.list) {
            const select = document.getElementById('jobSelect');
            if (select) {
                // 保留占位符选项
                const placeholderOption = select.querySelector('.placeholder-option');
                select.innerHTML = '';
                if (placeholderOption) {
                    select.appendChild(placeholderOption);
                } else {
                    // 如果没有占位符选项，创建一个
                    const newPlaceholder = document.createElement('option');
                    newPlaceholder.value = '';
                    newPlaceholder.disabled = true;
                    newPlaceholder.selected = true;
                    newPlaceholder.className = 'placeholder-option';
                    newPlaceholder.textContent = '选择一个岗位进行分析';
                    select.appendChild(newPlaceholder);
                }
                // 添加岗位选项
                result.data.list.forEach(job => {
                    const option = document.createElement('option');
                    option.value = job.job_id || job.job_name;
                    option.textContent = job.job_name;
                    select.appendChild(option);
                });
            }
        }
    }

    // ==================== 岗位画像模块（对应 API 文档 §4） ====================

    // 精选列表：返回 featuredJobs 转为列表项格式（job_id, job_name, avg_salary, tags, skills 等）
    getFeaturedJobs() {
        return featuredJobs.map(j => ({
            job_id: j.jobId,
            job_name: j.jobName,
            industry: j.industry,
            level: j.level,
            avg_salary: j.salaryRange,
            tags: j.skills || [],
            skills: j.techSkills || j.skills || [],
            demand_score: j.demandScore,
            growth_trend: j.trend,
        }));
    }

    // 加载岗位画像页面数据（行业下拉 + 从后端加载第一页岗位列表）
    async loadJobProfileData() {
        await this.loadJobIndustries();
        this.updateJobProfileClearButton();
        await this.loadJobProfileList(1);
    }

    // 清空搜索并重新加载第一页（后端会返回全部/精选列表）
    clearJobProfileSearch() {
        const input = document.getElementById('jobProfileKeyword');
        if (input) input.value = '';
        this.updateJobProfileClearButton();
        this.loadJobProfileList(1);
    }

    // 根据搜索框是否有内容显示/隐藏 × 清空按钮
    updateJobProfileClearButton() {
        const input = document.getElementById('jobProfileKeyword');
        const btn = document.getElementById('jobProfileKeywordClear');
        if (!input || !btn) return;
        if ((input.value || '').trim()) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    }

    // 动态加载行业下拉选项
    async loadJobIndustries() {
        const select = document.getElementById('jobProfileIndustry');
        if (!select) return;
        const res = await getJobIndustries();
        const industries = (res.success && res.data && res.data.industries) ? res.data.industries : [];
        select.innerHTML = '<option value="">全部行业</option>';
        industries.forEach(ind => {
            const opt = document.createElement('option');
            opt.value = ind;
            opt.textContent = ind;
            select.appendChild(opt);
        });
    }

    // 4.1 加载岗位画像列表：搜索框为空时只展示精选 12 条（不走接口），有关键词时请求 /api/v1/job/profiles
    async loadJobProfileList(page = 1) {
        const container = document.getElementById('jobProfileList');
        const tipEl = document.getElementById('jobProfileListTip');
        const footerEl = document.getElementById('jobProfileListFooter');
        if (!container) return;

        const keyword = (document.getElementById('jobProfileKeyword')?.value || '').trim();
        const industry = document.getElementById('jobProfileIndustry')?.value || '';
        const level = document.getElementById('jobProfileLevel')?.value || '';
        const size = 12;

        container.innerHTML = '<div class="loading-message">加载岗位列表中...</div>';
        if (tipEl) tipEl.textContent = '';
        if (footerEl) footerEl.innerHTML = '';

        // 搜索框为空时始终展示精选 12 条，不请求接口
        if (!keyword) {
            const list = this.getFeaturedJobs();
            if (tipEl) tipEl.textContent = `精选 ${list.length} 个热门岗位 · 共收录 100+ 岗位`;
            this.renderJobProfileList({ list, total: list.length, page: 1, size }, container);
            if (footerEl) footerEl.innerHTML = '';
            return;
        }

        const result = await getJobProfilesFromBackend(page, size, keyword, industry, level);

        if (!result.success || !result.data) {
            const list = this.getFeaturedJobs();
            if (tipEl) tipEl.textContent = `精选 ${list.length} 个热门岗位 · 共收录 100+ 岗位`;
            this.renderJobProfileList({ list, total: list.length, page: 1, size }, container);
            if (footerEl) footerEl.innerHTML = '';
            return;
        }

        const data = result.data;
        const total = data.total || 0;
        const list = data.list || [];
        const totalPages = data.pages ?? Math.max(1, Math.ceil(total / size));

        if (tipEl) tipEl.innerHTML = `找到 ${total} 个相关岗位 <a href="#" class="job-profile-back-featured" onclick="app.clearJobProfileSearch(); return false;">返回精选列表</a>`;

        if (list.length === 0) {
            container.innerHTML = '<div class="hint-text">暂无相关岗位，试试其他关键词</div>';
            if (footerEl) footerEl.innerHTML = '';
            return;
        }

        this.renderJobProfileList(data, container);
        if (footerEl) this.renderJobProfilePagination(total, data.page || page, size, footerEl, totalPages);
    }

    // 渲染岗位画像列表（新卡片：顶部渐变色条 + 内容区 + 底部两按钮）
    renderJobProfileList(data, container) {
        container.innerHTML = '';
        const list = data.list || [];
        const stripeGradients = [
            'linear-gradient(90deg, #2563eb, #0ea5e9)',
            'linear-gradient(90deg, #0ea5e9, #4f46e5)',
            'linear-gradient(90deg, #4f46e5, #2563eb)',
        ];
        list.forEach((job, idx) => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            const softTags = (job.tags || []).slice(0, 4).map(t => `<span class="tag-soft">${(t + '').replace(/</g, '&lt;')}</span>`).join('');
            const techTags = (job.skills || []).slice(0, 4).map(s => `<span class="tag-tech">${(s + '').replace(/</g, '&lt;')}</span>`).join('');
            const stripeStyle = stripeGradients[idx % 3];
            const jobName = (job.job_name || '-').replace(/</g, '&lt;');
            const industry = (job.industry || '-').replace(/</g, '&lt;');
            const level = (job.level || '-').replace(/</g, '&lt;');
            const salary = (job.avg_salary || '-').replace(/</g, '&lt;');
            const trend = (job.growth_trend || '--').replace(/</g, '&lt;');
            jobCard.innerHTML = `
                <div class="card-stripe" style="background:${stripeStyle}"></div>
                <div class="job-card-inner">
                    <div class="job-card-title">${jobName}</div>
                    <div class="job-card-meta">${industry} | ${level}</div>
                    <div class="card-salary">${salary}</div>
                    <div class="job-card-tags">${softTags}</div>
                    <div class="job-card-tech">${techTags}</div>
                    <div class="job-card-footer">
                        <span class="job-demand-num">${job.demand_score ?? '--'}</span>
                        <span class="job-trend-label">${trend}</span>
                    </div>
                    <div class="card-btns">
                        <button type="button" class="btn-profile" data-job-id="${(job.job_id || '').replace(/"/g, '&quot;')}" data-job-name="${jobName.replace(/"/g, '&quot;')}">📊 岗位画像</button>
                        <button type="button" class="btn-realdata" data-job-name="${jobName.replace(/"/g, '&quot;')}">🗂 真实数据</button>
                    </div>
                </div>
            `;
            jobCard.querySelector('.btn-profile')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showJobProfileDetail(job.job_id || job.job_name, !job.job_id);
            });
            jobCard.querySelector('.btn-realdata')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRealDataModal(job.job_name || jobName);
            });
            container.appendChild(jobCard);
        });
    }

    // 真实数据弹窗：请求 GET /api/v1/job/real-data?jobName=xxx&size=N，展示多条招聘数据
    async showRealDataModal(jobName, size = 5) {
        const modal = document.getElementById('realDataModal');
        const bodyEl = document.getElementById('realDataModalBody');
        const closeBtn = document.getElementById('realDataModalClose');
        if (!modal || !bodyEl) return;
        bodyEl.innerHTML = '<div class="loading-message">加载真实招聘数据中...</div>';
        modal.classList.remove('hidden');
        const res = await getJobRealData(jobName, size);
        if (!res.success || !res.data || res.data.length === 0) {
            bodyEl.innerHTML = '<div class="hint-text">暂无该岗位的真实招聘数据</div>';
        } else {
            let html = '';
            res.data.forEach((item, i) => {
                const desc = (item.description || '').replace(/</g, '&lt;');
                const shortDesc = desc.length > 120 ? desc.slice(0, 120) + '…' : desc;
                const id = 'real-desc-' + i;
                html += `
                    <div class="real-data-item">
                        <div class="real-data-item-header">
                            <span class="real-data-company">${(item.company || '').replace(/</g, '&lt;')}</span>
                            <span class="real-data-title">${(item.jobTitle || '').replace(/</g, '&lt;')}</span>
                            <span class="real-data-salary">${(item.salary || '').replace(/</g, '&lt;')}</span>
                        </div>
                        <div class="real-data-grid">
                            <span class="real-data-cell">${(item.address || '-').replace(/</g, '&lt;')}</span>
                            <span class="real-data-cell">${(item.industry || '-').replace(/</g, '&lt;')}</span>
                            <span class="real-data-cell">${(item.scale || '-').replace(/</g, '&lt;')}</span>
                            <span class="real-data-cell">${(item.companyType || '-').replace(/</g, '&lt;')}</span>
                        </div>
                        <div class="real-data-desc-wrap">
                            <p class="real-data-desc short" id="${id}">${shortDesc}</p>
                            ${desc.length > 120 ? `<button type="button" class="real-data-expand" data-target="${id}" data-full="${(desc || '').replace(/"/g, '&quot;')}">展开</button>` : ''}
                        </div>
                    </div>
                `;
            });
            bodyEl.innerHTML = html;
            bodyEl.querySelectorAll('.real-data-expand').forEach(btn => {
                btn.addEventListener('click', function () {
                    const target = document.getElementById(this.dataset.target);
                    if (!target) return;
                    if (target.classList.contains('short')) {
                        target.textContent = this.dataset.full || target.textContent;
                        target.classList.remove('short');
                        this.textContent = '收起';
                    } else {
                        target.textContent = (this.dataset.full || '').slice(0, 120) + '…';
                        target.classList.add('short');
                        this.textContent = '展开';
                    }
                });
            });
        }
    }

    closeRealDataModal() {
        document.getElementById('realDataModal')?.classList.add('hidden');
    }

    // 分页组件：每页 12 条，圆角按钮，当前页高亮；totalPages 可由后端返回的 pages 传入
    renderJobProfilePagination(total, page, size, footerEl, totalPagesFromApi) {
        const totalPages = totalPagesFromApi != null ? Math.max(1, totalPagesFromApi) : Math.max(1, Math.ceil(total / size));
        page = Math.max(1, Math.min(page, totalPages));
        let html = '<div class="job-profile-pagination">';
        html += `<button type="button" class="pagination-btn pagination-prev" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">上一页</button>`;
        html += '<span class="pagination-pages">';
        const maxShow = 5;
        let start = Math.max(1, page - Math.floor(maxShow / 2));
        let end = Math.min(totalPages, start + maxShow - 1);
        if (end - start + 1 < maxShow) start = Math.max(1, end - maxShow + 1);
        for (let i = start; i <= end; i++) {
            const active = i === page ? ' active' : '';
            html += `<button type="button" class="pagination-btn pagination-num${active}" data-page="${i}">${i}</button>`;
        }
        html += '</span>';
        html += `<button type="button" class="pagination-btn pagination-next" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">下一页</button>`;
        html += `<span class="pagination-info">第 ${page}/${totalPages} 页</span>`;
        html += '</div>';
        footerEl.innerHTML = html;
        footerEl.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page, 10);
                if (p >= 1) {
                    this.loadJobProfileList(p);
                    document.getElementById('jobProfileList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // 4.2 显示岗位详细画像（弹窗 Modal）
    async showJobProfileDetail(jobIdOrName, byName = false) {
        const modal = document.getElementById('jobDetailModal');
        const contentEl = document.getElementById('jobDetailModalContent');
        if (!modal || !contentEl) return;

        contentEl.innerHTML = '<div class="loading-message">加载岗位详情中...</div>';
        modal.classList.remove('hidden');

        const result = await getJobProfileDetail(jobIdOrName, !byName);

        if (result.success) {
            this._currentJobDetail = { job_id: result.data.job_id, job_name: result.data.job_name };
            this.renderJobProfileDetail(result.data, contentEl);
        } else {
            contentEl.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '未知错误') + '</div>';
        }
    }

    closeJobDetailModal() {
        const modal = document.getElementById('jobDetailModal');
        if (modal) modal.classList.add('hidden');
    }

    // 渲染岗位详细画像（新设计：头部 + 主体两列/技能/描述/路径 + 底部按钮）
    renderJobProfileDetail(data, container) {
        const bi = data.basic_info || {};
        const ma = data.market_analysis || {};
        const salary = bi.avg_salary || data.avg_salary || '-';
        const industry = bi.industry || '-';
        const level = bi.level || '-';
        const locations = bi.work_locations ? bi.work_locations.join('、') : '-';
        const scales = bi.company_scales ? bi.company_scales.join('、') : '-';
        const demandScore = ma.demand_score != null ? Number(ma.demand_score) : null;
        const trend = (ma.growth_trend || data.growth_trend || '稳定').trim();
        const trendClass = trend === '上升' ? 'up' : (trend === '下降' ? 'down' : 'stable');
        const trendText = trend === '上升' ? '上升' : (trend === '下降' ? '下降' : '稳定');

        let html = `
            <div class="job-detail-modal-header">
                <div class="job-detail-modal-header-left">
                    <h2 class="job-detail-modal-header-title">${(data.job_name || '-').replace(/</g, '&lt;')}</h2>
                    <p class="job-detail-modal-header-subtitle">${(industry + ' | ' + level).replace(/</g, '&lt;')}</p>
                </div>
                <div class="job-detail-modal-header-salary">${(salary + '').replace(/</g, '&lt;')}</div>
            </div>
            <div class="job-detail-modal-body-inner">
                <div class="job-detail-modal-grid">
                    <div class="job-detail-modal-grid-item"><span class="label">📍 工作地点</span>${(locations + '').replace(/</g, '&lt;')}</div>
                    <div class="job-detail-modal-grid-item"><span class="label">🏢 公司规模</span>${(scales + '').replace(/</g, '&lt;')}</div>
                    <div class="job-detail-modal-grid-item">
                        <span class="label">📈 需求热度</span>${demandScore != null ? demandScore : '-'}
                        ${demandScore != null ? `<div class="job-detail-modal-demand-bar"><div class="job-detail-modal-demand-fill" style="width: ${Math.min(100, demandScore)}%"></div></div>` : ''}
                    </div>
                    <div class="job-detail-modal-grid-item">
                        <span class="label">📊 市场趋势</span><span class="job-detail-modal-trend ${trendClass}">${trendText}</span>
                    </div>
                </div>
        `;

        // 核心技能要求
        const skills = [];
        if (data.requirements && data.requirements.professional_skills) {
            const ps = data.requirements.professional_skills;
            if (ps.programming_languages) ps.programming_languages.forEach(s => { if (s && s.skill) skills.push(s.skill); });
            if (ps.frameworks_tools) ps.frameworks_tools.forEach(s => { if (s && s.skill) skills.push(s.skill); });
        }
        if (data.skills && Array.isArray(data.skills)) data.skills.forEach(s => skills.push(typeof s === 'string' ? s : (s.skill || s.name)));
        if (skills.length > 0) {
            html += `
                <div class="job-detail-block">
                    <h4 class="job-detail-block-title">核心技能要求</h4>
                    <div class="job-detail-skills">${skills.slice(0, 12).map(s => `<span class="job-detail-skill-tag">${(s + '').replace(/</g, '&lt;')}</span>`).join('')}</div>
                </div>`;
        }

        // 岗位描述
        const desc = bi.description || data.description || '';
        html += `
                <div class="job-detail-block">
                    <h4 class="job-detail-block-title">岗位描述</h4>
                    <p class="job-detail-desc">${desc ? (desc + '').replace(/</g, '&lt;').replace(/\n/g, '<br>') : '暂无描述'}</p>
                </div>`;

        // 职业发展路径（箭头连接）
        if (data.career_path && data.career_path.promotion_path && data.career_path.promotion_path.length > 0) {
            const nodes = data.career_path.promotion_path.map(p => (p.level || '').replace(/</g, '&lt;'));
            html += `
                <div class="job-detail-block">
                    <h4 class="job-detail-block-title">职业发展路径</h4>
                    <div class="job-detail-path">${nodes.map((n, i) => (i > 0 ? '<span class="job-detail-path-arrow">→</span>' : '') + `<span class="job-detail-path-node">${n || '-'}</span>`).join('')}</div>
                </div>`;
        }

        html += `
            </div>
            <div class="job-detail-modal-footer">
                <button type="button" class="btn-outline" id="jobDetailBtnGraph">查看关联图谱</button>
                <button type="button" class="btn-primary-solid" id="jobDetailBtnTarget">加入目标岗位</button>
            </div>`;

        container.innerHTML = html;

        document.getElementById('jobDetailBtnGraph')?.addEventListener('click', () => {
            this.closeJobDetailModal();
            this.switchJobProfileTab('graph');
            const input = document.getElementById('graphJobName');
            if (input && this._currentJobDetail) {
                input.value = this._currentJobDetail.job_name || '';
                this.selectedGraphJobId = this._currentJobDetail.job_id || null;
                if (this._currentJobDetail.job_id) this.loadJobRelationGraph(this._currentJobDetail.job_id);
                else this.loadJobRelationGraphBySearch();
            }
        });
        document.getElementById('jobDetailBtnTarget')?.addEventListener('click', () => {
            this.closeJobDetailModal();
            this.navigateTo('matching');
            this.showToast('已加入目标岗位，可在「岗位匹配」中查看', 'success');
        });
    }

    // 4.3 加载岗位关联图谱：调用 POST /api/v1/job/relation-graph，用返回的 transfer_graph 渲染转岗节点（无硬编码补全）
    async loadJobRelationGraph(jobId) {
        const graphContainer = document.getElementById('jobProfileGraph');
        if (!graphContainer) return;

        graphContainer.innerHTML = '<div class="graph-loading"><div class="graph-loading-spinner"></div><p>加载图谱中...</p></div>';

        const graphType = document.getElementById('graphTypeSelect')?.value || 'all';
        try {
            const result = await getJobRelationGraph(jobId, graphType);
            if (result.success && result.data) {
                this.renderJobRelationGraph(result.data, graphContainer);
            } else {
                graphContainer.innerHTML = '<div class="hint-text">图谱数据加载失败，请确认AI服务已启动</div>';
            }
        } catch (e) {
            console.error('loadJobRelationGraph:', e);
            graphContainer.innerHTML = '<div class="hint-text">图谱数据加载失败，请确认AI服务已启动</div>';
        }
    }

    // 4.3.1 加载晋升路径：请求 GET /api/v1/job/career-path?jobName=xxx 后渲染到 #careerPathContainer
    async loadCareerPath(jobName) {
        const container = document.getElementById('careerPathContainer');
        if (!container) return;
        if (!(jobName && String(jobName).trim())) {
            container.innerHTML = '<div class="hint-text">请先选择岗位</div>';
            return;
        }
        try {
            const res = await getCareerPath(jobName);
            const path = (res.data && res.data.path) ? res.data.path : [];
            this.renderCareerPath(path, container);
        } catch (e) {
            console.error('loadCareerPath:', e);
            container.innerHTML = '<div class="hint-text">晋升路径加载失败</div>';
        }
    }

    // 渲染晋升路径卡片（仅使用接口数据，无硬编码）
    renderCareerPath(path, container) {
        console.log('renderCareerPath 收到数据:', path);
        if (!container) return;
        if (!Array.isArray(path) || path.length === 0) {
            container.innerHTML = '<div class="hint-text">暂无晋升路径数据</div>';
            return;
        }
        const escape = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const parts = path.map((stage, i) => {
            const isCurrent = i === 0;
            const side = i % 2 === 0 ? 'right' : 'left';
            const stageName = escape(stage.stage);
            const salary = escape(stage.salary);
            const years = escape(stage.years);
            const desc = escape(stage.desc);
            const skills = Array.isArray(stage.skills) ? stage.skills : [];
            const skillsHtml = skills.map(s => `<span class="skill-tag level-skill-tag">${escape(s)}</span>`).join('');
            return `
              <div class="career-level ${side} ${isCurrent ? 'current' : ''}">
                <div class="connection-dot"></div>
                <div class="level-card ${isCurrent ? 'current' : ''}">
                  <div class="level-header">
                    <span class="level-icon">${escape(stage.icon) || '🌱'}</span>
                    <span class="level-name">${stageName}</span>
                  </div>
                  ${salary ? `<div class="level-salary level-info">${salary}</div>` : ''}
                  ${skillsHtml ? `<div class="level-skills">${skillsHtml}</div>` : ''}
                  ${desc ? `<div class="level-desc">${desc}</div>` : ''}
                  ${years ? `<div class="level-years level-info">${years}</div>` : ''}
                </div>
              </div>`;
        });
        container.innerHTML = parts.join('');
    }

    // 从岗位名称得到 baseName（去掉初级/中级/高级前缀）
    _getGraphBaseName(jobName) {
        const n = (jobName || '').replace(/^初级|^中级|^高级/, '').trim();
        return n || jobName || '岗位';
    }

    // 转岗节点匹配度样式（边框、badge、图标统一由同一 score 计算）
    _getTransferMatchStyle(score) {
        const s = Number(score);
        if (s >= 80) return { border: '#10b981', badgeBg: '#d1fae5', badgeColor: '#065f46', label: '高', iconBg: 'linear-gradient(135deg,#10b981,#059669)' };
        if (s >= 60) return { border: '#f59e0b', badgeBg: '#fef3c7', badgeColor: '#92400e', label: '中', iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)' };
        return { border: '#ef4444', badgeBg: '#fee2e2', badgeColor: '#991b1b', label: '低', iconBg: 'linear-gradient(135deg,#ef4444,#dc2626)' };
    }

    // 转岗节点：仅使用接口 POST /api/v1/job/relation-graph 返回的 transfer_graph，不补硬编码
    _getTransferNodes(data) {
        const edges = data.transfer_graph?.edges || [];
        const nodesMap = {};
        (data.transfer_graph?.nodes || []).forEach(n => { nodesMap[n.job_id] = n; });
        const list = edges.slice(0, 6).map(e => {
            const to = nodesMap[e.to] || { job_name: e.to, job_id: e.to };
            const score = e.relevance_score ?? e.match_score ?? e.matchScore ?? to.match_score ?? to.matchScore ?? 75;
            const numScore = Number(score);
            return {
                job_name: to.job_name,
                match: Number.isFinite(numScore) ? Math.max(0, Math.min(100, Math.round(numScore))) : 75,
                difficulty: e.difficulty || '中',
                time: e.time || '6-12个月',
            };
        });
        return list;
    }

    // 渲染岗位关联图谱：当前岗位信息条 + 晋升/转岗两个子 Tab；晋升路径由 loadCareerPath 请求接口后渲染
    renderJobRelationGraph(data, container) {
        const center = data.center_job || {};
        const jobName = (center.job_name || '目标岗位').replace(/</g, '&lt;');
        const salaryRange = center.salary_range ?? center.avg_salary ?? center.salaryRange;
        let salary = (salaryRange != null && salaryRange !== '') ? String(salaryRange) : '';
        let score = center.demand_score ?? center.demandScore;
        if (score == null || score === '') {
            const featured = featuredJobs.find(j => j.jobId === center.job_id || (j.jobName || '').trim() === (center.job_name || '').trim());
            if (featured) {
                if (!salary) salary = featured.salaryRange || '';
                if (score == null) score = featured.demandScore;
            }
        }
        if (!salary) salary = '面议';
        if (score == null || score === '') score = 75;
        score = Number(score);
        const heatText = score >= 85 ? '高' : score >= 70 ? '中' : '低';
        const salaryEsc = salary.replace(/</g, '&lt;');
        const transferNodes = this._getTransferNodes(data);

        let html = `
            <div class="graph-job-bar">
                <div class="graph-job-bar-left">
                    <div class="graph-job-bar-icon"></div>
                    <div class="graph-job-bar-info">
                        <h3 class="graph-job-bar-title">${jobName}</h3>
                        <p class="graph-job-bar-meta">${salaryEsc} · 需求热度 ${heatText}</p>
                    </div>
                </div>
                <div class="graph-job-bar-right">
                    <span class="graph-job-bar-match">${score}</span>
                    <span class="graph-job-bar-match-label">匹配度</span>
                </div>
            </div>
            <div class="graph-sub-tabs">
                <button type="button" class="graph-sub-tab active" data-graph-panel="vertical"><span class="graph-sub-tab-icon">📈</span><span>晋升路径</span></button>
                <button type="button" class="graph-sub-tab" data-graph-panel="transfer"><span class="graph-sub-tab-icon">🔄</span><span>转岗路径</span></button>
            </div>
            <div class="graph-panel graph-panel-vertical active" data-panel="vertical">
                <div class="vertical-graph">
                    <div class="career-path">
                        <div class="path-line"></div>
                        <div id="careerPathContainer" class="career-path-inner"><div class="graph-loading"><div class="graph-loading-spinner"></div><p>加载晋升路径中...</p></div></div>
                    </div>
                </div>
            </div>
            <div class="graph-panel graph-panel-transfer" data-panel="transfer">
                <div class="graph-legend graph-legend-dots">
                    <strong>匹配度：</strong>
                    <span class="graph-legend-item"><span class="graph-legend-dot high"></span>高（≥80%）绿</span>
                    <span class="graph-legend-item"><span class="graph-legend-dot medium"></span>中（60-79%）黄</span>
                    <span class="graph-legend-item"><span class="graph-legend-dot low"></span>低（＜60%）红</span>
                </div>
                <div class="transfer-graph" data-count="${transferNodes.length}">
                <div class="tg-center">
                    <div class="tg-center-card">
                        <div class="tg-center-icon">💼</div>
                        <div class="tg-center-name">${jobName}</div>
                        <span class="tg-center-badge">当前岗位</span>
                    </div>
                </div>`;

        if (transferNodes.length === 0) {
            html += `
                <div class="graph-transfer-empty">暂无该岗位的转岗推荐，请确认已加载关联图谱接口数据。</div>`;
        } else {
            transferNodes.forEach((node, i) => {
                const score = node.match != null ? node.match : 75;
                const style = this._getTransferMatchStyle(score);
                const name = (node.job_name || '').replace(/</g, '&lt;');
                const jobNameAttr = (node.job_name || '').replace(/"/g, '&quot;');
                const delay = (i + 1) * 0.05;
                html += `
                <div class="tg-node tg-surround" data-index="${i}">
                    <div class="tg-node-inner" style="animation-delay: ${delay}s">
                    <div class="tg-node-card" style="border-color: ${style.border}">
                        <div class="tg-node-header">
                            <div class="tg-node-icon" style="background: ${style.iconBg}">📌</div>
                            <span class="tg-node-name">${name}</span>
                        </div>
                        <div class="tg-node-meta">难度 ${(node.difficulty || '中').replace(/</g, '&lt;')} · 周期 ${(node.time || '').replace(/</g, '&lt;')}</div>
                        <span class="tg-match-badge" style="background: ${style.badgeBg}; color: ${style.badgeColor}">${style.label} ${score}%</span>
                        <button type="button" class="tg-btn-recommend" data-job-name="${jobNameAttr}">🗂 推荐岗位</button>
                    </div>
                    </div>
                </div>`;
            });
        }

        html += `
                </div>
            </div>`;

        container.innerHTML = html;
        container._transferNodes = transferNodes;

        const currentJobName = (data.center_job && data.center_job.job_name) ? data.center_job.job_name : '';
        this.loadCareerPath(currentJobName);

        // 转岗图谱：绑定「推荐岗位」按钮；圆形布局在容器渲染后计算
        const panel = container.querySelector('.graph-panel-transfer');
        if (panel) {
            panel.querySelectorAll('.tg-btn-recommend').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const jobName = btn.getAttribute('data-job-name');
                    if (jobName) this.showRealDataModal(jobName, 3);
                });
            });
        }
        requestAnimationFrame(() => {
            this._layoutTransferGraphCircle(container);
        });

        // 子 Tab 切换：切换到转岗时重新计算圆形布局（此时面板可见，getBoundingClientRect 有效）
        container.querySelectorAll('.graph-sub-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const panelId = btn.dataset.graphPanel;
                container.querySelectorAll('.graph-sub-tab').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.graph-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panelEl = container.querySelector(`.graph-panel-${panelId}`);
                if (panelEl) panelEl.classList.add('active');
                if (panelId === 'transfer') {
                    requestAnimationFrame(() => this._layoutTransferGraphCircle(container));
                }
            });
        });
    }

    // 转岗路径：圆形放射布局，周围节点按角度均分（从顶部 -90° 顺时针）；3 节点时 120° 均分
    _layoutTransferGraphCircle(container) {
        const graph = container.querySelector('.transfer-graph');
        if (!graph) return;
        const rect = graph.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        if (w <= 0 || h <= 0) return;
        const centerX = w / 2;
        const centerY = h / 2;
        const R = 260;
        const nodes = graph.querySelectorAll('.tg-node.tg-surround');
        const count = nodes.length;
        if (count === 0) return;
        nodes.forEach((node, i) => {
            const angle = count === 3
                ? -Math.PI / 2 + i * (2 * Math.PI / 3)
                : (i / count) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + R * Math.cos(angle);
            const y = centerY + R * Math.sin(angle);
            node.style.left = x + 'px';
            node.style.top = y + 'px';
            node.style.transform = 'translate(-50%, -50%)';
        });
    }

    // AI 生成 Tab：联想列表、热门岗位、胶囊选项、进度与结果
    static AI_JOB_SUGGESTIONS = ['算法工程师', '前端开发工程师', '后端开发工程师', '数据分析师', '产品经理', 'UI/UX设计师', '测试开发工程师', '运维工程师', 'AI应用工程师', '嵌入式软件工程师', '新能源电池工程师', '咨询顾问'];
    static AI_HOT_JOBS = [
        { name: '算法工程师', heat: 92 },
        { name: 'AI应用工程师', heat: 95 },
        { name: '后端开发工程师', heat: 88 },
        { name: '数据分析师', heat: 85 },
        { name: '产品经理', heat: 82 },
    ];

    _initAIGenTab() {
        const hotList = document.getElementById('aiHotJobList');
        if (hotList) {
            hotList.innerHTML = this.constructor.AI_HOT_JOBS.map(j => `
                <div class="ai-gen-hot-item" data-job-name="${(j.name || '').replace(/"/g, '&quot;')}">
                    <span class="ai-gen-hot-name">${(j.name || '').replace(/</g, '&lt;')}</span>
                    <span class="ai-gen-hot-badge">热度 ${j.heat}</span>
                </div>
            `).join('');
            hotList.addEventListener('click', (e) => {
                const item = e.target.closest('.ai-gen-hot-item');
                if (!item) return;
                const name = item.dataset.jobName || item.querySelector('.ai-gen-hot-name')?.textContent || '';
                const input = document.getElementById('aiJobName');
                if (input) {
                    input.value = name;
                    input.focus();
                }
                document.getElementById('aiJobSuggestList')?.classList.add('hidden');
            });
        }

        const input = document.getElementById('aiJobName');
        const suggestList = document.getElementById('aiJobSuggestList');
        if (input && suggestList) {
            input.addEventListener('input', () => {
                const val = input.value.trim();
                if (!val) {
                    suggestList.classList.add('hidden');
                    suggestList.innerHTML = '';
                    return;
                }
                const matches = this.constructor.AI_JOB_SUGGESTIONS.filter(j => j.includes(val));
                if (matches.length === 0) {
                    suggestList.classList.add('hidden');
                    suggestList.innerHTML = '';
                    return;
                }
                suggestList.innerHTML = matches.map(m => `<div class="ai-gen-suggest-item" data-value="${(m || '').replace(/"/g, '&quot;')}">${(m || '').replace(/</g, '&lt;')}</div>`).join('');
                suggestList.classList.remove('hidden');
                suggestList.querySelectorAll('.ai-gen-suggest-item').forEach(el => {
                    el.addEventListener('click', () => {
                        input.value = el.dataset.value || el.textContent || '';
                        suggestList.classList.add('hidden');
                    });
                });
            });
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ai-gen-input-wrap')) document.getElementById('aiJobSuggestList')?.classList.add('hidden');
        });

        ['aiIndustryGroup', 'aiExperienceGroup'].forEach(id => {
            const group = document.getElementById(id);
            if (!group) return;
            group.addEventListener('click', (e) => {
                const pill = e.target.closest('.ai-gen-pill');
                if (!pill) return;
                group.querySelectorAll('.ai-gen-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    }

    _getAIGenIndustry() {
        const el = document.querySelector('#aiIndustryGroup .ai-gen-pill.active');
        return el ? (el.dataset.value || el.textContent || '').trim() : '';
    }

    _getAIGenExperience() {
        const el = document.querySelector('#aiExperienceGroup .ai-gen-pill.active');
        return el ? (el.dataset.value || el.textContent || '').trim() : '';
    }

    _setAIGenSteps(stepIndex) {
        const wrap = document.getElementById('aiProgressWrap');
        const s1 = document.getElementById('aiStep1');
        const s2 = document.getElementById('aiStep2');
        const s3 = document.getElementById('aiStep3');
        if (!wrap || !s1 || !s2 || !s3) return;
        [s1, s2, s3].forEach((s, i) => {
            s.classList.remove('done', 'active', 'wait');
            if (i < stepIndex) s.classList.add('done');
            else if (i === stepIndex) s.classList.add('active');
            else s.classList.add('wait');
        });
        wrap.classList.remove('hidden');
    }

    _hideAIGenProgress() {
        document.getElementById('aiProgressWrap')?.classList.add('hidden');
    }

    _showAIGenError() {
        const bar = document.getElementById('aiErrorBar');
        if (!bar) return;
        bar.classList.remove('hidden');
        setTimeout(() => bar.classList.add('hidden'), 3000);
    }

    _renderAiGenResultCard(data) {
        const container = document.getElementById('aiGenerateResult');
        if (!container) return;
        const rawLayer = data && (data.data !== undefined ? data.data : data);
        const raw = rawLayer?.job_profile != null ? rawLayer.job_profile : (rawLayer && (rawLayer.job_name != null || rawLayer.jobName != null) ? rawLayer : {});
        console.log('AI生成返回数据:', JSON.stringify(rawLayer, null, 2));

        // 按控制台实际返回结构映射为渲染所需格式（兼容 basic_info / requirements.core_skills / promotion_path 等）
        const softArr = raw.requirements?.core_skills?.soft_skills || [];
        const findSoft = (keywords) => {
            const s = softArr.find(s => keywords.some(k => String(s).includes(k)));
            return (s != null && String(s).trim()) ? s : '暂无描述';
        };
        const promotion0 = raw.promotion_path?.[0];
        const profile = {
            job_name: raw.job_name || raw.jobName || raw.name || '岗位',
            job_id: raw.job_id || raw.jobId || '',
            industry: raw.basic_info?.industry || raw.industry || this._getAIGenIndustry() || '互联网/AI',
            salary_range: raw.basic_info?.avg_salary || raw.salary_range || raw.salaryRange || raw.avg_salary || '面议',
            demand_score: raw.demand_score != null ? raw.demand_score : (raw.demandScore != null ? raw.demandScore : 85),
            trend: raw.market_info?.trend || raw.trend || '上升',
            trend_desc: raw.market_info?.trend_analysis || raw.trend_desc || raw.trendDesc || '',
            core_skills: {
                professional: (raw.requirements?.core_skills?.technical_skills || raw.core_skills?.professional || []).map(s => typeof s === 'string' ? s : (s && s.skill) || String(s)),
                tools: (raw.requirements?.core_skills?.tools || raw.core_skills?.tools || []).map(s => typeof s === 'string' ? s : (s && s.skill) || String(s)),
                certificates: (raw.requirements?.basic_requirements?.certifications || raw.core_skills?.certificates || []).map(c => typeof c === 'string' ? c : String(c)),
                soft_skills: {
                    innovation: findSoft(['创新', '创造', '设计']),
                    learning: findSoft(['学习', '成长', '自驱']),
                    pressure: findSoft(['抗压', '压力', '高强度']),
                    communication: findSoft(['沟通', '协作', '表达']),
                    internship: raw.requirements?.basic_requirements?.experience || findSoft(['实习', '实践', '经验']),
                },
            },
            reality_check: {
                pros: raw.career_development?.advantages || raw.market_info?.growth_areas || raw.reality_check?.pros || [],
                cons: raw.career_development?.challenges || raw.market_info?.challenges || raw.reality_check?.cons || [],
                suitable_for: raw.suitable_for || raw.career_development?.suitable_personality || raw.reality_check?.suitable_for || '-',
                not_suitable_for: raw.not_suitable_for || raw.reality_check?.not_suitable_for || '-',
                misconceptions: raw.misconceptions || raw.career_development?.common_misconceptions || raw.reality_check?.misconceptions || '暂无',
            },
            entry_path: {
                fresh_grad: raw.career_development?.entry_path || (promotion0 ? `初级阶段（${promotion0.years_required || ''}）需要：${(promotion0.key_requirements || []).join('、')}` : (raw.entry_path?.fresh_grad || '')),
                key_projects: raw.career_development?.recommended_projects || promotion0?.key_requirements || raw.entry_path?.key_projects || [],
                timeline: raw.career_development?.timeline || promotion0?.years_required || raw.entry_path?.timeline || '',
            },
            ai_summary: (raw.description || raw.ai_analysis || raw.ai_summary || raw.summary || '').trim() || 'AI已根据岗位数据生成画像摘要。',
        };

        const escape = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const jobName = profile.job_name;
        const jobId = profile.job_id;

        const core = profile.core_skills || {};
        const professional = Array.isArray(core.professional) ? core.professional : [];
        const tools = Array.isArray(core.tools) ? core.tools : [];
        const certificates = Array.isArray(core.certificates) ? core.certificates : [];
        const softSkills = core.soft_skills || {};
        const realityCheck = profile.reality_check || {};
        const pros = Array.isArray(realityCheck.pros) ? realityCheck.pros : [];
        const cons = Array.isArray(realityCheck.cons) ? realityCheck.cons : [];
        const entryPath = profile.entry_path || {};
        const keyProjects = Array.isArray(entryPath.key_projects) ? entryPath.key_projects : [];

        const d = {
            job_name: jobName,
            industry: profile.industry,
            demand_score: profile.demand_score,
            trend: profile.trend,
            trend_desc: profile.trend_desc,
            salary_range: profile.salary_range,
            core_skills: { professional, tools, certificates, soft_skills: softSkills },
            reality_check: {
                pros,
                cons,
                suitable_for: realityCheck.suitable_for || '-',
                not_suitable_for: realityCheck.not_suitable_for || '-',
                misconceptions: realityCheck.misconceptions || '',
            },
            entry_path: {
                fresh_grad: entryPath.fresh_grad || '',
                key_projects: keyProjects,
                timeline: entryPath.timeline || '',
            },
            ai_summary: profile.ai_summary,
        };

        const abilityCards = [
            { icon: '🔬', label: '创新能力', key: 'innovation' },
            { icon: '📚', label: '学习能力', key: 'learning' },
            { icon: '💪', label: '抗压能力', key: 'pressure' },
            { icon: '🤝', label: '沟通能力', key: 'communication' },
            { icon: '🎯', label: '实践经验', key: 'internship' },
        ];

        container.innerHTML = `
        <div class="ai-gen-result-card result-card-new">
          <div class="result-header">
            <div>
              <div class="result-job-name">${escape(d.job_name)}</div>
              <div class="result-tags">
                <span class="result-tag">${escape(d.industry)}</span>
                <span class="result-tag">需求热度 ${d.demand_score}</span>
                <span class="result-tag trend-${d.trend === '上升' ? 'up' : 'stable'}">
                  ${d.trend === '上升' ? '↑' : '→'} ${escape(d.trend)}
                </span>
              </div>
              <div class="result-trend-desc">${escape(d.trend_desc)}</div>
            </div>
            <div class="result-salary">${escape(d.salary_range)}</div>
          </div>

          <div class="result-body">
            <div class="result-section-title">💻 核心技能要求</div>
            <div class="result-skills-grid">
              <div>
                <div class="result-skills-label">专业技能</div>
                <div class="skills-wrap">${(professional || []).map(s => `<span class="skill-chip chip-soft">${escape(s)}</span>`).join('')}</div>
              </div>
              <div>
                <div class="result-skills-label">工具框架</div>
                <div class="skills-wrap">${(tools || []).map(s => `<span class="skill-chip chip-tech">${escape(s)}</span>`).join('')}</div>
              </div>
              <div>
                <div class="result-skills-label">证书要求</div>
                <div class="skills-wrap">${(certificates || []).length ? (certificates || []).map(s => `<span class="skill-chip chip-gray">${escape(s)}</span>`).join('') : '<span class="result-no-cert">无特定要求</span>'}</div>
              </div>
            </div>

            <div class="result-section-title">⚡ 综合能力要求</div>
            <div class="result-ability-grid">
              ${abilityCards.map(c => {
                const desc = softSkills[c.key];
                const text = (desc != null && String(desc).trim() !== '') ? desc : '暂无描述';
                return `
                <div class="result-ability-card">
                  <div class="result-ability-icon">${c.icon}</div>
                  <div class="result-ability-label">${c.label}</div>
                  <div class="result-ability-desc">${escape(text)}</div>
                </div>
              `;
              }).join('')}
            </div>

            <div class="result-section-title">🔍 真实职场洞察</div>
            <div class="result-reality-grid">
              <div class="result-reality-pros">
                <div class="result-reality-title">✅ 真实优势</div>
                ${(pros || []).map(p => `<div class="result-reality-item">· ${escape(p)}</div>`).join('')}
              </div>
              <div class="result-reality-cons">
                <div class="result-reality-title">⚠️ 真实挑战</div>
                ${(cons || []).map(c => `<div class="result-reality-item">· ${escape(c)}</div>`).join('')}
              </div>
            </div>
            <div class="result-fit-grid">
              <div class="result-fit suitable"><span class="result-fit-label">✓ 适合：</span>${escape(d.reality_check.suitable_for || '暂无')}</div>
              <div class="result-fit not-suitable"><span class="result-fit-label">✗ 不适合：</span>${escape(d.reality_check.not_suitable_for || '暂无')}</div>
            </div>
            <div class="result-misconceptions">💡 常见误解：${escape(d.reality_check.misconceptions || '暂无')}</div>

            <div class="result-section-title">🚀 入行路径建议</div>
            <div class="result-entry-block">
              <div class="result-entry-fresh">${escape(d.entry_path.fresh_grad || '')}</div>
              <div class="result-entry-projects">
                ${(keyProjects || []).map(p => `<span class="result-project-chip">📁 ${escape(p)}</span>`).join('')}
              </div>
              <div class="result-entry-timeline">⏱ 预计时间：${escape(d.entry_path.timeline || '')}</div>
            </div>

            <div class="result-section-title">🤖 AI综合分析</div>
            <div class="result-summary-block">${escape(d.ai_summary || '')}</div>

            <div class="result-foot">
              <button type="button" class="btn-foot-outline" data-action="graph">查看关联图谱</button>
              <button type="button" class="btn-foot-primary" data-action="save">保存画像</button>
            </div>
          </div>
        </div>`;

        this._bindAiGenResultActions(container, jobId, jobName);
        container.querySelector('[data-action="save"]')?.addEventListener('click', () => this.showToast('画像已保存', 'success'));
    }

    _bindAiGenResultActions(container, jobId, jobName) {
        container.querySelector('[data-action="graph"]')?.addEventListener('click', () => {
            const graphInput = document.getElementById('graphJobName');
            if (jobId) this.loadJobRelationGraph(jobId);
            else {
                if (graphInput) graphInput.value = jobName;
                this.loadJobRelationGraphBySearch();
            }
            this.switchJobProfileTab('graph');
        });
        container.querySelector('[data-action="target"]')?.addEventListener('click', () => this.showToast('已加入目标岗位', 'success'));
    }

    // 4.4 + 4.5 AI 生成岗位画像（带三步进度与错误提示）
    async generateJobProfile() {
        const jobNameInput = document.getElementById('aiJobName');
        const jobDescriptionsInput = document.getElementById('aiJobDescriptions');
        const btn = document.getElementById('aiGenerateJobBtn');
        const resultContainer = document.getElementById('aiGenerateResult');
        const errorBar = document.getElementById('aiErrorBar');

        if (!jobNameInput || !jobNameInput.value.trim()) {
            this.showToast('请输入岗位名称', 'error');
            return;
        }

        const jobName = jobNameInput.value.trim();
        const jobDescriptions = jobDescriptionsInput ? jobDescriptionsInput.value.split('\n').filter(d => d.trim()) : [];
        const industry = this._getAIGenIndustry();
        const experience = this._getAIGenExperience();

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ AI分析中...';
        }
        if (resultContainer) resultContainer.innerHTML = '';
        if (errorBar) errorBar.classList.add('hidden');

        this._setAIGenSteps(0);
        setTimeout(() => this._setAIGenSteps(1), 1500);
        setTimeout(() => this._setAIGenSteps(2), 3000);
        setTimeout(() => this._setAIGenSteps(3), 4500);

        try {
            console.log('[AI生成] 请求触发生成，岗位:', jobName, '| 将请求 http://localhost:5001/api/v1/job/ai-generate-profile');
            const result = await aiGenerateJobProfile(jobName, jobDescriptions, 30, industry, experience);
            if (!result.success) {
                this._hideAIGenProgress();
                this._showAIGenError();
                if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
                return;
            }
            const taskId = result.data?.task_id;
            if (!taskId) {
                console.error('[AI生成] 接口未返回 task_id，完整响应:', result);
                this._hideAIGenProgress();
                this._showAIGenError();
                if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
                return;
            }
            console.log('[AI生成] 轮询结果，task_id:', taskId);
            setTimeout(async () => {
                this._hideAIGenProgress();
                try {
                    const pollResult = await getJobAiGenerateResult(taskId);
                    if (pollResult.success && pollResult.data.status === 'completed') {
                        this._renderAiGenResultCard(pollResult.data);
                        if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
                    } else if (pollResult.success && pollResult.data.status === 'failed') {
                        this._showAIGenError();
                        if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
                    } else {
                        this.pollJobAiGenerateResult(taskId, btn);
                    }
                } catch (e) {
                    this._showAIGenError();
                    if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
                }
            }, 4500);
        } catch (e) {
            this._hideAIGenProgress();
            this._showAIGenError();
            if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
        }
    }

    pollJobAiGenerateResult(taskId, btn, maxAttempts = 20) {
        let attempts = 0;
        const resultContainer = document.getElementById('aiGenerateResult');
        const errorBar = document.getElementById('aiErrorBar');
        const reEnableBtn = () => {
            if (btn) { btn.disabled = false; btn.innerHTML = '✨ 重新生成'; }
        };

        const poll = async () => {
            if (attempts >= maxAttempts) {
                this._showAIGenError();
                reEnableBtn();
                return;
            }
            try {
                const result = await getJobAiGenerateResult(taskId);
                if (result.success) {
                    if (result.data.status === 'completed') {
                        this._renderAiGenResultCard(result.data);
                        reEnableBtn();
                        return;
                    }
                    if (result.data.status === 'failed') {
                        this._showAIGenError();
                        reEnableBtn();
                        return;
                    }
                }
            } catch (e) {
                this._showAIGenError();
                reEnableBtn();
                return;
            }
            attempts++;
            setTimeout(poll, 3000);
        };
        setTimeout(poll, 3000);
    }

    // 切换标签页（岗位匹配页面）
    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('#matchingPage .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // 切换内容
        document.querySelectorAll('#matchingPage .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');

        // 如果切换到搜索标签，且没有搜索关键词，自动加载默认岗位列表
        if (tabName === 'search') {
            const container = document.getElementById('searchResults');
            const keyword = document.getElementById('jobSearchInput')?.value.trim();
            // 如果搜索框为空且结果区域显示的是提示文字，则加载默认列表
            if (!keyword && container && (container.textContent.includes('请输入岗位名称') || container.children.length === 0)) {
                this.loadDefaultJobs();
            }
        }
    }

    // 切换岗位画像标签页（切换时关闭详情面板/弹窗）
    switchJobProfileTab(tabName) {
        this.closeJobDetailModal();

        // 更新按钮状态
        document.querySelectorAll('#jobProfilePage .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // 切换内容
        document.querySelectorAll('#jobProfilePage .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetTab = document.querySelector(`#jobProfilePage #${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

<<<<<<< Updated upstream
    // 获取搜索筛选条件（城市、行业、薪资、企业性质）
    getSearchFilters() {
        return {
            city: (document.getElementById('searchFilterCity')?.value || '').trim(),
            industry: (document.getElementById('searchFilterIndustry')?.value || '').trim(),
            salary: (document.getElementById('searchFilterSalary')?.value || '').trim(),
            company_nature: (document.getElementById('searchFilterCompanyType')?.value || '').trim()
        };
    }
=======
    // 关联图谱：按岗位名称解析 job_id 后加载图谱
    async loadJobRelationGraphBySearch() {
        const input = document.getElementById('graphJobName');
        const keyword = input?.value.trim();
        if (!keyword) {
            this.showToast('请输入岗位名称', 'error');
            return;
        }
        let jobId = this.selectedGraphJobId;
        if (!jobId) {
            const result = await getJobProfiles(1, 20, keyword, '', '');
            if (!result.success || !result.data.list || result.data.list.length === 0) {
                this.showToast('未找到匹配的岗位，请检查名称或从下拉中选择', 'error');
                return;
            }
            const first = result.data.list[0];
            const exact = result.data.list.find(j => (j.job_name || '').trim() === keyword);
            jobId = (exact || first).job_id;
        }
        if (jobId) {
            this.loadJobRelationGraph(jobId);
        } else {
            this.showToast('未找到对应岗位ID', 'error');
        }
    }

    // 搜索岗位
    async searchJobs() {
        const keyword = document.getElementById('jobSearchInput').value.trim();
        if (!keyword) {
            this.showToast('请输入搜索关键词', 'error');
            return;
        }
>>>>>>> Stashed changes

    // 加载默认岗位列表（无关键词时显示，应用筛选条件）
    async loadDefaultJobs() {
        const container = document.getElementById('searchResults');
        if (!container) return;
        container.innerHTML = '<div class="loading-message">加载中...</div>';

        const filters = this.getSearchFilters();
        const result = await searchJobs('', 1, 20, filters);
        const list = (result.data && (result.data.list || result.data.jobs)) || [];

        if (result.success && list.length > 0) {
            this.renderJobs(list, container);
        } else {
            container.innerHTML = '<div class="hint-text">暂无岗位信息</div>';
        }
    }

    // 搜索岗位（支持关键词 + 城市、行业、薪资、企业性质筛选）
    async searchJobs() {
        const keyword = document.getElementById('jobSearchInput').value.trim();
        const container = document.getElementById('searchResults');
        const filters = this.getSearchFilters();

        container.innerHTML = '<div class="loading-message">' + (keyword ? '搜索中...' : '加载中...') + '</div>';

        const result = await searchJobs(keyword, 1, 20, filters);
        const list = (result.data && (result.data.list || result.data.jobs)) || [];

        if (result.success && list.length > 0) {
            this.renderJobs(list, container);
        } else {
            container.innerHTML = '<div class="hint-text">' + (keyword ? '未找到相关岗位' : '暂无岗位信息') + '</div>';
        }
    }

    // 分析岗位匹配（API 使用 job_id）
    async analyzeJobMatch() {
        const jobId = document.getElementById('jobSelect')?.value?.trim();
        if (!jobId) {
            this.showToast('请选择一个岗位', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const anaEmpty = document.getElementById('anaEmpty');
        const anaContent = document.getElementById('anaContent');
        const container = document.getElementById('analysisResult');
        if (anaEmpty) anaEmpty.style.display = 'none';
        if (anaContent) anaContent.style.display = 'grid';
        if (container) container.innerHTML = '<div class="loading-message">分析中...</div>';
        const anaBadge = document.getElementById('anaBadge');
        if (anaBadge) { anaBadge.style.display = 'inline'; anaBadge.textContent = '1'; }

        const result = await analyzeJobMatch(userId, jobId);

        if (result.success && result.data) {
            this.renderAnalysisResult(result.data, jobId);
        } else {
            if (container) container.innerHTML = '<div class="hint-text">分析失败: ' + (result.msg || '未知错误') + '</div>';
        }
    }

    // 渲染匹配分析结果（符合 API 文档 §6，并更新左侧栏与环形分）
    renderAnalysisResult(data, jobId) {
        const container = document.getElementById('analysisResult');
        if (!container) return;

        const score = Number(data.match_score) || 0;
        const level = data.match_level || '';
        const dimScores = data.dimension_scores || {};
        const highlights = data.highlights || [];
        const gaps = data.gaps || [];
        const jobInfo = data.job_info || {};
        const jobName = data.job_name || '岗位';

        // 更新左侧栏
        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text || '—'; };
        set('anaJobTitle', jobName);
        set('anaCoName', jobInfo.company || '—');
        const logo = document.getElementById('anaCoLogo');
        if (logo) {
            logo.textContent = (jobInfo.company || jobName).slice(0, 2);
            logo.style.background = '#2C5FD4';
        }
        set('anaCoType', jobInfo.location ? jobInfo.location + ' · 月薪范围' : '月薪范围');
        set('anaJobSalary', jobInfo.salary || '—');
        const locEl = document.getElementById('anaJobLoc');
        if (locEl) locEl.textContent = jobInfo.location ? '📍 ' + jobInfo.location : '—';

        // 环形分
        const scoreText = document.getElementById('anaScoreText');
        if (scoreText) scoreText.textContent = score;
        const ring = document.getElementById('anaRingFill');
        if (ring) ring.setAttribute('stroke-dashoffset', 251.2 * (1 - score / 100));

        // 维度图例
        const dimLabels = { basic_requirements: '基础要求', professional_skills: '专业技能', soft_skills: '职业素养', development_potential: '发展潜力' };
        const dimKeys = ['basic_requirements', 'professional_skills', 'soft_skills', 'development_potential'];
        const legendEl = document.getElementById('anaRingLegend');
        if (legendEl) {
            const colors = ['#2C5FD4', '#0BA771', '#E8890B', '#748ffc'];
            legendEl.innerHTML = dimKeys.map((key, i) => {
                const dim = dimScores[key];
                const s = dim && (dim.score != null) ? dim.score : 0;
                return `<div class="leg-item"><div class="leg-dot" style="background:${colors[i]}"></div><span class="leg-name">${dimLabels[key]}</span><span class="leg-score">${s}</span></div>`;
            }).join('');
        }

        // 雷达图数据：四维度分数（不足 4 个用 0 补）
        const radarValues = dimKeys.map(k => (dimScores[k] && (dimScores[k].score != null)) ? dimScores[k].score : 0);
        const reqValues = dimKeys.map(k => Math.min(100, (dimScores[k] && (dimScores[k].score != null)) ? dimScores[k].score + 5 : 80));
        // 根据分数确定颜色：高(>=85)=绿色，中(65-84)=橙色，低(<65)=红色，基础要求固定蓝色
        const getDimColor = (score, index) => {
            if (index === 0) return '#2C5FD4'; // 基础要求固定蓝色
            if (score >= 85) return '#0BA771'; // 高=绿色
            if (score >= 65) return '#E8890B'; // 中=橙色
            return '#D93B3B'; // 低=红色
        };
        const dimColors = radarValues.map((s, i) => getDimColor(s, i));
        const cx = 130; const cy = 130; const r = 95;
        const pt = (val, i) => {
            const a = (Math.PI * 2 / 4) * i - Math.PI / 2;
            const s = (val / 100) * r;
            return [cx + s * Math.cos(a), cy + s * Math.sin(a)];
        };
        const radarStudentPoints = radarValues.map((v, i) => pt(v, i)).map(p => p.join(',')).join(' ');
        const radarBasePoints = reqValues.map((v, i) => pt(v, i)).map(p => p.join(',')).join(' ');

        // 四维度块（雷达右侧）- 使用对应颜色
        const dimBlocksHtml = dimKeys.map((key, i) => {
            const s = radarValues[i];
            const req = reqValues[i];
            const color = dimColors[i];
            const cls = s >= req ? 'g' : s >= 60 ? 'o' : 'b';
            const gapText = s >= req ? `✓ 已达标，超出 +${s - req} 分` : `⚠ 差距 ${req - s} 分，需重点提升`;
            const gapCls = s >= req ? 'gap-ok' : 'gap-warn';
            return `<div class="dim-block ${i === 0 ? 'active' : ''}" data-dim="${key}" data-dim-index="${i}" style="border-left: 3px solid ${color};">
                <div class="dim-block-name">${['📐', '💡', '🌟', '🚀'][i]} ${dimLabels[key]}</div>
                <div class="dim-block-scores"><span class="dim-score ${cls}" style="color: ${color};">${s}</span><span class="dim-vs">/ ${req} 要求</span></div>
                <div class="dim-gap ${gapCls}">${gapText}</div>
            </div>`;
        }).join('');

        // 逐项能力对比：按维度 tab，内容用亮点+差距简化
        const dimTabsHtml = dimKeys.map((key, i) =>
            `<button type="button" class="dim-tab ${i === 0 ? 'active' : ''}" data-dim-tab="${key}">${['📐', '💡', '🌟', '🚀'][i]} ${dimLabels[key]}</button>`
        ).join('');
        const youItems = highlights.slice(0, 4).map(h => `<div class="cmp-item"><span class="cmp-ico">✅</span><div><div class="cmp-name">${h}</div></div><span class="lvl lvl-have">✓ 符合</span></div>`).join('');
        const gapRowsHtml = gaps.slice(0, 5).map((g, i) =>
            `<div class="gap-row"><div class="gap-n">${i + 1}</div><div><strong>${g.gap || ''}：</strong>${g.suggestion || ''}</div></div>`
        ).join('');
        const dimContentHtml = dimKeys.map((key, i) => {
            const dim = dimScores[key];
            const s = dim && (dim.score != null) ? dim.score : 0;
            const req = reqValues[i];
            return `<div class="dim-content ${i === 0 ? 'show' : ''}" id="dim-content-${key}">
                <div class="cmp-grid">
                    <div class="cmp-col job-col"><div class="cmp-head">🏢 岗位要求</div>
                        <div class="cmp-item"><span class="cmp-ico">📋</span><div><div class="cmp-name">${dimLabels[key]} 基线</div><div class="cmp-note">要求约 ${req} 分</div></div><span class="lvl lvl-must">必要</span></div>
                    </div>
                    <div class="cmp-col you-col"><div class="cmp-head">👤 你的情况</div>
                        <div class="cmp-item"><span class="cmp-ico">${s >= req ? '✅' : '⚡'}</span><div><div class="cmp-name">当前 ${s} 分</div><div class="cmp-note">${s >= req ? '已达标' : '需提升'}</div></div><span class="lvl ${s >= req ? 'lvl-have' : 'lvl-part'}">${s >= req ? '✓ 符合' : '需提升'}</span></div>
                    </div>
                </div>
                ${i === 1 && gapRowsHtml ? `<div class="gap-box"><div class="gap-box-title">⚠ 关键差距与建议</div>${gapRowsHtml}</div>` : ''}
            </div>`;
        }).join('');

        // 行动计划：从 gaps 生成
        const planItemsShort = gaps.slice(0, 3).map((g, i) => ({
            period: 'short',
            ico: ['🎯', '🔥', '📚'][i],
            title: g.gap || '提升该项能力',
            desc: g.suggestion || '',
            tag: 't-urgent'
        }));
        const planItemsMid = gaps.slice(3, 6).map((g, i) => ({
            period: 'mid',
            ico: ['☁️', '📝', '📈'][i],
            title: g.gap || '持续提升',
            desc: g.suggestion || '',
            tag: 't-mid'
        }));
        const planItems = [...planItemsShort, ...planItemsMid];
        if (planItems.length === 0) planItems.push({ period: 'short', ico: '🎯', title: '根据分析结果制定计划', desc: '完善能力画像后可获得更具体的行动计划。', tag: 't-mid' });
        const planItemsHtml = planItems.map(p => `<div class="plan-item" data-period="${p.period}"><span class="plan-ico">${p.ico}</span><div class="plan-body"><div class="plan-title">${p.title}</div><div class="plan-desc">${p.desc}</div></div><span class="plan-tag ${p.tag}">${p.period === 'short' ? '短期' : '中期'}</span></div>`).join('');

        container.innerHTML = `
            <div class="sec">
                <div class="sec-title">四维度匹配概览</div>
                <div class="sec-sub">蓝色多边形为你的能力，灰色虚线为岗位要求基线，彩色边表示各维度匹配情况（绿色≥85分，橙色65-84分，红色&lt;65分），面积差即提升空间</div>
                <div class="radar-row">
                    <div id="radarWrap" class="radar-wrap">
                        <svg width="280" height="280" viewBox="-40 -40 340 340">
                            <defs>
                                <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stop-color="${dimColors[0]}" stop-opacity=".25"/>
                                    <stop offset="33%" stop-color="${dimColors[1]}" stop-opacity=".25"/>
                                    <stop offset="66%" stop-color="${dimColors[2]}" stop-opacity=".25"/>
                                    <stop offset="100%" stop-color="${dimColors[3]}" stop-opacity=".25"/>
                                </linearGradient>
                            </defs>
                            <g id="radarGrid"></g>
                            <g id="radarLabels"></g>
                            <polygon id="radarBase" fill="none" stroke="#ced4da" stroke-width="1.5" stroke-dasharray="4,3" points="${radarBasePoints}"/>
                            <polygon id="radarStudent" fill="url(#radarFill)" stroke="#2C5FD4" stroke-width="2" stroke-linejoin="round" points="${radarStudentPoints}"/>
                            <g id="radarEdges"></g>
                            <g id="radarDots"></g>
                        </svg>
                    </div>
                    <div class="radar-dims">${dimBlocksHtml}</div>
                </div>
            </div>
            <div class="sec">
                <div class="sec-title">逐项能力对比</div>
                <div class="sec-sub">岗位要求 vs 你目前能力水平，精准定位差距所在</div>
                <div class="dim-tabs">${dimTabsHtml}</div>
                ${dimContentHtml}
            </div>
            <div class="sec">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <div class="sec-title" style="margin-bottom:0">个性化提升行动计划</div>
                    <div class="plan-tabs">
                        <button type="button" class="plan-tab active" data-plan="short">短期（3个月内）</button>
                        <button type="button" class="plan-tab" data-plan="mid">中期（3–6个月）</button>
                    </div>
                </div>
                <div class="plan-items" id="planList">${planItemsHtml}</div>
            </div>
            <div class="sec">
                <div class="sec-title" style="margin-bottom:16px">📈 职业发展路径</div>
                <div id="careerPathContainer"></div>
            </div>
        `;

        this.drawAnalysisRadar(radarValues, reqValues);
        this.bindAnalysisTabs();
        if (jobId) this.renderCareerPath(jobId);
    }

    drawAnalysisRadar(studentValues, reqValues) {
        const axes = ['基础要求', '职业技能', '职业素养', '发展潜力'];
        const N = 4;
        const cx = 130; const cy = 130; const r = 110;
        const pt = (val, i) => {
            const a = (Math.PI * 2 / N) * i - Math.PI / 2;
            const s = (val / 100) * r;
            return [cx + s * Math.cos(a), cy + s * Math.sin(a)];
        };
        const getDimColor = (score, index) => {
            if (index === 0) return '#2C5FD4';
            if (score >= 85) return '#0BA771';
            if (score >= 65) return '#E8890B';
            return '#D93B3B';
        };
        const dimColors = studentValues.map((s, i) => getDimColor(s, i));
        const svg = document.querySelector('#radarWrap svg');
        const grid = document.getElementById('radarGrid');
        const labels = document.getElementById('radarLabels');
        if (!svg || !grid || !labels) return;

        const sectorsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        sectorsGroup.setAttribute('id', 'radarSectors');
        for (let i = 0; i < N; i++) {
            const [x1, y1] = pt(100, i);
            const [x2, y2] = pt(100, (i + 1) % N);
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', `${cx},${cy} ${x1},${y1} ${x2},${y2}`);
            poly.setAttribute('class', 'radar-sector radar-sector-' + i);
            sectorsGroup.appendChild(poly);
        }
        svg.insertBefore(sectorsGroup, grid);
        [25, 50, 75, 100].forEach(v => {
            const pts = axes.map((_, i) => pt(v, i).join(',')).join(' ');
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            p.setAttribute('points', pts);
            p.setAttribute('fill', 'none');
            p.setAttribute('stroke', v === 100 ? '#e4e9f5' : '#edf1fd');
            p.setAttribute('stroke-width', '1');
            grid.appendChild(p);
        });
        axes.forEach((_, i) => {
            const [x, y] = pt(100, i);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', cx); line.setAttribute('y1', cy); line.setAttribute('x2', x); line.setAttribute('y2', y);
            line.setAttribute('stroke', '#e4e9f5'); line.setAttribute('stroke-width', '1');
            line.setAttribute('class', 'radar-axis radar-axis-' + i);
            grid.appendChild(line);
        });
        axes.forEach((ax, i) => {
            // 上下标签（索引0和2）保持108，左右标签（索引1和3）调远到120
            const labelRadius = (i === 1 || i === 3) ? 120 : 108;
            const [x, y] = pt(labelRadius, i);
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', x); t.setAttribute('y', y);
            t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
            t.setAttribute('font-size', '11'); t.setAttribute('font-weight', '600'); t.setAttribute('fill', '#4e5e80');
            t.setAttribute('class', 'radar-label radar-label-' + i);
            t.textContent = ax;
            labels.appendChild(t);
        });
        // 绘制彩色边：每条边使用对应维度的颜色
        const edgesG = document.getElementById('radarEdges');
        if (edgesG && studentValues && studentValues.length === 4) {
            const dimColors = studentValues.map((s, i) => {
                if (i === 0) return '#2C5FD4';
                if (s >= 85) return '#0BA771';
                if (s >= 65) return '#E8890B';
                return '#D93B3B';
            });
            for (let i = 0; i < 4; i++) {
                const [x1, y1] = pt(studentValues[i], i);
                const [x2, y2] = pt(studentValues[(i + 1) % 4], (i + 1) % 4);
                const edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                edge.setAttribute('x1', x1); edge.setAttribute('y1', y1); edge.setAttribute('x2', x2); edge.setAttribute('y2', y2);
                edge.setAttribute('stroke', dimColors[i]); edge.setAttribute('stroke-width', '3');
                edge.setAttribute('class', 'radar-edge radar-edge-' + i);
                edge.setAttribute('stroke-linecap', 'round');
                edgesG.appendChild(edge);
            }
        }
        const dotsG = document.getElementById('radarDots');
        if (dotsG) {
            (studentValues || []).forEach((v, i) => {
                const [x, y] = pt(v, i);
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', '5');
                c.setAttribute('fill', dimColors[i]); c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '2.5');
                c.setAttribute('class', 'radar-dot radar-dot-' + i);
                dotsG.appendChild(c);
            });
        }
    }

    bindAnalysisTabs() {
        const page = document.getElementById('matchingPage');
        if (!page) return;
        const radarWrap = document.getElementById('radarWrap');
        if (!radarWrap) return;
        
        // 雷达图本身的悬停：扇形区域和标签
        const radarSectors = page.querySelectorAll('#radarSectors .radar-sector');
        radarSectors.forEach((sector, i) => {
            sector.addEventListener('mouseenter', () => {
                radarWrap.classList.add('radar-hover-' + i);
                const dimBlock = page.querySelectorAll('.dim-block')[i];
                if (dimBlock) dimBlock.classList.add('active');
            });
            sector.addEventListener('mouseleave', () => {
                [0,1,2,3].forEach(j => radarWrap.classList.remove('radar-hover-' + j));
                page.querySelectorAll('.dim-block').forEach(b => b.classList.remove('active'));
            });
        });
        
        const radarLabels = page.querySelectorAll('#radarLabels .radar-label');
        radarLabels.forEach((label, i) => {
            label.addEventListener('mouseenter', () => {
                radarWrap.classList.add('radar-hover-' + i);
                const dimBlock = page.querySelectorAll('.dim-block')[i];
                if (dimBlock) dimBlock.classList.add('active');
            });
            label.addEventListener('mouseleave', () => {
                [0,1,2,3].forEach(j => radarWrap.classList.remove('radar-hover-' + j));
                page.querySelectorAll('.dim-block').forEach(b => b.classList.remove('active'));
            });
        });
        
        // 维度栏的悬停：也要触发雷达图高亮
        page.querySelectorAll('.dim-block').forEach((block, i) => {
            block.addEventListener('mouseenter', () => {
                radarWrap.classList.add('radar-hover-' + i);
                block.classList.add('active');
            });
            block.addEventListener('mouseleave', () => {
                [0,1,2,3].forEach(j => radarWrap.classList.remove('radar-hover-' + j));
                page.querySelectorAll('.dim-block').forEach(b => b.classList.remove('active'));
            });
        });
        page.querySelectorAll('.dim-tab').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.dimTab;
                page.querySelectorAll('.dim-tab').forEach(b => b.classList.remove('active'));
                page.querySelectorAll('.dim-content').forEach(c => { c.classList.remove('show'); });
                btn.classList.add('active');
                const content = document.getElementById('dim-content-' + id);
                if (content) content.classList.add('show');
            };
        });
        page.querySelectorAll('.dim-block').forEach(block => {
            block.onclick = () => {
                const id = block.dataset.dim;
                page.querySelectorAll('.dim-tab').forEach(b => b.classList.remove('active'));
                page.querySelectorAll('.dim-tab[data-dim-tab="' + id + '"]').forEach(b => b.classList.add('active'));
                page.querySelectorAll('.dim-content').forEach(c => c.classList.remove('show'));
                const content = document.getElementById('dim-content-' + id);
                if (content) content.classList.add('show');
            };
        });
        page.querySelectorAll('.plan-tab').forEach(btn => {
            btn.onclick = () => {
                const period = btn.dataset.plan;
                page.querySelectorAll('.plan-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                page.querySelectorAll('.plan-item').forEach(item => {
                    item.style.display = item.dataset.period === period ? 'flex' : 'none';
                });
            };
        });
        page.querySelectorAll('.plan-item').forEach(item => {
            item.style.display = item.dataset.period === 'short' ? 'flex' : 'none';
        });
    }

    // 职业发展路径：请求接口并渲染 path + 换岗
    async renderCareerPath(jobId) {
        const box = document.getElementById('careerPathContainer');
        if (!box) return;
        box.innerHTML = '<div class="loading-message">加载路径中...</div>';
        const result = await getCareerPath(jobId);
        if (!result.success || !result.data) {
            box.innerHTML = '<p class="hint-text">' + (result.msg || '加载失败') + '</p>';
            return;
        }
        const path = result.data.path || [];
        const altPaths = result.data.altPaths || [];
        let trackHtml = '';
        path.forEach((node, i) => {
            if (i > 0) trackHtml += '<div class="path-arr">→</div>';
            trackHtml += `<div class="path-node${i === 0 ? ' cur' : ''}"><div class="path-node-title">${node.jobName || '-'}</div><div class="path-node-meta">${node.years || ''} ${node.level || ''}</div></div>`;
        });
        let altHtml = '';
        if (altPaths.length) altHtml = `<div class="path-alt">换岗方向：${altPaths.map(a => a.jobName).join('、')}</div>`;
        box.innerHTML = `<div class="path-track">${trackHtml}</div>${altHtml}`;
    }

    // 显示报告生成入口区
    showReportGenerateArea() {
        document.getElementById('reportGenerateArea')?.classList.remove('hidden');
        document.getElementById('reportGeneratingArea')?.classList.add('hidden');
        document.getElementById('reportContentArea')?.classList.add('hidden');
    }

    // 显示报告生成中
    showReportGeneratingArea() {
        document.getElementById('reportGenerateArea')?.classList.add('hidden');
        document.getElementById('reportGeneratingArea')?.classList.remove('hidden');
        document.getElementById('reportContentArea')?.classList.add('hidden');
    }

    // 显示报告内容区
    showReportContentArea() {
        document.getElementById('reportGenerateArea')?.classList.add('hidden');
        document.getElementById('reportGeneratingArea')?.classList.add('hidden');
        document.getElementById('reportContentArea')?.classList.remove('hidden');
    }

    // 开始生成职业规划报告（API 7.1）
    async startGenerateCareerReport() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }
        const prefs = {
            career_goal: document.getElementById('prefCareerGoal')?.value || '',
            work_location: document.getElementById('prefWorkLocation')?.value?.trim() || '',
            salary_expectation: document.getElementById('prefSalary')?.value || '',
            work_life_balance: document.getElementById('prefWorkLifeBalance')?.value || ''
        };
        const preferences = Object.fromEntries(Object.entries(prefs).filter(([, v]) => v));
        this.showReportGeneratingArea();
        const result = await generateCareerReport(userId, { preferences });
        if (result.success && result.data?.report_id) {
            this.pollCareerReportReady(userId, result.data.report_id);
        } else {
            this.showReportGenerateArea();
            this.showToast(result.msg || '生成失败', 'error');
        }
    }

    // 轮询职业规划报告就绪（API 7.2 轮询直到 status=completed）
    async pollCareerReportReady(userId, reportId, maxAttempts = 20) {
        let attempts = 0;
        const poll = async () => {
            if (attempts >= maxAttempts) {
                this.showReportGenerateArea();
                this.showToast('生成超时，请稍后查看历史报告', 'error');
                return;
            }
            const result = await getCareerReport(userId, reportId);
            if (result.success && result.data) {
                if (result.data.status === 'completed') {
                    this.currentReportId = reportId;
                    this.showReportContentArea();
                    this.renderCareerReportContent(result.data);
                    this.showToast('报告生成完成！', 'success');
                } else {
                    attempts++;
                    setTimeout(poll, 3000);
                }
            } else {
                attempts++;
                setTimeout(poll, 3000);
            }
        };
        poll();
    }

    // 加载职业规划报告内容
    async loadReportContent(reportId) {
        const contentDiv = document.getElementById('reportContent');
        const userId = getCurrentUserId();
        contentDiv.innerHTML = '<div class="loading-message">加载报告内容中...</div>';
        const result = await getCareerReport(userId || 10001, reportId);
        if (result.success && result.data) {
            this.currentReportId = reportId;
            if (result.data.section_1_job_matching) {
                this.showReportContentArea();
                this.renderCareerReportContent(result.data);
            } else {
                this.showReportContentArea();
                this.renderReportContent(result.data);
            }
        } else {
            contentDiv.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '') + '</div>';
        }
    }

    // 渲染职业规划报告内容（API 7.2 四部分结构）
    renderCareerReportContent(data) {
        const contentDiv = document.getElementById('reportContent');
        const genTime = this.formatDateTime(data.generated_at || data.created_at);
        const meta = data.metadata || {};
        const s1 = data.section_1_job_matching || {};
        const s2 = data.section_2_career_path || {};
        const s3 = data.section_3_action_plan || {};
        const s4 = data.section_4_evaluation || {};
        const summary = data.summary || {};

        let html = `<div class="career-report-wrap">`;

        // 报告头部
        html += `<div class="career-report-header">
            <div class="career-report-tag">CAREER PLANNING REPORT</div>
            <h3>职业规划报告</h3>
            <p class="career-report-sub">基于能力画像与人岗匹配的个性化发展规划</p>
            <div class="career-report-meta">
                <span>生成时间 ${genTime}</span>
                <span>完整度 ${meta.completeness ?? '—'}%</span>
                <span>置信度 ${meta.confidence_score ? (meta.confidence_score * 100).toFixed(0) + '%' : '—'}</span>
            </div>
        </div>`;

        // Section 1: 职业探索与岗位匹配
        if (s1.title) {
            const selfA = s1.self_assessment || {};
            const recs = s1.recommended_careers || [];
            const advice = s1.career_choice_advice || {};
            html += `<section class="career-section career-section-1">
                <h4 class="career-section-title"><span class="sec-icon">🎯</span>${s1.title}</h4>
                <div class="career-self-assessment">
                    <h5>自我认知总结</h5>
                    <div class="self-grid">
                        <div class="self-card"><h6>优势</h6><ul>${(selfA.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
                        <div class="self-card"><h6>兴趣</h6><ul>${(selfA.interests || []).map(i => `<li>${i}</li>`).join('')}</ul></div>
                        <div class="self-card"><h6>价值观</h6><ul>${(selfA.values || []).map(v => `<li>${v}</li>`).join('')}</ul></div>
                    </div>
                </div>
                <div class="career-recommended">
                    <h5>推荐职业方向</h5>
                    ${recs.map(rc => {
                        const ma = rc.match_analysis || {};
                        const mo = rc.market_outlook || {};
                        const gaps = ma.gaps_and_solutions || [];
                        const scoreHtml = (rc.match_score != null && rc.match_score !== '') ? `<span class="rec-score">${rc.match_score}分</span>` : '';
                        return `<div class="rec-career-card">
                            ${scoreHtml}
                            <div class="rec-career-header"><span class="rec-name">${rc.career}</span></div>
                            ${(ma.why_suitable || []).length ? `<div class="rec-why"><strong>适合原因：</strong>${ma.why_suitable.join('；')}</div>` : ''}
                            ${mo.salary_range ? `<div class="rec-market">薪资区间：${mo.salary_range}</div>` : ''}
                            ${gaps.length ? `<div class="rec-gaps"><strong>能力差距与提升：</strong><ul>${gaps.map(g => `<li>${g.gap} → ${g.solution}（${g.timeline}）</li>`).join('')}</ul></div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
                ${advice.primary_recommendation ? `<div class="career-advice">
                    <h5>职业选择建议</h5>
                    <p><strong>首选：</strong>${advice.primary_recommendation}</p>
                    <ul>${(advice.reasons || []).map(r => `<li>${r}</li>`).join('')}</ul>
                    ${advice.alternative_option ? `<p><strong>备选：</strong>${advice.alternative_option}</p>` : ''}
                    ${advice.risk_mitigation ? `<p class="risk-tip">${advice.risk_mitigation}</p>` : ''}
                </div>` : ''}
            </section>`;
        }

        // Section 2: 职业目标与路径
        if (s2.title) {
            const st = s2.short_term_goal || {};
            const mt = s2.mid_term_goal || {};
            const rm = s2.career_roadmap || {};
            const trends = s2.industry_trends || {};
            html += `<section class="career-section career-section-2">
                <h4 class="career-section-title"><span class="sec-icon">📈</span>${s2.title}</h4>
                <div class="career-goals">
                    <div class="goal-card short"><h5>短期目标（1年内）</h5><p class="goal-timeline">${st.timeline || ''}</p><p class="goal-primary">${st.primary_goal || ''}</p>
                        <ul>${(st.specific_targets || []).map(t => `<li>${t.target}（${t.deadline}）— ${t.metrics}</li>`).join('')}</ul>
                    </div>
                    <div class="goal-card mid"><h5>中期目标（3-5年）</h5><p class="goal-timeline">${mt.timeline || ''}</p><p class="goal-primary">${mt.primary_goal || ''}</p>
                        <ul>${(mt.specific_targets || []).map(t => `<li>${t.target}（${t.deadline}）</li>`).join('')}</ul>
                    </div>
                </div>
                ${rm.stages?.length ? `<div class="career-roadmap"><h5>职业发展路径：${rm.path_type || ''}</h5>
                    <div class="roadmap-stages">${(rm.stages || []).map((s, i) => `
                        <div class="roadmap-stage"><span class="stage-num">${i + 1}</span><div><strong>${s.stage}</strong>（${s.period}）<ul>${(s.key_responsibilities || []).map(r => `<li>${r}</li>`).join('')}</ul></div></div>
                    `).join('')}</div>
                    ${(rm.alternative_paths || []).length ? `<div class="alt-paths"><h6>转岗备选</h6><ul>${rm.alternative_paths.map(ap => `<li><strong>${ap.path}</strong>（${ap.timing}）— ${ap.reason}</li>`).join('')}</ul></div>` : ''}
                </div>` : ''}
                ${trends.key_trends?.length ? `<div class="industry-trends"><h5>行业趋势</h5><p>${trends.current_status || ''}</p><ul>${(trends.key_trends || []).map(t => `<li><strong>${t.trend}</strong>：${t.impact}；机会：${t.opportunity}</li>`).join('')}</ul><p class="outlook">${trends['5_year_outlook'] || ''}</p></div>` : ''}
            </section>`;
        }

        // Section 3: 行动计划
        if (s3.title) {
            const stp = s3.short_term_plan || {};
            const mp = stp.monthly_plans || [];
            const lp = s3.learning_path || {};
            const ash = s3.achievement_showcase || {};
            html += `<section class="career-section career-section-3">
                <h4 class="career-section-title"><span class="sec-icon">📋</span>${s3.title}</h4>
                <div class="career-action-plan">
                    <h5>短期行动计划：${stp.period || ''}</h5>
                    <p class="plan-goal">${stp.goal || ''}</p>
                    ${mp.map(m => `
                        <div class="monthly-plan">
                            <div class="plan-header"><span class="plan-month">${m.month}</span><span class="plan-focus">${m.focus || ''}</span></div>
                            <ul>${(m.tasks || []).map(t => `<li><strong>${t.task}</strong>：${Array.isArray(t['具体行动']) ? t['具体行动'].join('；') : ''} — ${t['预期成果'] || ''}</li>`).join('')}</ul>
                            <p class="plan-milestone">✓ ${m.milestone || ''}</p>
                        </div>
                    `).join('')}
                </div>
                ${(lp.technical_skills || []).length ? `<div class="learning-path"><h5>学习路径</h5><ul>${(lp.technical_skills || []).map(sk => `<li><strong>${sk.skill_area}</strong>（${sk.current_level}→${sk.target_level}）${(sk.learning_resources || []).join('；')} — ${sk.timeline}</li>`).join('')}</ul></div>` : ''}
                ${ash.portfolio_building ? `<div class="achievement-showcase"><h5>成果展示计划</h5><div class="showcase-grid">${Object.entries(ash.portfolio_building || {}).map(([k, v]) => `<div class="showcase-item"><h6>${k}</h6><p>${v.goal || ''}</p><ul>${(v.actions || []).map(a => `<li>${a}</li>`).join('')}</ul></div>`).join('')}</div></div>` : ''}
            </section>`;
        }

        // Section 4: 评估与调整
        if (s4.title) {
            const ev = s4.evaluation_system || {};
            const adj = s4.adjustment_scenarios || [];
            const rm = s4.risk_management || {};
            html += `<section class="career-section career-section-4">
                <h4 class="career-section-title"><span class="sec-icon">🔄</span>${s4.title}</h4>
                <div class="evaluation-system">
                    ${ev.monthly_review ? `<div class="eval-item"><span>${ev.monthly_review.frequency}</span> ${(ev.monthly_review.review_items || []).join('；')}</div>` : ''}
                    ${ev.quarterly_review ? `<div class="eval-item"><span>${ev.quarterly_review.frequency}</span> ${(ev.quarterly_review.review_items || []).join('；')}</div>` : ''}
                    ${ev.annual_review ? `<div class="eval-item"><span>${ev.annual_review.frequency}</span> ${(ev.annual_review.review_items || []).join('；')}</div>` : ''}
                </div>
                ${adj.length ? `<div class="adjustment-scenarios"><h5>调整场景</h5>${adj.map(a => `<div class="adj-card"><h6>${a.scenario}</h6><p>可能原因：${(a.possible_reasons || []).join('、')}</p><p>应对：${(a.adjustment_plan?.immediate_actions || []).join('；')}</p></div>`).join('')}</div>` : ''}
                ${rm.identified_risks?.length ? `<div class="risk-management"><h5>风险管理</h5><ul>${(rm.identified_risks || []).map(r => `<li>${r.risk}（${r.probability}/${r.impact}）→ ${r.mitigation}</li>`).join('')}</ul><p>备选方案：${(rm.contingency_plans || []).join('；')}</p></div>` : ''}
            </section>`;
        }

        // 总结
        if (summary.key_takeaways?.length || summary.next_steps?.length || summary.motivational_message) {
            html += `<section class="career-section career-summary">
                <h4 class="career-section-title"><span class="sec-icon">✨</span>报告总结</h4>
                ${summary.key_takeaways?.length ? `<div class="key-takeaways"><h5>核心要点</h5><ul>${summary.key_takeaways.map(k => `<li>${k}</li>`).join('')}</ul></div>` : ''}
                ${summary.next_steps?.length ? `<div class="next-steps"><h5>下一步行动</h5><ul>${summary.next_steps.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
                ${summary.motivational_message ? `<div class="motivational-msg">${summary.motivational_message}</div>` : ''}
            </section>`;
        }

        html += `<div class="career-report-footer">本报告由 AI 职业规划智能体生成 · 仅供参考，具体决策请结合个人实际情况</div></div>`;

        contentDiv.innerHTML = html;
    }

    // 完整性检查
    async checkReportCompleteness() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        const result = await checkCareerCompleteness(id);
        if (result.success && result.data) {
            const d = result.data;
            let msg = `完整度 ${d.completeness_score}%，质量 ${d.quality_score}%。`;
            if (d.suggestions?.length) msg += ' 建议：' + d.suggestions.map(s => s.suggestion).join('；');
            this.showToast(msg, 'info');
        }
    }

    // AI 润色
    async polishCareerReport() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        this.showToast('AI 润色中...', 'info');
        const result = await polishCareerReport(id);
        if (result.success) this.showToast('润色任务已提交', 'success');
    }

    // 导出职业规划报告 PDF
    async exportCareerReportPdf() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        const result = await exportCareerReport(id);
        if (result.success && result.data?.download_url) {
            window.open(result.data.download_url, '_blank');
            this.showToast('导出成功', 'success');
        } else {
            this.showToast(result.msg || '导出失败', 'error');
        }
    }

    // 加载测评报告内容（用于历史报告列表点击，走 POST /assessment/report）
    async loadAssessmentReportContent(reportId) {
        const contentDiv = document.getElementById('reportContent');
        contentDiv.innerHTML = '<div class="loading-message">加载报告内容中...</div>';
        const userId = getCurrentUserId();
        if (!userId) {
            contentDiv.innerHTML = '<div class="hint-text">请先登录</div>';
            return;
        }
        const result = await getAssessmentReport(userId, reportId);
        if (result.success && result.data && result.data.status === 'completed') {
            this.currentReportId = reportId;
            this.renderReportContent(result.data);
        } else {
            contentDiv.innerHTML = '<div class="hint-text">加载失败</div>';
        }
    }

    // 渲染报告内容
    // 格式化时间（支持 created_at / assessment_date，无则显示当前日期）
    formatDateTime(dateString) {
        if (!dateString) return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        try {
            const date = new Date(dateString);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            return `${y}年${m}月${d}日 ${h}:${min}`;
        } catch (e) {
            return dateString;
        }
    }

    renderReportContent(data) {
        const contentDiv = document.getElementById('reportContent');
        const genTime = this.formatDateTime(data.created_at || data.assessment_date);
        const interest = data.interest_analysis || {};
        const primary = interest.primary_interest || {};
        const dist = interest.interest_distribution || [];
        const fields = interest.suitable_fields || [];
        const personality = data.personality_analysis || {};
        const mbti = personality.mbti_type || '—';
        const traits = personality.traits || [];
        const ability = data.ability_analysis || {};
        const strengths = ability.strengths || [];
        const areas = ability.areas_to_improve || [];
        const rec = data.recommendations || {};
        const careers = rec.suitable_careers || [];
        const suggestions = rec.development_suggestions || [];

        // 霍兰德饼图数据（从 interest_distribution 或默认）
        const hollandLabels = dist.length ? dist.map(d => d.type) : ['艺术型(A)', '企业型(E)', '研究型(I)', '社会型(S)', '常规型(C)', '实用型(R)'];
        const hollandValues = dist.length ? dist.map(d => d.score) : [35, 25, 20, 10, 6, 4];
        const safePct = (n) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
        // 能力分：总分 100，最低 60，避免出现 0 分或超过 100
        const safeAbilityScore = (n) => { const v = Number(n); return Number.isFinite(v) ? Math.max(60, Math.min(100, v)) : 60; };
        // 能力柱状图：合并 strengths + areas，按能力名去重（保留首次出现，避免「沟通表达能力」等重复）
        const allAbilitiesRaw = strengths.concat(areas);
        const uniqueAbilities = [...new Map(allAbilitiesRaw.map(a => [a.ability || a.name || '', a])).values()].filter(a => a.ability || a.name);
        const allAbilities = uniqueAbilities.length ? uniqueAbilities : allAbilitiesRaw;
        const abilityLabels = allAbilities.map(a => a.ability || a.name);
        const abilityValues = allAbilities.map(a => safeAbilityScore(a.score));
        // 优势能力卡片：无 strengths[0] 时从能力详细分析中取分数最高的两项
        const sortedByScore = allAbilities.length ? [...allAbilities].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)) : [];
        const topAbility = sortedByScore[0] || null;
        const secondAbility = sortedByScore[1] || null;
        // 性格特质：后端/AI 返回 0-100，进度条与雷达图满分基准 = 100
        const TRAIT_MAX_SCORE = 100;
        if (traits.length) {
            traits.forEach(t => { console.log('[性格特质]', t.trait_name, 'score=', t.score, '范围应为 0-' + TRAIT_MAX_SCORE); });
        }
        const radarLabels = traits.map(t => t.trait_name);
        const radarValues = traits.map(t => safePct(Number(t.score) || 0));

        const reportId = this.currentReportId;
        let html = `
            <div class="report-export-bar no-print">
                <button type="button" id="reportExportPdfBtn" class="btn-export-pdf">导出 PDF</button>
            </div>
            <div id="reportPdfContent" class="report-wrap">
                <div class="report-header-card">
                    <div class="header-tag">CAREER ASSESSMENT REPORT</div>
                    <h3>${data.title || '职业测评报告'}</h3>
                    <p class="header-sub">基于 Holland RIASEC × MBTI 双维度综合分析</p>
                    <div class="header-meta">
                        <div class="meta-item"><span class="meta-label">Holland Code</span><span class="meta-value">${interest.holland_code || '—'}</span></div>
                        <div class="meta-item"><span class="meta-label">MBTI 类型</span><span class="meta-value">${mbti}</span></div>
                        <div class="meta-item"><span class="meta-label">兴趣匹配度</span><span class="meta-value">${primary.score != null ? primary.score + '分' : '—'}</span></div>
                        <div class="meta-item"><span class="meta-label">生成时间</span><span class="meta-value" id="reportGenTime">${genTime}</span></div>
                    </div>
                </div>
                <div class="report-summary-grid">
                    <div class="report-summary-card c1">
                        <div class="card-icon">✨</div>
                        <div class="card-label">主要兴趣类型</div>
                        <div class="card-value">${primary.type || '—'}</div>
                        <div class="card-sub">${(primary.description || '').replace(/[,，]/g, ' · ').slice(0, 28)}${(primary.description || '').length > 28 ? '…' : ''}</div>
                    </div>
                    <div class="report-summary-card c2">
                        <div class="card-icon">☀️</div>
                        <div class="card-label">优势能力</div>
                        <div class="card-value">${(strengths[0] || topAbility) ? (strengths[0] || topAbility).ability + ' ' + safeAbilityScore((strengths[0] || topAbility).score) + '分' : '—'}</div>
                        <div class="card-sub">${(strengths[1] || secondAbility) ? (strengths[1] || secondAbility).ability + ' ' + safeAbilityScore((strengths[1] || secondAbility).score) + '分' : ''}</div>
                        ${(strengths[1] || secondAbility) ? `<div class="card-sub-bar"><div class="card-sub-bar-inner" style="width:${safeAbilityScore((strengths[1] || secondAbility).score)}%"></div></div>` : ''}
                    </div>
                    <div class="report-summary-card c3">
                        <div class="card-icon">🎯</div>
                        <div class="card-label">最匹配职业</div>
                        <div class="card-value">${careers[0] ? careers[0].career : (fields[0] || '—')}</div>
                        <div class="card-sub">${(fields.length ? fields.slice(1, 3) : careers.slice(1, 3).map(c => c.career)).join(' · ') || ''}</div>
                    </div>
                </div>
                <div class="report-charts-grid">
                    <div class="report-chart-card">
                        <div class="report-chart-title">Holland 兴趣分布</div>
                        <div class="report-chart-wrap"><canvas id="reportHollandChart"></canvas></div>
                    </div>
                    <div class="report-chart-card">
                        <div class="report-chart-title">能力评分对比</div>
                        <div class="report-chart-wrap"><canvas id="reportAbilityBar"></canvas></div>
                    </div>
                </div>
                <div class="report-section-card">
                    <div class="report-section-title"><span class="dot"></span>综合能力图谱</div>
                    <div class="report-radar-wrap"><canvas id="reportRadarChart"></canvas></div>
                </div>
                ${traits.length ? `
                <div class="report-section-card">
                    <div class="report-section-title"><span class="dot"></span>性格特质分析 — ${mbti}</div>
                    <div class="report-trait-list">
                        ${traits.map(t => {
                            const scoreNum = Number(t.score) || 0;
                            const pct = safePct((scoreNum / TRAIT_MAX_SCORE) * 100);
                            const levelClass = pct >= 60 ? 'report-level-high' : pct >= 40 ? 'report-level-mid' : 'report-level-low';
                            const levelText = pct >= 60 ? '偏强' : pct >= 40 ? '中等' : '偏低';
                            return `<div class="report-trait-item">
                                <span class="report-trait-name">${t.trait_name}</span>
                                <div class="report-trait-bar-bg"><div class="report-trait-bar" style="width:${pct}%; background:linear-gradient(90deg,#667eea,#764ba2)"></div></div>
                                <span class="report-trait-score">${t.score}分 <span class="report-level-tag ${levelClass}">${t.level || levelText}</span></span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="report-section-card">
                    <div class="report-section-title"><span class="dot"></span>适合职业领域推荐</div>
                    <div class="report-career-grid">
                        ${(fields.length ? fields : careers.map(c => c.career)).slice(0, 5).map((name, i) => `
                            <div class="report-career-chip"><span class="num">${String(i + 1).padStart(2, '0')}</span>${name}</div>
                        `).join('')}
                    </div>
                </div>
                <div class="report-section-card">
                    <div class="report-section-title"><span class="dot"></span>能力详细分析</div>
                    <div class="report-ability-grid">
                        ${allAbilities.map(a => {
                            const score = safeAbilityScore(a.score);
                            const cls = score >= 75 ? 'excellent' : score >= 60 ? 'good' : 'needs';
                            const color = score >= 75 ? '#48bb78' : score >= 60 ? '#f5a623' : '#e94560';
                            const level = score >= 80 ? '优秀' : score >= 70 ? '良好' : score >= 60 ? '一般' : '重点提升';
                            const levelTag = score >= 70 ? 'report-level-high' : score >= 50 ? 'report-level-mid' : 'report-level-low';
                            return `<div class="report-ability-card">
                                <div class="report-ability-name">${a.ability}</div>
                                <div class="report-ability-score-row">
                                    <span class="report-ability-score" style="color:${color}">${score}分</span>
                                    <span class="report-level-tag ${levelTag}">${level}</span>
                                </div>
                                <div class="report-ability-bar-bg"><div class="report-ability-bar" style="width:${score}%; background:linear-gradient(90deg,${color},${color}99)"></div></div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ${suggestions.length ? `
                <div class="report-section-card">
                    <div class="report-section-title"><span class="dot"></span>AI 个性化发展建议</div>
                    <div class="report-suggestion-block">
                        <span class="report-suggestion-icon">💭</span>
                        <div class="report-suggestion-text">${suggestions.length ? suggestions.map((s, i) => (i ? ' ' : '') + s).join('') : '结合兴趣与能力，建议持续学习、实践，并关注目标行业动态。'}</div>
                    </div>
                </div>
                ` : ''}
                <div class="report-footer-text">本报告由 AI 职业规划智能体生成 · 仅供参考，具体决策请结合个人实际情况</div>
                <div class="report-export-bar report-export-bottom no-print" style="margin-top:24px;">
                    <button type="button" id="reportExportPdfDirectBtn" class="btn-export-pdf">导出 PDF</button>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // 顶部：导出 PDF 打开打印页
        document.getElementById('reportExportPdfBtn')?.addEventListener('click', () => {
            const id = reportId || this.currentReportId;
            if (id) window.open('report/print.html?id=' + encodeURIComponent(id), '_blank');
        });

        // 底部：导出 PDF 直接下载（html2canvas + jsPDF）
        document.getElementById('reportExportPdfDirectBtn')?.addEventListener('click', () => {
            this.exportReportPdfDirect();
        });

        // 绘制图表
        this.drawReportCharts(contentDiv, {
            hollandLabels,
            hollandValues,
            abilityLabels,
            abilityValues,
            radarLabels,
            radarValues
        });
    }

    drawReportCharts(container, chartData) {
        if (typeof Chart === 'undefined') return;
        const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
        const { hollandLabels, hollandValues, abilityLabels, abilityValues, radarLabels, radarValues } = chartData;
        const hollandData = (hollandValues || []).map(toNum);
        const abilityData = (abilityValues || []).map(toNum);
        const radarData = (radarValues || []).map(toNum);
        const colors = ['#e94560', '#f5a623', '#667eea', '#48bb78', '#4facfe', '#a8dadc'];
        const pie = container.querySelector('#reportHollandChart');
        if (pie && pie.getContext) {
            new Chart(pie.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: hollandLabels,
                    datasets: [{ data: hollandData, backgroundColor: colors.slice(0, hollandLabels.length), borderWidth: 0, hoverOffset: 8 }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } } } }
            });
        }
        const bar = container.querySelector('#reportAbilityBar');
        if (bar && bar.getContext) {
            new Chart(bar.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: abilityLabels,
                    datasets: [{ label: '得分', data: abilityData, backgroundColor: abilityData.map((v) => v >= 70 ? '#48bb78cc' : v >= 50 ? '#f5a623cc' : '#e94560cc'), borderRadius: 8, borderSkipped: false }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { max: 100, grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
            });
        }
        const radar = container.querySelector('#reportRadarChart');
        if (radar && radar.getContext && radarLabels.length > 0) {
            new Chart(radar.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: radarLabels,
                    datasets: [
                        { label: '我的得分', data: radarData, backgroundColor: 'rgba(233,69,96,0.18)', borderColor: '#e94560', borderWidth: 2, pointBackgroundColor: '#e94560', pointRadius: 4 },
                        { label: '行业平均', data: radarLabels.map(() => 60), backgroundColor: 'rgba(102,126,234,0.08)', borderColor: '#667eea', borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 13 }, padding: 20, usePointStyle: true } } }, scales: { r: { min: 0, max: 100, grid: { color: '#e8e8e8' }, angleLines: { color: '#e8e8e8' }, ticks: { display: false }, pointLabels: { font: { size: 13 }, color: '#4a5568' } } } }
            });
        }
    }

    // 报告页底部「导出 PDF」：html2canvas + jsPDF 直接下载，不跳转
    async exportReportPdfDirect() {
        const el = document.getElementById('reportPdfContent');
        if (!el) {
            this.showToast('未找到报告内容', 'error');
            return;
        }
        if (typeof html2canvas === 'undefined') {
            this.showToast('请刷新页面后重试', 'error');
            return;
        }
        const JsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!JsPDF) {
            this.showToast('PDF 库未加载，请刷新后重试', 'error');
            return;
        }
        const btn = document.getElementById('reportExportPdfDirectBtn');
        if (btn) { btn.disabled = true; btn.textContent = '导出中...'; }
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new JsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = (canvas.height * pdfW) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
            pdf.save('职业测评报告.pdf');
            this.showToast('导出成功', 'success');
        } catch (e) {
            console.error('exportReportPdfDirect', e);
            this.showToast('导出失败，请重试', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '导出 PDF'; }
        }
    }

    // 查看职业规划历史报告（API 7.7）
    async viewCareerReportHistory() {
        const userId = getCurrentUserId();
        const historyDiv = document.getElementById('reportHistory');
        const listDiv = document.getElementById('historyList');
        if (!historyDiv || !listDiv) return;
        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }
        historyDiv.classList.remove('hidden');
        listDiv.innerHTML = '<div class="loading-message">加载历史报告中...</div>';
        try {
            const result = await getCareerReportHistory(userId);
            const list = result.success && result.data ? (result.data.list || []) : [];
            if (list.length > 0) {
                this.renderCareerReportHistory(list);
                this.showToast('已加载 ' + list.length + ' 条历史报告', 'success');
            } else {
                listDiv.innerHTML = '<div class="hint-text">暂无历史报告</div>';
            }
        } catch (e) {
            listDiv.innerHTML = '<div class="hint-text">加载失败，请稍后重试</div>';
        }
    }

    // 渲染职业规划历史报告列表
    renderCareerReportHistory(reports) {
        const listDiv = document.getElementById('historyList');
        listDiv.innerHTML = '';
        reports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'career-history-item';
            item.innerHTML = `
                <div class="history-item-main">
                    <div class="history-item-title">${report.primary_career || '职业规划报告'}</div>
                    <div class="history-item-meta">${this.formatDateTime(report.created_at)}</div>
                </div>
                <div class="history-item-score">完整度 ${report.completeness ?? '—'}%</div>
            `;
            item.addEventListener('click', () => {
                this.loadReportContent(report.report_id);
                document.getElementById('reportHistory')?.classList.add('hidden');
            });
            listDiv.appendChild(item);
        });
    }

    // 显示加载动画
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    // 隐藏加载动画
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    // 显示消息提示
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CareerPlanningApp();

    // 初始化日期输入框（即使没有加载档案数据）
    if (window.app && typeof window.app.initDateInput === 'function') {
        setTimeout(() => {
            window.app.initDateInput();
        }, 200);
    }
});
