// 应用主类
class CareerPlanningApp {
    constructor() {
        this.currentPage = 'login';
        this.currentUser = null;
        this.init();
    }

    // 初始化应用
    init() {
        // 检查登录状态
        if (isLoggedIn()) {
            this.currentUser = getUserInfo();
            this.showMainApp();
        } else {
            this.showPage('loginPage');
        }

        // 绑定事件
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

        // 登录页「创建账户」- 打开快速注册模态框
        document.getElementById('goRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showQuickRegisterModal();
        });
        
        // 关闭快速注册模态框
        document.getElementById('closeQuickRegisterModal')?.addEventListener('click', () => {
            this.hideQuickRegisterModal();
        });
        
        // 点击模态框外部关闭
        document.getElementById('quickRegisterModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'quickRegisterModal') {
                this.hideQuickRegisterModal();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('quickRegisterModal')?.classList.contains('hidden')) {
                this.hideQuickRegisterModal();
            }
        });
        
        // 快速注册提交按钮
        document.getElementById('handleQuickRegisterBtn')?.addEventListener('click', () => {
            this.handleQuickRegister();
        });
        
        // 字符计数
        document.getElementById('quickRegisterText')?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            const counterEl = document.getElementById('quickRegisterCharCount');
            if (counterEl) {
                counterEl.textContent = count;
                if (count > 200) {
                    counterEl.style.color = 'var(--danger-color)';
                } else {
                    counterEl.style.color = 'var(--text-secondary)';
                }
            }
            // 限制最大长度
            if (count > 200) {
                e.target.value = e.target.value.substring(0, 200);
            }
        });
        
        // 示例标签点击填充
        document.querySelectorAll('.example-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const textarea = document.getElementById('quickRegisterText');
                if (textarea) {
                    textarea.value = tag.textContent.trim();
                    textarea.focus();
                    // 触发input事件以更新字符计数
                    textarea.dispatchEvent(new Event('input'));
                }
            });
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

        // 岗位匹配相关
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
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

        // 获取测评状态
        const assessmentResult = await getAssessmentReport(userId);
        if (assessmentResult.success) {
            document.getElementById('assessmentStatus').textContent = '已完成';
        } else {
            document.getElementById('assessmentStatus').textContent = '未完成';
        }

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
        const firstEdu = Array.isArray(parsed.education) && parsed.education.length > 0
            ? parsed.education[0]
            : {};
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
                ...(firstEdu.graduation_date || firstEdu.end_date ? { expected_graduation: firstEdu.graduation_date || firstEdu.end_date } : {}),
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
        return value.replace(/-/g, '/');
    }

    // 将界面输入 YYYY/MM/DD 或 YYYY-MM-DD → 后端存储 YYYY-MM-DD
    normalizeDateForStorage(value) {
        if (!value) return '';
        const v = value.trim().replace(/[./年月日]/g, '-').replace(/\/+/g, '-');
        // 简单校验：YYYY-MM-DD
        const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!m) return value; // 格式不对就原样返回，避免卡死用户
        const mm = m[2].padStart(2, '0');
        const dd = m[3].padStart(2, '0');
        return `${m[1]}-${mm}-${dd}`;
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

    // 加载职业测评数据
    async loadAssessmentData() {
        const userId = getCurrentUserId();
        console.log('loadAssessmentData - userId:', userId);
        if (!userId) return;

        this.showLoading();
        const result = await getQuestionnaire(userId);
        this.hideLoading();

        console.log('loadAssessmentData - API result:', result);

        if (result.success) {
            console.log('loadAssessmentData - assessmentData:', result.data);
            this.renderQuestionnaire(result.data);
        } else {
            console.error('loadAssessmentData - API failed:', result.msg);
            document.getElementById('questionnaireContainer').innerHTML = '<div class="hint-text">加载失败: ' + result.msg + '</div>';
        }
    }

    // 渲染测评问卷
    renderQuestionnaire(assessmentData) {
        const container = document.getElementById('questionnaireContainer');
        container.innerHTML = '';

        console.log('renderQuestionnaire - assessmentData:', assessmentData);

        if (!assessmentData || !assessmentData.dimensions) {
            console.error('renderQuestionnaire - Invalid assessmentData:', assessmentData);
            container.innerHTML = '<div class="hint-text">数据格式错误，请重试</div>';
            return;
        }

        const { dimensions, total_questions, estimated_time } = assessmentData;

        dimensions.forEach((dimension, dimIndex) => {
            const dimensionDiv = document.createElement('div');
            dimensionDiv.className = 'dimension-section';
            
            let questionsHtml = '';
            dimension.questions.forEach((q, qIndex) => {
                let optionsHtml = '';
                
                if (q.question_type === 'single_choice') {
                    q.options.forEach((option, optionIndex) => {
                        optionsHtml += `
                            <label class="option-item">
                                <input type="radio" name="question_${q.question_id}" value="${option.option_id}">
                                <span>${option.option_text}</span>
                            </label>
                        `;
                    });
                } else if (q.question_type === 'scale') {
                    q.options.forEach((option, optionIndex) => {
                        optionsHtml += `
                            <label class="option-item scale-option">
                                <input type="radio" name="question_${q.question_id}" value="${option.option_id}">
                                <span>${option.option_text}</span>
                            </label>
                        `;
                    });
                }

                questionsHtml += `
                    <div class="question-card" data-question-id="${q.question_id}" data-question-type="${q.question_type}">
                        <div class="question-header">
                            <div class="question-number">${qIndex + 1}</div>
                            <div class="question-text">${q.question_text}</div>
                        </div>
                        <div class="options">${optionsHtml}</div>
                    </div>
                `;
            });

            dimensionDiv.innerHTML = `
                <div class="dimension-header">
                    <h3>${dimension.dimension_name}</h3>
                </div>
                <div class="dimension-questions">
                    ${questionsHtml}
                </div>
            `;

            container.appendChild(dimensionDiv);
        });

        // 显示提交按钮
        document.getElementById('assessmentActions').classList.remove('hidden');

        // 添加选项点击效果
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // 移除同组其他选项的选中样式
                const name = radio.name;
                document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                    r.closest('.option-item').classList.remove('selected');
                });
                
                // 添加当前选项的选中样式
                this.classList.add('selected');
            });
        });
    }

    // 提交测评
    async submitAssessment() {
        const answers = [];
        const questions = document.querySelectorAll('.question-card');

        // 收集答案
        questions.forEach(questionCard => {
            const questionHeader = questionCard.querySelector('.question-text');
            const selectedOption = questionCard.querySelector('input[type="radio"]:checked');
            
            if (selectedOption) {
                const questionId = selectedOption.name.replace('question_', '');
                answers.push({
                    question_id: questionId,
                    answer_index: parseInt(selectedOption.value),
                    score: parseFloat(selectedOption.dataset.score || 0)
                });
            }
        });

        // 检查是否所有问题都已回答
        if (answers.length < questions.length) {
            this.showToast('请回答所有问题', 'error');
            return;
        }

        const userId = getCurrentUserId();
        this.showLoading();
        const result = await submitAssessment(userId, answers);
        this.hideLoading();

        if (result.success) {
            this.showToast('测评提交成功', 'success');
            document.getElementById('viewReportBtn').classList.remove('hidden');
            
            // 显示测评报告
            setTimeout(() => {
                this.viewAssessmentReport();
            }, 1000);
        } else {
            this.showToast(result.msg || '提交失败', 'error');
        }
    }

    // 查看测评报告
    async viewAssessmentReport() {
        const userId = getCurrentUserId();
        this.showLoading();
        const result = await getAssessmentReport(userId);
        this.hideLoading();

        if (result.success) {
            // 切换到报告页面
            this.showPage('reportPage');
            // 渲染报告内容
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
            select.innerHTML = '<option value="">选择一个岗位进行分析</option>';
            
            result.data.list.forEach(job => {
                const option = document.createElement('option');
                option.value = job.job_name;
                option.textContent = job.job_name;
                select.appendChild(option);
            });
        }
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // 切换内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
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

        if (result.success && result.data.jobs && result.data.jobs.length > 0) {
            this.renderJobs(result.data.jobs, container);
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

    // 加载职业规划报告数据
    loadReportData() {
        // 初始化时不加载，等待用户操作
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

    // 加载报告内容
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

    // 渲染报告内容
    // 格式化时间（北京时间）
    formatDateTime(dateString) {
        if (!dateString) return '未知时间';
        
        try {
            const date = new Date(dateString);
            // 转换为北京时间（UTC+8）
            const beijingTime = new Date(date.getTime() + (8 * 60 * 60 * 1000) + (date.getTimezoneOffset() * 60 * 1000));
            
            const year = beijingTime.getFullYear();
            const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
            const day = String(beijingTime.getDate()).padStart(2, '0');
            const hours = String(beijingTime.getHours()).padStart(2, '0');
            const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
            
            return `${year}年${month}月${day}日 ${hours}:${minutes} (北京时间)`;
        } catch (error) {
            console.error('时间格式化错误:', error);
            return dateString;
        }
    }

    renderReportContent(data) {
        const contentDiv = document.getElementById('reportContent');
        
        let html = `
            <h3 style="color: var(--primary-color); margin-bottom: 20px;">
                ${data.title || '职业测评报告'}
            </h3>
            <div style="color: var(--text-secondary); margin-bottom: 32px;">
                生成时间: ${this.formatDateTime(data.created_at)}
            </div>
        `;

        // 兴趣分析表格
        if (data.interest_analysis) {
            html += `
                <div class="report-section">
                    <h4 style="color: var(--primary-color); margin-bottom: 16px;">职业兴趣分析</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>分析项目</th>
                                <th>结果</th>
                                <th>说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>霍兰德代码</td>
                                <td><strong>${data.interest_analysis.holland_code}</strong></td>
                                <td>职业兴趣类型组合</td>
                            </tr>
                            <tr>
                                <td>主要兴趣类型</td>
                                <td><strong>${data.interest_analysis.primary_interest.type}</strong></td>
                                <td>${data.interest_analysis.primary_interest.description}</td>
                            </tr>
                            <tr>
                                <td>兴趣匹配度</td>
                                <td><strong>${data.interest_analysis.primary_interest.score}分</strong></td>
                                <td>兴趣倾向强度</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <h5 style="margin-top: 20px; margin-bottom: 12px;">适合的职业领域</h5>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>序号</th>
                                <th>职业领域</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.interest_analysis.suitable_fields.forEach((field, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${field}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // 性格特质分析表格
        if (data.personality_analysis) {
            html += `
                <div class="report-section">
                    <h4 style="color: var(--primary-color); margin-bottom: 16px;">性格特质分析</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>MBTI类型</th>
                                <th colspan="3">${data.personality_analysis.mbti_type}</th>
                            </tr>
                            <tr>
                                <th>特质维度</th>
                                <th>得分</th>
                                <th>水平</th>
                                <th>说明</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.personality_analysis.traits.forEach(trait => {
                html += `
                    <tr>
                        <td>${trait.trait_name}</td>
                        <td><strong>${trait.score}分</strong></td>
                        <td><span class="trait-level">${trait.level}</span></td>
                        <td>基于测评结果的性格倾向</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // 能力分析表格
        if (data.ability_analysis) {
            html += `
                <div class="report-section">
                    <h4 style="color: var(--primary-color); margin-bottom: 16px;">能力分析</h4>
                    
                    <h5 style="margin-bottom: 12px;">优势能力</h5>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>能力项</th>
                                <th>得分</th>
                                <th>水平</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.ability_analysis.strengths.forEach(strength => {
                const level = strength.score >= 80 ? '优秀' : strength.score >= 70 ? '良好' : '一般';
                html += `
                    <tr>
                        <td>${strength.ability}</td>
                        <td><strong>${strength.score}分</strong></td>
                        <td><span class="ability-level excellent">${level}</span></td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                    
                    <h5 style="margin-top: 20px; margin-bottom: 12px;">待提升能力</h5>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>能力项</th>
                                <th>得分</th>
                                <th>水平</th>
                                <th>建议</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.ability_analysis.areas_to_improve.forEach(area => {
                const level = area.score >= 70 ? '一般' : area.score >= 60 ? '需提升' : '重点提升';
                html += `
                    <tr>
                        <td>${area.ability}</td>
                        <td><strong>${area.score}分</strong></td>
                        <td><span class="ability-level improve">${level}</span></td>
                        <td>建议通过学习和实践提升此项能力</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        contentDiv.innerHTML = html;
    }

    // 查看历史报告
    async viewReportHistory() {
        const userId = getCurrentUserId();
        const historyDiv = document.getElementById('reportHistory');
        const listDiv = document.getElementById('historyList');
        
        historyDiv.classList.remove('hidden');
        listDiv.innerHTML = '<div class="loading-message">加载历史报告中...</div>';

        const result = await getReportHistory(userId);

        if (result.success && result.data.list) {
            this.renderReportHistory(result.data.list);
        } else {
            listDiv.innerHTML = '<div class="hint-text">暂无历史报告</div>';
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
                            ${report.primary_career || '职业规划报告'}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 14px;">
                            生成于 ${this.formatDateTime(report.created_at)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--primary-color); font-weight: 600;">
                            完整度 ${report.completeness}%
                        </div>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.loadReportContent(report.report_id);
                historyDiv.classList.add('hidden');
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
});
