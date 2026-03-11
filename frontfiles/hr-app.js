const API_BASE_URL = 'http://127.0.0.1:5002/api/v1';

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

function initHrDashboard() {
    if (!checkHrAuth()) return;

    document.getElementById('hrUserName').textContent = currentHrData.real_name || 'HR';
    document.getElementById('hrCompanyName').textContent = currentHrData.company_name || '请完善企业信息';
    document.getElementById('hrWelcomeName').textContent = currentHrData.real_name;
    document.getElementById('unreadEvaluations').textContent = currentHrData.unread_evaluations || 0;

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
            if (document.getElementById('totalStudents')) document.getElementById('totalStudents').textContent = result.data.total;
            
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
        const tags = (student.ability_tags || []).slice(0, 3)
            .map(t => `<span style="font-size:10px;font-weight:600;padding:2px 8px;background:#e8f0eb;color:#2d6a4f;border-radius:100px;white-space:nowrap;">${t}</span>`)
            .join('');
        const score = student.system_match_score || 0;
        const scoreColor = score >= 80 ? '#2d6a4f' : '#7a6f3e';
        const sid = student.anonymous_id;
        const gpaDisplay = (student.gpa_level || '-').replace(/\s*[（(][^）)]*[）)]\s*$/g, '').trim() || '-';
        return `
        <tr style="border-bottom:1px solid #e2dfd7;cursor:pointer;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''"
            onclick="openStudentModal('${sid}')">
            <td style="padding:11px 10px 11px 16px;">
                <div style="width:28px;height:28px;background:#f6f4ef;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6b6860;">S${index+1}</div>
            </td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;margin-bottom:4px;">${sid}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">${tags}</div>
            </td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;">${student.education_level || '-'}</td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.major_category || '-'}</td>
            <td style="padding:11px 10px;font-size:13px;color:#6b6860;">${gpaDisplay}</td>
            <td style="padding:11px 10px;font-size:14px;font-weight:700;color:${scoreColor};">${score}分</td>
            <td style="padding:11px 12px 11px 10px;white-space:nowrap;">
                <div style="display:flex;flex-wrap:nowrap;gap:6px;justify-content:flex-end;align-items:center;" onclick="event.stopPropagation()">
                    <button style="height:28px;padding:0 8px;font-size:12px;font-weight:600;border-radius:5px;border:1px solid #e2dfd7;background:#fff;color:#0f0f0d;cursor:pointer;white-space:nowrap;"
                        onmouseover="this.style.borderColor='#2d6a4f';this.style.color='#2d6a4f'"
                        onmouseout="this.style.borderColor='#e2dfd7';this.style.color='#0f0f0d'"
                        onclick="openStudentModal('${sid}')">查看详情</button>
                    <button style="height:28px;padding:0 8px;font-size:12px;font-weight:600;border-radius:5px;border:none;background:#0f0f0d;color:#fff;cursor:pointer;white-space:nowrap;"
                        onmouseover="this.style.background='#2d6a4f'"
                        onmouseout="this.style.background='#0f0f0d'"
                        onclick="openInviteModal('${sid}')">发起邀请</button>
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
    const profile = data.profile || {};
    const ability = data.ability_profile || {};
    const anonymousId = data.anonymous_id || '';
    const basic = profile.basic_info || {};
    const abBasic = ability.basic_info || {};
    const edu = profile.education_info || {};
    const targetJob = basic.target_job || abBasic.target_job || '待定';
    const letter = (anonymousId.slice(-1) || 'S').toUpperCase();

    let html = `
    <div style="background:#0f0f0d;border-radius:14px 14px 0 0;padding:26px 26px 22px;display:flex;gap:16px;align-items:flex-start;position:relative;">
        <button onclick="document.getElementById('studentModal').classList.add('hidden')"
            style="position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;">✕</button>
        <div style="width:52px;height:52px;background:#2d6a4f;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;">${_esc(letter)}</div>
        <div>
            <div style="font-size:19px;font-weight:700;color:#fff;">${_esc(anonymousId)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);">应聘岗位：${_esc(targetJob)}</div>
        </div>
    </div>
    <div style="padding:22px 26px;max-height:60vh;overflow-y:auto;">`;

    const basicFields = [
        ['姓名', basic.name],
        ['昵称', basic.nickname],
        ['性别', basic.gender],
        ['出生日期', basic.birth_date || basic.birthday],
        ['手机', basic.phone],
        ['邮箱', basic.email]
    ].filter(([, v]) => v != null && String(v).trim() !== '');
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

async function openStudentModal(studentId) {
    const contentEl = document.getElementById('studentModalContent');
    contentEl.innerHTML = '<div style="padding:48px;text-align:center;color:#a0a098;">加载中...</div>';
    document.getElementById('studentModal').classList.remove('hidden');

    try {
        const params = new URLSearchParams({ anonymous_id: studentId });
        const response = await fetch(`${API_BASE_URL}/hr/students/detail?${params}`, {
            headers: { 'Authorization': `Bearer ${currentHrData.token}` }
        });
        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            contentEl.innerHTML = '<div style="padding:48px;text-align:center;color:#b91c1c;">加载档案失败：' + (result.msg || '未知错误') + '</div>';
            return;
        }
        contentEl.innerHTML = _renderFullStudentDetail(result.data);
    } catch (err) {
        console.error('加载学生详情错误:', err);
        contentEl.innerHTML = '<div style="padding:48px;text-align:center;color:#b91c1c;">网络错误，请稍后重试</div>';
    }
}

function closeStudentModal(e) {
    if (e.target === document.getElementById('studentModal')) {
        document.getElementById('studentModal').classList.add('hidden');
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
    // Mock: 直接模拟成功
    alert('邀请已发送！');
    closeInviteModal();
    loadInvitations();
}

async function loadInvitations() {
    const mockData = [
        {
            invitation_id: 'INV-2025-001',
            anonymous_student_id: 'student_anon_001',
            target_job: 'AI产品经理',
            message: '您好，我们公司正在招聘AI产品经理，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。',
            status: 'accepted',
            sent_at: '2025-03-08 14:23'
        },
        {
            invitation_id: 'INV-2025-002',
            anonymous_student_id: 'student_anon_003',
            target_job: '算法工程师',
            message: '您好，我们AI团队正在扩招，您的机器学习背景非常符合我们的需求，诚邀参与面试评估。',
            status: 'pending',
            sent_at: '2025-03-09 10:05'
        },
        {
            invitation_id: 'INV-2025-003',
            anonymous_student_id: 'student_anon_007',
            target_job: '后端开发工程师',
            message: '您好，看到您有Spring Boot和分布式系统经验，与我们岗位高度匹配，希望进一步了解。',
            status: 'pending',
            sent_at: '2025-03-10 09:30'
        }
    ];
    renderInvitations(mockData);
    const pendingEl = document.getElementById('pendingInvitations');
    if (pendingEl) pendingEl.textContent = mockData.filter(inv => inv.status === 'pending').length;
}

function renderInvitations(invitations) {
    const tbody = document.getElementById('invitationList');
    const stats = document.getElementById('invitationStats');
    const total = document.getElementById('invitationTotal');
    const count = invitations ? invitations.length : 0;
    if (stats) stats.textContent = `共 ${count} 条邀请`;
    if (total) total.textContent = `共 ${count} 条记录`;

    if (!invitations || invitations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:#a0a098;font-size:14px;">暂无邀请数据</td></tr>`;
        return;
    }

    const statusMap = {
        'pending':  { text: '待确认', bg: '#fef3e2', color: '#b56a00' },
        'accepted': { text: '已接受', bg: '#e8f0eb', color: '#2d6a4f' },
        'declined': { text: '已拒绝', bg: '#fee2e2', color: '#b91c1c' }
    };

    tbody.innerHTML = invitations.map(inv => {
        const s = statusMap[inv.status] || { text: inv.status, bg: '#f0f0f0', color: '#666' };
        const canEval = inv.status === 'accepted';
        const msgPreview = (inv.message || '').slice(0, 40) + ((inv.message || '').length > 40 ? '...' : '');
        return `
        <tr style="border-bottom:1px solid #e2dfd7;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''">
            <td style="padding:12px 14px 12px 16px;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;">${inv.anonymous_student_id || '-'}</div>
                <div style="font-size:11px;color:#a0a098;margin-top:2px;">${inv.invitation_id}</div>
            </td>
            <td style="padding:12px 14px;font-size:13px;color:#6b6860;">${inv.target_job || '-'}</td>
            <td style="padding:12px 14px;font-size:12px;color:#a0a098;white-space:nowrap;">${inv.sent_at || '-'}</td>
            <td style="padding:12px 14px;font-size:12px;color:#a0a098;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msgPreview || '-'}</td>
            <td style="padding:12px 14px;">
                <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};">
                    <span style="width:6px;height:6px;border-radius:50%;background:${s.color};flex-shrink:0;"></span>
                    ${s.text}
                </span>
            </td>
            <td style="padding:12px 16px 12px 14px;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                    ${canEval ? `<button style="height:28px;padding:0 11px;font-size:12px;font-weight:600;border-radius:5px;border:none;background:#2d6a4f;color:#fff;cursor:pointer;"
                        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
                        onclick="openEvaluationModal('${inv.invitation_id}')">填写评估</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function loadEvaluations() {
    const mockData = [
        {
            evaluation_id: 'EVAL-2025-001',
            anonymous_student_id: 'student_anon_001',
            target_job: 'AI产品经理',
            overall_impression: 'excellent',
            hiring_intent: 'strong',
            status: 'completed',
            submitted_at: '2025-03-09 16:40'
        },
        {
            evaluation_id: 'EVAL-2025-002',
            anonymous_student_id: 'student_anon_003',
            target_job: '算法工程师',
            overall_impression: 'good',
            hiring_intent: 'moderate',
            status: 'in_progress',
            created_at: '2025-03-10 10:05'
        }
    ];
    renderEvaluations(mockData);
    const completedEl = document.getElementById('completedEvaluations');
    if (completedEl) completedEl.textContent = mockData.filter(e => e.status === 'completed').length;
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
        return;
    }

    const statusMap = {
        'in_progress': { text: '进行中', bg: '#e0f2fe', color: '#0369a1' },
        'completed':   { text: '已完成', bg: '#e8f0eb', color: '#2d6a4f' }
    };
    const impressionMap = {
        'excellent': { text: '优秀', color: '#2d6a4f' },
        'good':      { text: '良好', color: '#2d6a4f' },
        'average':   { text: '一般', color: '#7a6f3e' },
        'below_average': { text: '有待提升', color: '#b91c1c' }
    };
    const intentMap = {
        'strong':   { text: '强烈推荐', color: '#2d6a4f' },
        'moderate': { text: '有意向',   color: '#2d6a4f' },
        'weak':     { text: '可考虑',   color: '#7a6f3e' },
        'no':       { text: '暂不考虑', color: '#b91c1c' }
    };

    tbody.innerHTML = evaluations.map(ev => {
        const s = statusMap[ev.status] || { text: ev.status, bg: '#f0f0f0', color: '#666' };
        const imp = impressionMap[ev.overall_impression] || { text: '-', color: '#a0a098' };
        const intent = intentMap[ev.hiring_intent] || { text: '-', color: '#a0a098' };
        const isCompleted = ev.status === 'completed';
        return `
        <tr style="border-bottom:1px solid #e2dfd7;transition:background 0.1s;"
            onmouseover="this.style.background='#faf9f6'"
            onmouseout="this.style.background=''">
            <td style="padding:12px 14px 12px 16px;">
                <div style="font-size:13px;font-weight:600;color:#0f0f0d;">${ev.anonymous_student_id || '-'}</div>
                <div style="font-size:11px;color:#a0a098;margin-top:2px;">${ev.evaluation_id} · ${ev.submitted_at || ev.created_at || ''}</div>
            </td>
            <td style="padding:12px 14px;font-size:13px;color:#6b6860;">${ev.target_job || '-'}</td>
            <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${imp.color};">${isCompleted ? imp.text : '—'}</td>
            <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${intent.color};">${isCompleted ? intent.text : '—'}</td>
            <td style="padding:12px 14px;">
                <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};">
                    <span style="width:6px;height:6px;border-radius:50%;background:${s.color};flex-shrink:0;"></span>
                    ${s.text}
                </span>
            </td>
            <td style="padding:12px 16px 12px 14px;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                    ${!isCompleted ? `
                    <button style="height:28px;padding:0 11px;font-size:12px;font-weight:600;border-radius:5px;border:none;background:#2d6a4f;color:#fff;cursor:pointer;"
                        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
                        onclick="openEvaluationModal('${ev.evaluation_id}')">填写评估</button>` : `
                    <button style="height:28px;padding:0 11px;font-size:12px;font-weight:600;border-radius:5px;border:1px solid #e2dfd7;background:#fff;color:#0f0f0d;cursor:pointer;"
                        onmouseover="this.style.borderColor='#2d6a4f';this.style.color='#2d6a4f'"
                        onmouseout="this.style.borderColor='#e2dfd7';this.style.color='#0f0f0d'"
                        onclick="openEvaluationModal('${ev.evaluation_id}')">查看报告</button>`}
                </div>
            </td>
        </tr>`;
    }).join('');
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
