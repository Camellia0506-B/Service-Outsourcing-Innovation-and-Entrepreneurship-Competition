const API_BASE_URL = 'http://127.0.0.1:5002/api/v1';
const HR_BACKEND_BASE = (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseURL) ? API_CONFIG.baseURL : 'http://127.0.0.1:5000/api/v1';

let currentPage = 1;
let totalPages = 1;
let currentHrData = null;
let currentStudents = [];

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

function _ensureResumeModalS1Cache() {
    if (window._hrResumeModalS1HTML) return;
    var el = document.querySelector('#studentModal .resume-detail-modal');
    if (el) window._hrResumeModalS1HTML = el.outerHTML;
}

function getResumeModalHTML_Student004() {
    var t = document.getElementById('tplResumeStudent004');
    return t && t.innerHTML ? t.innerHTML.trim() : '';
}

function getResumeModalHTML_ChenYutong() {
    var t = document.getElementById('tplResumeStudent005');
    return t && t.innerHTML ? t.innerHTML.trim() : '';
}

function getResumeModalHTML_Student003Anonymous() {
    var t = document.getElementById('tplResumeStudent003Anonymous');
    return t && t.innerHTML ? t.innerHTML.trim() : '';
}

function getResumeModalHTML_Student002() {
    var t = document.getElementById('tplResumeStudent002');
    return t && t.innerHTML ? t.innerHTML.trim() : '';
}

/** student_006 ~ student_011：资料未完善，独立弹窗数据（顺延编号后 S6~S11） */
var HR_INCOMPLETE_RESUME_BY_ID = {
    student_006: { displayCode: 'S6', gender: '男', deliveredAt: '2026-03-15' },
    student_007: { displayCode: 'S7', gender: '女', deliveredAt: '2026-03-16' },
    student_008: { displayCode: 'S8', gender: '男', deliveredAt: '2026-03-17' },
    student_009: { displayCode: 'S9', gender: '女', deliveredAt: '2026-03-18' },
    student_010: { displayCode: 'S10', gender: '男', deliveredAt: '2026-03-19' },
    student_011: { displayCode: 'S11', gender: '女', deliveredAt: '2026-03-20' }
};

function getResumeModalHTML_IncompleteStudent(studentId) {
    var cfg = HR_INCOMPLETE_RESUME_BY_ID[studentId];
    if (!cfg) return '';
    var code = cfg.displayCode;
    var gender = cfg.gender;
    var delivered = cfg.deliveredAt;
    var ph = '暂无完整信息，等待学生补充';
    return (
        '<div class="resume-detail-modal" onclick="event.stopPropagation()">' +
        '<div class="resume-modal-bar">' +
        '<span class="breadcrumb">学生简历库 / <span>' +
        studentId +
        '</span></span>' +
        '<button type="button" class="resume-modal-close" onclick="closeStudentModal()" aria-label="关闭">✕</button>' +
        '</div>' +
        '<div class="resume-modal-body">' +
        '<div class="resume-col-left">' +
        '<div>' +
        '<div class="resume-candidate-id">' +
        code +
        ' · ' +
        delivered +
        '</div>' +
        '<div class="resume-candidate-name">' +
        studentId +
        '</div>' +
        '<div class="resume-candidate-sub">学历：待补充 · 专业方向：待补充<br>成绩：待补充</div>' +
        '</div>' +
        '<div class="resume-score-display resume-score-display--pending">' +
        '<div class="resume-score-num">--</div>' +
        '<div class="resume-score-label">资料待完善</div>' +
        '</div>' +
        '<div class="resume-divider"></div>' +
        '<div class="resume-meta-block">' +
        '<div class="resume-meta-row"><span class="resume-meta-label">学号/编号</span><span class="resume-meta-value">' +
        code +
        '</span></div>' +
        '<div class="resume-meta-row"><span class="resume-meta-label">学历</span><span class="resume-meta-value">待补充</span></div>' +
        '<div class="resume-meta-row"><span class="resume-meta-label">成绩</span><span class="resume-meta-value">待补充</span></div>' +
        '<div class="resume-meta-row"><span class="resume-meta-label">匹配分</span><span class="resume-meta-value">待评估</span></div>' +
        '<div class="resume-meta-row"><span class="resume-meta-label">性别</span><span class="resume-meta-value">' +
        gender +
        '</span></div>' +
        '</div>' +
        '<div class="resume-divider"></div>' +
        '<div class="resume-skill-section">' +
        '<div class="resume-section-title">核心技能</div>' +
        '<div class="resume-skill-grid">' +
        '<span class="resume-skill-chip highlight">学习能力</span>' +
        '<span class="resume-skill-chip highlight">职业规划中</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="resume-col-right">' +
        '<div class="resume-section-block">' +
        '<div class="resume-sec-head"><h3>教育背景</h3></div>' +
        '<div class="resume-edu-grid" style="border:1px solid var(--rule)">' +
        '<div class="resume-edu-cell">' +
        '<div class="resume-edu-cell-label">学校</div>' +
        '<div class="resume-edu-cell-value">待补充</div>' +
        '<div class="resume-edu-cell-sub">信息待完善</div>' +
        '</div>' +
        '<div class="resume-edu-cell">' +
        '<div class="resume-edu-cell-label">专业 · 方向</div>' +
        '<div class="resume-edu-cell-value">待补充</div>' +
        '<div class="resume-edu-cell-sub">学历 · 待补充</div>' +
        '</div>' +
        '<div class="resume-edu-cell">' +
        '<div class="resume-edu-cell-label">成绩 · 毕业</div>' +
        '<div class="resume-edu-cell-value">待补充</div>' +
        '<div class="resume-edu-cell-sub">预计毕业 · 待补充</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="resume-section-block">' +
        '<div class="resume-sec-head"><h3>实习经历</h3></div>' +
        '<p class="resume-incomplete-placeholder">' +
        ph +
        '</p>' +
        '</div>' +
        '<div class="resume-section-block">' +
        '<div class="resume-sec-head"><h3>项目经历</h3></div>' +
        '<p class="resume-incomplete-placeholder">' +
        ph +
        '</p>' +
        '</div>' +
        '<div class="resume-section-block">' +
        '<div class="resume-sec-head"><h3>证书资质</h3></div>' +
        '<p class="resume-incomplete-placeholder">' +
        ph +
        '</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="resume-modal-footer">' +
        '<span class="resume-footer-status">候选人 ' +
        code +
        ' · 待处理</span>' +
        '<button type="button" class="resume-btn-secondary" onclick="closeStudentModal()">关闭</button>' +
        '<button type="button" class="resume-btn-primary" disabled title="学生资料未完善，暂无法邀请">发起评估邀请</button>' +
        '</div>' +
        '</div>'
    );
}

function _setStudentResumeModalContent(studentId) {
    var overlay = document.getElementById('studentModal');
    if (!overlay) return;
    _ensureResumeModalS1Cache();
    var cur = overlay.querySelector('.resume-detail-modal');
    if (!cur) return;
    var html;
    if (studentId === 'student_002') {
        html = getResumeModalHTML_Student002();
        if (!html) {
            console.warn('[HR] 未找到 #tplResumeStudent002，无法展示 student_002 简历');
            return;
        }
    } else if (studentId === 'student_003') {
        html = getResumeModalHTML_Student003Anonymous();
        if (!html) {
            console.warn('[HR] 未找到 #tplResumeStudent003Anonymous，无法展示匿名简历');
            return;
        }
    } else if (studentId === 'student_004') {
        html = getResumeModalHTML_Student004();
        if (!html) {
            console.warn('[HR] 未找到 #tplResumeStudent004，无法展示 student_004 简历');
            return;
        }
    } else if (studentId === 'student_005') {
        html = getResumeModalHTML_ChenYutong();
        if (!html) {
            console.warn('[HR] 未找到 #tplResumeStudent005，无法展示陈雨桐简历');
            return;
        }
    } else if (HR_INCOMPLETE_RESUME_BY_ID[studentId]) {
        html = getResumeModalHTML_IncompleteStudent(studentId);
        if (!html) {
            console.warn('[HR] 无法生成未完善简历弹窗: ' + studentId);
            return;
        }
    } else {
        html = window._hrResumeModalS1HTML;
        if (!html) return;
    }
    cur.outerHTML = html;
}

function initHrDashboard() {
    if (!checkHrAuth()) return;
    _ensureResumeModalS1Cache();

    var displayRealName = (currentHrData && (currentHrData.real_name || currentHrData.realName)) || 'HR';
    var displayCompanyName = (currentHrData && (currentHrData.company_name || currentHrData.companyName)) || '请完善企业信息';
    var unread = (currentHrData && (currentHrData.unread_evaluations != null ? currentHrData.unread_evaluations : currentHrData.unreadEvaluations)) || 0;

    var el;
    if ((el = document.getElementById('hrUserName'))) el.textContent = displayRealName;
    if ((el = document.getElementById('hrCompanyName'))) el.textContent = displayCompanyName;
    if ((el = document.getElementById('hrWelcomeName'))) el.textContent = displayRealName;
    if ((el = document.getElementById('unreadEvaluations'))) el.textContent = unread;

    switchToSection('students');
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
        loadJobOptions().then(() => loadStudents());
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

    const evalReportModalClose = document.getElementById('evalReportModalClose');
    if (evalReportModalClose) {
        evalReportModalClose.addEventListener('click', closeEvalReportModal);
    }
    const evalReportModalCloseFooter = document.getElementById('evalReportModalCloseFooter');
    if (evalReportModalCloseFooter) {
        evalReportModalCloseFooter.addEventListener('click', closeEvalReportModal);
    }
    const evalReportExportPdf = document.getElementById('evalReportExportPdf');
    if (evalReportExportPdf) {
        evalReportExportPdf.addEventListener('click', function () {
            window.print();
        });
    }
    const evalReportModal = document.getElementById('evalReportModal');
    if (evalReportModal) {
        evalReportModal.addEventListener('click', (e) => {
            if (e.target === evalReportModal) closeEvalReportModal();
        });
    }
}

function closeEvalReportModal() {
    const m = document.getElementById('evalReportModal');
    if (m) m.style.display = 'none';
}

async function loadJobOptions() {
    const sel = document.getElementById('filterJob');
    if (!sel) return;
    try {
        const response = await fetch(`${API_BASE_URL}/hr/students/job-options`, {
            headers: { 'Authorization': `Bearer ${currentHrData.token}` }
        });
        const result = await response.json();
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">全部岗位</option>';
        if (result.code === 200 && result.data && result.data.jobs && result.data.jobs.length) {
            result.data.jobs.forEach(job => {
                const opt = document.createElement('option');
                opt.value = job;
                opt.textContent = job;
                sel.appendChild(opt);
            });
        }
        if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
            sel.value = currentVal;
        }
    } catch (e) {
        console.error('加载岗位选项失败:', e);
    }
}

async function loadStudents() {
    if (window.MockStore) {
        var store = window.MockStore.getMockStore();
        var list = (store.students || []).slice();
        var targetJob = (document.getElementById('filterJob') && document.getElementById('filterJob').value) || '';
        var minScore = (document.getElementById('filterMinScore') && document.getElementById('filterMinScore').value) || '';
        var education = (document.getElementById('filterEducation') && document.getElementById('filterEducation').value) || '';
        if (targetJob) list = list.filter(function (s) { return (s.targetJob || s.target_job || '') === targetJob; });
        if (minScore) {
            var num = parseInt(minScore, 10);
            if (!isNaN(num)) list = list.filter(function (s) { return (s.systemMatchScore != null ? s.systemMatchScore : s.system_match_score || 0) >= num; });
        }
        if (education) list = list.filter(function (s) { return (s.educationLevel || s.education_level || '') === education; });
        pageSize = 10;
        totalPages = Math.max(1, Math.ceil(list.length / pageSize));
        var start = (currentPage - 1) * pageSize;
        var pageList = list.slice(start, start + pageSize);
        renderStudents(pageList);
        if (document.getElementById('totalStudents')) document.getElementById('totalStudents').textContent = list.length;
        if (document.getElementById('pageInfo')) document.getElementById('pageInfo').textContent = '第 ' + currentPage + ' 页';
        if (document.getElementById('prevPage')) document.getElementById('prevPage').disabled = currentPage <= 1;
        if (document.getElementById('nextPage')) document.getElementById('nextPage').disabled = currentPage >= totalPages;
        return;
    }
    showLoading();
    try {
        var params = new URLSearchParams({
            hr_id: currentHrData.hr_id,
            page: currentPage,
            size: 10
        });
        var targetJob = document.getElementById('filterJob').value;
        var minMatchScore = document.getElementById('filterMinScore').value;
        var education = document.getElementById('filterEducation').value;
        if (targetJob) params.append('target_job', targetJob);
        if (minMatchScore) params.append('min_match_score', minMatchScore);
        if (education) params.append('education_level', education);
        var response = await fetch(API_BASE_URL + '/hr/students/browse?' + params, {
            headers: { 'Authorization': 'Bearer ' + currentHrData.token }
        });
        var result = await response.json();
        if (result.code === 200) {
            renderStudents(result.data.list);
            if (document.getElementById('totalStudents')) document.getElementById('totalStudents').textContent = result.data.total;
            totalPages = Math.ceil(result.data.total / 10);
            document.getElementById('pageInfo').textContent = '第 ' + currentPage + ' 页';
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
    const tbody = document.getElementById('studentList');
    const stats = document.getElementById('studentStats');
    const total = document.getElementById('pageTotal');
    const count = students ? students.length : 0;
    if (stats) stats.textContent = `共 ${count} 位候选人`;
    if (total) total.textContent = `共 ${count} 条记录`;
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:#a0a098;font-size:14px;">暂无学生数据</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map((student, index) => {
        var tagsArr = student.abilityTags || student.ability_tags || [];
        var tags = tagsArr.slice(0, 5).map(function (t) {
            var text = typeof t === 'string' ? t : (t && (t.skill || t.name)) || '';
            return text ? '<span style="font-size:10px;font-weight:600;padding:2px 8px;background:#e8f0eb;color:#2d6a4f;border-radius:100px;white-space:nowrap;">' + String(text).replace(/</g, '&lt;') + '</span>' : '';
        }).join('');
        var sid = student.anonymousId || student.anonymous_id || '';
        var score = student.systemMatchScore != null ? student.systemMatchScore : (student.system_match_score != null ? student.system_match_score : 0);
        var scoreColor = sid === 'student_002' ? '#d97706' : (score >= 80 ? '#2d6a4f' : '#7a6f3e');
        var eduLevel = (student.educationLevel || student.education_level || '').trim();
        var majorCat = (student.majorCategory || student.major_category || '').trim();
        var gpaRaw = (student.gpaLevel || student.gpa_level || '').trim();
        var gpaDisplay = gpaRaw ? gpaRaw.replace(/\s*[（(][^）)]*[）)]\s*$/g, '').trim() || '待补充' : '待补充';
        if (eduLevel === '') eduLevel = '待补充';
        if (majorCat === '') majorCat = '待补充';
        var sidEsc = String(sid).replace(/'/g, "\\'");
        var displayNameRow = (student.realName || student.real_name || '').trim() || sid;
        var rowLabelBySid = {
            student_002: 'S2',
            student_003: 'S3',
            student_004: 'S4',
            student_005: 'S5',
            student_006: 'S6',
            student_007: 'S7',
            student_008: 'S8',
            student_009: 'S9',
            student_010: 'S10',
            student_011: 'S11'
        };
        var rowLabel = rowLabelBySid[sid] || 'S' + (index + 1);
        var isIncompleteProfile = !!HR_INCOMPLETE_RESUME_BY_ID[sid];
        var gradeTd = isIncompleteProfile
            ? '<td style="padding:11px 10px;font-size:13px;color:#6b6860;">待补充</td>'
            : '<td style="padding:11px 10px;font-size:13px;color:#6b6860;">' + gpaDisplay + '</td>';
        var matchTd = isIncompleteProfile
            ? '<td style="padding:11px 10px;font-size:13px;color:#6b6860;font-weight:400;">待评估</td>'
            : '<td style="padding:11px 10px;font-size:14px;font-weight:700;color:' + scoreColor + ';">' + score + '分</td>';
        var inviteBtn = isIncompleteProfile
            ? '<button type="button" disabled title="学生资料未完善，暂无法邀请" style="height:28px;padding:0 8px;font-size:12px;font-weight:600;border-radius:5px;border:1px solid #e8e6e1;background:#f3f1ed;color:#a8a5a0;cursor:not-allowed;white-space:nowrap;">发起邀请</button>'
            : '<button type="button" style="height:28px;padding:0 8px;font-size:12px;font-weight:600;border-radius:5px;border:none;background:#0f0f0d;color:#fff;cursor:pointer;white-space:nowrap;"' +
              ' onmouseover="this.style.background=\'#2d6a4f\'"' +
              ' onmouseout="this.style.background=\'#0f0f0d\'"' +
              ' onclick="event.stopPropagation();openInviteModal(\'' + sidEsc + '\')">发起邀请</button>';
        return `
        <tr style="border-bottom:1px solid #e2dfd7;cursor:pointer;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''"
            onclick="openStudentModal('${sidEsc}')">
            <td style="padding:11px 10px 11px 16px;">
                <div style="width:28px;height:28px;background:#f6f4ef;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6b6860;">${rowLabel}</div>
            </td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;margin-bottom:4px;">${displayNameRow}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">${tags}</div>
            </td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;">${eduLevel}</td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${majorCat}</td>
            ${gradeTd}
            ${matchTd}
            <td style="padding:11px 12px 11px 10px;white-space:nowrap;">
                <div style="display:flex;flex-wrap:nowrap;gap:6px;justify-content:flex-end;align-items:center;" onclick="event.stopPropagation()">
                    <button style="height:28px;padding:0 8px;font-size:12px;font-weight:600;border-radius:5px;border:1px solid #e2dfd7;background:#fff;color:#0f0f0d;cursor:pointer;white-space:nowrap;"
                        onmouseover="this.style.borderColor='#2d6a4f';this.style.color='#2d6a4f'"
                        onmouseout="this.style.borderColor='#e2dfd7';this.style.color='#0f0f0d'"
                        onclick="openStudentModal('${sidEsc}')">查看详情</button>
                    ${inviteBtn}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function _esc(s) {
    if (s == null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _section(title, body) {
    if (!body || body.trim() === '') return '';
    return `<div style="margin-bottom:20px;"><div style="font-size:11px;font-weight:700;color:#a0a098;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${title}</div>${body}</div>`;
}

function _renderFullStudentDetail(data) {
    var profile = data.profile || {};
    var ability = data.ability_profile || {};
    var anonymousId = data.anonymous_id || '';
    var basic = profile.basic_info || {};
    var abBasic = ability.basic_info || {};
    var edu = profile.education_info || {};
    var targetJob = basic.target_job || abBasic.target_job || '待定';
    var letter = (anonymousId.slice(-1) || 'S').toUpperCase();
    var realName = data.realName != null ? data.realName : (basic.name != null && String(basic.name).trim() !== '' ? basic.name : null);
    var displayName = realName ? realName : 'student';
    var displayPhone = realName ? (basic.phone || '未填写') : '*** 隐私保护';
    var displayEmail = realName ? (basic.email || '未填写') : '*** 隐私保护';
    var displayGender = basic.gender || data.gender || '未填写';

    var html = `
    <div style="background:#0f0f0d;border-radius:14px 14px 0 0;padding:26px 26px 22px;display:flex;gap:16px;align-items:flex-start;position:relative;">
        <button onclick="document.getElementById('studentModal').classList.add('hidden')"
            style="position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;">✕</button>
        <div style="width:52px;height:52px;background:#2d6a4f;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;">` + _esc(letter) + `</div>
        <div>
            <div style="font-size:19px;font-weight:700;color:#fff;">` + _esc(displayName) + `</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);">` + _esc(anonymousId) + ` · 应聘岗位：` + _esc(targetJob) + `</div>
        </div>
    </div>
    <div style="padding:22px 26px;max-height:60vh;overflow-y:auto;">`;

    var basicFields = [
        ['姓名', displayName],
        ['昵称', basic.nickname],
        ['性别', displayGender],
        ['出生日期', basic.birth_date || basic.birthday],
        ['手机', displayPhone],
        ['邮箱', displayEmail]
    ].filter(function (_, i) { var v = _[1]; return v != null && String(v).trim() !== ''; });
    if (basicFields.length) {
        html += _section('基础信息', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;"><table style="width:100%;font-size:13px;"><tbody>${basicFields.map(([k, v]) => `<tr><td style="color:#a0a098;width:80px;padding:4px 0;">${_esc(k)}</td><td style="color:#0f0f0d;">${_esc(v)}</td></tr>`).join('')}</tbody></table></div>`);
    }

    const eduFields = [
        ['学校', edu.school],
        ['专业', edu.major],
        ['学历', edu.degree],
        ['年级', edu.grade],
        ['GPA', edu.gpa],
        ['入学日期', edu.start_date],
        ['预计毕业', edu.expected_graduation]
    ].filter(([, v]) => v != null && String(v).trim() !== '');
    if (eduFields.length) {
        html += _section('教育信息', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;"><table style="width:100%;font-size:13px;"><tbody>${eduFields.map(([k, v]) => `<tr><td style="color:#a0a098;width:90px;padding:4px 0;">${_esc(k)}</td><td style="color:#0f0f0d;">${_esc(v)}</td></tr>`).join('')}</tbody></table></div>`);
    }
    if (!eduFields.length && (abBasic.school || abBasic.major || abBasic.education || abBasic.gpa)) {
        html += _section('教育信息（能力画像）', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;font-size:13px;color:#0f0f0d;">学校 ${_esc(abBasic.school || '-')} · 专业 ${_esc(abBasic.major || '-')} · 学历 ${_esc(abBasic.education || '-')} · GPA ${_esc(abBasic.gpa || '-')}</div>`);
    }

    const skills = profile.skills || [];
    if (skills.length) {
        const skillsHtml = skills.map(cat => {
            const items = (cat.items || []).map(i => typeof i === 'string' ? i : (i.skill || i.name || '')).filter(Boolean);
            const label = cat.category || cat.name || '技能';
            return `<div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:600;color:#6b6860;">${_esc(label)}</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${items.map(i => `<span style="padding:3px 10px;background:#e8f0eb;color:#2d6a4f;font-size:12px;border-radius:100px;">${_esc(i)}</span>`).join('')}</div></div>`;
        }).join('');
        html += _section('技能', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${skillsHtml}</div>`);
    }

    const proSkills = ability.professional_skills || {};
    const pl = (proSkills.programming_languages || []).map(x => (x && x.skill) || x).filter(Boolean);
    const ft = (proSkills.frameworks_tools || []).map(x => (x && x.skill) || x).filter(Boolean);
    const dk = (proSkills.domain_knowledge || []).map(x => (x && x.skill) || x).filter(Boolean);
    if (pl.length || ft.length || dk.length) {
        let proHtml = '';
        if (pl.length) proHtml += `<div style="margin-bottom:6px;"><span style="font-size:12px;color:#a0a098;">编程语言</span> ${pl.map(s => `<span style="padding:2px 8px;background:#e0f2fe;color:#0369a1;font-size:12px;border-radius:4px;">${_esc(s)}</span>`).join(' ')}</div>`;
        if (ft.length) proHtml += `<div style="margin-bottom:6px;"><span style="font-size:12px;color:#a0a098;">框架/工具</span> ${ft.map(s => `<span style="padding:2px 8px;background:#fef3e2;color:#b56a00;font-size:12px;border-radius:4px;">${_esc(s)}</span>`).join(' ')}</div>`;
        if (dk.length) proHtml += `<div><span style="font-size:12px;color:#a0a098;">领域知识</span> ${dk.map(s => `<span style="padding:2px 8px;background:#e8f0eb;color:#2d6a4f;font-size:12px;border-radius:4px;">${_esc(s)}</span>`).join(' ')}</div>`;
        html += _section('专业技能（能力画像）', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${proHtml}</div>`);
    }

    const certs = profile.certificates || [];
    if (certs.length) {
        const certHtml = certs.map(c => `<div style="padding:6px 0;border-bottom:1px solid #e2dfd7;font-size:13px;">${_esc(c.name || c)}${c.issue_date ? ' · ' + _esc(c.issue_date) : ''}</div>`).join('');
        html += _section('证书', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${certHtml}</div>`);
    }

    const internships = profile.internships || [];
    if (internships.length) {
        const internHtml = internships.map(i => `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2dfd7;"><div style="font-size:13px;font-weight:600;color:#0f0f0d;">${_esc(i.company)} · ${_esc(i.position)}</div><div style="font-size:11px;color:#a0a098;">${_esc(i.start_date || '')} - ${_esc(i.end_date || '')}</div><div style="font-size:12px;color:#6b6860;margin-top:4px;line-height:1.5;">${_esc(i.description || '')}</div></div>`).join('');
        html += _section('实习经历', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${internHtml}</div>`);
    }

    const projects = profile.projects || [];
    if (projects.length) {
        const projHtml = projects.map(p => `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2dfd7;"><div style="font-size:13px;font-weight:600;color:#0f0f0d;">${_esc(p.name)}</div><div style="font-size:11px;color:#a0a098;">${_esc(p.start_date || '')} - ${_esc(p.end_date || '')}</div><div style="font-size:12px;color:#6b6860;margin-top:4px;line-height:1.5;">${_esc(p.description || '')}</div>${(p.tech_stack && p.tech_stack.length) ? '<div style="margin-top:6px;">' + (p.tech_stack.map(t => `<span style="padding:2px 8px;background:#f5f3ee;font-size:11px;border-radius:4px;margin-right:4px;">${_esc(t)}</span>`).join('')) + '</div>' : ''}</div>`).join('');
        html += _section('项目经历', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${projHtml}</div>`);
    }

    const awards = profile.awards || [];
    if (awards.length) {
        const awardHtml = awards.map(a => `<div style="padding:4px 0;font-size:13px;">${_esc(a.name)}${a.level ? ' · ' + _esc(a.level) : ''}${a.date ? ' · ' + _esc(a.date) : ''}</div>`).join('');
        html += _section('获奖', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${awardHtml}</div>`);
    }

    const overall = ability.overall_assessment || {};
    const strengths = overall.strengths || [];
    const weaknesses = overall.weaknesses || [];
    if (strengths.length || weaknesses.length || overall.competitiveness || overall.total_score != null) {
        let oa = '';
        if (overall.total_score != null) oa += `<div style="margin-bottom:6px;"><span style="color:#a0a098;">综合得分</span> <strong>${_esc(overall.total_score)}</strong></div>`;
        if (overall.competitiveness) oa += `<div style="margin-bottom:6px;"><span style="color:#a0a098;">竞争力</span> ${_esc(overall.competitiveness)}</div>`;
        if (strengths.length) oa += `<div style="margin-bottom:6px;"><span style="color:#a0a098;">优势</span> ${strengths.map(s => `<span style="padding:2px 8px;background:#e8f0eb;color:#2d6a4f;font-size:12px;border-radius:4px;margin-right:4px;">${_esc(s)}</span>`).join('')}</div>`;
        if (weaknesses.length) oa += `<div><span style="color:#a0a098;">待提升</span> ${weaknesses.map(w => `<span style="padding:2px 8px;background:#fee2e2;color:#b91c1c;font-size:12px;border-radius:4px;margin-right:4px;">${_esc(w)}</span>`).join('')}</div>`;
        html += _section('能力画像总评', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;">${oa}</div>`);
    }

    const inno = ability.innovation_ability;
    const learn = ability.learning_ability;
    const pressure = ability.pressure_resistance;
    const comm = ability.communication_ability;
    if (inno || learn || pressure || comm) {
        let dims = [];
        if (inno && inno.level) dims.push(`创新/竞赛：${_esc(inno.level)}`);
        if (learn && learn.level) dims.push(`学习能力：${_esc(learn.level)}`);
        if (pressure && pressure.level) dims.push(`抗压：${_esc(pressure.level)}`);
        if (comm && comm.level) dims.push(`沟通：${_esc(comm.level)}`);
        if (dims.length) html += _section('能力维度', `<div style="background:#faf9f6;border:1px solid #e2dfd7;border-radius:8px;padding:12px 14px;font-size:13px;color:#0f0f0d;">${dims.join(' · ')}</div>`);
    }

    html += `</div>
    <div style="border-top:1px solid #e2dfd7;padding:14px 26px;display:flex;justify-content:flex-end;gap:10px;">
        <button onclick="document.getElementById('studentModal').classList.add('hidden')"
            style="padding:8px 20px;border:1px solid #e2dfd7;background:#fff;border-radius:7px;font-size:13px;font-weight:600;color:#0f0f0d;cursor:pointer;">关闭</button>
        <button onclick="document.getElementById('studentModal').classList.add('hidden');openInviteModal('${_esc(anonymousId).replace(/'/g, "\\'")}')"
            style="padding:8px 20px;border:none;background:#2d6a4f;border-radius:7px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;">发起评估邀请</button>
    </div>`;
    return html;
}

function _mockStudentToDetailData(student) {
    var sk = student.skills || {};
    var skillsArr = Object.keys(sk).map(function (cat) {
        return { category: cat, items: Array.isArray(sk[cat]) ? sk[cat] : [] };
    });
    var ap = student.abilityProfile || {};
    var proSkills = {
        programming_languages: ap['编程语言'] || [],
        frameworks_tools: ap['框架工具'] || [],
        domain_knowledge: ap['领域知识'] || []
    };
    var projects = (student.projects || []).map(function (p) {
        return { name: p.name, start_date: p.period, end_date: '', description: p.desc || '', tech_stack: (p.tech_stack || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean) };
    });
    var certs = (student.certs || []).map(function (c) { return typeof c === 'string' ? { name: c } : c; });
    var awards = (student.awards || []).map(function (a) { return typeof a === 'string' ? { name: a } : a; });
    return {
        anonymous_id: student.anonymousId,
        realName: student.realName,
        profile: {
            basic_info: {
                name: student.realName,
                gender: student.gender,
                birth_date: student.birth_date || student.birthday,
                phone: student.phone,
                email: student.email
            },
            education_info: {
                school: student.school,
                major: student.major || student.majorCategory,
                degree: student.degree || student.educationLevel,
                grade: student.grade,
                gpa: student.gpa,
                expected_graduation: student.expectedGraduation
            },
            skills: skillsArr,
            certificates: certs,
            projects: projects,
            internships: student.internships || [],
            awards: awards
        },
        ability_profile: {
            basic_info: { school: student.school, major: student.major || student.majorCategory, education: student.educationLevel, gpa: student.gpa },
            professional_skills: proSkills
        }
    };
}

function openStudentModal(studentId) {
    _setStudentResumeModalContent(studentId || '');
    var overlay = document.getElementById('studentModal');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            overlay.classList.add('visible');
        });
    });
}

function closeStudentModal(e) {
    var overlay = document.getElementById('studentModal');
    if (!overlay) return;
    if (e && e.target !== overlay) return;
    overlay.classList.remove('visible');
    setTimeout(function () {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
    }, 220);
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
    // Mock: 直接模拟成功
    alert('邀请已发送！');
    closeInviteModal();
    loadInvitations();
}

async function loadInvitations() {
    const mockData = [
        {
            invitation_id: 'INV-2025-001',
            anonymous_student_id: 'student_001',
            target_job: '算法工程师',
            message: '您好，我们公司正在招聘算法工程师，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。',
            status: 'accepted',
            sent_at: '2025-03-08 14:23'
        },
        {
            invitation_id: 'INV-2025-002',
            anonymous_student_id: 'student_003',
            target_job: '算法工程师',
            message: '您好，我们AI团队正在扩招，您的机器学习背景非常符合我们的需求，诚邀参与面试评估。',
            status: 'pending',
            sent_at: '2025-03-09 10:05'
        }
    ];
    renderInvitations(mockData);
    const pendingEl = document.getElementById('pendingInvitations');
    if (pendingEl) pendingEl.textContent = mockData.filter(inv => inv.status === 'pending').length;
}

function getInvitationStatusBadge(status) {
    if (status === 'accepted' || status === '已接受') {
        return '<span style="background:#e8f4ee;color:#2d6a4f;padding:4px 10px;border-radius:20px;font-size:12px;white-space:nowrap;">● 已接受</span>';
    } else if (status === 'pending' || status === '待确认') {
        return '<span style="background:#fff8ec;color:#b56a00;padding:4px 10px;border-radius:20px;font-size:12px;white-space:nowrap;">● 待确认</span>';
    } else if (status === 'rejected' || status === '已拒绝' || status === 'declined') {
        return '<span style="background:#f5f5f5;color:#999;padding:4px 10px;border-radius:20px;font-size:12px;white-space:nowrap;">● 已拒绝</span>';
    }
    return _esc(status);
}

function getInvitationActionBtn(inv) {
    var status = inv.status;
    var invId = (inv.invitation_id != null && inv.invitation_id !== undefined) ? inv.invitation_id : (inv.invitationId || '');
    var invIdEsc = String(invId).replace(/'/g, "\\'");
    if (status === 'accepted' || status === '已接受') {
        return '<button class="btn-fill-eval" onclick="goToEvaluation(\'' + invIdEsc + '\')" '
            + 'style="background:#0f0f0d !important;color:#fff !important;border:none !important;'
            + 'padding:7px 18px;border-radius:6px;font-size:13px;cursor:pointer;'
            + 'white-space:nowrap;font-weight:500;">填写评估</button>';
    } else if (status === 'pending' || status === '待确认') {
        return '<span style="color:#999;font-size:12px;">等待学生响应</span>';
    } else if (status === 'rejected' || status === '已拒绝' || status === 'declined') {
        return '<span style="color:#ccc;font-size:12px;">已拒绝</span>';
    }
    return '';
}

function goToEvaluation(invitationId) {
    switchToSection('evaluations');
    if (invitationId) openEvaluationModal(invitationId);
}

function renderInvitations(invitations) {
    const tbody = document.getElementById('invitationList');
    const stats = document.getElementById('invitationStats');
    const count = invitations ? invitations.length : 0;
    if (stats) stats.textContent = `共 ${count} 条邀请`;

    if (!invitations || invitations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:#a0a098;font-size:14px;">暂无邀请数据</td></tr>`;
        return;
    }

    tbody.innerHTML = invitations.map(inv => {
        const msgPreview = (inv.message || '').slice(0, 40) + ((inv.message || '').length > 40 ? '...' : '');
        const statusBadge = getInvitationStatusBadge(inv.status);
        const actionBtn = getInvitationActionBtn(inv);
        return `
        <tr style="border-bottom:1px solid #e2dfd7;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''">
            <td style="padding:12px 14px 12px 16px;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;">${inv.anonymous_student_id || inv.anonymousStudentId || '-'}</div>
                <div style="font-size:11px;color:#a0a098;margin-top:2px;">${inv.invitation_id || inv.invitationId || '-'}</div>
            </td>
            <td style="padding:12px 14px;font-size:13px;color:#6b6860;">${inv.target_job || inv.targetJob || '-'}</td>
            <td style="padding:12px 14px;font-size:12px;color:#a0a098;white-space:nowrap;">${inv.sent_at || inv.sentAt || '-'}</td>
            <td style="padding:12px 14px;font-size:12px;color:#a0a098;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msgPreview || '-'}</td>
            <td class="col-status" style="padding:12px 14px;">${statusBadge}</td>
            <td class="col-action" style="padding:12px 16px 12px 14px;text-align:right;">${actionBtn}</td>
        </tr>`;
    }).join('');
}

async function loadEvaluations() {
    var list;
    if (window.MockStore) {
        var store = window.MockStore.getMockStore();
        list = (store.evaluations || []).slice();
        renderEvaluations(list);
    } else {
        list = [
            { evaluation_id: 'EVAL-2025-001', invitation_id: 'INV-2025-001', anonymous_student_id: 'student_001', target_job: '算法工程师', overall_impression: 'excellent', hiring_intent: 'strong', status: 'completed', submitted_at: '2025-03-09 16:40' }
        ];
        renderEvaluations(list);
    }
    var completedEl = document.getElementById('completedEvaluations');
    if (completedEl) completedEl.textContent = list.filter(function (e) { return e.status === 'completed'; }).length;
}

function renderEvaluations(evaluations) {
    const tbody = document.getElementById('evaluationList');
    const stats = document.getElementById('evaluationStats');
    const total = document.getElementById('evaluationTotal');
    const count = evaluations ? evaluations.length : 0;
    const completed = evaluations ? evaluations.filter(e => e.status === 'completed').length : 0;
    if (stats) stats.textContent = `共 ${count} 条评估`;
    if (total) total.textContent = `共 ${count} 条 · 已完成 ${completed} 条 · 进行中 ${count - completed} 条`;

    if (!evaluations || evaluations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:#a0a098;font-size:14px;">暂无评估数据</td></tr>`;
        window.__hrCurrentEvaluations = [];
        return;
    }
    window.__hrCurrentEvaluations = evaluations;

    const statusMap = {
        'in_progress': { text: '进行中', bg: '#e0f2fe', color: '#0369a1' },
        'completed':   { text: '已完成', bg: '#e8f0eb', color: '#2d6a4f' }
    };
    var impressionMap = {
        'excellent': { text: '优秀', color: '#2d6a4f' },
        'good':      { text: '良好', color: '#2d6a4f' },
        'average':   { text: '一般', color: '#7a6f3e' },
        'below_average': { text: '有待提升', color: '#b91c1c' },
        '优秀': { text: '优秀', color: '#2d6a4f' },
        '良好': { text: '良好', color: '#2d6a4f' },
        '一般': { text: '一般', color: '#7a6f3e' },
        '有待提升': { text: '有待提升', color: '#b91c1c' }
    };
    var intentMap = {
        'strong':   { text: '强烈推荐', color: '#2d6a4f' },
        'moderate': { text: '有意向',   color: '#2d6a4f' },
        'weak':     { text: '可考虑',   color: '#7a6f3e' },
        'no':       { text: '暂不考虑', color: '#b91c1c' },
        '强烈推荐': { text: '强烈推荐', color: '#2d6a4f' },
        '有意向':   { text: '有意向',   color: '#2d6a4f' },
        '可考虑':   { text: '可考虑',   color: '#7a6f3e' },
        '暂不考虑': { text: '暂不考虑', color: '#b91c1c' }
    };

    tbody.innerHTML = evaluations.map(ev => {
        var status = ev.status;
        var s = statusMap[status] || { text: status, bg: '#f0f0f0', color: '#666' };
        var overallKey = ev.overall_impression || ev.overallImpression;
        var hiringKey = ev.hiring_intent || ev.hiringIntent;
        var imp = impressionMap[overallKey] || { text: overallKey || '—', color: '#a0a098' };
        var intent = intentMap[hiringKey] || { text: hiringKey || '—', color: '#a0a098' };
        var isCompleted = status === 'completed';
        var anonId = ev.anonymous_student_id || ev.anonymousStudentId || '—';
        var evalId = ev.evaluation_id || ev.evaluationId || '';
        var subAt = ev.submitted_at || ev.submittedAt || ev.created_at || ev.createdAt || '';
        var targetJob = ev.target_job || ev.targetJob || '—';
        return `
        <tr style="border-bottom:1px solid #e2dfd7;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''">
            <td style="padding:12px 14px 12px 16px;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;">${anonId}</div>
                <div style="font-size:11px;color:#a0a098;margin-top:2px;">${evalId} · ${subAt}</div>
            </td>
            <td style="padding:12px 14px;font-size:13px;color:#6b6860;">${targetJob}</td>
            <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${imp.color};">${isCompleted ? imp.text : '—'}</td>
            <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${intent.color};">${isCompleted ? intent.text : '—'}</td>
            <td style="padding:12px 14px;">
                <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};white-space:nowrap;">
                    <span style="width:6px;height:6px;border-radius:50%;background:${s.color};flex-shrink:0;"></span>
                    ${s.text}
                </span>
            </td>
            <td style="padding:12px 16px 12px 14px;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                    ${!isCompleted ? `
                    <button class="btn-fill-eval" style="background:#0f0f0d !important;color:#fff !important;border:none !important;padding:7px 18px;border-radius:6px;font-size:13px;cursor:pointer;white-space:nowrap;font-weight:500;"
                        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
                        onclick="openEvalFormModal('${(ev.evaluation_id || '').replace(/'/g, "\\'")}', '${(ev.invitation_id || '').replace(/'/g, "\\'")}')">填写评估</button>` : `
                    <button style="height:28px;padding:0 11px;font-size:12px;font-weight:600;border-radius:5px;border:1px solid #e2dfd7;background:#fff;color:#0f0f0d;cursor:pointer;"
                        onmouseover="this.style.borderColor='#2d6a4f';this.style.color='#2d6a4f'"
                        onmouseout="this.style.borderColor='#e2dfd7';this.style.color='#0f0f0d'"
                        onclick="openEvalReportModalById('${String(ev.evaluation_id || ev.evaluationId || '').replace(/'/g, "\\'")}')">查看报告</button>`}
                </div>
            </td>
        </tr>`;
    }).join('');
}

/** 打开「提交评估结果」填写弹窗（填写评估 / 查看报告 均打开此弹窗） */
function openEvalFormModal(evaluationId, invitationId) {
    var modal = document.getElementById('evaluationModal');
    if (!modal) return;
    modal.dataset.evaluationId = evaluationId || '';
    modal.dataset.invitationId = invitationId || '';
    document.getElementById('evaluationId').value = evaluationId || '';
    [ 'overallImpression', 'skillMatch', 'learningAbility', 'communication', 'teamwork', 'stressResistance', 'professionalMaturity', 'hiringIntent', 'strengthsNoted', 'weaknessesNoted', 'recommendedPositions', 'evaluationBasis' ].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    modal.classList.remove('hidden');
}

function openEvaluationModal(evaluationId) {
    openEvalFormModal(evaluationId, '');
}

function closeEvaluationModal() {
    document.getElementById('evaluationModal').classList.add('hidden');
}

/** 根据评估ID打开报告详情弹窗（从当前列表或 MockStore 查找记录） */
function openEvalReportModalById(evaluationId) {
    if (!evaluationId) return;
    var ev = null;
    if (window.__hrCurrentEvaluations && window.__hrCurrentEvaluations.length) {
        ev = window.__hrCurrentEvaluations.find(function (e) {
            return (e.evaluation_id || e.evaluationId) === evaluationId;
        });
    }
    if (!ev && window.MockStore) {
        var store = window.MockStore.getMockStore();
        var list = store.evaluations || [];
        ev = list.find(function (e) { return (e.evaluationId || e.evaluation_id) === evaluationId; });
    }
    if (ev) openEvalReportModal(ev);
}

function openEvalReportModal(evalRecord) {
    console.log('evalRecord完整数据：', JSON.stringify(evalRecord));
    console.log('dimensionScores：', evalRecord.dimensionScores, evalRecord.dimension_scores);

    var dimensions = ['专业技能匹配度', '学习能力', '沟通表达', '团队协作意愿', '抗压能力', '职业成熟度'];
    var scores = evalRecord.dimensionScores
        || evalRecord.dimension_scores
        || { '专业技能匹配度': 95, '学习能力': 95, '沟通表达': 80, '团队协作意愿': 86, '抗压能力': 99, '职业成熟度': 94 };

    var overallRaw = evalRecord.overallImpression || evalRecord.overall_impression || '—';
    var hiringRaw = evalRecord.hiringIntent || evalRecord.hiring_intent || '—';
    var impressionToText = { excellent: '优秀', good: '良好', average: '一般', below_average: '有待提升' };
    var intentToText = { strong: '强烈推荐', moderate: '有意向', weak: '可考虑', no: '暂不考虑' };
    var overallText = impressionToText[overallRaw] || overallRaw;
    var hiringText = intentToText[hiringRaw] || hiringRaw;

    var evaluatorName = evalRecord.evaluatorName || evalRecord.evaluator_name
        || (typeof currentHrData !== 'undefined' && currentHrData && (currentHrData.real_name || currentHrData.realName))
        || 'HR 管理员';

    document.getElementById('reportStudentId').textContent = evalRecord.anonymousStudentId || evalRecord.anonymous_student_id || '—';
    document.getElementById('reportTargetJob').textContent = evalRecord.targetJob || evalRecord.target_job || '—';
    document.getElementById('reportSubmittedAt').textContent = evalRecord.submittedAt || evalRecord.submitted_at || '—';
    var evEl = document.getElementById('reportEvaluator');
    if (evEl) evEl.textContent = evaluatorName;
    document.getElementById('reportOverall').textContent = overallText;
    document.getElementById('reportHiring').textContent = hiringText;
    document.getElementById('reportStrengths').textContent = evalRecord.strengthsNoted || evalRecord.strengths_noted
        || '技术种类多样，学习与抗压能力强，培养潜力高，项目实战表现突出';
    document.getElementById('reportWeaknesses').textContent = evalRecord.weaknessesNoted || evalRecord.weaknesses_noted
        || '沟通表达与团队协作意愿偏弱，建议面试中重点考察';

    var positions = evalRecord.recommendedPositions || evalRecord.recommended_positions || ['算法工程师', '后端研发', '开发工程师'];
    var posEl = document.getElementById('reportPositions');
    if (Array.isArray(positions) && positions.length) {
        posEl.innerHTML = positions.map(function (p) {
            return '<span class="erp-job-tag">' + String(p).replace(/</g, '&lt;') + '</span>';
        }).join('');
    } else {
        posEl.innerHTML = '<span style="color:#8a8a8a;font-size:12px;">暂无推荐岗位</span>';
    }

    var barsHtml = dimensions.map(function (dim) {
        var val = scores[dim] !== undefined ? scores[dim] : 0;
        var w = Math.min(100, Math.max(0, val));
        var isGold = dim === '沟通表达';
        return '<div class="erp-bar-row">' +
            '<div class="erp-bar-header">' +
            '<span class="erp-bar-name">' + dim + '</span>' +
            '<span class="erp-bar-score' + (isGold ? ' erp-gold' : '') + '">' + val + '</span></div>' +
            '<div class="erp-bar-track"><div class="erp-bar-fill' + (isGold ? ' erp-gold' : '') + '" style="width:' + w + '%;"></div></div></div>';
    }).join('');
    document.getElementById('reportScoreBars').innerHTML = barsHtml;

    var dimValues = dimensions.map(function (d) { return Number(scores[d]) || 0; });
    var avgScore = dimValues.reduce(function (a, b) { return a + b; }, 0) / dimValues.length;
    var avgEl = document.getElementById('reportAvgScore');
    if (avgEl) avgEl.textContent = avgScore.toFixed(1);

    var miniOrder = [
        { key: '专业技能匹配度', short: '专业技能' },
        { key: '学习能力', short: '学习能力' },
        { key: '沟通表达', short: '沟通表达' },
        { key: '团队协作意愿', short: '团队协作' },
        { key: '抗压能力', short: '抗压能力' },
        { key: '职业成熟度', short: '职业成熟度' }
    ];
    var miniEl = document.getElementById('reportMiniScores');
    if (miniEl) {
        miniEl.innerHTML = miniOrder.map(function (m) {
            var val = scores[m.key] !== undefined ? scores[m.key] : 0;
            var gold = m.key === '沟通表达';
            return '<div class="erp-mini-score">' +
                '<div class="erp-mini-score-val' + (gold ? ' erp-gold' : '') + '">' + val + '</div>' +
                '<div class="erp-mini-score-label">' + m.short + '</div></div>';
        }).join('');
    }

    var topDim = dimensions.reduce(function (a, b) { return (scores[a] || 0) > (scores[b] || 0) ? a : b; });
    var lowDim = dimensions.reduce(function (a, b) { return (scores[a] || 0) < (scores[b] || 0) ? a : b; });
    var perfWord = avgScore >= 85 ? '优秀' : avgScore >= 75 ? '良好' : '中等';
    var insightText = '综合6项维度评分，该候选人平均得分' + avgScore.toFixed(1) + '分，整体表现' + perfWord + '。\n' +
        '「' + topDim + '」维度最为突出（' + (scores[topDim] || 0) + '分），显示出较强核心竞争力；\n' +
        '「' + lowDim + '」（' + (scores[lowDim] || 0) + '分）仍有提升空间，建议面试环节加入团队协作\n场景题以进一步验证。综合建议优先考虑' + (positions[0] || '算法工程师') + '方向岗位。';
    document.getElementById('reportInsight').textContent = insightText;

    var genTime = evalRecord.submittedAt || evalRecord.submitted_at || '—';
    var fm = document.getElementById('reportFooterMeta');
    if (fm) fm.textContent = '报告生成时间 ' + genTime + ' · 星途智探HR系统';

    var radarLabels = dimensions.map(function (d) {
        if (d === '专业技能匹配度') return '专业技能\n匹配度';
        if (d === '团队协作意愿') return '团队协作\n意愿';
        if (d === '职业成熟度') return '职业\n成熟度';
        return d;
    });
    var canvas = document.getElementById('reportRadarChart');
    if (canvas) drawRadar(canvas, radarLabels, dimValues);

    var modal = document.getElementById('evalReportModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
    }
}

/** HR 评估报告雷达图：逻辑尺寸 220×170，devicePixelRatio×2 超采样 */
function drawHrEvalRadarChart(canvas, radarLabels, values) {
    if (!canvas || !canvas.getContext) return;
    var w = 220;
    var h = 170;
    var scale = (window.devicePixelRatio || 1) * 2;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cx = w / 2;
    var cy = h / 2 + 4;
    var R = 63;
    var n = radarLabels.length;

    function angle(i) {
        return (Math.PI * 2 / n) * i - Math.PI / 2;
    }
    function pt(i, rLen) {
        return [cx + rLen * Math.cos(angle(i)), cy + rLen * Math.sin(angle(i))];
    }

    var lv;
    for (lv = 1; lv <= 5; lv++) {
        var rr = R * lv / 5;
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
            var p = pt(i, rr);
            if (i === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
        }
        ctx.closePath();
        ctx.strokeStyle = lv === 5 ? '#b8d4a8' : '#dfe8d8';
        ctx.lineWidth = lv === 5 ? 1 : 0.8;
        ctx.stroke();
        if (lv === 5) {
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '9px "Noto Sans SC", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('100', cx + 2, cy - R + 5);
        }
    }

    for (var a = 0; a < n; a++) {
        var edge = pt(a, R);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(edge[0], edge[1]);
        ctx.strokeStyle = '#d4e8c4';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    ctx.beginPath();
    for (var j = 0; j < n; j++) {
        var rData = R * (values[j] || 0) / 100;
        var q = pt(j, rData);
        if (j === 0) ctx.moveTo(q[0], q[1]);
        else ctx.lineTo(q[0], q[1]);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(74, 103, 65, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#4a6741';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    for (var k = 0; k < n; k++) {
        var rDot = R * (values[k] || 0) / 100;
        var dpt = pt(k, rDot);
        ctx.beginPath();
        ctx.arc(dpt[0], dpt[1], 3, 0, Math.PI * 2);
        ctx.fillStyle = '#4a6741';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.font = '9px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#555555';
    for (var t = 0; t < n; t++) {
        var lp = pt(t, R + 18);
        var lines = String(radarLabels[t]).split('\n');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (lines.length === 1) {
            ctx.fillText(lines[0], lp[0], lp[1]);
        } else {
            ctx.fillText(lines[0], lp[0], lp[1] - 4);
            ctx.fillText(lines[1], lp[0], lp[1] + 4);
        }
    }
}

function drawRadar(canvas, labels, values) {
    drawHrEvalRadarChart(canvas, labels, values);
}

window.openEvalReportModalById = openEvalReportModalById;
window.drawRadar = drawRadar;

var impressionToText = { excellent: '优秀', good: '良好', average: '一般', below_average: '有待提升' };
var intentToText = { strong: '强烈推荐', moderate: '有意向', weak: '可考虑', no: '暂不考虑' };

async function handleEvaluationSubmit(e) {
    e.preventDefault();
    var modal = document.getElementById('evaluationModal');
    var evaluationId = (modal && modal.dataset.evaluationId) || document.getElementById('evaluationId').value;
    var invitationId = (modal && modal.dataset.invitationId) || '';

    var overallImpression = document.getElementById('overallImpression').value;
    var hiringIntent = document.getElementById('hiringIntent').value;
    if (!overallImpression || !hiringIntent) {
        alert('请填写整体印象和聘用意向');
        return;
    }

    var dimensionScores = {
        '专业技能匹配度': parseInt(document.getElementById('skillMatch').value, 10) || 0,
        '学习能力': parseInt(document.getElementById('learningAbility').value, 10) || 0,
        '沟通表达': parseInt(document.getElementById('communication').value, 10) || 0,
        '团队协作意愿': parseInt(document.getElementById('teamwork').value, 10) || 0,
        '抗压能力': parseInt(document.getElementById('stressResistance').value, 10) || 0,
        '职业成熟度': parseInt(document.getElementById('professionalMaturity').value, 10) || 0
    };
    var strengthsNoted = document.getElementById('strengthsNoted').value || '';
    var weaknessesNoted = document.getElementById('weaknessesNoted').value || '';
    var recommendedPositions = (document.getElementById('recommendedPositions').value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    var hrId = currentHrData.hr_id;
    if (typeof hrId === 'string') {
        var n = parseInt(hrId, 10);
        hrId = isNaN(n) ? 1 : n;
    } else if (typeof hrId !== 'number') {
        hrId = 1;
    }

    var data = {
        hr_id: hrId,
        evaluation_id: evaluationId,
        evaluation_form: {
            overall_impression: overallImpression,
            dimension_scores: dimensionScores,
            hiring_intent: hiringIntent,
            strengths_noted: strengthsNoted,
            weaknesses_noted: weaknessesNoted,
            recommended_positions: recommendedPositions,
            evaluation_basis: document.getElementById('evaluationBasis').value || ''
        }
    };

    showLoading();
    try {
        var response = await fetch(HR_BACKEND_BASE.replace(/\/$/, '') + '/hr/evaluation/' + encodeURIComponent(evaluationId) + '/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (currentHrData.token || '')
            },
            body: JSON.stringify(data)
        });
        var result = await response.json().catch(function () { return {}; });
        if (result.code === 200) {
            syncEvalToMockStore(evaluationId, invitationId, {
                overallImpression: impressionToText[overallImpression] || overallImpression,
                hiringIntent: intentToText[hiringIntent] || hiringIntent,
                dimensionScores: dimensionScores,
                strengthsNoted: strengthsNoted,
                weaknessesNoted: weaknessesNoted,
                recommendedPositions: recommendedPositions,
                submittedAt: new Date().toLocaleString('zh-CN')
            });
            alert('评估提交成功！');
            closeEvaluationModal();
            loadEvaluations();
        } else {
            alert(result.msg || '提交评估失败');
        }
    } catch (error) {
        console.error('提交评估错误:', error);
        syncEvalToMockStore(evaluationId, invitationId, {
            overallImpression: impressionToText[overallImpression] || overallImpression,
            hiringIntent: intentToText[hiringIntent] || hiringIntent,
            dimensionScores: dimensionScores,
            strengthsNoted: strengthsNoted,
            weaknessesNoted: weaknessesNoted,
            recommendedPositions: recommendedPositions,
            submittedAt: new Date().toLocaleString('zh-CN')
        });
        alert('评估已保存到本地；网络请求失败时可稍后重试。');
        closeEvaluationModal();
        loadEvaluations();
    } finally {
        hideLoading();
    }
}

function syncEvalToMockStore(evaluationId, invitationId, formData) {
    if (typeof window.MockStore === 'undefined') return;
    var store = window.MockStore.getMockStore();
    var evalRecord = store.evaluations && store.evaluations.find(function (e) {
        return String(e.evaluationId || e.evaluation_id) === String(evaluationId);
    });
    if (evalRecord) {
        evalRecord.status = 'completed';
        evalRecord.submittedAt = formData.submittedAt;
        evalRecord.overallImpression = formData.overallImpression;
        evalRecord.hiringIntent = formData.hiringIntent;
        evalRecord.dimensionScores = formData.dimensionScores;
        evalRecord.strengthsNoted = formData.strengthsNoted;
        evalRecord.weaknessesNoted = formData.weaknessesNoted;
        evalRecord.recommendedPositions = formData.recommendedPositions;
    }
    if (invitationId && store.invitations) {
        var inv = store.invitations.find(function (i) {
            return String(i.invitationId || i.invitation_id) === String(invitationId);
        });
        if (inv) {
            store.myReports = store.myReports || [];
            var existing = store.myReports.findIndex(function (r) { return String(r.evaluationId) === String(evaluationId); });
            var report = {
                evaluationId: evaluationId,
                companyName: inv.companyName || inv.company_name,
                targetJob: inv.targetJob || inv.target_job,
                submittedAt: formData.submittedAt,
                overallImpression: formData.overallImpression,
                hiringIntent: formData.hiringIntent,
                dimensionScores: formData.dimensionScores,
                strengthsNoted: formData.strengthsNoted,
                weaknessesNoted: formData.weaknessesNoted,
                recommendedPositions: formData.recommendedPositions
            };
            if (existing >= 0) store.myReports[existing] = report;
            else store.myReports.push(report);
        }
    }
    window.MockStore.saveMockStore(store);
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
        try {
            initHrDashboard();
        } catch (err) {
            console.error('HR 仪表盘初始化失败:', err);
            alert('页面初始化失败，请刷新重试。若仍异常请查看控制台。');
        }
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
