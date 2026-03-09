const API_BASE_URL = 'http://127.0.0.1:5002/api/v1';

let currentPage = 1;
let totalPages = 1;
let currentHrData = null;
let currentStudents = [];
let selectedStudentId = null;

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function getStoredHrData() {
    const data = localStorage.getItem('hrData');
    return data ? JSON.parse(data) : null;
}

function setStoredHrData(data) {
    localStorage.setItem('hrData', JSON.stringify(data));
}

function clearStoredHrData() {
    localStorage.removeItem('hrData');
}

function checkHrAuth() {
    const hrData = getStoredHrData();
    if (!hrData || !hrData.token) {
        window.location.href = 'index.html';
        return false;
    }
    currentHrData = hrData;
    return true;
}

function initHrDashboard() {
    if (!checkHrAuth()) return;

    document.getElementById('hrUserName').textContent = currentHrData.real_name;
    document.getElementById('hrCompanyName').textContent = currentHrData.company_name;
    document.getElementById('hrWelcomeName').textContent = currentHrData.real_name;
    document.getElementById('unreadEvaluations').textContent = currentHrData.unread_evaluations || 0;

    loadStudents();
    bindHrDashboardEvents();
    bindSidebarNavigation();
}

function bindSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.hr-sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchToSection(section);
        });
    });
}

function switchToSection(sectionId) {
    const sidebarItems = document.querySelectorAll('.hr-sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });

    const sections = document.querySelectorAll('.hr-content-section');
    sections.forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (sectionId === 'students') {
        loadStudents();
    } else if (sectionId === 'invitations') {
        loadInvitations();
    } else if (sectionId === 'evaluations') {
        loadEvaluations();
    }
}

function bindHrDashboardEvents() {
    const logoutBtn = document.getElementById('hrLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearStoredHrData();
            window.location.href = 'index.html';
        });
    }

    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', loadStudents);
    }
    
    const prevPage = document.getElementById('prevPage');
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadStudents();
            }
        });
    }

    const nextPage = document.getElementById('nextPage');
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadStudents();
            }
        });
    }

    const loadInvitationsBtn = document.getElementById('loadInvitationsBtn');
    if (loadInvitationsBtn) {
        loadInvitationsBtn.addEventListener('click', loadInvitations);
    }

    const loadEvaluationsBtn = document.getElementById('loadEvaluationsBtn');
    if (loadEvaluationsBtn) {
        loadEvaluationsBtn.addEventListener('click', loadEvaluations);
    }

    const evaluationModalClose = document.getElementById('evaluationModalClose');
    if (evaluationModalClose) {
        evaluationModalClose.addEventListener('click', closeEvaluationModal);
    }

    const evaluationForm = document.getElementById('evaluationForm');
    if (evaluationForm) {
        evaluationForm.addEventListener('submit', handleEvaluationSubmit);
    }

    const evaluationModal = document.getElementById('evaluationModal');
    if (evaluationModal) {
        evaluationModal.addEventListener('click', (e) => {
            if (e.target === evaluationModal) closeEvaluationModal();
        });
    }
}

async function loadStudents() {
    showLoading();
    try {
        const params = new URLSearchParams({
            hr_id: currentHrData.hr_id,
            page: currentPage,
            size: 10
        });

        const targetJob = document.getElementById('filterJob').value;
        const minMatchScore = document.getElementById('filterMinScore').value;
        const education = document.getElementById('filterEducation').value;

        if (targetJob) params.append('target_job', targetJob);
        if (minMatchScore) params.append('min_match_score', minMatchScore);
        if (education) params.append('education_level', education);

        const response = await fetch(`${API_BASE_URL}/hr/students/browse?${params}`, {
            headers: {
                'Authorization': `Bearer ${currentHrData.token}`
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            renderStudents(result.data.list);
            document.getElementById('totalStudents').textContent = result.data.total;
            
            totalPages = Math.ceil(result.data.total / 10);
            document.getElementById('pageInfo').textContent = `第 ${currentPage} 页`;
            document.getElementById('prevPage').disabled = currentPage <= 1;
            document.getElementById('nextPage').disabled = currentPage >= totalPages;
        } else {
            alert('加载学生列表失败: ' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('加载学生列表错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

function renderStudents(students) {
    currentStudents = students;
    const container = document.getElementById('studentList');
    if (!students || students.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 48px; color: var(--text-secondary);">暂无学生数据</div>';
        return;
    }

    container.innerHTML = students.map((student, index) => {
        const isSelected = selectedStudentId === student.anonymous_id;
        return `
        <div class="hr-student-card ${isSelected ? 'selected' : ''}" onclick="selectStudent('${student.anonymous_id}')">
            <div class="hr-student-avatar">S${index + 1}</div>
            <div class="hr-student-info">
                <div class="hr-student-header">
                    <h4 class="hr-student-name">${student.anonymous_id}</h4>
                    <span class="hr-match-score">${student.system_match_score}分匹配</span>
                </div>
                <div class="hr-student-details">
                    <p><strong>学历:</strong> ${student.education_level} | <strong>专业:</strong> ${student.major_category} | <strong>成绩:</strong> ${student.gpa_level}</p>
                    <p style="margin-top: 8px;"><strong>亮点:</strong> ${student.highlight}</p>
                </div>
                <div class="hr-ability-tags">
                    ${student.ability_tags.map(tag => `<span class="hr-ability-tag">${tag}</span>`).join('')}
                </div>
                <div class="hr-student-actions">
                    <button class="hr-view-btn" onclick="event.stopPropagation(); viewStudent('${student.anonymous_id}')">查看详情</button>
                    <button class="hr-invite-btn" onclick="event.stopPropagation(); openInviteModal('${student.anonymous_id}')">发起评估邀请</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function selectStudent(studentId) {
    selectedStudentId = studentId;
    renderStudents(currentStudents);
    renderStudentDetail(studentId);
}

function renderStudentDetail(studentId) {
    const student = currentStudents.find(s => s.anonymous_id === studentId);
    const container = document.getElementById('studentDetail');
    
    if (!student) {
        container.innerHTML = '<div style="text-align: center; padding: 80px 20px; color: var(--text-secondary);">请从左侧选择学生查看详情</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="hr-student-detail-header">
            <div class="hr-student-detail-avatar">${student.anonymous_id.charAt(student.anonymous_id.length - 1)}</div>
            <div class="hr-student-detail-info">
                <h4>${student.anonymous_id}</h4>
                <span class="hr-student-detail-score">${student.system_match_score}分匹配</span>
            </div>
        </div>
        
        <div class="hr-student-detail-section">
            <div class="hr-student-detail-section-title">基本信息</div>
            <div class="hr-student-detail-grid">
                <div class="hr-student-detail-item">
                    <div class="hr-student-detail-item-label">学历</div>
                    <div class="hr-student-detail-item-value">${student.education_level}</div>
                </div>
                <div class="hr-student-detail-item">
                    <div class="hr-student-detail-item-label">专业</div>
                    <div class="hr-student-detail-item-value">${student.major_category}</div>
                </div>
                <div class="hr-student-detail-item">
                    <div class="hr-student-detail-item-label">成绩</div>
                    <div class="hr-student-detail-item-value">${student.gpa_level}</div>
                </div>
                <div class="hr-student-detail-item">
                    <div class="hr-student-detail-item-label">联系状态</div>
                    <div class="hr-student-detail-item-value">${student.is_open_to_contact ? '可联系' : '暂不可联系'}</div>
                </div>
            </div>
        </div>
        
        <div class="hr-student-detail-section">
            <div class="hr-student-detail-section-title">个人亮点</div>
            <div class="hr-student-detail-highlight">
                <p>${student.highlight}</p>
            </div>
        </div>
        
        <div class="hr-student-detail-section">
            <div class="hr-student-detail-section-title">能力标签</div>
            <div class="hr-ability-tags">
                ${student.ability_tags.map(tag => `<span class="hr-ability-tag">${tag}</span>`).join('')}
            </div>
        </div>
        
        <div class="hr-student-detail-actions">
            <button class="hr-view-btn" onclick="viewStudent('${student.anonymous_id}')">查看详情</button>
            <button class="hr-invite-btn" onclick="openInviteModal('${student.anonymous_id}')">发起评估邀请</button>
        </div>
    `;
}

function viewStudent(studentId) {
    if (selectedStudentId !== studentId) {
        selectStudent(studentId);
    }
}

function openInviteModal(studentId) {
    document.getElementById('inviteStudentId').value = studentId;
    document.getElementById('inviteMessage').value = '您好，我们公司正在招聘相关岗位，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。';
    document.getElementById('inviteModal').classList.remove('hidden');
}

function closeInviteModal() {
    document.getElementById('inviteModal').classList.add('hidden');
}

function openHrLoginModal() {
    document.getElementById('hrLoginModal').classList.remove('hidden');
}

function closeHrLoginModal() {
    document.getElementById('hrLoginModal').classList.add('hidden');
}

function openHrRegisterModal() {
    document.getElementById('hrRegisterModal').classList.remove('hidden');
}

function closeHrRegisterModal() {
    document.getElementById('hrRegisterModal').classList.add('hidden');
}

async function handleHrLogin(e) {
    e.preventDefault();
    showLoading();

    const username = document.getElementById('hrLoginUsername').value;
    const password = document.getElementById('hrLoginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/hr/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (result.code === 200) {
            const hrData = result.data;
            setStoredHrData(hrData);
            closeHrLoginModal();
            window.location.href = 'hr-dashboard.html';
        } else {
            alert(result.msg || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

async function handleInviteSubmit(e) {
    e.preventDefault();
    showLoading();

    const data = {
        hr_id: currentHrData.hr_id,
        anonymous_student_id: document.getElementById('inviteStudentId').value,
        target_job: document.getElementById('inviteTargetJob').value,
        message: document.getElementById('inviteMessage').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/hr/evaluation/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentHrData.token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.code === 200) {
            alert('邀请已发送！');
            closeInviteModal();
            document.getElementById('pendingInvitations').textContent = 
                parseInt(document.getElementById('pendingInvitations').textContent) + 1;
        } else {
            alert(result.msg || '发送邀请失败');
        }
    } catch (error) {
        console.error('发送邀请错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

async function loadInvitations() {
    showLoading();
    try {
        const params = new URLSearchParams({
            hr_id: currentHrData.hr_id
        });

        const statusFilter = document.getElementById('invitationStatusFilter')?.value;
        if (statusFilter) {
            params.append('status', statusFilter);
        }

        const response = await fetch(`${API_BASE_URL}/hr/evaluation/invitations?${params}`, {
            headers: {
                'Authorization': `Bearer ${currentHrData.token}`
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            renderInvitations(result.data.list);
            document.getElementById('pendingInvitations').textContent = 
                result.data.list.filter(inv => inv.status === 'pending').length;
        } else {
            alert('加载邀请列表失败: ' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('加载邀请列表错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

function renderInvitations(invitations) {
    const container = document.getElementById('invitationList');
    if (!invitations || invitations.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 48px; border-radius: 8px; text-align: center; color: #a0a098;">暂无邀请数据</div>';
        return;
    }

    const statusLabels = {
        'pending': { text: '待确认', color: '#f59e0b' },
        'accepted': { text: '已接受', color: '#5e8c65' },
        'declined': { text: '已拒绝', color: '#dc2626' }
    };

    container.innerHTML = invitations.map(invitation => {
        const statusInfo = statusLabels[invitation.status] || { text: invitation.status, color: '#666' };
        return `
        <div class="hr-student-card">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1c1c18; font-size: 16px;">邀请 #${invitation.invitation_id}</h4>
                    <span style="background: ${statusInfo.color}20; color: ${statusInfo.color}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${statusInfo.text}
                    </span>
                </div>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>目标岗位:</strong> ${invitation.target_job}
                </p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>学生ID:</strong> ${invitation.anonymous_student_id}
                </p>
                <p style="margin: 8px 0 0 0; color: #888; font-size: 13px;">
                    ${invitation.message}
                </p>
                <p style="margin: 8px 0 0 0; color: #a0a098; font-size: 12px;">
                    发送时间: ${invitation.sent_at}
                </p>
            </div>
        </div>
    `}).join('');
}

async function loadEvaluations() {
    showLoading();
    try {
        const params = new URLSearchParams({
            hr_id: currentHrData.hr_id
        });

        const statusFilter = document.getElementById('evaluationStatusFilter')?.value;
        if (statusFilter) {
            params.append('status', statusFilter);
        }

        const response = await fetch(`${API_BASE_URL}/hr/evaluation/evaluations?${params}`, {
            headers: {
                'Authorization': `Bearer ${currentHrData.token}`
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            renderEvaluations(result.data.list);
            document.getElementById('completedEvaluations').textContent = 
                result.data.list.filter(eval => eval.status === 'completed').length;
        } else {
            alert('加载评估列表失败: ' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('加载评估列表错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

function renderEvaluations(evaluations) {
    const container = document.getElementById('evaluationList');
    if (!evaluations || evaluations.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 48px; border-radius: 8px; text-align: center; color: #a0a098;">暂无评估数据</div>';
        return;
    }

    const statusLabels = {
        'in_progress': { text: '进行中', color: '#3b82f6' },
        'completed': { text: '已完成', color: '#5e8c65' }
    };

    const hiringIntentLabels = {
        'strong': '强烈意向',
        'moderate': '有一定意向',
        'weak': '意向较弱',
        'no': '暂无意向'
    };

    const overallImpressionLabels = {
        'excellent': '优秀',
        'good': '良好',
        'average': '一般',
        'below_average': '有待提升'
    };

    container.innerHTML = evaluations.map(evaluation => {
        const statusInfo = statusLabels[evaluation.status] || { text: evaluation.status, color: '#666' };
        return `
        <div class="hr-student-card">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1c1c18; font-size: 16px;">评估 #${evaluation.evaluation_id}</h4>
                    <span style="background: ${statusInfo.color}20; color: ${statusInfo.color}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${statusInfo.text}
                    </span>
                </div>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>目标岗位:</strong> ${evaluation.target_job}
                </p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>学生ID:</strong> ${evaluation.anonymous_student_id}
                </p>
                ${evaluation.status === 'completed' ? `
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>整体印象:</strong> ${overallImpressionLabels[evaluation.overall_impression] || evaluation.overall_impression}
                </p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                    <strong>聘用意向:</strong> ${hiringIntentLabels[evaluation.hiring_intent] || evaluation.hiring_intent}
                </p>
                <p style="margin: 8px 0 0 0; color: #a0a098; font-size: 12px;">
                    提交时间: ${evaluation.submitted_at}
                </p>
                ` : `
                <p style="margin: 8px 0 0 0; color: #a0a098; font-size: 12px;">
                    创建时间: ${evaluation.created_at}
                </p>
                `}
            </div>
            ${evaluation.status === 'in_progress' ? `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 16px;">
                <button class="hr-invite-btn" onclick="openEvaluationModal('${evaluation.evaluation_id}')">填写评估</button>
            </div>
            ` : ''}
        </div>
    `}).join('');
}

function openEvaluationModal(evaluationId) {
    document.getElementById('evaluationId').value = evaluationId;
    document.getElementById('overallImpression').value = '';
    document.getElementById('skillMatch').value = '';
    document.getElementById('learningAbility').value = '';
    document.getElementById('communication').value = '';
    document.getElementById('teamwork').value = '';
    document.getElementById('stressResistance').value = '';
    document.getElementById('professionalMaturity').value = '';
    document.getElementById('hiringIntent').value = '';
    document.getElementById('strengthsNoted').value = '';
    document.getElementById('weaknessesNoted').value = '';
    document.getElementById('recommendedPositions').value = '';
    document.getElementById('evaluationBasis').value = '';
    document.getElementById('evaluationModal').classList.remove('hidden');
}

function closeEvaluationModal() {
    document.getElementById('evaluationModal').classList.add('hidden');
}

async function handleEvaluationSubmit(e) {
    e.preventDefault();
    showLoading();

    const evaluationId = document.getElementById('evaluationId').value;
    const data = {
        hr_id: currentHrData.hr_id,
        evaluation_id: evaluationId,
        evaluation_form: {
            overall_impression: document.getElementById('overallImpression').value,
            dimension_scores: {
                "专业技能匹配度": parseInt(document.getElementById('skillMatch').value) || 0,
                "学习能力": parseInt(document.getElementById('learningAbility').value) || 0,
                "沟通表达": parseInt(document.getElementById('communication').value) || 0,
                "团队协作意愿": parseInt(document.getElementById('teamwork').value) || 0,
                "抗压能力": parseInt(document.getElementById('stressResistance').value) || 0,
                "职业成熟度": parseInt(document.getElementById('professionalMaturity').value) || 0
            },
            hiring_intent: document.getElementById('hiringIntent').value,
            strengths_noted: document.getElementById('strengthsNoted').value,
            weaknesses_noted: document.getElementById('weaknessesNoted').value,
            recommended_positions: document.getElementById('recommendedPositions').value.split(',').map(s => s.trim()).filter(s => s),
            evaluation_basis: document.getElementById('evaluationBasis').value
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}/hr/evaluation/${evaluationId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentHrData.token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.code === 200) {
            alert('评估提交成功！');
            closeEvaluationModal();
            loadEvaluations();
        } else {
            alert(result.msg || '提交评估失败');
        }
    } catch (error) {
        console.error('提交评估错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

async function handleHrModalRegister(e) {
    e.preventDefault();
    showLoading();

    const formData = new FormData();
    formData.append('username', document.getElementById('hrModalRegUsername').value);
    formData.append('password', document.getElementById('hrModalRegPassword').value);
    formData.append('real_name', document.getElementById('hrModalRegRealName').value);
    formData.append('company_name', document.getElementById('hrModalRegCompanyName').value);
    formData.append('company_size', document.getElementById('hrModalRegCompanySize').value);
    formData.append('industry', document.getElementById('hrModalRegIndustry').value);
    formData.append('hr_role', document.getElementById('hrModalRegHrRole').value);
    
    const modalFileInput = document.getElementById('hrModalRegBusinessLicense');
    if (modalFileInput.files.length > 0) {
        formData.append('business_license', modalFileInput.files[0]);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/hr/register`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.code === 200) {
            alert('注册成功！等待平台审核后即可登录。');
            closeHrRegisterModal();
            openHrLoginModal();
        } else {
            alert(result.msg || '注册失败');
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('hr-dashboard.html')) {
        initHrDashboard();
    } else if (currentPath.includes('index.html') || currentPath === '/' || currentPath === '') {
        const hrLoginBtn = document.getElementById('hrLoginBtn');
        const hrRegisterBtn = document.getElementById('hrRegisterBtn');
        const hrLoginModalClose = document.getElementById('hrLoginModalClose');
        const hrLoginForm = document.getElementById('hrLoginForm');
        const inviteModalClose = document.getElementById('inviteModalClose');
        const inviteForm = document.getElementById('inviteForm');
        const goHrRegister = document.getElementById('goHrRegister');
        const hrRegisterModalClose = document.getElementById('hrRegisterModalClose');
        const hrRegisterModalForm = document.getElementById('hrRegisterModalForm');
        const goHrLoginFromModal = document.getElementById('goHrLoginFromModal');
        const hrModalFileUpload = document.getElementById('hrModalFileUpload');
        const hrModalFileInput = document.getElementById('hrModalRegBusinessLicense');
        const hrModalFileName = document.getElementById('hrModalFileName');

        if (hrLoginBtn) {
            hrLoginBtn.addEventListener('click', openHrLoginModal);
        }
        if (hrRegisterBtn) {
            hrRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeHrLoginModal();
                openHrRegisterModal();
            });
        }
        if (hrLoginModalClose) {
            hrLoginModalClose.addEventListener('click', closeHrLoginModal);
        }
        if (hrLoginForm) {
            hrLoginForm.addEventListener('submit', handleHrLogin);
        }
        if (inviteModalClose) {
            inviteModalClose.addEventListener('click', closeInviteModal);
        }
        if (inviteForm) {
            inviteForm.addEventListener('submit', handleInviteSubmit);
        }
        if (goHrRegister) {
            goHrRegister.addEventListener('click', (e) => {
                e.preventDefault();
                closeHrLoginModal();
                openHrRegisterModal();
            });
        }
        if (hrRegisterModalClose) {
            hrRegisterModalClose.addEventListener('click', closeHrRegisterModal);
        }
        if (hrRegisterModalForm) {
            hrRegisterModalForm.addEventListener('submit', handleHrModalRegister);
        }
        if (goHrLoginFromModal) {
            goHrLoginFromModal.addEventListener('click', (e) => {
                e.preventDefault();
                closeHrRegisterModal();
                openHrLoginModal();
            });
        }
        if (hrModalFileUpload) {
            hrModalFileUpload.addEventListener('click', () => {
                hrModalFileInput.click();
            });
        }
        if (hrModalFileInput) {
            hrModalFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    hrModalFileName.textContent = '已选择: ' + e.target.files[0].name;
                }
            });
        }

        const hrLoginModal = document.getElementById('hrLoginModal');
        const inviteModal = document.getElementById('inviteModal');
        const hrRegisterModal = document.getElementById('hrRegisterModal');
        
        if (hrLoginModal) {
            hrLoginModal.addEventListener('click', (e) => {
                if (e.target === hrLoginModal) closeHrLoginModal();
            });
        }
        if (inviteModal) {
            inviteModal.addEventListener('click', (e) => {
                if (e.target === inviteModal) closeInviteModal();
            });
        }
        if (hrRegisterModal) {
            hrRegisterModal.addEventListener('click', (e) => {
                if (e.target === hrRegisterModal) closeHrRegisterModal();
            });
        }
    }
});
