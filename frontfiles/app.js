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
        var self = this;

        // 登录页：用事件委托，避免因 DOM 未就绪或元素未找到导致点击无反应
        document.body.addEventListener('submit', function(e) {
            var form = e.target;
            if (form && form.id === 'loginForm') {
                e.preventDefault();
                self.handleLogin();
            }
            if (form && form.id === 'registerForm') {
                e.preventDefault();
                self.handleRegisterForm();
            }
        });
        document.body.addEventListener('click', function(e) {
            var el = e.target.closest ? e.target.closest('[id]') : e.target;
            if (!el || !el.id) return;
            if (el.id === 'goRegister') {
                e.preventDefault();
                var loginPage = document.getElementById('loginPage');
                var registerPage = document.getElementById('registerPage');
                if (loginPage) loginPage.classList.add('hidden');
                if (registerPage) registerPage.classList.remove('hidden');
            }
            if (el.id === 'showLogin') {
                e.preventDefault();
                self.showPage('loginPage');
                var rp = document.getElementById('registerPage');
                if (rp) rp.classList.add('hidden');
            }
            if (el.id === 'forgotPasswordLink') {
                e.preventDefault();
                self.openForgotPasswordModal();
            }
            if (el.id === 'forgotPasswordClose') self.closeForgotPasswordModal();
            if (el.id === 'forgotSendCodeBtn') self.handleForgotSendCode();
            if (el.id === 'forgotResetBtn') self.handleForgotReset();
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

        // 岗位画像相关 Tab 切换
        document.querySelectorAll('#jobProfilePage .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchJobProfileTab(e.target.dataset.tab);
            });
        });

        document.getElementById('searchJobBtn')?.addEventListener('click', () => {
            this.searchJobs();
        });

        document.getElementById('analyzeBtn')?.addEventListener('click', () => {
            this.analyzeJobMatch();
        });

        // 职业规划报告相关
        document.getElementById('generateReportBtn')?.addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('viewHistoryBtn')?.addEventListener('click', () => {
            this.viewReportHistory();
        });

        // 岗位画像相关
        document.getElementById('jobProfileSearchBtn')?.addEventListener('click', () => {
            this.loadJobProfileList(1);
        });

        document.getElementById('jobProfileGraphBtn')?.addEventListener('click', () => {
            const jobId = document.getElementById('graphJobId')?.value.trim();
            if (jobId) {
                this.loadJobRelationGraph(jobId);
            } else {
                this.showToast('请输入岗位ID', 'error');
            }
        });

        document.getElementById('aiGenerateJobBtn')?.addEventListener('click', () => {
            this.generateJobProfile();
        });

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
            case 'matching':
                await this.loadMatchingData();
                break;
            case 'jobProfile':
                await this.loadJobProfileData();
                break;
            case 'report':
                await this.loadReportData();
                break;
        }
    }

    // 处理登录
    async handleLogin() {
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const usernameError = document.getElementById('loginUsernameError');
        const passwordError = document.getElementById('loginPasswordError');
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

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
        const result = await login(username, password);
        this.hideLoading();

        if (result.success) {
            localStorage.setItem('token', result.data.token);
            saveUserInfo(result.data);
            this.currentUser = result.data;
            this.showToast('登录成功', 'success');
            this.showMainApp();
        } else {
            this.showToast(result.msg || '登录失败', 'error');
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
        
        if (!introduction) {
            this.showToast('请介绍一下自己', 'error');
            return;
        }

        // 根据介绍生成用户信息
        const userInfo = this.generateUserInfoFromIntro(introduction);
        
        this.showLoading();
        const result = await register(userInfo.username, userInfo.password, userInfo.nickname);
        this.hideLoading();

        if (result.success) {
            this.showToast('注册成功，正在登录...', 'success');
            // 自动登录
            setTimeout(() => {
                this.autoLogin(userInfo.username, userInfo.password);
            }, 1000);
        } else {
            this.showToast(result.msg || '注册失败', 'error');
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

        // 获取推荐岗位数量
        const matchingResult = await getRecommendedJobs(userId, 10);
        if (matchingResult.success) {
            document.getElementById('matchedJobs').textContent = matchingResult.data.jobs.length;
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

    // 填充个人档案表单
    fillProfileForm(data) {
        if (data.basic_info) {
            const basic = data.basic_info;
            const nicknameInput = document.getElementById('nickname');
            const genderInput = document.getElementById('gender');
            const birthInput = document.getElementById('birthDate');
            const phoneInput = document.getElementById('phone');
            const emailInput = document.getElementById('email');

            if (basic.nickname) nicknameInput.value = basic.nickname;
            if (basic.gender) genderInput.value = basic.gender;
            if (basic.birth_date) birthInput.value = this.formatDateForDisplay(basic.birth_date);
            if (basic.phone) phoneInput.value = basic.phone;
            if (basic.email) emailInput.value = basic.email;
        }
        
        // 初始化日期输入框的手动输入处理
        this.initDateInput();

        if (data.education_info) {
            const edu = data.education_info;
            const schoolInput = document.getElementById('school');
            const majorInput = document.getElementById('major');
            const degreeInput = document.getElementById('degree');
            const gradeInput = document.getElementById('grade');
            const gradInput = document.getElementById('expectedGraduation');
            const gpaInput = document.getElementById('gpa');

            if (edu.school) schoolInput.value = edu.school;
            if (edu.major) majorInput.value = edu.major;
            if (edu.degree) degreeInput.value = edu.degree;
            if (edu.grade) gradeInput.value = edu.grade;
            if (edu.expected_graduation) gradInput.value = this.formatMonthForDisplay(edu.expected_graduation);
            if (edu.gpa) gpaInput.value = edu.gpa;
        }

        // 填充技能
        if (data.skills && data.skills.length > 0) {
            const container = document.getElementById('skillsContainer');
            container.innerHTML = '';
            data.skills.forEach(skill => {
                const div = document.createElement('div');
                div.className = 'skill-category';
                div.innerHTML = `
                    <input type="text" placeholder="技能分类" class="skill-category-input" value="${skill.category}">
                    <input type="text" placeholder="技能列表" class="skill-items-input" value="${skill.items.join(', ')}">
                `;
                container.appendChild(div);
            });
        }
    }

    // 将简历解析结果转换为档案结构，便于直接填充表单
    transformParsedResumeData(parsed) {
        if (!parsed || typeof parsed !== 'object') return {};

        const basic = parsed.basic_info || {};
        // 后端可能返回 education 为对象（map），也可能是数组；两者都兼容
        const firstEdu = Array.isArray(parsed.education)
            ? (parsed.education[0] || {})
            : (parsed.education || {});
        const skillsFromResume = Array.isArray(parsed.skills) ? parsed.skills : [];

        const profileData = {
            basic_info: {
                // 只在有值时填写，避免用空字符串覆盖原来的内容
                ...(basic.name || basic.nickname ? { nickname: basic.name || basic.nickname } : {}),
                ...(basic.gender ? { gender: basic.gender } : {}),
                ...(basic.birth_date || basic.birthday ? { birth_date: basic.birth_date || basic.birthday } : {}),
                ...(basic.phone ? { phone: basic.phone } : {}),
                ...(basic.email ? { email: basic.email } : {})
            },
            education_info: {
                ...(firstEdu.school || firstEdu.school_name ? { school: firstEdu.school || firstEdu.school_name } : {}),
                ...(firstEdu.major ? { major: firstEdu.major } : {}),
                ...(firstEdu.degree || firstEdu.education ? { degree: firstEdu.degree || firstEdu.education } : {}),
                ...(firstEdu.grade ? { grade: firstEdu.grade } : {}),
                ...(firstEdu.expected_graduation || firstEdu.graduation_date || firstEdu.end_date ? { expected_graduation: firstEdu.expected_graduation || firstEdu.graduation_date || firstEdu.end_date } : {}),
                ...(firstEdu.gpa ? { gpa: firstEdu.gpa } : {})
            },
            skills: []
        };

        if (skillsFromResume.length > 0) {
            // 兼容字符串数组或对象数组两种情况
            if (typeof skillsFromResume[0] === 'string') {
                profileData.skills.push({
                    category: '简历技能',
                    items: skillsFromResume
                });
            } else {
                skillsFromResume.forEach(s => {
                    if (!s) return;
                    if (typeof s === 'string') {
                        profileData.skills.push({
                            category: '简历技能',
                            items: [s]
                        });
                    } else {
                        const category = s.category || s.type || '简历技能';
                        const items = Array.isArray(s.items)
                            ? s.items
                            : (s.name ? [s.name] : []);
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
                    
                    // 如果后端返回了解析后的档案结构，优先转换后直接填充到表单中
                    const parsedData = result.data.parsed_data || result.data.profile || null;
                    if (parsedData) {
                        try {
                            const profileData = this.transformParsedResumeData(parsedData);
                            this.fillProfileForm(profileData);
                        } catch (e) {
                            console.error('应用简历解析结果到表单时出错:', e);
                        }
                    }
                    
                    // 清空文件输入框
                    const fileInput = document.getElementById('resumeFile');
                    if (fileInput) fileInput.value = '';
                    
                    // 再从后端刷新一次档案数据，保证前后端数据一致
                    await this.loadProfileData();
                    
                    this.showToast('简历解析完成，档案信息已更新', 'success');
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

    // 加载岗位匹配数据
    async loadMatchingData() {
        await this.loadRecommendedJobs();
        await this.loadJobList();
    }

    // 加载推荐岗位
    async loadRecommendedJobs() {
        const userId = getCurrentUserId();
        const container = document.getElementById('recommendedJobs');
        container.innerHTML = '<div class="loading-message">加载推荐岗位中...</div>';

        const result = await getRecommendedJobs(userId, 10);

        if (result.success && result.data.jobs) {
            this.renderJobs(result.data.jobs, container);
        } else {
            container.innerHTML = '<div class="hint-text">暂无推荐岗位</div>';
        }
    }

    // 渲染岗位列表
    renderJobs(jobs, container) {
        container.innerHTML = '';

        jobs.forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            
            const tags = job.required_skills ? 
                job.required_skills.slice(0, 3).map(skill => 
                    `<span class="job-tag">${skill}</span>`
                ).join('') : '';

            jobCard.innerHTML = `
                <div class="job-card-header">
                    <div class="job-title">${job.job_name}</div>
                    <div class="job-company">${job.company || '多家公司'}</div>
                </div>
                <div class="job-tags">${tags}</div>
                <div class="match-score">
                    <span class="score-label">匹配度</span>
                    <span class="score-value">${job.match_score || '--'}%</span>
                </div>
            `;

            jobCard.addEventListener('click', () => {
                this.showJobDetail(job);
            });

            container.appendChild(jobCard);
        });
    }

    // 显示岗位详情
    showJobDetail(job) {
        alert('岗位详情:\n' + JSON.stringify(job, null, 2));
        // 实际项目中应该创建一个美观的详情页面
    }

    // 加载岗位列表（用于分析）
    async loadJobList() {
        const result = await getJobList(1, 50);
        
        if (result.success && result.data.list) {
            const select = document.getElementById('jobSelect');
            if (select) {
                select.innerHTML = '<option value="">选择一个岗位进行分析</option>';
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

    // 加载岗位画像页面数据
    async loadJobProfileData() {
        await this.loadJobProfileList();
    }

    // 4.1 加载岗位画像列表
    async loadJobProfileList(page = 1) {
        const container = document.getElementById('jobProfileList');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-message">加载岗位列表中...</div>';

        const keyword = document.getElementById('jobProfileKeyword')?.value.trim() || '';
        const industry = document.getElementById('jobProfileIndustry')?.value || '';
        const level = document.getElementById('jobProfileLevel')?.value || '';

        const result = await getJobProfiles(page, 20, keyword, industry, level);

        if (result.success && result.data.list) {
            this.renderJobProfileList(result.data, container);
        } else {
            container.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '未知错误') + '</div>';
        }
    }

    // 渲染岗位画像列表
    renderJobProfileList(data, container) {
        container.innerHTML = '';

        if (!data.list || data.list.length === 0) {
            container.innerHTML = '<div class="hint-text">暂无岗位数据</div>';
            return;
        }

        data.list.forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.style.cursor = 'pointer';
            
            const tags = job.tags ? job.tags.slice(0, 3).map(tag => 
                `<span class="job-tag">${tag}</span>`
            ).join('') : '';

            const skills = job.skills ? job.skills.slice(0, 4).map(skill => 
                `<span class="skill-badge">${skill}</span>`
            ).join('') : '';

            jobCard.innerHTML = `
                <div class="job-card-header">
                    <div class="job-title">${job.job_name || '-'}</div>
                    <div class="job-meta">
                        <span>${job.industry || '-'}</span> | 
                        <span>${job.level || '-'}</span>
                    </div>
                </div>
                <div class="job-salary">${job.avg_salary || '-'}</div>
                <div class="job-tags">${tags}</div>
                <div class="job-skills">${skills}</div>
                <div class="job-footer">
                    <span class="demand-score">需求热度: ${job.demand_score || '--'}</span>
                    <span class="growth-trend">${job.growth_trend || '--'}</span>
                </div>
            `;

            jobCard.addEventListener('click', () => {
                this.showJobProfileDetail(job.job_id || job.job_name, !job.job_id);
            });

            container.appendChild(jobCard);
        });

        // 分页
        if (data.total > 20) {
            const pagination = document.createElement('div');
            pagination.className = 'pagination';
            pagination.innerHTML = `
                <button onclick="app.loadJobProfileList(${data.page - 1})" ${data.page <= 1 ? 'disabled' : ''}>上一页</button>
                <span>第 ${data.page} 页 / 共 ${Math.ceil(data.total / 20)} 页</span>
                <button onclick="app.loadJobProfileList(${data.page + 1})" ${data.page >= Math.ceil(data.total / 20) ? 'disabled' : ''}>下一页</button>
            `;
            container.appendChild(pagination);
        }
    }

    // 4.2 显示岗位详细画像
    async showJobProfileDetail(jobIdOrName, byName = false) {
        const detailContainer = document.getElementById('jobProfileDetail');
        if (!detailContainer) return;

        detailContainer.innerHTML = '<div class="loading-message">加载岗位详情中...</div>';
        detailContainer.classList.remove('hidden');

        const result = await getJobProfileDetail(jobIdOrName, !byName);

        if (result.success) {
            this.renderJobProfileDetail(result.data, detailContainer);
        } else {
            detailContainer.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '未知错误') + '</div>';
        }
    }

    // 渲染岗位详细画像
    renderJobProfileDetail(data, container) {
        let html = `
            <div class="job-detail-header">
                <h3>${data.job_name || '-'}</h3>
                <button onclick="document.getElementById('jobProfileDetail').classList.add('hidden')" class="btn-secondary">关闭</button>
            </div>
        `;

        // 基本信息
        if (data.basic_info) {
            const bi = data.basic_info;
            html += `
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <table class="detail-table">
                        <tr><th>行业</th><td>${bi.industry || '-'}</td></tr>
                        <tr><th>级别</th><td>${bi.level || '-'}</td></tr>
                        <tr><th>平均薪资</th><td>${bi.avg_salary || '-'}</td></tr>
                        <tr><th>工作地点</th><td>${bi.work_locations ? bi.work_locations.join(', ') : '-'}</td></tr>
                        <tr><th>公司规模</th><td>${bi.company_scales ? bi.company_scales.join(', ') : '-'}</td></tr>
                        <tr><th>描述</th><td>${bi.description || '-'}</td></tr>
                    </table>
                </div>
            `;
        }

        // 能力要求
        if (data.requirements) {
            html += `<div class="detail-section"><h4>能力要求</h4>`;
            
            if (data.requirements.basic_requirements) {
                html += `<h5>基础要求</h5>`;
                const br = data.requirements.basic_requirements;
                if (br.education) {
                    html += `<p>学历: ${br.education.level || '-'}</p>`;
                    html += `<p>专业: ${br.education.preferred_majors ? br.education.preferred_majors.join(', ') : '-'}</p>`;
                }
            }

            if (data.requirements.professional_skills) {
                html += `<h5>专业技能</h5>`;
                const ps = data.requirements.professional_skills;
                if (ps.programming_languages) {
                    html += `<p><strong>编程语言:</strong> ${ps.programming_languages.map(s => `${s.skill}(${s.level})`).join(', ')}</p>`;
                }
                if (ps.frameworks_tools) {
                    html += `<p><strong>框架工具:</strong> ${ps.frameworks_tools.map(s => `${s.skill}(${s.level})`).join(', ')}</p>`;
                }
            }

            html += `</div>`;
        }

        // 市场分析
        if (data.market_analysis) {
            const ma = data.market_analysis;
            html += `
                <div class="detail-section">
                    <h4>市场分析</h4>
                    <p>需求热度: ${ma.demand_score || '-'}</p>
                    <p>发展趋势: ${ma.growth_trend || '-'}</p>
                    <p>薪资范围: ${ma.salary_range ? JSON.stringify(ma.salary_range) : '-'}</p>
                </div>
            `;
        }

        // 发展路径
        if (data.career_path) {
            html += `
                <div class="detail-section">
                    <h4>职业发展路径</h4>
                    <p>当前级别: ${data.career_path.current_level || '-'}</p>
                    ${data.career_path.promotion_path ? data.career_path.promotion_path.map(path => 
                        `<div style="margin: 10px 0; padding: 10px; background: #f1f5f9; border-radius: 4px;">
                            <strong>${path.level}</strong> (${path.years_required})
                            <ul>${path.key_requirements.map(r => `<li>${r}</li>`).join('')}</ul>
                        </div>`
                    ).join('') : ''}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // 4.3 加载岗位关联图谱
    async loadJobRelationGraph(jobId) {
        const graphContainer = document.getElementById('jobProfileGraph');
        if (!graphContainer) return;

        graphContainer.innerHTML = '<div class="loading-message">加载图谱中...</div>';

        const graphType = document.getElementById('graphTypeSelect')?.value || 'all';
        const result = await getJobRelationGraph(jobId, graphType);

        if (result.success) {
            this.renderJobRelationGraph(result.data, graphContainer);
        } else {
            graphContainer.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '未知错误') + '</div>';
        }
    }

    // 渲染岗位关联图谱
    renderJobRelationGraph(data, container) {
        let html = `<h4>岗位关联图谱</h4>`;

        if (data.vertical_graph && data.vertical_graph.nodes && data.vertical_graph.nodes.length > 0) {
            html += `<h5>垂直晋升路径</h5><div class="graph-nodes">`;
            data.vertical_graph.nodes.forEach(node => {
                html += `<div class="graph-node">${node.job_name} (L${node.level})</div>`;
            });
            html += `</div>`;
        }

        if (data.transfer_graph && data.transfer_graph.nodes && data.transfer_graph.nodes.length > 0) {
            html += `<h5>横向转岗路径</h5><div class="graph-nodes">`;
            data.transfer_graph.nodes.forEach(node => {
                html += `<div class="graph-node">${node.job_name}</div>`;
            });
            html += `</div>`;
        }

        container.innerHTML = html;
    }

    // 4.4 + 4.5 AI 生成岗位画像
    async generateJobProfile() {
        const jobNameInput = document.getElementById('aiJobName');
        const jobDescriptionsInput = document.getElementById('aiJobDescriptions');
        
        if (!jobNameInput || !jobNameInput.value.trim()) {
            this.showToast('请输入岗位名称', 'error');
            return;
        }

        const jobName = jobNameInput.value.trim();
        const jobDescriptions = jobDescriptionsInput ? jobDescriptionsInput.value.split('\n').filter(d => d.trim()) : [];
        const sampleSize = parseInt(document.getElementById('aiSampleSize')?.value || '30');

        const statusDiv = document.getElementById('aiGenerateStatus');
        if (statusDiv) {
            statusDiv.textContent = 'AI生成中...';
            statusDiv.style.background = '#e0f2fe';
        }

        const result = await aiGenerateJobProfile(jobName, jobDescriptions, sampleSize);

        if (result.success) {
            const taskId = result.data.task_id;
            this.pollJobAiGenerateResult(taskId);
        } else {
            if (statusDiv) {
                statusDiv.textContent = '生成失败: ' + result.msg;
                statusDiv.style.background = '#fee2e2';
            }
        }
    }

    // 轮询 AI 生成结果
    async pollJobAiGenerateResult(taskId, maxAttempts = 20) {
        let attempts = 0;
        const statusDiv = document.getElementById('aiGenerateStatus');
        const resultContainer = document.getElementById('aiGenerateResult');

        const poll = async () => {
            if (attempts >= maxAttempts) {
                if (statusDiv) statusDiv.textContent = '生成超时，请稍后查看';
                return;
            }

            const result = await getJobAiGenerateResult(taskId);

            if (result.success) {
                if (result.data.status === 'completed') {
                    if (statusDiv) {
                        statusDiv.textContent = '生成完成！';
                        statusDiv.style.background = '#dcfce7';
                    }
                    if (resultContainer) {
                        resultContainer.innerHTML = `
                            <h4>AI生成结果</h4>
                            <p>置信度: ${(result.data.ai_confidence * 100).toFixed(1)}%</p>
                            <p>数据源: ${result.data.data_sources.total_samples} 个样本</p>
                            <button onclick="app.showJobProfileDetail('${result.data.job_profile.job_id || result.data.job_profile.job_name}', ${!result.data.job_profile.job_id})" class="btn-primary">查看画像</button>
                        `;
                    }
                } else if (result.data.status === 'failed') {
                    if (statusDiv) {
                        statusDiv.textContent = '生成失败';
                        statusDiv.style.background = '#fee2e2';
                    }
                } else {
                    attempts++;
                    if (statusDiv) statusDiv.textContent = `生成中... (${attempts * 3}秒)`;
                    setTimeout(poll, 3000);
                }
            } else {
                attempts++;
                setTimeout(poll, 3000);
            }
        };

        poll();
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
    }

    // 切换岗位画像标签页
    switchJobProfileTab(tabName) {
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

    // 搜索岗位
    async searchJobs() {
        const keyword = document.getElementById('jobSearchInput').value.trim();
        if (!keyword) {
            this.showToast('请输入搜索关键词', 'error');
            return;
        }

        const container = document.getElementById('searchResults');
        container.innerHTML = '<div class="loading-message">搜索中...</div>';

        const result = await searchJobs(keyword);
        const list = (result.data && (result.data.list || result.data.jobs)) || [];

        if (result.success && list.length > 0) {
            this.renderJobs(list, container);
        } else {
            container.innerHTML = '<div class="hint-text">未找到相关岗位</div>';
        }
    }

    // 分析岗位匹配
    async analyzeJobMatch() {
        const jobName = document.getElementById('jobSelect').value;
        if (!jobName) {
            this.showToast('请选择一个岗位', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const container = document.getElementById('analysisResult');
        container.innerHTML = '<div class="loading-message">分析中...</div>';

        const result = await analyzeJobMatch(userId, jobName);

        if (result.success) {
            this.renderAnalysisResult(result.data);
        } else {
            container.innerHTML = '<div class="hint-text">分析失败: ' + result.msg + '</div>';
        }
    }

    // 渲染分析结果
    renderAnalysisResult(data) {
        const container = document.getElementById('analysisResult');
        
        let gapsHtml = '';
        if (data.gap_analysis && data.gap_analysis.length > 0) {
            gapsHtml = data.gap_analysis.map(gap => `
                <div style="margin-bottom: 12px; padding: 12px; background: #f1f5f9; border-radius: 8px;">
                    <strong>${gap.dimension}:</strong> ${gap.description}
                </div>
            `).join('');
        }

        container.innerHTML = `
            <h3 style="color: var(--primary-color); margin-bottom: 20px;">匹配分析结果</h3>
            <div style="margin-bottom: 24px;">
                <div style="font-size: 48px; font-weight: 700; color: var(--primary-color); text-align: center;">
                    ${data.match_score}%
                </div>
                <div style="text-align: center; color: var(--text-secondary); margin-top: 8px;">
                    综合匹配度
                </div>
            </div>
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px;">能力差距分析</h4>
                ${gapsHtml || '<p>暂无差距分析</p>'}
            </div>
            <div>
                <h4 style="margin-bottom: 12px;">提升建议</h4>
                <p>${data.improvement_suggestions || '继续保持当前学习状态'}</p>
            </div>
        `;
    }

    // 加载职业规划报告数据（进入本页时尝试恢复上次的测评报告）
    async loadReportData() {
        const userId = getCurrentUserId();
        if (!userId) return;
        const reportId = this.getLastAssessmentReportId();
        if (!reportId) return;
        const contentDiv = document.getElementById('reportContent');
        const result = await getAssessmentReport(userId, reportId);
        if (result.success && result.data && result.data.status === 'completed') {
            this.currentReportId = reportId;
            this.renderReportContent(result.data);
        }
    }

    // 生成职业规划报告
    async generateReport() {
        const userId = getCurrentUserId();
        
        if (!confirm('生成职业规划报告需要几分钟时间，确定要开始吗？')) {
            return;
        }

        const contentDiv = document.getElementById('reportContent');
        contentDiv.innerHTML = '<div class="loading-message">正在生成报告，请稍候...</div>';

        const result = await generateCareerReport(userId);

        if (result.success) {
            this.showToast('报告生成中...', 'success');
            
            // 轮询获取报告状态
            this.pollReportStatus(result.data.task_id);
        } else {
            contentDiv.innerHTML = '<div class="hint-text">生成失败: ' + result.msg + '</div>';
        }
    }

    // 轮询报告生成状态
    async pollReportStatus(taskId, maxAttempts = 20) {
        let attempts = 0;
        const contentDiv = document.getElementById('reportContent');

        const poll = async () => {
            if (attempts >= maxAttempts) {
                contentDiv.innerHTML = '<div class="hint-text">生成超时，请稍后查看历史报告</div>';
                return;
            }

            const result = await getReportStatus(taskId);

            if (result.success) {
                if (result.data.status === 'completed') {
                    this.showToast('报告生成完成！', 'success');
                    
                    // 加载报告内容
                    this.loadReportContent(result.data.report_id);
                } else if (result.data.status === 'failed') {
                    contentDiv.innerHTML = '<div class="hint-text">生成失败，请重试</div>';
                } else {
                    attempts++;
                    contentDiv.innerHTML = `<div class="loading-message">正在生成报告... (${result.data.progress || 0}%)</div>`;
                    setTimeout(poll, 3000);
                }
            } else {
                attempts++;
                setTimeout(poll, 3000);
            }
        };

        poll();
    }

    // 加载职业规划报告内容（POST /career/view-report）
    async loadReportContent(reportId) {
        const contentDiv = document.getElementById('reportContent');
        contentDiv.innerHTML = '<div class="loading-message">加载报告内容中...</div>';

        const result = await getReportContent(reportId);

        if (result.success) {
            this.renderReportContent(result.data);
        } else {
            contentDiv.innerHTML = '<div class="hint-text">加载失败</div>';
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
        // 能力柱状图：合并 strengths + areas
        const allAbilities = strengths.concat(areas);
        const abilityLabels = allAbilities.map(a => a.ability);
        const abilityValues = allAbilities.map(a => a.score);
        // 雷达图：性格特质分数（0-100 归一化）
        const radarLabels = traits.map(t => t.trait_name);
        const radarValues = traits.map(t => Math.min(100, Math.max(0, Number(t.score) || 0) * 4));
        const safePct = (n) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };

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
                        <div class="card-value">${strengths[0] ? strengths[0].ability + ' ' + strengths[0].score + '分' : '—'}</div>
                        <div class="card-sub">${strengths[1] ? strengths[1].ability + ' ' + strengths[1].score + '分' : ''}</div>
                        ${strengths[1] ? `<div class="card-sub-bar"><div class="card-sub-bar-inner" style="width:${safePct(strengths[1].score)}%"></div></div>` : ''}
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
                            const pct = safePct(Math.min(100, (Number(t.score) || 0) * 4));
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
                            const score = safePct(a.score);
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

    // 查看历史报告
    async viewReportHistory() {
        console.log('查看历史报告被点击');
        const userId = getCurrentUserId();
        const historyDiv = document.getElementById('reportHistory');
        const listDiv = document.getElementById('historyList');
        if (!historyDiv || !listDiv) {
            console.warn('viewReportHistory: reportHistory 或 historyList 元素不存在');
            return;
        }
        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }

        historyDiv.classList.remove('hidden');
        listDiv.innerHTML = '<div class="loading-message">加载历史报告中...</div>';

        try {
            const result = await getReportHistory(userId);
            console.log('历史报告接口原始 result:', result);
            console.log('历史报告数据:', result.data);

            const list = result.success && result.data
                ? (Array.isArray(result.data) ? result.data : (result.data.list || result.data.reports || []))
                : [];
            console.log('解析后 list 条数:', list.length, 'list:', list);

            if (list.length > 0) {
                this.renderReportHistory(list);
                historyDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.showToast('已加载 ' + list.length + ' 条历史报告', 'success');
            } else {
                listDiv.innerHTML = '<div class="hint-text">暂无历史报告</div>';
            }
        } catch (e) {
            console.error('查看历史报告失败', e);
            listDiv.innerHTML = '<div class="hint-text">加载失败，请稍后重试</div>';
        }
    }

    // 渲染历史报告列表
    renderReportHistory(reports) {
        const listDiv = document.getElementById('historyList');
        listDiv.innerHTML = '';

        reports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">
                            ${(report.holland_code || '') + (report.mbti ? ' · ' + report.mbti : '') || '职业测评报告'}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 14px;">
                            生成于 ${report.created_at || this.formatDateTime(report.created_at)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--primary-color); font-weight: 600;">
                            匹配度 ${report.match_score != null ? report.match_score : (report.completeness != null ? report.completeness : '—')}%
                        </div>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.loadAssessmentReportContent(report.report_id);
                var historyEl = document.getElementById('reportHistory');
                if (historyEl) historyEl.classList.add('hidden');
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
