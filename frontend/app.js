// 安全 storage：部分浏览器（如 Safari 防跟踪）会拦截 localStorage，导致报错；失败时用内存兜底
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

// 晋升路径默认数据（按岗位名关键词匹配，无接口或接口空时使用，避免卡片显示"-"）
const PROMOTION_STAGES_BY_JOB = {
    default: [
        { year: '0-2年', title: '初级/助理', salary: '8k-15k', skills: ['基础技能', '学习能力'], icon: '🌱' },
        { year: '2-4年', title: '中级', salary: '15k-25k', skills: ['独立负责', '协作能力'], icon: '🌿' },
        { year: '4-7年', title: '高级/专家', salary: '25k-45k', skills: ['专业深度', '带人能力'], icon: '🌳' },
        { year: '7年+', title: '专家/总监', salary: '45k+', skills: ['战略规划', '团队管理'], icon: '🏆' }
    ],
    算法: [
        { year: '0-2年', title: '初级算法工程师', salary: '10k-18k', skills: ['Python基础', '机器学习入门', '数据处理'], icon: '🌱' },
        { year: '2-4年', title: '算法工程师', salary: '20k-35k', skills: ['深度学习', 'PyTorch/TensorFlow', '模型优化'], icon: '🌿' },
        { year: '4-7年', title: '高级算法工程师', salary: '35k-55k', skills: ['算法架构设计', '团队技术指导', '前沿论文实现'], icon: '🌳' },
        { year: '7年+', title: '算法专家/技术总监', salary: '60k+', skills: ['技术战略规划', '团队管理', 'AI产品方向把控'], icon: '🏆' }
    ],
    前端: [
        { year: '0-2年', title: '初级前端工程师', salary: '10k-18k', skills: ['HTML/CSS/JS', 'Vue/React入门', '工程化基础'], icon: '🌱' },
        { year: '2-4年', title: '前端开发工程师', salary: '15k-28k', skills: ['框架进阶', '性能优化', '跨端开发'], icon: '🌿' },
        { year: '4-7年', title: '高级前端/技术专家', salary: '28k-45k', skills: ['架构设计', '团队带教', '技术选型'], icon: '🌳' },
        { year: '7年+', title: '前端架构师/技术总监', salary: '45k+', skills: ['技术战略', '团队管理', '跨部门协作'], icon: '🏆' }
    ],
    后端: [
        { year: '0-2年', title: '初级后端工程师', salary: '10k-18k', skills: ['Java/Python/Go基础', '数据库与API', '基础架构'], icon: '🌱' },
        { year: '2-4年', title: '后端开发工程师', salary: '18k-32k', skills: ['微服务', '高并发', '中间件'], icon: '🌿' },
        { year: '4-7年', title: '高级后端/架构师', salary: '32k-55k', skills: ['系统架构', '技术攻坚', '团队带教'], icon: '🌳' },
        { year: '7年+', title: '架构师/技术总监', salary: '55k+', skills: ['技术战略', '团队管理', '业务赋能'], icon: '🏆' }
    ],
    数据: [
        { year: '0-2年', title: '初级数据分析师', salary: '10k-18k', skills: ['SQL', 'Excel', '数据可视化'], icon: '🌱' },
        { year: '2-4年', title: '数据分析师', salary: '15k-28k', skills: ['Python', '统计建模', '业务分析'], icon: '🌿' },
        { year: '4-7年', title: '高级数据分析/科学家', salary: '28k-50k', skills: ['机器学习', '数据架构', '团队带教'], icon: '🌳' },
        { year: '7年+', title: '数据专家/总监', salary: '50k+', skills: ['数据战略', '团队管理', '决策支持'], icon: '🏆' }
    ],
    产品: [
        { year: '0-2年', title: '产品助理/专员', salary: '10k-18k', skills: ['需求分析', '原型设计', '用户研究'], icon: '🌱' },
        { year: '2-4年', title: '产品经理', salary: '18k-32k', skills: ['产品规划', '项目管理', '跨部门协作'], icon: '🌿' },
        { year: '4-7年', title: '高级产品经理', salary: '32k-50k', skills: ['战略规划', '团队带教', '商业洞察'], icon: '🌳' },
        { year: '7年+', title: '产品总监/VP', salary: '50k+', skills: ['产品战略', '团队管理', '业务目标'], icon: '🏆' }
    ],
    运维: [
        { year: '0-2年', title: '初级运维工程师', salary: '10k-18k', skills: ['Linux', '脚本', '监控与部署'], icon: '🌱' },
        { year: '2-4年', title: '运维/DevOps工程师', salary: '18k-30k', skills: ['K8s', 'CI/CD', '云原生'], icon: '🌿' },
        { year: '4-7年', title: '高级运维/SRE', salary: '30k-50k', skills: ['稳定性架构', '成本优化', '团队带教'], icon: '🌳' },
        { year: '7年+', title: '运维总监/技术总监', salary: '50k+', skills: ['技术战略', '团队管理', '基础设施'], icon: '🏆' }
    ],
    测试: [
        { year: '0-2年', title: '初级测试工程师', salary: '8k-15k', skills: ['功能测试', '用例设计', '缺陷管理'], icon: '🌱' },
        { year: '2-4年', title: '测试/测试开发工程师', salary: '15k-28k', skills: ['自动化', '性能测试', '工具开发'], icon: '🌿' },
        { year: '4-7年', title: '高级测试/质量专家', salary: '28k-45k', skills: ['质量体系', '团队带教', '技术攻坚'], icon: '🌳' },
        { year: '7年+', title: '质量总监/技术总监', salary: '45k+', skills: ['质量战略', '团队管理', '效能提升'], icon: '🏆' }
    ]
};
function getPromotionStagesForJob(jobName) {
    const name = (jobName || '').trim();
    if (!name) return PROMOTION_STAGES_BY_JOB.default;
    const order = ['算法', '前端', '后端', '数据', '产品', '运维', '测试'];
    for (let i = 0; i < order.length; i++) {
        if (name.indexOf(order[i]) !== -1) return PROMOTION_STAGES_BY_JOB[order[i]];
    }
    return PROMOTION_STAGES_BY_JOB.default;
}

// 晋升路径（垂直图谱）静态拼接，不请求 career-path 接口
function getPromotionPath(jobName) {
    const core = (jobName || '').replace(/\(.*?\)/g, '').replace(/初级|中级|高级|资深|首席|实习/g, '').trim() || '岗位';
    return [
        { title: core + '实习生', year: '0-1年', salary: '5k-8k', requirements: ['基础理论', '辅助参与项目', '工具熟悉'] },
        { title: '初级' + core, year: '1-3年', salary: '8k-18k', requirements: ['独立完成基础任务', '熟悉业务', '团队协作'] },
        { title: core, year: '3-6年', salary: '18k-35k', requirements: ['负责核心模块', '方案设计', '跨团队协作'] },
        { title: '高级' + core, year: '6-10年', salary: '35k-55k', requirements: ['技术攻关', '指导初级成员', '架构设计'] },
        { title: '资深' + core + '/专家', year: '10年+', salary: '55k+', requirements: ['技术战略', '团队建设', '行业影响力'] }
    ];
}

// 优先使用预设晋升阶段（算法/前端/后端等），格式统一为 { title, year, salary } 供 renderCareerPath 使用
function getPromotionPathForDisplay(jobName) {
    const stages = getPromotionStagesForJob(jobName);
    if (!stages || stages.length === 0) return getPromotionPath(jobName);
    return stages.map(s => ({
        title: s.title || '',
        year: s.year || '',
        salary: s.salary || ''
    }));
}

// ══ 换岗路径 — 血缘图谱（来自 graph_template.html）════
// 布局坐标（百分比，相对画布宽高）
const layout = {
    center: { rx: 0.5, ry: 0.5 },
    pm: { rx: 0.5, ry: 0.1 },
    ds: { rx: 0.82, ry: 0.22 },
    mle: { rx: 0.82, ry: 0.72 },
    quant: { rx: 0.5, ry: 0.88 },
    res: { rx: 0.18, ry: 0.72 },
    arch: { rx: 0.18, ry: 0.22 },
};
// 卡片尺寸
const CARD = { center: { w: 136, h: 108 }, job: { w: 150, h: 172 } };

function buildGraph(dynamicNodes) {
    const wrap = document.getElementById('graphWrap');
    if (!wrap) return;
    const W = wrap.offsetWidth, H = wrap.offsetHeight;
    wrap.querySelectorAll('.g-node,.edge-lbl').forEach(e => e.remove());

    const pos = {};
    Object.keys(layout).forEach(id => {
        pos[id] = { x: layout[id].rx * W, y: layout[id].ry * H };
    });

    const svg = document.getElementById('svgLayer');
    if (!svg) return;
    let defs = `<defs>
  <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z" fill="#5e8c65"/>
  </marker>
  <marker id="arr-gold" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z" fill="#b8862a"/>
  </marker>
  <marker id="arr-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z" fill="#b94040"/>
  </marker>
  <marker id="arr-purple" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z" fill="#6aa571" opacity="0.6"/>
  </marker>
  <marker id="arr-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z" fill="#4a7350"/>
  </marker>
</defs>`;
    let paths = '';

    // 中心到各节点的连线（带箭头，终点缩短到卡片边缘）
    Object.keys(dynamicNodes).forEach(id => {
        if (id === 'center') return;
        const n = dynamicNodes[id];
        const p1 = pos['center'];
        const p2 = pos[id];
        if (!p1 || !p2) return;

        const color = n.match >= 80 ? '#5e8c65' : n.match >= 60 ? '#b8862a' : '#b94040';
        const arrId = n.match >= 80 ? 'arr-green' : n.match >= 60 ? 'arr-gold' : 'arr-red';
        const dash = n.match < 60 ? 'stroke-dasharray="7 4"'
            : n.match < 80 ? 'stroke-dasharray="10 3"'
            : '';

        // 把终点从卡片中心缩短到卡片边缘
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        const cardHalfW = 75;
        const cardHalfH = 86;
        const tW = Math.abs(ux) > 0.001 ? cardHalfW / Math.abs(ux) : Infinity;
        const tH = Math.abs(uy) > 0.001 ? cardHalfH / Math.abs(uy) : Infinity;
        const t = Math.min(tW, tH) + 6;

        const ex = p2.x + ux * t;
        const ey = p2.y + uy * t;

        const centerOffset = 68;
        const sx = p1.x - ux * centerOffset;
        const sy = p1.y - uy * centerOffset;

        const cpx = (sx + ex) / 2 + (ey - sy) * 0.15;
        const cpy = (sy + ey) / 2 - (ex - sx) * 0.15;

        paths += `<path
    d="M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}"
    fill="none"
    stroke="${color}"
    stroke-width="2"
    ${dash}
    opacity="0.85"
    marker-end="url(#${arrId})"
  />`;

        const lx = sx * 0.45 + ex * 0.55 + (ey - sy) * 0.08;
        const ly = sy * 0.45 + ey * 0.55 - (ex - sx) * 0.08;
        const lblEl = document.createElement('div');
        lblEl.className = 'edge-lbl';
        const matchLabel = n.match >= 80 ? '高' : n.match >= 60 ? '中' : '低';
        lblEl.textContent = `${n.match}% · ${matchLabel}`;
        lblEl.style.cssText = `left:${lx}px; top:${ly}px; color:${color}; border-color:${color}30;`;
        wrap.appendChild(lblEl);
    });

    const drawn = new Set();
    Object.keys(dynamicNodes).forEach(fromId => {
        if (fromId === 'center') return;
        const n = dynamicNodes[fromId];
        (n.transfers || []).forEach(toId => {
            const key = [fromId, toId].sort().join('-');
            if (drawn.has(key)) return;
            drawn.add(key);
            const p1 = pos[fromId], p2 = pos[toId];
            if (!p1 || !p2) return;
            const cpx = (p1.x + p2.x) / 2 + (p2.y - p1.y) * 0.2;
            const cpy = (p1.y + p2.y) / 2 - (p2.x - p1.x) * 0.2;
            paths += `<path d="M${p1.x},${p1.y} Q${cpx},${cpy} ${p2.x},${p2.y}"
        fill="none" stroke="#7c5cff" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.5"
        marker-end="url(#arr-blue)"/>`;
        });
    });

    svg.innerHTML = defs + `<style>@keyframes dashFlow{to{stroke-dashoffset:-20}}</style>` + paths;

    let delay = 0;
    Object.keys(dynamicNodes).forEach(id => {
        const n = dynamicNodes[id];
        const p = pos[id];
        if (!p) return;
        const el = document.createElement('div');
        el.className = 'g-node';
        el.style.animationDelay = (delay += 0.07) + 's';

        if (n.isCenter) {
            el.style.cssText = `left:${p.x - CARD.center.w / 2}px;top:${p.y - CARD.center.h / 2}px;animation-delay:0s`;
            el.innerHTML = `<div class="cn"><div class="cn-ico">${n.icon || '🤖'}</div><div class="cn-name">${(n.name || '当前岗位').replace(/</g, '&lt;')}</div><div class="cn-badge">当前岗位</div></div>`;
        } else {
            const diff_color = n.match >= 80 ? '#4a7350' : n.match >= 60 ? '#9c6d1f' : '#943333';
            const diff_bg = n.match >= 80 ? 'rgba(94,140,101,0.1)' : n.match >= 60 ? 'rgba(184,134,42,0.1)' : 'rgba(185,64,64,0.08)';
            const diff_bd = n.match >= 80 ? 'rgba(94,140,101,0.2)' : n.match >= 60 ? 'rgba(184,134,42,0.2)' : 'rgba(185,64,64,0.18)';
            el.style.cssText = `left:${p.x - CARD.job.w / 2}px;top:${p.y - CARD.job.h / 2}px;animation-delay:${delay}s;opacity:0`;
            const nameEsc = (n.name || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            const descEsc = (n.desc || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            const skillsEsc = (n.skills || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            el.innerHTML = `
        <div class="jn" style="border-color:${n.color}40">
          <div class="jn-top">
            <div class="jn-ico" style="background:${n.color}15">${n.icon || '💼'}</div>
            <div><div class="jn-name">${nameEsc}</div><div class="jn-sal">${(n.sal || '面议').replace(/</g, '&lt;')}</div></div>
          </div>
          <div class="jn-mr"><span class="jn-ml">匹配度</span><span class="jn-mv" style="color:${n.color}">${n.match}%</span></div>
          <div class="jn-bar-bg"><div class="jn-bar" style="width:${n.match}%;background:${n.color}"></div></div>
          <div class="jn-tags">
            <span class="jn-tag" style="background:${diff_bg};color:${diff_color};border:1px solid ${diff_bd}">难度${n.diff}</span>
            <span class="jn-tag" style="background:rgba(94,140,101,0.07);color:#4a7350;border:1px solid rgba(94,140,101,0.15)">⏱ ${(n.time || '').replace(/</g, '&lt;')}</span>
          </div>
          <div class="jn-skills"><em>可迁移：</em>${skillsEsc}</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:5px">${descEsc}</div>
        </div>`;
        }
        wrap.appendChild(el);
    });
}

function convertToGraphNodes(centerJobName, transferNodes) {
    const nodes = {
        center: { name: centerJobName, icon: '🤖', isCenter: true }
    };
    const layoutKeys = ['pm', 'ds', 'mle', 'quant', 'res', 'arch'];
    const list = (transferNodes || []).slice(0, 8);
    list.forEach((node, index) => {
        const key = layoutKeys[index] || node.id || `node${index}`;
        nodes[key] = {
            name: node.name,
            icon: node.icon || '💼',
            sal: node.salary || '面议',
            match: node.match_score || 0,
            color: '',
            desc: node.description || '',
            diff: node.difficulty || '中',
            time: node.transition_months || '',
            skills: node.transferable_skills || '',
            transfers: (node.kinship_edges || []).map((id) => layoutKeys[list.findIndex(n => n.id === id)] || id),
        };
    });
    // 匹配度分布：高(≥90%)、中(80-89%)、低(<80%) 每种至少一个红色
    const keys = Object.keys(nodes).filter(k => k !== 'center');
    const count = keys.length;
    if (count > 0) {
        keys.sort((a, b) => (nodes[b].match || 0) - (nodes[a].match || 0));
        let nGreen = Math.max(1, Math.ceil(count * 0.5));
        let nYellow = Math.max(1, Math.min(count - nGreen, Math.ceil(count * 0.35)));
        let nRed = Math.max(1, count - nGreen - nYellow);
        while (nGreen + nYellow + nRed > count && nGreen > 1) nGreen--;
        while (nGreen + nYellow + nRed > count && nYellow > 1) nYellow--;
        keys.forEach((key, i) => {
            let match;
            if (i < nGreen) match = 90 + (i % 10);
            else if (i < nGreen + nYellow) match = 80 + (i % 10);
            else match = 65 + (i % 15);
            nodes[key].match = match;
            nodes[key].color = match >= 80 ? '#5e8c65' : match >= 60 ? '#b8862a' : '#b94040';
        });
    }
    (transferNodes || []).forEach((node, index) => {
        if (index >= 6) {
            const angle = (2 * Math.PI * index / (transferNodes.length || 1)) - Math.PI / 2;
            layout[`node_extra_${index}`] = {
                rx: 0.5 + 0.35 * Math.cos(angle),
                ry: 0.5 + 0.35 * Math.sin(angle)
            };
        }
    });
    return nodes;
}

function showGraphError(wrap, msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#b94040';
    el.innerHTML = `<div>${msg}</div><div style="font-size:11px;color:#aab4cc">请检查 AI 服务是否启动，或查看 Console</div>`;
    wrap.appendChild(el);
}

async function loadTransferGraph(jobName) {
    const wrap = document.getElementById('graphWrap');
    if (!wrap) {
        console.error('找不到 #graphWrap，请检查 HTML 是否有 <div id="graphWrap">');
        return;
    }
    wrap.querySelectorAll('.g-node, .edge-lbl').forEach(e => e.remove());
    const svg = document.getElementById('svgLayer');
    if (svg) svg.innerHTML = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.id = '_graphLoading';
    loadingDiv.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#4a7350';
    loadingDiv.innerHTML = '<div class="graph-loading-spinner" style="margin:0 auto"></div><div style="font-size:14px;font-weight:500">Agent正在生成换岗路径图谱，请稍后...</div>';
    if (!document.getElementById('_spinStyle')) {
        const s = document.createElement('style');
        s.id = '_spinStyle';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }
    wrap.appendChild(loadingDiv);

    let buffer = '';
    try {
        const baseURL = (typeof API_CONFIG !== 'undefined')
            ? (API_CONFIG.assessmentBaseURL || API_CONFIG.jobProfilesBaseURL || 'http://localhost:5002/api/v1')
            : 'http://localhost:5002/api/v1';
        const url = baseURL.replace(/\/$/, '') + '/job/transfer-path';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_name: jobName })
        });
        if (!res.ok) throw new Error(`接口返回 HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value).split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') {
                    document.getElementById('_graphLoading')?.remove();
                    const clean = buffer.replace(/```json|```/g, '').trim();
                    const start = clean.indexOf('{');
                    const end = clean.lastIndexOf('}');
                    if (start === -1 || end === -1) {
                        showGraphError(wrap, '返回数据格式异常，请重试');
                        return;
                    }
                    try {
                        const data = JSON.parse(clean.slice(start, end + 1));
                        const graphNodes = convertToGraphNodes(data.center_job || jobName, data.transfer_nodes || []);
                        window._cachedGraphNodes = graphNodes;
                        setTimeout(() => buildGraph(graphNodes), 50);
                    } catch (e) {
                        console.error('JSON 解析失败，原始内容：', clean);
                        showGraphError(wrap, `JSON 解析失败: ${e.message}`);
                    }
                    return;
                }
                try { buffer += JSON.parse(payload).text; } catch (e) { /* 忽略非JSON行 */ }
            }
        }
    } catch (e) {
        document.getElementById('_graphLoading')?.remove();
        console.error('图谱请求失败:', e);
        showGraphError(wrap, `请求失败: ${e.message}`);
    }
}

// CSV原始岗位名 → 前端展示名 / 类别映射
const CSV_JOB_CATEGORIES = {
    'Java': { category: '后端开发', displayName: 'Java开发工程师' },
    '前端开发': { category: '前端开发', displayName: '前端开发工程师' },
    '测试工程师': { category: '测试质量', displayName: '测试工程师' },
    '软件测试': { category: '测试质量', displayName: '软件测试工程师' },
    'C/C++': { category: '系统开发', displayName: 'C/C++开发工程师' },
    '硬件测试': { category: '测试质量', displayName: '硬件测试工程师' },
    '质量管理/测试': { category: '测试质量', displayName: '质量管理工程师' },
    '实施工程师': { category: '实施运维', displayName: '实施工程师' },
    '技术支持工程师': { category: '实施运维', displayName: '技术支持工程师' },
    '科研人员': { category: '科研学术', displayName: '科研人员' },
    '项目经理/主管': { category: '项目管理', displayName: '项目经理' },
    '产品专员/助理': { category: '产品运营', displayName: '产品专员' },
    '销售运营': { category: '市场销售', displayName: '销售运营' },
    '总助/CEO助理/董事长助理': { category: '行政管理', displayName: 'CEO助理' },
    '质检员': { category: '质量管理', displayName: '质检员' },
    '运营助理/专员': { category: '产品运营', displayName: '运营专员' },
    '律师助理': { category: '法律服务', displayName: '律师助理' },
    '网络销售': { category: '市场销售', displayName: '网络销售' },
    'BD经理': { category: '市场销售', displayName: 'BD经理' },
    '猎头顾问': { category: '人力资源', displayName: '猎头顾问' },
    '律师': { category: '法律服务', displayName: '律师' },
    '招聘专员/助理': { category: '人力资源', displayName: '招聘专员' },
    '储备经理人': { category: '行政管理', displayName: '储备经理人' },
    '统计员': { category: '数据分析', displayName: '统计员' },
    '销售工程师': { category: '市场销售', displayName: '销售工程师' },
    '售后客服': { category: '客户服务', displayName: '售后客服' },
    '广告销售': { category: '市场销售', displayName: '广告销售' },
    '项目专员/助理': { category: '项目管理', displayName: '项目专员' },
    '风电工程师': { category: '新能源', displayName: '风电工程师' },
    '网络客服': { category: '客户服务', displayName: '网络客服' },
    '大客户代表': { category: '市场销售', displayName: '大客户代表' },
    '内容审核': { category: '内容运营', displayName: '内容审核专员' },
    '管培生/储备干部': { category: '行政管理', displayName: '管培生' },
    '社区运营': { category: '产品运营', displayName: '社区运营' },
    '销售助理': { category: '市场销售', displayName: '销售助理' },
    '储备干部': { category: '行政管理', displayName: '储备干部' },
    '电话销售': { category: '市场销售', displayName: '电话销售' },
    '游戏运营': { category: '产品运营', displayName: '游戏运营' },
    '商务专员': { category: '市场销售', displayName: '商务专员' },
    'APP推广': { category: '市场销售', displayName: 'APP推广' },
    '资料管理': { category: '行政管理', displayName: '资料管理员' },
    '档案管理': { category: '行政管理', displayName: '档案管理员' },
    '法务专员/助理': { category: '法律服务', displayName: '法务专员' },
    '培训师': { category: '人力资源', displayName: '培训师' },
    '英语翻译': { category: '语言服务', displayName: '英语翻译' },
    '电话客服': { category: '客户服务', displayName: '电话客服' },
    '游戏推广': { category: '市场销售', displayName: '游戏推广' },
    '咨询顾问': { category: '咨询服务', displayName: '咨询顾问' },
    '知识产权/专利代理': { category: '法律服务', displayName: '专利代理人' },
    '项目招投标': { category: '项目管理', displayName: '招投标专员' },
    '日语翻译': { category: '语言服务', displayName: '日语翻译' },
};

// 根据CSV原始名获取前端展示名
function getJobDisplayName(csvName) {
    return (CSV_JOB_CATEGORIES[csvName] || {}).displayName || csvName;
}

// 根据前端展示名/用户输入名，反查CSV原始岗位名（用于真实数据接口查询）
function getCsvJobName(displayNameOrInput) {
    if (!displayNameOrInput) return '';
    // 精确匹配CSV原始名
    if (CSV_JOB_CATEGORIES[displayNameOrInput]) return displayNameOrInput;
    // 反向查找displayName
    for (const [csvName, cfg] of Object.entries(CSV_JOB_CATEGORIES)) {
        if (cfg.displayName === displayNameOrInput) return csvName;
    }
    // 模糊匹配：CSV名或displayName包含输入词
    for (const [csvName, cfg] of Object.entries(CSV_JOB_CATEGORIES)) {
        if (
            displayNameOrInput.includes(csvName) ||
            csvName.includes(displayNameOrInput) ||
            displayNameOrInput.includes(cfg.displayName) ||
            cfg.displayName.includes(displayNameOrInput)
        ) {
            return csvName;
        }
    }
    return displayNameOrInput; // 无匹配，原样传给后端模糊搜索
}

// 学生端 HR 邀约卡片渲染；displayStatus 仅来自组件内存（pending/accepted/declined），不持久化
function renderInvitationCard(inv, displayStatus) {
    var status = (displayStatus || inv._displayStatus || 'pending').toLowerCase();
    var isPending = status === 'pending';
    var isAccepted = status === 'accepted';
    var isDeclined = status === 'declined' || status === 'rejected';

    // 初始：待响应角标 + 接受/拒绝按钮；接受后：绿色「已接受」标签；拒绝后：灰色「已拒绝」标签
    var statusBadge = isAccepted
        ? '<span style="background:#2d6a4f;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;">已接受</span>'
        : isDeclined
        ? '<span style="background:#888;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;">已拒绝</span>'
        : '<span style="background:#fff8ec;color:#b56a00;padding:4px 12px;border-radius:20px;font-size:12px;">待响应</span>';

    var invIdEsc = String(inv.invitationId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var actionBtns = '';
    if (isPending) {
        actionBtns = '<div style="display:flex;gap:8px;margin-left:auto;">'
            + '<button type="button" style="background:#2d6a4f;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:500;white-space:nowrap;cursor:pointer;" onclick="acceptInvitation(\'' + invIdEsc + '\')">接受</button>'
            + '<button type="button" style="background:transparent;color:#666;border:1px solid #999;padding:8px 20px;border-radius:8px;font-size:14px;white-space:nowrap;cursor:pointer;" onclick="rejectInvitation(\'' + invIdEsc + '\')">拒绝</button>'
            + '</div>';
    } else if (isAccepted) {
        actionBtns = '<div style="margin-left:auto;"><span style="background:#2d6a4f;color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:500;">已接受</span></div>';
    } else {
        actionBtns = '<div style="margin-left:auto;"><span style="background:#888;color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:500;">已拒绝</span></div>';
    }

    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    return '<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;">'
        + '<div style="display:flex;align-items:flex-start;">'
        + '<div style="flex:1;">'
        + '<h3 style="font-size:16px;font-weight:600;margin:0 0 4px;">' + esc(inv.targetJob) + '</h3>'
        + '<p style="color:#888;font-size:13px;margin:0 0 12px;">' + esc(inv.companyName) + ' · ' + esc(inv.hrName) + '</p>'
        + '<p style="color:#333;font-size:14px;margin:0 0 12px;">' + esc(inv.message) + '</p>'
        + '<p style="color:#aaa;font-size:12px;margin:0 0 12px;">发送时间：' + esc(inv.sentAt) + '</p>'
        + statusBadge
        + '</div>'
        + actionBtns
        + '</div>'
        + '</div>';
}

// 状态仅保存在组件内存，不持久化，刷新后恢复初始
function acceptInvitation(invitationId) {
    if (!invitationId) return;
    var app = window.app;
    if (app) {
        app._hrInvitationStates = app._hrInvitationStates || {};
        app._hrInvitationStates[invitationId] = 'accepted';
        if (typeof app.loadStudentInvitations === 'function') app.loadStudentInvitations();
    }
}

function rejectInvitation(invitationId) {
    if (!invitationId) return;
    var app = window.app;
    if (app) {
        app._hrInvitationStates = app._hrInvitationStates || {};
        app._hrInvitationStates[invitationId] = 'declined';
        if (typeof app.loadStudentInvitations === 'function') app.loadStudentInvitations();
    }
}

// 应用主类
class CareerPlanningApp {
    constructor() {
        this.currentPage = 'login';
        this.currentUser = null;
        this.currentAssessmentId = null;  // 3.1 返回，提交测评时使用
        this.currentReportId = null;       // 职业规划报告 ID
        this.currentReportData = null;     // 职业规划报告完整数据（用于编辑）
        this.trackingRecordsCache = {};    // 规划落地性跟踪：记录缓存
        this.trackingFailureRecord = null; // 当前正在复盘的记录
        this.trackingFunnelChart = null;   // 求职漏斗图表实例
        this.trackingSelectedRecordId = null;  // Tab2 当前选中的记录
        this.trackingSelectedFailureRecordId = null; // Tab3 当前选中的失败记录
        this.trackingOverviewSummary = null;
        this.trackingOverviewRecords = [];
        this.trackingReportsCache = {};   // report_id -> report
        this.trackingReportsByKey = {};  // "job||company" -> [report...]
        this.trackingFailureAnalysisCache = {}; // record_id -> { skill:[], resume:[], interview:[], raw, ts }
        this.profileCompleteness = 0;          // 个人档案完整度（用于侧边进度条）
        // 岗位画像流式请求状态（用于防止并发请求串流导致内容错乱、卡顿）
        this._jobProfileStreamController = null; // AbortController 实例
        this._jobProfileStreamReqId = 0;         // 递增请求编号，始终只接受最新一次点击的结果
        this._jobProfileLastPartialTs = 0;       // 上一次局部渲染时间戳，用于节流 DOM 更新

        // 「主动探索」展示方式：默认按岗位归类（减少重复岗位导致的翻页痛点）
        this.searchViewMode = 'grouped'; // grouped | all
        this.searchPage = 1;
        this.searchPageSizeAll = 21;     // 原逻辑：全部职位
        this.searchPageSizeGrouped = 5;  // 新逻辑：按岗位归类（每页更少，便于阅读）
        this.searchPageSize = this.searchPageSizeGrouped;
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

        // HR 登录表单提交
        document.getElementById('hrLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHrLogin();
        });

        // 登录标签切换
        document.getElementById('studentLoginTab')?.addEventListener('click', () => {
            document.getElementById('studentLoginTab').classList.add('active');
            document.getElementById('hrLoginTab').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('hrLoginForm').classList.add('hidden');
            document.getElementById('hrLoginForm').classList.remove('active');
        });

        // HR 登录标签切换
        document.getElementById('hrLoginTab')?.addEventListener('click', () => {
            document.getElementById('hrLoginTab').classList.add('active');
            document.getElementById('studentLoginTab').classList.remove('active');
            document.getElementById('hrLoginForm').classList.add('active');
            document.getElementById('hrLoginForm').classList.remove('hidden');
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('active');
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

        // 个人档案新布局：左侧 Tab 导航 + 右侧面板
        const profilePage = document.getElementById('profilePage');
        if (profilePage) {
            const tabs = profilePage.querySelectorAll('.sidebar .tab[data-tab]');
            const panels = profilePage.querySelectorAll('.panels .panel');
            const switchProfileTab = (name) => {
                tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
                panels.forEach(p => p.id === ('panel-' + name)
                    ? p.classList.add('active')
                    : p.classList.remove('active'));
            };
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const name = tab.dataset.tab;
                    if (name) switchProfileTab(name);
                });
            });
            // 右侧卡片上的快捷跳转
            profilePage.querySelectorAll('[data-jump-tab]')?.forEach(card => {
                card.addEventListener('click', () => {
                    const name = card.getAttribute('data-jump-tab');
                    if (name) switchProfileTab(name);
                });
            });

            // AI 解析简历：拖拽上传接入现有 handleResumeUpload
            const dropZone = document.getElementById('profileDropZone');
            if (dropZone) {
                ['dragenter', 'dragover'].forEach(evt => {
                    dropZone.addEventListener(evt, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dropZone.classList.add('dragover');
                    });
                });
                ['dragleave', 'dragend', 'drop'].forEach(evt => {
                    dropZone.addEventListener(evt, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (evt === 'drop') {
                            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                            if (file) {
                                this.handleResumeUpload(file);
                            }
                        }
                        dropZone.classList.remove('dragover');
                    });
                });
            }

            // 实习/项目删除按钮事件委托
            const internWrap = document.getElementById('internshipsContainer');
            if (internWrap) {
                internWrap.addEventListener('click', (e) => {
                    const btn = e.target.closest && e.target.closest('[data-remove-exp]');
                    if (btn) {
                        const item = btn.closest('.exp-item');
                        if (item) item.remove();
                    }
                });
            }
            const projWrap = document.getElementById('projectsContainer');
            if (projWrap) {
                projWrap.addEventListener('click', (e) => {
                    const btn = e.target.closest && e.target.closest('[data-remove-exp]');
                    if (btn) {
                        const item = btn.closest('.exp-item');
                        if (item) item.remove();
                    }
                });
            }
        }

        document.getElementById('addSkillCategory')?.addEventListener('click', () => {
            this.addSkillCategory();
        });
        document.getElementById('addInternship')?.addEventListener('click', () => {
            this.addInternship();
        });
        document.getElementById('addProject')?.addEventListener('click', () => {
            this.addProject();
        });

        document.getElementById('uploadResumeBtn')?.addEventListener('click', () => {
            document.getElementById('resumeUpload')?.click();
        });

        document.getElementById('resumeUpload')?.addEventListener('change', (e) => {
            const file = e.target && e.target.files && e.target.files[0];
            this.handleResumeUpload(file);
        });

        document.getElementById('resumeParseDoneBtn')?.addEventListener('click', () => {
            this._applyResumeParseResultAndClose();
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

        document.getElementById('btnExitAssessment')?.addEventListener('click', () => {
            this.exitAssessmentWithoutSubmit();
        });

        // 岗位匹配相关 Tab 切换
        document.querySelectorAll('#matchingPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = (e.currentTarget && e.currentTarget.dataset.tab) || e.target.dataset.tab;
                if (tab) this.switchTab(tab);
            });
        });
        // 智能推荐统计芯片点击（Mockup v2：stat-chip + .on）
        document.querySelectorAll('#matchingPage .stat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filter;
                if (filter) this.filterRec(filter, chip);
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

        // 主动探索：视图切换（默认按岗位归类）
        document.getElementById('searchViewGroupedBtn')?.addEventListener('click', () => this.setSearchViewMode('grouped'));
        document.getElementById('searchViewAllBtn')?.addEventListener('click', () => this.setSearchViewMode('all'));

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
        document.getElementById('cancelGenerateBtn')?.addEventListener('click', () => {
            const form = document.getElementById('reportPreferencesForm');
            if (form) form.classList.add('hidden');
        });
        document.getElementById('viewHistoryBtn')?.addEventListener('click', () => this.viewCareerReportHistory());
        
        // 加载职业规划报告历史信息
        this.loadReportHistoryInfo();
        document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
            document.getElementById('reportHistory')?.classList.add('hidden');
        });
        document.getElementById('closeAssessmentHistory')?.addEventListener('click', () => {
            document.getElementById('assessmentReportHistory')?.classList.add('hidden');
        });
        document.getElementById('reportBackBtn')?.addEventListener('click', () => this.showReportGenerateArea());
        document.getElementById('reportCheckCompletenessBtn')?.addEventListener('click', () => this.checkReportCompleteness());
        document.getElementById('reportEditBtn')?.addEventListener('click', () => this.openReportEditModal());
        document.getElementById('reportPolishBtn')?.addEventListener('click', () => this.polishCareerReport());
        document.getElementById('reportAgentBtn')?.addEventListener('click', () => this.openAgentModal());
        document.getElementById('agentSendBtn')?.addEventListener('click', () => this.sendAgentMessage());
        document.getElementById('agentChatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAgentMessage();
        });
        document.querySelectorAll('.quick-action-btn')?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
        document.getElementById('closeAgentModal')?.addEventListener('click', () => this.closeAgentModal());
        document.getElementById('reportAgentModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'reportAgentModal') this.closeAgentModal();
        });
        document.getElementById('reportExportBtn')?.addEventListener('click', () => this.exportCareerReport());
        document.getElementById('closeCompletenessModal')?.addEventListener('click', () => document.getElementById('reportCompletenessModal')?.classList.add('hidden'));
        document.getElementById('closeEditModal')?.addEventListener('click', () => document.getElementById('reportEditModal')?.classList.add('hidden'));
        document.getElementById('saveReportEditsBtn')?.addEventListener('click', () => this.saveReportEdits());
        document.getElementById('previewReportBtn')?.addEventListener('click', () => this.previewReportEdits());

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

        // 加载图谱：使用新界面（晋升路径 advanced_template + career-path-ai，转岗路径 relation-graph）
        document.getElementById('jobProfilePage')?.addEventListener('click', (e) => {
            if (e.target && e.target.closest && e.target.closest('#jobProfileGraphBtn')) {
                const jobName = (document.getElementById('graphJobName')?.value || '').trim();
                if (!jobName) {
                    this.showToast('请输入岗位名称', 'error');
                    return;
                }
                this.loadJobRelationGraphBySearch();
            }
        });

        // 关联图谱：输入时优先调用 /job/search（CSV 岗位搜索）下拉联想，与 career_graph_v2 指令一致
        const graphJobNameInput = document.getElementById('graphJobName');
        const graphSuggestionsEl = document.getElementById('graphJobSuggestions');
        if (graphJobNameInput) {
            let graphSearchDebounce = null;
            graphJobNameInput.addEventListener('input', () => {
                this.selectedGraphJobId = null;
                const keyword = graphJobNameInput.value.trim();
                clearTimeout(graphSearchDebounce);
                if (!keyword || keyword.length < 1) {
                    document.getElementById('searchDropdown')?.remove();
                    if (graphSuggestionsEl) { graphSuggestionsEl.classList.add('hidden'); graphSuggestionsEl.innerHTML = ''; }
                    return;
                }
                graphSearchDebounce = setTimeout(() => {
                    document.getElementById('searchDropdown')?.remove();
                    if (graphSuggestionsEl) { graphSuggestionsEl.classList.add('hidden'); graphSuggestionsEl.innerHTML = ''; }
                }, 280);
            });
            graphJobNameInput.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('searchDropdown')?.remove();
                    if (graphSuggestionsEl) graphSuggestionsEl.classList.add('hidden');
                }, 200);
            });
            graphJobNameInput.addEventListener('focus', () => {});
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#searchDropdown') && e.target !== graphJobNameInput) {
                document.getElementById('searchDropdown')?.remove();
            }
        });

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

        // 求职跟踪 5 Tab 切换
        document.querySelectorAll('#trackingPage .tracking-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = (e.currentTarget && e.currentTarget.dataset.tab) || e.target.dataset.tab;
                if (tab) this.switchTrackingTab(tab);
            });
        });

        // Tab1 创建：清空 / 确认创建（内联表单）
        document.getElementById('trackingCreateClear')?.addEventListener('click', () => this.clearTrackingCreateForm());
        document.getElementById('trackingCreateConfirm')?.addEventListener('click', () => this.handleCreateTrackingRecord());

        // Tab1 投递日期：统一展示 YYYY/MM/DD，底层仍用原生 date 保存 YYYY-MM-DD
        this._initTrackingApplyDateInput();

        // Tab2 更新进展：左侧列表委托、推进/淘汰/保存备注
        const trackingUpdateJobList = document.getElementById('trackingUpdateJobList');
        if (trackingUpdateJobList) {
            trackingUpdateJobList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest?.('.tracking-job-delete-btn');
                if (deleteBtn && deleteBtn.dataset.recordId) {
                    this.deleteTrackingJob(deleteBtn.dataset.recordId);
                    e.stopPropagation();
                    return;
                }
                const item = e.target.closest?.('.tracking-job-item');
                if (item && item.dataset.recordId) {
                    this.selectTrackingJob(item.dataset.recordId);
                }
            });
        }
        document.getElementById('trackingAdvanceBtn')?.addEventListener('click', () => this.trackingAdvanceStage());
        document.getElementById('trackingRejectBtn')?.addEventListener('click', () => this.trackingMarkRejected());
        document.getElementById('trackingSaveNoteBtn')?.addEventListener('click', () => this.trackingSaveNote());
        document.getElementById('trackingViewNoteBtn')?.addEventListener('click', () => this.openTrackingNoteModal());
        document.getElementById('trackingNoteModalClose')?.addEventListener('click', () => this.closeTrackingNoteModal());
        document.getElementById('trackingNoteModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'trackingNoteModal') this.closeTrackingNoteModal();
        });

        // Tab3 失败分析：失败列表委托、重新生成/查看完整分析/保存为报告
        const trackingFailList = document.getElementById('trackingFailList');
        if (trackingFailList) {
            trackingFailList.addEventListener('click', (e) => {
                const item = e.target.closest?.('.tracking-fail-item');
                if (item && item.dataset.recordId) this.selectTrackingFailure(item.dataset.recordId);
            });
        }
        document.getElementById('trackingRegenAnalysisBtn')?.addEventListener('click', () => this.trackingOpenFailureModalForRegen());
        document.getElementById('trackingViewFullAnalysisBtn')?.addEventListener('click', () => this.openTrackingFullAnalysisModal());
        document.getElementById('trackingSaveAsReportBtn')?.addEventListener('click', () => this.saveFailureAsReport());

        // 求职跟踪：更新进展弹窗（仍用于详细编辑）
        document.getElementById('trackingUpdateClose')?.addEventListener('click', () => this.closeTrackingUpdateModal());
        document.getElementById('trackingUpdateCancel')?.addEventListener('click', () => this.closeTrackingUpdateModal());
        document.getElementById('trackingUpdateConfirm')?.addEventListener('click', () => this.handleUpdateTrackingRecord());

        // 求职失败复盘弹窗
        document.getElementById('trackingFailureClose')?.addEventListener('click', () => this.closeTrackingFailureModal());
        document.getElementById('trackingFailureStartBtn')?.addEventListener('click', () => this.startFailureAnalysisForCurrentRecord());
        document.getElementById('trackingPlanFab')?.addEventListener('click', () => this.openTrackingPlanModal());
        document.getElementById('trackingPlanModalClose')?.addEventListener('click', () => this.closeTrackingPlanModal());
        document.getElementById('trackingPlanModal')?.addEventListener('click', (e) => { if (e.target && e.target.id === 'trackingPlanModal') this.closeTrackingPlanModal(); });
        document.getElementById('trackingPlanGenerateBtn')?.addEventListener('click', () => this.startTrackingPlanGenerate());

        // 查看完整分析弹窗
        document.getElementById('trackingFullAnalysisClose')?.addEventListener('click', () => this.closeTrackingFullAnalysisModal());
        document.getElementById('trackingFullAnalysisSaveBtn')?.addEventListener('click', () => {
            this.showToast('已保存到反馈报告列表', 'success');
            this.closeTrackingFullAnalysisModal();
        });
        document.getElementById('trackingFullAnalysisModal')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'trackingFullAnalysisModal') this.closeTrackingFullAnalysisModal();
        });

        // Tab5 报告列表：点击报告卡片显示详情
        const trackingReportsList = document.getElementById('trackingReportsList');
        if (trackingReportsList) {
            trackingReportsList.addEventListener('click', (e) => {
                const card = e.target.closest?.('.tracking-rpt-card');
                if (card && card.dataset.reportId) this.selectTrackingReport(card.dataset.reportId);
            });
        }

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
                e.stopPropagation();
                if (btn.classList.contains('card-btn-disabled')) return;
                const card = btn.closest('.main-card');
                if (card) {
                    const action = card.dataset.action;
                    if (action) this.navigateTo(action);
                }
            });
        });

        // 兜底：使用事件委托，确保首页卡片/按钮始终可跳转
        const dashboardEl = document.getElementById('dashboardPage');
        dashboardEl?.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || !target.closest) return;
            const btn = target.closest('.main-card .card-btn');
            const card = target.closest('.main-card[data-action]');
            // 仅处理点到按钮或卡片内部的点击
            if (!btn && !card) return;
            if (btn && btn.classList.contains('card-btn-disabled')) return;
            const action = card?.dataset?.action;
            if (action) this.navigateTo(action);
        });

        // 隐私设置相关
        document.getElementById('savePrivacySettings')?.addEventListener('click', () => {
            this.savePrivacySettings();
        });

        document.getElementById('refreshAccessLog')?.addEventListener('click', () => {
            this.loadAccessLogs();
        });

        document.getElementById('exportUserDataBtn')?.addEventListener('click', () => {
            this.exportUserData();
        });

        document.getElementById('deleteUserDataBtn')?.addEventListener('click', () => {
            this.deleteUserData();
        });

        // 简历生成相关
        document.getElementById('generateResumeBtn')?.addEventListener('click', () => {
            this.generateResume();
        });

        document.getElementById('exportResumeBtn')?.addEventListener('click', () => {
            this.exportResume();
        });

        document.getElementById('hrInviteRefreshBtn')?.addEventListener('click', () => {
            this.loadStudentInvitations();
        });

        // HR邀约页：Tab 切换
        document.querySelectorAll('.hr-invite-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var t = tab.dataset.tab;
                document.querySelectorAll('.hr-invite-tab').forEach(function (x) { x.classList.remove('active'); });
                document.getElementById('hrInviteTabInvitations').classList.toggle('active', t === 'invitations');
                document.getElementById('hrInviteTabReports').classList.toggle('active', t === 'reports');
                document.getElementById('hrInvitePanelInvitations').classList.toggle('hidden', t !== 'invitations');
                document.getElementById('hrInvitePanelReports').classList.toggle('hidden', t !== 'reports');
                if (t === 'reports' && window.app && typeof window.app.loadStudentEvaluationReports === 'function') {
                    window.app.loadStudentEvaluationReports();
                }
            });
        });
        document.getElementById('hrReportRefreshBtn')?.addEventListener('click', () => {
            this.loadStudentEvaluationReports();
        });
        document.getElementById('hrReportDetailClose')?.addEventListener('click', () => {
            this.closeReportDetailModal();
        });
        document.getElementById('hrReportDetailCloseFooter')?.addEventListener('click', () => {
            this.closeReportDetailModal();
        });
        document.getElementById('hrReportDetailModal')?.addEventListener('click', function (e) {
            if (e.target === this) window.app && window.app.closeReportDetailModal();
        });

        // 个人档案页：提交给HR
        document.getElementById('profileSubmitToHrBtn')?.addEventListener('click', () => {
            this.submitProfileToHr();
        });

        // 兜底：HR邀约页事件委托（避免页面初始不在 DOM 导致绑定失败）
        // 不删除原有绑定代码，仅增加全局委托，且只绑定一次
        if (!document.documentElement.dataset.hrInviteDelegated) {
            document.documentElement.dataset.hrInviteDelegated = '1';
            document.addEventListener('click', function (e) {
                const t = e && e.target;
                if (!t) return;

                const el = (t.closest && t.closest('#hrInviteTabInvitations, #hrInviteTabReports, #hrInviteRefreshBtn')) || null;
                const id = el ? el.id : t.id;

                if (id === 'hrInviteTabReports') {
                    // 激活报告tab
                    document.getElementById('hrInviteTabReports').style.borderBottom = '2px solid #2d6a4f';
                    document.getElementById('hrInviteTabReports').style.color = '#2d6a4f';
                    document.getElementById('hrInviteTabReports').style.fontWeight = '600';
                    // 取消邀请tab激活
                    document.getElementById('hrInviteTabInvitations').style.borderBottom = 'none';
                    document.getElementById('hrInviteTabInvitations').style.color = '#a0a098';
                    // 切换面板
                    document.getElementById('hrInvitePanelReports').classList.remove('hidden');
                    document.getElementById('hrInvitePanelInvitations').classList.add('hidden');
                    window.app.loadStudentEvaluationReports();
                }
                if (id === 'hrInviteTabInvitations') {
                    // 激活邀请tab
                    document.getElementById('hrInviteTabInvitations').style.borderBottom = '2px solid #2d6a4f';
                    document.getElementById('hrInviteTabInvitations').style.color = '#2d6a4f';
                    document.getElementById('hrInviteTabInvitations').style.fontWeight = '600';
                    // 取消报告tab激活
                    document.getElementById('hrInviteTabReports').style.borderBottom = 'none';
                    document.getElementById('hrInviteTabReports').style.color = '#a0a098';
                    // 切换面板
                    document.getElementById('hrInvitePanelInvitations').classList.remove('hidden');
                    document.getElementById('hrInvitePanelReports').classList.add('hidden');
                }

                if (id === 'hrInviteRefreshBtn') {
                    if (window.app && typeof window.app.loadStudentInvitations === 'function') {
                        window.app.loadStudentInvitations();
                    }
                }
            });
        }
    }

    // 显示页面
    showPage(pageId) {
        console.log('[showPage] 显示页面:', pageId);
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            console.log('[showPage] 页面已显示:', pageId);
        } else {
            console.error('[showPage] 页面元素不存在:', pageId);
        }
    }

    // 显示主应用（登录后）
    showMainApp() {
        console.log('[showMainApp] 开始显示主应用');
        // 移除登录态标记
        document.body.classList.remove('on-login-page');
        // 显示侧边栏
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.remove('hidden');
            navbar.style.display = 'flex';
        }
        console.log('[showMainApp] 导航栏已显示');
        this.updateUserInfo();
        console.log('[showMainApp] 用户信息已更新');
        this.navigateTo('dashboard');
        console.log('[showMainApp] 已导航到dashboard');
        this.loadDashboardData();
        // 兜底：确保navbar不被on-login-page隐藏，并初始化小智悬浮球
        setTimeout(() => {
            document.body.classList.remove('on-login-page');
            const nav = document.getElementById('navbar');
            if (nav) { nav.classList.remove('hidden'); nav.style.display = 'flex'; }
            // 确保 agentFab 存在（index.html 里已有时直接用，否则动态创建）
            if (!document.getElementById('agentFab')) {
                document.body.insertAdjacentHTML('beforeend',
                    '<div id="agentFab" style="position:fixed;right:32px;bottom:32px;width:52px;height:52px;border-radius:50%;background:#1c1c18;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;box-shadow:0 4px 16px rgba(0,0,0,0.25);font-size:22px;user-select:none;" title="智能体小智">🤖</div>'
                );
            }
            // 重置初始化标记，保证每次登录后都能重新绑定事件
            const fab = document.getElementById('agentFab');
            if (fab) delete fab.dataset.agentInitialized;
            initFloatingAgent();
        }, 300);
        console.log('[showMainApp] 数据加载完成');
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
        console.log('[navigateTo] 导航到页面:', page);
        // 更新导航高亮
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // 显示对应页面
        let pageId = page + 'Page';
        if (page === 'hrInvite') {
            pageId = 'hrInvitePage';
        }
        console.log('[navigateTo] 显示页面元素:', pageId);
        this.showPage(pageId);
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
            case 'tracking':
                await this.loadTrackingData();
                break;
            case 'report':
                this.showReportGenerateArea();
                break;
            case 'mockInterview':
                initMockInterviewModule();
                break;
            case 'privacy':
                await this.loadPrivacySettings();
                await this.loadAccessLogs();
                break;
            case 'resume':
                await this.loadStudentInvitations();
                break;
            case 'hrInvite':
                await this.loadStudentInvitations();
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
                console.log('[Login] 登录成功，准备保存用户信息');
                _storage.setItem('token', result.data.token);
                saveUserInfo(result.data);
                this.currentUser = result.data;
                console.log('[Login] 用户信息已保存，准备显示主应用');
                this.showToast('登录成功', 'success');
                this.showMainApp();
                console.log('[Login] 主应用显示完成');
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

    // 处理 HR 登录
    async handleHrLogin() {
        const usernameInput = document.getElementById('hrLoginUsername');
        const passwordInput = document.getElementById('hrLoginPassword');
        const usernameError = document.getElementById('hrLoginUsernameError');
        const passwordError = document.getElementById('hrLoginPasswordError');
        
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
            usernameError.textContent = '请输入 HR 账号';
            usernameError.classList.add('show');
            return;
        }

        if (!password) {
            passwordInput.classList.add('error');
            passwordError.textContent = '请输入密码';
            passwordError.classList.add('show');
            return;
        }

        this.showLoading('登录中...');

        try {
            const result = await api.post('/api/hr/login', {
                username,
                password
            });

            if (result.success) {
                _storage.setItem('token', result.data.token);
                saveUserInfo(result.data);
                this.currentUser = result.data;
                this.showToast('HR 登录成功', 'success');
                this.showMainApp();
            } else {
                this.showToast(result.msg || 'HR 登录失败', 'error');
            }
        } catch (e) {
            console.error('HR 登录异常:', e);
            this.showToast('HR 登录失败: ' + (e.message || '网络异常，请检查 mock 模式或后端服务'), 'error');
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
            _storage.setItem('token', result.data.token);
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
            if (result.data && result.data.avatar) loginResult.data.avatar = result.data.avatar;
            _storage.setItem('token', loginResult.data.token);
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
            // 清除所有用户相关的localStorage数据，包括历史记录
            clearUserInfo();
            if (userId) {
                // 清除该用户的所有历史记录key
                _storage.removeItem('report_history_' + userId);
                _storage.removeItem('last_assessment_report_id_' + userId);
            }
            this.currentUser = null;
            document.body.classList.add('on-login-page');
            document.getElementById('navbar').classList.add('hidden');
            document.getElementById('navbar').style.display = '';
            // 清空登录表单
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            this.showPage('loginPage');
            this.showToast('已退出登录', 'success');
        }
    }

    // 加载仪表板数据
    async loadDashboardData() {
        const userId = getCurrentUserId();
        if (!userId) return;

        let profileCompleteness = 0;
        let assessmentCompleted = false;
        let matchedCount = 0;

        const profileResult = await getProfile(userId);
        if (profileResult.success) {
            profileCompleteness = profileResult.data.profile_completeness || 0;
            this.profileCompleteness = profileCompleteness;
            this.updateProfileProgress(profileCompleteness);
        }
        assessmentCompleted = !!(this.currentUser && this.currentUser.assessment_completed)
            || !!this.hasHistoryReport();

        // 兜底：若本地无缓存但后端已有测评历史（常见于退出/换设备后），则视为已完成
        if (!assessmentCompleted) {
            try {
                const histRes = await getReportHistory(userId);
                const historyList = histRes.success && histRes.data
                    ? (histRes.data.list || (Array.isArray(histRes.data) ? histRes.data : []))
                    : [];
                if (historyList.length > 0) {
                    assessmentCompleted = true;
                    const latestId = historyList[0].report_id || historyList[0].reportId;
                    if (latestId) this.saveLastAssessmentReportId(latestId);
                    if (this.currentUser) {
                        this.currentUser.assessment_completed = true;
                        saveUserInfo(this.currentUser);
                    }
                }
            } catch (_) {
                // ignore
            }
        }
        // 与「岗位匹配」页 loadRecommendedJobs 一致：同参数 + 用返回列表长度（不用 total_count，避免与列表条数不一致）
        try {
            const matchingResult = await getRecommendedJobs(userId, 1, 36);
            if (matchingResult.success && matchingResult.data) {
                const list = (matchingResult.data.jobs ?? matchingResult.data.recommendations) || [];
                matchedCount = Array.isArray(list) ? list.length : 0;
            }
        } catch (_) {
            matchedCount = 0;
        }

        // 更新卡片状态
        const cards = document.querySelectorAll('#dashboardPage .main-card');
        if (cards[0]) {
            const badge = cards[0].querySelector('.status-badge');
            if (badge) {
                // 完整度100%显示"已完成"，否则显示"待完成"
                badge.textContent = profileCompleteness === 100 ? '已完成' : '待完成';
                badge.classList.toggle('status-done', profileCompleteness === 100);
                badge.classList.toggle('status-pending', profileCompleteness < 100);
            }
        }
        if (cards[1]) {
            const badge = cards[1].querySelector('.status-badge');
            if (badge) {
                badge.textContent = assessmentCompleted ? '已完成' : '未完成';
                badge.classList.toggle('status-done', assessmentCompleted);
                badge.classList.toggle('status-pending', !assessmentCompleted);
            }
            const btn = cards[1].querySelector('.card-btn');
            if (btn) {
                btn.classList.toggle('card-btn-secondary', !assessmentCompleted);
                btn.classList.toggle('card-btn-primary', assessmentCompleted);
                btn.classList.remove('card-btn-disabled');
                btn.innerHTML = assessmentCompleted
                    ? '查看报告<span class="btn-arrow">→</span>'
                    : '开始测评<span class="btn-arrow">→</span>';
            }
        }
        if (cards[2]) {
            const badge = cards[2].querySelector('.status-badge');
            if (badge) {
                badge.textContent = assessmentCompleted ? (matchedCount + ' 个匹配') : '完成测评后解锁';
                badge.classList.toggle('status-done', assessmentCompleted);
                badge.classList.toggle('status-pending', !assessmentCompleted);
            }
            cards[2].classList.toggle('progress-card-locked', !assessmentCompleted);
            const btn = cards[2].querySelector('.card-btn');
            if (btn) {
                btn.classList.toggle('card-btn-disabled', !assessmentCompleted);
                // 该按钮在 HTML 初始态带有 disabled，需要在解锁时显式移除
                btn.disabled = !assessmentCompleted;
                if (assessmentCompleted) btn.innerHTML = '查看匹配<span class="btn-arrow">→</span>';
            }
        }

        // 统计数字滚动动画
        setTimeout(() => this.animateHeroStats(), 400);
    }

    // Hero 统计数字进入视口计数动画
    animateHeroStats() {
        const stats = document.querySelectorAll('.hero-right .stat-card[data-count]');
        stats.forEach(card => {
            const numEl = card.querySelector('.stat-number');
            const target = parseInt(card.dataset.count, 10) || 0;
            const suffix = card.dataset.suffix || '';
            const duration = 1200;
            const startTime = performance.now();

            const step = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const val = Math.round(target * eased);
                if (numEl) numEl.textContent = val + suffix;
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
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

    // 更新个人档案侧边进度条
    updateProfileProgress(percent) {
        const p = Math.max(0, Math.min(100, Number(percent) || 0));
        const fill = document.getElementById('profileProgFill');
        const lbl = document.getElementById('profileProgLabel');
        if (fill) {
            fill.style.width = p + '%';
        }
        if (lbl) {
            lbl.textContent = `${p}% · ${p === 100 ? '档案已完善' : '继续完善档案'}`;
        }
        const avatar = document.getElementById('profileAvatar');
        if (avatar && this.currentUser) {
            const name = (this.currentUser.nickname || this.currentUser.username || '').trim();
            avatar.textContent = name ? name.charAt(0).toUpperCase() : 'U';
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
            const summaryInput = document.getElementById('profileSummary');

            if (basic.nickname !== undefined) nicknameInput.value = basic.nickname || '';
            if (basic.gender !== undefined) genderInput.value = basic.gender || '';
            if (basic.birth_date !== undefined) birthInput.value = this.formatDateForDisplay(basic.birth_date || '');
            if (basic.phone !== undefined) phoneInput.value = basic.phone || '';
            if (basic.email !== undefined) emailInput.value = basic.email || '';
            if (summaryInput && basic.summary !== undefined) summaryInput.value = basic.summary || '';
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

        this.renderSkillsSection(data.skills);
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
        const summaryInput = document.getElementById('profileSummary');
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
        if (summaryInput && basic.summary !== undefined) summaryInput.value = basic.summary || '';
        if (schoolInput) schoolInput.value = edu.school || '';
        if (majorInput) majorInput.value = edu.major || '';
        if (degreeInput) degreeInput.value = edu.degree || '';
        if (gradeInput) gradeInput.value = edu.grade || '';
        if (gradInput) gradInput.value = this.formatMonthForDisplay(edu.expected_graduation || '');
        if (gpaInput) gpaInput.value = edu.gpa || '';

        this.initDateInput();

        this.renderSkillsSection(skills);

        // 填充实习经历（class 与 collectInternships() 一致；addInternship 需容器内先有 .exp-item 模板，故清空前先克隆一条）
        const internships = profileData.internships || [];
        const internContainer = document.getElementById('internshipsContainer');
        if (internContainer && internships.length > 0) {
            const internTmpl = internContainer.querySelector('.exp-item');
            const internTmplClone = internTmpl ? internTmpl.cloneNode(true) : null;
            internContainer.querySelectorAll('.exp-item').forEach((el) => el.remove());
            if (internTmplClone) {
                internTmplClone.querySelectorAll('input').forEach((inp) => { inp.value = ''; });
                internContainer.appendChild(internTmplClone);
            }
            internships.forEach((intern, idx) => {
                if (idx > 0) this.addInternship();
                const items = internContainer.querySelectorAll('.exp-item');
                const item = items[items.length - 1];
                if (item) {
                    const companyEl = item.querySelector('.internship-company');
                    const positionEl = item.querySelector('.internship-position');
                    const timeInput = item.querySelector('.internship-time');
                    const descEl = item.querySelector('.internship-description');
                    if (companyEl) companyEl.value = intern.company || '';
                    if (positionEl) positionEl.value = intern.position || '';
                    if (timeInput) {
                        const start = intern.start_date || '';
                        const end = intern.end_date || '';
                        const dur = intern.duration || '';
                        if (start && end) timeInput.value = `${start} - ${end}`;
                        else if (start) timeInput.value = start;
                        else if (dur) timeInput.value = dur;
                        else timeInput.value = end || '';
                    }
                    if (descEl) descEl.value = intern.description || '';
                }
            });
        }

        // 填充项目经历（class 与 collectProjects() 一致；技术栈为 .project-tech-stack）
        const projects = profileData.projects || [];
        const projContainer = document.getElementById('projectsContainer');
        if (projContainer && projects.length > 0) {
            const projTmpl = projContainer.querySelector('.exp-item');
            const projTmplClone = projTmpl ? projTmpl.cloneNode(true) : null;
            projContainer.querySelectorAll('.exp-item').forEach((el) => el.remove());
            if (projTmplClone) {
                projTmplClone.querySelectorAll('input').forEach((inp) => { inp.value = ''; });
                projContainer.appendChild(projTmplClone);
            }
            projects.forEach((proj, idx) => {
                if (idx > 0) this.addProject();
                const items = projContainer.querySelectorAll('.exp-item');
                const item = items[items.length - 1];
                if (item) {
                    const nameInput = item.querySelector('.project-name');
                    const roleInput = item.querySelector('.project-role');
                    const timeInput = item.querySelector('.project-time');
                    const descInput = item.querySelector('.project-description');
                    const techInput = item.querySelector('.project-tech-stack');
                    if (nameInput) nameInput.value = proj.name || '';
                    if (roleInput) roleInput.value = proj.role || '';
                    if (timeInput) {
                        const start = proj.start_date || '';
                        const end = proj.end_date || '';
                        timeInput.value = end ? `${start} - ${end}` : start;
                    }
                    if (descInput) descInput.value = proj.description || '';
                    if (techInput) {
                        techInput.value = Array.isArray(proj.tech_stack)
                            ? proj.tech_stack.join(', ')
                            : (proj.tech_stack || '');
                    }
                }
            });
        }
    }

    // 渲染技能模块（带默认分类和标签）
    renderSkillsSection(skills) {
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        const toStr = (it) => (typeof it === 'string' ? it : (it && (it.name || it.skill || it.item || it.label))) || '';
        let list = Array.isArray(skills) ? skills : [];
        if (!list.length) {
            list = [
                { category: '编程语言', items: ['Python', 'Java', 'JavaScript', 'C++'] },
                { category: '框架与工具', items: ['React', 'Spring Boot', 'MySQL'] }
            ];
        }
        container.innerHTML = '';
        list.forEach(skill => {
            const div = document.createElement('div');
            div.className = 'skill-cat';
            const raw = Array.isArray(skill.items) ? skill.items : [];
            const items = raw.map(toStr).filter(Boolean);
            const tagsHtml = items.map(val => {
                const safe = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<span class="tag" data-value="${safe}">${safe} <span class="x">×</span></span>`;
            }).join('');
            div.innerHTML = `
                <div class="skill-cat-header">
                    <div class="skill-cat-name">${(skill.category || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                    <button type="button" class="btn btn-danger btn-sm" data-remove-cat>删除</button>
                </div>
                <div class="tags">${tagsHtml}</div>
                <input class="tag-input" type="text" placeholder="输入后按 Enter 添加…">
            `;
            container.appendChild(div);
        });
        this.initSkillTagInputs();
    }

    // 将简历解析结果转换为档案结构，便于直接填充表单（输出完整结构，用于覆盖模式）
    transformParsedResumeData(parsed) {
        if (!parsed || typeof parsed !== 'object') {
            return { basic_info: {}, education_info: {}, skills: [], internships: [], projects: [] };
        }
        const basicRaw = parsed.basic_info || {};
        const basic = {
            name: basicRaw.name || basicRaw.full_name || basicRaw.nickname || basicRaw['姓名'] || '',
            nickname: basicRaw.nickname || basicRaw.name || basicRaw.full_name || basicRaw['姓名'] || '',
            gender: basicRaw.gender || basicRaw.sex || basicRaw['性别'] || '',
            birth_date: basicRaw.birth_date || basicRaw.birthday || basicRaw.date_of_birth || basicRaw.dob || basicRaw['出生日期'] || '',
            phone: basicRaw.phone || basicRaw['电话'] || '',
            email: basicRaw.email || basicRaw['邮箱'] || '',
            summary: basicRaw.summary || basicRaw.intro || basicRaw.about || basicRaw['简介'] || ''
        };
        const eduList = parsed.education;
        const firstEdu = Array.isArray(eduList) ? (eduList[0] || {}) : (eduList && typeof eduList === 'object' ? eduList : {});
        const firstEduNorm = {
            school: firstEdu.school || firstEdu.school_name || firstEdu['学校'] || '',
            major: firstEdu.major || firstEdu['专业'] || '',
            degree: firstEdu.degree || firstEdu.education || firstEdu['学历'] || '',
            grade: firstEdu.grade || firstEdu['年级'] || '',
            expected_graduation: firstEdu.expected_graduation || firstEdu.graduation_date || firstEdu.end_date || firstEdu['毕业时间'] || '',
            gpa: firstEdu.gpa || firstEdu['GPA'] || ''
        };
        const skillsFromResume = Array.isArray(parsed.skills) ? parsed.skills : [];

        const profileData = {
            basic_info: {
                nickname: basic.nickname || basic.name || '',
                gender: basic.gender || '',
                birth_date: basic.birth_date || '',
                phone: basic.phone || '',
                email: basic.email || '',
                summary: basic.summary || ''
            },
            education_info: {
                school: firstEduNorm.school || '',
                major: firstEduNorm.major || '',
                degree: firstEduNorm.degree || '',
                grade: firstEduNorm.grade || '',
                expected_graduation: firstEduNorm.expected_graduation || '',
                gpa: firstEduNorm.gpa || ''
            },
            skills: [],
            internships: parsed.internships || [],
            projects: parsed.projects || []
        };

        if (skillsFromResume.length > 0) {
            const toItemStr = (it) => (typeof it === 'string' ? it : (it && (it.name || it.skill || it.item || it.label))) || '';
            const toItemsArray = (raw) => {
                if (!Array.isArray(raw)) return [];
                return raw.map(toItemStr).filter(Boolean);
            };
            const categoryLabel = (c) => {
                const v = (c || '').trim();
                const map = { '专业技能': '专业技能', 'professional skills': '专业技能', '编程语言': '编程语言', 'programming languages': '编程语言', '工具与框架': '工具与框架', '语言能力': '语言能力' };
                return map[v.toLowerCase()] || map[v] || v || '简历技能';
            };
            if (typeof skillsFromResume[0] === 'string') {
                profileData.skills.push({ category: '专业技能', items: skillsFromResume });
            } else {
                skillsFromResume.forEach(s => {
                    if (!s) return;
                    if (typeof s === 'string') {
                        profileData.skills.push({ category: '专业技能', items: [s] });
                    } else {
                        const category = categoryLabel(s.category || s.type);
                        const rawItems = Array.isArray(s.items) ? s.items : (s.name ? [s.name] : []);
                        const items = toItemsArray(rawItems);
                        if (items.length > 0) {
                            profileData.skills.push({ category, items });
                        }
                    }
                });
            }
        }

        const normIntern = (i) => {
            if (!i || typeof i !== 'object') return null;
            const company = (i.company || '').trim();
            const position = (i.position || i.role || '').trim();
            const start = (i.start_date || '').trim();
            const end = (i.end_date || '').trim();
            const dur = (i.duration || '').trim();
            let desc = (i.description || '').trim();
            if (!desc && Array.isArray(i.achievements) && i.achievements.length) {
                desc = i.achievements.map((a) => (typeof a === 'string' ? a : (a && a.text) || '')).filter(Boolean).join('；');
            }
            if (!company && !position && !start && !end && !dur && !desc) return null;
            return { company, position, start_date: start, end_date: end, duration: dur, description: desc };
        };
        const normProject = (p) => {
            if (!p || typeof p !== 'object') return null;
            const name = (p.name || p.title || '').trim();
            const role = (p.role || '').trim();
            const start = (p.start_date || '').trim();
            const end = (p.end_date || '').trim();
            let desc = (p.description || '').trim();
            let tech = p.tech_stack || p.techStack || [];
            if (typeof tech === 'string') {
                tech = tech.split(',').map((s) => s.trim()).filter(Boolean);
            }
            if (!Array.isArray(tech)) tech = [];
            if (!name && !role && !start && !end && !desc && !tech.length) return null;
            return { name, role, start_date: start, end_date: end, description: desc, tech_stack: tech };
        };
        profileData.internships = Array.isArray(parsed.internships)
            ? parsed.internships.map(normIntern).filter(Boolean)
            : [];
        profileData.projects = Array.isArray(parsed.projects)
            ? parsed.projects.map(normProject).filter(Boolean)
            : [];

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
                email: document.getElementById('email').value,
                summary: document.getElementById('profileSummary')?.value || ''
            },
            education_info: {
                school: document.getElementById('school').value,
                major: document.getElementById('major').value,
                degree: document.getElementById('degree').value,
                grade: document.getElementById('grade').value,
                expected_graduation: this.normalizeMonthForStorage(document.getElementById('expectedGraduation').value),
                gpa: document.getElementById('gpa').value
            },
            skills: this.collectSkills(),
            internships: this.collectInternships(),
            projects: this.collectProjects()
        };

        console.log('保存档案数据:', JSON.stringify(profileData, null, 2));

        this.showLoading();
        const result = await updateProfile(userId, profileData);
        this.hideLoading();

        console.log('保存结果:', result);

        if (result.success) {
            this.showToast('档案保存成功，正在重新生成能力画像…', 'success');
            const completeness = result.data.profile_completeness ?? result.data.profileCompleteness ?? 0;
            this.profileCompleteness = completeness;
            this.updateProfileProgress(completeness);
            const card = document.querySelector('#dashboardPage .main-card[data-action="profile"]');
            if (card) {
                const badge = card.querySelector('.status-badge');
                if (badge) {
                    // 完整度100%显示"已完成"，否则显示"待完成"（与首页loadDashboardData一致）
                    badge.textContent = completeness === 100 ? '已完成' : '待完成';
                    badge.classList.toggle('status-done', completeness === 100);
                    badge.classList.toggle('status-pending', completeness < 100);
                }
            }
            // 档案更新后重新生成能力画像，确保学生画像随简历和档案变化而更新
            aiGenerateAbilityProfile(userId, 'profile').then((res) => {
                if (res.success) {
                    this.showToast('能力画像已更新，岗位匹配将基于新档案', 'success');
                    // 能力画像更新后，推荐岗位数量可能变化，刷新首页数据
                    this.loadDashboardData();
                    
                    // 提示用户是否需要更新职业规划报告
                    setTimeout(() => {
                        if (confirm('您的个人信息已更新，能力画像也已重新生成。\n\n是否需要更新您的职业规划报告，使其与最新信息保持一致？')) {
                            // 跳转到职业规划报告页面
                            document.getElementById('nav-career-report')?.click();
                        }
                    }, 1500);
                }
            }).catch(() => {});
        } else {
            this.showToast(result.msg || '保存失败', 'error');
        }
    }

    // 收集技能数据
    collectSkills() {
        const skills = [];
        document.querySelectorAll('#skillsContainer .skill-cat').forEach(category => {
            const nameEl = category.querySelector('.skill-cat-name');
            const categoryName = nameEl ? nameEl.textContent.trim() : '';
            const items = [];
            category.querySelectorAll('.tag').forEach(tag => {
                const v = tag.getAttribute('data-value') || tag.textContent.replace(/×.*/, '').trim();
                if (v) items.push(v);
            });
            if (categoryName && items.length) {
                skills.push({ category: categoryName, items });
            }
        });
        return skills;
    }

    // 收集实习经历数据
    collectInternships() {
        const internships = [];
        document.querySelectorAll('.internship-item').forEach(item => {
            const company = item.querySelector('.internship-company').value;
            const position = item.querySelector('.internship-position').value;
            const time = item.querySelector('.internship-time')?.value || '';
            const description = item.querySelector('.internship-description').value;
            
            if (company || position || time || description) {
                internships.push({
                    company: company.trim(),
                    position: position.trim(),
                    // 为兼容后端结构，时间统一写入 start_date，end_date 置空
                    start_date: time.trim(),
                    end_date: '',
                    description: description.trim()
                });
            }
        });
        return internships;
    }

    // 收集项目经历数据
    collectProjects() {
        const projects = [];
        document.querySelectorAll('.project-item').forEach(item => {
            const name = item.querySelector('.project-name').value;
            const role = item.querySelector('.project-role').value;
            const time = item.querySelector('.project-time')?.value || '';
            const description = item.querySelector('.project-description').value;
            const techStack = item.querySelector('.project-tech-stack').value;
            
            if (name || role || time || description || techStack) {
                projects.push({
                    name: name.trim(),
                    role: role.trim(),
                    start_date: time.trim(),
                    end_date: '',
                    description: description.trim(),
                    tech_stack: techStack ? techStack.split(',').map(s => s.trim()).filter(s => s) : []
                });
            }
        });
        return projects;
    }

    // 添加技能分类（与 renderSkillCats 结构一致：含 skill-cat-header + 删除按钮）
    addSkillCategory() {
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        const name = prompt('请输入技能分类名称：');
        if (!name) return;
        const div = document.createElement('div');
        div.className = 'skill-cat';
        const safeName = String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        div.innerHTML = `
            <div class="skill-cat-header">
                <div class="skill-cat-name">${safeName}</div>
                <button type="button" class="btn btn-danger btn-sm" data-remove-cat>删除</button>
            </div>
            <div class="tags"></div>
            <input class="tag-input" type="text" placeholder="输入后按 Enter 添加…">
        `;
        container.appendChild(div);
        this.initSkillTagInputs();
    }

    // 绑定技能标签输入与删除事件
    initSkillTagInputs() {
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        container.querySelectorAll('.tag-input').forEach(input => {
            if (input._skillInited) return;
            input._skillInited = true;
            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const val = (input.value || '').trim();
                if (!val) return;
                const wrap = input.closest('.skill-cat');
                if (!wrap) return;
                const tags = wrap.querySelector('.tags');
                if (!tags) return;
                const safe = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const span = document.createElement('span');
                span.className = 'tag';
                span.setAttribute('data-value', safe);
                span.innerHTML = `${safe} <span class="x">×</span>`;
                tags.appendChild(span);
                input.value = '';
            });
        });
        // 删除标签
        if (!container._removeInited) {
            container._removeInited = true;
            container.addEventListener('click', (e) => {
                const x = e.target.closest && e.target.closest('.x');
                if (x) {
                    const tag = x.closest('.tag');
                    if (tag) tag.remove();
                    return;
                }
                const catBtn = e.target.closest && e.target.closest('[data-remove-cat]');
                if (catBtn) {
                    const cat = catBtn.closest('.skill-cat');
                    if (cat) cat.remove();
                }
            });
        }
    }

    // 添加实习经历
    addInternship() {
        const container = document.getElementById('internshipsContainer');
        if (!container) return;
        const tmpl = container.querySelector('.exp-item');
        if (tmpl) {
            const clone = tmpl.cloneNode(true);
            // 清空输入值
            clone.querySelectorAll('input').forEach(inp => inp.value = '');
            clone.querySelector('.exp-item-no').textContent = '实习';
            container.appendChild(clone);
        }
    }

    // 添加项目经历
    addProject() {
        const container = document.getElementById('projectsContainer');
        if (!container) return;
        const tmpl = container.querySelector('.exp-item');
        if (tmpl) {
            const clone = tmpl.cloneNode(true);
            clone.querySelectorAll('input').forEach(inp => inp.value = '');
            clone.querySelector('.exp-item-no').textContent = '项目';
            container.appendChild(clone);
        }
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
        
        if (data.internships && data.internships.length > 0) {
            html += `
                <div class="profile-section">
                    <h4>实习经历</h4>
                    <table class="profile-table">
            `;
            data.internships.forEach((intern, index) => {
                html += `<tr><th>实习 ${index + 1}</th><td></td></tr>`;
                html += `<tr><th>公司</th><td>${intern.company || '-'}</td></tr>`;
                html += `<tr><th>职位</th><td>${intern.position || '-'}</td></tr>`;
                html += `<tr><th>时间</th><td>${intern.start_date || '-'} 至 ${intern.end_date || '-'}</td></tr>`;
                html += `<tr><th>描述</th><td>${intern.description || '-'}</td></tr>`;
            });
            html += `
                    </table>
                </div>
            `;
        }
        
        if (data.projects && data.projects.length > 0) {
            html += `
                <div class="profile-section">
                    <h4>项目经历</h4>
                    <table class="profile-table">
            `;
            data.projects.forEach((project, index) => {
                html += `<tr><th>项目 ${index + 1}</th><td></td></tr>`;
                html += `<tr><th>名称</th><td>${project.name || '-'}</td></tr>`;
                html += `<tr><th>角色</th><td>${project.role || '-'}</td></tr>`;
                html += `<tr><th>时间</th><td>${project.start_date || '-'} 至 ${project.end_date || '-'}</td></tr>`;
                html += `<tr><th>描述</th><td>${project.description || '-'}</td></tr>`;
                if (project.tech_stack && project.tech_stack.length > 0) {
                    html += `<tr><th>技术栈</th><td>${project.tech_stack.join(', ')}</td></tr>`;
                }
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
            this.showResumeParseModal();
            this.advanceResumeParseStep(0, '');
            this._resumeParseStepTimer = setTimeout(() => {
                this._resumeParsePollSteps(userId, result.data.task_id);
            }, 0);
        } else {
            statusDiv.textContent = '上传失败: ' + result.msg;
            statusDiv.style.background = '#fee2e2';
        }
    }

    // ---------- AI 简历解析加载弹窗（由后端轮询驱动步骤，状态由 CSS pending/active/done 控制）----------
    showResumeParseModal() {
        const overlay = document.getElementById('resumeParseOverlay');
        const stepsWrap = document.getElementById('resumeParseSteps');
        const progressWrap = document.getElementById('resumeParseProgressWrap');
        const doneState = document.getElementById('resumeParseDoneState');
        if (!overlay) return;
        for (let i = 0; i <= 5; i++) {
            const step = document.getElementById('resumeStep' + i);
            if (step) {
                step.classList.remove('active', 'done');
                step.classList.add('pending');
            }
        }
        const fill = document.getElementById('resumeParseProgressFill');
        const num = document.getElementById('resumeParseProgressNum');
        if (fill) fill.style.width = '0%';
        if (num) num.textContent = '0%';
        if (stepsWrap) stepsWrap.style.display = '';
        if (progressWrap) progressWrap.style.display = '';
        if (doneState) doneState.style.display = 'none';
        overlay.classList.add('show');
    }

    advanceResumeParseStep(idx, _typingText) {
        const step = document.getElementById('resumeStep' + idx);
        if (step) {
            step.classList.remove('pending');
            step.classList.add('active');
        }
        const pct = Math.round(((idx + 1) / 6) * 100);
        const fill = document.getElementById('resumeParseProgressFill');
        const num = document.getElementById('resumeParseProgressNum');
        if (fill) fill.style.width = pct + '%';
        if (num) num.textContent = pct + '%';
        setTimeout(() => {
            if (step) {
                step.classList.remove('active');
                step.classList.add('done');
            }
        }, 800);
    }

    updateResumeParseProgress(pct) {
        const fill = document.getElementById('resumeParseProgressFill');
        const num = document.getElementById('resumeParseProgressNum');
        if (fill) fill.style.width = pct + '%';
        if (num) num.textContent = pct + '%';
    }

    showResumeParseDone(filledCount) {
        const stepsWrap = document.getElementById('resumeParseSteps');
        const progressWrap = document.getElementById('resumeParseProgressWrap');
        const doneState = document.getElementById('resumeParseDoneState');
        const countEl = document.getElementById('resumeParseDoneCount');
        const subEl = document.getElementById('resumeParseDoneSub');
        const btnEl = document.getElementById('resumeParseDoneBtn');
        if (stepsWrap) stepsWrap.style.display = 'none';
        if (progressWrap) progressWrap.style.display = 'none';
        if (doneState) doneState.style.display = 'flex';
        if (countEl) countEl.textContent = String(filledCount);
        if (subEl) {
            if (filledCount > 0) {
                subEl.innerHTML = '已填充 <span id="resumeParseDoneCount">' + filledCount + '</span> 项信息到档案';
                if (btnEl) btnEl.textContent = '查看填充结果';
            } else {
                subEl.innerHTML = '未识别到可填充项。请确认：① PDF 为可复制文本（非扫描件）；② 已启动 AI 服务（见启动指南）；或尝试重新上传。';
                if (btnEl) btnEl.textContent = '关闭';
            }
        }
    }

    hideResumeParseModal() {
        if (this._resumeParseStepTimer) {
            clearInterval(this._resumeParseStepTimer);
            this._resumeParseStepTimer = null;
        }
        const overlay = document.getElementById('resumeParseOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    _resumeParsePollSteps(userId, taskId, maxAttempts = 30) {
        const statusDiv = document.getElementById('uploadStatus');
        let attempts = 0;
        let stepIndex = 1;
        // 解析进度步骤的占位文案，避免展示具体姓名/学校示例
        const placeholders = ['', '解析中…', '解析中…', '解析中…', '解析中…'];
        this._resumeParseStepTimer = setInterval(() => {
            if (stepIndex <= 4) {
                this.advanceResumeParseStep(stepIndex, placeholders[stepIndex]);
                stepIndex++;
            }
        }, 2000);

        const poll = async () => {
            if (attempts >= maxAttempts) {
                if (this._resumeParseStepTimer) clearInterval(this._resumeParseStepTimer);
                this.hideResumeParseModal();
                if (statusDiv) {
                    statusDiv.textContent = '解析超时，请稍后查看';
                    statusDiv.style.background = '#fef3c7';
                }
                return;
            }
            const result = await getResumeParseResult(userId, taskId);
            if (!result.success || !result.data) {
                attempts++;
                setTimeout(poll, 3000);
                return;
            }
            if (result.data.status === 'completed') {
                if (this._resumeParseStepTimer) clearInterval(this._resumeParseStepTimer);
                while (stepIndex <= 4) {
                    this.advanceResumeParseStep(stepIndex, placeholders[stepIndex]);
                    stepIndex++;
                }
                this.advanceResumeParseStep(5, '生成中…');
                let parsedData = result.data.parsed_data || result.data.profile || result.data.data?.parsed_data || null;
                if (!parsedData && result.data && (result.data.basic_info || result.data.education || result.data.skills)) {
                    parsedData = result.data;
                }
                const filledCount = this._countParsedFields(parsedData);
                this._resumeParseLastResult = { parsedData, userId };
                // 第 5 步「填充档案字段」：解析完成后立即自动写入档案，使「自动写入所有信息」真正生效
                const hasValidData = parsedData && filledCount > 0;
                if (hasValidData) {
                    try {
                        const profileData = this.transformParsedResumeData(parsedData);
                        this.fillProfileFormFromResume(profileData);
                        this.saveProfile().then(() => {
                            this.showToast('档案已自动填充并保存', 'success');
                            aiGenerateAbilityProfile(userId, 'profile').then((res) => {
                                if (res.success) this.showToast('能力画像已更新', 'success');
                            }).catch(() => {});
                        }).catch((e) => {
                            console.error('自动保存档案失败:', e);
                            this.showToast('档案已填充，保存失败请稍后在个人档案页重试', 'warning');
                        });
                    } catch (e) {
                        console.error('自动填充档案失败:', e);
                        this.showToast('填充失败: ' + (e.message || '未知错误'), 'error');
                    }
                }
                setTimeout(() => this.showResumeParseDone(filledCount), 1000);
                if (statusDiv) {
                    statusDiv.textContent = hasValidData ? '解析完成！已自动写入档案，可点击弹窗内按钮查看' : '解析完成！请点击弹窗内按钮查看填充结果';
                    statusDiv.style.background = '#dcfce7';
                }
                return;
            }
            if (result.data.status === 'failed') {
                if (this._resumeParseStepTimer) clearInterval(this._resumeParseStepTimer);
                this.hideResumeParseModal();
                if (statusDiv) {
                    statusDiv.textContent = '解析失败，请重试';
                    statusDiv.style.background = '#fee2e2';
                }
                return;
            }
            attempts++;
            setTimeout(poll, 3000);
        };
        poll();
    }

    _countParsedFields(parsedData) {
        if (!parsedData || typeof parsedData !== 'object') return 0;
        let n = 0;
        if (parsedData.basic_info && typeof parsedData.basic_info === 'object') {
            for (const k of Object.keys(parsedData.basic_info)) {
                const v = parsedData.basic_info[k];
                if (v != null && String(v).trim() !== '') n++;
            }
        }
        const edu = parsedData.education;
        if (Array.isArray(edu)) n += edu.length; else if (edu && typeof edu === 'object' && (edu.school || edu.school_name || edu.major)) n += 1;
        if (Array.isArray(parsedData.skills)) n += parsedData.skills.length;
        if (Array.isArray(parsedData.internships)) n += parsedData.internships.length;
        if (Array.isArray(parsedData.projects)) n += parsedData.projects.length;
        return n;
    }

    _applyResumeParseResultAndClose() {
        const r = this._resumeParseLastResult;
        this._resumeParseLastResult = null;
        this.hideResumeParseModal();
        const fileInput = document.getElementById('resumeUpload');
        if (fileInput) fileInput.value = '';
        if (!r || !r.parsedData) {
            this.loadDashboardData();
            return;
        }
        const parsedData = r.parsedData;
        const hasValidData = this._countParsedFields(parsedData) > 0;
        if (hasValidData) {
            try {
                const profileData = this.transformParsedResumeData(parsedData);
                this.fillProfileFormFromResume(profileData);
                // 档案已在轮询到 completed 且 fill 之后由 _resumeParsePollSteps 中 saveProfile 持久化；此处仅导航展示
                this.showToast('已打开个人档案，可核对实习/项目等信息', 'success');
                // 切换到档案页并打开「基本信息」，让用户看到已填充内容
                this.showPage('profilePage');
                const profilePage = document.getElementById('profilePage');
                if (profilePage) {
                    const basicTab = profilePage.querySelector('.tab[data-tab="basic"]');
                    if (basicTab) basicTab.click();
                }
                this.loadDashboardData();
            } catch (e) {
                console.error('应用简历解析结果到表单时出错:', e);
                this.showToast('填充失败: ' + (e.message || '未知错误'), 'error');
                this.loadDashboardData();
            }
        } else {
            this.showToast('简历解析未提取到有效信息，请检查PDF是否为可复制文本型', 'warning');
            this.loadDashboardData();
        }
    }

    // 轮询简历解析结果（无弹窗时使用，如直接调用）
    async pollResumeParseResult(userId, taskId, maxAttempts = 30) {
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
                    
                    const parsedData = result.data.parsed_data || result.data.profile || null;
                    const hasValidData = parsedData && this._countParsedFields(parsedData) > 0;

                    if (hasValidData) {
                        try {
                            const profileData = this.transformParsedResumeData(parsedData);
                            this.fillProfileFormFromResume(profileData);
                            await this.saveProfile();
                            this.showToast('简历解析完成，档案已保存，正在重新生成能力画像…', 'success');
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
        if (userId && reportId) _storage.setItem('last_assessment_report_id_' + userId, reportId);
    }

    // 将单条测评报告追加到本地历史记录（用于历史报告列表展示与 Mock 模式）
    appendAssessmentReportHistory(reportId, created_at, extra = {}) {
        const userId = getCurrentUserId();
        if (!userId || !reportId) return;
        const key = 'report_history_' + userId;
        let list = [];
        try {
            const raw = _storage.getItem(key);
            if (raw) list = JSON.parse(raw);
            if (!Array.isArray(list)) list = [];
        } catch (_) {}
        const created = created_at || new Date().toISOString();
        const entry = { report_id: reportId, created_at: created, ...extra };
        const exists = list.some(item => (item.report_id || item.id) === reportId);
        if (!exists) list.unshift(entry);
        try {
            _storage.setItem(key, JSON.stringify(list));
        } catch (_) {}
    }

    // 恢复：读取当前用户最近一次测评报告 ID
    getLastAssessmentReportId() {
        const userId = getCurrentUserId();
        return userId ? _storage.getItem('last_assessment_report_id_' + userId) : null;
    }

    // 是否有历史报告（兼容 last_assessment_report_id_ 与 report_history_ 两种 key）
    hasHistoryReport() {
        const id1 = this.getLastAssessmentReportId();
        if (id1) return true;
        const userId = getCurrentUserId();
        if (!userId) return false;
        const raw = _storage.getItem('report_history_' + userId);
        if (!raw) return false;
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.length > 0 : !!raw;
        } catch (_) {
            return !!raw;
        }
    }

    // 加载职业测评数据（仅问卷/入口，测评报告在 assessmentReportWrap 内展示，不跳转职业规划报告页）
    async loadAssessmentData() {
        const userId = getCurrentUserId();
        if (!userId) return;

        this.hideAssessmentReportView();

        const savedReportId = this.getLastAssessmentReportId();
        if (savedReportId) this.currentReportId = savedReportId;

        if (this.hasHistoryReport() && this.currentReportId) {
            await this.showAssessmentWelcomeWithHistory();
            return;
        }

        await this.fetchAndShowQuestionnaire();
    }

    // 显示测评报告视图（隐藏问卷区，显示 assessmentReportWrap）
    showAssessmentReportView() {
        const q = document.getElementById('assessmentQuestionnaireSection');
        const wrap = document.getElementById('assessmentReportWrap');
        if (q) q.classList.add('hidden');
        if (wrap) wrap.classList.remove('hidden');
        // 仅绑定一次：返回职业测评初始界面
        if (!this._assessmentFooterBound) {
            document.getElementById('btnBackToAssessment')?.addEventListener('click', () => this.loadAssessmentData());
            this._assessmentFooterBound = true;
        }
    }

    // 隐藏测评报告视图（显示问卷区，隐藏 assessmentReportWrap）
    hideAssessmentReportView() {
        const q = document.getElementById('assessmentQuestionnaireSection');
        const wrap = document.getElementById('assessmentReportWrap');
        if (q) q.classList.remove('hidden');
        if (wrap) wrap.classList.add('hidden');
    }

    // 根据测评报告数据计算综合能力得分（满分 100）：仅依据能力详细分析中的各项得分，等权平均
    computeComprehensiveAbilityScore(data) {
        if (!data || typeof data !== 'object') return null;
        const ability = data.ability_analysis || {};
        const strengths = ability.strengths || [];
        const areas = ability.areas_to_improve || [];
        const allAbilitiesRaw = strengths.concat(areas);
        const uniqueAbilities = [...new Map(allAbilitiesRaw.map(a => [a.ability || a.name || '', a])).values()].filter(a => a.ability || a.name);
        const scores = [];
        uniqueAbilities.forEach(a => {
            if (a && (a.score != null && Number.isFinite(Number(a.score)))) {
                const v = Number(a.score);
                scores.push(Math.max(0, Math.min(100, v)));
            }
        });
        if (scores.length === 0) return null;
        const sum = scores.reduce((a, b) => a + b, 0);
        return Math.round(sum / scores.length);
    }

    // 从报告或本地缓存获取「完成题目」数量
    getCompletedQuestionsCount(reportData) {
        if (reportData && reportData.total_questions != null && Number.isFinite(Number(reportData.total_questions)))
            return Number(reportData.total_questions);
        if (reportData && Array.isArray(reportData.dimensions)) {
            const n = reportData.dimensions.reduce((acc, d) => acc + (Array.isArray(d.questions) ? d.questions.length : 0), 0);
            if (n > 0) return n;
        }
        const userId = getCurrentUserId();
        if (userId) {
            const saved = _storage.getItem('last_assessment_total_questions_' + userId);
            if (saved) return parseInt(saved, 10) || null;
        }
        return 20;
    }

    // 有历史报告时展示的入口（参考 assessment_status 设计：完成题目 20 道、能力详细分析得分等权、三按钮）
    async showAssessmentWelcomeWithHistory() {
        const container = document.getElementById('questionnaireContainer');
        const actionsEl = document.getElementById('assessmentActions');
        if (actionsEl) actionsEl.classList.add('hidden');
        let latestDate = '—';
        let abilityAvg = '—';
        let questionsText = '20 道';
        let historyCount = 0;
        const userId = getCurrentUserId();
        if (userId) {
            try {
                // 先拉取历史列表（后端返回 data 为数组或 data.list）
                const histRes = await getReportHistory(userId);
                const historyList = histRes.success && histRes.data
                    ? (histRes.data.list || (Array.isArray(histRes.data) ? histRes.data : []))
                    : [];
                historyCount = historyList.length;
                // 若无当前报告 ID 但有历史，用最新一条作为「当前报告」
                if (historyList.length > 0 && !this.currentReportId) {
                    this.currentReportId = historyList[0].report_id || historyList[0].reportId;
                }
                // 用历史最新一条的 created_at 作为「最近测评」兜底
                if (historyList.length > 0 && (historyList[0].created_at || historyList[0].createdAt)) {
                    const raw = historyList[0].created_at || historyList[0].createdAt;
                    latestDate = this.formatDateTime(raw).replace(/\s*\d{2}:\d{2}$/, '').trim() || '—';
                }
                const reportIdToFetch = this.currentReportId;
                if (reportIdToFetch) {
                    const reportRes = await getAssessmentReport(userId, reportIdToFetch);
                if (reportRes.success && reportRes.data && reportRes.data.status === 'completed') {
                    const d = reportRes.data;
                        if (d.created_at || d.assessment_date) {
                            latestDate = this.formatDateTime(d.created_at || d.assessment_date).replace(/\s*\d{2}:\d{2}$/, '').trim() || '—';
                        }
                    const aa = d.ability_analysis || {};
                    const list = (aa.strengths || []).concat(aa.areas_to_improve || []);
                    if (list.length > 0) {
                            const sum = list.reduce((acc, x) => acc + (x && (x.score != null) ? Number(x.score) : 0), 0);
                            if (sum > 0 || list.some(x => x && (x.score != null))) {
                        abilityAvg = Math.round(sum / list.length) + ' 分';
                    }
                }
                        if (abilityAvg === '—') {
                            const computed = this.computeComprehensiveAbilityScore(d);
                            if (computed != null) abilityAvg = computed + ' 分';
                        }
                        const qCount = this.getCompletedQuestionsCount(d);
                        questionsText = (qCount != null ? qCount : 20) + ' 道';
                    }
                }
            } catch (e) {}
        }
        container.innerHTML = `
            <div class="assessment-welcome-card assessment-welcome-card-new">
                <div class="assessment-welcome-illus-wrap">
                    <span class="assessment-welcome-illus-circle"><span class="assessment-welcome-illus-check">✓</span></span>
                </div>
                <p class="assessment-welcome-title">您已有测评报告，可查看最新报告或重新测评。</p>
                <p class="assessment-welcome-desc">系统已根据您的测评结果生成个性化职业规划报告，您可以查看最新报告，或重新作答以获取更新的分析结果。</p>
                <div class="assessment-welcome-meta">
                    <div class="assessment-meta-item"><span class="assessment-meta-label">最近测评</span><span class="assessment-meta-val">${latestDate}</span></div>
                    <div class="assessment-meta-item"><span class="assessment-meta-label">完成题目</span><span class="assessment-meta-val assessment-meta-accent">${questionsText}</span></div>
                    <div class="assessment-meta-item"><span class="assessment-meta-label">能力详细分析得分</span><span class="assessment-meta-val assessment-meta-green">${abilityAvg}</span></div>
                    <div class="assessment-meta-item"><span class="assessment-meta-label">历史报告</span><span class="assessment-meta-val">${historyCount} 份</span></div>
                </div>
                <div class="assessment-welcome-actions">
                    <button type="button" id="btnViewLatestReport" class="btn-assessment-primary">查看最新报告</button>
                    <button type="button" id="btnViewAssessmentHistory" class="btn-assessment-secondary">查看历史报告</button>
                    <button type="button" id="btnRetakeAssessment" class="btn-assessment-secondary">重新测评</button>
                </div>
            </div>
        `;
        document.getElementById('btnViewLatestReport')?.addEventListener('click', () => {
            this.showAssessmentReportOnAssessmentPage(this.currentReportId);
        });
        document.getElementById('btnViewAssessmentHistory')?.addEventListener('click', () => {
            this.viewAssessmentReportHistory();
        });
        document.getElementById('btnRetakeAssessment')?.addEventListener('click', () => {
            this.fetchAndShowQuestionnaire();
        });
    }

    // 查看测评历史报告列表（仅测评模块，调用 getReportHistory，与职业规划 7.7 分离）
    async viewAssessmentReportHistory() {
        const userId = getCurrentUserId();
        const historyDiv = document.getElementById('assessmentReportHistory');
        const listDiv = document.getElementById('assessmentHistoryList');
        if (!historyDiv || !listDiv) return;
        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }
        historyDiv.classList.remove('hidden');
        listDiv.innerHTML = '<div class="loading-message">加载测评历史中...</div>';
        try {
            let result = await getReportHistory(userId);
            let list = result.success && result.data
                ? (result.data.list || (Array.isArray(result.data) ? result.data : []))
                : [];
            // 历史记录仅展示后端真实存在的测评报告，不再从本地“最近一次报告”自动造一条历史
            if (list.length > 0) {
                this.renderAssessmentReportHistory(list);
                this.showToast('已加载 ' + list.length + ' 条测评历史报告', 'success');
            } else {
                listDiv.innerHTML = '<div class="hint-text">暂无测评历史报告</div>';
            }
        } catch (e) {
            listDiv.innerHTML = '<div class="hint-text">加载失败，请稍后重试</div>';
        }
    }

    // 渲染测评历史报告列表（仅测评报告，每项点击后在本页展示该报告）
    renderAssessmentReportHistory(reports) {
        const listDiv = document.getElementById('assessmentHistoryList');
        if (!listDiv) return;
        listDiv.innerHTML = '';
        const historyDiv = document.getElementById('assessmentReportHistory');
        reports.forEach(report => {
            const reportId = report.report_id || report.id;
            if (!reportId) return;
            const item = document.createElement('div');
            item.className = 'career-history-item';
            item.innerHTML = `
                <div class="history-item-main">
                    <div class="history-item-title">职业测评报告</div>
                    <div class="history-item-meta">${this.formatDateTime(report.created_at || report.assessment_date)}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                this.showAssessmentReportOnAssessmentPage(reportId);
                historyDiv?.classList.add('hidden');
            });
            listDiv.appendChild(item);
        });
    }

    // 在职业测评页内加载并展示测评报告（仅 3.3 测评报告，不展示职业规划报告，不跳转职业规划页）
    async showAssessmentReportOnAssessmentPage(reportId) {
        const contentEl = document.getElementById('assessmentReportContent');
        if (!contentEl) return;
        contentEl.innerHTML = '<div class="loading-message">加载报告中...</div>';
        this.showAssessmentReportView();
        const userId = getCurrentUserId();
        if (!userId) {
            contentEl.innerHTML = '<div class="hint-text">请先登录</div>';
            return;
        }
        const result = await getAssessmentReport(userId, reportId);
        if (result.success && result.data) {
            if (result.data.status === 'completed') {
            this.currentReportId = reportId;
                try {
                    sessionStorage.setItem('print_report_' + reportId, JSON.stringify(result.data));
                } catch (e) { /* ignore */ }
            this.renderReportContent(result.data, contentEl);
            document.getElementById('btnGoToCareerPlan')?.addEventListener('click', () => {
                this.navigateTo('report');
            });
                return;
            }
            if (result.data.status === 'processing') {
                contentEl.innerHTML = '<div class="hint-text">报告生成中，请稍候（约 30–60 秒）</div><button type="button" class="btn-secondary" id="btnRefreshReport">刷新</button>';
                document.getElementById('btnRefreshReport')?.addEventListener('click', () => this.showAssessmentReportOnAssessmentPage(reportId));
                return;
            }
            if (result.data.status === 'failed') {
                contentEl.innerHTML = '<div class="hint-text">报告生成失败: ' + (result.data.error || '未知错误') + '</div>';
                return;
            }
        }
        contentEl.innerHTML = '<div class="hint-text">加载失败' + (result && result.msg ? ': ' + result.msg : '，请确认 AI 测评服务 (http://localhost:5002) 已启动') + '</div>';
    }

    // 不想测评、返回：有历史报告则回到欢迎卡，否则显示退出提示与「开始测评」
    exitAssessmentWithoutSubmit() {
        const container = document.getElementById('questionnaireContainer');
        const actionsEl = document.getElementById('assessmentActions');
        if (this.hasHistoryReport() && this.currentReportId) {
            if (actionsEl) actionsEl.classList.add('hidden');
            this.showAssessmentWelcomeWithHistory();
            return;
        }
        if (actionsEl) actionsEl.classList.add('hidden');
        const section = document.getElementById('assessmentQuestionnaireSection');
        const tagEl = section?.querySelector('.job-profile-tag');
        const titleRowEl = section?.querySelector('.page-title-row');
        const subtitleEl = section?.querySelector('.page-subtitle');
        if (tagEl) tagEl.classList.remove('hidden');
        if (titleRowEl) titleRowEl.classList.remove('hidden');
        if (subtitleEl) subtitleEl.classList.remove('hidden');
        container.innerHTML = `
            <div class="assessment-exit-card">
                <p class="assessment-exit-text">您已退出问卷，作答未保存。</p>
                <button type="button" id="btnStartAssessmentAgain" class="btn-primary">开始测评</button>
            </div>
        `;
        document.getElementById('btnStartAssessmentAgain')?.addEventListener('click', () => {
            this.fetchAndShowQuestionnaire();
        });
    }

    // 拉取问卷并显示（用于首次进入或点击「重新测评」后）
    async fetchAndShowQuestionnaire() {
        const container = document.getElementById('questionnaireContainer');
        const userId = getCurrentUserId();
        if (!userId) {
            if (container) container.innerHTML = '<div class="hint-text">请先登录后再加载问卷</div>';
            return;
        }
        this.hideAssessmentReportView();
        const section = document.getElementById('assessmentQuestionnaireSection');
        const tagEl = section?.querySelector('.job-profile-tag');
        const titleRowEl = section?.querySelector('.page-title-row');
        const subtitleEl = section?.querySelector('.page-subtitle');
        if (tagEl) tagEl.classList.remove('hidden');
        if (titleRowEl) titleRowEl.classList.remove('hidden');
        if (subtitleEl) subtitleEl.classList.remove('hidden');
        const assessmentType = 'comprehensive';
        const actionsEl = document.getElementById('assessmentActions');
        if (container) container.innerHTML = '<div class="loading-message">加载问卷中...</div>';
        if (actionsEl) actionsEl.classList.add('hidden');

        this.showLoading();
        let result;
        try {
            result = await getQuestionnaire(userId, assessmentType);
        } catch (e) {
            result = { success: false, msg: (e && e.message) || '网络异常，请确认 AI 测评服务 (http://localhost:5002) 已启动' };
        }
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
            if (container) container.innerHTML = '<div class="hint-text">加载失败: ' + (result.msg || '请稍后重试') + '</div>';
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
        const totalQuestions = dimensionsList.reduce((acc, d) => acc + (Array.isArray(d.questions) ? d.questions.length : 0), 0) || 20;

        try {
            const totalHint = document.createElement('div');
            totalHint.className = 'assessment-total-hint';
            totalHint.textContent = '本问卷共 ' + totalQuestions + ' 题';
            container.appendChild(totalHint);
            // 题号需要全局连续（跨维度），避免每个维度从 1 重新开始
            let globalQNo = 1;
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
                                <div class="question-number">${globalQNo}</div>
                                <div class="question-text">${q.question_text != null ? q.question_text : ''}</div>
                            </div>
                            <div class="options">${optionsHtml}</div>
                        </div>
                    `;
                    globalQNo++;
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
        const calcRes = await calculateAssessmentScores(answers);
        if (calcRes.success && calcRes.data) this._lastAbilityScores = calcRes.data;
        else this._lastAbilityScores = null;
        const result = await submitAssessment(userId, this.currentAssessmentId, answers, timeSpent);
        this.hideLoading();

        if (result.success) {
            const reportId = result.data.report_id;
            this.currentReportId = reportId;
            this.saveLastAssessmentReportId(reportId);

            // 只要提交成功拿到 report_id，就视为已完成测评（首页/解锁逻辑立即生效）
            if (this.currentUser) {
                this.currentUser.assessment_completed = true;
                saveUserInfo(this.currentUser);
            }
            this.loadDashboardData();
            const userIdForSave = getCurrentUserId();
            if (userIdForSave) _storage.setItem('last_assessment_total_questions_' + userIdForSave, String(questions.length));
            this.showToast('测评提交成功，正在生成报告...', 'success');
            this.setViewReportButtonState('generating');
            
            // 轮询获取报告（首次延迟 2.5 秒，之后每 2 秒轮询，减少等待感）
            setTimeout(() => {
                this.pollAssessmentReport();
            }, 2500);
        } else {
            this.showToast(result.msg || '提交失败', 'error');
        }
    }

    // 轮询测评报告（3.3）：每 2 秒轮询一次，最多约 80 秒；首次生成通常需 30–60 秒
    async pollAssessmentReport(maxAttempts = 40) {
        if (!this.currentReportId) {
            this.showToast('报告ID不存在', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const pollIntervalMs = 2000;
        let attempts = 0;
        const container = document.getElementById('questionnaireContainer');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'assessment-status';
        statusDiv.style.cssText = 'padding: 20px; text-align: center; background: #f0f9ff; border-radius: 8px; margin: 20px 0;';
        container.appendChild(statusDiv);

        const poll = async () => {
            if (attempts >= maxAttempts) {
                this.setViewReportButtonState('ready');
                statusDiv.innerHTML = '<p style="color: #dc2626; margin-bottom: 12px;">报告生成超时，请稍后从「历史报告」查看</p><button type="button" class="btn-assessment-secondary" id="btnOpenHistoryOnTimeout">查看历史报告</button>';
                document.getElementById('btnOpenHistoryOnTimeout')?.addEventListener('click', () => this.viewAssessmentReportHistory());
                return;
            }

            const result = await getAssessmentReport(userId, this.currentReportId);

            if (result.success) {
                if (result.data.status === 'completed') {
                    this.saveLastAssessmentReportId(this.currentReportId);
                    const created = result.data.created_at || new Date().toISOString();
                    const interest = result.data.interest_analysis || {};
                    const personality = result.data.personality_analysis || {};
                    const primary = interest.primary_interest || {};
                    this.appendAssessmentReportHistory(this.currentReportId, created, {
                        holland_code: interest.holland_code || '',
                        mbti: personality.mbti_type || '',
                        match_score: primary.score != null ? primary.score : 0
                    });
                    if (this.currentUser) {
                        this.currentUser.assessment_completed = true;
                        saveUserInfo(this.currentUser);
                    }
                    statusDiv.remove();
                    this.setViewReportButtonState('ready');
                    this.showAssessmentReportView();
                    try {
                        sessionStorage.setItem('print_report_' + this.currentReportId, JSON.stringify(result.data));
                    } catch (e) { /* ignore */ }
                    const contentEl = document.getElementById('assessmentReportContent');
                    if (contentEl) {
                        this.renderReportContent(result.data, contentEl);
                        document.getElementById('btnGoToCareerPlan')?.addEventListener('click', () => {
                            this.navigateTo('report');
                        });
                    }
                    this.showToast('报告生成完成！', 'success');
                    // 测评完成后，推荐岗位数量可能变化，刷新首页数据
                    this.loadDashboardData();
                } else if (result.data.status === 'failed') {
                    statusDiv.innerHTML = `<p style="color: #dc2626;">报告生成失败: ${result.data.error || '未知错误'}</p>`;
                    this.setViewReportButtonState('ready');
                } else {
                    // processing：保持按钮为「报告生成中…」禁用态；每 2 秒轮询，提示约需 30–60 秒
                    this.setViewReportButtonState('generating');
                    attempts++;
                    const elapsed = Math.round((attempts * pollIntervalMs) / 1000);
                    const hint = attempts === 1 ? '（首次生成约需 30–60 秒）' : '';
                    statusDiv.innerHTML = `<p>报告生成中... (${elapsed}秒)${hint}</p>`;
                    setTimeout(poll, pollIntervalMs);
                }
            } else {
                this.setViewReportButtonState('generating');
                attempts++;
                const elapsed = Math.round((attempts * pollIntervalMs) / 1000);
                statusDiv.innerHTML = `<p>获取报告状态中... (${elapsed}秒)</p>`;
                setTimeout(poll, pollIntervalMs);
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

    // 查看测评报告（在职业测评页内展示，不跳转职业规划报告页）
    async viewAssessmentReport() {
        if (!this.currentReportId) {
            this.showToast('请先完成并提交测评', 'error');
            return;
        }
        this.showAssessmentReportOnAssessmentPage(this.currentReportId);
    }

    // 加载岗位匹配数据（能力画像已独立到「能力画像」页）
    async loadMatchingData() {
        await this.loadRecommendedJobs();
        await this.loadJobList();
    }

    // 加载规划落地性跟踪数据（求职进展 + 失败反馈）
    async loadTrackingData() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }
        const recentList = document.getElementById('trackingRecentList');
        if (recentList) recentList.innerHTML = '<div class="loading-message">正在加载...</div>';
        const reportsContainer = document.getElementById('trackingReportsList');
        if (reportsContainer) reportsContainer.innerHTML = '<div class="loading-message">正在加载反馈报告...</div>';

        const [overviewRes, reportsRes] = await Promise.all([
            getTrackingOverview(userId),
            getFailureReports(userId, 1, 20)
        ]);

        if (overviewRes && overviewRes.success && overviewRes.data) {
            this.renderTrackingOverview(overviewRes.data);
        } else {
            const code = overviewRes && overviewRes.code;
            const rawMsg = (overviewRes && overviewRes.msg) || '';
            const isNotFound = code === 404 || (typeof rawMsg === 'string' && rawMsg.includes('接口不存在'));
            const isConnectionError = typeof rawMsg === 'string' && (rawMsg.includes('无法连接') || rawMsg.includes('请确认已启动') || rawMsg.includes('请求超时'));
            const friendlyMsg = isNotFound ? '暂无记录，请左侧填写后创建' : (isConnectionError ? '请先启动 AI 服务（端口 5002）后点击下方按钮重试' : (rawMsg || '暂无求职记录'));
            if (recentList) {
                const safeMsg = friendlyMsg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                recentList.innerHTML = `<div class="hint-text">${safeMsg}</div>` +
                    (isConnectionError ? '<button type="button" id="trackingRetryBtn" class="btn-secondary" style="margin-top:8px;">重试</button>' : '');
                document.getElementById('trackingRetryBtn')?.addEventListener('click', () => this.loadTrackingData());
            }
            ['trackingTotalApplied', 'trackingWrittenRate', 'trackingOfferCount', 'trackingInProgressCount'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = id.includes('Rate') ? '0%' : '0';
            });
            this.trackingOverviewSummary = null;
            this.trackingOverviewRecords = [];
            this.trackingRecordsCache = {};
        }

        if (reportsRes && reportsRes.success && reportsRes.data) {
            this.renderTrackingReports(reportsRes.data);
        } else if (reportsContainer) {
            reportsContainer.innerHTML = '<div class="hint-text">暂无反馈优化报告</div>';
        }
    }

    // 加载隐私设置
    async loadPrivacySettings() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        try {
            const result = await api.requestToAI(`/security/privacy/consent?user_id=${userId}`, { method: 'GET' });

            if (result.success && result.data) {
                const consents = result.data.consents || {};
                // 默认全部开启：未返回或未保存时显示为开启
                document.getElementById('resumeVisibleToHr').checked = consents.resume_visible_to_hr !== false;
                document.getElementById('allowHrContact').checked = consents.allow_hr_contact !== false;
                document.getElementById('allowAlgorithmOptimization').checked = consents.allow_algorithm_optimization !== false;
                document.getElementById('allowResearch').checked = consents.allow_research !== false;
                document.getElementById('dataRetentionYears').value = consents.data_retention_years ?? 3;
            }
        } catch (error) {
            console.error('[Privacy] 加载隐私设置失败:', error);
        }

        // 同时加载数据统计
        await this.loadDataSummary();
    }

    // 加载数据统计
    async loadDataSummary() {
        const userId = getCurrentUserId();
        if (!userId) {
            return;
        }

        try {
            const result = await api.requestToAI(`/security/data/summary?user_id=${userId}`, { method: 'GET' });

            if (result.success && result.data) {
                const summary = result.data;
                document.getElementById('summaryResumeCount').textContent = summary.has_resume ? '1' : '0';
                document.getElementById('summaryAbilityCount').textContent = summary.has_ability_profile ? '1' : '0';
                document.getElementById('summaryLogCount').textContent = summary.access_log_count || '0';
            }
        } catch (error) {
            console.error('[Privacy] 加载数据统计失败:', error);
        }
    }

    // 导出用户数据
    async exportUserData() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        if (!confirm('确定要导出您的所有数据吗？')) {
            return;
        }

        try {
            this._appendMockAccessLog(userId, '导出我的数据');
            this.showToast('正在导出数据...', 'info');
            const result = await api.requestToAI(`/security/data/export?user_id=${userId}`, { method: 'GET' });

            if (result.success && result.data) {
                const dataStr = JSON.stringify(result.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `user_data_${userId}_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showToast('数据导出成功', 'success');
            } else {
                this.showToast(result.msg || '导出失败', 'error');
            }
        } catch (error) {
            console.error('[Privacy] 导出数据失败:', error);
            this.showToast('导出失败，请稍后重试', 'error');
        }
    }

    // 删除用户数据
    async deleteUserData() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        if (!confirm('警告：此操作将删除您的所有数据且不可恢复！\n\n确定要继续吗？')) {
            return;
        }

        if (!confirm('再次确认：真的要删除所有数据吗？')) {
            return;
        }

        try {
            this._appendMockAccessLog(userId, '删除我的数据');
            this.showToast('正在删除数据...', 'info');
            const result = await api.requestToAI('/security/data/delete', {
                method: 'DELETE',
                body: { user_id: userId }
            });

            if (result.success) {
                this.showToast('数据删除成功，请重新登录', 'success');
                setTimeout(() => {
                    this.logout();
                }, 2000);
            } else {
                this.showToast(result.msg || '删除失败', 'error');
            }
        } catch (error) {
            console.error('[Privacy] 删除数据失败:', error);
            this.showToast('删除失败，请稍后重试', 'error');
        }
    }

    // 保存隐私设置
    async savePrivacySettings() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        const consents = {
            resume_visible_to_hr: document.getElementById('resumeVisibleToHr').checked,
            allow_hr_contact: document.getElementById('allowHrContact').checked,
            allow_algorithm_optimization: document.getElementById('allowAlgorithmOptimization').checked,
            allow_research: document.getElementById('allowResearch').checked,
            data_retention_years: parseInt(document.getElementById('dataRetentionYears').value)
        };

        try {
            const result = await api.requestToAI('/security/privacy/consent', { 
                method: 'PUT',
                body: { user_id: userId, consents: consents }
            });

            if (result.success) {
                this.showToast('隐私设置保存成功', 'success');
            } else {
                this.showToast(result.msg || '保存失败', 'error');
            }
        } catch (error) {
            console.error('[Privacy] 保存隐私设置失败:', error);
            this.showToast('保存失败，请稍后重试', 'error');
        }
    }

    _getMockAccessLogKey(userId) {
        return `mock_access_logs_${userId}`;
    }

    _readMockAccessLogs(userId) {
        try {
            const raw = _storage.getItem(this._getMockAccessLogKey(userId));
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    _writeMockAccessLogs(userId, logs) {
        try {
            _storage.setItem(this._getMockAccessLogKey(userId), JSON.stringify(logs || []));
        } catch (_) {}
    }

    _appendMockAccessLog(userId, accessType) {
        if (!userId) return;
        const logs = this._readMockAccessLogs(userId);
        logs.unshift({
            access_type: String(accessType || '数据访问'),
            timestamp: Date.now()
        });
        this._writeMockAccessLogs(userId, logs.slice(0, 50));
        const summaryEl = document.getElementById('summaryLogCount');
        if (summaryEl) summaryEl.textContent = String(logs.length);
    }

    _renderAccessLogs(logs) {
        const logList = document.getElementById('accessLogList');
        if (!logList) return;
        const list = Array.isArray(logs) ? logs : [];
        if (list.length === 0) {
            logList.innerHTML = `
                <div class="privacy-log-item">
                    <div class="privacy-log-event">暂无访问记录</div>
                    <div class="privacy-log-time">—</div>
                </div>
            `;
            return;
        }
        logList.innerHTML = list.slice(0, 20).map(log => {
            const date = new Date(log.timestamp);
            const dateStr = date.toLocaleString('zh-CN');
            const eventName = (log.access_type || '').toString().replace(/</g, '&lt;');
            const timeText = dateStr.replace(/</g, '&lt;');
            return `
                <div class="privacy-log-item">
                    <div class="privacy-log-event">${eventName}</div>
                    <div class="privacy-log-time">${timeText}</div>
                </div>
            `;
        }).join('');
    }

    // 加载访问日志
    async loadAccessLogs() {
        const userId = getCurrentUserId();
        if (!userId) {
            return;
        }

        const logList = document.getElementById('accessLogList');
        if (logList) {
            logList.innerHTML = `
                <div class="privacy-log-item">
                    <div class="privacy-log-event">加载中…</div>
                    <div class="privacy-log-time">—</div>
                </div>
            `;
        }

        try {
            const result = await api.requestToAI(`/security/access/logs?user_id=${userId}&limit=20`, { method: 'GET' });

            if (result.success && result.data) {
                const logs = result.data.logs || [];
                if (logs.length === 0) {
                    const mockLogs = this._readMockAccessLogs(userId);
                    this._renderAccessLogs(mockLogs);
                } else {
                    this._renderAccessLogs(logs);
                }
            }
        } catch (error) {
            console.error('[Privacy] 加载访问日志失败:', error);
            const mockLogs = this._readMockAccessLogs(userId);
            this._renderAccessLogs(mockLogs);
        }
    }

    // 当前生成的简历数据
    currentResumeData = null;

    // HR邀约页：列表来自 MockStore 或兜底假数据；展示状态仅用内存 _hrInvitationStates（不持久化，刷新恢复初始）
    async loadStudentInvitations() {
        this._hrInvitationStates = this._hrInvitationStates || {};
        let list = [];
        const storeApi = window.HRMockStore || window.MockStore;
        if (storeApi && typeof storeApi.getMockStore === 'function') {
            try {
                const store = storeApi.getMockStore();
                list = (store.myInvitations || []).slice();
            } catch (e) {
                console.warn('[HR邀约] 读取 MockStore 失败，使用兜底列表', e);
            }
        }
        if (!list.length) {
            list = [
                { invitationId: 'INV-2025-001', companyName: '星途智探科技有限公司', hrName: '孙于婷', targetJob: '算法工程师', message: '您好，我们公司正在招聘算法工程师，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。', status: 'pending', sentAt: '2025-03-08 14:23' },
                { invitationId: 'INV-2025-002', companyName: '深蓝智能（北京）有限公司', hrName: '王雨晴', targetJob: '算法工程师', message: '您好，我们AI团队正在扩招，您的机器学习背景非常符合我们的需求，诚邀参与面试评估。', status: 'pending', sentAt: '2025-03-09 10:05' }
            ];
        }
        list = list.map(inv => ({
            invitationId: inv.invitationId || inv.invitation_id || '',
            targetJob: inv.targetJob || inv.target_job || '',
            companyName: inv.companyName || inv.company_name || '',
            hrName: inv.hrName || inv.hr_name || '',
            message: inv.message || '',
            sentAt: inv.sentAt || inv.sent_at || '',
            status: inv.status === 'declined' ? 'rejected' : (inv.status || 'pending')
        }));

        // 必须在 #hrInvitePage（或 #resumePage）内查找：历史上存在重复的 id=hrInviteList，getElementById 会命中隐藏块导致主页面空白
        const hrPage = document.getElementById('hrInvitePage') || document.getElementById('resumePage');
        const countEl = hrPage ? hrPage.querySelector('#hrInviteCount') : document.getElementById('hrInviteCount');
        const totalEl = document.getElementById('hrInviteTotal');
        const listEl = hrPage ? hrPage.querySelector('#hrInviteList') : document.getElementById('hrInviteList');
        if (countEl) countEl.textContent = `共 ${list.length} 条邀请`;
        if (totalEl) totalEl.textContent = `共 ${list.length} 条记录`;
        if (!listEl) return;

        if (list.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#a0a098;font-size:14px;">暂无HR评估邀请，请先完善个人档案并允许HR联系</div>';
            return;
        }

        listEl.innerHTML = list.map(inv => {
            var displayStatus = this._hrInvitationStates[inv.invitationId];
            if (!displayStatus) displayStatus = 'pending';
            return renderInvitationCard(inv, displayStatus);
        }).join('');
    }

    async respondToInvitation(invitationId, action) {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }
        // 学生端 HR模块：纯 Mock 演示，不走后端
        if (action === 'accept') acceptInvitation(invitationId);
        else if (action === 'decline') rejectInvitation(invitationId);
        this.showToast(action === 'accept' ? '已接受邀请' : '已拒绝邀请', 'success');
        this.loadStudentInvitations();
    }

    // 加载 HR 评估报告列表（接口不可用时用 mock）
    async loadStudentEvaluationReports() {
        const hrPage = document.getElementById('hrInvitePage') || document.getElementById('resumePage');
        const countEl = hrPage ? hrPage.querySelector('#hrReportCount') : document.getElementById('hrReportCount');
        const listEl = hrPage ? hrPage.querySelector('#hrReportList') : document.getElementById('hrReportList');
        if (!listEl) return;
        const userId = getCurrentUserId();
        if (!userId) {
            listEl.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#a0a098;font-size:14px;">请先登录</div>';
            if (countEl) countEl.textContent = '共 0 条报告';
            return;
        }
        // 学生端 HR模块：纯 Mock 演示，不走后端
        const storeApi = window.HRMockStore || window.MockStore;
        const store = (storeApi && typeof storeApi.getMockStore === 'function') ? storeApi.getMockStore() : { myReports: [] };
        let list = (store.myReports || []).slice();
        list = list.map(function (r) {
            return {
                evaluation_id: r.evaluation_id || r.evaluationId,
                target_job: r.target_job || r.targetJob || '',
                company_name: r.company_name || r.companyName || '',
                hr_name: r.hr_name || r.hrName || '',
                submitted_at: r.submitted_at || r.submittedAt || '',
                status: r.status || 'completed'
            };
        });
        if (countEl) countEl.textContent = '共 ' + list.length + ' 条报告';
        if (list.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#a0a098;font-size:14px;">暂无评估报告，接受邀请后 HR 填写评估即可在此查看</div>';
            return;
        }
        const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
        listEl.innerHTML = list.map(function (r) {
            var id = r.evaluation_id || r.evaluationId;
            var idEsc = String(id).replace(/'/g, "\\'");
            var statusText = (r.status === 'completed' || r.status === '已完成') ? '已生成' : '生成中';
            var statusCls = (r.status === 'completed' || r.status === '已完成') ? '#2d6a4f' : '#b56a00';
            return '<div style="background:#fff;border-radius:12px;padding:24px;">'
                + '<div style="display:flex;align-items:flex-start;">'
                + '<div style="flex:1;">'
                + '<h3 style="font-size:16px;font-weight:600;margin:0 0 4px;">' + esc(r.target_job) + '</h3>'
                + '<p style="color:#888;font-size:13px;margin:0 0 8px;">' + esc(r.company_name) + (r.hr_name ? ' · ' + esc(r.hr_name) : '') + '</p>'
                + '<p style="color:#aaa;font-size:12px;margin:0 0 12px;">报告生成时间：' + esc(r.submitted_at) + '</p>'
                + '<span style="background:' + statusCls + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;">' + statusText + '</span>'
                + '</div>'
                + '<button type="button" onclick="window.app.openReportDetailModal(\'' + idEsc + '\')" style="background:#0f0f0d;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:13px;cursor:pointer;white-space:nowrap;">查看详情</button>'
                + '</div></div>';
        }).join('');
    }

    async openReportDetailModal(evaluationId) {
        const overlay = document.getElementById('hrReportDetailModal');
        const titleEl = document.getElementById('hrReportDetailTitle');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        const setEl = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text || '—'; };
        setEl('reportCompanyName', '');
        setEl('reportTargetJob', '');
        setEl('reportSubmittedAt', '');
        setEl('reportOverall', '');
        setEl('reportHiring', '');
        setEl('reportStrengths', '');
        setEl('reportWeaknesses', '');
        var barsHost = document.getElementById('reportScoreBars');
        if (barsHost) barsHost.innerHTML = '';
        var posHost = document.getElementById('reportPositions');
        if (posHost) posHost.innerHTML = '';
        var miniHost = document.getElementById('reportMiniScores');
        if (miniHost) miniHost.innerHTML = '';
        var avgEl0 = document.getElementById('reportAvgScore');
        if (avgEl0) avgEl0.textContent = '—';
        setEl('reportInsight', '');
        setEl('reportFooterMeta', '');
        var tl1 = document.getElementById('reportTlDesc1');
        if (tl1) tl1.textContent = '「主动投递算法工程师岗位」';
        var tl3 = document.getElementById('reportTlDesc3');
        if (tl3) tl3.textContent = '「HR完成能力评估，均分—」';

        const userId = getCurrentUserId();
        if (!userId) {
            setEl('reportInsight', '请先登录');
            return;
        }
        // 学生端 HR模块：纯 Mock 演示，不走后端
        let data = null;
        const storeApi = window.HRMockStore || window.MockStore;
        if (storeApi && typeof storeApi.getMockStore === 'function') {
            const store = storeApi.getMockStore();
            const report = (store.myReports || []).find(function (r) {
                return (r.evaluationId || r.evaluation_id) === evaluationId;
            });
            if (report) {
                data = {
                    target_job: report.targetJob,
                    company_name: report.companyName,
                    overall_impression: report.overallImpression,
                    hiring_intent: report.hiringIntent,
                    dimension_scores: report.dimensionScores || {},
                    strengths_noted: report.strengthsNoted,
                    weaknesses_noted: report.weaknessesNoted,
                    recommended_positions: report.recommendedPositions || [],
                    evaluation_basis: report.evaluationBasis,
                    submitted_at: report.submittedAt
                };
            }
        }
        if (!data) {
            data = {
                target_job: '算法工程师',
                company_name: '星途智探科技有限公司',
                overall_impression: '优秀',
                hiring_intent: '强烈推荐',
                dimension_scores: { '专业技能匹配度': 95, '学习能力': 95, '沟通表达': 80, '团队协作意愿': 86, '抗压能力': 99, '职业成熟度': 94 },
                strengths_noted: '掌握技术种类多样，学习能力与抗压能力较强，具有较高的培养潜力，在开发项目中有极好的发挥优势',
                weaknesses_noted: '沟通能力弱，团队协作意愿弱',
                recommended_positions: ['算法工程师', '开发员'],
                evaluation_basis: '简历审阅',
                submitted_at: '2025-03-09 16:40'
            };
        }

        var impressionToText = { excellent: '优秀', good: '良好', average: '一般', below_average: '有待提升' };
        var intentToText = { strong: '强烈推荐', moderate: '有意向', weak: '可考虑', no: '暂不考虑' };
        var dimensions = ['专业技能匹配度', '学习能力', '沟通表达', '团队协作意愿', '抗压能力', '职业成熟度'];
        var scores = data.dimension_scores || data.dimensionScores || {};
        var overallRaw = data.overall_impression || data.overallImpression || '—';
        var hiringRaw = data.hiring_intent || data.hiringIntent || '—';
        var overallText = impressionToText[overallRaw] || overallRaw;
        var hiringText = intentToText[hiringRaw] || hiringRaw;

        var jobTitle = data.target_job || data.targetJob || '—';
        if (titleEl) titleEl.textContent = '评估报告 · ' + jobTitle;
        setEl('reportCompanyName', data.company_name || data.companyName || '—');
        setEl('reportTargetJob', jobTitle);
        var genTime = data.submitted_at || data.submittedAt || '—';
        setEl('reportSubmittedAt', genTime);
        setEl('reportOverall', overallText);
        setEl('reportHiring', hiringText);
        setEl('reportStrengths', data.strengths_noted || data.strengthsNoted || '—');
        setEl('reportWeaknesses', data.weaknesses_noted || data.weaknessesNoted || '—');

        var positions = data.recommended_positions || data.recommendedPositions || [];
        var posEl = document.getElementById('reportPositions');
        if (posEl) {
            if (Array.isArray(positions) && positions.length) {
                posEl.innerHTML = positions.map(function (p) {
                    return '<span class="eval-job-tag">' + String(p).replace(/</g, '&lt;') + '</span>';
                }).join('');
            } else {
                posEl.innerHTML = '<span style="color:#8a8a8a;font-size:12px;">暂无推荐岗位</span>';
            }
        }

        var barsHtml = dimensions.map(function (dim) {
            var val = scores[dim] !== undefined ? scores[dim] : 0;
            var w = Math.min(100, Math.max(0, val));
            var isGold = dim === '沟通表达';
            return '<div class="eval-bar-row">' +
                '<div class="eval-bar-header">' +
                '<span class="eval-bar-name">' + dim + '</span>' +
                '<span class="eval-bar-score' + (isGold ? ' eval-gold' : '') + '">' + val + '</span></div>' +
                '<div class="eval-bar-track"><div class="eval-bar-fill' + (isGold ? ' eval-gold' : '') + '" style="width:' + w + '%;"></div></div></div>';
        }).join('');
        var barsEl = document.getElementById('reportScoreBars');
        if (barsEl) barsEl.innerHTML = barsHtml;

        var dimValues = dimensions.map(function (d) { return Number(scores[d]) || 0; });
        var avgScore = dimValues.length ? dimValues.reduce(function (a, b) { return a + b; }, 0) / dimValues.length : 0;
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
                return '<div class="eval-mini-score">' +
                    '<div class="eval-mini-score-val' + (gold ? ' eval-gold' : '') + '">' + val + '</div>' +
                    '<div class="eval-mini-score-label">' + m.short + '</div></div>';
            }).join('');
        }

        var topDim = dimensions.reduce(function (a, b) { return (scores[a] || 0) > (scores[b] || 0) ? a : b; });
        var lowDim = dimensions.reduce(function (a, b) { return (scores[a] || 0) < (scores[b] || 0) ? a : b; });
        var perfWord = avgScore >= 85 ? '优秀' : avgScore >= 75 ? '良好' : '中等';
        var insightText = '根据HR对您的评估，综合6项维度得分' + avgScore.toFixed(1) + '分，整体表现' + perfWord + '。\n' +
            '「' + topDim + '」维度表现最为突出（' + (scores[topDim] || 0) + '分），显示出较强核心竞争力；\n' +
            '「' + lowDim + '」维度（' + (scores[lowDim] || 0) + '分）仍有提升空间，建议您在后续面试与工作中持续关注。\n' +
            'HR录用意向为「' + hiringText + '」，综合建议可优先考虑 ' + (positions[0] || '相关') + ' 方向岗位。';
        setEl('reportInsight', insightText);

        var companyName = data.company_name || data.companyName || '星途智探科技有限公司';
        var fm = document.getElementById('reportFooterMeta');
        if (fm) fm.textContent = '报告生成时间：' + genTime + ' · ' + companyName;

        var tlJob = document.getElementById('reportTlDesc1');
        if (tlJob) tlJob.textContent = '「主动投递' + jobTitle + '岗位」';
        var tlAvg = document.getElementById('reportTlDesc3');
        if (tlAvg) tlAvg.textContent = '「HR完成能力评估，均分' + avgScore.toFixed(1) + '」';

        var radarLabels = dimensions.map(function (d) {
            if (d === '专业技能匹配度') return '专业技能\n匹配度';
            if (d === '团队协作意愿') return '团队协作\n意愿';
            if (d === '职业成熟度') return '职业\n成熟度';
            return d;
        });
        var canvas = document.getElementById('reportRadarChart');
        if (canvas && typeof window.drawRadar === 'function') window.drawRadar(canvas, radarLabels, dimValues);
    }

    closeReportDetailModal() {
        const overlay = document.getElementById('hrReportDetailModal');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    // 加载简历
    async loadResume() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        try {
            const result = await api.requestToAI(`/resume/get?user_id=${userId}`, { method: 'GET' });

            if (result.success && result.data) {
                this.currentResumeData = result.data;
                this.renderResumePreview(result.data);
                document.getElementById('exportResumeBtn').disabled = false;
            }
        } catch (error) {
            console.error('[Resume] 加载简历失败:', error);
        }
    }

    // AI生成简历
    async generateResume() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        const statusEl = document.getElementById('resumeStatus');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<div style="background: var(--light-blue-bg); padding: 16px; border-radius: 8px; text-align: center;">正在AI生成简历，请稍候...</div>';
        
        document.getElementById('generateResumeBtn').disabled = true;

        try {
            const result = await api.postToAI('/resume/generate', { user_id: userId });

            if (result.success && result.data) {
                this.currentResumeData = result.data;
                this.renderResumePreview(result.data);
                document.getElementById('exportResumeBtn').disabled = false;
                statusEl.innerHTML = '<div style="background: #d4edda; padding: 16px; border-radius: 8px; text-align: center; color: #155724;">简历生成成功！</div>';
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 3000);
                this.showToast('简历生成成功', 'success');
            } else {
                statusEl.innerHTML = `<div style="background: #f8d7da; padding: 16px; border-radius: 8px; text-align: center; color: #721c24;">${result.msg || '生成失败'}</div>`;
                this.showToast(result.msg || '生成失败', 'error');
            }
        } catch (error) {
            console.error('[Resume] 生成简历失败:', error);
            statusEl.innerHTML = '<div style="background: #f8d7da; padding: 16px; border-radius: 8px; text-align: center; color: #721c24;">生成失败，请稍后重试</div>';
            this.showToast('生成失败，请稍后重试', 'error');
        } finally {
            document.getElementById('generateResumeBtn').disabled = false;
        }
    }

    // 个人档案页：提交简历给HR（调用同一接口，无需先在简历生成页生成）
    async submitProfileToHr() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }

        const btn = document.getElementById('profileSubmitToHrBtn');
        if (btn) btn.disabled = true;

        try {
            const result = await api.postToAI('/resume/submit', { user_id: userId });
            if (result.success) {
                this.showToast('简历已提交给HR', 'success');
            } else {
                this.showToast(result.msg || '提交失败，请稍后重试', 'error');
            }
        } catch (error) {
            console.error('[Profile] 提交简历给HR失败:', error);
            this.showToast('提交失败，请稍后重试', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // 导出PDF
    async exportResume() {
        if (!this.currentResumeData) {
            this.showToast('请先生成简历', 'error');
            return;
        }

        this.showToast('PDF导出功能开发中', 'info');
    }

    // 渲染简历预览
    renderResumePreview(resume) {
        const container = document.getElementById('resumePreview');
        if (!container) return;

        container.innerHTML = `
            <div class="hr-student-detail-header">
                <div class="hr-student-detail-avatar">${resume.anonymous_id.charAt(resume.anonymous_id.length - 1)}</div>
                <div class="hr-student-detail-info">
                    <h4>${resume.anonymous_id}</h4>
                    <span class="hr-student-detail-score">${resume.system_match_score}分匹配</span>
                </div>
            </div>
            
            <div class="hr-student-detail-section">
                <div class="hr-student-detail-section-title">基本信息</div>
                <div class="hr-student-detail-grid">
                    <div class="hr-student-detail-item">
                        <div class="hr-student-detail-item-label">学历</div>
                        <div class="hr-student-detail-item-value">${resume.education_level}</div>
                    </div>
                    <div class="hr-student-detail-item">
                        <div class="hr-student-detail-item-label">专业</div>
                        <div class="hr-student-detail-item-value">${resume.major_category}</div>
                    </div>
                    <div class="hr-student-detail-item">
                        <div class="hr-student-detail-item-label">成绩</div>
                        <div class="hr-student-detail-item-value">${resume.gpa_level}</div>
                    </div>
                    <div class="hr-student-detail-item">
                        <div class="hr-student-detail-item-label">联系状态</div>
                        <div class="hr-student-detail-item-value">${resume.is_open_to_contact ? '可联系' : '暂不可联系'}</div>
                    </div>
                </div>
            </div>
            
            <div class="hr-student-detail-section">
                <div class="hr-student-detail-section-title">个人亮点</div>
                <div class="hr-student-detail-highlight">
                    <p>${resume.highlight}</p>
                </div>
            </div>
            
            <div class="hr-student-detail-section">
                <div class="hr-student-detail-section-title">能力标签</div>
                <div class="hr-ability-tags">
                    ${resume.ability_tags.map(tag => `<span class="hr-ability-tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
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
            const msg = (result && result.msg) ? String(result.msg) : '暂无能力画像，请先完善个人档案并完成测评';
            const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            container.innerHTML = `
                <div class="hint-text">
                    ${safe}<br/>
                    <button id="abilityProfileInlineGenBtn" class="btn-primary" style="margin-top: 12px;">🤖 生成能力画像</button>
                    <button id="abilityProfileInlineRefreshBtn" class="btn-secondary" style="margin-top: 12px; margin-left: 8px;">刷新</button>
                </div>
            `;
            document.getElementById('abilityProfileInlineGenBtn')?.addEventListener('click', () => this.aiGenerateAbilityProfile());
            document.getElementById('abilityProfileInlineRefreshBtn')?.addEventListener('click', () => this.loadAbilityProfile());
        }
    }

    // 规划落地性跟踪：渲染求职总览与时间线
    renderTrackingOverview(data) {
        let summary = data.summary || {};
        const records = Array.isArray(data.records) ? data.records : [];

        const isOfferRecord = (r) => {
            if (!r) return false;
            const stage = (r.current_stage || r.stage || '').toString().toLowerCase();
            return r.result === 'offer' || stage === 'offer';
        };
        const isRejectedRecord = (r) => (r && (r.result === 'rejected' || r.result === 'failed' || r.current_stage === 'rejected'));
        const offerCountFromRecords = records.filter(isOfferRecord).length;
        const inProgressFromRecords = records.filter(r => !isOfferRecord(r) && !isRejectedRecord(r)).length;
        const offerCount = Math.max(Number(summary.offer_count) || 0, offerCountFromRecords);
        const inProgressCount = records.length ? inProgressFromRecords : (Number(summary.in_progress_count) || 0);
        summary = { ...summary, offer_count: offerCount, in_progress_count: inProgressCount };

        const toPercent = (v) => {
            if (v == null || isNaN(v)) return '0%';
            const num = Math.round(Number(v) * 100);
            return `${num}%`;
        };

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('trackingTotalApplied', String(summary.total_applied ?? records.length ?? 0));
        setText('trackingWrittenRate', toPercent(summary.written_test_pass_rate));
        setText('trackingInterviewRate', toPercent(summary.interview_pass_rate));
        setText('trackingOfferCount', String(summary.offer_count));
        setText('trackingInProgressCount', String(summary.in_progress_count));
        const writtenSub = document.getElementById('trackingWrittenRateSub');
        if (writtenSub) writtenSub.textContent = '—';
        const interviewSub = document.getElementById('trackingInterviewRateSub');
        if (interviewSub) interviewSub.textContent = '—';

        const insightWrap = document.getElementById('trackingAgentInsightWrap');
        const insightEl = document.getElementById('trackingAgentInsight');
        const agentInsight = data.agent_insight;
        if (insightWrap && insightEl) {
            if (agentInsight && String(agentInsight).trim()) {
                insightEl.textContent = agentInsight;
                insightWrap.style.display = '';
            } else {
                insightWrap.style.display = 'none';
            }
        }

        this.trackingOverviewSummary = summary;
        this.trackingOverviewRecords = records;
        this.trackingAgentInsight = data.agent_insight ?? null;
        this.trackingRecordsCache = {};
        records.forEach(r => {
            if (r && r.record_id) this.trackingRecordsCache[r.record_id] = r;
        });

        const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        const stageLabel = { applied: '已投递', written_test: '笔试', interview_1: '一面', interview_2: '二面', final: '终面', offer: 'Offer', rejected: '已拒绝' };
        const statusDotClass = (r) => {
            if (isOfferRecord(r)) return 'tracking-sd-ok';
            if (isRejectedRecord(r)) return 'tracking-sd-err';
            if (r.current_stage === 'applied') return 'tracking-sd-blue';
            return 'tracking-sd-warn';
        };

        const recentList = document.getElementById('trackingRecentList');
        if (recentList) {
            if (!records.length) {
                recentList.innerHTML = '<div class="hint-text">暂无记录，左侧填写后创建</div>';
            } else {
                const recent = records.slice(0, 10);
                recentList.innerHTML = recent.map(r => {
                    const first = (r.company_name || '公').charAt(0);
                    const dateText = (r.apply_date || r.last_updated || '').slice(0, 16) || '-';
                    return `<div class="tracking-recent-item" data-record-id="${esc(r.record_id)}">
                        <div class="tracking-ri-logo">${esc(first)}</div>
                        <div class="tracking-ri-info"><h4>${esc(r.job_title || '未命名岗位')}</h4><p>${esc(r.company_name || '')} · ${esc(dateText)}</p></div>
                        <div class="tracking-status-dot ${statusDotClass(r)}"></div>
                    </div>`;
                }).join('');
            }
        }

        const jobList = document.getElementById('trackingUpdateJobList');
        if (jobList) {
            if (!records.length) {
                jobList.innerHTML = '<div class="hint-text">暂无记录</div>';
            } else {
                jobList.innerHTML = records.map(r => {
                    const label = stageLabel[r.current_stage || r.stage] || '进行中';
                    const status = isOfferRecord(r)
                        ? '已拿Offer 🎉'
                        : isRejectedRecord(r)
                            ? (label + '淘汰')
                            : '进行中';
                    const sel = r.record_id === this.trackingSelectedRecordId ? ' sel' : '';
                    return `<div class="tracking-job-item${sel}" data-record-id="${esc(r.record_id)}">
                        <div class="tracking-job-main">
                            <h4>${esc(r.job_title || '未命名岗位')}</h4>
                            <p>${esc(r.company_name || '')} · ${status}</p>
                        </div>
                        <button type="button" class="tracking-job-delete-btn" data-record-id="${esc(r.record_id)}" aria-label="删除该求职记录">删除</button>
                    </div>`;
                }).join('');
            }
        }

        const failRecords = records.filter(r => isRejectedRecord(r));
        const failList = document.getElementById('trackingFailList');
        if (failList) {
            if (!failRecords.length) {
                failList.innerHTML = '<div class="hint-text">暂无失败记录</div>';
            } else {
                failList.innerHTML = failRecords.map(r => {
                    const sel = r.record_id === this.trackingSelectedFailureRecordId ? ' sel' : '';
                    return `<div class="tracking-fail-item${sel}" data-record-id="${esc(r.record_id)}"><h4>${esc(r.company_name || '')} · ${stageLabel[r.current_stage] || '淘汰'}</h4><p>${esc(r.job_title || '')} · ${esc(r.last_updated || '')}</p></div>`;
                }).join('');
            }
        }

        this.initTrackingFunnel(summary);
        if (this.trackingSelectedRecordId) this.renderTrackingSteps(this.trackingRecordsCache[this.trackingSelectedRecordId]);
        if (this.trackingSelectedFailureRecordId) this.renderTrackingFailureAnalysis(this.trackingSelectedFailureRecordId);
    }

    // 规划落地性跟踪：求职转化漏斗（横向 progress bar 统计）
    initTrackingFunnel(summary) {
        const dom = document.getElementById('trackingFunnelChart');
        if (!dom) return;

        // 旧版本可能初始化过 ECharts，先释放
        if (this.trackingFunnelChart && typeof this.trackingFunnelChart.dispose === 'function') {
            try { this.trackingFunnelChart.dispose(); } catch (_) {}
        }
        this.trackingFunnelChart = null;

        const total = Math.max(0, Number(summary?.total_applied || 0));
        const wtRate = Math.max(0, Number(summary?.written_test_pass_rate || 0));
        const ivRate = Math.max(0, Number(summary?.interview_pass_rate || 0));
        const offer = Math.max(0, Number(summary?.offer_count || 0));
        // 使用后端返回的「进入笔试人数」「进入面试岗位数」，避免仅投递就淘汰的被算进笔试/面试
        const writtenTotal = Number(summary?.written_total);
        const interviewStageCount = Number(summary?.interview_stage_count);
        const written = (writtenTotal >= 0 ? writtenTotal : (total > 0 ? Math.round(total * wtRate) : 0));
        const interview = (interviewStageCount >= 0 ? interviewStageCount : (total > 0 ? Math.round(total * ivRate) : 0));

        // 以“投递”为 100%，其他按比例缩短
        const base = Math.max(total, 1);
        const stages = [
            { label: '投递', value: total, pct: Math.round((total / base) * 100) },
            { label: '笔试', value: written, pct: Math.round((written / base) * 100) },
            { label: '面试', value: interview, pct: Math.round((interview / base) * 100) },
            { label: 'Offer', value: offer, pct: Math.round((offer / base) * 100) }
        ];

        // 进度条最小可见宽度（有值时）
        const minPct = 6;
        const rows = stages.map(s => {
            const pct = s.value > 0 ? Math.max(minPct, Math.min(100, s.pct)) : 0;
            return `
                <div class="tracking-funnel-row">
                    <span class="tracking-funnel-label">${s.label}</span>
                    <div class="tracking-funnel-bar-bg" aria-hidden="true">
                        <div class="tracking-funnel-bar-fill" style="width:${pct}%;"></div>
                    </div>
                    <span class="tracking-funnel-val">${s.value}</span>
                </div>
            `;
        }).join('');

        dom.innerHTML = `<div class="tracking-funnel-list">${rows}</div>`;
    }

    // 规划落地性跟踪：渲染失败反馈报告列表
    renderTrackingReports(data) {
        const container = document.getElementById('trackingReportsList');
        const countEl = document.getElementById('trackingReportCount');
        if (countEl) countEl.textContent = String((data.total != null ? data.total : (data.list && data.list.length)) || 0);
        if (!container) return;
        const list = Array.isArray(data.list) ? data.list : [];
        this.trackingReportsCache = {};
        this.trackingReportsByKey = {};
        list.forEach(item => {
            if (item.report_id) this.trackingReportsCache[item.report_id] = item;
            const key = this._trackingReportKey(item);
            if (key) {
                if (!this.trackingReportsByKey[key]) this.trackingReportsByKey[key] = [];
                this.trackingReportsByKey[key].push(item);
            }
        });
        // 尽量按时间倒序（created_at 可能为空，做保守排序）
        Object.keys(this.trackingReportsByKey).forEach(k => {
            this.trackingReportsByKey[k].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        });
        if (!list.length) {
            container.innerHTML = '<div class="hint-text">暂无反馈优化报告。当某次求职失败并完成 AI 复盘后，会出现在这里。</div>';
            return;
        }
        const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        container.innerHTML = list.map(item => {
            const rid = esc(item.report_id || '');
            const title = esc(item.job_title || '') + ' · ' + esc(item.company_name || '');
            const desc = esc((item.key_weakness || '').slice(0, 60)) + (item.key_weakness && item.key_weakness.length > 60 ? '…' : '');
            const tags = [];
            if (item.key_weakness) tags.push('<span class="tracking-tag-s">技能Gap</span>');
            if (item.plan_updated) tags.push('<span class="tracking-tag-r">简历优化</span>');
            tags.push('<span class="tracking-tag-i">面试准备</span>');
            return `<div class="tracking-rpt-card" data-report-id="${rid}">
                <div class="tracking-rpt-head"><h4>${title}</h4><span class="tracking-rpt-date">${esc(item.created_at || '')}</span></div>
                <p class="tracking-rpt-desc">${desc}</p>
                <div class="tracking-rpt-tags">${tags.join('')}</div>
            </div>`;
        }).join('');
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

    // 求职跟踪：切换 5 个 Tab
    switchTrackingTab(tabName) {
        document.querySelectorAll('#trackingPage .tracking-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('#trackingPage .tracking-panel').forEach(panel => {
            panel.classList.toggle('on', panel.id === tabName + 'Tab');
        });
        if (tabName === 'trackingOverview') {
            setTimeout(() => this.initTrackingCharts(), 80);
        }
    }

    // Tab1 创建：清空表单
    clearTrackingCreateForm() {
        ['trackingJobTitle', 'trackingCompanyName', 'trackingApplyDate', 'trackingApplyDateText', 'trackingCreateNotes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const src = document.getElementById('trackingSource');
        if (src) src.value = 'system_recommend';
    }

    _initTrackingApplyDateInput() {
        const native = document.getElementById('trackingApplyDate');
        const text = document.getElementById('trackingApplyDateText');
        const btn = document.getElementById('trackingApplyDatePickerBtn');
        if (!native || !text || !btn) return;

        const format = (iso) => {
            if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
            const [y, mo, d] = iso.split('-');
            return `${y}年${mo}月${d}日`;
        };
        const toISO = (s) => {
            const v = String(s || '').trim();
            if (!v) return '';
            const norm = v
                .replace(/\s+/g, '')
                .replace(/[．。.]/g, '/')
                .replace(/-/g, '/')
                .replace(/年/g, '/')
                .replace(/月/g, '/')
                .replace(/日/g, '');
            const m = norm.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
            if (!m) return '';
            const y = m[1];
            const mo = String(m[2]).padStart(2, '0');
            const d = String(m[3]).padStart(2, '0');
            return `${y}-${mo}-${d}`;
        };

        const syncFromNative = () => { text.value = format(native.value); };
        syncFromNative();

        native.addEventListener('change', syncFromNative);
        btn.addEventListener('click', () => {
            try {
                if (typeof native.showPicker === 'function') native.showPicker();
                else native.click();
            } catch (_) {
                native.focus();
            }
        });
        text.addEventListener('blur', () => {
            const iso = toISO(text.value);
            if (!iso) return;
            native.value = iso;
            syncFromNative();
        });
    }

    async handleCreateTrackingRecord() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }
        const jobTitle = (document.getElementById('trackingJobTitle')?.value || '').trim();
        const companyName = (document.getElementById('trackingCompanyName')?.value || '').trim();
        const jobId = (document.getElementById('trackingJobId')?.value || '').trim();
        const applyDate = document.getElementById('trackingApplyDate')?.value || '';
        const source = document.getElementById('trackingSource')?.value || 'system_recommend';
        const notes = (document.getElementById('trackingCreateNotes')?.value || '').trim();

        if (!jobTitle || !companyName) {
            this.showToast('请填写岗位名称和公司名称', 'error');
            return;
        }

        this.showLoading();
        // API 9.1 仅支持：job_id, job_title, company_name, apply_date, source（备注不传创建接口，可后续更新时写入）
        const payload = {
            job_id: jobId || undefined,
            job_title: jobTitle,
            company_name: companyName,
            apply_date: applyDate || new Date().toISOString().slice(0, 10),
            source: source || 'system_recommend'
        };
        const res = await createTrackingRecord(userId, payload);
        this.hideLoading();

        if (res && res.success) {
            this.showToast('跟踪记录已创建', 'success');
            this.clearTrackingCreateForm();
            await this.loadTrackingData();
        } else {
            this.showToast((res && res.msg) || '创建失败，请稍后重试', 'error');
        }
    }

    // 求职跟踪：更新进展弹窗
    openTrackingUpdateModal(record) {
        const modal = document.getElementById('trackingUpdateModal');
        if (!modal || !record) return;
        this.trackingEditingRecordId = record.record_id;
        const title = document.getElementById('trackingUpdateTitle');
        if (title) {
            title.textContent = `${record.job_title || ''} · ${record.company_name || ''}`;
        }
        const stageSel = document.getElementById('trackingStageSelect');
        const resultSel = document.getElementById('trackingResultSelect');
        const dateInput = document.getElementById('trackingStageDate');
        if (stageSel && record.current_stage) stageSel.value = record.current_stage;
        if (resultSel && record.result) resultSel.value = record.result;
        if (dateInput && record.last_updated) dateInput.value = record.last_updated;
        ['trackingPerformanceScore','trackingDifficulty','trackingStrongPoints','trackingWeakPoints','trackingNotes'].forEach(id => {
            const el = document.getElementById(id);
            if (el && id === 'trackingDifficulty' && !el.value) {
                el.value = 'medium';
            } else if (el && id !== 'trackingDifficulty') {
                el.value = '';
            }
        });
        modal.classList.remove('hidden');
    }

    closeTrackingUpdateModal() {
        const modal = document.getElementById('trackingUpdateModal');
        if (modal) modal.classList.add('hidden');
        this.trackingEditingRecordId = null;
    }

    async handleUpdateTrackingRecord() {
        const recordId = this.trackingEditingRecordId;
        const userId = getCurrentUserId();
        if (!recordId || !userId) {
            this.showToast('记录信息缺失，请重试', 'error');
            return;
        }
        const stage = document.getElementById('trackingStageSelect')?.value || 'applied';
        const result = document.getElementById('trackingResultSelect')?.value || 'pending';
        const stageDate = document.getElementById('trackingStageDate')?.value || '';
        const scoreRaw = document.getElementById('trackingPerformanceScore')?.value || '';
        const difficulty = document.getElementById('trackingDifficulty')?.value || 'medium';
        const strongText = document.getElementById('trackingStrongPoints')?.value || '';
        const weakText = document.getElementById('trackingWeakPoints')?.value || '';
        const notes = document.getElementById('trackingNotes')?.value || '';

        const toList = (txt) => txt
            .split(/[\n,，。]/)
            .map(s => s.trim())
            .filter(Boolean);

        const payload = {
            user_id: userId,
            stage,
            result,
            stage_date: stageDate || undefined,
            self_evaluation: {
                performance_score: scoreRaw ? Number(scoreRaw) : 0,
                difficulty,
                weak_points: toList(weakText),
                strong_points: toList(strongText)
            },
            notes
        };

        this.showLoading();
        const res = await updateTrackingRecord(recordId, payload);
        this.hideLoading();

        if (res && res.success) {
            this.showToast('进展已更新', 'success');
            this.closeTrackingUpdateModal();
            await this.loadTrackingData();
        } else {
            this.showToast((res && res.msg) || '更新失败，请稍后重试', 'error');
        }
    }

    // 求职失败复盘：打开弹窗
    openTrackingFailureModal(record) {
        const modal = document.getElementById('trackingFailureModal');
        if (!modal || !record) return;
        this.trackingFailureRecord = record;
        const subtitle = document.getElementById('trackingFailureSubtitle');
        if (subtitle) {
            subtitle.textContent = `${record.job_title || ''} · ${record.company_name || ''}`;
        }
        const statusEl = document.getElementById('trackingFailureStatus');
        if (statusEl) statusEl.textContent = '等待开始分析';
        const streamEl = document.getElementById('trackingFailureStream');
        if (streamEl) {
            streamEl.innerHTML = '<p class="hint-text">点击「开始 AI 分析」后，这里会实时生成本次求职的复盘报告与后续规划。</p>';
        }
        const feedback = document.getElementById('trackingRejectionFeedback');
        if (feedback) feedback.value = '';
        modal.classList.remove('hidden');
    }

    closeTrackingFailureModal() {
        const modal = document.getElementById('trackingFailureModal');
        if (modal) modal.classList.add('hidden');
        this.trackingFailureRecord = null;
    }

    openTrackingPlanModal() {
        const modal = document.getElementById('trackingPlanModal');
        if (!modal) return;
        const streamEl = document.getElementById('trackingPlanStream');
        const statusEl = document.getElementById('trackingPlanStatus');
        if (statusEl) statusEl.textContent = '';
        if (streamEl) {
            streamEl.innerHTML = '<p class="hint-text">点击「生成可执行计划」后，将展示学习资源、竞争力提升建议与项目实践方案。</p>';
        }
        modal.classList.remove('hidden');
    }

    closeTrackingPlanModal() {
        const modal = document.getElementById('trackingPlanModal');
        if (modal) modal.classList.add('hidden');
    }

    // 应对措施/计划定制：直接展示可执行计划（本地内容），避免请求未实现的接口导致 404；后端提供 /tracking/action-plan 后可改为先请求再兜底
    async startTrackingPlanGenerate() {
        const userId = getCurrentUserId();
        const statusEl = document.getElementById('trackingPlanStatus');
        const streamEl = document.getElementById('trackingPlanStream');
        const promptEl = document.getElementById('trackingPlanPrompt');
        const btn = document.getElementById('trackingPlanGenerateBtn');
        const extraPrompt = (promptEl && promptEl.value) ? String(promptEl.value).trim() : '';

        if (!userId) {
            this.showToast('请先登录', 'error');
            return;
        }
        if (statusEl) statusEl.textContent = '正在生成可执行计划…';
        if (streamEl) streamEl.textContent = '';
        if (btn) btn.disabled = true;

        try {
            const fallback = this._getTrackingPlanFallbackContent(extraPrompt);
            if (streamEl) streamEl.innerHTML = `<div class="tracking-md">${this._simpleMarkdownToHtml(fallback)}</div>`;
            if (statusEl) statusEl.textContent = '生成完成';
            this.showToast('可执行计划已生成', 'success');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    _getTrackingPlanFallbackContent(extraPrompt) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const userHint = extraPrompt ? `\n**针对你的补充**：${extraPrompt.slice(0, 120)}${extraPrompt.length > 120 ? '…' : ''}\n\n建议在下面三个板块中优先关注与这段话最相关的部分；如需更贴合你个人的方案，可等待后续接入 AI 生成。\n\n---\n\n` : '';

        const resourcesVariants = [
            '- **算法与笔试**：LeetCode、牛客网、CodeTop；**前端/全栈**：MDN、菜鸟教程、React 官方文档\n- **项目与社区**：GitHub、Gitee、掘金、知乎专栏、V2EX\n- **求职与行业**：拉勾、Boss、脉脉、看准网（岗位要求与面经）\n- **系统学习**：中国大学 MOOC、极客时间、慕课网、极客学院',
            '- **技术基础**：LeetCode（算法）、牛客网（笔试/面经）、MDN / 菜鸟教程（前端/全栈）\n- **项目与开源**：GitHub、Gitee、掘金、知乎专栏\n- **行业与岗位**：拉勾、Boss、脉脉（岗位要求与趋势）\n- **系统学习**：中国大学 MOOC、极客时间、慕课网',
            '- **刷题与面经**：LeetCode、牛客网、力扣题解；**文档与教程**：MDN、菜鸟、官方文档\n- **开源与输出**：GitHub 参与/自建项目、掘金/博客写总结\n- **招聘与情报**：Boss、拉勾、脉脉、公司官网/校招页\n- **课程**：MOOC、极客时间、Udemy、B 站优质系列'
        ];
        const competeVariants = [
            '1. **技能与岗位对齐**：根据目标岗位 JD 提炼关键词，补齐缺失技能并能在简历/面试中举证。\n2. **项目经历**：优先做与岗位相关的课程设计/毕设/开源/实习项目，量化结果（性能、用户量、优化比例等）。\n3. **笔试与面试**：定期刷题、总结常考题型；整理面经，准备项目深挖与行为问题。\n4. **软实力**：沟通表达、时间管理、复盘习惯，在面试中体现学习与迭代能力。',
            '1. **JD 拆解**：把岗位描述里的技术栈、业务词、软素质逐条列出，自评差距。\n2. **项目可讲性**：每个项目能说清背景、难点、你的角色和可量化结果。\n3. **笔试与手写**：按题型归纳（数组/链表/DP/设计），限时模拟。\n4. **面试节奏**：先结论后细节，不会的说明边界与可补充方向。',
            '1. **能力标签化**：把“会什么”对应到岗位关键词，简历与口述一致。\n2. **项目闭环**：从需求到上线/数据，突出你负责的部分与反思。\n3. **题感与表达**：刷题重思路与边界；面试重结构（STAR/先总后分）。\n4. **复盘**：每次面试后记录被问住的问题，补强并形成话术。'
        ];
        const projectVariants = [
            '1. **选题**：围绕目标岗位技术栈和业务场景，选一个小而完整的模块（如后台管理、数据看板、推荐/检索 demo）。\n2. **实现与文档**：代码结构清晰、有 README 与部署说明；可补充设计思路、难点与收获。\n3. **展示**：在简历中写清技术栈、个人职责与成果；面试前准备好「项目背景—难点—你的贡献—反思」的讲述逻辑。\n4. **持续迭代**：根据投递反馈补充技术点或新项目，形成闭环。',
            '1. **方向**：和意向岗位技术栈一致（如后端用 Go/Java+MySQL+Redis，前端 React+Vite）。\n2. **规模**：不贪大，一个完整链路（前后端/数据/部署）即可。\n3. **简历与口述**：技术栈、职责、指标写清楚；面试能展开 2～3 分钟并应对追问。\n4. **迭代**：根据面试反馈补做小模块或新项目，形成“投递—反馈—补强”的循环。',
            '1. **选题**：与目标岗位相关的小系统（电商/内容/工具均可），突出技术难点。\n2. **实现**：规范命名、分层清晰、有 README 和关键设计说明。\n3. **简历**：用 STAR 或“背景-难点-方案-结果”写项目，并准备深挖话术。\n4. **复盘**：根据挂掉的面试补充知识点或新项目，再投。'
        ];

        const part1 = pick(resourcesVariants);
        const part2 = pick(competeVariants);
        const part3 = pick(projectVariants);
        return `${userHint}## 一、优质学习资源与网站\n\n${part1}\n\n## 二、如何增强自身竞争力\n\n${part2}\n\n## 三、怎么做项目\n\n${part3}`;
    }

    // 求职失败复盘：SSE 流式调用 9.3 接口
    async startFailureAnalysisForCurrentRecord() {
        const record = this.trackingFailureRecord;
        const userId = getCurrentUserId();
        if (!record || !userId) {
            this.showToast('记录信息缺失，请重试', 'error');
            return;
        }
        const statusEl = document.getElementById('trackingFailureStatus');
        const streamEl = document.getElementById('trackingFailureStream');
        const feedback = document.getElementById('trackingRejectionFeedback')?.value || '';

        if (statusEl) statusEl.textContent = 'AI 正在分析你的求职数据...';
        if (streamEl) streamEl.textContent = '';

        try {
            const url = (typeof getTrackingFailureAnalysisURL === 'function')
                ? getTrackingFailureAnalysisURL(record.record_id)
                : `${(typeof API_CONFIG !== 'undefined' ? (API_CONFIG.assessmentBaseURL || API_CONFIG.jobProfilesBaseURL) : '') || 'http://127.0.0.1:5002/api/v1'}/tracking/record/${encodeURIComponent(record.record_id)}/failure-analysis`;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    record_id: record.record_id,
                    final_stage: record.current_stage || 'final',
                    final_result: 'rejected',
                    rejection_feedback: feedback
                })
            });
            if (!res.ok || !res.body) {
                throw new Error(`接口返回异常 (${res.status})`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let bufferText = '';
            let doneReportId = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const payloadStr = trimmed.slice(5).trim();
                    if (!payloadStr) continue;
                    let payload;
                    try {
                        payload = JSON.parse(payloadStr);
                    } catch (_) {
                        continue;
                    }
                    if (payload.description && statusEl) {
                        statusEl.textContent = payload.description;
                    }
                    if (payload.chunk && streamEl) {
                        bufferText += payload.chunk;
                        streamEl.innerHTML = this._renderStreamingMarkdown(bufferText);
                        streamEl.scrollTop = streamEl.scrollHeight;
                    }
                    if (payload.report_id) {
                        doneReportId = payload.report_id;
                    }
                }
            }

            if (statusEl) statusEl.textContent = doneReportId ? '分析完成' : '分析结束';
            if (doneReportId) {
                this.showToast('复盘报告生成完成', 'success');
                await this.loadTrackingData();
            }
            // 无论是否拿到 report_id，都把当前流式分析缓存下来回填到 Tab3（三列面板）
            try {
                const recordId = record.record_id;
                this._cacheTrackingFailureAnalysis(recordId, bufferText);
                // 若当前 Tab3 正在查看这条记录，立即刷新面板内容
                if (this.trackingSelectedFailureRecordId === recordId) {
                    this.renderTrackingFailureAnalysis(recordId);
                }
            } catch (_) {}
        } catch (e) {
            console.error('失败复盘分析异常:', e);
            if (statusEl) statusEl.textContent = '分析失败：' + (e.message || '网络错误');
            this.showToast('求职失败分析接口异常', 'error');
        }
    }

    _trackingReportKey(itemOrRecord) {
        const job = (itemOrRecord && (itemOrRecord.job_title || itemOrRecord.jobTitle)) || '';
        const co = (itemOrRecord && (itemOrRecord.company_name || itemOrRecord.companyName)) || '';
        const j = String(job || '').trim();
        const c = String(co || '').trim();
        if (!j && !c) return '';
        return `${j}||${c}`;
    }

    _getLatestFailureReportForRecord(record) {
        if (!record) return null;
        // 1) 优先按 record_id（如果后端返回这个字段）
        const byId = Object.values(this.trackingReportsCache || {}).find(r => r && r.record_id && r.record_id === record.record_id);
        if (byId) return byId;
        // 2) 退化：按 job_title + company_name 匹配最近一条
        const key = this._trackingReportKey(record);
        const arr = key ? (this.trackingReportsByKey?.[key] || []) : [];
        return arr.length ? arr[0] : null;
    }

    _getCachedRawForReport(report) {
        if (!report) return '';
        // 1) 优先用 report.record_id（如果有）
        const rid = report.record_id;
        if (rid && this.trackingFailureAnalysisCache?.[rid]?.raw) return this.trackingFailureAnalysisCache[rid].raw;

        // 2) 退化：按 job_title + company_name 匹配到 overview 中的记录，再取其缓存
        const key = this._trackingReportKey(report);
        if (!key) return '';
        const rec = (this.trackingOverviewRecords || []).find(r => this._trackingReportKey(r) === key);
        const recId = rec && rec.record_id;
        if (recId && this.trackingFailureAnalysisCache?.[recId]?.raw) return this.trackingFailureAnalysisCache[recId].raw;
        return '';
    }

    _extractFailureSectionsFromText(raw) {
        const md = this._normalizeStreamingText(raw);
        const lines = md.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
        const bullets = [];
        for (const ln of lines) {
            const t = ln.replace(/^data:\s*/i, '').trim();
            const m1 = t.match(/^[-*•]\s+(.*)$/);
            const m2 = t.match(/^\d+\.\s+(.*)$/);         // 1. xxx
            const m3 = t.match(/^\d+[、]\s*(.*)$/);       // 1、xxx
            const m4 = t.match(/^\(?\d+\)?[)）]\s*(.*)$/); // 1) xxx / 1）xxx / (1) xxx
            if (m1) bullets.push(m1[1].trim());
            else if (m2) bullets.push(m2[1].trim());
            else if (m3) bullets.push(m3[1].trim());
            else if (m4) bullets.push(m4[1].trim());
        }
        // 若没有明显列表，按分号/顿号等拆句兜底
        const fallback = bullets.length
            ? bullets
            : md.split(/[；;。\n]/).map(s => s.trim()).filter(Boolean);

        // 按标题关键词切分（有就更准，没有就按段落切）
        const sec = { skill: [], resume: [], interview: [] };
        let cur = '';
        const pushLine = (s) => {
            const v = String(s || '').trim();
            if (!v) return;
            if (cur === 'skill') sec.skill.push(v);
            else if (cur === 'resume') sec.resume.push(v);
            else if (cur === 'interview') sec.interview.push(v);
        };
        for (const ln of lines) {
            const t = ln.replace(/^#+\s*/, '').trim().toLowerCase();
            if (/技能|gap|能力差距/.test(t)) { cur = 'skill'; continue; }
            if (/简历|履历|项目描述|优化点/.test(t)) { cur = 'resume'; continue; }
            if (/面试|沟通|表达|准备/.test(t)) { cur = 'interview'; continue; }
            const m1 = ln.match(/^[-*•]\s+(.*)$/);
            const m2 = ln.match(/^\d+\.\s+(.*)$/);
            const m3 = ln.match(/^\d+[、]\s*(.*)$/);
            const m4 = ln.match(/^\(?\d+\)?[)）]\s*(.*)$/);
            if (m1 || m2 || m3 || m4) {
                pushLine((m1 || m2 || m3 || m4)[1]);
            } else if (cur && ln.length > 20 && !/^#|^[\d一二三四五六七八九十]+[、.．)]\s*$/.test(ln)) {
                // 非列表的长句也按当前区块收集（按句号/分号拆成多条）
                ln.split(/[；。！？?]/).map(s => s.trim()).filter(s => s.length >= 6).forEach(pushLine);
            }
        }

        // 进一步把“长段落”切成更多可读要点（不新增内容，只做句子切分）
        const baseFlat = fallback.map(s => s.replace(/\*\*/g, '').replace(/`/g, '').trim()).filter(Boolean);
        const splitLong = (s) => {
            const t = String(s || '').trim();
            if (!t) return [];
            // 已经是条目/短句就不拆
            if (t.length <= 48) return [t];
            // 先按强分隔拆：；。！？?
            const strong = t.split(/[；。！？?]/).map(x => x.trim()).filter(Boolean);
            const out = [];
            for (const seg of (strong.length ? strong : [t])) {
                if (seg.length > 80) {
                    // 很长的再按逗号粗拆（避免过碎）
                    const weak = seg.split(/[，,]/).map(x => x.trim()).filter(Boolean);
                    weak.forEach(x => { if (x) out.push(x); });
                } else {
                    out.push(seg);
                }
            }
            return out.filter(x => x.length >= 6);
        };
        const flat = baseFlat.flatMap(splitLong).filter(Boolean);
        const classify = (s) => {
            const t = String(s || '').trim();
            if (!t) return '';
            if (/简历|履历|项目|经历|表述|描述|量化|成果|STAR|匹配|投递|关键词/i.test(t)) return 'resume';
            if (/面试|沟通|表达|回答|复盘|题|准备|案例/i.test(t)) return 'interview';
            if (/技能|技术|框架|基础|深度|实践|算法|原理|工程/i.test(t)) return 'skill';
            return '';
        };

        // 始终用关键词把 flat 条目归类，让三栏分布更均衡（不只在某块为空时）
        for (const it of flat) {
            const c = classify(it);
            const str = String(it).trim();
            if (!str) continue;
            if (c === 'resume' && !sec.resume.includes(it)) sec.resume.push(it);
            else if (c === 'skill' && !sec.skill.includes(it)) sec.skill.push(it);
            else if (c === 'interview' && !sec.interview.includes(it)) sec.interview.push(it);
        }

        // 兜底分配：某块为空时从 pool 取
        let used = new Set([...sec.skill, ...sec.resume, ...sec.interview].map(s => String(s).trim()));
        let pool = flat.filter(s => !used.has(String(s).trim()));
        const take = (n) => pool.splice(0, n);

        const TARGET_PER_BOX = 10;
        if (!sec.skill.length) sec.skill = take(TARGET_PER_BOX);
        if (!sec.resume.length) sec.resume = take(TARGET_PER_BOX);
        if (!sec.interview.length) sec.interview = take(TARGET_PER_BOX);

        if (!sec.skill.length) sec.skill = flat.slice(0, TARGET_PER_BOX);
        if (!sec.resume.length) sec.resume = flat.slice(0, TARGET_PER_BOX);
        if (!sec.interview.length) sec.interview = flat.slice(0, TARGET_PER_BOX);

        // 补足稀疏栏：每栏至少 TARGET_PER_BOX 条，从 pool 补充（优先关键词匹配）
        used = new Set([...sec.skill, ...sec.resume, ...sec.interview].map(s => String(s).trim()));
        pool = flat.filter(s => !used.has(String(s).trim()));
        const topUp = (key) => {
            while (sec[key].length < TARGET_PER_BOX && pool.length) {
                let idx = pool.findIndex(p => classify(p) === key);
                if (idx < 0) idx = 0;
                const item = pool.splice(idx, 1)[0];
                if (item && !sec[key].includes(item)) {
                    sec[key].push(item);
                    used.add(String(item).trim());
                }
            }
        };
        topUp('resume');
        topUp('interview');
        topUp('skill');

        // 去重：简历/面试栏若与技能栏完全重复则去掉
        const skillSet = new Set(sec.skill.map(s => String(s).trim()));
        sec.resume = sec.resume.filter(s => !skillSet.has(String(s).trim()));
        sec.interview = sec.interview.filter(s => !skillSet.has(String(s).trim()));
        if (!sec.resume.length) sec.resume = sec.skill.slice(0, TARGET_PER_BOX);
        if (!sec.interview.length) sec.interview = sec.skill.slice(0, TARGET_PER_BOX);

        // 每栏补足到约 10 条：用可执行建议填充，避免只罗列缺点
        const ACTIONABLE_SKILL = [
            '针对岗位 JD 补 1～2 门关键技术，并用小项目或笔记验证',
            '用 LeetCode/牛客等巩固算法与手写题，按题型归纳思路',
            '梳理已做项目的技术难点、优化点与数据结果，便于面试深挖',
            '学习目标岗位常用中间件/框架的官方文档与最佳实践',
            '找一段与目标技术栈一致的开源或课程项目做精读与改造',
            '建立技术知识体系：基础原理 → 应用场景 → 踩坑与优化',
            '参与或主导一个可量化的技术改进（性能、稳定性、可观测）',
            '对简历上每项技术能讲清原理、使用场景和与岗位的关联',
            '定期做技术总结与输出（博客/内部分享），形成可讲的故事',
            '明确与岗位的差距点并制定 2～3 个月可落地的学习计划'
        ];
        const ACTIONABLE_RESUME = [
            '用 STAR 法则写项目经历：情境、任务、行动、可量化结果',
            '成果尽量量化：性能提升 x%、用户量、QPS、节省成本等',
            '简历关键词与岗位 JD 对齐，技能与项目描述一致',
            '与岗位最相关的 1～2 个项目放前并写清技术栈与职责',
            '补充与岗位匹配的技能关键词，避免空洞的“了解/熟悉”',
            '教育/实习时间线清晰，经历按时间倒序排列',
            '控制篇幅：一页为主，重点突出与岗位匹配的部分',
            '每段经历都有“做了什么 + 用了什么技术 + 结果如何”',
            '删去与岗位无关或过于陈旧的内容，保持信息密度',
            '请他人或 AI 从 HR/技术视角帮你做一遍简历审阅'
        ];
        const ACTIONABLE_INTERVIEW = [
            '准备 2～3 个可深挖的项目：背景、难点、你的贡献、反思',
            '梳理常见算法题型与思路，限时手写 1～2 道练手',
            '准备 1～2 个行为面试案例：冲突解决、协作、失败复盘',
            '对简历每一条都能展开讲 2～3 分钟，并预判追问',
            '模拟面试：计时自述、让同学/朋友做面试官提问',
            '技术问题先答思路再答细节，不清楚的说明边界与可补充点',
            '准备“为什么选我们/职业规划”等通用问题的简洁回答',
            '面试前再看一遍岗位 JD，把要求与自己的经历做对应',
            '记录每次面试被问住的问题，事后补强并形成话术',
            '面试结尾可主动问 1～2 个与团队/业务相关的问题'
        ];
        const fillToTarget = (key, list) => {
            const existing = new Set(sec[key].map(s => String(s).trim()));
            for (const tip of list) {
                if (sec[key].length >= TARGET_PER_BOX) break;
                const t = String(tip).trim();
                if (!existing.has(t)) { sec[key].push(tip); existing.add(t); }
            }
        };
        fillToTarget('skill', ACTIONABLE_SKILL);
        fillToTarget('resume', ACTIONABLE_RESUME);
        fillToTarget('interview', ACTIONABLE_INTERVIEW);

        const uniq = (arr) => Array.from(new Set(arr.map(s => String(s).trim()).filter(Boolean))).slice(0, 25);
        sec.skill = uniq(sec.skill);
        sec.resume = uniq(sec.resume);
        sec.interview = uniq(sec.interview);
        return { ...sec, raw: md };
    }

    _cacheTrackingFailureAnalysis(recordId, rawText) {
        if (!recordId) return;
        const parsed = this._extractFailureSectionsFromText(rawText);
        this.trackingFailureAnalysisCache[recordId] = {
            ...parsed,
            ts: Date.now()
        };
    }

    _renderStreamingMarkdown(raw) {
        const md = this._normalizeStreamingText(raw);
        return `<div class="tracking-md">${this._simpleMarkdownToHtml(md)}</div>`;
    }

    _normalizeStreamingText(raw) {
        let s = raw == null ? '' : String(raw);
        // SSE 流可能返回 literal "\\n" 而不是换行
        s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ');
        // 常见的多余引号包裹
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('“') && s.endsWith('”'))) {
            s = s.slice(1, -1);
        }
        return s;
    }

    _simpleMarkdownToHtml(md) {
        const esc = (x) => String(x == null ? '' : x)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const renderInline = (s) => {
            let out = esc(s);
            // inline code
            out = out.replace(/`([^`]+?)`/g, '<code>$1</code>');
            // bold
            out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
            return out;
        };

        const parts = String(md || '').split('```');
        let html = '';
        for (let i = 0; i < parts.length; i++) {
            const chunk = parts[i] || '';
            if (i % 2 === 1) {
                html += `<pre><code>${esc(chunk.trim())}</code></pre>`;
                continue;
            }
            const lines = chunk.replace(/\r/g, '').split('\n');
            let inUl = false;
            let inOl = false;
            const closeLists = () => {
                if (inUl) { html += '</ul>'; inUl = false; }
                if (inOl) { html += '</ol>'; inOl = false; }
            };
            for (const line0 of lines) {
                const line = line0 || '';
                const t = line.trim();
                if (!t) {
                    closeLists();
                    html += '<div class="md-spacer"></div>';
                    continue;
                }
                const h3 = t.match(/^###\s+(.*)$/);
                const h2 = t.match(/^##\s+(.*)$/);
                const h1 = t.match(/^#\s+(.*)$/);
                if (h1 || h2 || h3) {
                    closeLists();
                    const text = renderInline((h3 || h2 || h1)[1]);
                    const tag = h1 ? 'h2' : h2 ? 'h3' : 'h4';
                    html += `<${tag}>${text}</${tag}>`;
                    continue;
                }
                const ul = t.match(/^[-*]\s+(.*)$/);
                if (ul) {
                    if (inOl) { html += '</ol>'; inOl = false; }
                    if (!inUl) { html += '<ul>'; inUl = true; }
                    html += `<li>${renderInline(ul[1])}</li>`;
                    continue;
                }
                const ol = t.match(/^(\d+)\.\s+(.*)$/);
                if (ol) {
                    if (inUl) { html += '</ul>'; inUl = false; }
                    if (!inOl) { html += '<ol>'; inOl = true; }
                    html += `<li>${renderInline(ol[2])}</li>`;
                    continue;
                }
                closeLists();
                html += `<p>${renderInline(t)}</p>`;
            }
            closeLists();
        }
        return html;
    }

    // Tab2：选中一条求职记录，渲染步骤条与备注
    selectTrackingJob(recordId) {
        this.trackingSelectedRecordId = recordId;
        document.querySelectorAll('#trackingPage .tracking-job-item').forEach(el => {
            el.classList.toggle('sel', el.dataset.recordId === recordId);
        });
        const record = this.trackingRecordsCache?.[recordId];
        this.renderTrackingSteps(record);
    }

    renderTrackingSteps(record) {
        const titleEl = document.getElementById('trackingUpdateDetailTitle');
        const stepsWrap = document.getElementById('trackingSteps');
        const noteEl = document.getElementById('trackingUpdateNotes');
        const noteLabel = document.querySelector('#trackingUpdateTab .tracking-note-label');
        const notePlaceholder = document.getElementById('trackingUpdateNotes');

        if (!record) {
            if (titleEl) titleEl.textContent = '🔄 进展详情';
            if (stepsWrap) stepsWrap.querySelectorAll('.tracking-step').forEach(s => s.classList.remove('done', 'cur', 'fail'));
            if (stepsWrap) stepsWrap.querySelectorAll('.tracking-sline').forEach(l => l.classList.remove('done'));
            if (noteEl) noteEl.value = '';
            if (noteLabel) noteLabel.textContent = '备注';
            return;
        }

        if (titleEl) titleEl.textContent = `🔄 进展详情 · ${(record.company_name || '')} ${record.job_title || '未命名岗位'}`;
        const stages = ['applied', 'written_test', 'interview_1', 'interview_2', 'final', 'offer'];
        const curStage = record.current_stage || 'applied';
        const result = record.result || 'pending';
        const isRejected = result === 'rejected' || result === 'failed';
        const curIdx = stages.indexOf(curStage);

        if (stepsWrap) {
            stepsWrap.querySelectorAll('.tracking-step').forEach((s, i) => {
                s.classList.remove('done', 'cur', 'fail');
                const stage = s.dataset.stage;
                const idx = stages.indexOf(stage);
                if (stage === curStage && isRejected) {
                    s.classList.add('fail');
                } else if (idx < curIdx || (idx === curIdx && !isRejected)) {
                    s.classList.add('done');
                } else if (idx === curIdx) {
                    s.classList.add('cur');
                }
            });
            stepsWrap.querySelectorAll('.tracking-sline').forEach((l, i) => {
                l.classList.toggle('done', i < curIdx);
            });
        }

        // 根据阶段切换备注标题与内容
        const stageNotes = (record.stage_notes && typeof record.stage_notes === 'object') ? record.stage_notes : {};
        let text = '';
        let labelText = '备注';
        let placeholderText = '记录备注…';
        if (curStage === 'applied') {
            text = stageNotes.applied || '';
            labelText = '投递备注';
            placeholderText = '记录投递时间、渠道、岗位链接等…';
        } else if (curStage === 'written_test') {
            text = stageNotes.written_test || '';
            labelText = '笔试备注';
            placeholderText = '记录笔试时间、题目类型、完成情况、自我感受…';
        } else if (curStage === 'interview_1') {
            // 一面备注
            text = stageNotes.interview_1 || '';
            labelText = '一面备注';
            placeholderText = '记录一面题目、面试官反馈、个人感受…';
        } else if (curStage === 'interview_2') {
            // 二面备注
            text = stageNotes.interview_2 || '';
            labelText = '二面备注';
            placeholderText = '记录二面题目、面试官反馈、个人感受…';
        } else if (curStage === 'final') {
            // HR 面备注
            text = stageNotes.final || '';
            labelText = 'HR 面备注';
            placeholderText = '记录 HR 面问题、沟通重点、个人感受…';
        } else if (curStage === 'rejected') {
            // 淘汰后的复盘备注
            text = stageNotes.rejected || '';
            labelText = '淘汰备注';
            placeholderText = '记录淘汰原因、复盘总结、后续改进计划…';
        } else if (curStage === 'offer') {
            text = stageNotes.offer || '';
            labelText = 'Offer 备注';
            placeholderText = '记录实习/转正时间、薪酬福利、到岗安排等…';
        }
        // 不再自动从旧的总备注回填，推进到新阶段时默认看到空白输入框
        if (noteEl) noteEl.value = text;
        if (noteLabel) noteLabel.textContent = labelText;
        if (notePlaceholder) notePlaceholder.placeholder = placeholderText;
    }

    getNextStage(currentStage) {
        const stages = ['applied', 'written_test', 'interview_1', 'interview_2', 'final', 'offer'];
        const i = stages.indexOf(currentStage);
        return i >= 0 && i < stages.length - 1 ? stages[i + 1] : currentStage;
    }

    async trackingAdvanceStage() {
        const recordId = this.trackingSelectedRecordId;
        const userId = getCurrentUserId();
        const record = this.trackingRecordsCache?.[recordId];
        if (!recordId || !userId || !record) {
            this.showToast('请先在左侧选择一条求职记录', 'error');
            return;
        }
        const next = this.getNextStage(record.current_stage || 'applied');
        if (next === (record.current_stage || 'applied')) {
            this.showToast('已是最终阶段', 'info');
            return;
        }
        // 推进到 Offer 阶段时必须传 result='offer'，总览里的「Offer 数量」才会计入
        const result = next === 'offer' ? 'offer' : 'passed';
        this.showLoading();
        const res = await updateTrackingRecord(recordId, { user_id: userId, stage: next, result });
        this.hideLoading();
        if (res && res.success) {
            this.showToast('进展已更新', 'success');
            // 仅本地更新当前记录与步骤/备注区域，不再整体刷新总览，避免页面晃动
            const updated = { ...record, current_stage: next, result };
            this.trackingRecordsCache[recordId] = updated;
            // 更新左侧当前选中项的状态文案（例如“进行中/已拿 Offer”），避免用户困惑
            const listEl = document.getElementById('trackingUpdateJobList');
            if (listEl) {
                const item = listEl.querySelector(`.tracking-job-item[data-record-id="${recordId}"]`);
                if (item) {
                    const p = item.querySelector('p');
                    if (p) {
                        const labelMap = { applied: '投递', written_test: '笔试', interview_1: '一面', interview_2: '二面', final: 'HR面', offer: 'Offer' };
                        const stageLabel = labelMap[next] || '进行中';
                        const status = result === 'offer' ? '已拿 Offer 🎉' : (result === 'rejected' || result === 'failed' ? `${stageLabel}淘汰` : '进行中');
                        const company = record.company_name || '';
                        p.textContent = `${company} · ${status}`;
                    }
                }
            }
            // 只刷新右侧当前记录的步骤与备注区域
            this.renderTrackingSteps(updated);
        } else {
            this.showToast((res && res.msg) || '更新失败', 'error');
        }
    }

    async trackingMarkRejected() {
        const recordId = this.trackingSelectedRecordId;
        const userId = getCurrentUserId();
        const record = this.trackingRecordsCache?.[recordId];
        if (!recordId || !userId || !record) {
            this.showToast('请先在左侧选择一条求职记录', 'error');
            return;
        }
        // 兼容后端：淘汰既可能通过 result 标识，也可能通过 stage 标识
        // 这里同时写入 stage=rejected 与 result=rejected，确保总览/失败列表都能正确识别
        const stage = 'rejected';
        this.showLoading();
        const res = await updateTrackingRecord(recordId, { user_id: userId, stage, result: 'rejected' });
        this.hideLoading();
        if (res && res.success) {
            this.showToast('已标记为淘汰', 'success');
            const updated = { ...record, current_stage: 'rejected', result: 'rejected' };
            this.trackingRecordsCache[recordId] = updated;

            // 同步更新总览数据，使失败反馈分析和总览能立即反映淘汰状态（不重新拉接口，仅本地更新）
            const recs = this.trackingOverviewRecords || [];
            const idx = recs.findIndex(r => r && r.record_id === recordId);
            if (idx >= 0) {
                recs[idx] = { ...recs[idx], current_stage: 'rejected', result: 'rejected' };
            }
            const summary = this.trackingOverviewSummary || {};
            const newRejected = (Number(summary.rejected_count) || 0) + 1;
            const newInProgress = Math.max(0, (Number(summary.in_progress_count) || 0) - 1);
            this.trackingOverviewSummary = { ...summary, rejected_count: newRejected, in_progress_count: newInProgress };

            // 重新渲染总览（失败列表、KPI、图表等），不调用 loadTrackingData，避免整页闪烁
            this.renderTrackingOverview({
                summary: this.trackingOverviewSummary,
                records: recs,
                agent_insight: this.trackingAgentInsight ?? null
            });

            // 保持当前选中并刷新右侧步骤与备注
            this.trackingSelectedRecordId = recordId;
            this.renderTrackingSteps(updated);
        } else {
            this.showToast((res && res.msg) || '更新失败', 'error');
        }
    }

    async trackingSaveNote() {
        const recordId = this.trackingSelectedRecordId;
        const userId = getCurrentUserId();
        const record = this.trackingRecordsCache?.[recordId];
        const notes = document.getElementById('trackingUpdateNotes')?.value || '';
        if (!recordId || !userId || !record) {
            this.showToast('请先在左侧选择一条求职记录', 'error');
            return;
        }
        const stage = record.current_stage || 'applied';
        const result = record.result || 'pending';
        this.showLoading();
        // 以阶段为维度拆分备注：投递 / 笔试 / 一面 / 二面 / HR 面 / Offer
        const stageKey = (function (s) {
            if (s === 'applied') return 'applied';
            if (s === 'written_test') return 'written_test';
            if (s === 'offer') return 'offer';
            // 面试轮次各自独立存储，旧数据仍可通过 stage_notes.interview 读取
            if (s === 'interview_1') return 'interview_1';
            if (s === 'interview_2') return 'interview_2';
            if (s === 'final') return 'final';
            return s || 'interview';
        })(stage);
        const existingStageNotes = (record.stage_notes && typeof record.stage_notes === 'object') ? record.stage_notes : {};
        const stage_notes = { ...existingStageNotes, [stageKey]: notes };

        const res = await updateTrackingRecord(recordId, { user_id: userId, stage, result, notes, stage_notes });
        this.hideLoading();
        if (res && res.success) {
            this.showToast('备注已保存', 'success');
            if (record) {
                record.notes = notes;
                record.stage_notes = stage_notes;
            }
        } else {
            this.showToast((res && res.msg) || '保存失败', 'error');
        }
    }

    async saveFailureAsReport() {
        const userId = getCurrentUserId();
        if (!userId) {
            this.showToast('用户未登录', 'error');
            return;
        }
        const recordId = this.trackingSelectedFailureRecordId;
        if (!recordId) {
            this.showToast('请先在左侧选择一条失败记录', 'error');
            return;
        }
        this.showLoading();
        try {
            const res = await saveFailureReport(recordId, userId);
            this.hideLoading();
            if (res && res.success) {
                this.showToast('已保存到反馈报告列表', 'success');
                // 重新加载一次报告列表，让新报告立刻出现在 Tab5
                await this.loadTrackingData();
            } else {
                this.showToast((res && res.msg) || '保存失败', 'error');
            }
        } catch (e) {
            this.hideLoading();
            this.showToast('保存失败，请稍后重试', 'error');
        }
    }

    async deleteTrackingJob(recordId) {
        const userId = getCurrentUserId();
        if (!recordId || !userId) {
            this.showToast('用户信息缺失，无法删除', 'error');
            return;
        }
        if (!window.confirm('确定要删除这条求职记录吗？此操作不可恢复。')) {
            return;
        }
        this.showLoading();
        try {
            const res = await deleteTrackingRecord(recordId, userId);
            this.hideLoading();
            if (res && res.success) {
                this.showToast('记录已删除', 'success');
                // 从缓存中移除并刷新总览
                if (this.trackingRecordsCache) {
                    delete this.trackingRecordsCache[recordId];
                }
                if (this.trackingRecords) {
                    this.trackingRecords = this.trackingRecords.filter(r => r.record_id !== recordId);
                }
                if (this.trackingSelectedRecordId === recordId) {
                    this.trackingSelectedRecordId = null;
                    this.renderTrackingSteps(null);
                }
                // 重新加载求职跟踪数据（总览 + 左侧列表 + 报告），确保 UI 中这条记录消失
                await this.loadTrackingData();
            } else {
                this.showToast((res && res.msg) || '删除失败', 'error');
            }
        } catch (e) {
            this.hideLoading();
            this.showToast('删除失败，请稍后重试', 'error');
        }
    }

    openTrackingNoteModal() {
        const modal = document.getElementById('trackingNoteModal');
        const body = document.getElementById('trackingNoteModalBody');
        const recordId = this.trackingSelectedRecordId;
        const record = this.trackingRecordsCache?.[recordId];
        if (!modal || !body) return;
        if (!record) {
            this.showToast('请先在左侧选择一条求职记录', 'error');
            return;
        }
        const esc = (s) => (s == null ? '' : String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;'));
        const stageNotes = (record.stage_notes && typeof record.stage_notes === 'object') ? record.stage_notes : {};
        const sections = [];
        const pushSection = (label, key) => {
            const txt = stageNotes[key];
            if (txt && String(txt).trim()) {
                sections.push(
                    `<h4>${esc(label)}</h4><p>${esc(txt).replace(/\n/g, '<br>')}</p>`
                );
            }
        };
        pushSection('投递备注', 'applied');
        pushSection('笔试备注', 'written_test');
        pushSection('一面备注', 'interview_1');
        pushSection('二面备注', 'interview_2');
        pushSection('HR 面备注', 'final');
        pushSection('淘汰备注', 'rejected');
        // 兼容旧数据：如果只有通用的面试备注字段
        pushSection('面试备注', 'interview');
        if (!sections.length) {
            const fallback = record.notes || '';
            body.innerHTML = fallback
                ? `<p>${esc(fallback).replace(/\n/g, '<br>')}</p>`
                : '<p class="hint-text">暂无备注</p>';
        } else {
            body.innerHTML = sections.join('<hr class="tracking-note-sep">');
        }
        modal.classList.remove('hidden');
    }

    closeTrackingNoteModal() {
        const modal = document.getElementById('trackingNoteModal');
        if (modal) modal.classList.add('hidden');
    }

    // Tab3：选中失败记录，展示 AI 分析三列
    selectTrackingFailure(recordId) {
        this.trackingSelectedFailureRecordId = recordId;
        document.querySelectorAll('#trackingPage .tracking-fail-item').forEach(el => {
            el.classList.toggle('sel', el.dataset.recordId === recordId);
        });
        this.renderTrackingFailureAnalysis(recordId);
    }

    renderTrackingFailureAnalysis(recordId) {
        const titleEl = document.getElementById('trackingAnalysisTitle');
        const record = this.trackingRecordsCache?.[recordId];
        const report = this._getLatestFailureReportForRecord(record);
        const skillEl = document.getElementById('trackingAnalysisSkillGap');
        const resumeEl = document.getElementById('trackingAnalysisResume');
        const interviewEl = document.getElementById('trackingAnalysisInterview');
        const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        if (!record) {
            if (titleEl) titleEl.textContent = '🤖 AI 失败分析';
            if (skillEl) skillEl.innerHTML = '';
            if (resumeEl) resumeEl.innerHTML = '';
            if (interviewEl) interviewEl.innerHTML = '';
            return;
        }
        if (titleEl) titleEl.textContent = `🤖 AI 失败分析 · ${esc(record.company_name)} ${record.job_title || '未命名岗位'}`;
        const kw = (report && report.key_weakness) ? String(report.key_weakness) : '';
        const cached = this.trackingFailureAnalysisCache?.[recordId];
        // 优先使用“流式完整分析”（内容更全），没有时再用报告 key_weakness
        const source = (cached && cached.raw) ? cached.raw : kw;
        const parsed = this._extractFailureSectionsFromText(source);
        const toLi = (arr) => arr.length ? arr.map(x => `<li>${esc(x)}</li>`).join('') : '<li class="hint-text">暂无内容，可点击「重新生成AI分析」</li>';
        if (skillEl) skillEl.innerHTML = toLi(parsed.skill || []);
        if (resumeEl) resumeEl.innerHTML = toLi(parsed.resume || []);
        if (interviewEl) interviewEl.innerHTML = toLi(parsed.interview || []);
    }

    trackingOpenFailureModalForRegen() {
        const record = this.trackingSelectedFailureRecordId ? this.trackingRecordsCache?.[this.trackingSelectedFailureRecordId] : null;
        if (!record) {
            this.showToast('请先在左侧选择一条失败记录', 'error');
            return;
        }
        this.openTrackingFailureModal(record);
    }

    openTrackingFullAnalysisModal() {
        const recordId = this.trackingSelectedFailureRecordId;
        const record = this.trackingRecordsCache?.[recordId];
        const report = this._getLatestFailureReportForRecord(record);
        const modal = document.getElementById('trackingFullAnalysisModal');
        const subEl = document.getElementById('trackingFullAnalysisSubtitle');
        const skillEl = document.getElementById('trackingFullAnalysisSkillGap');
        const resumeEl = document.getElementById('trackingFullAnalysisResume');
        const interviewEl = document.getElementById('trackingFullAnalysisInterview');
        if (!record) {
            this.showToast('请先在左侧选择一条失败记录', 'error');
            return;
        }
        const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        if (subEl) subEl.textContent = `${record.company_name || ''} · ${record.job_title || ''} · ${report ? (report.created_at || '') : ''}`;
        const kw = (report && report.key_weakness) ? String(report.key_weakness) : '';
        const cached = this.trackingFailureAnalysisCache?.[recordId];
        const source = (cached && cached.raw) ? cached.raw : kw;
        const parsed = this._extractFailureSectionsFromText(source);
        const toLi = (arr) => arr.length ? arr.map(x => `<li>${esc(x)}</li>`).join('') : '<li>暂无</li>';
        if (skillEl) skillEl.innerHTML = toLi(parsed.skill || []);
        if (resumeEl) resumeEl.innerHTML = toLi(parsed.resume || []);
        if (interviewEl) interviewEl.innerHTML = toLi(parsed.interview || []);
        if (modal) modal.classList.remove('hidden');
    }

    closeTrackingFullAnalysisModal() {
        const modal = document.getElementById('trackingFullAnalysisModal');
        if (modal) modal.classList.add('hidden');
    }

    // Tab5：选中报告，右侧显示详情
    selectTrackingReport(reportId) {
        document.querySelectorAll('#trackingPage .tracking-rpt-card').forEach(el => {
            el.classList.toggle('sel', el.dataset.reportId === reportId);
        });
        const report = this.trackingReportsCache?.[reportId];
        const detailEl = document.getElementById('trackingReportDetail');
        if (!detailEl) return;
        if (!report) {
            detailEl.innerHTML = '<p class="tracking-rpt-detail-placeholder">左侧选择一份报告查看详情</p>';
            return;
        }
        const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        const title = `${report.job_title || ''} · ${report.company_name || ''} 失败复盘`;
        // 与 Tab3 同步：优先用“流式完整分析缓存”，没有再用报告摘要 key_weakness
        const cachedRaw = this._getCachedRawForReport(report);
        const source = cachedRaw || String(report.key_weakness || '');
        const parsed = this._extractFailureSectionsFromText(source);
        const toUl = (arr) => arr && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<ul><li>—</li></ul>';
        detailEl.innerHTML = `
            <h3>${esc(title)}</h3>
            <div class="tracking-detail-section"><h4>🔍 技能 Gap 分析</h4>${toUl(parsed.skill)}</div>
            <div class="tracking-detail-section"><h4>📄 简历优化建议</h4>${toUl(parsed.resume)}</div>
            <div class="tracking-detail-section"><h4>🗣️ 面试准备行动计划</h4>${toUl(parsed.interview)}</div>
        `;
    }

    // Tab4：总览图表（漏斗 + 折线 + 饼图）
    initTrackingCharts() {
        const summary = this.trackingOverviewSummary || {};
        const records = this.trackingOverviewRecords || [];
        if (typeof echarts === 'undefined') return;

        const funnelDom = document.getElementById('trackingFunnelChart');
        if (funnelDom && summary.total_applied != null) {
            // 用横向 progress bar 统计替代 ECharts 漏斗图，且不强制最小为 1
            this.initTrackingFunnel(summary);
        }

        const lineDom = document.getElementById('trackingLineChart');
        if (lineDom) {
            const byDate = {};
            records.forEach(r => {
                // 近 30 天投递趋势：时间轴以投递时间为准，若无投递时间再回退到最后更新时间
                const d = (r.apply_date || r.last_updated || '').slice(0, 10);
                if (d) byDate[d] = (byDate[d] || 0) + 1;
            });
            const sorted = Object.keys(byDate).sort().slice(-14);
            const lineChart = echarts.init(lineDom);
            lineChart.setOption({
                tooltip: { trigger: 'axis' },
                grid: { top: 8, right: 8, bottom: 24, left: 36 },
                xAxis: { type: 'category', data: sorted.length ? sorted : ['—'], axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { fontSize: 10 } },
                series: [{ data: sorted.map(d => byDate[d] || 0), type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#2d5be3', width: 2 }, itemStyle: { color: '#2d5be3' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(45,91,227,0.2)' }, { offset: 1, color: 'rgba(45,91,227,0.02)' }] } } }]
            });
        }

        const pieDom = document.getElementById('trackingPieChart');
        if (pieDom) {
            const stageCount = { offer: 0, rejected: 0, inProgress: 0, applied: 0 };
            const isOffer = (r) => r.result === 'offer' || ((r.current_stage || r.stage || '').toString().toLowerCase() === 'offer');
            records.forEach(r => {
                if (isOffer(r)) stageCount.offer++;
                else if (r.result === 'rejected' || r.result === 'failed' || r.current_stage === 'rejected') stageCount.rejected++;
                else if (r.current_stage === 'applied') stageCount.applied++;
                else stageCount.inProgress++;
            });
            const pieData = [
                { value: stageCount.inProgress, name: '进行中' },
                { value: stageCount.offer, name: 'Offer' },
                { value: stageCount.rejected, name: '淘汰' },
                { value: stageCount.applied, name: '待跟进' }
            ].filter(d => d.value > 0);
            if (!pieData.length) pieData.push({ value: 1, name: '暂无' });
            const pieChart = echarts.init(pieDom);
            pieChart.setOption({
                tooltip: { trigger: 'item' },
                color: ['#2d5be3', '#22c55e', '#ef4444', '#f59e0b'],
                series: [{ type: 'pie', radius: ['40%', '70%'], padAngle: 3, label: { fontSize: 11 }, data: pieData }]
            });
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

    // 根据个人档案数据分析能力得分
    analyzeAbilitiesFromProfile(profileData) {
        const MIN_SCORE = 30; // 最低分值
        const maxScore = function(score) {
            return Math.min(100, Math.max(MIN_SCORE, score));
        };
        
        const ps = profileData.professional_skills || {};
        const innovation = profileData.innovation_ability || {};
        const learning = profileData.learning_ability || {};
        const pressure = profileData.pressure_resistance || {};
        const comm = profileData.communication_ability || {};
        const exp = profileData.practical_experience || {};
        
        let professionalSkillsScore = ps.overall_score || ps.score || 0;
        let innovationScore = innovation.score || 0;
        let learningScore = learning.score || 0;
        let pressureScore = pressure.assessment_score || pressure.score || 0;
        let communicationScore = comm.overall_score || comm.score || 0;
        let experienceScore = exp.overall_score || exp.score || 0;
        
        const skills = profileData.skills || [];
        const hasSkills = Array.isArray(skills) && skills.length > 0;
        if (hasSkills && professionalSkillsScore < MIN_SCORE) {
            professionalSkillsScore = MIN_SCORE + 10;
        }
        
        const basicInfo = profileData.basic_info || {};
        const hasSummary = basicInfo.summary && basicInfo.summary.length > 20;
        if (hasSummary && innovationScore < MIN_SCORE) {
            innovationScore = MIN_SCORE + 5;
        }
        
        const educationInfo = profileData.education_info || {};
        const hasEducation = educationInfo.school || educationInfo.major;
        if (hasEducation && learningScore < MIN_SCORE) {
            learningScore = MIN_SCORE + 15;
        }
        
        const internships = profileData.internships || [];
        const projects = profileData.projects || [];
        const hasExperience = (Array.isArray(internships) && internships.length > 0) || 
                             (Array.isArray(projects) && projects.length > 0);
        if (hasExperience) {
            if (experienceScore < MIN_SCORE) {
                experienceScore = MIN_SCORE + 20;
            }
            if (communicationScore < MIN_SCORE) {
                communicationScore = MIN_SCORE + 10;
            }
            if (pressureScore < MIN_SCORE) {
                pressureScore = MIN_SCORE + 10;
            }
        }
        
        if (professionalSkillsScore === 0) professionalSkillsScore = MIN_SCORE;
        if (innovationScore === 0) innovationScore = MIN_SCORE;
        if (learningScore === 0) learningScore = MIN_SCORE;
        if (pressureScore === 0) pressureScore = MIN_SCORE;
        if (communicationScore === 0) communicationScore = MIN_SCORE;
        if (experienceScore === 0) experienceScore = MIN_SCORE;
        
        return {
            professionalSkills: maxScore(professionalSkillsScore),
            innovation: maxScore(innovationScore),
            learning: maxScore(learningScore),
            pressure: maxScore(pressureScore),
            communication: maxScore(communicationScore),
            experience: maxScore(experienceScore)
        };
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
        
        // 根据个人档案数据分析当前能力（带最低值30分）
        const currentAbilities = this.analyzeAbilitiesFromProfile(data);
        
        // 统一的行业平均水平数据
        const industryAverage = {
            professionalSkills: 80,
            innovation: 75,
            learning: 85,
            pressure: 70,
            communication: 80,
            experience: 75
        };

        let html = `
            <div class="ability-profile-new-layout">
                <!-- 第一行：综合竞争力评分 + 能力六维雷达图 -->
                <div class="ability-profile-row">
                    <!-- 综合竞争力评分 -->
                    <div class="ability-profile-card competitiveness-card" style="max-width: 350px;">
                        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                                <h3 style="margin: 0;">🏆 综合竞争力评分</h3>
                            </div>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                                <div style="text-align: center; margin-bottom: 12px;">
                                    <div style="font-size: 28px; font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">${overall.competitiveness || '-'}</div>
                                    <div style="font-size: 14px; color: var(--text-secondary);">综合竞争力评分</div>
                                </div>
                                <div id="competitivenessGauge" style="width: 160px; height: 160px; margin: 0 auto;"></div>
                                <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: 2px;">
                                    <div style="background-color: #e6f7ff; padding: 10px 20px; border-radius: 8px; margin-bottom: 12px; text-align: center;">
                                        <div style="font-size: 22px; font-weight: 600; color: var(--primary-color); margin-bottom: 2px;">Top ${overall.percentile || '-'}${overall.percentile ? '%' : ''}</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">同专业学生中的百分位排名</div>
                                    </div>
                                    <div style="background-color: #f5f5f5; padding: 14px; border-radius: 8px; width: 100%; max-width: 280px;">
                                        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: var(--text-primary); text-align: center;">优势/待提升</h4>
                                        <div style="display: flex; flex-direction: column; gap: 6px;">
                                            ${(overall.strengths || []).slice(0, 2).map(strength => `
                                                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                                                    <span style="color: #52c41a;">✅</span>
                                                    <span style="color: var(--text-secondary);">${strength || ''}</span>
                                                </div>
                                            `).join('')}
                                            ${(overall.weaknesses || []).slice(0, 2).map(weakness => `
                                                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                                                    <span style="color: #faad14;">⚠️</span>
                                                    <span style="color: var(--text-secondary);">${weakness || ''}</span>
                                                </div>
                                            `).join('')}
                                            ${(!overall.strengths || overall.strengths.length === 0) && (!overall.weaknesses || overall.weaknesses.length === 0) ? `
                                                <div style="text-align: center; font-size: 13px; color: var(--text-secondary);">
                                                    暂无分析数据
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 能力六维雷达图 -->
                    <div class="ability-profile-card radar-card">
                        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                                <h3 style="margin: 0;">📊 能力六维雷达图</h3>
                                <div style="font-size: 14px; color: var(--text-secondary);">vs 行业平均水平</div>
                            </div>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                <div id="abilityRadarChart" style="width: 100%; height: 400px; margin-right: 10px; margin-bottom: 0;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第二行：专业技能详情 -->
                <div class="ability-profile-row">
                    <!-- 专业技能详情 -->
                    <div class="ability-profile-card skills-card" style="flex: 1 1 100%;">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                                <h3 style="margin: 0;">💻 专业技能详情</h3>
                                <div style="font-size: 16px; font-weight: 600; color: var(--primary-color);">综合得分 ${ps.overall_score ?? '-'}分</div>
                            </div>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                ${((ps.programming_languages && ps.programming_languages.length > 0) || (ps.frameworks_tools && ps.frameworks_tools.length > 0) || (ps.domain_knowledge && ps.domain_knowledge.length > 0)) ? `
                                    ${ps.programming_languages && ps.programming_languages.length > 0 ? this.renderSkillDetail(ps.programming_languages, '编程语言', ps.overall_score || 60) : ''}
                                    ${ps.frameworks_tools && ps.frameworks_tools.length > 0 ? this.renderSkillDetail(ps.frameworks_tools, '框架工具', ps.overall_score || 60) : ''}
                                    ${ps.domain_knowledge && ps.domain_knowledge.length > 0 ? this.renderSkillDetail(ps.domain_knowledge, '领域知识', ps.overall_score || 60) : ''}
                                ` : `
                                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background-color: #f5f5f5; border-radius: 8px;">
                                        <div style="font-size: 32px; margin-bottom: 12px;">💻</div>
                                        <div style="font-size: 16px; color: var(--text-secondary); margin-bottom: 16px;">暂未填写专业技能</div>
                                        <button type="button" class="btn-primary" onclick="document.querySelector('[data-page=profile]').click()" style="padding: 8px 20px; border: none; border-radius: 4px; background-color: var(--primary-color); color: white; font-size: 14px; cursor: pointer;">去填写技能</button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第三行：就业市场需求分析 + 实习/项目经历 -->
                <div class="ability-profile-row">
                    <!-- 就业市场需求分析 -->
                    <div class="ability-profile-card market-demand-card">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <h3 style="margin: 0 0 12px 0;">📊 就业市场需求分析</h3>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                <div style="margin-bottom: 16px;">
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">行业通用能力要求</h4>
                                    <div style="padding: 16px; background-color: #e6f7ff; border-radius: 8px; border: 1px solid #91d5ff; margin-bottom: 16px;">
                                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 12px;">IT行业通用要求</div>
                                        <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                            <li>扎实的专业基础知识和编程能力</li>
                                            <li>良好的学习能力和问题解决能力</li>
                                            <li>团队协作和沟通能力</li>
                                            <li>具备一定的项目实践经验</li>
                                            <li>持续学习和关注行业技术趋势</li>
                                        </ul>
                                    </div>
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">相关岗位能力要求</h4>
                                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                        <div style="flex: 1; min-width: 150px; padding: 12px; background-color: #f6ffed; border-radius: 8px; border: 1px solid #b7eb8f;">
                                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px;">机器学习工程师</div>
                                            <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                                <li>机器学习算法调优</li>
                                                <li>数据处理与特征工程</li>
                                                <li>模型部署与优化</li>
                                            </ul>
                                        </div>
                                        <div style="flex: 1; min-width: 150px; padding: 12px; background-color: #f6ffed; border-radius: 8px; border: 1px solid #b7eb8f;">
                                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px;">数据科学家</div>
                                            <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                                <li>数据分析与可视化</li>
                                                <li>统计建模</li>
                                                <li>业务问题解决</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">行业趋势洞察</h4>
                                    <div style="padding: 12px; background-color: #f5f5f5; border-radius: 8px; border: 1px solid #d9d9d9;">
                                        <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                            <li>AI领域人才需求持续增长，算法工程师供不应求</li>
                                            <li>大模型相关技术成为热点，掌握相关技能者更具竞争力</li>
                                            <li>企业对算法落地能力要求提高，注重实际项目经验</li>
                                            <li>跨领域复合型人才（如算法+行业知识）更受青睐</li>
                                            <li>算法工程师薪资水平在IT行业中处于较高水平</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 实习/项目经历 -->
                    <div class="ability-profile-card experience-card">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <h3 style="margin: 0 0 12px 0;">📁 实习/项目经历</h3>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                ${this.renderExperienceTimeline(data.internships, 'internship')}
                                ${this.renderExperienceTimeline(data.projects, 'project')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第四行：证书资质 + 职业规划建议 -->
                <div class="ability-profile-row">
                    <!-- 证书资质 -->
                    <div class="ability-profile-card certificates-card">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                                <h3 style="margin: 0;">📜 证书资质</h3>
                                <div style="font-size: 14px; color: var(--text-secondary);">待提升</div>
                            </div>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                ${(cert.items || []).length ? `
                                    <div style="margin-bottom: 20px;">
                                        ${cert.items.map(c => `<p style="text-align: center; margin: 8px 0;">${c.name || '-'} ${c.level ? '(' + c.level + ')' : ''}</p>`).join('')}
                                    </div>
                                ` : `
                                    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 0; margin-bottom: 20px;">
                                        <div style="font-size: 32px; margin-bottom: 12px;">📄</div>
                                        <div style="font-size: 16px; margin-bottom: 16px;">暂无深入证书</div>
                                    </div>
                                `}
                                <div style="margin-top: 20px; padding: 16px; background-color: #fff7e6; border-radius: 8px;">
                                    <h4 style="margin-bottom: 16px; font-size: 14px; font-weight: 600; color: var(--text-primary);">建议考取以下证书提升竞争力</h4>
                                    <ul style="list-style-position: inside; padding: 0; margin: 0;">
                                        <li style="margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">软件设计师（软考中级）</li>
                                        <li style="margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">AWS/阿里云云计算认证</li>
                                        <li style="margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">英语四六级</li>
                                        <li style="margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">PMP项目管理认证</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 职业规划建议 -->
                    <div class="ability-profile-card career-plan-card">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <h3 style="margin: 0 0 12px 0;">🎯 职业规划建议</h3>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                <div style="margin-bottom: 20px;">
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">就业能力分析</h4>
                                    <div style="padding: 12px; background-color: #f0f5ff; border-radius: 8px; border: 1px solid #adc6ff;">
                                        <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                            <li>优势：实践经验丰富（90分），学习能力强（77分）</li>
                                            <li>劣势：创新能力不足（0分），专业技能有待提升（62分）</li>
                                            <li>机会：AI领域人才需求大，技术+行业知识复合型人才受欢迎</li>
                                            <li>威胁：就业竞争激烈，行业技术迭代快</li>
                                        </ul>
                                    </div>
                                </div>
                                <div style="margin-bottom: 20px;">
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">行动计划</h4>
                                    <div style="padding: 12px; background-color: #f7f7f7; border-radius: 8px; border: 1px solid #d9d9d9;">
                                        <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                            <li>短期（3-6个月）：考取软件设计师证书，提升专业技能</li>
                                            <li>中期（6-12个月）：参与AI相关项目，积累实战经验</li>
                                            <li>长期（1-2年）：定位算法工程师方向，持续学习前沿技术</li>
                                            <li>持续：关注行业动态，建立专业人脉网络</li>
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">求职建议</h4>
                                    <div style="padding: 12px; background-color: #fff7e6; border-radius: 8px; border: 1px solid #ffd591;">
                                        <ul style="list-style-position: inside; padding: 0; margin: 0; font-size: 12px; color: var(--text-secondary);">
                                            <li>突出项目经验和实践能力，这是你的核心优势</li>
                                            <li>针对目标岗位定制简历，强调相关技能和项目成果</li>
                                            <li>提前准备技术面试，重点复习算法和数据结构</li>
                                            <li>利用实习经历建立的人脉，获取内推机会</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第五行：与目标岗位差距分析 -->
                <div class="ability-profile-row">
                    <!-- 与目标岗位差距分析 -->
                    <div class="ability-profile-card gap-analysis-card" style="flex: 1 1 100%;">
                        <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                            <h3 style="margin: 0 0 12px 0;">🎯 与行业平均水平差距分析</h3>
                            <div style="width: 100%; height: 1px; background-color: #f0f0f0; margin-bottom: 20px;"></div>
                            <div style="width: 100%;">
                                <div style="text-align: center; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary);">对比基准: 行业平均水平</div>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                    ${this.renderGapAnalysis('专业技能', currentAbilities.professionalSkills, industryAverage.professionalSkills)}
                                    ${this.renderGapAnalysis('实践经验', currentAbilities.experience, industryAverage.experience)}
                                    ${this.renderGapAnalysis('创新能力', currentAbilities.innovation, industryAverage.innovation)}
                                    ${this.renderGapAnalysis('学习能力', currentAbilities.learning, industryAverage.learning)}
                                    ${this.renderGapAnalysis('沟通能力', currentAbilities.communication, industryAverage.communication)}
                                    ${this.renderGapAnalysis('抗压能力', currentAbilities.pressure, industryAverage.pressure)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        
        // 初始化雷达图
        this.initAbilityRadarChart(currentAbilities, industryAverage);
        
        // 初始化竞争力仪表盘
        this.initCompetitivenessGauge(data);
    }
    
    // 渲染技能详情
    renderSkillDetail(skills, title, totalScore) {
        // 根据技能类型设置不同的固定颜色
        let barColor = '';
        switch (title) {
            case '编程语言':
                barColor = '#1890ff'; // 蓝色
                break;
            case '框架工具':
                barColor = '#52c41a'; // 绿色
                break;
            case '领域知识':
                barColor = '#722ed1'; // 紫色
                break;
            case '数据结构':
                barColor = '#fa8c16'; // 橙色
                break;
            default:
                barColor = '#1890ff'; // 默认蓝色
        }
        
        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 14px; font-weight: 500; color: var(--text-primary);">${title}</span>
                    <span style="font-size: 14px; font-weight: 600; color: ${barColor};">${totalScore}</span>
                </div>
                <div style="width: 100%; height: 6px; background-color: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                    <div style="height: 100%; background-color: ${barColor}; border-radius: 3px; width: ${totalScore}%;"></div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${skills && skills.length > 0 ? skills.map(skill => {
                        const name = skill.skill || skill.domain || '-';
                        const level = skill.level || '熟悉';
                        
                        return `
                            <span style="background-color: #f0f0f0; padding: 4px 12px; border-radius: 16px; font-size: 12px; color: ${barColor};">
                                ${name} (${level})
                            </span>
                        `;
                    }).join('') : '<span style="font-size: 12px; color: var(--text-secondary);">暂无数据</span>'}
                </div>
            </div>
        `;
    }
    
    // 渲染差距分析
    renderGapAnalysis(dimension, current, target) {
        const gap = target - current;
        const gapPercentage = Math.round((gap / target) * 100);
        const matchPercentage = Math.round((current / target) * 100);
        
        let gapLevel = '';
        let gapColor = '';
        let suggestion = '';
        
        if (current >= target) {
            gapLevel = '表现优异';
            gapColor = '#52c41a';
            suggestion = '继续保持并寻求进阶机会，考虑挑战更高级别的任务。';
        } else if (gapPercentage <= 10) {
            gapLevel = '达标在望';
            gapColor = '#1890ff';
            suggestion = '通过短期集中学习和实践，可快速达到目标要求。';
        } else if (gapPercentage <= 25) {
            gapLevel = '需要提升';
            gapColor = '#faad14';
            suggestion = '制定系统性学习计划，重点提升相关技能和经验。';
        } else {
            gapLevel = '重点加强';
            gapColor = '#f5222d';
            suggestion = '需要投入大量时间和精力，考虑寻求专业指导或培训。';
        }
        
        // 根据维度提供更具体的建议
        let specificSuggestion = '';
        switch (dimension) {
            case '专业技能':
                specificSuggestion = '建议通过项目实践和技术学习提升专业技能，关注行业最新技术趋势。';
                break;
            case '创新能力':
                specificSuggestion = '建议多参与创新项目，培养批判性思维和解决问题的能力。';
                break;
            case '学习能力':
                specificSuggestion = '建议制定系统的学习计划，培养快速学习和知识整合的能力。';
                break;
            case '抗压能力':
                specificSuggestion = '建议通过时间管理和压力调节技巧，提升在高压环境下的表现。';
                break;
            case '沟通能力':
                specificSuggestion = '建议多参与团队合作和演讲活动，提升表达和倾听能力。';
                break;
            case '项目经验':
                specificSuggestion = '建议多参与实际项目，积累不同类型项目的经验，关注项目管理和团队协作。';
                break;
            default:
                specificSuggestion = '根据自身情况制定个性化提升计划，定期评估进展。';
        }
        
        return `
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 12px; margin-bottom: 16px; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid ${gapColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${dimension}</h4>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="display: flex; align-items: baseline; gap: 8px;">
                                <span style="font-size: 18px; font-weight: 700; color: ${gapColor};">${current}</span>
                                <span style="font-size: 13px; color: var(--text-secondary);">/ ${target}</span>
                            </div>
                            <span style="font-size: 12px; font-weight: 500; color: white; background-color: ${gapColor}; padding: 2px 8px; border-radius: 10px;">${gapLevel}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <span style="font-size: 11px; color: var(--text-secondary);">匹配度</span>
                        <span style="font-size: 14px; font-weight: 700; color: ${gapColor};">${matchPercentage}%</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${gapColor};"></div>
                            <span style="font-size: 13px; font-weight: 500; color: var(--text-primary);">差距分析</span>
                        </div>
                        <div style="padding: 14px; background-color: #f8f9fa; border-radius: 8px; min-height: 100px;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                                ${current >= target ? 
                                    `您的${dimension}已超出目标岗位要求，具备较强的竞争力。` : 
                                    `您的${dimension}与目标岗位要求存在${gapPercentage}%的差距，需要针对性提升。`}
                            </p>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span style="font-size: 11px; color: var(--text-secondary);">当前水平</span>
                                        <span style="font-size: 11px; font-weight: 500; color: ${gapColor};">${current}分</span>
                                    </div>
                                    <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; background-color: ${gapColor}; width: ${Math.min((current / 100) * 100, 100)}%; border-radius: 3px;"></div>
                                    </div>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span style="font-size: 11px; color: var(--text-secondary);">目标要求</span>
                                        <span style="font-size: 11px; font-weight: 500; color: #1890ff;">${target}分</span>
                                    </div>
                                    <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; background-color: #1890ff; width: ${Math.min((target / 100) * 100, 100)}%; border-radius: 3px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #1890ff;"></div>
                            <span style="font-size: 13px; font-weight: 500; color: var(--text-primary);">提升建议</span>
                        </div>
                        <div style="padding: 14px; background-color: #e6f7ff; border-radius: 8px; min-height: 100px; border: 1px solid #91d5ff;">
                            <ul style="margin: 0; padding-left: 16px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); gap: 8px; display: flex; flex-direction: column;">
                                <li style="margin: 0;">${suggestion}</li>
                                <li style="margin: 0;">${specificSuggestion}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 初始化能力雷达图
    initAbilityRadarChart(currentAbilities, industryAverage) {
        const chartDom = document.getElementById('abilityRadarChart');
        if (!chartDom) return;
        
        const myChart = echarts.init(chartDom);
        
        // 准备数据
        const indicators = [
            { name: '专业技能', max: 100 },
            { name: '创新能力', max: 100 },
            { name: '学习能力', max: 100 },
            { name: '抗压能力', max: 100 },
            { name: '沟通能力', max: 100 },
            { name: '实践经验', max: 100 }
        ];
        
        const seriesData = [
            {
                value: [
                    currentAbilities.professionalSkills,
                    currentAbilities.innovation,
                    currentAbilities.learning,
                    currentAbilities.pressure,
                    currentAbilities.communication,
                    currentAbilities.experience
                ],
                name: '当前能力'
            },
            {
                value: [
                    industryAverage.professionalSkills,
                    industryAverage.innovation,
                    industryAverage.learning,
                    industryAverage.pressure,
                    industryAverage.communication,
                    industryAverage.experience
                ],
                name: '行业平均水平'
            }
        ];
        
        const option = {
            tooltip: {
                trigger: 'item'
            },
            legend: {
                data: ['当前能力', '行业平均水平'],
                bottom: 0,
                textStyle: {
                    fontSize: 12
                }
            },
            radar: {
                indicator: indicators,
                shape: 'circle',
                splitNumber: 5,
                axisName: {
                    color: '#333',
                    fontSize: 12,
                    distance: 20
                },
                splitLine: {
                    lineStyle: {
                        color: ['rgba(0, 0, 0, 0.1)']
                    }
                },
                splitArea: {
                    show: false
                },
                axisLine: {
                    lineStyle: {
                        color: 'rgba(0, 0, 0, 0.2)'
                    }
                }
            },
            series: [
                {
                    name: '能力评估',
                    type: 'radar',
                    data: seriesData,
                    areaStyle: {
                        opacity: 0.3
                    },
                    lineStyle: {
                        width: 2
                    },
                    itemStyle: {
                        symbol: 'circle',
                        symbolSize: 6
                    }
                }
            ]
        };
        
        myChart.setOption(option);
        
        // 响应式调整
        window.addEventListener('resize', function() {
            myChart.resize();
        });
    }
    
    // 初始化竞争力仪表盘
    initCompetitivenessGauge(data) {
        const chartDom = document.getElementById('competitivenessGauge');
        if (!chartDom) return;
        
        const myChart = echarts.init(chartDom);
        
        const overall = data.overall_assessment || {};
        const score = overall.total_score || 0;
        
        const option = {
            tooltip: {
                formatter: '{b}: {c}分'
            },
            series: [
                {
                    name: '综合得分',
                    type: 'gauge',
                    startAngle: 180,
                    endAngle: 0,
                    min: 0,
                    max: 100,
                    splitNumber: 8,
                    axisLine: {
                        lineStyle: {
                            width: 15,
                            color: [
                                [0.6, '#e6f7ff'],
                                [0.8, '#91d5ff'],
                                [1, '#1890ff']
                            ]
                        }
                    },
                    pointer: {
                        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                        length: '60%',
                        width: 6,
                        offsetCenter: [0, '-10%'],
                        itemStyle: {
                            color: '#1890ff'
                        }
                    },
                    axisTick: {
                        show: true,
                        length: 8,
                        lineStyle: {
                            color: 'auto',
                            width: 1
                        }
                    },
                    splitLine: {
                        show: true,
                        length: 12,
                        lineStyle: {
                            color: 'auto',
                            width: 2
                        }
                    },
                    axisLabel: {
                        show: true,
                        color: '#464646',
                        fontSize: 12,
                        distance: -20,
                        formatter: function (value) {
                            if (value === 0 || value === 100 || value === 50) {
                                return value;
                            }
                            return '';
                        }
                    },
                    detail: {
                        fontSize: 48,
                        fontWeight: 'bold',
                        offsetCenter: [0, '10%'],
                        valueAnimation: true,
                        formatter: function (value) {
                            return Math.round(value);
                        },
                        color: '#1890ff'
                    },
                    data: [
                        {
                            value: score,
                            name: '综合得分',
                            title: {
                                show: false
                            },
                            detail: {
                                show: false
                            }
                        }
                    ]
                }
            ]
        };
        
        myChart.setOption(option);
        
        // 响应式调整
        window.addEventListener('resize', function() {
            myChart.resize();
        });
    }
    
    // 渲染技能熟练度进度条
    renderSkillProgress(skills, title) {
        if (!skills || skills.length === 0) {
            return `<div class="skill-progress-item">
                <span class="skill-name">${title}:</span>
                <span class="hint-text">暂无</span>
            </div>`;
        }
        
        return skills.map(skill => {
            const name = skill.skill || skill.domain || '-';
            const score = skill.score || 0;
            const level = skill.level || '';
            
            return `<div class="skill-progress-item">
                <div class="skill-progress-header">
                    <span class="skill-name">${name}</span>
                    <span class="skill-score">${score}分</span>
                </div>
                <div class="skill-progress-bar">
                    <div class="skill-progress-fill" style="width: ${score}%"></div>
                </div>
                ${level ? `<span class="skill-level">${level}</span>` : ''}
            </div>`;
        }).join('');
    }
    
    // 渲染经验时间轴
    renderExperienceTimeline(experiences, type) {
        console.log(`renderExperienceTimeline 被调用, type=${type}, experiences=`, experiences);
        let mockExperiences = [];
        if (!experiences || experiences.length === 0) {
            console.log(`renderExperienceTimeline: 暂无 ${type} 经历，使用假数据`);
            if (type === 'internship') {
                mockExperiences = [
                    {
                        position: '后端开发实习生',
                        company: '阿里巴巴集团',
                        role: 'Java后端开发',
                        start_date: '2024-06',
                        end_date: '2024-09',
                        location: '杭州',
                        description: '参与电商平台订单系统的开发与维护工作，负责模块功能的实现和性能优化。',
                        achievements: [
                            '独立完成订单查询模块的重构，性能提升30%',
                            '参与微服务架构的设计与实现',
                            '编写详细的技术文档和单元测试'
                        ]
                    },
                    {
                        position: '前端开发实习生',
                        company: '腾讯科技',
                        role: 'Web前端开发',
                        start_date: '2024-01',
                        end_date: '2024-05',
                        location: '深圳',
                        description: '负责微信小程序和H5页面的开发，参与产品迭代和用户体验优化。',
                        achievements: [
                            '开发多个核心功能页面，用户活跃度提升20%',
                            '优化页面加载速度，首屏加载时间减少40%',
                            '协助团队完成项目的快速迭代'
                        ]
                    }
                ];
            } else if (type === 'project') {
                mockExperiences = [
                    {
                        name: '智能问答系统',
                        role: '项目负责人',
                        start_date: '2024-03',
                        end_date: '2024-06',
                        duration: '2024-03 - 2024-06',
                        description: '基于大模型的智能问答系统，支持多轮对话和知识检索功能。',
                        achievements: [
                            '使用 LangChain 构建 RAG 知识库，提升回答准确率',
                            '实现自然语言处理和意图识别功能',
                            '项目获得校级科技创新大赛二等奖'
                        ],
                        score: '92',
                        complexity: '高'
                    },
                    {
                        name: '校园二手交易平台',
                        role: '全栈开发',
                        start_date: '2023-09',
                        end_date: '2024-01',
                        duration: '2023-09 - 2024-01',
                        description: '面向高校学生的二手物品交易平台，提供发布、搜索、交易等功能。',
                        achievements: [
                            '使用 React + Node.js + MySQL 构建完整应用',
                            '实现用户认证、商品管理、在线聊天等功能',
                            '平台注册用户超过500人，累计交易额超过2万元'
                        ],
                        score: '88',
                        complexity: '中'
                    }
                ];
            }
            experiences = mockExperiences;
        }
        
        let html = '<div style="position: relative; padding-left: 32px;">';
        experiences.forEach((exp, index) => {
            const title = type === 'internship' ? exp.position : exp.name;
            const company = exp.company || '';
            const role = exp.role || '';
            const startDate = exp.start_date || '';
            const endDate = exp.end_date || '';
            const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : exp.duration || '';
            const location = exp.location || '';
            const description = exp.description || '';
            const achievements = exp.achievements || [];
            const score = exp.score || '';
            const complexity = exp.complexity || '';
            
            let details = '';
            if (dateRange || location || score || complexity) {
                details += '<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">';
                if (dateRange) details += `${dateRange}`;
                if (location) details += `${dateRange ? ' · ' : ''}${location}`;
                if (score) details += `${(dateRange || location) ? ' · ' : ''}评分: ${score}`;
                if (complexity) details += `${(dateRange || location || score) ? ' · ' : ''}复杂度: ${complexity}`;
                details += '</div>';
            }
            
            let descriptionHtml = '';
            if (description) {
                descriptionHtml = `<p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.4;">${description}</p>`;
            }
            
            let achievementsHtml = '';
            if (achievements.length > 0) {
                achievementsHtml = '<div style="margin-top: 8px;">';
                achievements.forEach(achievement => {
                    achievementsHtml += `<p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.4;">${achievement}</p>`;
                });
                achievementsHtml += '</div>';
            }
            
            const isLast = index === experiences.length - 1;
            const itemId = `exp-item-${index}`;
            
            html += `<div id="${itemId}" style="margin-bottom: ${isLast ? '0' : '24px'};">
                <div style="position: absolute; left: 0; transform: translateX(-50%);">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: var(--primary-color); margin-top: 2px;"></div>
                    ${!isLast ? `<div style="width: 2px; background-color: #e6f7ff; position: absolute; left: 5px; top: 14px; bottom: -24px;"></div>` : ''}
                </div>
                <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${title}</h4>
                ${company ? `<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${company}${role ? ` · ${role}` : ''}</div>` : role ? `<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${role}</div>` : ''}
                ${details}
                ${descriptionHtml}
                ${achievementsHtml}
            </div>`;
        });
        
        html += '</div>';
        return html;
    }

    // 加载推荐岗位（含超时、失败自动重试一次，便于服务刚启动时能加载出来）
    async loadRecommendedJobs() {
        const userId = getCurrentUserId();
        const grid = document.getElementById('recCardsGrid') || document.getElementById('recommendedJobs');
        if (!grid) return;

        grid.innerHTML = '<div class="loading-message">加载推荐岗位中...</div>';
        const REC_TIMEOUT_MS = 92000; // 92 秒，略大于接口 90s，让 api 层有机会返回演示数据再判定超时
        const tryOnce = async () => {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('REC_TIMEOUT')), REC_TIMEOUT_MS)
                );
                const result = await Promise.race([
                    getRecommendedJobs(userId, 1, 36),
                    timeoutPromise
                ]);
                return result && typeof result === 'object' ? result : { success: false, msg: '服务返回异常' };
            } catch (e) {
                if ((e && e.message) === 'REC_TIMEOUT') {
                    return { success: false, msg: '推荐服务响应超时，请确认 Java 后端(5000) 或 AI 服务(5002) 已启动后重试' };
                }
                console.error('[loadRecommendedJobs] 请求异常:', e);
                return { success: false, msg: (e && e.message) || '网络或服务异常，请稍后重试' };
            }
        };
        let result = await tryOnce();
        const shouldRetry = !result.success && (result.msg || '').match(/超时|无法连接|网络|请求超时/);
        if (shouldRetry) {
            grid.innerHTML = '<div class="loading-message">首次请求未就绪，正在重试...</div>';
            await new Promise(r => setTimeout(r, 3000));
            result = await tryOnce();
        }
        const recommendations = (result.data && (result.data.jobs ?? result.data.recommendations)) || [];
        this.currentRecommendations = Array.isArray(recommendations) ? recommendations : [];
        this.recFilter = 'all';
        this._recFilter = 'all';
        this._recPage = 0;

        const nav = document.getElementById('recPageNav') || null;

        if (result.success && this.currentRecommendations.length > 0) {
            this.updateRecStats(this.currentRecommendations);
            this.renderRecommendedJobs();
        } else if (result.success && this.currentRecommendations.length === 0) {
            const hint = '暂无推荐岗位。请先完善能力画像并生成岗位画像（系统管理 → 生成岗位画像 或 配置岗位 CSV），再刷新本页获取基于算法的真实推荐。';
            grid.innerHTML = '<div class="hint-text">' + hint + '</div>';
            if (nav) nav.innerHTML = '';
            this.updateRecStats([]);
        } else {
            const msg = (result.msg || '') + '';
            const isAbilityProfile = msg.includes('能力画像') && !msg.includes('请先启动');
            const fallbackList = this._getRecommendedJobsFallback();
            if (fallbackList.length > 0) {
                this.currentRecommendations = fallbackList;
                this.recFilter = 'all';
                this._recFilter = 'all';
                this._recPage = 0;
                this.updateRecStats(fallbackList);
                this.renderRecommendedJobs();
                grid.insertAdjacentHTML('afterbegin', '<div class="hint-text" style="margin-bottom:12px;font-size:12px;color:#888;">当前为演示数据，启动 Java(5000) 或 AI(5002) 后刷新可获取真实推荐。</div>');
            } else {
                const hint = isAbilityProfile
                    ? '暂无推荐岗位，请先完善个人档案并生成能力画像'
                    : '推荐服务暂不可用，请启动 Java 后端(5000) 或 AI 服务(5002) 后刷新页面。';
                grid.innerHTML = '<div class="hint-text">' + hint + '</div>';
                if (nav) nav.innerHTML = '';
                this.updateRecStats([]);
            }
        }
    }

    // 推荐岗位兜底演示数据（与 api.mockRequest 中 recommend-jobs 结构一致，供服务不可用时正常显示匹配内容）
    _getRecommendedJobsFallback() {
        if (typeof api === 'undefined' || typeof api.mockJobs !== 'function' || typeof api.mockRecommendation !== 'function') return [];
        try {
            const list = api.mockJobs().slice(0, 36);
            return list.map((j, i) => api.mockRecommendation(j, 92 - Math.floor(i / 3) * 4 + (i % 3)));
        } catch (e) {
            return [];
        }
    }

    updateRecStats(recommendations) {
        const total = recommendations.length;
        const high = recommendations.filter(r => (r.match_score ?? 0) >= 90).length;
        const mid = recommendations.filter(r => { const s = r.match_score ?? 0; return s >= 80 && s < 90; }).length;
        const low = recommendations.filter(r => { const s = r.match_score ?? 0; return s >= 70 && s < 80; }).length;
        const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
        set('recStatAll', total);
        set('recStatHigh', high);
        set('recStatMid', mid);
        set('recStatLow', low);
        const badge = document.getElementById('recBadge');
        if (badge) { badge.textContent = total; badge.style.display = total ? 'inline' : 'none'; }
        const title = document.getElementById('recCardsTitle') || document.getElementById('cardsTitle');
        if (title) title.textContent = total ? `全部推荐岗位 · ${total} 个` : '全部推荐岗位';
    }

    filterRec(filter, chipEl) {
        this._recFilter = filter;
        this._recPage = 0;
        document.querySelectorAll('#matchingPage .stat-chip').forEach(c => c.classList.remove('on'));
        if (chipEl) chipEl.classList.add('on');
        this.renderRecommendedJobs();
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
                    if (select) { select.value = rec.job_id || rec.job_name || ''; }
                    this.analyzeJobMatch(rec.job_id || rec.job_name);
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
                    if (select) select.value = rec.job_id || rec.job_name || '';
                    this.analyzeJobMatch(rec.job_id || rec.job_name);
                }
            };
        });
    }

    // 渲染推荐岗位（新 UI：统计行 + 卡片网格 + 翻页）
    renderRecommendedJobs() {
        const REC_PAGE_SIZE = 9;
        if (this._recPage === undefined) this._recPage = 0;
        if (this._recFilter === undefined) this._recFilter = 'all';

        const all = this.currentRecommendations || [];

        let filtered;
        if (this._recFilter === 'high') {
            filtered = all.filter(j => (j.matchScore ?? j.match_score ?? 0) >= 90);
        } else if (this._recFilter === 'mid') {
            filtered = all.filter(j => { const s = j.matchScore ?? j.match_score ?? 0; return s >= 80 && s < 90; });
        } else if (this._recFilter === 'low') {
            filtered = all.filter(j => { const s = j.matchScore ?? j.match_score ?? 0; return s < 80; });
        } else {
            filtered = all;
        }

        const countAll = all.length;
        const countHigh = all.filter(j => (j.matchScore ?? j.match_score ?? 0) >= 90).length;
        const countMid = all.filter(j => { const s = j.matchScore ?? j.match_score ?? 0; return s >= 80 && s < 90; }).length;
        const countLow = all.filter(j => (j.matchScore ?? j.match_score ?? 0) < 80).length;
        const elAll = document.getElementById('recStatAll');
        const elHigh = document.getElementById('recStatHigh');
        const elMid = document.getElementById('recStatMid');
        const elLow = document.getElementById('recStatLow');
        if (elAll) elAll.textContent = countAll;
        if (elHigh) elHigh.textContent = countHigh;
        if (elMid) elMid.textContent = countMid;
        if (elLow) elLow.textContent = countLow;

        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / REC_PAGE_SIZE));
        if (this._recPage >= pages) this._recPage = 0;

        const pageItems = filtered.slice(this._recPage * REC_PAGE_SIZE, (this._recPage + 1) * REC_PAGE_SIZE);

        const grid = document.getElementById('recCardsGrid') || document.getElementById('recommendedJobs');
        const nav = document.getElementById('recPageNav') || null;
        const titleEl = document.getElementById('recCardsTitle') || document.getElementById('cardsTitle');
        if (!grid) return;

        const labelMap = { all: '全部推荐岗位', high: '高度匹配', mid: '较为匹配', low: '一般匹配' };
        if (titleEl) titleEl.textContent = `${labelMap[this._recFilter]} · ${total} 个`;

        const COLORS = ['#2d6a4f', '#0d7a3e', '#d4380d', '#d48806', '#722ed1', '#cf1322', '#1b5e4d', '#389e0d', '#531dab', '#08979c'];

        grid.innerHTML = pageItems.map((job, i) => {
            const score = job.matchScore ?? job.match_score ?? 0;
            const lv = score >= 90 ? 'high' : score >= 80 ? 'mid' : 'low';
            const lvLabel = lv === 'high' ? '高度匹配' : lv === 'mid' ? '较为匹配' : '一般匹配';
            const color = COLORS[(this._recPage * REC_PAGE_SIZE + i) % COLORS.length];
            const jobInfo = job.job_info || {};
            const abbr = (jobInfo.company || job.job_name || job.company || '').slice(0, 2) || '?';
            const salary = jobInfo.salary || job.salary || job.salaryRange || '薪资面议';
            const skills = (job.matchedSkills || job.skills || []).slice(0, 4);
            const jobId = job.id ?? job.job_id ?? i;
            const jobIdAttr = typeof jobId === 'number' ? jobId : JSON.stringify(String(jobId));

            return `<div class="jcard job-card-match" data-lv="${lv}" data-rec-index="${i}">
      <div class="jcard-head">
        <div style="display:flex;align-items:flex-start;flex:1;gap:0">
          <div class="jcard-logo" style="background:${color}">${abbr}</div>
          <div class="jcard-info" style="flex:1;min-width:0">
            <div class="jcard-name">${job.job_name || job.title || job.jobTitle || '未知岗位'}</div>
            <div class="jcard-co">${jobInfo.company || job.company || job.companyName || ''} · ${jobInfo.location || job.location || job.city || ''}</div>
          </div>
        </div>
        <span class="badge badge-${lv}">${lvLabel}</span>
      </div>
      <div class="jcard-pct-row">
        <span class="pct pct-${lv}">${score}%</span>
        <div class="bar-bg"><div class="bar-fill bf-${lv}" style="width:${score}%"></div></div>
      </div>
      <div class="jcard-pills">
        ${skills.map(s => `<span class="pill ok">${s}</span>`).join('')}
      </div>
      <div class="jcard-foot">
        <span class="jcard-salary">${salary}</span>
        <button type="button" class="ana-btn analyze-btn">分析匹配 →</button>
      </div>
    </div>`;
        }).join('');

        this.bindRecCardClicks();
        if (!nav) return;
        if (pages <= 1) { nav.innerHTML = ''; return; }

        const p = this._recPage;
        const prevDis = p === 0 ? 'disabled' : '';
        const nextDis = p === pages - 1 ? 'disabled' : '';

        let dotsHtml = '';
        const show = new Set([0, pages - 1, p, p - 1, p + 1].filter(x => x >= 0 && x < pages));
        let prev = -1;
        Array.from(show).sort((a, b) => a - b).forEach(idx => {
            if (prev >= 0 && idx > prev + 1) dotsHtml += `<span style="font-size:12px;color:#9a9a8f;padding:0 2px">…</span>`;
            dotsHtml += `<button type="button" class="pg-dot${idx === p ? ' on' : ''}" onclick="app._goRecPage && app._goRecPage(${idx})">${idx + 1}</button>`;
            prev = idx;
        });

        nav.innerHTML = `
    <button type="button" class="pg-arrow" ${prevDis} onclick="app._goRecPage && app._goRecPage(${p - 1})">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      上一页
    </button>
    <div class="pg-dots">${dotsHtml}</div>
    <button type="button" class="pg-arrow" ${nextDis} onclick="app._goRecPage && app._goRecPage(${p + 1})">
      下一页
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <span class="pg-info">第 ${p + 1} / ${pages} 页 · 共 ${total} 个</span>
  `;
    }

    _goRecPage(p) {
        const dir = p > this._recPage ? 1 : -1;
        this._recPage = p;
        const grid = document.getElementById('recCardsGrid') || document.getElementById('recommendedJobs');
        if (grid) {
            grid.classList.remove('slide-left', 'slide-right');
            void grid.offsetWidth;
            grid.classList.add(dir > 0 ? 'slide-left' : 'slide-right');
        }
        this.renderRecommendedJobs();
        (document.getElementById('recCardsGrid') || document.getElementById('recommendedJobs'))?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 渲染岗位列表（搜索等场景，按图2模板：多色 logo、技能标签、预估匹配、分析匹配）
    renderJobs(jobs, container) {
        if (!container) return;
        const list = jobs || [];
        if (list.length === 0) {
            container.innerHTML = '<p class="hint-text">未找到相关岗位</p>';
            return;
        }
        const companyLogoColors = ['#2d6a4f', '#d4380d', '#d46b08', '#08979c', '#531dab', '#1b5e4d', '#0d7a3e', '#722ed1', '#264653', '#389e0d'];
        const getLogoColor = (i) => companyLogoColors[i % companyLogoColors.length];
        const tags = (job) => (job.tags || job.required_skills || []).slice(0, 4).map(t => `<span class="src-tag">${t}</span>`).join('');
        container.innerHTML = list.map((job, i) => {
            const name = job.job_name || '-';
            const abbr = (name.slice(0, 1) || '岗');
            const loc = job.location || job.job_info?.location || '';
            const salary = job.avg_salary || job.salary || job.job_info?.salary || '-';
            return `<div class="search-result-card" data-job-id="${job.job_id || ''}" data-job-name="${(job.job_name || '').replace(/"/g, '&quot;')}">
                <div class="src-head">
                    <div class="src-logo" style="background:${getLogoColor(i)}">${abbr}</div>
                    <div><div class="src-name">${name}</div><div class="src-co">${job.industry || job.company || job.job_info?.company || '-'}</div></div>
                </div>
                <div class="src-tags">${tags(job)}${loc ? `<span class="src-tag">📍${loc}</span>` : ''}</div>
                <div class="src-footer">
                    <span class="src-salary">${salary}${String(salary).includes('/') ? '' : '/月'}</span>
                    <button type="button" class="src-btn">分析匹配</button>
                </div>
            </div>`;
        }).join('');
        container.querySelectorAll('.search-result-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = (card.dataset.jobId || card.dataset.jobName || '').trim();
                if (e.target.classList.contains('src-btn')) {
                    e.stopPropagation();
                    if (id) {
                        this.switchTab('analysis');
                        const select = document.getElementById('jobSelect');
                        if (select) select.value = id;
                        this.analyzeJobMatch(id);
                    }
                } else {
                    if (id) {
                        this.switchTab('analysis');
                        const select = document.getElementById('jobSelect');
                        if (select) select.value = id;
                        this.analyzeJobMatch(id);
                    }
                }
            });
        });
    }

    // 根据岗位名称关键词映射 job-ui 同款线性 SVG 图标
    getJobGroupIconStyle(jobName) {
        const raw = (jobName || '').toString().trim();
        const lower = raw.toLowerCase();
        const includes = (kw) => {
            if (!kw) return false;
            const k = kw.toString();
            // 英文/符号关键词用不区分大小写匹配
            if (/[a-zA-Z\+\#]/.test(k)) return lower.includes(k.toLowerCase());
            return raw.includes(k);
        };

        const ICONS = {
            code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
            chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M9 15V9M14 15V7M19 15v-4"/></svg>',
            search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
            palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 100 18h2a2 2 0 002-2 2 2 0 00-2-2h-1a3 3 0 010-6h1a4 4 0 004-4 4 4 0 00-4-4h-2z"/></svg>',
            coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6.5" rx="6.5" ry="2.5"/><path d="M5.5 6.5v7c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-7"/></svg>',
            shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.4-3 7.7-7 10-4-2.3-7-5.6-7-10V6l7-3z"/></svg>',
            users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c1.2-3.4 10.8-3.4 12 0M14.5 19c.6-1.8 2.1-2.8 4.5-2.8"/></svg>',
            flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4M10 3v4l-5 9a3 3 0 002.6 4.5h8.8A3 3 0 0019 16L14 7V3"/></svg>',
            briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/></svg>',
            megaphone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11v2l11 4V7L3 11zM14 10h4a2 2 0 010 4h-4M6 14l1.5 4"/></svg>',
            wrench: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7a4 4 0 005 5l-7 7-3-3 7-7a4 4 0 01-2-2z"/></svg>',
            sprout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-8M12 12c-4 0-6-2.5-6-6 4 0 6 2.5 6 6zM12 14c0-3.5 2-6 6-6 0 3.5-2 6-6 6z"/></svg>',
            list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/></svg>'
        };
        const rules = [
            // 更具体：语言/技术栈
            { keys: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'PHP', 'Rust', 'Node', 'React', 'Vue'], icon: ICONS.code },
            // 数据/算法/AI
            { keys: ['算法', '数据', 'AI', '机器学习', '深度学习', '大模型', 'NLP', 'CV', 'LLM'], icon: ICONS.chart },
            // 测试/质检
            { keys: ['质检', '测试', 'QA'], icon: ICONS.search },
            // 设计/UI/产品
            { keys: ['UI', 'UX', '交互', '视觉', '设计', '产品'], icon: ICONS.palette },
            // 财务/会计/审计
            { keys: ['财务', '会计', '审计'], icon: ICONS.coin },
            // 法务/律师
            { keys: ['法务', '律师'], icon: ICONS.shield },
            // 行政/HR/招聘
            { keys: ['行政', 'HR', '人事', '招聘'], icon: ICONS.users },
            // 科研/研究/学术
            { keys: ['科研', '研究', '学术', '博士后'], icon: ICONS.flask },
            // 销售/客户/商务
            { keys: ['销售', '客户', '商务', 'BD'], icon: ICONS.briefcase },
            // 运营/策划/市场
            { keys: ['运营', '策划', '市场', '营销', '增长'], icon: ICONS.megaphone },
            // 工程师/技术/开发
            { keys: ['工程师', '技术', '开发'], icon: ICONS.wrench },
            // 管培生/助理/实习
            { keys: ['管培生', '助理', '实习', '管培'], icon: ICONS.sprout },
        ];

        for (const r of rules) {
            if (r.keys && r.keys.some(includes)) return { icon: r.icon, bg: '#f0ede8' };
        }
        return { icon: ICONS.list, bg: '#f0ede8' };
    }

    // 渲染岗位归类视图（按岗位名称聚合 + 展开公司列表）
    renderJobGroups(groups, container) {
        if (!container) return;
        const list = groups || [];
        if (!list.length) {
            container.innerHTML = '<p class="hint-text">未找到相关岗位</p>';
            return;
        }
        const companyLogoColors = ['#2d6a4f', '#d4380d', '#d46b08', '#08979c', '#531dab', '#1b5e4d', '#0d7a3e', '#722ed1', '#264653', '#389e0d'];
        const getLogoColor = (i) => companyLogoColors[i % companyLogoColors.length];

        const fmtSalaryRange = (sr) => {
            if (!sr || typeof sr !== 'object') return '薪资 -';
            const min = sr.min, max = sr.max;
            if (typeof min === 'number' && typeof max === 'number' && min > 0 && max > 0) {
                const a = min.toLocaleString('zh-CN');
                const b = max.toLocaleString('zh-CN');
                return `薪资 ${a}~${b}`;
            }
            return '薪资 -';
        };

        const fmtIndustryPills = (industry) => {
            const raw = (industry || '').trim();
            if (!raw) return '';
            const parts = raw.split(/[\/·\s、，,;；]+/).map(s => s.trim()).filter(Boolean);
            const uniq = [];
            parts.forEach(p => { if (p && !uniq.includes(p)) uniq.push(p); });
            return uniq.slice(0, 2).map(p => `<span class="pill">${p}</span>`).join('');
        };

        container.innerHTML = list.map((g, gi) => {
            const name = (g.job_name || '-').toString();
            const iconStyle = this.getJobGroupIconStyle(name);
            const companies = Array.isArray(g.companies) ? g.companies : [];
            const count = Number(g.company_count) || companies.length || 0;
            const tags = (Array.isArray(g.tags) ? g.tags : []).slice(0, 3).map(t => `<span class="jg-tag">${String(t)}</span>`).join('');
            const salaryText = fmtSalaryRange(g.salary_range);
            // 当前岗位涉及的行业选项
            const industries = (() => {
                const set = new Set();
                companies.forEach(c => {
                    const raw = (c.industry || '').trim();
                    if (!raw) return;
                    raw.split(/[\/·\s、，,;；]+/).forEach(s => {
                        const v = s.trim();
                        if (v) set.add(v);
                    });
                });
                return Array.from(set);
            })();
            const industryOptions = ['<option value="">全部行业</option>'].concat(
                industries.map(ind => `<option value="${ind.replace(/"/g, '&quot;')}">${ind}</option>`)
            ).join('');

            return `<div class="job-group-card" data-group-index="${gi}">
                <div class="jg-head">
                    <div class="jg-left">
                        <div class="jg-icon" style="background:${iconStyle.bg};color:#6b6560">${iconStyle.icon}</div>
                        <div style="min-width:0">
                            <div class="jg-title">${name.replace(/</g, '&lt;')}</div>
                            <div class="jg-tags">${tags}</div>
                        </div>
                    </div>
                    <div class="jg-right">
                        <div class="jg-count">${count}家公司在招</div>
                        <div class="jg-salary">${salaryText}</div>
                        <button type="button" class="jg-toggle" aria-expanded="false">▾</button>
                    </div>
                </div>
                <div class="jg-body" data-group-index="${gi}">
                    <div class="jg-toolbar">
                        <div class="jg-tools-left">
                            <div class="jg-tool-item">
                                <input type="text" class="jg-search" placeholder="搜索公司名称…">
                            </div>
                            <div class="jg-tool-item">
                                <select class="jg-sort">
                                    <option value="match">按匹配度排序（默认）</option>
                                    <option value="salary_desc">薪资从高到低</option>
                                    <option value="salary_asc">薪资从低到高</option>
                                </select>
                            </div>
                            <div class="jg-tool-item">
                                <select class="jg-filter-industry">
                                    ${industryOptions}
                                </select>
                            </div>
                        </div>
                        <div class="jg-tools-right">
                            <span class="jg-result-count">显示 0 / ${count} 家</span>
                        </div>
                    </div>
                    <div class="jg-list"></div>
                    <div class="jg-pager">
                        <div class="jg-page-left">
                            <span class="jg-page-label">每页显示</span>
                            <select class="jg-page-size">
                                <option value="5" selected>5 条/页</option>
                                <option value="10">10 条/页</option>
                                <option value="20">20 条/页</option>
                            </select>
                        </div>
                        <div class="jg-page-center">
                            <div class="jg-page-buttons"></div>
                        </div>
                        <div class="jg-page-right">
                            <span class="jg-page-info">第 1 / 1 页</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        // 内嵌列表状态与渲染逻辑
        const groupStates = {};

        const parseSalaryMax = (salaryStr) => {
            if (!salaryStr) return -1;
            const text = String(salaryStr).replace(/[~,，]/g, '').replace(/元\/?[月年]?/g, '');
            const mK = text.match(/(\d+)\s*[kK]/);
            if (mK) return parseInt(mK[1], 10) * 1000;
            const mRange = text.match(/(\d+)\s*-\s*(\d+)/);
            if (mRange) return parseInt(mRange[2], 10);
            const mNum = text.match(/(\d+)/);
            return mNum ? parseInt(mNum[1], 10) : -1;
        };

        const cards = container.querySelectorAll('.job-group-card');
        cards.forEach(card => {
            const idx = parseInt(card.dataset.groupIndex || '0', 10);
            const data = list[idx] || {};
            const companies = Array.isArray(data.companies) ? data.companies.slice() : [];
            const state = {
                base: companies,
                keyword: '',
                sort: 'match',
                industry: '',
                page: 1,
                pageSize: 5,
                filtered: companies,
                enriched: false
            };
            groupStates[idx] = state;

            const body = card.querySelector('.jg-body');
            const searchInput = body.querySelector('.jg-search');
            const sortSel = body.querySelector('.jg-sort');
            const indSel = body.querySelector('.jg-filter-industry');
            const resultSpan = body.querySelector('.jg-result-count');
            const listEl = body.querySelector('.jg-list');
            const pagerEl = body.querySelector('.jg-pager');
            const pageSizeSel = body.querySelector('.jg-page-size');
            const pageBtnsEl = body.querySelector('.jg-page-buttons');
            const pageInfoEl = body.querySelector('.jg-page-info');

            // 懒加载：展开该岗位组时，用批量精排接口计算真实 match_score（与「分析匹配」一致）
            const enrichMatchScores = async () => {
                if (state.enriched) return;
                const userId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : null;
                if (!userId) {
                    state.enriched = true;
                    return;
                }
                const jobIds = state.base.map(c => c.job_id).filter(id => id != null && id !== '').slice(0, 50);
                if (!jobIds.length) {
                    state.enriched = true;
                    return;
                }
                try {
                    const res = await batchAnalyze(userId, jobIds);
                    const analyses = res && res.success && res.data && Array.isArray(res.data.analyses) ? res.data.analyses : [];
                    if (!analyses.length) {
                        state.enriched = true;
                        return;
                    }
                    const scoreMap = {};
                    analyses.forEach(a => {
                        if (!a) return;
                        const jid = (a.job_id || a.jobId || '').toString();
                        if (!jid) return;
                        const s = a.match_score != null ? a.match_score : (a.matchScore != null ? a.matchScore : null);
                        if (s != null) scoreMap[jid] = Number(s);
                    });
                    state.base.forEach(c => {
                        const jid = (c.job_id || '').toString();
                        if (jid && Object.prototype.hasOwnProperty.call(scoreMap, jid)) {
                            c.match_score = scoreMap[jid];
                        }
                    });
                    state.enriched = true;
                    render();
                } catch (e) {
                    console.error('[JobGroups] 批量匹配分析失败', e);
                    state.enriched = true;
                }
            };

            // 展开/收起：展开时触发一次精排匹配度计算
            const toggleBtn = card.querySelector('.jg-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const expanded = !card.classList.contains('expanded');
                    card.classList.toggle('expanded', expanded);
                    toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                    if (expanded) enrichMatchScores();
                });
            }
            const head = card.querySelector('.jg-head');
            if (head) {
                head.addEventListener('click', () => {
                    const expanded = !card.classList.contains('expanded');
                    card.classList.toggle('expanded', expanded);
                    const btn = card.querySelector('.jg-toggle');
                    if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                    if (expanded) enrichMatchScores();
                });
            }

            const recomputeFiltered = () => {
                const kw = state.keyword.trim();
                const ind = state.industry.trim();
                let arr = state.base.slice();
                if (kw) {
                    const lowerKw = kw.toLowerCase();
                    arr = arr.filter(c => String(c.company || '').toLowerCase().includes(lowerKw));
                }
                if (ind) {
                    arr = arr.filter(c => String(c.industry || '').includes(ind));
                }
                // 排序
                if (state.sort === 'salary_desc' || state.sort === 'salary_asc') {
                    arr.sort((a, b) => {
                        const sa = parseSalaryMax(a.avg_salary || a.salary);
                        const sb = parseSalaryMax(b.avg_salary || b.salary);
                        return state.sort === 'salary_desc' ? sb - sa : sa - sb;
                    });
                } else {
                    arr.sort((a, b) => {
                        const ma = a.match_score != null ? Number(a.match_score) : 0;
                        const mb = b.match_score != null ? Number(b.match_score) : 0;
                        return mb - ma;
                    });
                }
                state.filtered = arr;
            };

            const buildPageNumbers = (pages, current) => {
                const items = [];
                const pushPage = (n) => items.push({ type: 'page', num: n });
                const pushDot = () => items.push({ type: 'ellipsis' });
                if (pages <= 5) {
                    for (let i = 1; i <= pages; i++) pushPage(i);
                } else if (current <= 3) {
                    pushPage(1); pushPage(2); pushPage(3); pushPage(4); pushDot(); pushPage(pages);
                } else if (current >= pages - 2) {
                    pushPage(1); pushDot(); pushPage(pages - 3); pushPage(pages - 2); pushPage(pages - 1); pushPage(pages);
                } else {
                    pushPage(1); pushDot(); pushPage(current - 1); pushPage(current); pushPage(current + 1); pushDot(); pushPage(pages);
                }
                return items;
            };

            const render = () => {
                recomputeFiltered();
                const total = state.filtered.length;
                const pageSize = state.pageSize || 5;
                const pages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
                if (state.page > pages) state.page = pages;
                const page = state.page;
                const start = (page - 1) * pageSize;
                const pageItems = state.filtered.slice(start, start + pageSize);

                // 列表
                listEl.innerHTML = pageItems.map((c, ci) => {
                    const co = (c.company || '未知公司').toString();
                    const abbr = (co.slice(0, 2) || '公司');
                    const salary = (c.avg_salary || c.salary || '-').toString() || '-';
                    const pills = fmtIndustryPills(c.industry);
                    const colorIdx = ci % 10;
                    return `<div class="jg-company-row" data-job-id="${(c.job_id || '').toString().replace(/"/g, '&quot;')}">
                        <div class="jg-co-left">
                            <div class="jg-co-logo" style="background:${getLogoColor(colorIdx)}">${abbr}</div>
                            <div style="min-width:0">
                                <div class="jg-co-name">${co.replace(/</g, '&lt;')}</div>
                                <div class="jg-co-sub">${pills}</div>
                            </div>
                        </div>
                        <div class="jg-co-right">
                            <div class="jg-co-salary">${salary}${String(salary).includes('/') ? '' : '/月'}</div>
                            <button type="button" class="jg-analyze">分析匹配</button>
                        </div>
                    </div>`;
                }).join('') || '<div class="hint-text" style="padding:8px 2px;">暂无符合条件的公司</div>';

                // 结果数
                if (resultSpan) {
                    resultSpan.textContent = `显示 ${Math.min(pageItems.length, total)} / ${total} 家`;
                }

                // 分页信息
                if (pageInfoEl) {
                    pageInfoEl.textContent = `第 ${page} / ${pages} 页`;
                }

                // 页码按钮
                if (pageBtnsEl) {
                    const items = buildPageNumbers(pages, page);
                    let html = '';
                    html += `<button type="button" class="jg-page-btn jg-page-prev" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
                    items.forEach(it => {
                        if (it.type === 'ellipsis') {
                            html += `<span class="jg-page-ellipsis">…</span>`;
                        } else {
                            const active = it.num === page ? ' active' : '';
                            html += `<button type="button" class="jg-page-btn${active}" data-page="${it.num}">${it.num}</button>`;
                        }
                    });
                    html += `<button type="button" class="jg-page-btn jg-page-next" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>›</button>`;
                    pageBtnsEl.innerHTML = html;
                }

                // 绑定公司行的分析按钮（每次渲染后重新绑定当前页）
                listEl.querySelectorAll('.jg-company-row').forEach(row => {
                    const jobId = (row.dataset.jobId || '').trim();
                    row.querySelector('.jg-analyze')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (!jobId) return;
                        this.switchTab('analysis');
                        const select = document.getElementById('jobSelect');
                        if (select) select.value = jobId;
                        this.analyzeJobMatch(jobId);
                    });
                });
            };

            // 事件绑定：搜索/排序/行业筛选
            searchInput?.addEventListener('input', (e) => {
                state.keyword = e.target.value || '';
                state.page = 1;
                render();
            });
            sortSel?.addEventListener('change', (e) => {
                state.sort = e.target.value || 'match';
                state.page = 1;
                render();
            });
            indSel?.addEventListener('change', (e) => {
                state.industry = e.target.value || '';
                state.page = 1;
                render();
            });

            // 每页条数
            pageSizeSel?.addEventListener('change', (e) => {
                const v = parseInt(e.target.value || '5', 10);
                state.pageSize = (!isNaN(v) && v > 0) ? v : 5;
                state.page = 1;
                render();
            });

            // 页码点击（事件委托）
            pagerEl?.addEventListener('click', (e) => {
                const btn = e.target.closest('.jg-page-btn');
                if (!btn) return;
                const targetPage = parseInt(btn.dataset.page || '1', 10);
                if (isNaN(targetPage) || targetPage < 1) return;
                state.page = targetPage;
                render();
            });

            // 首次渲染
            render();
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

    // 加载岗位画像页面数据（行业下拉 + 从后端加载第一页岗位列表）
    async loadJobProfileData() {
        const tipEl = document.getElementById('jobProfileListTip');
        if (tipEl) tipEl.classList.add('hidden');
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

    // 动态加载行业下拉选项（5002 未启动时静默失败，保留「全部行业」）
    async loadJobIndustries() {
        const select = document.getElementById('jobProfileIndustry');
        if (!select) return;
        try {
            const res = await getJobIndustries();
            const industries = (res.success && res.data && res.data.industries) ? res.data.industries : [];
            select.innerHTML = '<option value="">全部行业</option>';
            industries.forEach(ind => {
                const opt = document.createElement('option');
                opt.value = ind;
                opt.textContent = ind;
                select.appendChild(opt);
            });
        } catch (e) {
            select.innerHTML = '<option value="">全部行业</option>';
        }
    }

    // 4.1 加载岗位画像列表：无搜索条件时走 /job/all-jobs 展示全部岗位，有条件时走 /job/profiles 搜索
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
        if (tipEl) {
            tipEl.classList.add('hidden');
            tipEl.textContent = '';
        }
        if (footerEl) footerEl.innerHTML = '';

        // 有搜索条件：走关键词搜索接口 /job/profiles
        if (keyword || industry || level) {
            let result;
            try {
                result = await getJobProfilesFromBackend(page, size, keyword, industry, level);
            } catch (e) {
                console.error('job/profiles 接口错误:', e);
                container.innerHTML = '<div class="hint-text">无法连接后端服务（5002），请先启动 AI 服务：运行 start_ai_service.ps1 或 cd AI算法 && python app.py</div>';
                if (footerEl) footerEl.innerHTML = '';
                return;
            }
            if (!result.success || !result.data || !result.data.list || result.data.list.length === 0) {
                container.innerHTML = '<div class="hint-text">暂无相关岗位，试试其他关键词</div>';
                if (tipEl) {
                    tipEl.classList.remove('hidden');
                    tipEl.innerHTML = `暂无结果 <a href="#" onclick="app.clearJobProfileSearch(); return false;">返回全部岗位</a>`;
                }
                if (footerEl) footerEl.innerHTML = '';
                return;
            }

            const data = result.data;
            const total = data.total || 0;
            const totalPages = data.pages ?? Math.max(1, Math.ceil(total / size));

            if (tipEl) {
                tipEl.classList.remove('hidden');
                tipEl.innerHTML = `找到 ${total} 个相关岗位 <a href="#" class="job-profile-back-featured" onclick="app.clearJobProfileSearch(); return false;">返回全部</a>`;
            }

            this.renderJobProfileList(data, container);
            if (footerEl) this.renderJobProfilePagination(total, data.page || page, size, footerEl, totalPages);
            return;
        }

        // 无搜索条件：从后端 /job/all-jobs 拉取全部岗位（分页）
        try {
            const base =
                (window.API_CONFIG &&
                    (window.API_CONFIG.jobProfilesBaseURL || window.API_CONFIG.assessmentBaseURL)) ||
                'http://localhost:5002/api/v1';
            const url = `${base}/job/all-jobs?page=${page}&size=${size}`;
            const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            const json = await res.json();
            if (json.code !== 200 || !json.data) {
                container.innerHTML = '<div class="hint-text">后端服务未启动，请确认 5002 端口已运行</div>';
                if (footerEl) footerEl.innerHTML = '';
                if (tipEl) tipEl.classList.add('hidden');
                return;
            }
            const d = json.data;
            const list = (d.list || []).map(j => ({
                job_id: j.csvName || j.jobName,
                job_name: getJobDisplayName(j.csvName || j.jobName),
                csv_name: j.csvName || j.jobName,
                industry: j.industry || '-',
                level: '-',
                avg_salary: j.salaryRange || '-',
                tags: [],
                skills: [],
                demand_score: j.heat || 75,
                growth_trend: j.trend || '稳定',
            }));
            const total = d.total || list.length;
            const totalPages = d.pages || Math.ceil(total / size);
            if (tipEl) {
                tipEl.textContent = '';
                tipEl.classList.add('hidden');
            }
            this.renderJobProfileList({ list, total, page, size }, container);
            if (footerEl) this.renderJobProfilePagination(total, page, size, footerEl, totalPages);
        } catch (err) {
            console.error('all-jobs 接口错误:', err);
            container.innerHTML =
                '<div class="hint-text">无法连接后端服务（5002），请先启动 AI 服务：在项目根目录运行 <code>start_ai_service.ps1</code> 或 <code>cd AI算法 && python app.py</code></div>';
            if (footerEl) footerEl.innerHTML = '';
            if (tipEl) tipEl.classList.add('hidden');
        }
    }

    // 渲染岗位画像列表（新卡片：顶部渐变色条 + 内容区 + 底部两按钮）
    renderJobProfileList(data, container) {
        container.innerHTML = '';
        const list = data.list || [];
        const stripeGradients = [
            'linear-gradient(90deg, #5e8c65, #4a7350)',
            'linear-gradient(90deg, #4a7350, #5e8c65)',
            'linear-gradient(90deg, #5e8c65, #4a7350)',
        ];
        list.forEach((job, idx) => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            // 岗位类别标签（从 CSV_JOB_CATEGORIES 取）
            const csvName = job.csv_name || job.job_id || '';
            const category = (CSV_JOB_CATEGORIES[csvName] || {}).category || '';
            const categoryTag = category ? `<span class="tag-soft">${category}</span>` : '';
            const heatTag =
                (job.demand_score ?? 0) >= 80
                    ? '<span class="tag-soft">需求旺盛</span>'
                    : '<span class="tag-soft">持续招聘</span>';
            const softTags = `${categoryTag}${heatTag}`;
            const techTags = '';
            const stripeStyle = stripeGradients[idx % 3];
            const jobName = (job.job_name || job.jobName || '-').replace(/</g, '&lt;');
            const industry = (job.industry || '').trim().replace(/</g, '&lt;');
            const level = (job.level || '').trim().replace(/</g, '&lt;');
            const salary = (job.avg_salary || '-').replace(/</g, '&lt;');
            const trend = (job.growth_trend || '--').replace(/</g, '&lt;');
            const metaParts = [industry, level].filter(v => v && v !== '-');
            const jobCardMeta = metaParts.length ? metaParts.join(' | ') : '';
            jobCard.innerHTML = `
                <div class="card-stripe" style="background:${stripeStyle}"></div>
                <div class="job-card-inner">
                    <div class="job-card-title">${jobName}</div>
                    <div class="job-card-meta">${jobCardMeta}</div>
                    <div class="card-salary">${salary}</div>
                    <div class="job-card-tags">${softTags}</div>
                    <div class="job-card-tech">${techTags}</div>
                    <div class="job-card-footer">
                        <span class="job-demand-num">${job.demand_score ?? '--'}</span>
                        <span class="job-trend-label">${trend}</span>
                    </div>
                    <div class="card-btns">
                        <button type="button" class="btn-profile" data-job-id="${(job.job_id || '').replace(/"/g, '&quot;')}" data-job-name="${jobName.replace(/"/g, '&quot;')}">📊 岗位画像</button>
                        <button type="button" class="btn-realdata" data-job-name="${jobName.replace(/"/g, '&quot;')}">💼 真实数据</button>
                    </div>
                </div>
            `;
            jobCard.querySelector('.btn-profile')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const displayName = (job.job_name || job.jobName || '-').trim();
                const csvName2 = job.csv_name || job.job_id || displayName;
                this.openJobProfileModalStream(displayName, csvName2);
            });
            jobCard.querySelector('.btn-realdata')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const csvName2 = job.csv_name || job.job_id || (job.job_name || jobName);
                const queryName = typeof getCsvJobName === 'function' ? getCsvJobName(csvName2) : csvName2;
                this.showRealDataModal(queryName, 5000);
            });
            container.appendChild(jobCard);
        });
    }

    // 真实数据弹窗：幻灯片式展示（11 字段，蓝色主题 #4361ee，左右翻页 + 键盘 ← →）
    _realDataList = [];
    _realDataJobName = '';
    _realDataIndex = 0;
    _realDataAnimating = false;

    _san(s) {
        if (s == null) return '';
        return String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    _renderRealDataSlide(bodyEl, item) {
        const jobName = this._san(item.jobName || item.jobTitle);
        const company = this._san(item.company);
        const location = this._san(item.location || item.address);
        const salary = this._san(item.salary);
        const industry = this._san(item.industry);
        const scale = this._san(item.scale);
        const companyType = this._san(item.companyType);
        const jobCode = this._san(item.jobCode);
        const jobDetail = this._san(item.jobDetail || item.description || '');
        const companyDetail = this._san(item.companyDetail || item.companyIntro || '');
        const sourceUrl = (item.sourceUrl || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        const salaryDisplay = (salary || '').replace(/元/g, '');
        return `
            <div class="real-data-slide-card-inner">
                <div class="real-data-card-header">
                    <div class="real-data-title-section">
                        <h2 class="real-data-slide-title">${jobName}</h2>
                        <div class="real-data-company-name">${company}</div>
                        <div class="real-data-tags">
                            <span class="real-data-tag">📍 ${location || '-'}</span>
                            <span class="real-data-tag">💼 ${industry || '-'}</span>
                            <span class="real-data-tag">👥 ${scale || '-'}</span>
                            ${companyType && companyType !== '-' ? `<span class="real-data-tag">🏢 ${companyType}</span>` : ''}
                        </div>
                    </div>
                    <div class="real-data-salary-box">
                        <div class="real-data-salary-label">薪资范围</div>
                        <div class="real-data-salary-value">${salaryDisplay || '面议'}</div>
                    </div>
                </div>
                <div class="real-data-info-grid">
                    <div class="real-data-info-item"><div class="real-data-info-label">岗位名称</div><div class="real-data-info-value real-data-info-value-full">${jobName}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">工作地址</div><div class="real-data-info-value">${location || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">所属行业</div><div class="real-data-info-value">${industry || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">公司规模</div><div class="real-data-info-value">${scale || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">公司类型</div><div class="real-data-info-value">${companyType || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">岗位编码</div><div class="real-data-info-value real-data-mono">${jobCode || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">薪资范围</div><div class="real-data-info-value real-data-salary-txt">${salary || '-'}</div></div>
                    <div class="real-data-info-item"><div class="real-data-info-label">公司名称</div><div class="real-data-info-value real-data-info-value-full">${company}</div></div>
                </div>
                <div class="real-data-details-section">
                    <div class="real-data-detail-box">
                        <div class="real-data-detail-title">📋 岗位详情</div>
                        <div class="real-data-detail-content">${jobDetail || '-'}</div>
                    </div>
                    <div class="real-data-detail-box">
                        <div class="real-data-detail-title">🏢 公司详情</div>
                        <div class="real-data-detail-content">${companyDetail || '-'}</div>
                    </div>
                </div>
                <div class="real-data-source-link">
                    <div class="real-data-source-title">🔗 岗位来源地址</div>
                    ${sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener">${sourceUrl}</a>` : '<span class="real-data-no-url">暂无</span>'}
                </div>
            </div>
        `;
    }

    _realDataNavigate(direction) {
        if (this._realDataAnimating || !this._realDataList.length) return;
        const newIndex = this._realDataIndex + direction;
        if (newIndex < 0 || newIndex >= this._realDataList.length) return;
        const card = document.getElementById('realDataModalBody');
        if (!card) return;
        this._realDataAnimating = true;
        card.classList.add(direction > 0 ? 'real-data-slide-out-left' : 'real-data-slide-out-right');
        const self = this;
        setTimeout(function () {
            self._realDataIndex = newIndex;
            card.classList.remove('real-data-slide-out-left', 'real-data-slide-out-right');
            card.innerHTML = self._renderRealDataSlide(card, self._realDataList[self._realDataIndex]);
            card.classList.add(direction > 0 ? 'real-data-slide-in-right' : 'real-data-slide-in-left');
            document.getElementById('realDataPrevBtn').disabled = self._realDataIndex === 0;
            document.getElementById('realDataNextBtn').disabled = self._realDataIndex === self._realDataList.length - 1;
            setTimeout(function () {
                card.classList.remove('real-data-slide-in-left', 'real-data-slide-in-right');
                self._realDataAnimating = false;
            }, 400);
        }, 400);
    }

    async showRealDataModal(jobName, size = 5000) {
        const modal = document.getElementById('realDataModal');
        const bodyEl = document.getElementById('realDataModalBody');
        const titleEl = document.getElementById('realDataModalTitle');
        const prevBtn = document.getElementById('realDataPrevBtn');
        const nextBtn = document.getElementById('realDataNextBtn');
        if (!modal || !bodyEl) return;
        bodyEl.innerHTML = '<div class="loading-message">加载真实招聘数据中...</div>';
        titleEl.textContent = '📂 真实招聘数据';
        modal.classList.remove('hidden');
        const res = await getJobRealData(jobName, size);
        if (!res.success || !res.data || res.data.length === 0) {
            bodyEl.innerHTML = '<div class="hint-text">暂无该岗位的真实招聘数据</div>';
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
        } else {
            this._realDataList = res.data;
            this._realDataJobName = jobName;
            this._realDataIndex = 0;
            titleEl.textContent = '📂 ' + (jobName || '') + ' - 真实招聘数据';
            bodyEl.innerHTML = this._renderRealDataSlide(bodyEl, this._realDataList[0]);
            bodyEl.classList.remove('real-data-slide-out-left', 'real-data-slide-out-right', 'real-data-slide-in-left', 'real-data-slide-in-right');
            if (prevBtn) { prevBtn.disabled = true; prevBtn.onclick = () => this._realDataNavigate(-1); }
            if (nextBtn) { nextBtn.disabled = this._realDataList.length <= 1; nextBtn.onclick = () => this._realDataNavigate(1); }
            this._realDataKeyHandler = (e) => {
                if (e.key === 'ArrowLeft') this._realDataNavigate(-1);
                else if (e.key === 'ArrowRight') this._realDataNavigate(1);
            };
            document.addEventListener('keydown', this._realDataKeyHandler);
        }
    }

    closeRealDataModal() {
        document.removeEventListener('keydown', this._realDataKeyHandler);
        this._realDataKeyHandler = null;
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

    // 精选岗位 ID 前缀（前端写死的 12 条），点击时用本地数据渲染详情，保证卡片与弹窗一致
    _isFeaturedJobId(idOrName) {
        if (!idOrName || typeof idOrName !== 'string') return false;
        const s = idOrName.trim();
        return /^job_0(0[1-9]|1[0-2])$/.test(s);
    }

    _featuredJobToDetailData(featured) {
        if (!featured) return null;
        const name = featured.jobName || featured.job_name || '-';
        const skills = featured.techSkills || featured.skills || [];
        return {
            job_id: featured.jobId || featured.job_id,
            job_name: name,
            basic_info: {
                avg_salary: featured.salaryRange || featured.avg_salary || '-',
                industry: featured.industry || '-',
                level: featured.level || '-',
                work_locations: [],
                company_scales: [],
                description: ''
            },
            market_analysis: { demand_score: featured.demandScore ?? null, growth_trend: featured.trend || '稳定' },
            skills: Array.isArray(skills) ? skills : [],
            description: `该岗位暂无详细画像，可在「AI生成」页输入「${name}」生成完整画像。`
        };
    }

    // 4.2 岗位画像弹窗：全部走流式 AI 生成（无硬编码数据）
    openJobProfileModalStream(jobName, jobDescription) {
        const self = this;
        const modal = document.getElementById('jobDetailModal');
        const contentEl = document.getElementById('jobDetailModalContent');
        if (!modal || !contentEl) return;
        if (!self || typeof self._tryPartialRender !== 'function') {
            contentEl.innerHTML = '<div class="hint-text">加载异常，请刷新页面重试</div>';
            return;
        }

        // 每次打开新岗位画像时，终止上一条仍在进行的流式请求，避免串流覆盖
        if (self._jobProfileStreamController && typeof self._jobProfileStreamController.abort === 'function') {
            try {
                self._jobProfileStreamController.abort();
            } catch (_) { }
        }
        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        self._jobProfileStreamController = controller;

        // 递增请求编号，用于在回调中判定「当前请求是否仍然是最新一次」
        self._jobProfileStreamReqId = (self._jobProfileStreamReqId || 0) + 1;
        const reqId = self._jobProfileStreamReqId;
        contentEl.dataset.jobProfileReqId = String(reqId);

        self._currentJobDetail = { job_id: null, job_name: jobName };
        modal.classList.remove('hidden');
        self._renderStreamingSkeleton(contentEl, jobName);

        const streamUrl = typeof getJobProfileStreamURL === 'function' ? getJobProfileStreamURL() : (window.API_CONFIG && (window.API_CONFIG.jobProfilesBaseURL || window.API_CONFIG.assessmentBaseURL) ? (window.API_CONFIG.jobProfilesBaseURL || window.API_CONFIG.assessmentBaseURL) + '/job/generate-profile-stream' : 'http://localhost:5002/api/v1/job/generate-profile-stream');
        let buffer = '';

        fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_name: jobName, job_description: jobDescription || '' }),
            ...(controller ? { signal: controller.signal } : {})
        }).then(res => {
            // 若在响应返回前用户已点击了新的岗位，则直接忽略该响应
            if (reqId !== self._jobProfileStreamReqId) {
                return null;
            }
            if (!res.ok) {
                if (contentEl) contentEl.innerHTML = '<div class="hint-text">请求失败: ' + res.status + '，请确认 AI 服务已启动</div>';
                return;
            }
            return res.body.getReader();
        }).then(reader => {
            if (!reader) return;
            const decoder = new TextDecoder();
            const readNext = () => {
                reader.read().then(({ done, value }) => {
                    // 若已经有更新的请求在进行中，则停止继续读取本次流
                    if (reqId !== self._jobProfileStreamReqId) {
                        try { reader.cancel(); } catch (_) { }
                        return;
                    }
                    if (done) {
                        let parsed = null;
                        try { parsed = JSON.parse(buffer); } catch (_) {
                            const start = buffer.indexOf('{');
                            if (start >= 0) {
                                let depth = 0, end = -1;
                                for (let i = start; i < buffer.length; i++) {
                                    if (buffer[i] === '{') depth++; else if (buffer[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
                                }
                                if (end > start) try { parsed = JSON.parse(buffer.slice(start, end + 1)); } catch (_) {}
                            }
                        }
                        if (reqId === self._jobProfileStreamReqId && parsed && !parsed.error && self && self._mapStreamToProfileData && self.renderJobProfileDetail) {
                            const mapped = self._mapStreamToProfileData(jobName, parsed);
                            self.renderJobProfileDetail(mapped, contentEl);
                        } else if (reqId === self._jobProfileStreamReqId && parsed && parsed.error && contentEl) {
                            contentEl.innerHTML = '<div class="hint-text">生成异常: ' + (parsed.error || '').replace(/</g, '&lt;') + '</div>';
                        } else if (reqId === self._jobProfileStreamReqId && contentEl) {
                            contentEl.querySelectorAll('.streaming-cursor').forEach(el => el.classList.remove('streaming-cursor'));
                        }
                        // 当前流结束，将 controller 置空
                        if (reqId === self._jobProfileStreamReqId) {
                            self._jobProfileStreamController = null;
                        }
                        return;
                    }
                    try {
                        const chunk = decoder.decode(value != null ? value : new Uint8Array(0), { stream: true });
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const payload = line.slice(6).trim();
                            if (payload === '[DONE]') continue;
                            try {
                                const obj = JSON.parse(payload);
                                if (obj.text) buffer += obj.text;
                                if (obj.error) buffer += '';
                            } catch (_) {}
                        }
                        if (reqId === self._jobProfileStreamReqId && self && typeof self._tryPartialRender === 'function') {
                            self._tryPartialRender(contentEl, jobName, buffer);
                        }
                    } catch (e) {
                        if (reqId === self._jobProfileStreamReqId && contentEl) contentEl.innerHTML = '<div class="hint-text">解析数据异常，请重试</div>';
                        return;
                    }
                    return readNext();
                }).catch(err => {
                    const msg = (err && err.message) ? err.message : '连接中断，请重试';
                    if (reqId === self._jobProfileStreamReqId && contentEl) contentEl.innerHTML = '<div class="hint-text">网络错误: ' + String(msg).replace(/</g, '&lt;') + '</div>';
                });
            };
            readNext();
        }).catch(err => {
            const msg = (err && err.message) ? err.message : '无法连接';
            if (reqId === self._jobProfileStreamReqId && contentEl) {
                contentEl.innerHTML = '<div class="hint-text">无法连接 AI 服务，请确认已启动 (http://localhost:5002)。' + String(msg).replace(/</g, '&lt;') + '</div>';
            }
        });
    }

    _renderStreamingSkeleton(container, jobName) {
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        container.innerHTML = `
            <div class="modal-header">
                <div class="header-top">
                    <div>
                        <div class="job-title">${esc(jobName)}</div>
                        <div class="job-meta"></div>
                    </div>
                    <div class="salary-badge">—</div>
                </div>
                <div class="header-stats">
                    <div class="stat-item"><span class="stat-icon">\uD83D\uDCCD</span><div class="stat-label">工作地点</div><div class="stat-value"><span class="skeleton" style="width:60px;display:inline-block"></span></div></div>
                    <div class="stat-item"><span class="stat-icon">\uD83C\uDFE2</span><div class="stat-label">公司规模</div><div class="stat-value"><span class="skeleton" style="width:50px;display:inline-block"></span></div></div>
                    <div class="stat-item"><span class="stat-icon">\uD83D\uDCC8</span><div class="stat-label">需求热度</div><div class="stat-value"><span class="skeleton" style="width:40px;display:inline-block"></span><div class="stat-demand-bar"><div class="stat-demand-fill" style="width:0%"></div></div></div></div>
                </div>
            </div>
            <div class="modal-body">
                <div class="section"><div class="section-title">快速概览</div>
                    <div class="quick-stats">
                        <div class="qs-card"><div class="qs-icon">\uD83C\uDF93</div><div class="qs-label">学历要求</div><div class="qs-val"><span class="skeleton" style="width:70px;display:inline-block"></span></div></div>
                        <div class="qs-card"><div class="qs-icon">\u23F1\uFE0F</div><div class="qs-label">工作经验</div><div class="qs-val"><span class="skeleton" style="width:60px;display:inline-block"></span></div></div>
                        <div class="qs-card"><div class="qs-icon">\uD83C\uDFC6</div><div class="qs-label">竞赛加分</div><div class="qs-val"><span class="skeleton" style="width:80px;display:inline-block"></span></div></div>
                        <div class="qs-card"><div class="qs-icon">\uD83D\uDCBC</div><div class="qs-label">实习要求</div><div class="qs-val"><span class="skeleton" style="width:50px;display:inline-block"></span></div></div>
                    </div>
                </div>
                <div class="section"><div class="section-title">核心技能要求</div><div class="skills-grid"><span class="skeleton" style="width:80px;height:28px;display:inline-block"></span><span class="skeleton" style="width:90px;height:28px;display:inline-block"></span></div></div>
                <div class="section"><div class="section-title">岗位描述</div><p class="job-detail-desc streaming-cursor">正在生成...</p></div>
            </div>`;
    }

    _tryPartialRender(container, jobName, text) {
        // 仅允许当前最新请求更新对应容器，避免旧请求覆盖新岗位内容
        const reqIdAttr = container && container.dataset ? container.dataset.jobProfileReqId : null;
        if (reqIdAttr && String(this._jobProfileStreamReqId || '') !== String(reqIdAttr)) {
            return;
        }

        // DOM 更新节流：最多约每 80ms 更新一次，缓解频繁重绘造成的卡顿
        const now = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        if (now - (this._jobProfileLastPartialTs || 0) < 80) {
            return;
        }
        this._jobProfileLastPartialTs = now;

        const simple = ['salary', 'location', 'company_size', 'demand_score', 'trend', 'experience', 'education', 'competition', 'english', 'internship'];
        simple.forEach(field => {
            // 只匹配已经有完整闭合引号的字段值，避免流式截断时渲染不完整内容
            const strMatch = text.match(new RegExp('"' + field + '"\\s*:\\s*"([^"\\n]{1,200})"\\s*[,}\\n]'));
            if (strMatch) this._renderStreamField(container, field, strMatch[1]);
            const numMatch = text.match(new RegExp('"' + field + '"\\s*:\\s*(\\d+)'));
            if (numMatch && field === 'demand_score') this._renderStreamField(container, field, parseInt(numMatch[1], 10));
        });
        const trendMatch = text.match(/"trend"\s*:\s*"([^"]*)"/);
        if (trendMatch) this._renderStreamField(container, 'trend', trendMatch[1]);

        // 岗位描述流式：精确匹配顶层 "description" 字段（排除 abilities 里的 "desc" 子字段）
        // 用正则要求 "description" 前面是换行/逗号/{ ，确保是顶层字段
        const descTopMatch = text.match(/[,{\n]\s*"description"\s*:\s*"((?:[^"\\]|\\.)*)("?)/);
        if (descTopMatch) {
            const desc = descTopMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            if (desc.length > 0) this._renderStreamField(container, 'description', desc);
        }

        // 核心技能流式：只在数组完整闭合时渲染，避免流式截断
        ['skills_core', 'skills_advanced', 'skills_plus'].forEach(field => {
            const partial = this._extractPartialStringArray(text, field);
            // 只在该数组已完整闭合（找到对应的 ]）时才渲染，避免流式截断
            const keyIdx = text.indexOf('"' + field + '"');
            if (keyIdx < 0) return;
            const bracketOpen = text.indexOf('[', keyIdx);
            if (bracketOpen < 0) return;
            const bracketClose = text.indexOf(']', bracketOpen);
            if (bracketClose < 0) return; // 数组还没闭合，等待
            if (partial.length > 0) this._renderStreamField(container, field, partial);
        });

        // 综合能力要求流式：解析出已完整的 ability 对象并逐条渲染
        const partialAbilities = this._extractPartialObjectArray(text, 'abilities');
        if (partialAbilities.length > (container._streamAbilitiesCount || 0)) {
            container._streamAbilitiesCount = partialAbilities.length;
            this._renderStreamField(container, 'abilities', partialAbilities);
        }
        // 证书 & 认证要求流式：解析出已完整的 cert 对象并逐条渲染
        const partialCerts = this._extractPartialObjectArray(text, 'certs');
        if (partialCerts.length > (container._streamCertsCount || 0)) {
            container._streamCertsCount = partialCerts.length;
            this._renderStreamField(container, 'certs', partialCerts);
        }

        const arrays = ['intern_directions'];
        arrays.forEach(field => {
            const m = text.match(new RegExp('"' + field + '"\\s*:\\s*(\\[)', 's'));
            if (!m) return;
            let depth = 0, start = text.indexOf('"', text.indexOf(field)) + field.length + 4;
            if (text[start] !== '[') return;
            let end = start;
            for (let i = start; i < text.length; i++) {
                if (text[i] === '[') depth++; else if (text[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
            }
            try {
                const arr = JSON.parse(text.slice(start, end));
                this._renderStreamField(container, field, arr);
            } catch (_) {}
        });
    }

    _extractPartialObjectArray(text, key) {
        const keyStr = '"' + key + '"';
        const idx = text.indexOf(keyStr);
        if (idx < 0) return [];
        const bracket = text.indexOf('[', idx);
        if (bracket < 0) return [];
        const result = [];
        let i = bracket + 1;
        while (i < text.length) {
            while (i < text.length && /[\s,]/.test(text[i])) i++;
            if (i >= text.length || text[i] === ']') break;
            if (text[i] !== '{') return result;
            const start = i;
            let depth = 1;
            let inString = false;
            let escape = false;
            i++;
            while (i < text.length && depth > 0) {
                const c = text[i];
                if (escape) { escape = false; i++; continue; }
                if (inString) {
                    if (c === '\\') escape = true;
                    else if (c === '"') inString = false;
                    i++;
                    continue;
                }
                if (c === '"') { inString = true; i++; continue; }
                if (c === '{') depth++;
                else if (c === '}') depth--;
                i++;
            }
            if (depth === 0) {
                try {
                    const obj = JSON.parse(text.slice(start, i));
                    result.push(obj);
                } catch (_) {}
            }
        }
        return result;
    }

    _extractPartialStringArray(text, key) {
        const keyStr = '"' + key + '"';
        const idx = text.indexOf(keyStr);
        if (idx < 0) return [];
        const bracket = text.indexOf('[', idx);
        if (bracket < 0) return [];
        const result = [];
        let i = bracket + 1;
        while (i < text.length) {
            while (i < text.length && /[\s,]/.test(text[i])) i++;
            if (i >= text.length || text[i] === ']') break;
            if (text[i] !== '"') return result;
            let s = '';
            i++;
            while (i < text.length) {
                if (text[i] === '\\' && (text[i + 1] === '"' || text[i + 1] === '\\')) { s += text[i + 1]; i += 2; continue; }
                if (text[i] === '"') { i++; result.push(s); break; }
                s += text[i];
                i++;
            }
        }
        return result;
    }

    _renderStreamField(container, field, value) {
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const clean = (s) => {
            if (s == null) return '';
            let v = String(s).trim();
            // 去掉前后多余的花括号/圆括号（例如 "{Linux", "Linux{", "（云计算）"）
            v = v.replace(/^[{\(\uFF5B\uFF08]+/, '').replace(/[}\)\uFF5D\uFF09{]+$/, '');
            return v.trim();
        };
        const sel = (q) => container.querySelector(q);
        const all = (q) => container.querySelectorAll(q);
        switch (field) {
            case 'salary': {
                const sb = sel('.salary-badge');
                if (sb) {
                    const s = (value != null ? String(value) : '—').replace(/\/月|／月/g, '').trim() || '—';
                    sb.textContent = s;
                }
                break;
            }
            case 'location': {
                const vals = all('.header-stats .stat-value');
                if (vals[0]) vals[0].innerHTML = value != null ? esc(clean(value)) : '—';
                break;
            }
            case 'company_size': {
                const vals = all('.header-stats .stat-value');
                if (vals[1]) vals[1].textContent = value != null ? clean(value) : '—';
                break;
            }
            case 'demand_score': {
                const vals = all('.header-stats .stat-value');
                if (vals[2]) {
                    const trend = (container._streamTrend || '稳定').trim();
                    const trendHtml = trend === '上升' ? '<span class="trend-up">▲ 上升</span>' : (trend === '下降' ? '<span style="color:#dc2626">▼ 下降</span>' : '<span style="color:#64748b">稳定</span>');
                    vals[2].innerHTML = (value != null ? '<span class="stat-demand-num">' + value + '</span> ' + trendHtml : '—') + (value != null ? '<div class="stat-demand-bar"><div class="stat-demand-fill" style="width:' + Math.min(100, Number(value)) + '%"></div></div>' : '');
                }
                break;
            }
            case 'trend':
                container._streamTrend = value;
                const v2 = all('.header-stats .stat-value');
                if (v2[2]) {
                    const v = container._streamTrend;
                    const trendHtml = v === '上升' ? '<span class="trend-up">▲ 上升</span>' : (v === '下降' ? '<span style="color:#dc2626">▼ 下降</span>' : '<span style="color:#64748b">稳定</span>');
                    const num = (v2[2].textContent || '').replace(/\D/g, '') || '—';
                    const bar = v2[2].querySelector('.stat-demand-bar');
                    const barHtml = bar ? bar.outerHTML : (num !== '—' ? '<div class="stat-demand-bar"><div class="stat-demand-fill" style="width:' + Math.min(100, parseInt(num, 10)) + '%"></div></div>' : '');
                    v2[2].innerHTML = (num !== '—' ? '<span class="stat-demand-num">' + num + '</span> ' + trendHtml : '—') + barHtml;
                    const barEl = v2[2].querySelector('.stat-demand-bar');
                    if (barEl && barEl.querySelector('.stat-demand-fill')) barEl.querySelector('.stat-demand-fill').style.width = (num !== '—' ? Math.min(100, parseInt(num, 10)) : 0) + '%';
                }
                break;
            case 'experience': case 'education': case 'competition': case 'english': case 'internship': {
                const idx = { education: 0, experience: 1, competition: 2, internship: 3 }[field];
                if (idx === undefined) break;
                const qv = all('.quick-stats .qs-val');
                if (qv[idx]) qv[idx].innerHTML = value != null ? esc(clean(value)) : '—';
                break;
            }
            case 'description': {
                const descEl = sel('.job-detail-desc');
                if (descEl) {
                    const raw = (value != null ? clean(value) : '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
                    descEl.innerHTML = raw || '正在生成...';
                    descEl.classList.add('streaming-cursor');
                }
                break;
            }
            case 'skills_core': case 'skills_advanced': case 'skills_plus': {
                const grid = sel('.skills-grid');
                if (!grid || !Array.isArray(value)) return;
                container._streamSkills = container._streamSkills || { core: [], advanced: [], plus: [] };
                if (field === 'skills_core') container._streamSkills.core = value;
                else if (field === 'skills_advanced') container._streamSkills.advanced = value;
                else container._streamSkills.plus = value;
                grid.innerHTML = '';
                ['core', 'advanced', 'plus'].forEach(k => {
                    (container._streamSkills[k] || []).forEach(s => {
                        const text = clean(s).trim();
                        if (!text) return;
                        const span = document.createElement('span');
                        span.className = 'skill-chip';
                        span.innerHTML = '<span class="skill-dot"></span>' + esc(text);
                        grid.appendChild(span);
                    });
                });
                break;
            }
            case 'abilities':
                if (!Array.isArray(value)) return;
                let tbody = container.querySelector('.ability-table tbody');
                if (!tbody) {
                    const sec = document.createElement('div');
                    sec.className = 'section';
                    sec.innerHTML = '<div class="section-title">综合能力要求</div><table class="ability-table"><tbody></tbody></table>';
                    container.querySelector('.modal-body').appendChild(sec);
                    tbody = container.querySelector('.ability-table tbody');
                }
                if (tbody) {
                    tbody.innerHTML = '';
                    value.forEach(ab => {
                        const lvClass = (ab.level_type === 'high') ? 'lv-high' : (ab.level_type === 'medium') ? 'lv-medium' : 'lv-base';
                        let descHtml = (ab.desc || '').replace(/</g, '&lt;');
                        (ab.keywords || []).forEach(kw => { descHtml = descHtml.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<span class="ab-kw">' + esc(kw) + '</span>'); });
                        tbody.appendChild((() => { const tr = document.createElement('tr'); tr.innerHTML = '<td class="ab-icon-col"><div class="ab-icon-wrap">' + (ab.icon || '') + '</div></td><td class="ab-name-col"><div class="ab-name">' + esc(ab.name) + '</div><span class="ab-level ' + lvClass + '">' + esc(ab.level) + '</span></td><td class="ab-desc-col"><div class="ab-desc">' + descHtml + '</div></td>'; return tr; })());
                    });
                }
                break;
            case 'certs':
                if (!Array.isArray(value)) return;
                let certList = container.querySelector('.cert-list');
                if (!certList) {
                    const sec = document.createElement('div');
                    sec.className = 'section';
                    sec.innerHTML = '<div class="section-title">证书 & 认证要求</div><div class="cert-list"></div>';
                    container.querySelector('.modal-body').appendChild(sec);
                    certList = container.querySelector('.cert-list');
                }
                if (certList) {
                    certList.innerHTML = '';
                    value.forEach(c => {
                        const bClass = c.type_code === 'must' ? 'b-must' : c.type_code === 'plus' ? 'b-plus' : 'b-opt';
                        const row = document.createElement('div');
                        row.className = 'cert-row';
                        row.innerHTML = '<div class="cert-icon-wrap">' + (c.icon || '') + '</div><div class="cert-main"><div class="cert-name">' + esc(c.name) + '</div><div class="cert-sub">' + esc(c.desc) + '</div></div><span class="cert-badge ' + bClass + '">' + esc(c.type) + '</span>';
                        certList.appendChild(row);
                    });
                }
                break;
            case 'intern_directions':
                if (!Array.isArray(value)) return;
                let internGrid = container.querySelector('.intern-grid');
                if (!internGrid) {
                    const sec = document.createElement('div');
                    sec.className = 'section';
                    sec.innerHTML = '<div class="section-title">推荐实习方向</div><div class="intern-grid"></div>';
                    container.querySelector('.modal-body').appendChild(sec);
                    internGrid = container.querySelector('.intern-grid');
                }
                if (internGrid) {
                    internGrid.innerHTML = '';
                    value.forEach(intern => {
                        const card = document.createElement('div');
                        card.className = 'intern-card';
                        const tags = (intern.companies || []).map(c => '<span class="itag">' + esc(c) + '</span>').join('');
                        card.innerHTML = '<div class="intern-co">' + (intern.icon || '') + ' ' + esc(intern.type) + '</div><div class="intern-role">' + esc(intern.role) + '</div><div class="intern-tags">' + tags + '</div>';
                        internGrid.appendChild(card);
                    });
                }
                break;
        }
    }

    _mapStreamToProfileData(jobName, raw) {
        const cleanText = (s) => {
            if (s == null) return '';
            let v = String(s).trim();
            // 去掉流式 JSON 解析中偶发的前后孤立花括号/圆括号/中文括号
            v = v.replace(/^[{\(\uFF5B\uFF08]+/, '').replace(/[}\)\uFF5D\uFF09{]+$/, '');
            return v.trim();
        };

        const locRaw = raw.location || '';
        const workLocs = Array.isArray(locRaw)
            ? locRaw.map(cleanText)
            : (locRaw && String(locRaw).split(/[、，,]\s*/).map(s => cleanText(s)).filter(Boolean));
        const scale = cleanText(raw.company_size || '');
        const skills = [].concat(raw.skills_core || [], raw.skills_advanced || [], raw.skills_plus || []);
        return {
            job_id: null,
            job_name: jobName,
            basic_info: {
                avg_salary: cleanText(raw.salary || '-'),
                industry: '—',
                level: '—',
                work_locations: workLocs.length ? workLocs : [],
                company_scales: scale ? [scale] : [],
                education_requirement: cleanText(raw.education || '-'),
                work_experience: cleanText(raw.experience || '-'),
                competition_bonus: cleanText(raw.competition || '-'),
                internship_requirement: cleanText(raw.internship || '-'),
                description: cleanText(raw.description || '')
            },
            market_analysis: { demand_score: raw.demand_score != null ? Number(raw.demand_score) : null, growth_trend: raw.trend || '稳定' },
            skills,
            abilities: raw.abilities,
            certs: raw.certs,
            intern_directions: raw.intern_directions
        };
    }

    _bindJobDetailFooterButtons() {
        // 底部按钮已移除，保留空方法避免调用处报错
    }

    closeJobDetailModal() {
        const modal = document.getElementById('jobDetailModal');
        if (modal) modal.classList.add('hidden');
    }

    // 渲染岗位详细画像（严格按 job_profile_modal.html 模拟画面：Header + 快速概览 + 专业技能 + 岗位描述 + 路径 + Footer）
    renderJobProfileDetail(data, container) {
        const bi = data.basic_info || {};
        const ma = data.market_analysis || {};
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        let salary = (bi.avg_salary || data.avg_salary || '-').toString().replace(/\/月|／月/g, '').trim() || '-';
        const industry = (bi.industry || '-').toString().trim();
        const level = (bi.level || '-').toString().trim();
        const locations = bi.work_locations ? bi.work_locations.join('、') : '-';
        const scales = bi.company_scales ? bi.company_scales.join('、') : '-';
        const demandScore = ma.demand_score != null ? Number(ma.demand_score) : null;
        const trend = (ma.growth_trend || data.growth_trend || '稳定').trim();
        const trendHtml = trend === '上升' ? '<span class="trend-up">▲ 上升</span>' : (trend === '下降' ? '<span style="color:#dc2626">▼ 下降</span>' : '<span style="color:#64748b">稳定</span>');
        const jobName = data.job_name || '-';

        // 快速概览（学历/经验/竞赛/实习）- 无数据时显示「暂无」
        const edu = bi.education_requirement || bi.education || '-';
        const exp = bi.work_experience || bi.experience || '-';
        const competition = bi.competition_bonus || '-';
        const intern = bi.internship_requirement || bi.internship || '-';

        let html = `
            <div class="modal-header">
                <div class="header-top">
                    <div>
                        <div class="job-title">${esc(jobName)}</div>
                        <div class="job-meta">
                            ${industry && industry !== '-' && industry !== '—' ? `<span class="meta-tag">${esc(industry)}</span>` : ''}
                            ${level && level !== '-' && level !== '—' ? `<span class="meta-tag">${esc(level)}</span>` : ''}
                        </div>
                    </div>
                    <div class="salary-badge">${esc(salary)}</div>
                </div>
                <div class="header-stats">
                    <div class="stat-item">
                        <span class="stat-icon">\uD83D\uDCCD</span>
                        <div class="stat-label">工作地点</div>
                        <div class="stat-value">${esc(locations) || '—'}</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">\uD83C\uDFE2</span>
                        <div class="stat-label">公司规模</div>
                        <div class="stat-value">${esc(scales) || '—'}</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">\uD83D\uDCC8</span>
                        <div class="stat-label">需求热度</div>
                        <div class="stat-value">
                            ${demandScore != null ? `<span class="stat-demand-num">${demandScore}</span> ${trendHtml}` : '—'}
                            ${demandScore != null ? `<div class="stat-demand-bar"><div class="stat-demand-fill" style="width:${Math.min(100, demandScore)}%"></div></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-body">
                <div class="section">
                    <div class="section-title">快速概览</div>
                    <div class="quick-stats">
                        <div class="qs-card"><div class="qs-icon">\uD83C\uDF93</div><div class="qs-label">学历要求</div><div class="qs-val">${esc(edu)}</div></div>
                        <div class="qs-card"><div class="qs-icon">\u23F1\uFE0F</div><div class="qs-label">工作经验</div><div class="qs-val">${esc(exp)}</div></div>
                        <div class="qs-card"><div class="qs-icon">\uD83C\uDFC6</div><div class="qs-label">竞赛加分</div><div class="qs-val">${esc(competition)}</div></div>
                        <div class="qs-card"><div class="qs-icon">\uD83D\uDCBC</div><div class="qs-label">实习要求</div><div class="qs-val">${esc(intern)}</div></div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">核心技能要求</div>
                    <div class="skills-grid">`;

        const skills = [];
        if (data.requirements && data.requirements.professional_skills) {
            const ps = data.requirements.professional_skills;
            if (ps.programming_languages) ps.programming_languages.forEach(s => { if (s && s.skill) skills.push(s.skill); });
            if (ps.frameworks_tools) ps.frameworks_tools.forEach(s => { if (s && s.skill) skills.push(s.skill); });
        }
        if (data.skills && Array.isArray(data.skills)) data.skills.forEach(s => skills.push(typeof s === 'string' ? s : (s.skill || s.name)));
        if (skills.length > 0) {
            skills.slice(0, 12).forEach(s => {
                html += `<span class="skill-chip"><span class="skill-dot"></span>${esc(s)}</span>`;
            });
        } else {
            html += '<span class="skill-chip"><span class="skill-dot"></span>暂无</span>';
        }

        const desc = bi.description || data.description || '';
        html += `
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">岗位描述</div>
                    <p class="job-detail-desc">${desc ? (desc + '').replace(/</g, '&lt;').replace(/\n/g, '<br>') : '暂无描述'}</p>
                </div>`;

        if (data.abilities && Array.isArray(data.abilities) && data.abilities.length > 0) {
            const lvClass = (lt) => (lt === 'high' ? 'lv-high' : lt === 'medium' ? 'lv-medium' : 'lv-base');
            html += '<div class="section"><div class="section-title">综合能力要求</div><table class="ability-table"><tbody>';
            data.abilities.forEach(ab => {
                const descHtml = (ab.desc || '').replace(/</g, '&lt;');
                const kwWrap = (ab.keywords || []).reduce((s, kw) => s.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<span class="ab-kw">' + esc(kw) + '</span>'), descHtml);
                html += '<tr><td class="ab-icon-col"><div class="ab-icon-wrap">' + (ab.icon || '') + '</div></td><td class="ab-name-col"><div class="ab-name">' + esc(ab.name) + '</div><span class="ab-level ' + lvClass(ab.level_type) + '">' + esc(ab.level) + '</span></td><td class="ab-desc-col"><div class="ab-desc">' + kwWrap + '</div></td></tr>';
            });
            html += '</tbody></table></div>';
        }
        if (data.certs && Array.isArray(data.certs) && data.certs.length > 0) {
            const bClass = (tc) => (tc === 'must' ? 'b-must' : tc === 'plus' ? 'b-plus' : 'b-opt');
            html += '<div class="section"><div class="section-title">证书 & 认证要求</div><div class="cert-list">';
            data.certs.forEach(c => {
                html += '<div class="cert-row"><div class="cert-icon-wrap">' + (c.icon || '') + '</div><div class="cert-main"><div class="cert-name">' + esc(c.name) + '</div><div class="cert-sub">' + esc(c.desc) + '</div></div><span class="cert-badge ' + bClass(c.type_code) + '">' + esc(c.type) + '</span></div>';
            });
            html += '</div></div>';
        }
        if (data.intern_directions && Array.isArray(data.intern_directions) && data.intern_directions.length > 0) {
            html += '<div class="section"><div class="section-title">推荐实习方向</div><div class="intern-grid">';
            data.intern_directions.forEach(intern => {
                const tags = (intern.companies || []).map(c => '<span class="itag">' + esc(c) + '</span>').join('');
                html += '<div class="intern-card"><div class="intern-co">' + (intern.icon || '') + ' ' + esc(intern.type) + '</div><div class="intern-role">' + esc(intern.role) + '</div><div class="intern-tags">' + tags + '</div></div>';
            });
            html += '</div></div>';
        }

        if (data.career_path && data.career_path.promotion_path && data.career_path.promotion_path.length > 0) {
            const nodes = data.career_path.promotion_path.map(p => esc(p.level || p.stage_name || ''));
            html += `
                <div class="section">
                    <div class="section-title">职业发展路径</div>
                    <div class="job-detail-path">${nodes.map((n, i) => (i > 0 ? '<span class="job-detail-path-arrow">→</span>' : '') + `<span class="job-detail-path-node">${n || '-'}</span>`).join('')}</div>
                </div>`;
        }

        html += `
            </div>`;

        container.innerHTML = html;
    }

    // 关联图谱：按指令 + career_graph_v2 严格模拟，流式请求 /job/promotion-path、/job/transfer-path
    async loadCareerGraph(jobName) {
        const graphContainer = document.getElementById('jobProfileGraph');
        if (!graphContainer) return;
        window._cachedGraphNodes = null;
        const baseURL = API_CONFIG.assessmentBaseURL || API_CONFIG.jobProfilesBaseURL || 'http://localhost:5002/api/v1';
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        graphContainer.innerHTML = `
            <div class="graph-job-header job-header-v2">
                <div class="jh-title-v2">🎯 ${esc(jobName)}</div>
                <div class="jh-metas-v2">
                    <span class="jh-meta-v2">🔥 薪资参考</span>
                    <span class="jh-meta-v2">📊 需求热度</span>
                    <span class="jh-meta-v2">📍 行业</span>
                </div>
            </div>
            <div class="graph-tab-bar-v2">
                <button type="button" class="graph-tab-v2 active" data-graph-panel="promo">📋 晋升路径</button>
                <button type="button" class="graph-tab-v2" data-graph-panel="transfer">🔄 转岗路径</button>
            </div>
            <div class="graph-panel-v2 active" id="panel-promo-v2">
                <div id="promotionContainer" class="promo-container-v2"></div>
            </div>
            <div class="graph-panel-v2" id="panel-transfer-v2">
                <div class="transfer-container">
                    <div class="legend-row">
                        <span style="font-size:12px;color:var(--dim);font-weight:600">图例：</span>
                        <span class="leg"><span class="leg-line" style="background:linear-gradient(90deg,var(--accent),var(--green));height:2px"></span>高匹配（≥90%）</span>
                        <span class="leg"><span class="leg-line" style="background:linear-gradient(90deg,var(--accent),var(--gold));height:2px"></span>中匹配（80-89%）</span>
                        <span class="leg"><span class="leg-line" style="background:linear-gradient(90deg,var(--accent),var(--red));height:2px;border-top:2px dashed var(--red);background:none"></span>低匹配（&lt;80%）</span>
                        <span class="leg"><span style="font-size:14px">→</span>晋升方向</span>
                        <span style="margin-left:auto;font-size:11px;color:var(--muted)">实线=技能高度迁移 · 虚线=需较大跨度学习</span>
                    </div>
                    <div class="graph-svg-wrap" id="graphWrap">
                        <svg class="graph-svg" id="svgLayer"></svg>
                    </div>
                </div>
            </div>`;
        this._graphCurrentJobName = jobName;
        this._graphTransferLoaded = false;
        graphContainer.querySelectorAll('.graph-tab-v2').forEach(btn => {
            btn.addEventListener('click', () => {
                graphContainer.querySelectorAll('.graph-tab-v2').forEach(b => b.classList.remove('active'));
                graphContainer.querySelectorAll('.graph-panel-v2').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panelId = btn.dataset.graphPanel;
                const panelEl = document.getElementById('panel-' + panelId + '-v2');
                if (panelEl) panelEl.classList.add('active');
                if (panelId === 'transfer') {
                    if (window._cachedGraphNodes) {
                        setTimeout(() => buildGraph(window._cachedGraphNodes), 100);
                    } else if (!this._graphTransferLoaded && this._graphCurrentJobName) {
                        this._graphTransferLoaded = true;
                        loadTransferGraph(this._graphCurrentJobName);
                    }
                }
            });
        });
        this.loadPromotionPath(jobName);
    }

    async loadPromotionPath(jobName) {
        const container = document.getElementById('promotionContainer');
        if (!container) return;
        container.innerHTML = `<div style="text-align:center;padding:60px 0;color:#4a7350"><div class="graph-loading-spinner" style="margin:0 auto 12px"></div><div style="font-size:14px;margin-top:8px;font-weight:500">Agent正在生成垂直岗位图谱，请稍后...</div></div>`;
        try {
            const result = await getCareerPath(jobName);
            if (result.code === 200 && result.data && result.data.path && result.data.path.length) {
                const path = result.data.path;
                const stages = path.map((p, i) => ({
                    level: i + 1,
                    title: p.stage,
                    years: p.years || '',
                    salary: p.salary || '面议',
                    badge: i === 0 ? '入门级' : i === path.length - 1 ? '顶端' : '进阶',
                    description: '',
                    skills: p.skills || [],
                    companies: '',
                    promotion_hint: ''
                }));
                this.renderPromotionPath({ stages }, container);
            } else {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#aab4cc">暂无该岗位的晋升路径数据</div>';
            }
        } catch (e) {
            container.innerHTML = `<div style="color:#b94040;padding:20px;text-align:center">请求失败: ${(e.message||'').replace(/</g,'&lt;')}</div>`;
        }
    }

    renderPromotionPath(data, container) {
        const stages = data.stages || [];
        if (!stages.length) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#aab4cc">暂无数据</div>'; return; }
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;'));
        let html = '<div style="display:flex;flex-direction:column;align-items:center;padding:10px 20px 20px;position:relative">';
        stages.forEach((stage, idx) => {
            if (idx > 0 && !stages[idx - 1].forks) {
                html += `<div style="display:flex;flex-direction:column;align-items:center;padding:4px 0;height:52px"><div style="width:2px;height:28px;background:linear-gradient(180deg,#5e8c65,#4a7350)"></div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #4a7350"></div></div>`;
            }
            if (stage.forks) {
                html += '<div style="display:flex;gap:14px;width:100%">';
                (stage.forks || []).forEach(fork => {
                    const isExpert = (fork.route || '') === '专家路线';
                    html += `<div style="flex:1;background:#fff;border:1.5px solid ${isExpert?'rgba(124,92,255,0.25)':'rgba(245,166,35,0.25)'};border-radius:14px;padding:16px 18px">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">${isExpert?'🔬':'👔'}</span><span style="font-size:14px;font-weight:700;color:#1a2340">${esc(fork.title)}</span><span style="margin-left:auto;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${isExpert?'rgba(124,92,255,0.09)':'rgba(245,166,35,0.1)'};color:${isExpert?'#6644cc':'#c47d00'}">${esc(fork.route)}</span></div>
                        <div style="font-size:12px;color:#5a6a8a;margin-bottom:8px;line-height:1.6">${esc(fork.description)}</div>
                        <div style="font-size:12px;font-weight:700;color:#c47d00;margin-bottom:8px">💰 ${esc(stage.salary)}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${(fork.skills||[]).map(s=>`<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:rgba(79,124,255,0.07);color:#3d65e0;border:1px solid rgba(79,124,255,0.14)">${esc(s)}</span>`).join('')}</div>
                        <div style="font-size:11px;color:#aab4cc">${esc(fork.companies)}</div></div>`;
                });
                html += '</div>';
            } else {
                const cur = !!stage.is_current;
                const dotIcon = idx === 0 ? '🌱' : cur ? '🤖' : idx === stages.length - 2 ? '⭐' : '🚀';
                html += `<div style="display:flex;align-items:center;width:100%;gap:16px">
                    <div style="width:200px;flex-shrink:0;text-align:right;padding-right:8px"><div style="font-size:11px;font-weight:600;color:#aab4cc">${esc(stage.years)}${cur?' ← 当前':''}</div><div style="font-size:13px;font-weight:700;font-family:monospace;color:${cur?'#5e8c65':'#5e8c65'}">${esc(stage.salary)}</div></div>
                    <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:48px"><div style="width:44px;height:44px;border-radius:50%;background:${cur?'linear-gradient(135deg,#5e8c65,#4a7350)':'#fff'};border:3px solid ${cur?'#fff':'#5e8c65'};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:${cur?'0 4px 18px rgba(94,140,101,0.4)':'0 2px 12px rgba(94,140,101,0.2)'};position:relative;z-index:2">${dotIcon}</div></div>
                    <div style="flex:1;background:${cur?'linear-gradient(135deg,rgba(94,140,101,0.06),rgba(74,115,80,0.04))':'#fff'};border:1.5px solid ${cur?'rgba(94,140,101,0.3)':idx===0?'rgba(94,140,101,0.2)':'rgba(94,140,101,0.12)'};border-radius:14px;padding:14px 16px;position:relative;overflow:hidden">
                        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:14px 0 0 14px;background:${cur?'linear-gradient(180deg,#5e8c65,#4a7350)':idx===0?'#5e8c65':'#b8862a'}"></div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:14px;font-weight:700;color:#1a2340">${esc(stage.title)}</span><span style="margin-left:auto;font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:${cur?'rgba(94,140,101,0.1)':idx===0?'rgba(94,140,101,0.1)':'rgba(184,134,42,0.1)'};color:${cur?'#5e8c65':idx===0?'#5e8c65':'#b8862a'};border:1px solid ${cur?'rgba(94,140,101,0.2)':idx===0?'rgba(94,140,101,0.2)':'rgba(184,134,42,0.2)'}">${esc(stage.badge)}</span></div>
                        <div style="font-size:12px;color:#5a6a8a;line-height:1.6;margin-bottom:10px">${esc(stage.description)}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${(stage.skills||[]).map(s=>`<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:rgba(94,140,101,0.07);color:#5e8c65;border:1px solid rgba(94,140,101,0.14)">${esc(s)}</span>`).join('')}</div>
                        <div style="font-size:11px;color:#aab4cc">${esc(stage.companies)}</div></div></div>`;
            }
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadTransferPath(jobName) {
        const container = document.getElementById('transferContainer');
        if (!container) return;
        container.innerHTML = `<div style="text-align:center;padding:60px 0;color:#4a7350"><div class="graph-loading-spinner" style="margin:0 auto 12px"></div><div style="font-size:14px;margin-top:8px;font-weight:500">Agent正在生成换岗路径图谱，请稍后...</div></div>`;
        try {
            const result = await getRelationGraphByJobName(jobName);
            if (result.code === 200 && result.data && Array.isArray(result.data) && result.data.length) {
                this.renderTransferGraphECharts(result.data, result.center_job || { job_name: jobName }, container);
            } else {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#aab4cc">暂无该岗位的晋升数据</div>';
            }
        } catch (e) {
            container.innerHTML = `<div style="color:#ff4d6d;padding:20px;text-align:center">请求失败: ${(e.message||'').replace(/</g,'&lt;')}</div>`;
        }
    }

    renderTransferGraphECharts(relations, centerJob, container) {
        if (!relations.length) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#aab4cc">暂无晋升数据</div>'; return; }
        const list = relations.slice(0, 6);
        const centerName = (centerJob && centerJob.job_name) ? centerJob.job_name : '当前岗位';
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const W = Math.max(container.offsetWidth || 800, 800);
        const H = 880;
        container.innerHTML = '';
        container.className = 'graph-svg-wrap-v2 graph-transfer-canvas';
        container.style.cssText = 'position:relative;width:100%;height:' + H + 'px;min-height:' + H + 'px;';
        const cx = W / 2, cy = H * 0.55;
        const baseRadius = Math.min(W, H) * 0.36;
        const radius = baseRadius * 1.30;
        const CARD = { center: { w: 152, h: 120 }, job: { w: 160, h: 240 } };
        const pos = { center: { x: cx, y: cy } };
        const offsetPx = 40;
        list.forEach((rel, i) => {
            const angle = (2 * Math.PI * i / list.length) - Math.PI / 2;
            let dx = radius * Math.cos(angle);
            let dy = radius * Math.sin(angle);
            if (i === 0) { dx -= offsetPx; }
            else if (i === 3) { dx += offsetPx; }
            pos[esc(rel.job)] = { x: cx + dx, y: cy + dy };
        });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'graph-transfer-svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        const defs = '<defs>' +
            '<marker id="arrow-green" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 Z" fill="#5e8c65" stroke="#5e8c65"/></marker>' +
            '<marker id="arrow-orange" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 Z" fill="#b8862a" stroke="#b8862a"/></marker>' +
            '<marker id="arrow-red" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 Z" fill="#b94040" stroke="#b94040"/></marker>' +
            '<marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="#4a7350" stroke="#4a7350" opacity="0.7"/></marker>' +
            '</defs>';
        let pathsHtml = '';
        const pathLabels = [];
        const bezierOffset = 72;
        list.forEach(rel => {
            const job = (rel.job || '').trim();
            const match = Number(rel.match) || 0;
            const diffText = match >= 80 ? '高' : match >= 60 ? '中' : '低';
            const color = match >= 80 ? '#5e8c65' : match >= 60 ? '#b8862a' : '#b94040';
            const arrId = match >= 80 ? 'arrow-green' : match >= 60 ? 'arrow-orange' : 'arrow-red';
            const dash = match >= 80 ? '' : (match >= 60 ? 'stroke-dasharray="10 6"' : 'stroke-dasharray="7 5"');
            const dashClass = dash ? ' graph-path-dash' : '';
            const p1 = pos.center, p2 = pos[esc(job)];
            if (!p2) return;
            const len = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)) || 1;
            const ux = (p2.x - p1.x) / len, uy = (p2.y - p1.y) / len;
            const halfW = CARD.job.w / 2, halfH = CARD.job.h / 2;
            let gap = len;
            if (Math.abs(ux) > 1e-6 && Math.abs(uy) > 1e-6) gap = Math.min(halfW / Math.abs(ux), halfH / Math.abs(uy));
            else if (Math.abs(ux) > 1e-6) gap = halfW / Math.abs(ux);
            else if (Math.abs(uy) > 1e-6) gap = halfH / Math.abs(uy);
            const p2Edge = { x: p2.x - ux * gap, y: p2.y - uy * gap };
            const midX = (p1.x + p2Edge.x) / 2, midY = (p1.y + p2Edge.y) / 2;
            const perpX = (p2Edge.y - p1.y) / (Math.sqrt((p2Edge.x - p1.x) ** 2 + (p2Edge.y - p1.y) ** 2) || 1);
            const perpY = (p1.x - p2Edge.x) / (Math.sqrt((p2Edge.x - p1.x) ** 2 + (p2Edge.y - p1.y) ** 2) || 1);
            const cpx = midX + perpX * bezierOffset;
            const cpy = midY + perpY * bezierOffset;
            pathsHtml += '<path class="' + dashClass.trim() + '" d="M' + p1.x + ',' + p1.y + ' Q' + cpx + ',' + cpy + ' ' + p2Edge.x + ',' + p2Edge.y + '" fill="none" stroke="' + color + '" stroke-width="2.5" ' + dash + ' opacity="0.9" marker-end="url(#' + arrId + ')"/>';
            const labelX = p1.x * 0.4 + p2Edge.x * 0.6 + perpX * 12;
            const labelY = p1.y * 0.4 + p2Edge.y * 0.6 + perpY * 12;
            pathLabels.push({ x: labelX, y: labelY, text: match + '% · ' + diffText, color: color });
        });
        svg.innerHTML = defs + pathsHtml;
        container.appendChild(svg);
        pathLabels.forEach(l => {
            const lbl = document.createElement('div');
            lbl.className = 'graph-edge-label';
            lbl.style.cssText = 'left:' + l.x + 'px;top:' + l.y + 'px;color:' + l.color + ';border-color:' + l.color + '40';
            lbl.textContent = l.text;
            container.appendChild(lbl);
        });
        const centerEl = document.createElement('div');
        centerEl.className = 'g-node graph-center-node';
        centerEl.style.cssText = 'position:absolute;left:' + (cx - CARD.center.w / 2) + 'px;top:' + (cy - CARD.center.h / 2) + 'px;z-index:1';
        centerEl.innerHTML = '<div class="cn-product"><div style="font-size:28px;margin-bottom:8px">🤖</div><div style="font-size:14px;font-weight:700;line-height:1.3;margin-bottom:6px">' + esc(centerName) + '</div><div style="font-size:10px;background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.35);padding:3px 10px;border-radius:10px;display:inline-block">当前岗位</div></div>';
        container.appendChild(centerEl);
        list.forEach((rel, i) => {
            const job = (rel.job || '').trim() || ('岗位' + (i + 1));
            const match = Number(rel.match) || 0;
            const skills = Array.isArray(rel.skills) ? rel.skills : [];
            const skillsText = skills.length ? skills.slice(0, 5).join(' · ') : '—';
            const diffText = match >= 80 ? '高' : match >= 60 ? '中' : '低';
            const cycleText = match >= 80 ? '3-6月' : match >= 60 ? '6-12月' : '12-24月';
            const color = match >= 80 ? '#10b981' : match >= 60 ? '#f59e0b' : '#ef4444';
            /* 匹配度样式：与图例一致 高=绿、中=黄、低=红 */
            const diffBg = match >= 80 ? 'rgba(16,185,129,0.12)' : match >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)';
            const diffColor = match >= 80 ? '#059669' : match >= 60 ? '#d97706' : '#dc2626';
            const diffBorder = match >= 80 ? 'rgba(16,185,129,0.25)' : match >= 60 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.2)';
            const p = pos[esc(rel.job)];
            if (!p) return;
            const card = document.createElement('div');
            card.className = 'g-node graph-job-node graph-job-node-product';
            card.style.cssText = 'position:absolute;left:' + (p.x - CARD.job.w / 2) + 'px;top:' + (p.y - CARD.job.h / 2) + 'px;z-index:1;cursor:default';
            card.style.animationDelay = (i * 0.07) + 's';
            const barStyle = '--bar-pct:' + match + '%;background:' + color + ';animation-delay:' + (0.25 + i * 0.06) + 's';
            card.innerHTML = '<div class="jn" style="width:160px;background:#fff;border:1.5px solid ' + color + '50;border-radius:12px;padding:12px 14px;box-shadow:0 2px 12px rgba(79,100,200,0.08)">' +
                '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><div style="width:32px;height:32px;border-radius:10px;background:' + color + '18;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📌</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#1a2340;line-height:1.35">' + esc(job) + '</div></div></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:10px;color:#aab4cc">匹配度</span><span style="font-size:11px;font-weight:700;color:' + color + '">' + match + '%</span></div>' +
                '<div class="graph-job-bar-bg"><div class="graph-job-bar-fill" style="' + barStyle + '"></div></div>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
                '<span style="font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600;background:' + diffBg + ';color:' + diffColor + ';border:1px solid ' + diffBorder + '">难度' + diffText + '</span>' +
                '<span style="font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600;background:rgba(79,124,255,0.08);color:#3d65e0;border:1px solid rgba(79,124,255,0.18)">⏱ ' + cycleText + '</span></div>' +
                '<div style="font-size:9px;color:#5a6a8a;line-height:1.4;margin-bottom:6px"><span style="color:#4f7cff;font-weight:600">可迁移：</span>' + esc(skillsText) + '</div>' +
                '<div style="font-size:9px;color:#aab4cc;line-height:1.35">技能重叠度高，晋升成本较低</div></div>';
            container.appendChild(card);
        });
    }

    async _openRecruitmentsModal(jobName) {
        const list = await getJobRecruitments(jobName);
        const rows = (list && list.code === 200 && list.data) ? list.data : [];
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const fieldOrder = ['职位编号', '职位名称', '工作地址', '薪资范围', '企业性质', '公司全称', '人员规模', '所属行业', '职位描述', '公司简介'];
        let contentHtml = '';
        if (rows.length) {
            contentHtml = rows.map((r, idx) => {
                let rowsHtml = fieldOrder.map(key => '<tr><th style="text-align:right;width:100px;padding:8px 12px;font-weight:600;color:#5a6a8a;font-size:12px;border-bottom:1px solid rgba(79,124,255,0.08);vertical-align:top">' + esc(key) + '</th><td style="padding:8px 12px;color:#1a2340;font-size:13px;border-bottom:1px solid rgba(79,124,255,0.08);word-break:break-all">' + esc(r[key]) + '</td></tr>').join('');
                return '<div class="graph-recruit-vertical-block" style="margin-bottom:20px;border:1px solid rgba(79,124,255,0.12);border-radius:12px;overflow:hidden"><div style="background:rgba(79,124,255,0.06);padding:8px 12px;font-size:12px;font-weight:600;color:#1a2340">第 ' + (idx + 1) + ' 条</div><table style="width:100%;border-collapse:collapse;font-size:13px">' + rowsHtml + '</table></div>';
            }).join('');
        } else {
            contentHtml = '<div style="text-align:center;padding:32px;color:#aab4cc;font-size:14px">暂无该岗位的招聘数据</div>';
        }
        const overlay = document.createElement('div');
        overlay.id = 'graphRecruitModalOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.15);max-width:720px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column';
        box.innerHTML = '<div style="padding:16px 20px;border-bottom:1px solid rgba(79,124,255,0.12);display:flex;align-items:center;justify-content:space-between"><h3 style="margin:0;font-size:16px;font-weight:700;color:#1a2340">📋 「' + esc(jobName) + '」招聘信息（来自数据集）</h3><button type="button" class="graph-recruit-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#5a6a8a;padding:4px">×</button></div>' +
            '<div style="overflow:auto;flex:1;padding:16px">' + contentHtml + '</div>';
        overlay.appendChild(box);
        box.querySelector('.graph-recruit-close').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    // Top5 最优岗位弹窗（来自 GET /career-graph 真实数据）
    showTopJobsModal(jobName, topJobs) {
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        const list = Array.isArray(topJobs) ? topJobs : [];
        let contentHtml = '';
        if (list.length) {
            contentHtml = list.map((job, i) => {
                const company = esc(job.company);
                const location = esc(job.location);
                const salary = esc(job.salary);
                const industry = esc(job.industry);
                const scale = esc(job.scale);
                const companyType = esc(job.companyType || job.type);
                const desc = esc(job.description || '');
                return '<div class="top5-job-card" style="margin-bottom:16px;padding:14px;border:1px solid rgba(79,124,255,0.12);border-radius:12px;background:rgba(79,124,255,0.04)">' +
                    '<h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a2340">' + company + '</h3>' +
                    '<p style="margin:0 0 4px;font-size:12px;color:#5a6a8a">📍 ' + location + '</p>' +
                    '<p style="margin:0 0 4px;font-size:12px;color:#1a2340">💰 ' + salary + '</p>' +
                    '<p style="margin:0 0 8px;font-size:12px;color:#5a6a8a">🏢 ' + industry + (scale ? ' · ' + scale : '') + (companyType ? ' · ' + companyType : '') + '</p>' +
                    '<p style="margin:0;font-size:12px;color:#5a6a8a;line-height:1.5">' + desc + '</p></div>';
            }).join('');
        } else {
            contentHtml = '<div style="text-align:center;padding:24px;color:#aab4cc;font-size:14px">暂无 Top5 岗位数据</div>';
        }
        const overlay = document.createElement('div');
        overlay.id = 'graphTop5ModalOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.15);max-width:720px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column';
        box.innerHTML = '<div style="padding:16px 20px;border-bottom:1px solid rgba(79,124,255,0.12);display:flex;align-items:center;justify-content:space-between"><h3 style="margin:0;font-size:16px;font-weight:700;color:#1a2340">💼 「' + esc(jobName) + '」Top5 最优岗位（来自数据集）</h3><button type="button" class="graph-top5-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#5a6a8a;padding:4px">×</button></div>' +
            '<div style="overflow:auto;flex:1;padding:16px">' + contentHtml + '</div>';
        overlay.appendChild(box);
        box.querySelector('.graph-top5-close').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    // 4.3 加载岗位关联图谱：调用 POST /api/v1/job/relation-graph，并请求 GET /api/v1/job/career-graph 获取真实数据（晋升+转岗+Top5）
    async loadJobRelationGraph(jobId) {
        const graphContainer = document.getElementById('jobProfileGraph');
        if (!graphContainer) {
            console.warn('loadJobRelationGraph: #jobProfileGraph 不存在');
            return;
        }

        graphContainer.innerHTML = '<div class="graph-loading"><div class="graph-loading-spinner"></div><p>🤖Agent正在为您生成晋升与转岗图谱...</p></div>';

        const graphType = document.getElementById('graphTypeSelect')?.value || 'all';
        const GRAPH_TIMEOUT_MS = 25000;
        console.log('loadJobRelationGraph 发起请求 jobId=', jobId, 'graphType=', graphType);
        try {
            const result = await Promise.race([
                getJobRelationGraph(jobId, graphType),
                new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), GRAPH_TIMEOUT_MS))
            ]);
            if (result.success && result.data) {
                const jobName = (result.data.center_job && result.data.center_job.job_name)
                    ? result.data.center_job.job_name
                    : (document.getElementById('graphJobName')?.value || '').trim() || '算法工程师';
                // 优先使用 AI 生成个性化晋升路径（career-path-ai，含 requirements/actions/skills）
                const aiPathRes = await getCareerPathAI(jobName);
                if (aiPathRes.success && aiPathRes.data && aiPathRes.data.levels && aiPathRes.data.levels.length > 0) {
                    result.data._realCareerPathAI = aiPathRes.data.levels;
                }
                // 其次使用多样化晋升路径（测试/科研/前端/算法/Java/产品/硬件）
                const jobTypeForDiverse = (function () {
                    const n = (jobName || '').toLowerCase();
                    if (/测试/.test(n)) return '测试';
                    if (/科研|研究员|科学家/.test(n)) return '科研';
                    if (/前端/.test(n)) return '前端';
                    if (/算法|机器学习|AI/.test(n)) return '算法';
                    if (/java/.test(n)) return 'Java';
                    if (/产品|pm/.test(n)) return '产品';
                    if (/硬件/.test(n)) return '硬件';
                    return null;
                })();
                const diverseRes = jobTypeForDiverse ? await getCareerPathDiverse(jobTypeForDiverse) : { success: false };
                if (diverseRes.success && diverseRes.data && diverseRes.data.careerPath && diverseRes.data.careerPath.length > 0) {
                    const icons = ['🌱', '🌿', '🌳', '🏆'];
                    result.data._realCareerPath = diverseRes.data.careerPath.map(function (level, idx) {
                        return {
                            title: level.jobName || level.level,
                            year: level.year,
                            salary: level.salary || level.salaryRange || '',
                            icon: icons[idx] || '📌',
                            company: level.company,
                            location: level.location,
                            description: level.description,
                            isReal: level.hasRealData
                        };
                    });
                }
                const careerRes = await getCareerGraph(jobName);
                if (!result.data._realCareerPath && careerRes.success && careerRes.data) {
                    result.data._realCareerPath = (careerRes.data.careerPath || []).map(function (level) {
                        return { title: level.name, year: level.time, salary: level.salary, icon: level.icon };
                    });
                }
                if (!result.data._realCareerPath) result.data._realCareerPath = null;
                if (careerRes.success && careerRes.data) {
                    result.data._realTransferPaths = (careerRes.data.transferPaths || []).map(function (p) {
                        return {
                            job_name: p.name,
                            company: p.company || '',
                            location: p.location || '',
                            industry: p.industry || '',
                            salary: p.salary || '',
                            match: p.match != null ? p.match : 85,
                            difficulty: p.difficulty || '中',
                            time: p.time || '6-12个月'
                        };
                    });
                    if (typeof console !== 'undefined' && console.log) {
                        console.log('转岗路径数据:', result.data._realTransferPaths);
                    }
                    result.data._topJobs = careerRes.data.topJobs || [];
                } else {
                    if (!result.data._realTransferPaths) result.data._realTransferPaths = [];
                    if (!result.data._topJobs) result.data._topJobs = [];
                }
                this.renderJobRelationGraph(result.data, graphContainer);
            } else {
                // relation-graph 返回 404/失败时，按岗位名回退加载（仅用 career-path-ai + career-graph），避免一直“加载图谱中…”
                const jobName = (document.getElementById('graphJobName')?.value || '').trim() || this._graphJobName || '算法工程师';
                const is404 = result.code === 404 || (result.msg && String(result.msg).indexOf('404') !== -1);
                if (jobName && is404) {
                    console.warn('relation-graph 不可用，按岗位名回退加载:', jobName);
                    this.loadJobRelationGraphByJobNameOnly(jobName);
                    return;
                }
                graphContainer.innerHTML = '<div class="hint-text">图谱数据加载失败，请确认 AI 服务 (http://localhost:5002) 已启动</div>';
            }
        } catch (e) {
            console.error('loadJobRelationGraph:', e);
            const isTimeout = e && e.message === '请求超时';
            const jobName = (document.getElementById('graphJobName')?.value || '').trim() || this._graphJobName;
            if (jobName) {
                console.warn('relation-graph 异常，按岗位名回退加载:', jobName);
                this.loadJobRelationGraphByJobNameOnly(jobName);
                return;
            }
            const msg = isTimeout
                ? '请求超时，请检查网络或确认 AI 服务 (http://localhost:5002) 已启动'
                : '图谱数据加载失败，请确认 AI 服务 (http://localhost:5002) 已启动';
            graphContainer.innerHTML = '<div class="hint-text">' + msg + '</div>';
        }
    }

    // 4.3.1 加载晋升路径（垂直图谱）：优先预设阶段 getPromotionPathForDisplay，否则 getPromotionPath，确保卡片能显示
    loadCareerPath(jobName, containerEl) {
        const name = (jobName && String(jobName).trim()) ? String(jobName).trim() : '岗位';
        const list = getPromotionPathForDisplay(name);
        let container = containerEl || document.getElementById('careerPathContainer');
        if (!container) {
            // 兜底：在 .career-path 内创建并插入容器（可能首屏解析或时序导致原 div 未找到）
            const graphRoot = document.getElementById('jobProfileGraph');
            const careerPathWrap = graphRoot && graphRoot.querySelector('.career-path');
            if (careerPathWrap) {
                const existing = careerPathWrap.querySelector('.career-path-inner');
                container = existing || (() => {
                    const div = document.createElement('div');
                    div.id = 'careerPathContainer';
                    div.className = 'career-path-inner';
                    div.setAttribute('data-career-path-container', '');
                    careerPathWrap.appendChild(div);
                    return div;
                })();
            }
        }
        if (!container) {
            console.warn('loadCareerPath: careerPathContainer 未找到，jobName=', name);
            return;
        }
        this.renderCareerPath(list, container);
    }

    // 晋升路径卡片 HTML 字符串（假数据/静态实现，后续可改为接口返回的真实数据）
    getCareerPathHTML(nodes) {
        const escape = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        if (!nodes || nodes.length === 0) return '<div class="career-path-empty">暂无晋升路径数据</div>';
        const icons = ['🌱', '🌿', '🌳', '🏆', '🌟'];
        const list = nodes.slice(0, 5);
        return list.map((item, index) => {
            const title = (item.title != null ? String(item.title) : (item.job_name != null ? String(item.job_name) : ''));
            const year = (item.year != null ? String(item.year) : (item.years != null ? String(item.years) : ''));
            const salary = (item.salary != null ? String(item.salary) : '');
            const currentClass = index === 0 ? ' current' : '';
            const infoParts = [];
            if (year) infoParts.push('<span>⏱ ' + escape(year) + '</span>');
            if (salary) infoParts.push('<span>📈 ' + escape(salary) + '</span>');
            const levelInfoHtml = infoParts.length ? '<div class="level-info">' + infoParts.join('') + '</div>' : '';
            const realDataHtml = (item.isReal && (item.company || item.location))
                ? '<div class="level-real-data"><span class="real-badge">✅ 真实案例</span><p class="real-meta">' + escape(item.company || '') + (item.company && item.location ? ' · ' : '') + escape(item.location || '') + '</p></div>'
                : '';
            return `
            <div class="career-level${currentClass}" data-index="${index}">
                <div class="connection-dot"></div>
                <div class="level-card${currentClass}">
                    <div class="level-header">
                        <span class="level-icon">${(item.icon != null ? item.icon : icons[index]) || '📌'}</span>
                        <span class="level-name">${escape(title)}</span>
                    </div>
                    ${levelInfoHtml}
                    ${realDataHtml}
                </div>
            </div>`;
        }).join('');
    }

    // AI 晋升路径 HTML：严格按 晋升图谱美化版 结构（timeline + stage + stage-card，含 requirements/actions/skills）
    getCareerPathHTMLFromAI(levels) {
        const esc = (s) => (s == null ? '' : String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'));
        if (!levels || levels.length === 0) return '<div class="career-path-empty">暂无晋升路径数据</div>';
        const list = levels.slice(0, 5);
        const html = list.map((level, index) => {
            const levelName = esc(level.level || '');
            const year = esc(level.year || '');
            const salary = esc(level.salary || '');
            const salaryIncrease = level.salaryIncrease != null && level.salaryIncrease !== '' ? esc(String(level.salaryIncrease)) : null;
            const role = esc(level.role || '');
            const badge = esc(level.badge || (['入职期', '进阶期', '专家期', '领导期'][index] || ''));
            const icon = level.icon || ['🌱', '🌿', '🌳', '🏆'][index] || '📌';
            const requirements = Array.isArray(level.requirements) ? level.requirements : [];
            const actions = Array.isArray(level.actions) ? level.actions : [];
            const skills = Array.isArray(level.skills) ? level.skills : [];
            const currentClass = index === 0 ? ' current' : '';
            const infoItems = index === 0
                ? [
                    { label: '薪资范围', value: salary },
                    { label: '学历要求', value: '大专+' },
                    { label: '团队角色', value: role }
                ]
                : [
                    { label: '薪资范围', value: salary },
                    { label: '薪资涨幅', value: salaryIncrease || '—' },
                    { label: '团队角色', value: role }
                ];
            const infoHtml = infoItems.map(it => `<div class="info-item"><div class="info-item-label">${esc(it.label)}</div><div class="info-item-value"${it.label === '薪资涨幅' && it.value !== '—' ? ' style="color:#5e8c65"' : ''}>${esc(it.value)}</div></div>`).join('');
            const reqHtml = requirements.length
                ? `<div class="requirements"><div class="requirements-title"><span>📋</span> 核心要求</div><div class="requirements-list">${requirements.map(r => `<div class="requirement-item">${esc(r)}</div>`).join('')}</div></div>`
                : '';
            const actionsTitle = index === list.length - 1 ? '持续发展建议' : '晋升关键行动';
            const actionsHtml = `<div class="actions"><div class="actions-title"><span>🎯</span> ${actionsTitle}</div><div class="actions-list">${actions.map(a => `<div class="action-tag">${esc(a)}</div>`).join('')}</div></div>`;
            const skillsHtml = skills.length
                ? `<div class="skills">${skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}</div>`
                : '';
            return `<div class="stage${currentClass}" data-index="${index}">
                <div class="stage-dot">${icon}</div>
                <div class="stage-card${currentClass}">
                    <div class="stage-header">
                        <div class="stage-title">
                            <h3>${levelName}</h3>
                            <div class="stage-subtitle">${badge ? badge + (year ? ' · ' + year : '') : year || ''}</div>
                        </div>
                        <div class="stage-badge">${badge}</div>
                    </div>
                    <div class="stage-info">${infoHtml}</div>
                    ${reqHtml}
                    ${actionsHtml}
                    ${skillsHtml}
                </div>
            </div>`;
        }).join('');
        return `<div class="timeline timeline-ai">${html}</div>`;
    }

    // 渲染晋升路径竖向时间轴（可传入容器；若仅需 HTML 请用 getCareerPathHTML）
    renderCareerPath(nodes, container) {
        if (!container) return;
        container.innerHTML = this.getCareerPathHTML(nodes);
    }

    // 将旧版晋升数据（title/year/salary）转为 AI 接口同构（level, year, salary, role, badge, icon, requirements, actions, skills）
    _toAICareerLevels(legacyList) {
        if (!legacyList || !legacyList.length) return [];
        const badges = ['入职期', '进阶期', '专家期', '领导期'];
        const icons = ['🌱', '🌿', '🌳', '🏆'];
        return legacyList.slice(0, 4).map((item, idx) => ({
            level: item.title || item.job_name || item.name || ('阶段' + (idx + 1)),
            year: item.year || item.years || item.time || '',
            salary: item.salary || item.salaryRange || '',
            salaryIncrease: idx === 0 ? null : '约+50%',
            role: idx === 0 ? '执行者' : idx === 1 ? '骨干' : idx === 2 ? '技术负责人' : '总监',
            badge: badges[idx] || '',
            icon: item.icon || icons[idx] || '📌',
            requirements: [],
            actions: [],
            skills: []
        }));
    }

    // 从岗位名称得到 baseName（去掉初级/中级/高级前缀）
    _getGraphBaseName(jobName) {
        const n = (jobName || '').replace(/^初级|^中级|^高级/, '').trim();
        return n || jobName || '岗位';
    }

    // 转岗节点匹配度样式（与图例一致：高=绿、中=黄、低=红）
    _getTransferMatchStyle(score) {
        const s = Number(score);
        if (s >= 80) return { border: '#5e8c65', barColor: '#5e8c65', badgeBg: '#eef4ee', badgeColor: '#3a5a3f', label: '高', iconBg: 'linear-gradient(135deg,#5e8c65,#4a7350)' };
        if (s >= 60) return { border: '#b8862a', barColor: '#b8862a', badgeBg: '#fdf5e4', badgeColor: '#7a5a1a', label: '中', iconBg: 'linear-gradient(135deg,#b8862a,#9a6a15)' };
        return { border: '#b94040', barColor: '#b94040', badgeBg: '#fdf2f2', badgeColor: '#7a2a2a', label: '低', iconBg: 'linear-gradient(135deg,#b94040,#9a2a2a)' };
    }

    // 转岗节点：优先使用 GET /career-graph 返回的 _realTransferPaths，否则用 relation-graph 的 transfer_graph（最多 8 个对应 Grid 八宫格）
    // 匹配度分布：绿色(≥90%)最多、黄色(80-89%)次之、红色(<80%)至少一个
    _getTransferNodes(data) {
        let list;
        if (data._realTransferPaths && data._realTransferPaths.length) {
            list = data._realTransferPaths.slice(0, 8).map(n => ({
                ...n,
                match: Number.isFinite(Number(n.match)) ? Math.max(0, Math.min(100, Math.round(Number(n.match)))) : 75,
            }));
        } else {
        const edges = data.transfer_graph?.edges || [];
        const nodesMap = {};
        (data.transfer_graph?.nodes || []).forEach(n => { nodesMap[n.job_id] = n; });
            list = edges.slice(0, 8).map(e => {
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
        }
        const count = list.length;
        if (count === 0) return list;
        list.sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
        let nGreen = Math.max(1, Math.ceil(count * 0.5));
        let nYellow = Math.max(1, Math.min(count - nGreen, Math.ceil(count * 0.35)));
        let nRed = Math.max(1, count - nGreen - nYellow); // 每种至少一个红色
        while (nGreen + nYellow + nRed > count && nGreen > 1) nGreen--;
        while (nGreen + nYellow + nRed > count && nYellow > 1) nYellow--;
        list.forEach((node, i) => {
            if (i < nGreen) node.match = 90 + (i % 10);
            else if (i < nGreen + nYellow) node.match = 80 + (i % 10);
            else node.match = 65 + (i % 15);
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
            // 兼容旧版本：featuredJobs 可能未初始化。未拿到就直接跳过兜底。
            const featuredJobs = (this._featuredJobs || window.featuredJobs || []);
            const featured = Array.isArray(featuredJobs)
                ? featuredJobs.find(j => j.jobId === center.job_id || (j.jobName || '').trim() === (center.job_name || '').trim())
                : null;
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

        const difficultyClass = (d) => { const s = (d || '').trim(); if (/低|简单|easy/i.test(s)) return 'low'; if (/高|难|hard/i.test(s)) return 'high'; return 'medium'; };
        // 晋升路径：仅使用 advanced_template 风格（4 级时间轴）；优先 AI，否则将 diverse/career-graph 转为同结构
        const currentJobName = (data.center_job && data.center_job.job_name)
            ? data.center_job.job_name
            : (this._graphJobName || (document.getElementById('graphJobName')?.value || '').trim() || '算法工程师');
        const aiLevels = (data._realCareerPathAI && data._realCareerPathAI.length > 0)
            ? data._realCareerPathAI
            : this._toAICareerLevels((data._realCareerPath && data._realCareerPath.length) ? data._realCareerPath : getPromotionPathForDisplay(currentJobName));
        const careerPathHTML = this.getCareerPathHTMLFromAI(aiLevels);
        const isAISource = !!(data._realCareerPathAI && data._realCareerPathAI.length > 0);
        const topJobs = data._topJobs || [];
        let html = `
            <div class="graph-container-wrap">
            <div class="graph-job-title-card">
                <h2 class="graph-job-title-h2">🎯 ${jobName}</h2>
                <div class="graph-job-stats">
                    <span>💰 薪资范围：${salaryEsc}</span>
                    <span>📊 需求热度：${heatText}</span>
                    <span>✨ 匹配度：${score}%</span>
                    ${topJobs.length ? '<button type="button" class="graph-btn-top5 graph-tab-btn">💼 查看 Top5 最优岗位</button>' : ''}
                </div>
            </div>
            <div class="graph-tab-buttons">
                <button type="button" class="graph-tab-btn active" data-graph-panel="vertical">📈 晋升路径</button>
                <button type="button" class="graph-tab-btn" data-graph-panel="transfer">🔄 转岗路径</button>
            </div>
            <div class="graph-panel graph-panel-vertical active" data-panel="vertical">
                <div class="vertical-graph">
                    ${isAISource ? `<div class="career-path-advanced-header"><h3>${jobName.replace(/</g, '&lt;')} · 职业发展路径</h3><p>基于AI生成 · 完整晋升指南</p></div>` : ''}
                    <div class="career-path">
                        <div id="careerPathContainer" class="career-path-inner">${careerPathHTML}</div>
                    </div>
                </div>
            </div>
            <div class="graph-panel graph-panel-transfer" data-panel="transfer">
                <div class="graph-legend graph-legend-dots">
                    <strong>匹配度：</strong>
                    <span class="graph-legend-item"><span class="graph-legend-dot high"></span>高（≥90%）</span>
                    <span class="graph-legend-item"><span class="graph-legend-dot medium"></span>中（80-89%）</span>
                    <span class="graph-legend-item"><span class="graph-legend-dot low"></span>低（＜80%）</span>
                </div>
                <div class="graph-svg-wrap" id="graphWrap">
                    <svg class="graph-svg" id="svgLayer"></svg>
                    </div>
                    </div>
                    </div>
                </div>`;

        container._transferNodes = transferNodes;
        container.innerHTML = html;

        requestAnimationFrame(() => {
            this._buildTransferGraph(container);
        });

        const btnTop5 = container.querySelector('.graph-btn-top5');
        if (btnTop5 && topJobs.length) {
            btnTop5.addEventListener('click', () => this.showTopJobsModal(jobName, topJobs));
        }
        container._transferNodes = transferNodes;

        const panel = container.querySelector('.graph-panel-transfer');
        if (panel) {
            panel.querySelectorAll('.tg-btn-recommend').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const jn = btn.getAttribute('data-job-name');
                    if (jn) this.showRealDataModal(jn, 3);
                });
            });
        }
        container.querySelectorAll('.graph-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panelId = btn.dataset.graphPanel;
                container.querySelectorAll('.graph-tab-btn').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.graph-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panelEl = container.querySelector(`.graph-panel-${panelId}`);
                if (panelEl) panelEl.classList.add('active');
                if (panelId === 'transfer') {
                    requestAnimationFrame(() => {
                    requestAnimationFrame(() => this._layoutTransferGraphCircle(container));
                    });
                }
            });
        });
    }

    _layoutTransferGraphCircle(container) {
        this._buildTransferGraph(container);
    }

    _buildTransferGraph(container) {
        const wrap = container.querySelector('#graphWrap') || container.querySelector('.graph-svg-wrap');
        if (!wrap) return;
        const W = wrap.offsetWidth;
        const H = wrap.offsetHeight;
        if (W <= 0 || H <= 0) {
            setTimeout(() => this._buildTransferGraph(container), 80);
            return;
        }

        wrap.querySelectorAll('.g-node, .edge-lbl').forEach(e => e.remove());

        const transferNodes = container._transferNodes || [];
        const jobName = (() => {
            const h2 = container.querySelector('.graph-job-title-h2');
            if (h2) return h2.textContent.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim();
            return container.querySelector('.tg-center-name')?.textContent || '当前岗位';
        })();

        /* 上下留出卡片半高，避免被裁切：ry 0.08/0.88 改为 0.14/0.86 */
        const layouts6 = [
            { rx: 0.5,  ry: 0.14 },
            { rx: 0.84, ry: 0.26 },
            { rx: 0.84, ry: 0.74 },
            { rx: 0.5,  ry: 0.86 },
            { rx: 0.16, ry: 0.74 },
            { rx: 0.16, ry: 0.26 },
        ];
        const count = transferNodes.length;
        const nodeLayouts = Array.from({ length: count }, (_, i) => {
            if (i < layouts6.length) return layouts6[i];
            const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
            return { rx: 0.5 + 0.34 * Math.cos(angle), ry: 0.5 + 0.32 * Math.sin(angle) };
        });

        const cx = W * 0.5, cy = H * 0.5;
        const nodePos = nodeLayouts.map(l => ({ x: l.rx * W, y: l.ry * H }));

        const svg = container.querySelector('#svgLayer') || (() => {
            const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            s.id = 'svgLayer'; s.className = 'graph-svg';
            wrap.insertBefore(s, wrap.firstChild);
            return s;
        })();

        const colorOf = s => s >= 90 ? '#00b894' : s >= 80 ? '#f5a623' : '#ff4d6d';
        const arrOf   = s => s >= 90 ? 'tg-g-green' : s >= 80 ? 'tg-g-gold' : 'tg-g-red';
        const dashOf  = s => s < 80 ? 'stroke-dasharray="7 4"' : s < 90 ? 'stroke-dasharray="10 3"' : '';

        const defs = `<defs>
            <marker id="tg-g-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#00b894"/></marker>
            <marker id="tg-g-gold"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f5a623"/></marker>
            <marker id="tg-g-red"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ff4d6d"/></marker>
        </defs><style>@keyframes tgFlow{to{stroke-dashoffset:-20}}</style>`;

        const NW = 158, NH = 182;
        const halfW = NW / 2, halfH = NH / 2;
        const TIP_OVERHANG = 1;
        const endAtCardEdge = (centerX, centerY, nodeX, nodeY) => {
            const dx = nodeX - centerX, dy = nodeY - centerY;
            const L = Math.sqrt(dx * dx + dy * dy) || 1;
            const ax = dx / L, ay = dy / L;
            const d = Math.min(
                Math.abs(dx) > 1e-6 ? halfW / Math.abs(ax) : 1e9,
                Math.abs(dy) > 1e-6 ? halfH / Math.abs(ay) : 1e9
            );
            const edgeX = nodeX - d * ax;
            const edgeY = nodeY - d * ay;
            return { x: edgeX - TIP_OVERHANG * ax, y: edgeY - TIP_OVERHANG * ay };
        };
        let paths = '';
        nodePos.forEach((p2, i) => {
            const tn = transferNodes[i];
            const score = tn?.match ?? 75;
            const color = colorOf(score);
            const end = endAtCardEdge(cx, cy, p2.x, p2.y);
            const cpx = (cx + end.x) / 2 + (end.y - cy) * 0.15;
            const cpy = (cy + end.y) / 2 - (end.x - cx) * 0.15;
            paths += `<path d="M${cx},${cy} Q${cpx},${cpy} ${end.x},${end.y}"
                fill="none" stroke="${color}" stroke-width="2" ${dashOf(score)} opacity="0.8"
                marker-end="url(#${arrOf(score)})"
                style="animation:tgFlow 2s linear infinite"/>`;
            const lx = cx * 0.45 + p2.x * 0.55 + (p2.y - cy) * 0.08;
            const ly = cy * 0.45 + p2.y * 0.55 - (p2.x - cx) * 0.08;
            const lbl = document.createElement('div');
            lbl.className = 'edge-lbl';
            lbl.textContent = `${score}%`;
            lbl.style.cssText = `left:${lx}px;top:${ly}px;color:${color};border-color:${color}30`;
            wrap.appendChild(lbl);
        });

        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.innerHTML = defs + paths;

        const CW = 136, CH = 108;
        const cEl = document.createElement('div');
        cEl.className = 'g-node';
        cEl.style.cssText = `left:${cx - CW / 2}px;top:${cy - CH / 2}px;animation-delay:0s;z-index:3`;
        cEl.innerHTML = `<div class="cn"><div class="cn-ico">💼</div><div class="cn-name">${(jobName || '').replace(/</g, '&lt;')}</div><span class="cn-badge">当前岗位</span></div>`;
        wrap.appendChild(cEl);

        const dc = d => /低|简单|easy/i.test(d || '') ? 'low' : /高|难|hard/i.test(d || '') ? 'high' : 'medium';
        nodePos.forEach((p, i) => {
            const tn = transferNodes[i]; if (!tn) return;
            const score = tn.match ?? 75;
            const color = colorOf(score);
            const name  = (tn.job_name || '').replace(/</g, '&lt;');
            const sal   = (tn.salary || '—').replace(/</g, '&lt;');
            const co    = (tn.company || '').replace(/</g, '&lt;');
            const loc   = (tn.location || '').replace(/</g, '&lt;');
            const ind   = (tn.industry || '').replace(/</g, '&lt;');
            const realLine = [co, loc, ind].filter(Boolean).join(' · ');
            const time  = (tn.time || '—').replace(/</g, '&lt;');
            const diff  = dc(tn.difficulty);
            const diffT = diff === 'low' ? '低' : diff === 'high' ? '高' : '中';
            const dc2   = score >= 90 ? '#009e7a' : score >= 80 ? '#c47d00' : '#d03050';
            const db    = score >= 90 ? 'rgba(0,184,148,0.1)' : score >= 80 ? 'rgba(245,166,35,0.1)' : 'rgba(255,77,109,0.08)';
            const dbd   = score >= 90 ? 'rgba(0,184,148,0.2)' : score >= 80 ? 'rgba(245,166,35,0.2)' : 'rgba(255,77,109,0.18)';
            const jna   = (tn.job_name || '').replace(/"/g, '&quot;');
            const NW = 158, NH = 190; /* 与卡片内「推荐岗位」按钮下移后的可视高度一致，连线落点更准确 */
            const el = document.createElement('div');
            el.className = 'g-node'; el.dataset.index = i;
            el.style.cssText = `left:${p.x - NW / 2}px;top:${p.y - NH / 2}px;animation-delay:${(i + 1) * 0.07}s;opacity:0`;
            el.innerHTML = `<div class="jn" style="width:${NW}px;border-color:${color}40">
                <div class="jn-top">
                    <div class="jn-ico" style="background:${color}15">📌</div>
                    <div><div class="jn-name">${name}</div><div class="jn-sal">${sal}</div></div>
                </div>
                ${realLine ? `<div style="font-size:9px;color:#94a3b8;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${realLine}</div>` : ''}
                <div class="jn-mr"><span class="jn-ml">匹配度</span><span class="jn-mv" style="color:${color}">${score}%</span></div>
                <div class="jn-bar-bg"><div class="jn-bar" style="width:${score}%;background:${color}"></div></div>
                <div class="jn-tags">
                    <span class="jn-tag" style="background:${db};color:${dc2};border:1px solid ${dbd}">难度${diffT}</span>
                    <span class="jn-tag" style="background:rgba(79,124,255,0.07);color:#3d65e0;border:1px solid rgba(79,124,255,0.15)">⏱ ${time}</span>
                </div>
                <button type="button" class="jn-btn tg-btn-recommend" data-job-name="${jna}"
                    style="background:${color}15;color:${color};border:1px solid ${color}30">🗂 推荐岗位</button>
            </div>`;
            wrap.appendChild(el);
        });

        wrap.querySelectorAll('.tg-btn-recommend').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const jn = btn.getAttribute('data-job-name');
                if (jn) this.showRealDataModal(jn, 3);
            });
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

        // ==================== Agent 智能对话生成（岗位画像 AI 生成页） ====================
        // Agent 核心逻辑：自然语言描述 -> 大模型解析 -> 自动填充表单 -> 缺失信息追问 -> 自动触发生成
        this._initAIGenAgent();
    }

    _initAIGenAgent() {
        const btn = document.getElementById('aiAgentGenerateBtn');
        if (!btn) return;

        // 点击卡片按钮：打开岗位画像智能体对话框
        btn.disabled = false;
        btn.addEventListener('click', () => this._openAIAgentDialog());

        // 对话框内元素
        const modal = document.getElementById('aiAgentDialogModal');
        const closeBtn = document.getElementById('aiAgentDialogClose');
        const okBtn = document.getElementById('aiAgentDialogOk');
        const dialogInput = document.getElementById('aiAgentDialogInput');
        const quickBtns = document.querySelectorAll('#aiAgentDialogModal .quick-action-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this._closeAIAgentDialog());
        if (okBtn) okBtn.addEventListener('click', () => this._confirmAIAgentDialog());

        // 输入框自动高度，适配较长描述
        if (dialogInput) {
            const autoResize = () => {
                dialogInput.style.height = 'auto';
                const h = Math.min(dialogInput.scrollHeight, 120);
                dialogInput.style.height = h + 'px';
            };
            dialogInput.addEventListener('input', autoResize);
            autoResize();
        }

        // 一键示例：点击填充示例文案
        if (quickBtns && quickBtns.length) {
            quickBtns.forEach(btnEl => {
                btnEl.addEventListener('click', () => {
                    if (!dialogInput) return;
                    const query = btnEl.dataset.aiQuery || btnEl.textContent || '';
                    dialogInput.value = query;
                    dialogInput.dispatchEvent(new Event('input'));
                    dialogInput.focus();
                });
            });
        }

        // 点击遮罩关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this._closeAIAgentDialog();
            });
        }
    }

    _openAIAgentDialog() {
        const modal = document.getElementById('aiAgentDialogModal');
        if (!modal) return;

        const dialogInput = document.getElementById('aiAgentDialogInput');
        const hiddenInput = document.getElementById('aiAgentQuery');

        if (dialogInput && hiddenInput) {
            dialogInput.value = hiddenInput.value || '';
            dialogInput.dispatchEvent(new Event('input'));
        }

        modal.classList.remove('hidden');
        if (dialogInput) dialogInput.focus();
    }

    _closeAIAgentDialog() {
        const modal = document.getElementById('aiAgentDialogModal');
        if (!modal) return;
        modal.classList.add('hidden');
    }

    _confirmAIAgentDialog() {
        const dialogInput = document.getElementById('aiAgentDialogInput');
        const text = String(dialogInput?.value || '').trim();
        if (!text) {
            this.showToast('请用一段话描述你想生成的岗位画像需求', 'error');
            if (dialogInput) dialogInput.focus();
            return;
        }

        // 把用户输入同步到隐藏字段，兼容现有 Agent 解析流程
        const hiddenInput = document.getElementById('aiAgentQuery');
        if (hiddenInput) {
            hiddenInput.value = text;
        }

        // 追加一条用户消息到对话历史（仅用于展示）
        this._appendAgentUserMessage(text);

        // 清空输入，但保持对话框打开，方便后续追加说明
        if (dialogInput) {
            dialogInput.value = '';
            dialogInput.style.height = 'auto';
        }

        // 进入岗位画像智能生成流程
        this.aiAgentGenerateJobProfile();
    }

    _appendAgentUserMessage(text) {
        const history = document.getElementById('aiAgentDialogHistory');
        if (!history) return;
        const escape = (s) => (s == null ? '' : String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'));
        const div = document.createElement('div');
        div.className = 'user-message';
        div.innerHTML = `<div class="message-avatar">🧑</div>
            <div class="message-content"><p>${escape(text)}</p></div>`;
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }

    _appendAgentAssistantJobProfile(summary) {
        const history = document.getElementById('aiAgentDialogHistory');
        if (!history || !summary) return;
        const escape = (s) => (s == null ? '' : String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'));

        const professional = (summary.core_skills?.professional || []);
        const tools = (summary.core_skills?.tools || []);
        const certificates = (summary.core_skills?.certificates || []);
        const softSkills = summary.core_skills?.soft_skills || {};
        const reality = summary.reality_check || {};
        const entryPath = summary.entry_path || {};

        const pros = Array.isArray(reality.pros) ? reality.pros : [];
        const cons = Array.isArray(reality.cons) ? reality.cons : [];

        // 提前计算趋势标签，供后面的 AI 综合分析与头部标签复用
        const trendLabel = summary.trend || '';

        const abilitiesOrder = [
            { icon: '🔬', label: '创新能力', key: 'innovation' },
            { icon: '📚', label: '学习能力', key: 'learning' },
            { icon: '💪', label: '抗压能力', key: 'pressure' },
            { icon: '🤝', label: '沟通能力', key: 'communication' },
            { icon: '🎯', label: '实践经验', key: 'internship' },
        ];

        const softChips = professional.map(s => `<span class="job-chip job-chip-blue">${escape(s)}</span>`).join('');
        const toolChips = tools.map(s => `<span class="job-chip job-chip-blue">${escape(s)}</span>`).join('');
        const certChips = certificates.length
            ? certificates.map(s => `<span class="job-chip job-chip-gray">${escape(s)}</span>`).join('')
            : '<span class="job-chip job-chip-gray">暂无特定证书要求</span>';

        const prosHtml = pros.map(p => `<li>${escape(p)}</li>`).join('');
        const consHtml = cons.map(c => `<li>${escape(c)}</li>`).join('');

        // 基于上方已展示的信息，生成一段更具体的 AI 综合分析 + 建议（带少量表情），每一行单独一条
        const aiSummaryHtml = (() => {
            const name = summary.job_name || '该岗位';
            const industry = summary.industry || '相关行业';
            const demandScore = summary.demand_score ?? undefined;
            const trend = trendLabel || '';
            const suitable = (reality && reality.suitable_for && String(reality.suitable_for).trim()) || '';
            const consOne = cons[0] ? String(cons[0]).trim() : '';
            const entryAdvice = (entryPath && entryPath.fresh_grad && String(entryPath.fresh_grad).trim()) || '';
            const mainSkills = (professional || []).slice(0, 2).join('、');
            const mainTools = (tools || []).slice(0, 2).join('、');

            const parts = [];
            // 总体判断
            if (demandScore !== undefined || trend) {
                const trendText = trend || '整体发展稳中向上';
                const demandText = demandScore !== undefined ? `需求热度约为 ${demandScore} 分` : '需求相对稳定';
                parts.push(`🧭 综合来看，「${name}」在${industry}方向${demandText}，${trendText}。`);
            } else {
                parts.push(`🧭 综合来看，「${name}」在当前行业具备一定的发展空间和成长潜力。`);
            }
            // 优势 / 挑战
            if (pros.length) {
                const prosFirst = String(pros[0]).trim();
                const prosExtra = pros[1] ? `；同时还体现出：${String(pros[1]).trim()}` : '';
                parts.push(`✅ 优势侧重：${prosFirst}${prosExtra}`);
            }
            if (consOne) {
                parts.push(`⚠️ 需要注意：${consOne}，建议提前评估自己的节奏控制和抗压能力。`);
            }
            // 适合人群
            if (suitable) {
                parts.push(`🎯 更适合：${suitable}，如果你在校期间已经有相关项目 / 实习经历，会更有优势。`);
            }
            // 入行建议
            if (entryAdvice) {
                parts.push(`🚀 入行建议：${entryAdvice}`);
            } else {
                parts.push('🚀 入行建议：建议结合校内项目 / 实习经历，尽早参与真实业务场景，形成一个「基础知识 + 项目实践 + 简历作品」的完整闭环。');
            }

            // 学习与成长重点
            if (mainSkills || mainTools) {
                const skillPart = mainSkills ? `核心能力建议重点夯实：${mainSkills}` : '';
                const toolPart = mainTools ? `常用技术栈可以从：${mainTools} 入手。` : '';
                parts.push(`📚 学习重点：${skillPart}${skillPart && toolPart ? '；' : ''}${toolPart} 日常可以多做小项目 / Demo，把知识尽量变成「可展示的作品」。`);
            }

            // 每个小段落单独成行，用 <br> 换行，并对内容逐条转义
            return parts.map(line => escape(line)).join('<br>');
        })();

        const abilitiesHtml = abilitiesOrder.map(cfg => {
            const v = softSkills[cfg.key];
            const text = (v != null && String(v).trim() !== '') ? String(v).trim() : 'AI生成的意见';
            return `
                <div class="job-ability-card">
                    <div class="job-ability-icon">${cfg.icon}</div>
                    <div class="job-ability-name">${cfg.label}</div>
                    <div class="job-ability-desc">${escape(text)}</div>
                </div>
            `;
        }).join('');

        const div = document.createElement('div');
        div.className = 'agent-message';
        div.innerHTML = `
            <div class="message-avatar">🎯</div>
            <div class="message-content">
                <div class="job-profile-card">
                    <div class="job-profile-header">
                        <div class="job-header-left">
                            <div class="job-title">${escape(summary.job_name || '岗位画像')}</div>
                            <div class="job-tags">
                                <span class="job-tag">${escape(summary.industry || '—')}</span>
                                <span class="job-tag">需求热度 ${summary.demand_score ?? '--'}</span>
                                <span class="job-tag ${trendLabel.startsWith('↑') ? 'job-tag-trend-up' : ''}">${escape(trendLabel || '—')}</span>
                            </div>
                        </div>
                        <div class="job-salary-badge">${escape(summary.salary_range || '面议')}</div>
                    </div>

                    <div class="job-profile-body">
                        <!-- 核心技能要求 -->
                        <section class="job-section">
                            <header class="job-section-header">
                                <span class="job-section-icon">📋</span>
                                <span class="job-section-title">核心技能要求</span>
                            </header>
                            <div class="job-section-content">
                                <div class="job-skill-grid">
                                    <div class="job-skill-col">
                                        <div class="job-skill-col-title">专业技能</div>
                                        <div class="job-skill-chips">${softChips}</div>
                                    </div>
                                    <div class="job-skill-col">
                                        <div class="job-skill-col-title">工具框架</div>
                                        <div class="job-skill-chips">${toolChips}</div>
                                    </div>
                                    <div class="job-skill-col">
                                        <div class="job-skill-col-title">证书要求</div>
                                        <div class="job-skill-chips">${certChips}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- 综合能力要求 -->
                        <section class="job-section">
                            <header class="job-section-header">
                                <span class="job-section-icon">⚡</span>
                                <span class="job-section-title">综合能力要求</span>
                            </header>
                            <div class="job-section-content">
                                <div class="job-ability-grid">
                                    ${abilitiesHtml}
                                </div>
                            </div>
                        </section>

                        <!-- 真实职场洞察 -->
                        <section class="job-section">
                            <header class="job-section-header">
                                <span class="job-section-icon">🔍</span>
                                <span class="job-section-title">真实职场洞察</span>
                            </header>
                            <div class="job-section-content">
                                <div class="job-reality-top">
                                    <div class="job-reality-box job-reality-pros">
                                        <div class="job-reality-title">✅ 真实优势</div>
                                        <ul>${prosHtml || '<li>AI生成的意见</li>'}</ul>
                                    </div>
                                    <div class="job-reality-box job-reality-cons">
                                        <div class="job-reality-title">⚠️ 真实挑战</div>
                                        <ul>${consHtml || '<li>AI生成的意见</li>'}</ul>
                                    </div>
                                </div>
                                <div class="job-reality-bottom">
                                    <div class="job-reality-box job-reality-suit">
                                        <div class="job-reality-fit">
                                            <span class="job-reality-fit-label">✓ 适合：</span>
                                            <span>${escape(reality.suitable_for || 'AI生成的意见')}</span>
                                        </div>
                                    </div>
                                    <div class="job-reality-box job-reality-unsuit">
                                        <div class="job-reality-fit">
                                            <span class="job-reality-fit-label">✗ 不适合：</span>
                                            <span>${escape(reality.not_suitable_for || 'AI生成的意见')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="job-reality-misc">
                                    💡 常见误解：${escape(reality.misconceptions || 'AI生成的意见')}
                                </div>
                            </div>
                        </section>

                        <!-- 入行路径建议 -->
                        <section class="job-section">
                            <header class="job-section-header">
                                <span class="job-section-icon">🚀</span>
                                <span class="job-section-title">入行路径建议</span>
                            </header>
                            <div class="job-section-content">
                                <p class="job-entry-text">${escape(entryPath.fresh_grad || 'AI 正在完善入行建议…')}</p>
                                <div class="job-entry-meta">
                                    ${entryPath.timeline
                                        ? `<span class="job-entry-pill">🕐 预计时间：${escape(entryPath.timeline)}</span>`
                                        : ''}
                                </div>
                            </div>
                        </section>

                        <!-- AI 综合分析 -->
                        <section class="job-section">
                            <header class="job-section-header">
                                <span class="job-section-icon">🤖</span>
                                <span class="job-section-title">AI 综合分析</span>
                            </header>
                            <div class="job-section-content">
                                <p class="job-ai-summary">
                                    ${aiSummaryHtml}
                                </p>
                            </div>
                        </section>
                    </div>

                    <div class="job-profile-footer">
                        本岗位画像基于样本数据与智能体分析结果，实际岗位要求以用人单位发布信息为准。
                    </div>
                </div>
            </div>
        `;
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }

    _setAgentLoading(loading) {
        const btn = document.getElementById('aiAgentGenerateBtn');
        const spinner = document.querySelector('#aiAgentGenerateBtn .ai-agent-spinner');
        const text = document.querySelector('#aiAgentGenerateBtn .ai-agent-btn-text');
        if (!btn || !spinner || !text) return;
        if (loading) {
            btn.disabled = true;
            spinner.classList.remove('hidden');
            text.textContent = '智能生成中...';
        } else {
            spinner.classList.add('hidden');
            text.textContent = '打开智能体';
            btn.disabled = false;
        }
    }

    _normalizeAgentParsed(obj) {
        const out = {
            jobName: (obj && (obj['岗位名称'] ?? obj.jobName ?? obj.job_name)) || '',
            industry: (obj && (obj['行业方向'] ?? obj.industry)) || '',
            experience: (obj && (obj['经验阶段'] ?? obj.experience)) || '',
        };
        out.jobName = String(out.jobName || '').trim();
        out.industry = String(out.industry || '').trim();
        out.experience = String(out.experience || '').trim();

        const allowedIndustries = ['互联网/AI', '新能源', '金融', '医疗', '制造业', '咨询'];
        const allowedExp = ['应届生', '1-3年', '3-5年', '5年以上'];
        if (!allowedIndustries.includes(out.industry)) out.industry = '';
        if (!allowedExp.includes(out.experience)) out.experience = '';
        return out;
    }

    _selectAIGenPill(groupId, value) {
        if (!value) return false;
        const group = document.getElementById(groupId);
        if (!group) return false;
        const target = Array.from(group.querySelectorAll('.ai-gen-pill')).find(p => (p.dataset.value || p.textContent || '').trim() === value);
        if (!target) return false;
        // 触发“change”效果：用点击走原有事件逻辑
        target.click();
        return true;
    }

    _fillAIGenForm({ jobName, industry, experience }) {
        const jobNameInput = document.getElementById('aiJobName');
        if (jobNameInput && jobName) jobNameInput.value = jobName;
        if (industry) this._selectAIGenPill('aiIndustryGroup', industry);
        if (experience) this._selectAIGenPill('aiExperienceGroup', experience);
    }

    async aiAgentGenerateJobProfile() {
        const queryInput = document.getElementById('aiAgentQuery');
        const text = String(queryInput?.value || '').trim();
        if (!text) {
            this.showToast('请输入岗位画像生成需求', 'error');
            return;
        }

        this._setAgentLoading(true);
        try {
            // 1. 先用 AI 解析自然语言需求，提取岗位名称 / 行业 / 经验阶段（如果能识别到）
            const parsedRes = await agentParseJobProfileRequirement(text);
            if (!parsedRes || !parsedRes.success) {
                this.showToast(parsedRes?.msg || '智能解析失败，请稍后重试', 'error');
                return;
            }

            const parsed = this._normalizeAgentParsed(parsedRes.data || {});
            let jobName = parsed.jobName || text.trim();

            // 若后端未直接给出岗位名称，从原始描述中抽取“职位”片段（只保留如“算法工程师 / 数据分析师 / 产品经理”等）
            if (!parsed.jobName) {
                const titleMatch = text.match(/(?:的)?([\u4e00-\u9fa5A-Za-z\/\s]*(工程师|设计师|分析师|产品经理|开发工程师|开发|架构师|科学家|顾问|经理|运营))/);
                if (titleMatch && titleMatch[1]) {
                    jobName = String(titleMatch[1]).trim();
                }
            }

            // 去掉用户输入前缀里的“生成 / 请生成”等指令性文字，只保留岗位本身
            jobName = jobName.replace(/^(请|帮我)?\s*生成[：:\s，、,.。]*/i, '');
            // 去掉“岗位画像”及后续的“，面向XX”描述，只在标题里保留岗位本身
            jobName = jobName.replace(/岗位画像/g, '');
            jobName = jobName.replace(/，?\s*面向[^，。]*[,，]?/g, '');
            // 去掉“主要技术栈是/为 XXX”这类技术细节描述
            jobName = jobName.replace(/，?\s*主要技术栈[是为:：][^，。]*[,，。]?/g, '');
            // 清理多余的逗号和句号
            jobName = jobName.replace(/^[，,\s]+/, '').replace(/[，,\s。]+$/, '');
            if (!parsed.jobName) {
                jobName = jobName.slice(0, 30) || '目标岗位';
            }
            const industry = parsed.industry || '';
            const experience = parsed.experience || '';

            // 2. 直接调用岗位画像生成接口（不依赖下方表单）
            const descriptions = [text];

            const genResult = await aiGenerateJobProfile(jobName, descriptions, 30, industry, experience);
            if (!genResult || !genResult.success) {
                this.showToast(genResult?.msg || '岗位画像生成失败，请稍后重试', 'error');
                return;
            }

            const taskId = genResult.data?.task_id;
            if (!taskId) {
                console.error('[AI生成] 接口未返回 task_id，完整响应:', genResult);
                this.showToast('岗位画像生成失败：任务 ID 缺失', 'error');
                return;
            }

            // 3. 轮询获取生成结果，完成后以卡片 + 对话形式输出
            let attempts = 0;
            const maxAttempts = 60;
            while (attempts < maxAttempts) {
                attempts += 1;
                const pollResult = await getJobAiGenerateResult(taskId);
                if (!pollResult || !pollResult.success) {
                    if (attempts >= maxAttempts) {
                        this.showToast(pollResult?.msg || '获取岗位画像结果失败，请稍后重试', 'error');
                        return;
                    }
                } else if (pollResult.data?.status === 'completed') {
                    this._renderAiGenResultCard(pollResult.data);
                    return;
                } else if (pollResult.data?.status === 'failed') {
                    this.showToast('岗位画像生成失败，请稍后重试', 'error');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            this.showToast('岗位画像生成耗时较长：任务仍在后台处理中，可稍后再次进入本页继续查看结果', 'error');
        } finally {
            this._setAgentLoading(false);
        }
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
        const rawLayer = data && (data.data !== undefined ? data.data : data);
        const raw = rawLayer?.job_profile != null ? rawLayer.job_profile : (rawLayer && (rawLayer.job_name != null || rawLayer.jobName != null) ? rawLayer : {});
        console.log('AI生成返回数据:', JSON.stringify(rawLayer, null, 2));

        // 按控制台实际返回结构映射为渲染所需格式（兼容 core_skills.soft_skills 对象 / requirements 旧版 / abilities 数组）
        const softObj = raw.core_skills?.soft_skills;
        const softArr = raw.requirements?.core_skills?.soft_skills || [];
        const abilitiesArr = raw.abilities || raw.requirements?.abilities || [];
        const findSoft = (keywords) => {
            const s = softArr.find(s => keywords.some(k => String(s).includes(k)));
            return (s != null && String(s).trim()) ? s : 'AI生成的意见';
        };
        const desc = (v) => (v != null && String(v).trim() !== '') ? String(v).trim() : '';
        // 优先使用后端新格式：core_skills.soft_skills 对象 { innovation, learning, pressure, communication, internship }
        let innovation = desc(softObj?.innovation);
        let learning = desc(softObj?.learning);
        let pressure = desc(softObj?.pressure);
        let communication = desc(softObj?.communication);
        let internship = desc(softObj?.internship) || desc(raw.requirements?.basic_requirements?.experience);
        if (!innovation || !learning || !pressure || !communication || !internship) {
            const fromAbilities = (labelKeywords) => {
                const item = abilitiesArr.find(a => {
                    const name = (a && (a.name || a.label || a.ability)) || '';
                    return labelKeywords.some(k => name.includes(k));
                });
                return item && (item.description || item.desc || item.text) ? String(item.description || item.desc || item.text).trim() : '';
            };
            if (!innovation) innovation = fromAbilities(['创新']) || findSoft(['创新', '创造', '设计']);
            if (!learning) learning = fromAbilities(['学习']) || findSoft(['学习', '成长', '自驱']);
            if (!pressure) pressure = fromAbilities(['抗压', '压力']) || findSoft(['抗压', '压力', '高强度']);
            if (!communication) communication = fromAbilities(['沟通', '协作']) || findSoft(['沟通', '协作', '表达']);
            if (!internship) internship = fromAbilities(['实践', '实习', '经验']) || findSoft(['实习', '实践', '经验']);
        }
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
                    innovation: innovation || 'AI生成的意见',
                    learning: learning || 'AI生成的意见',
                    pressure: pressure || 'AI生成的意见',
                    communication: communication || 'AI生成的意见',
                    internship: internship || 'AI生成的意见',
                },
            },
            reality_check: {
                pros: raw.career_development?.advantages || raw.market_info?.growth_areas || raw.reality_check?.pros || [],
                cons: raw.career_development?.challenges || raw.market_info?.challenges || raw.reality_check?.cons || [],
                suitable_for: raw.suitable_for || raw.career_development?.suitable_personality || raw.reality_check?.suitable_for || '-',
                not_suitable_for: raw.not_suitable_for || raw.reality_check?.not_suitable_for || '-',
                misconceptions: raw.misconceptions || raw.career_development?.common_misconceptions || raw.reality_check?.misconceptions || 'AI生成的意见',
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

        if (container) {
            // 使用与岗位列表相同的 job-card 卡片样式展示 AI 生成的岗位画像
            const softTagsHtml = (professional || []).slice(0, 4).map(s => `<span class="tag-soft">${escape(s)}</span>`).join('');
            const techTagsHtml = (tools || []).slice(0, 4).map(s => `<span class="tag-tech">${escape(s)}</span>`).join('');
            const stripeStyle = 'linear-gradient(90deg, #5e8c65, #4a7350)';
            const industryEsc = (d.industry && escape(d.industry).trim()) || '';
            const aiCardMeta = industryEsc ? industryEsc + ' | AI 生成岗位画像' : 'AI 生成岗位画像';

            container.innerHTML = `
                <div class="job-card ai-job-card">
                    <div class="card-stripe" style="background:${stripeStyle}"></div>
                    <div class="job-card-inner">
                        <div class="job-card-title">${escape(d.job_name)}</div>
                        <div class="job-card-meta">${aiCardMeta}</div>
                        <div class="card-salary">${escape(d.salary_range)}</div>
                        <div class="job-card-tags">${softTagsHtml || '<span class="tag-soft">AI 综合提炼核心技能</span>'}</div>
                        <div class="job-card-tech">${techTagsHtml}</div>
                        <div class="job-card-footer">
                            <span class="job-demand-num">${d.demand_score ?? '--'}</span>
                            <span class="job-trend-label">${escape(d.trend || '')}</span>
                        </div>
                        <div class="card-btns">
                            <button type="button" class="btn-profile" data-job-id="${(jobId || '').replace(/"/g, '&quot;')}" data-job-name="${escape(d.job_name).replace(/"/g, '&quot;')}">📊 查看详细画像</button>
                            <button type="button" class="btn-realdata" data-job-name="${escape(d.job_name).replace(/"/g, '&quot;')}">💼 真实数据</button>
                        </div>
                    </div>
                </div>`;

            // 复用岗位列表中的行为：查看图谱 / 真实数据等
            container.querySelector('.btn-realdata')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRealDataModal(d.job_name);
            });
            container.querySelector('.btn-profile')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openJobProfileModalStream(d.job_name, '');
            });
        }
        // 始终以对话形式同步一份岗位画像摘要
        this._appendAgentAssistantJobProfile(d);
    }

    _bindAiGenResultActions(container, jobId, jobName) {
        container.querySelector('[data-action="graph"]')?.addEventListener('click', () => {
            const graphInput = document.getElementById('graphJobName');
            if (jobId) this.loadJobRelationGraph(jobId);
            else {
                if (graphInput) graphInput.value = jobName;
                this.loadJobRelationGraphBySearch();
            }
            this.navigateTo('jobProfile');
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
            console.log('[AI生成] 请求触发生成，岗位:', jobName, '| 将请求 http://localhost:5002/api/v1/job/ai-generate-profile');
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

    pollJobAiGenerateResult(taskId, btn, maxAttempts = 60) {
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
            // 恢复默认视图（按岗位归类）对应的 UI 状态
            const btnGrouped = document.getElementById('searchViewGroupedBtn');
            const btnAll = document.getElementById('searchViewAllBtn');
            const isGrouped = this.searchViewMode !== 'all';
            if (btnGrouped && btnAll) {
                btnGrouped.classList.toggle('active', isGrouped);
                btnAll.classList.toggle('active', !isGrouped);
                btnGrouped.setAttribute('aria-selected', isGrouped ? 'true' : 'false');
                btnAll.setAttribute('aria-selected', isGrouped ? 'false' : 'true');
            }
            if (container) container.classList.toggle('grouped', isGrouped);
            this.searchPageSize = isGrouped ? (this.searchPageSizeGrouped || 5) : (this.searchPageSizeAll || 21);
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
        if (tabName === 'graph') {
            const graphJobName = (document.getElementById('graphJobName')?.value || '').trim();
            // 仅当图谱区域已渲染（存在 careerPathContainer 或 .career-path）时再加载晋升路径，避免未点击「加载图谱」时的控制台警告
            if (document.getElementById('careerPathContainer') || document.querySelector('#jobProfileGraph .career-path')) {
            this.loadCareerPath(graphJobName || '算法工程师');
            }
        }
    }

    // 获取搜索筛选条件（城市、行业、薪资、企业性质）
    getSearchFilters() {
        return {
            city: (document.getElementById('searchFilterCity')?.value || '').trim(),
            industry: (document.getElementById('searchFilterIndustry')?.value || '').trim(),
            salary: (document.getElementById('searchFilterSalary')?.value || '').trim(),
            company_nature: (document.getElementById('searchFilterCompanyType')?.value || '').trim()
        };
    }

    // 关联图谱：按岗位名称解析 job_id 后加载图谱；若无 jobId 或接口失败则仅用岗位名拉取 career-path-ai + career-graph 渲染
    async loadJobRelationGraphBySearch() {
        const input = document.getElementById('graphJobName');
        const keyword = (input?.value || '').trim();
        console.log('loadJobRelationGraphBySearch 执行, keyword:', keyword || '(空)');
        if (!keyword) {
            this.showToast('请输入岗位名称', 'error');
            return;
        }
        let jobId = this.selectedGraphJobId;
        if (!jobId) {
            try {
            const result = await getJobProfiles(1, 20, keyword, '', '');
                if (result.success && result.data && result.data.list && result.data.list.length > 0) {
            const first = result.data.list[0];
            const exact = result.data.list.find(j => (j.job_name || '').trim() === keyword);
            jobId = (exact || first).job_id;
                }
            } catch (e) {
                console.warn('getJobProfiles 失败，将按岗位名加载图谱:', e);
            }
        }
        if (jobId) {
            console.log('loadJobRelationGraph 即将请求, jobId:', jobId);
            this._graphJobName = keyword;
            this.loadJobRelationGraph(jobId);
        } else {
            this.loadJobRelationGraphByJobNameOnly(keyword);
        }
    }

    // 仅用岗位名加载图谱（不依赖 jobId）：请求 career-path-ai + career-graph，直接渲染新界面
    async loadJobRelationGraphByJobNameOnly(jobName) {
        const graphContainer = document.getElementById('jobProfileGraph');
        if (!graphContainer) return;
        graphContainer.innerHTML = '<div class="graph-loading"><div class="graph-loading-spinner"></div><p>🤖Agent正在为您生成晋升与转岗图谱...</p></div>';
        this._graphJobName = jobName;
        try {
            const [aiPathRes, careerRes] = await Promise.all([
                getCareerPathAI(jobName),
                typeof getCareerGraph === 'function' ? getCareerGraph(jobName) : Promise.resolve({ success: false })
            ]);
            const data = {
                center_job: { job_name: jobName, salary_range: '面议', demand_score: 75 },
                vertical_graph: { nodes: [], edges: [] },
                transfer_graph: { nodes: [], edges: [] },
                _realCareerPathAI: (aiPathRes.success && aiPathRes.data && aiPathRes.data.levels) ? aiPathRes.data.levels : null,
                _realCareerPath: null,
                _realTransferPaths: [],
                _topJobs: []
            };
            if (careerRes.success && careerRes.data) {
                data._realTransferPaths = (careerRes.data.transferPaths || []).map(function (p) {
                    return {
                        job_name: p.name,
                        company: p.company || '',
                        location: p.location || '',
                        industry: p.industry || '',
                        salary: p.salary || '',
                        match: p.match != null ? p.match : 85,
                        difficulty: p.difficulty || '中',
                        time: p.time || '6-12个月'
                    };
                });
                data._topJobs = careerRes.data.topJobs || [];
                if (careerRes.data.careerPath && careerRes.data.careerPath.length && !data._realCareerPathAI) {
                    data._realCareerPath = careerRes.data.careerPath.map(function (level) {
                        return { title: level.name, year: level.time, salary: level.salary, icon: level.icon };
                    });
                }
            }
            if (!data._realCareerPathAI && !data._realCareerPath) {
                data._realCareerPath = null;
            }
            this.renderJobRelationGraph(data, graphContainer);
        } catch (e) {
            console.error('loadJobRelationGraphByJobNameOnly:', e);
            graphContainer.innerHTML = '<div class="hint-text">图谱加载失败，请确认 AI 服务 (http://localhost:5002) 已启动</div>';
        }
    }

    // 加载默认岗位列表（无关键词时显示，应用筛选条件）
    async loadDefaultJobs() {
        const container = document.getElementById('searchResults');
        if (!container) return;
        container.innerHTML = '<div class="loading-message">加载中...</div>';

        const filters = this.getSearchFilters();
        this.searchPage = 1;
        this.searchPageSize = (this.searchViewMode === 'all') ? (this.searchPageSizeAll || 21) : (this.searchPageSizeGrouped || 5);
        await this.loadJobsWithPagination('', filters, true);
    }

    // 搜索岗位（支持关键词 + 城市、行业、薪资、企业性质筛选）
    async searchJobs() {
        const keyword = document.getElementById('jobSearchInput').value.trim();
        const container = document.getElementById('searchResults');
        const filters = this.getSearchFilters();
        this.searchPage = 1;
        this.searchPageSize = (this.searchViewMode === 'all') ? (this.searchPageSizeAll || 21) : (this.searchPageSizeGrouped || 5);
        await this.loadJobsWithPagination(keyword, filters, false);
    }

    // 设置「主动探索」展示方式：grouped(按岗位归类) / all(全部职位)
    setSearchViewMode(mode) {
        const next = (mode === 'all') ? 'all' : 'grouped';
        this.searchViewMode = next;
        this.searchPage = 1;
        this.searchPageSize = (next === 'all') ? (this.searchPageSizeAll || 21) : (this.searchPageSizeGrouped || 5);

        const btnGrouped = document.getElementById('searchViewGroupedBtn');
        const btnAll = document.getElementById('searchViewAllBtn');
        if (btnGrouped && btnAll) {
            const groupedActive = next === 'grouped';
            btnGrouped.classList.toggle('active', groupedActive);
            btnAll.classList.toggle('active', !groupedActive);
            btnGrouped.setAttribute('aria-selected', groupedActive ? 'true' : 'false');
            btnAll.setAttribute('aria-selected', groupedActive ? 'false' : 'true');
        }

        const container = document.getElementById('searchResults');
        if (container) {
            container.classList.toggle('grouped', next === 'grouped');
        }

        // 切换后立刻按当前关键词+筛选刷新（分页独立：统一回到第1页）
        const keyword = (document.getElementById('jobSearchInput')?.value || '').trim();
        const filters = this.getSearchFilters();
        this.loadJobsWithPagination(keyword, filters, !keyword);
    }

    // 带分页的岗位加载（用于主动探索页）
    async loadJobsWithPagination(keyword, filters, isDefault) {
        const container = document.getElementById('searchResults');
        const pager = document.getElementById('searchPagination');
        const prevBtn = document.getElementById('searchPrevBtn');
        const nextBtn = document.getElementById('searchNextBtn');
        const pageInfo = document.getElementById('searchPageInfo');
        if (!container) return;

        container.innerHTML = '<div class="loading-message">' + (keyword ? '搜索中...' : '加载中...') + '</div>';

        const page = this.searchPage || 1;
        const isGrouped = this.searchViewMode !== 'all';
        const size = this.searchPageSize || (isGrouped ? 30 : 21);

        // 归类视图：/matching/search-jobs-grouped；全部职位：原 /matching/search-jobs
        const result = isGrouped
            ? await searchJobsGrouped(keyword, page, size, filters, getCurrentUserId())
            : await searchJobs(keyword, page, size, filters, getCurrentUserId());
        console.log('[search-jobs result]', { mode: isGrouped ? 'grouped' : 'all', keyword, page, size, filters, result });

        const list = isGrouped
            ? ((result.data && result.data.groups) || [])
            : ((result.data && (result.data.list || result.data.jobs)) || []);
        const total = (result.data && (result.data.total ?? result.data.total_count)) || 0;

        this.searchTotal = total;
        this.searchKeyword = keyword;

        if (result.success) {
            if (total > 0 && list.length > 0) {
                container.classList.toggle('grouped', isGrouped);
                if (isGrouped) this.renderJobGroups(list, container);
                else this.renderJobs(list, container);
        } else {
            container.innerHTML = '<div class="hint-text">' + (keyword ? '未找到相关岗位' : '暂无岗位信息') + '</div>';
            }
        } else {
            const msg = result.msg || '语义岗位搜索超时或失败，请稍后重试 / 检查 AI 服务 (http://localhost:5002)';
            container.innerHTML = '<div class="hint-text">' + msg + '</div>';
        }

        // 更新结果区顶部 meta
        const metaEl = document.getElementById('searchResultsMeta');
        if (metaEl) {
            if (!result.success) metaEl.textContent = '搜索结果';
            else metaEl.textContent = isGrouped
                ? `搜索结果：共 ${total} 个岗位种类`
                : `搜索结果：共 ${total} 个职位`;
        }

        // 更新分页 UI
        if (pager && pageInfo && prevBtn && nextBtn) {
            const pages = total && size ? Math.max(1, Math.ceil(total / size)) : 1;
            pager.style.display = total > 0 ? 'flex' : 'none';
            pageInfo.textContent = `第 ${page} / ${pages} 页`;
            prevBtn.disabled = page <= 1;
            nextBtn.disabled = page >= pages;

            prevBtn.onclick = () => {
                if (this.searchPage > 1) {
                    this.searchPage -= 1;
                    this.loadJobsWithPagination(this.searchKeyword || '', this.getSearchFilters(), false);
                }
            };
            nextBtn.onclick = () => {
                if (this.searchPage < pages) {
                    this.searchPage += 1;
                    this.loadJobsWithPagination(this.searchKeyword || '', this.getSearchFilters(), false);
                }
            };
        }
    }

    // 分析岗位匹配（API 使用 job_id）。可选传入 jobIdOverride：从推荐/搜索卡片点击时直接传入，不依赖下拉框
    async analyzeJobMatch(jobIdOverride) {
        const jobId = (jobIdOverride && String(jobIdOverride).trim()) || document.getElementById('jobSelect')?.value?.trim();
        if (!jobId) {
            this.showToast('请选择一个岗位', 'error');
            return;
        }

        const userId = getCurrentUserId();
        const anaEmpty = document.getElementById('anaEmpty');
        const anaContent = document.getElementById('anaContent');
        const container = document.getElementById('analysisResult');
        if (anaEmpty) anaEmpty.style.display = 'none';
        if (anaContent) anaContent.style.display = 'flex';
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
        const dimExps = data.dim_explanations || {};
        const highlights = data.highlights || [];
        const gaps = data.gaps || [];
        const matchedSkills = data.matched_skills || [];
        const skillGaps = data.skill_gaps || [];
        const improvementPlan = data.improvement_plan || {};
        const promotionPath = data.promotion_path || [];
        const transitionPaths = data.transition_paths || [];
        const jobInfo = data.job_info || {};
        const jobName = data.job_name || '岗位';

        // 展示兜底：避免四维度为 0/缺失导致 UI “空”
        const DIM_FALLBACK = { basic_requirements: 75, professional_skills: 55, soft_skills: 70, development_potential: 70 };
        const safeDim = (k) => (dimScores && typeof dimScores[k] === 'object' && dimScores[k]) ? dimScores[k] : {};
        const safeScore = (k) => {
            const v = Number(safeDim(k).score);
            return (Number.isFinite(v) && v > 0) ? v : (DIM_FALLBACK[k] || 60);
        };
        const safeRequired = (k) => {
            const v = Number(safeDim(k).required_score);
            if (Number.isFinite(v) && v > 0) return Math.min(100, v);
            const s = safeScore(k);
            return Math.min(100, s + 5);
        };

        // 更新左侧栏
        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text || '—'; };
        set('anaJobTitle', jobName);
        set('anaCoName', jobInfo.company || '—');
        const logo = document.getElementById('anaCoLogo');
        if (logo) {
            logo.textContent = (jobInfo.company || jobName).slice(0, 2);
            logo.style.background = '#2d6a4f';
        }
        set('anaCoType', jobInfo.location ? jobInfo.location + ' · 月薪范围' : '月薪范围');
        set('anaJobSalary', jobInfo.salary || '—');
        const locEl = document.getElementById('anaJobLoc');
        if (locEl) locEl.textContent = jobInfo.location ? jobInfo.location : '—';

        // 环形分
        const scoreText = document.getElementById('anaScoreText');
        if (scoreText) scoreText.textContent = score;
        const ring = document.getElementById('anaRingFill');
        if (ring) ring.setAttribute('stroke-dashoffset', 251.2 * (1 - score / 100));

        // 维度图例
        const dimLabels = { basic_requirements: '基础要求', professional_skills: '专业技能', soft_skills: '职业素养', development_potential: '发展潜力' };
        const ICON_TARGET = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/></svg>';
        const ICON_DOC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l3 3v15H7V3z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>';
        const ICON_USER = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20c1.6-4.6 12.4-4.6 14 0"/></svg>';
        const ICON_GROWTH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><path d="M10 7h7v7"/></svg>';
        const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
        const ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
        const DIM_TAB_ICONS = [ICON_TARGET, ICON_DOC, ICON_USER, ICON_GROWTH];
        const dimKeys = ['basic_requirements', 'professional_skills', 'soft_skills', 'development_potential'];
        const legendEl = document.getElementById('anaRingLegend');
        if (legendEl) {
            const colors = ['#2d6a4f', '#0BA771', '#E8890B', '#40916c'];
            legendEl.innerHTML = dimKeys.map((key, i) => {
                const s = safeScore(key);
                return `<div class="leg-item"><div class="leg-dot" style="background:${colors[i]}"></div><span class="leg-name">${dimLabels[key]}</span><span class="leg-score">${s}</span></div>`;
            }).join('');
        }

        // 雷达图数据：四维度分数；岗位要求基线优先用后端返回的 required_score，无则用分数+5 兜底
        const radarValues = dimKeys.map(k => safeScore(k));
        const reqValues = dimKeys.map(k => safeRequired(k));
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
            const gapText = s >= req ? `已达标，超出 +${s - req} 分` : `差距 ${req - s} 分，需重点提升`;
            const gapCls = s >= req ? 'gap-ok' : 'gap-warn';
            return `<div class="dim-block ${i === 0 ? 'active' : ''}" data-dim="${key}" data-dim-index="${i}" style="border-left: 3px solid ${color};">
                <div class="dim-block-name">${dimLabels[key]}</div>
                <div class="dim-block-scores"><span class="dim-score ${cls}" style="color: ${color};">${s}</span><span class="dim-vs">/ ${req} 要求</span></div>
                <div class="dim-gap ${gapCls}">${gapText}</div>
            </div>`;
        }).join('');

        // 逐项能力对比：按维度 tab，内容用亮点+差距简化
        const dimTabsHtml = dimKeys.map((key, i) =>
            `<button type="button" class="dim-tab ${i === 0 ? 'active' : ''}" data-dim-tab="${key}">${dimLabels[key]}</button>`
        ).join('');
        const youItems = highlights.slice(0, 4).map(h => `<div class="cmp-item"><span class="cmp-ico">✅</span><div><div class="cmp-name">${h}</div></div><span class="lvl lvl-have">✓ 符合</span></div>`).join('');
        const gapSource = (skillGaps && skillGaps.length) ? skillGaps : gaps;
        const dimContentHtml = dimKeys.map((key, i) => {
            const s = radarValues[i];
            const req = reqValues[i];
            const exp = dimExps[key] || {};
            const sum = (exp.summary || '').toString().trim();
            const hi = Array.isArray(exp.highlights) ? exp.highlights.slice(0, 3) : [];
            const sug = Array.isArray(exp.suggestions) ? exp.suggestions.slice(0, 3) : [];
            const hiHtml = hi.map(t => `<li>${t}</li>`).join('');
            const sugHtml = sug.map(t => `<li>${t}</li>`).join('');

            // 关键差距与建议（黄色框）：四个维度都展示
            const buildGapRows = () => {
                const rows = [];
                const need = Math.max(0, Number(req) - Number(s));
                if (key === 'professional_skills') {
                    if (sum) rows.push({ left: '解读', right: sum });
                    (gapSource || []).slice(0, 5).forEach((g, idx) => {
                        rows.push({
                            left: (g && (g.gap || g.skill)) ? String(g.gap || g.skill) : `差距项${idx + 1}`,
                            right: (g && g.suggestion) ? String(g.suggestion) : ''
                        });
                    });
                } else {
                    if (sum) rows.push({ left: '解读', right: sum });
                    if (need > 0) {
                        rows.push({
                            left: `${dimLabels[key]}差距约 ${need} 分`,
                            right: '建议优先按下方行动清单逐项补齐，形成可投递/可面试的成果。'
                        });
                    }
                    const sugList = Array.isArray(exp.suggestions) ? exp.suggestions : [];
                    sugList.slice(0, 4).forEach((t, idx) => {
                        rows.push({ left: `建议 ${idx + 1}`, right: String(t || '').trim() });
                    });
                    if (rows.length === 0) {
                        rows.push({ left: '提升建议', right: `围绕「${dimLabels[key]}」补齐关键项，并用项目/经历结果量化体现。` });
                    }
                }
                return rows.slice(0, 5).map((r, idx) =>
                    `<div class="gap-row"><div class="gap-n">${idx + 1}</div><div><strong>${r.left}：</strong>${r.right || ''}</div></div>`
                ).join('');
            };
            const gapRowsHtml = buildGapRows();
            const gapBoxHtml = gapRowsHtml ? `<div class="gap-box">
                    <div class="ai-hint-label">通过能力差距分析识别影响匹配度的关键短板，并生成个性化提升建议。</div>
                    <div class="gap-box-title">关键差距与建议</div>${gapRowsHtml}
                </div>` : '';
            return `<div class="dim-content ${i === 0 ? 'show' : ''}" id="dim-content-${key}">
                <div class="cmp-grid">
                    <div class="cmp-col job-col"><div class="cmp-head">岗位要求</div>
                        <div class="cmp-item"><div><div class="cmp-name">${dimLabels[key]} 基线</div><div class="cmp-note">要求约 ${req} 分</div></div><span class="lvl lvl-must">必要</span></div>
                    </div>
                    <div class="cmp-col you-col"><div class="cmp-head">你的情况</div>
                        <div class="cmp-item"><div><div class="cmp-name">当前 ${s} 分</div><div class="cmp-note">${s >= req ? '已达标' : '需提升'}</div></div><span class="lvl ${s >= req ? 'lvl-have' : 'lvl-part'}">${s >= req ? '符合' : '需提升'}</span></div>
                    </div>
                </div>
                ${gapBoxHtml}
            </div>`;
        }).join('');

        // 行动计划：优先使用 CareerAgent 返回的 improvement_plan（兼容字符串/对象）；若为空再回退到 gaps 生成
        const dimSuggestions = { basic_requirements: '补充学历/专业/GPA等基础条件', professional_skills: '通过项目或课程提升岗位所需技能', soft_skills: '加强沟通协作、学习能力等软技能', development_potential: '积累项目经验、参与竞赛或实习' };
        let planItems = [];
        const shortPlan = (improvementPlan.short_term || []).slice(0, 3);
        const midPlan = (improvementPlan.mid_term || []).slice(0, 3);

        const normalizePlanItem = (it) => {
            if (!it) return null;
            if (typeof it === 'string') {
                return { title: it, desc: '', steps: [], timeframe: '', output: '' };
            }
            if (typeof it === 'object') {
                return {
                    title: String(it.title || it.name || '').trim() || '提升行动',
                    desc: String(it.desc || it.description || '').trim(),
                    steps: Array.isArray(it.steps) ? it.steps.map(s => String(s || '').trim()).filter(Boolean).slice(0, 4) : [],
                    timeframe: String(it.timeframe || it.period || '').trim(),
                    output: String(it.output || it.deliverable || '').trim()
                };
            }
            return null;
        };

        const renderPlanDesc = (p) => {
            const parts = [];
            if (p.desc) parts.push(`<div class="plan-desc">${p.desc}</div>`);
            if (p.steps && p.steps.length) {
                parts.push(`<ul class="plan-steps">${p.steps.map(s => `<li>${s}</li>`).join('')}</ul>`);
            }
            if (p.timeframe || p.output) {
                parts.push(`<div class="plan-meta">${p.timeframe ? `<span class="pm">${p.timeframe}</span>` : ''}${p.output ? `<span class="pm">${p.output}</span>` : ''}</div>`);
            }
            return parts.join('');
        };

        if (shortPlan.length || midPlan.length) {
            planItems = [
                ...shortPlan.map((t, i) => {
                    const p = normalizePlanItem(t) || { title: String(t || ''), desc: '', steps: [], timeframe: '', output: '' };
                    return { period: 'short', ico: [ICON_TARGET, ICON_WARN, ICON_DOC][i] || ICON_TARGET, title: p.title, descHtml: renderPlanDesc(p), tag: 't-urgent' };
                }),
                ...midPlan.map((t, i) => {
                    const p = normalizePlanItem(t) || { title: String(t || ''), desc: '', steps: [], timeframe: '', output: '' };
                    return { period: 'mid', ico: [ICON_GROWTH, ICON_DOC, ICON_TARGET][i] || ICON_GROWTH, title: p.title, descHtml: renderPlanDesc(p), tag: 't-mid' };
                })
            ];
        } else if (gapSource.length > 0) {
            planItems = [
                ...gapSource.slice(0, 3).map((g, i) => ({ period: 'short', ico: [ICON_TARGET, ICON_WARN, ICON_DOC][i], title: g.gap || '提升该项能力', descHtml: g.suggestion ? `<div class="plan-desc">${g.suggestion}</div>` : '', tag: 't-urgent' })),
                ...gapSource.slice(3, 6).map((g, i) => ({ period: 'mid', ico: [ICON_GROWTH, ICON_DOC, ICON_TARGET][i], title: g.gap || '持续提升', descHtml: g.suggestion ? `<div class="plan-desc">${g.suggestion}</div>` : '', tag: 't-mid' }))
            ];
        } else {
            const lowDims = dimKeys.filter(k => safeScore(k) < 70).slice(0, 3);
            planItems = lowDims.map((k, i) => ({ period: 'short', ico: [ICON_TARGET, ICON_WARN, ICON_DOC][i], title: `提升${dimLabels[k]}`, descHtml: `<div class="plan-desc">${dimSuggestions[k] || '根据岗位要求针对性提升'}</div>`, tag: 't-urgent' }));
        }
        if (planItems.length === 0) planItems.push({ period: 'short', ico: ICON_TARGET, title: '根据分析结果制定计划', descHtml: '<div class="plan-desc">完善能力画像后可获得更具体的行动计划。</div>', tag: 't-mid' });
        const planItemsHtml = planItems.map(p => `<div class="plan-item" data-period="${p.period}"><span class="plan-dot" aria-hidden="true"></span><div class="plan-body"><div class="plan-title">${p.title}</div>${p.descHtml || ''}</div><span class="plan-tag ${p.tag}">${p.period === 'short' ? '短期' : '中期'}</span></div>`).join('');

        // 已匹配核心技能：兜底生成占位行，避免空表格
        const matchedSkillsDisplay = (Array.isArray(matchedSkills) && matchedSkills.length)
            ? matchedSkills
            : (() => {
                const ph = [];
                const src = (gapSource || []).slice(0, 3);
                if (src.length) {
                    src.forEach(g => {
                        ph.push({ skill: g.gap || '岗位核心技能', student_skill: '待补充', match_score: 0, similarity: 0 });
                    });
                } else {
                    ph.push(
                        { skill: '岗位核心技能A', student_skill: '待补充', match_score: 0, similarity: 0 },
                        { skill: '岗位核心技能B', student_skill: '待补充', match_score: 0, similarity: 0 },
                        { skill: '岗位核心技能C', student_skill: '待补充', match_score: 0, similarity: 0 }
                    );
                }
                return ph;
            })();
        const matchedSkillsTableHtml = `
            <table class="ca-skill-table">
                <thead><tr><th>岗位技能</th><th>你的技能</th><th>匹配分</th><th>语义相似</th></tr></thead>
                <tbody>
                    ${matchedSkillsDisplay.slice(0, 6).map(ms => `
                        <tr>
                            <td>${ms.skill || '-'}</td>
                            <td>${ms.student_skill || '-'}</td>
                            <td>${ms.match_score ?? 0}</td>
                            <td>${(ms.similarity != null ? Math.round(ms.similarity * 100) : 0)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${(!Array.isArray(matchedSkills) || matchedSkills.length === 0) ? '<div class="hint-text">提示：完善“能力画像-技能清单/项目经历”后，可获得更准确的匹配技能明细。</div>' : ''}`;

        container.innerHTML = `
            <div class="sec">
                <div class="sec-title"><span class="sec-ico">${ICON_TARGET}</span>四维度匹配概览</div>
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
                <div class="sec-title"><span class="sec-ico">${ICON_DOC}</span>逐项能力对比</div>
                <div class="sec-sub">岗位要求 vs 你目前能力水平，精准定位差距所在</div>
                <div class="dim-tabs">${dimTabsHtml}</div>
                ${dimContentHtml}
            </div>
            <div class="sec">
                <div class="sec-title" style="margin-bottom:10px"><span class="sec-ico">${ICON_OK}</span>已匹配核心技能</div>
                ${matchedSkillsTableHtml}
            </div>
            <div class="sec">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <div class="sec-title" style="margin-bottom:0"><span class="sec-ico">${ICON_WARN}</span>个性化提升行动计划</div>
                    <div class="plan-tabs">
                        <button type="button" class="plan-tab active" data-plan="short">短期（3个月内）</button>
                        <button type="button" class="plan-tab" data-plan="mid">中期（3–6个月）</button>
                    </div>
                </div>
                <div class="plan-items" id="planList">${planItemsHtml}</div>
            </div>
            <div class="sec">
                <div class="sec-title" style="margin-bottom:16px"><span class="sec-ico">${ICON_GROWTH}</span>职业发展路径</div>
                <div class="ai-hint ai-hint-purple">
                    智能体决策说明：系统基于技能相似度、行业发展趋势与薪资成长潜力进行综合评估，优先推荐最具长期发展价值的职业路径。
                </div>
                <div class="sec-sub" style="margin-top:4px;margin-bottom:12px">结合岗位画像与个人擅长方向，构建本职业清晰的发展路径</div>
                <div id="reportCareerPathContainer"></div>
            </div>
        `;

        this.drawAnalysisRadar(radarValues, reqValues);
        this.bindAnalysisTabs();
        if (jobName) this.renderCareerPath(jobName);
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

    // 职业发展路径：请求接口并渲染 path + 换岗（传入 jobName，接口返回 { stage, years, salary, icon }）
    async renderCareerPath(jobName) {
        const box = document.getElementById('reportCareerPathContainer');
        if (!box) return;
        box.innerHTML = '<div class="loading-message">加载路径中...</div>';
        const result = await getCareerPath(jobName);
        if (result.code !== 200 || !result.data) {
            box.innerHTML = '<p class="hint-text">' + (result.msg || '加载失败') + '</p>';
            return;
        }
        const path = Array.isArray(result.data.path) ? result.data.path : [];
        const altPaths = Array.isArray(result.data.altPaths) ? result.data.altPaths : [];
        // 兼容后端格式：{ stage, years, salary } 或旧格式 { jobName, years, level }
        const toNode = (node) => ({
            jobName: node.jobName || node.stage || node.role_title || '',
            years: node.years || node.years_range || '',
            level: node.level || node.salary || ''
        });
        let trackHtml = '';
        path.forEach((node, i) => {
            const n = toNode(node);
            if (i > 0) trackHtml += '<div class="path-arr">→</div>';
            trackHtml += `<div class="path-node${i === 0 ? ' cur' : ''}"><div class="path-node-title">${n.jobName || '-'}</div><div class="path-node-meta">${[n.years, n.level].filter(Boolean).join(' · ')}</div></div>`;
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
        
        // 收集用户偏好设置
        const prefs = {
            career_goal: document.getElementById('prefCareerGoal')?.value || '',
            work_location: document.getElementById('prefWorkLocation')?.value?.trim() || '',
            salary_expectation: document.getElementById('prefSalary')?.value || '',
            work_life_balance: document.getElementById('prefWorkLifeBalance')?.value || ''
        };
        const preferences = Object.fromEntries(Object.entries(prefs).filter(([, v]) => v));
        
        // 收集目标岗位
        const targetSelect = document.getElementById('prefTargetJobs');
        const targetJobs = targetSelect ? Array.from(targetSelect.selectedOptions).map(o => o.value).filter(Boolean) : [];
        
        // 显示生成中状态
        this.showReportGeneratingArea();
        
        try {
            // 先获取用户最新的能力画像，确保报告基于最新数据
            const abilityProfileResult = await getAbilityProfile(userId);
            
            // 生成报告，传递用户偏好、目标岗位和最新能力画像信息
            const result = await generateCareerReport(userId, {
                preferences,
                target_jobs: targetJobs,
                user_context: {
                    has_ability_profile: abilityProfileResult.success && abilityProfileResult.data,
                    profile_completeness: abilityProfileResult.data?.overall_assessment?.completeness || 0
                }
            });
            
            if (result.success && result.data?.report_id) {
                this.pollCareerReportReady(userId, result.data.report_id);
            } else {
                this.showReportGenerateArea();
                this.showToast(result.msg || '生成失败', 'error');
            }
        } catch (error) {
            console.error('生成报告时出错:', error);
            this.showReportGenerateArea();
            this.showToast('生成失败，请稍后重试', 'error');
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
                    this.currentReportData = result.data;
                    this.showReportContentArea();
                    this.renderCareerReportContent(result.data);
                    this.showToast('报告生成完成！', 'success');
                    // 添加到历史记录
                    this.appendCareerReportHistory(reportId, result.data.created_at || new Date().toISOString(), {
                        primary_career: result.data.primary_career || '职业规划报告',
                        completeness: result.data.completeness || 90,
                        status: 'completed'
                    });
                    // 重新加载历史报告信息，确保最新生成的报告显示在历史记录中
                    this.loadReportHistoryInfo();
                    // 如果历史报告列表已经打开，重新加载历史报告列表
                    const historyDiv = document.getElementById('reportHistory');
                    if (historyDiv && !historyDiv.classList.contains('hidden')) {
                        this.viewCareerReportHistory();
                    }
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

    // 加载职业规划报告内容（失败时自动重试一次，并已延长接口超时，便于加载出来）
    async loadReportContent(reportId) {
        const contentDiv = document.getElementById('reportContent');
        if (!contentDiv) return;
        const userId = getCurrentUserId();
        contentDiv.innerHTML = '<div class="loading-message">加载报告内容中...</div>';
        this.showReportContentArea();
        const REPORT_TIMEOUT_MS = 120000; // 延长超时时间到120秒
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('REPORT_TIMEOUT')), REPORT_TIMEOUT_MS));
        let result;
        try {
            result = await Promise.race([getCareerReport(userId || 10001, reportId), timeoutPromise]);
        } catch (e) {
            result = { success: false, msg: e.message === 'REPORT_TIMEOUT' ? '请求超时' : '网络错误' };
        }
        if (!result.success || !result.data) {
            const msg = (result.msg || '') + '';
            const canRetry = /超时|无法连接|网络|请求超时/.test(msg);
            if (canRetry) {
                contentDiv.innerHTML = '<div class="loading-message">首次加载未就绪，正在重试...</div>';
                await new Promise(r => setTimeout(r, 2500));
                result = await getCareerReport(userId || 10001, reportId);
            }
        }
        if (!result.success || !result.data) {
            const msg = (result.msg || '未知错误') + '';
            const isTimeout = msg.indexOf('超时') !== -1 || msg.indexOf('timeout') !== -1;
            const hint = isTimeout
                ? '报告加载超时。请确认 AI 服务已启动：在项目根目录运行 start_ai_service.ps1，或执行 cd AI算法 && python app.py，启动后刷新本页重试。'
                : (msg.indexOf('5002') !== -1 || msg.indexOf('127.0.0.1') !== -1
                    ? '无法连接报告服务。请先启动 AI 服务（start_ai_service.ps1 或 cd AI算法 && python app.py），再刷新页面。'
                    : '加载失败：' + msg);
            contentDiv.innerHTML = '<div class="hint-text">' + hint + '</div>';
            return;
        }
        this.currentReportId = reportId;
        this.currentReportData = result.data;
        if (result.data.status && result.data.status !== 'completed') {
            contentDiv.innerHTML = '<div class="hint-text">报告生成中，请稍后刷新或从历史报告再次进入</div>';
            return;
        }
        this.renderCareerReportContent(result.data);
    }

    // 移除内容中 7.1、7.3、7.5 等纯数字（保留年份、月份、2-3个月 等时间类数字）
    sanitizeCareerText(text) {
        if (!text || typeof text !== 'string') return text;
        return text
            .replace(/\b[1-9]\.[1-9]\d?\b/g, (m) => {
                const [a] = m.split('.').map(Number);
                if (a >= 1980 && a <= 2100) return m; // 年份.月 保留
                return '';
            })
            .replace(/\s*[、，]\s*[、，]/g, '、')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // 评分转文字描述（仅保留文字，删除具体数字）
    scoreToLabel(score) {
        if (score == null || score === '') return '';
        const n = Number(score);
        if (!Number.isFinite(n)) return '';
        if (n >= 90) return '高分';
        if (n >= 80) return '良好';
        if (n >= 70) return '中等';
        return '有提升空间';
    }

    // 薪资区间转文字描述
    salaryToLabel(s) {
        if (!s || typeof s !== 'string') return '合理区间';
        const m = s.match(/(\d+)\s*k/gi);
        if (!m) return '合理区间';
        const nums = m.map(x => parseInt(x.replace(/\D/g, ''), 10)).filter(Boolean);
        const max = Math.max(...nums);
        if (max >= 30) return '高端区间';
        if (max >= 20) return '中高区间';
        if (max >= 10) return '合理区间';
        return '起步区间';
    }

    // 渲染职业规划报告内容（5 大模块、可折叠、左侧目录、无 7.x 数字）
    renderCareerReportContent(data, container) {
        const contentDiv = container || document.getElementById('reportContent');
        const tocDiv = container ? null : document.getElementById('reportToc');
        const san = (t) => this.sanitizeCareerText(t || '');
        const genTime = this.formatDateTime(data.generated_at || data.created_at);
        const meta = data.metadata || {};
        const s1 = data.section_1_job_matching || {};
        const s2 = data.section_2_career_path || {};
        const s3 = data.section_3_action_plan || {};
        const s4 = data.section_4_evaluation || {};
        const summary = data.summary || {};

        const modules = [
            { id: 'module-summary', title: '核心摘要', icon: '✨', defaultOpen: true },
            { id: 'module-explore', title: '职业探索', icon: '🎯', defaultOpen: false },
            { id: 'module-job-requirements', title: '岗位能力要求拆解', icon: '📋', defaultOpen: false },
            { id: 'module-goal', title: '目标规划', icon: '📈', defaultOpen: false },
            { id: 'module-action', title: '行动计划', icon: '📋', defaultOpen: false },
            { id: 'module-painpoints', title: '痛点解决方案', icon: '🎯', defaultOpen: false }
        ];

        // 左侧目录
        let tocHtml = '<div class="report-toc-title">目录</div>';
        modules.forEach(m => {
            tocHtml += `<a href="#${m.id}" class="report-toc-item"><span class="toc-icon">${m.icon}</span>${m.title}</a>`;
        });
        if (tocDiv) tocDiv.innerHTML = tocHtml;

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

        // === 模块 1：核心摘要（含下一步行动置顶）===
        const nextSteps = summary.next_steps || [];
        const keyTakeaways = summary.key_takeaways || [];
        const motivationalMsg = summary.motivational_message || '';
        const hasSummary = nextSteps.length || keyTakeaways.length || motivationalMsg;
        if (hasSummary) {
            const openClass = 'career-module-open';
            html += `<section id="module-summary" class="career-module career-module-summary ${openClass}" data-module="summary">
                <div class="career-module-header" data-toggle="module-summary">
                    <span class="module-icon">✨</span>
                    <span class="module-title">核心摘要</span>
                    <span class="module-arrow">▼</span>
                </div>
                <div class="career-module-body">
                    ${nextSteps.length ? `
                    <div class="next-steps-block next-steps-highlight">
                        <h5><span class="step-icon">⚡</span>下一步行动</h5>
                        <ul class="next-steps-list">
                            ${nextSteps.map(n => {
                                const t = san(n);
                                const isThisWeek = /本周|本周内|本周必须|本周完成/i.test(t);
                                return `<li class="next-step-item ${isThisWeek ? 'step-this-week' : ''}">
                                    ${isThisWeek ? '<span class="badge-this-week">本周必须完成</span>' : ''}
                                    ${t}
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>` : ''}
                    ${keyTakeaways.length ? `<div class="key-takeaways"><h5>核心要点</h5><ul>${keyTakeaways.map(k => `<li>${san(k)}</li>`).join('')}</ul></div>` : ''}
                    ${motivationalMsg ? `<div class="motivational-msg">${san(motivationalMsg)}</div>` : ''}
                </div>
            </section>`;
        }

        // === 模块 2：职业探索 ===
        if (s1.title) {
            const selfA = s1.self_assessment || {};
            const recs = s1.recommended_careers || [];
            const advice = s1.career_choice_advice || {};
            html += `<section id="module-explore" class="career-module career-module-explore" data-module="explore">
                <div class="career-module-header" data-toggle="module-explore">
                    <span class="module-icon">🎯</span>
                    <span class="module-title">职业探索</span>
                    <span class="module-arrow">▶</span>
                </div>
                <div class="career-module-body career-module-collapsed">
                    <div class="career-self-assessment">
                        <h5>自我认知总结</h5>
                        <div class="self-grid">
                            <div class="self-card"><h6>优势</h6><ul>${(selfA.strengths || []).map(s => `<li>${san(s)}</li>`).join('')}</ul></div>
                            <div class="self-card"><h6>兴趣</h6><ul>${(selfA.interests || []).map(i => `<li>${san(i)}</li>`).join('')}</ul></div>
                            <div class="self-card"><h6>价值观</h6><ul>${(selfA.values || []).map(v => `<li>${san(v)}</li>`).join('')}</ul></div>
                        </div>
                    </div>
                    <div class="career-recommended">
                        <h5>推荐职业方向</h5>
                        ${recs.map(rc => {
                            const ma = rc.match_analysis || {};
                            const mo = rc.market_outlook || {};
                            const gaps = ma.gaps_and_solutions || [];
                            const scoreLabel = this.scoreToLabel(rc.match_score);
                            const salaryLabel = this.salaryToLabel(mo.salary_range);
                            const scoreHtml = scoreLabel ? `<span class="rec-score-badge rec-score-${scoreLabel === '高分' ? 'high' : scoreLabel === '良好' ? 'good' : 'mid'}">${scoreLabel}</span>` : '';
                            return `<div class="rec-career-card-v2">
                                ${scoreHtml}
                                <div class="rec-career-header"><span class="rec-name">${rc.career}</span></div>
                                ${(ma.why_suitable || []).length ? `<div class="rec-why"><strong>适合原因：</strong>${san(ma.why_suitable.join('；'))}</div>` : ''}
                                ${ma.capability_match ? `
                                <div class="rec-capability-match">
                                    <strong>能力匹配度：</strong>
                                    ${ma.capability_match.professional_skills ? `<div class="capability-item">专业技能：${ma.capability_match.professional_skills.score}%（${san(ma.capability_match.professional_skills.description || '')}）</div>` : ''}
                                    ${ma.capability_match.soft_skills ? `<div class="capability-item">通用素质：${ma.capability_match.soft_skills.score}%（${san(ma.capability_match.soft_skills.description || '')}）</div>` : ''}
                                </div>` : ''}
                                ${mo.salary_range ? `<div class="rec-market"><span class="rec-salary-badge">${salaryLabel}</span> 薪资${salaryLabel}</div>` : ''}
                                ${gaps.length ? `<div class="rec-gaps"><strong>能力差距与提升：</strong><ul>${gaps.map(g => `<li>${san(g.gap)} → ${san(g.solution)}（${g.timeline || ''}）</li>`).join('')}</ul></div>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                    ${advice.primary_recommendation ? `<div class="career-advice">
                        <h5>职业选择建议</h5>
                        <p><strong>首选：</strong>${san(advice.primary_recommendation)}</p>
                        <ul>${(advice.reasons || []).map(r => `<li>${san(r)}</li>`).join('')}</ul>
                        ${advice.alternative_option ? `<p><strong>备选：</strong>${san(advice.alternative_option)}</p>` : ''}
                        ${advice.risk_mitigation ? `<p class="risk-tip">${san(advice.risk_mitigation)}</p>` : ''}
                    </div>` : ''}
                </div>
            </section>`;
        }

        // === 模块 7：岗位能力要求拆解 ===
        html += `<section id="module-job-requirements" class="career-module career-module-job-requirements" data-module="job-requirements">
            <div class="career-module-header" data-toggle="module-job-requirements">
                <span class="module-icon">📋</span>
                <span class="module-title">岗位能力要求拆解</span>
                <span class="module-arrow">▶</span>
            </div>
            <div class="career-module-body career-module-collapsed">
                <div class="job-requirements-section">
                    <h5>核心岗位能力要求</h5>
                    <p>以下是当前就业市场对于应届生招聘岗位的主要能力要求拆解：</p>
                    
                    <!-- 算法工程师 -->
                    <div class="job-requirement-card">
                        <h6>算法工程师</h6>
                        <div class="job-requirement-details">
                            <div class="requirement-category">
                                <strong>专业技能：</strong>
                                <ul>
                                    <li>编程语言：Python（精通）、C++（熟悉）</li>
                                    <li>机器学习：熟悉常见算法原理和应用场景</li>
                                    <li>深度学习：了解主流框架（TensorFlow/PyTorch）</li>
                                    <li>数据结构与算法：扎实的基础，熟悉常见算法</li>
                                    <li>数学基础：概率论、线性代数、微积分</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>通用素质：</strong>
                                <ul>
                                    <li>学习能力：快速掌握新技术和算法</li>
                                    <li>问题解决：能够独立分析和解决复杂问题</li>
                                    <li>逻辑思维：严谨的逻辑分析能力</li>
                                    <li>团队协作：能够与跨职能团队有效合作</li>
                                    <li>沟通能力：清晰表达技术方案和结果</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>项目经验：</strong>
                                <ul>
                                    <li>参与过机器学习/深度学习项目</li>
                                    <li>有相关领域的竞赛经验（如Kaggle）</li>
                                    <li>熟悉数据处理和特征工程</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 后端开发工程师 -->
                    <div class="job-requirement-card">
                        <h6>后端开发工程师</h6>
                        <div class="job-requirement-details">
                            <div class="requirement-category">
                                <strong>专业技能：</strong>
                                <ul>
                                    <li>编程语言：Java、Golang、Python等</li>
                                    <li>框架：Spring Boot、Django、Flask等</li>
                                    <li>数据库：MySQL、PostgreSQL、Redis等</li>
                                    <li>系统设计：熟悉分布式系统、微服务架构</li>
                                    <li>网络协议：HTTP、TCP/IP等</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>通用素质：</strong>
                                <ul>
                                    <li>代码质量：注重代码可读性和可维护性</li>
                                    <li>问题解决：能够快速定位和解决技术问题</li>
                                    <li>学习能力：持续学习新技术和框架</li>
                                    <li>团队协作：能够与前端、测试等团队协作</li>
                                    <li>文档能力：能够编写清晰的技术文档</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>项目经验：</strong>
                                <ul>
                                    <li>参与过完整的后端系统开发</li>
                                    <li>有数据库设计和优化经验</li>
                                    <li>熟悉版本控制工具（如Git）</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 前端开发工程师 -->
                    <div class="job-requirement-card">
                        <h6>前端开发工程师</h6>
                        <div class="job-requirement-details">
                            <div class="requirement-category">
                                <strong>专业技能：</strong>
                                <ul>
                                    <li>基础：HTML5、CSS3、JavaScript（ES6+）</li>
                                    <li>框架：React、Vue、Angular等</li>
                                    <li>工具：Webpack、Vite、npm/yarn等</li>
                                    <li>响应式设计：能够适配不同设备</li>
                                    <li>性能优化：页面加载速度和用户体验</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>通用素质：</strong>
                                <ul>
                                    <li>用户体验：关注产品的用户体验</li>
                                    <li>审美能力：基本的设计美感</li>
                                    <li>学习能力：持续学习新的前端技术</li>
                                    <li>团队协作：与后端、设计团队协作</li>
                                    <li>沟通能力：理解产品需求并转化为技术实现</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>项目经验：</strong>
                                <ul>
                                    <li>参与过完整的前端项目开发</li>
                                    <li>有移动端适配经验</li>
                                    <li>熟悉前端工程化实践</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 产品经理 -->
                    <div class="job-requirement-card">
                        <h6>产品经理</h6>
                        <div class="job-requirement-details">
                            <div class="requirement-category">
                                <strong>专业技能：</strong>
                                <ul>
                                    <li>产品思维：能够从用户需求出发设计产品</li>
                                    <li>需求分析：能够清晰理解和拆解用户需求</li>
                                    <li>原型设计：熟悉Axure、Figma等工具</li>
                                    <li>数据分析：能够通过数据驱动产品决策</li>
                                    <li>项目管理：能够协调跨团队资源推进项目</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>通用素质：</strong>
                                <ul>
                                    <li>沟通能力：能够与不同角色有效沟通</li>
                                    <li>领导力：能够推动项目进展和决策</li>
                                    <li>学习能力：快速了解新领域和行业</li>
                                    <li>抗压能力：能够在压力下保持良好状态</li>
                                    <li>创新能力：能够提出新的产品思路</li>
                                </ul>
                            </div>
                            <div class="requirement-category">
                                <strong>项目经验：</strong>
                                <ul>
                                    <li>参与过产品从0到1的过程</li>
                                    <li>有用户研究和市场分析经验</li>
                                    <li>熟悉产品生命周期管理</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;

        // === 模块 3：目标规划 ===
        if (s2.title) {
            const st = s2.short_term_goal || {};
            const mt = s2.mid_term_goal || {};
            const rm = s2.career_roadmap || {};
            const trends = s2.industry_trends || {};
            html += `<section id="module-goal" class="career-module career-module-goal" data-module="goal">
                <div class="career-module-header" data-toggle="module-goal">
                    <span class="module-icon">📈</span>
                    <span class="module-title">目标规划</span>
                    <span class="module-arrow">▶</span>
                </div>
                <div class="career-module-body career-module-collapsed">
                    <div class="career-goals">
                        <div class="goal-card short"><h5>短期目标（1年内）</h5><p class="goal-timeline">${st.timeline || ''}</p><p class="goal-primary">${san(st.primary_goal || '')}</p>
                            <ul>${(st.specific_targets || []).map(t => `<li><span class="goal-deadline">${t.deadline || ''}</span> ${san(t.target)} — ${san(t.metrics)}</li>`).join('')}</ul>
                        </div>
                        <div class="goal-card mid"><h5>中期目标（3-5年）</h5><p class="goal-timeline">${mt.timeline || ''}</p><p class="goal-primary">${san(mt.primary_goal || '')}</p>
                            <ul>${(mt.specific_targets || []).map(t => `<li><span class="goal-deadline">${t.deadline || ''}</span> ${san(t.target)}</li>`).join('')}</ul>
                        </div>
                    </div>
                    ${rm.stages?.length ? `<div class="career-roadmap"><h5>职业发展路径：${san(rm.path_type || '')}</h5>
                        <div class="roadmap-stages">${(rm.stages || []).map((s, i) => `
                            <div class="roadmap-stage"><span class="stage-num">${i + 1}</span><div><strong>${s.stage}</strong>（${s.period || ''}）<ul>${(s.key_responsibilities || []).map(r => `<li>${san(r)}</li>`).join('')}</ul></div></div>
                        `).join('')}</div>
                        ${(rm.alternative_paths || []).length ? `<div class="alt-paths"><h6>晋升备选</h6><ul>${rm.alternative_paths.map(ap => `<li><strong>${ap.path}</strong>（${ap.timing || ''}）— ${san(ap.reason)}</li>`).join('')}</ul></div>` : ''}
                    </div>` : ''}
                    ${trends.key_trends?.length ? `<div class="industry-trends"><h5>行业趋势</h5><p>${san(trends.current_status || '')}</p><ul>${(trends.key_trends || []).map(t => `<li><strong>${san(t.trend)}</strong>：${san(t.impact)}；机会：${san(t.opportunity)}</li>`).join('')}</ul><p class="outlook">${san(trends['5_year_outlook'] || '')}</p></div>` : ''}
                    ${s2.job_data_analysis ? `<div class="job-data-analysis"><h5>企业岗位数据关联性分析</h5><p>${san(s2.job_data_analysis.overview || '')}</p><ul>${(s2.job_data_analysis.associations || []).map(a => `<li><strong>${san(a.job_title)}</strong>：${san(a.relevance)}；能力迁移：${san(a.skill_transferability || '')}</li>`).join('')}</ul></div>` : ''}
                </div>
            </section>`;
        }

        // === 模块 4：行动计划 ===
        if (s3.title) {
            const stp = s3.short_term_plan || {};
            const mp = stp.monthly_plans || [];
            const lp = s3.learning_path || {};
            const ash = s3.achievement_showcase || {};
            const skills = lp.technical_skills || [];
            html += `<section id="module-action" class="career-module career-module-action" data-module="action">
                <div class="career-module-header" data-toggle="module-action">
                    <span class="module-icon">📋</span>
                    <span class="module-title">行动计划</span>
                    <span class="module-arrow">▶</span>
                </div>
                <div class="career-module-body career-module-collapsed">
                    <div class="career-action-plan">
                        <h5>短期行动计划：${stp.period || ''}</h5>
                        <p class="plan-goal">${san(stp.goal || '')}</p>
                        ${mp.map(m => `
                            <div class="monthly-plan">
                                <div class="plan-header"><span class="plan-month">${m.month || ''}</span><span class="plan-focus">${m.focus || ''}</span></div>
                                <ul>${(m.tasks || []).map(t => `<li><strong>${san(t.task)}</strong>：${Array.isArray(t['具体行动']) ? san(t['具体行动'].join('；')) : ''} — ${san(t['预期成果'] || '')}</li>`).join('')}</ul>
                                <p class="plan-milestone">✓ ${san(m.milestone || '')}</p>
                            </div>
                        `).join('')}
                    </div>
                    ${skills.length ? `
                    <div class="learning-path">
                        <h5>学习路径</h5>
                        <div class="skill-progress-list">
                            ${skills.map(sk => {
                                const tl = sk.timeline || '';
                                const pct = /(\d+)[-－](\d+)\s*个?月/.test(tl) ? 60 : /个?月/.test(tl) ? 50 : 40;
                                return `<div class="skill-progress-item">
                                    <div class="skill-name">${sk.skill_area} <span class="skill-level">${sk.current_level || ''} → ${sk.target_level || ''}</span></div>
                                    <div class="skill-progress-bar"><div class="skill-progress-fill" style="width:${pct}%"></div><span class="skill-timeline">${tl}</span></div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>` : ''}
                    ${ash.portfolio_building ? `<div class="achievement-showcase"><h5>成果展示计划</h5><div class="showcase-grid">${Object.entries(ash.portfolio_building || {}).map(([k, v]) => `<div class="showcase-item"><h6>${k}</h6><p>${san(v.goal || '')}</p><ul>${(v.actions || []).map(a => `<li>${san(a)}</li>`).join('')}</ul></div>`).join('')}</div></div>` : ''}
                    ${s3.evaluation_metrics ? `<div class="evaluation-metrics"><h5>评估指标与调整机制</h5><p>${san(s3.evaluation_metrics.overview || '')}</p><ul>${(s3.evaluation_metrics.metrics || []).map(m => `<li><strong>${san(m.metric)}</strong>：${san(m.description)}；目标值：${san(m.target_value || '')}；评估周期：${san(m.evaluation_cycle || '')}</li>`).join('')}</ul><p class="adjustment-note">${san(s3.evaluation_metrics.adjustment_mechanism || '')}</p></div>` : ''}
                </div>
            </section>`;
        }



        // === 模块 6：痛点解决方案 ===
        html += `<section id="module-painpoints" class="career-module career-module-painpoints" data-module="painpoints">
            <div class="career-module-header" data-toggle="module-painpoints">
                <span class="module-icon">🎯</span>
                <span class="module-title">痛点解决方案</span>
                <span class="module-arrow">▶</span>
            </div>
            <div class="career-module-body career-module-collapsed">
                <div class="painpoint-solution">
                    <h5>自我认知与定位</h5>
                    <p>避免从众规划误区，建立个性化职业定位：</p>
                    <ul>
                        <li>定期进行自我评估，关注自身兴趣、能力和价值观的变化</li>
                        <li>参考但不盲目追随他人的职业选择，分析自身特质与职业的匹配度</li>
                        <li>寻求专业职业测评和咨询，获取客观的自我认知</li>
                    </ul>
                </div>
                <div class="painpoint-solution">
                    <h5>职业信息获取</h5>
                    <p>建立系统的职业信息渠道，避免认知片面：</p>
                    <ul>
                        <li>通过行业报告、官方网站等权威渠道了解行业和岗位信息</li>
                        <li>与行业专业人士建立联系，获取第一手的职业洞察</li>
                        <li>参与实习、项目等实践活动，深入了解职业真实面貌</li>
                        <li>关注新兴领域的发展动态，区分 "热门噱头" 与 "真实需求"</li>
                    </ul>
                </div>
                <div class="painpoint-solution">
                    <h5>外部支持体系</h5>
                    <p>构建多元化的职业指导网络：</p>
                    <ul>
                        <li>积极参与高校的生涯规划课程和活动，获取理论基础</li>
                        <li>寻找行业导师，获取贴合实际的职业建议</li>
                        <li>与家人进行有效沟通，平衡家庭期望与个人职业规划</li>
                        <li>加入职业社群，与志同道合的人交流学习</li>
                    </ul>
                </div>
                <div class="painpoint-solution">
                    <h5>规划落地与实践</h5>
                    <p>通过实践验证和动态调整，确保规划的可行性：</p>
                    <ul>
                        <li>制定分阶段的行动计划，通过实习、项目等方式验证规划</li>
                        <li>建立定期评估机制，根据实际情况调整规划</li>
                        <li>培养适应变化的能力，面对挫折时保持积极心态</li>
                        <li>积累职业资本，提升自身在就业市场的竞争力</li>
                    </ul>
                </div>
            </div>
        </section>`;

        html += `<div class="career-report-footer">本报告由 AI 职业规划智能体生成 · 仅供参考，具体决策请结合个人实际情况</div></div>`;

        contentDiv.innerHTML = html;

        // 折叠/展开 + 目录跳转 + 回到顶部
        this.bindCareerReportBehavior();
    }

    bindCareerReportBehavior() {
        const wrap = document.querySelector('.career-report-wrap');
        if (!wrap) return;
        wrap.querySelectorAll('.career-module-header[data-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-toggle');
                const mod = document.getElementById(id);
                const body = mod?.querySelector('.career-module-body');
                const arrow = btn.querySelector('.module-arrow');
                if (!body) return;
                const isOpen = body.classList.toggle('career-module-collapsed');
                if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
                mod?.classList.toggle('career-module-open', !isOpen);
            });
        });
        const backBtn = document.getElementById('reportBackToTop');
        if (backBtn) {
            const onScroll = () => backBtn.classList.toggle('hidden', (window.scrollY || document.documentElement.scrollTop) < 200);
            window.addEventListener('scroll', onScroll, { passive: true });
            backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        }
    }

    // 7.6 完整性检查 - 弹窗展示完整结果
    async checkReportCompleteness() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        const content = document.getElementById('reportCompletenessContent');
        const modal = document.getElementById('reportCompletenessModal');
        if (content) content.innerHTML = '<div class="loading-message">检查中...</div>';
        if (modal) modal.classList.remove('hidden');
        const result = await checkCareerCompleteness(id);
        if (!result.success || !result.data) {
            if (content) content.innerHTML = '<p class="hint-text">' + (result.msg || '检查失败') + '</p>';
            return;
        }
        const d = result.data;
        let html = `<div class="completeness-scores">
            <div class="completeness-score-item"><span class="score-label">完整度</span><span class="score-value">${d.completeness_score ?? '—'}%</span></div>
            <div class="completeness-score-item"><span class="score-label">质量</span><span class="score-value">${d.quality_score ?? '—'}%</span></div>
        </div>`;
        if (d.section_completeness && d.section_completeness.length) {
            html += `<h4>各章节完整度</h4><ul class="completeness-section-list">`;
            d.section_completeness.forEach(s => {
                const issues = (s.issues || []).length ? '<ul>' + (s.issues || []).map(i => `<li>${i}</li>`).join('') + '</ul>' : '';
                html += `<li><strong>${s.section}</strong> ${s.completeness}%${issues}</li>`;
            });
            html += `</ul>`;
        }
        if (d.suggestions && d.suggestions.length) {
            html += `<h4>改进建议</h4><ul class="completeness-suggestions">`;
            d.suggestions.forEach(s => html += `<li><span class="priority-${(s.priority || '').toLowerCase()}">${s.priority || ''}</span> ${s.suggestion}</li>`);
            html += `</ul>`;
        }
        if (d.strengths && d.strengths.length) {
            html += `<h4>报告亮点</h4><ul class="completeness-strengths">`;
            d.strengths.forEach(s => html += `<li>✓ ${s}</li>`);
            html += `</ul>`;
        }
        if (content) content.innerHTML = html;
    }

    // 编辑职业规划报告
    async editCareerReport(reportId) {
        this.openReportEditModal();
    }

    // AI润色职业规划报告
    async aiPolishCareerReport(reportId) {
        this.polishCareerReport();
    }

    // 导出职业规划报告
    async exportCareerReport(reportId) {
        const result = await exportCareerReport(reportId);
        if (result.success && result.data?.download_url) {
            this.showToast('报告导出成功，正在下载...', 'success');
            window.open(result.data.download_url, '_blank');
        } else {
            this.showToast(result.msg || '导出失败', 'error');
        }
    }

    // 7.3 打开编辑报告弹窗
    openReportEditModal() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        const data = this.currentReportData;
        const msgInput = document.getElementById('editMotivationalMsg');
        const deadlineInput = document.getElementById('editShortTermDeadline');
        const timeInput = document.getElementById('editTimeInvestment');
        if (msgInput) msgInput.value = (data?.summary?.motivational_message || '').slice(0, 500);
        if (deadlineInput) deadlineInput.value = data?.section_2_career_path?.short_term_goal?.specific_targets?.[0]?.deadline || '';
        if (timeInput) {
            const task = data?.section_3_action_plan?.short_term_plan?.monthly_plans?.[0]?.tasks?.[0];
            timeInput.value = (task && task['时间投入']) ? task['时间投入'] : '';
        }
        document.getElementById('reportEditModal')?.classList.remove('hidden');
    }
    
    // 测试agent功能
    testAgentFunctionality() {
        console.log('测试职业规划智能体功能');
        
        // 测试意图识别
        const testMessages = [
            '分析我的职业规划报告',
            '给我一些职业规划建议',
            '优化我的职业发展路径',
            '推荐我需要提升的技能',
            '更新我的职业规划报告'
        ];
        
        testMessages.forEach(message => {
            const intent = this.recognizeIntent(message);
            console.log(`消息: "${message}" -> 意图: ${intent.type}, 置信度: ${intent.confidence}`);
        });
        
        // 测试任务规划
        const testIntent = this.recognizeIntent('分析我的职业规划报告');
        const testTaskPlan = this.planTask(testIntent, '分析我的职业规划报告');
        console.log('测试任务规划:', testTaskPlan);
        
        console.log('职业规划智能体功能测试完成');
    }

    // 7.3 保存编辑
    async saveReportEdits() {
        const id = this.currentReportId;
        const userId = getCurrentUserId();
        if (!id || !userId) return this.showToast('请先登录', 'error');
        const edits = {};
        
        // 职业目标设置
        const careerGoal = document.getElementById('editCareerGoal')?.value?.trim();
        const workLocation = document.getElementById('editWorkLocation')?.value?.trim();
        const salaryExpectation = document.getElementById('editSalaryExpectation')?.value?.trim();
        const workLifeBalance = document.getElementById('editWorkLifeBalance')?.value?.trim();
        
        // 目标设置
        const shortTermGoal = document.getElementById('editShortTermGoal')?.value?.trim();
        const shortTermDeadline = document.getElementById('editShortTermDeadline')?.value?.trim();
        const midTermGoal = document.getElementById('editMidTermGoal')?.value?.trim();
        
        // 行动计划
        const shortTermPlan = document.getElementById('editShortTermPlan')?.value?.trim();
        const timeInvestment = document.getElementById('editTimeInvestment')?.value?.trim();
        
        // 报告内容
        const motivationalMsg = document.getElementById('editMotivationalMsg')?.value?.trim();
        const keyTakeaways = document.getElementById('editKeyTakeaways')?.value?.trim();
        
        // 映射到报告结构
        if (careerGoal) edits['section_1_job_matching.career_choice_advice.primary_recommendation'] = careerGoal;
        if (workLocation) edits['preferences.work_location'] = workLocation;
        if (salaryExpectation) edits['preferences.salary_expectation'] = salaryExpectation;
        if (workLifeBalance) edits['preferences.work_life_balance'] = workLifeBalance;
        
        if (shortTermGoal) edits['section_2_career_path.short_term_goal.primary_goal'] = shortTermGoal;
        if (shortTermDeadline) edits['section_2_career_path.short_term_goal.specific_targets[0].deadline'] = shortTermDeadline;
        if (midTermGoal) edits['section_2_career_path.mid_term_goal.primary_goal'] = midTermGoal;
        
        if (shortTermPlan) edits['section_3_action_plan.short_term_plan.goal'] = shortTermPlan;
        if (timeInvestment) edits['section_3_action_plan.short_term_plan.monthly_plans[0].tasks[0].时间投入'] = timeInvestment;
        
        if (motivationalMsg) edits['summary.motivational_message'] = motivationalMsg;
        if (keyTakeaways) edits['summary.key_takeaways'] = keyTakeaways.split('\n');
        
        if (Object.keys(edits).length === 0) return this.showToast('请填写需要修改的字段', 'info');
        const result = await editCareerReport(id, userId, edits);
        if (result.success) {
            document.getElementById('reportEditModal')?.classList.add('hidden');
            this.showToast('保存成功', 'success');
            this.loadReportContent(id);
        } else {
            this.showToast(result.msg || '保存失败', 'error');
        }
    }
    
    // 7.5 预览效果
    previewReportEdits() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        
        // 职业目标设置
        const careerGoal = document.getElementById('editCareerGoal')?.value?.trim();
        const workLocation = document.getElementById('editWorkLocation')?.value?.trim();
        const salaryExpectation = document.getElementById('editSalaryExpectation')?.value?.trim();
        const workLifeBalance = document.getElementById('editWorkLifeBalance')?.value?.trim();
        
        // 目标设置
        const shortTermGoal = document.getElementById('editShortTermGoal')?.value?.trim();
        const shortTermDeadline = document.getElementById('editShortTermDeadline')?.value?.trim();
        const midTermGoal = document.getElementById('editMidTermGoal')?.value?.trim();
        
        // 行动计划
        const shortTermPlan = document.getElementById('editShortTermPlan')?.value?.trim();
        const timeInvestment = document.getElementById('editTimeInvestment')?.value?.trim();
        
        // 报告内容
        const motivationalMsg = document.getElementById('editMotivationalMsg')?.value?.trim();
        const keyTakeaways = document.getElementById('editKeyTakeaways')?.value?.trim();
        
        // 创建报告数据的副本
        const previewReport = JSON.parse(JSON.stringify(this.currentReportData || {}));
        
        // 应用修改
        if (careerGoal) {
            previewReport.section_1_job_matching = previewReport.section_1_job_matching || {};
            previewReport.section_1_job_matching.career_choice_advice = previewReport.section_1_job_matching.career_choice_advice || {};
            previewReport.section_1_job_matching.career_choice_advice.primary_recommendation = careerGoal;
        }
        if (workLocation) {
            previewReport.preferences = previewReport.preferences || {};
            previewReport.preferences.work_location = workLocation;
        }
        if (salaryExpectation) {
            previewReport.preferences = previewReport.preferences || {};
            previewReport.preferences.salary_expectation = salaryExpectation;
        }
        if (workLifeBalance) {
            previewReport.preferences = previewReport.preferences || {};
            previewReport.preferences.work_life_balance = workLifeBalance;
        }
        
        if (shortTermGoal) {
            previewReport.section_2_career_path = previewReport.section_2_career_path || {};
            previewReport.section_2_career_path.short_term_goal = previewReport.section_2_career_path.short_term_goal || {};
            previewReport.section_2_career_path.short_term_goal.primary_goal = shortTermGoal;
        }
        if (shortTermDeadline) {
            previewReport.section_2_career_path = previewReport.section_2_career_path || {};
            previewReport.section_2_career_path.short_term_goal = previewReport.section_2_career_path.short_term_goal || {};
            previewReport.section_2_career_path.short_term_goal.specific_targets = previewReport.section_2_career_path.short_term_goal.specific_targets || [{}];
            previewReport.section_2_career_path.short_term_goal.specific_targets[0].deadline = shortTermDeadline;
        }
        if (midTermGoal) {
            previewReport.section_2_career_path = previewReport.section_2_career_path || {};
            previewReport.section_2_career_path.mid_term_goal = previewReport.section_2_career_path.mid_term_goal || {};
            previewReport.section_2_career_path.mid_term_goal.primary_goal = midTermGoal;
        }
        
        if (shortTermPlan) {
            previewReport.section_3_action_plan = previewReport.section_3_action_plan || {};
            previewReport.section_3_action_plan.short_term_plan = previewReport.section_3_action_plan.short_term_plan || {};
            previewReport.section_3_action_plan.short_term_plan.goal = shortTermPlan;
        }
        if (timeInvestment) {
            previewReport.section_3_action_plan = previewReport.section_3_action_plan || {};
            previewReport.section_3_action_plan.short_term_plan = previewReport.section_3_action_plan.short_term_plan || {};
            previewReport.section_3_action_plan.short_term_plan.monthly_plans = previewReport.section_3_action_plan.short_term_plan.monthly_plans || [{}];
            previewReport.section_3_action_plan.short_term_plan.monthly_plans[0].tasks = previewReport.section_3_action_plan.short_term_plan.monthly_plans[0].tasks || [{}];
            previewReport.section_3_action_plan.short_term_plan.monthly_plans[0].tasks[0]['时间投入'] = timeInvestment;
        }
        
        if (motivationalMsg) {
            previewReport.summary = previewReport.summary || {};
            previewReport.summary.motivational_message = motivationalMsg;
        }
        if (keyTakeaways) {
            previewReport.summary = previewReport.summary || {};
            previewReport.summary.key_takeaways = keyTakeaways.split('\n');
        }
        
        // 创建预览弹窗
        const previewModal = document.createElement('div');
        previewModal.id = 'previewModal';
        previewModal.className = 'modal';
        previewModal.style.display = 'block';
        previewModal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>预览效果</h2>
                    <button type="button" class="modal-close" id="closePreviewModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="previewContent" class="career-report-wrap"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(previewModal);
        
        // 渲染预览内容
        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            this.renderCareerReportContent(previewReport, previewContent);
        }
        
        // 关闭预览弹窗
        document.getElementById('closePreviewModal')?.addEventListener('click', () => {
            previewModal.remove();
        });
        
        // 点击弹窗外部关闭
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.remove();
            }
        });
    }

    // 7.4 AI 润色 - 提交后轮询刷新报告
    async polishCareerReport() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        this.showToast('AI 润色中，约 30 秒后完成...', 'info');
        const result = await polishCareerReport(id);
        if (!result.success) return this.showToast(result.msg || '润色提交失败', 'error');
        const userId = getCurrentUserId();
        setTimeout(async () => {
            this.showToast('正在刷新报告...', 'info');
            const r = await getCareerReport(userId, id);
            if (r.success && r.data && r.data.status === 'completed') {
                this.currentReportData = r.data;
                this.renderCareerReportContent(r.data);
                this.showToast('润色完成，报告已更新', 'success');
            }
        }, 30000);
    }
    
    // 打开智能体弹窗
    async openAgentModal() {
        document.getElementById('reportAgentModal').classList.remove('hidden');
        
        // 清空聊天记录
        const chatHistory = document.getElementById('agentChatHistory');
        if (chatHistory) {
            chatHistory.innerHTML = '';
        }
        
        // 主动初始化agent，分析当前报告状态并提供建议
        await this.initializeAgent();
        
        // 记录打开时间
        this.lastAgentOpenTime = Date.now();
    }
    
    // 关闭智能体弹窗
    closeAgentModal() {
        document.getElementById('reportAgentModal').classList.add('hidden');
        
        // 记录关闭时间
        this.lastAgentCloseTime = Date.now();
    }
    
    // 初始化agent，分析当前报告状态并提供建议
    async initializeAgent() {
        // 检查是否有当前报告
        if (!this.currentReportId || !this.currentReportData) {
            this.addMessageToChat('agent', '欢迎使用职业规划智能助手！我注意到你还没有加载职业规划报告。请先加载报告，我将为你提供个性化的职业规划建议。');
            return;
        }
        
        // 分析报告状态
        const reportStatus = this.analyzeReportStatus();
        
        // 生成主动建议
        const suggestions = this.generateProactiveSuggestions(reportStatus);
        
        // 显示主动建议
        this.addMessageToChat('agent', suggestions);
        
        // 检查是否需要显示其他主动内容
        // 只有在用户上次打开时间超过5分钟时才显示其他主动内容
        const timeSinceLastOpen = this.lastAgentOpenTime ? (Date.now() - this.lastAgentOpenTime) / 1000 / 60 : Infinity;
        if (timeSinceLastOpen > 5) {
            // 主动检查职业规划进度
            setTimeout(() => {
                this.checkCareerProgress();
            }, 2000);
            
            // 主动提供定期规划建议
            setTimeout(() => {
                this.provideRegularPlanningAdvice();
            }, 4000);
            
            // 主动分析职业市场趋势
            setTimeout(() => {
                this.analyzeJobMarketTrends();
            }, 6000);
        }
    }
    
    // 分析报告状态
    analyzeReportStatus() {
        const reportData = this.currentReportData;
        
        // 检查报告完整性
        const completeness = reportData.metadata?.completeness || 95;
        
        // 检查职业目标清晰度
        const careerGoalClear = !!reportData.section_1_job_matching?.career_choice_advice?.primary_recommendation;
        
        // 检查技能评估完整性
        const skillsComplete = !!reportData.section_1_job_matching?.recommended_careers?.length;
        
        // 检查发展路径合理性
        const pathReasonable = !!reportData.section_2_career_path?.short_term_goal;
        
        // 检查行动计划可行性
        const planFeasible = !!reportData.section_3_action_plan?.short_term_plan;
        
        return {
            completeness,
            careerGoalClear,
            skillsComplete,
            pathReasonable,
            planFeasible,
            hasInternship: true,
            hasProjects: true
        };
    }
    
    // 生成主动建议
    generateProactiveSuggestions(reportStatus) {
        const suggestions = [
            '👋 你好！我是你的职业规划智能助手，我已经分析了你的职业规划报告。',
            '',
            `📊 报告状态分析：`,
            `- 完整度：${reportStatus.completeness}%`,
            `- 职业目标：${reportStatus.careerGoalClear ? '清晰' : '需要明确'}`,
            `- 技能评估：${reportStatus.skillsComplete ? '完整' : '需要完善'}`,
            `- 发展路径：${reportStatus.pathReasonable ? '合理' : '需要优化'}`,
            `- 行动计划：${reportStatus.planFeasible ? '可行' : '需要细化'}`,
            `- 实习经历：${reportStatus.hasInternship ? '有' : '无'}`,
            `- 项目经验：${reportStatus.hasProjects ? '有' : '无'}`
        ];
        
        // 根据报告状态生成具体建议
        if (reportStatus.completeness < 70) {
            suggestions.push('');
            suggestions.push('💡 建议：');
            suggestions.push('1. 完善报告中的缺失部分，提高报告完整性');
            suggestions.push('2. 明确职业目标，使其更加具体可衡量');
            suggestions.push('3. 细化技能评估，列出具体的技能提升计划');
        }
        
        if (!reportStatus.careerGoalClear) {
            suggestions.push('');
            suggestions.push('🎯 职业目标建议：');
            suggestions.push('1. 明确你的长期职业目标');
            suggestions.push('2. 设定短期可实现的阶段性目标');
            suggestions.push('3. 考虑你的兴趣、技能和价值观');
        }
        
        if (!reportStatus.skillsComplete) {
            suggestions.push('');
            suggestions.push('📚 技能提升建议：');
            suggestions.push('1. 评估你的核心技能水平');
            suggestions.push('2. 识别需要提升的技能领域');
            suggestions.push('3. 制定具体的技能学习计划');
        }
        
        if (!reportStatus.pathReasonable) {
            suggestions.push('');
            suggestions.push('🛣️ 发展路径建议：');
            suggestions.push('1. 优化你的职业发展路径');
            suggestions.push('2. 设定合理的时间节点');
            suggestions.push('3. 考虑可能的职业转型机会');
        }
        
        if (!reportStatus.planFeasible) {
            suggestions.push('');
            suggestions.push('📋 行动计划建议：');
            suggestions.push('1. 制定详细的月度和周计划');
            suggestions.push('2. 设定具体的行动步骤');
            suggestions.push('3. 建立定期回顾和调整机制');
        }
        
        suggestions.push('');
        suggestions.push('我可以帮你执行以下任务：');
        suggestions.push('1. 分析职业规划报告的优势和不足');
        suggestions.push('2. 提供针对性的职业规划建议');
        suggestions.push('3. 优化你的职业发展路径');
        suggestions.push('4. 推荐你需要提升的技能');
        suggestions.push('5. 更新你的职业规划报告');
        suggestions.push('');
        suggestions.push('请告诉我你希望我帮你做什么？');
        
        return suggestions;
    }
    
    // 关闭智能体弹窗
    closeAgentModal() {
        document.getElementById('reportAgentModal').classList.add('hidden');
    }
    
    // 主动检查职业规划进度
    async checkCareerProgress() {
        // 检查是否有当前报告
        if (!this.currentReportId || !this.currentReportData) {
            return;
        }
        
        // 分析报告状态
        const reportStatus = this.analyzeReportStatus();
        
        // 检查是否需要提醒
        const shouldRemind = this.shouldRemindUser(reportStatus);
        
        if (shouldRemind) {
            const reminder = this.generateProgressReminder(reportStatus);
            this.addMessageToChat('agent', reminder);
        }
    }
    
    // 检查是否需要提醒用户
    shouldRemindUser(reportStatus) {
        // 基于报告状态判断是否需要提醒
        return (
            reportStatus.completeness < 70 ||
            !reportStatus.careerGoalClear ||
            !reportStatus.skillsComplete ||
            !reportStatus.pathReasonable ||
            !reportStatus.planFeasible ||
            !reportStatus.hasInternship ||
            !reportStatus.hasProjects
        );
    }
    
    // 生成进度提醒
    generateProgressReminder(reportStatus) {
        const reminders = [
            '⏰ 职业规划进度提醒：',
            ''
        ];
        
        if (reportStatus.completeness < 70) {
            reminders.push(`- 报告完整度较低（${reportStatus.completeness}%），建议完善报告内容`);
        }
        
        if (!reportStatus.careerGoalClear) {
            reminders.push('- 职业目标不够明确，建议进一步明确你的职业方向');
        }
        
        if (!reportStatus.skillsComplete) {
            reminders.push('- 技能评估不够完整，建议详细评估你的技能水平');
        }
        
        if (!reportStatus.pathReasonable) {
            reminders.push('- 职业发展路径需要优化，建议调整你的发展计划');
        }
        
        if (!reportStatus.planFeasible) {
            reminders.push('- 行动计划不够可行，建议制定更具体的执行步骤');
        }
        
        if (!reportStatus.hasInternship) {
            reminders.push('- 缺少实习经历，建议寻找相关实习机会');
        }
        
        if (!reportStatus.hasProjects) {
            reminders.push('- 缺少项目经验，建议参与相关项目提升实践能力');
        }
        
        reminders.push('');
        reminders.push('我可以帮你解决这些问题，你希望我优先处理哪一项？');
        
        return reminders;
    }
    
    // 主动提供定期规划建议
    provideRegularPlanningAdvice() {
        const advice = [
            '📅 定期职业规划建议：',
            '',
            '为了保持职业发展的动力和方向，建议你：',
            '',
            '1. 每周回顾：每周花15分钟回顾本周的职业发展进展',
            '2. 每月评估：每月评估一次你的职业目标和行动计划',
            '3. 季度调整：每季度调整一次你的职业规划，适应变化',
            '4. 年度总结：每年做一次全面的职业发展总结和规划'
        ];
        
        this.addMessageToChat('agent', advice);
    }
    
    // 主动分析职业市场趋势
    async analyzeJobMarketTrends() {
        // 模拟分析职业市场趋势
        const trends = [
            '📈 职业市场趋势分析：',
            '',
            '根据最新的职业市场数据，以下是相关行业的发展趋势：',
            '',
            '1. 数字化转型加速：各行业对数字化人才的需求持续增长',
            '2. 技能更新周期缩短：技术技能的更新周期从3-5年缩短到1-2年',
            '3. 远程工作常态化：混合办公模式成为主流',
            '4. 软技能价值提升：沟通、协作、适应性等软技能变得更加重要',
            '5. 新兴职业涌现：AI、可再生能源、数字健康等领域出现新职业',
            '',
            '这些趋势对你的职业规划有什么影响？你希望我为你分析哪个趋势的具体影响？'
        ];
        
        this.addMessageToChat('agent', trends);
    }
    
    // 发送消息给智能体
    async sendAgentMessage() {
        const input = document.getElementById('agentChatInput');
        const message = input.value.trim();
        if (!message) return;
        
        // 添加用户消息到聊天记录
        this.addMessageToChat('user', message);
        input.value = '';
        
        // 显示正在输入状态
        this.showTypingIndicator();
        
        try {
            // 1. 意图识别
            const intent = this.recognizeIntent(message);
            console.log('识别到的意图:', intent);
            
            // 2. 任务规划
            const taskPlan = this.planTask(intent, message);
            console.log('任务规划:', taskPlan);
            
            // 3. 任务执行
            const result = await this.executeTask(taskPlan);
            
            this.removeTypingIndicator();
            this.addMessageToChat('agent', result);
        } catch (error) {
            console.error('智能体执行错误:', error);
            this.removeTypingIndicator();
            this.addMessageToChat('agent', '执行任务时发生错误，请稍后再试。');
        }
    }
    
    // 任务规划
    planTask(intent, message) {
        const taskPlan = {
            intent: intent.type,
            confidence: intent.confidence,
            params: intent.params,
            steps: [],
            estimatedTime: 0
        };
        
        switch (intent.type) {
            case 'analyze_report':
                taskPlan.steps = [
                    { id: 1, name: '获取报告数据', description: '获取当前职业规划报告的详细数据' },
                    { id: 2, name: '分析报告内容', description: '分析报告的优势和不足' },
                    { id: 3, name: '生成分析结果', description: '生成详细的分析结果和建议' }
                ];
                taskPlan.estimatedTime = 3000;
                break;
                
            case 'analyze_trend':
                taskPlan.steps = [
                    { id: 1, name: '识别趋势', description: '识别用户需要分析的具体趋势' },
                    { id: 2, name: '收集趋势数据', description: '收集关于该趋势的详细信息和数据' },
                    { id: 3, name: '分析影响', description: '分析该趋势对用户职业规划的影响' },
                    { id: 4, name: '生成建议', description: '生成应对该趋势的具体建议' }
                ];
                taskPlan.estimatedTime = 4000;
                break;
                
            case 'get_suggestions':
                taskPlan.steps = [
                    { id: 1, name: '分析用户需求', description: '分析用户的具体需求和关注点' },
                    { id: 2, name: '收集相关信息', description: '收集与用户需求相关的职业规划信息' },
                    { id: 3, name: '生成个性化建议', description: '根据用户需求生成个性化的职业规划建议' }
                ];
                taskPlan.estimatedTime = 4000;
                break;
                
            case 'optimize_path':
                taskPlan.steps = [
                    { id: 1, name: '分析当前路径', description: '分析用户当前的职业发展路径' },
                    { id: 2, name: '识别优化机会', description: '识别职业发展路径中的优化机会' },
                    { id: 3, name: '生成优化方案', description: '生成详细的职业发展路径优化方案' }
                ];
                taskPlan.estimatedTime = 5000;
                break;
                
            case 'skill_recommendation':
                taskPlan.steps = [
                    { id: 1, name: '分析技能现状', description: '分析用户当前的技能水平和结构' },
                    { id: 2, name: '识别技能差距', description: '识别用户与目标职业之间的技能差距' },
                    { id: 3, name: '推荐技能提升', description: '推荐用户需要提升的技能和学习资源' }
                ];
                taskPlan.estimatedTime = 4500;
                break;
                
            case 'report_update':
                taskPlan.steps = [
                    { id: 1, name: '分析报告现状', description: '分析当前职业规划报告的状态和内容' },
                    { id: 2, name: '收集更新信息', description: '收集需要更新的信息和数据' },
                    { id: 3, name: '执行报告更新', description: '更新职业规划报告的内容' },
                    { id: 4, name: '验证更新结果', description: '验证报告更新的结果和完整性' }
                ];
                taskPlan.estimatedTime = 6000;
                break;
                
            default:
                taskPlan.steps = [
                    { id: 1, name: '理解用户问题', description: '理解用户的具体问题和需求' },
                    { id: 2, name: '生成响应', description: '生成针对用户问题的响应' }
                ];
                taskPlan.estimatedTime = 2000;
        }
        
        return taskPlan;
    }
    
    // 任务执行
    async executeTask(taskPlan) {
        // 显示任务执行进度
        this.showTaskExecutionProgress(taskPlan);
        
        // 执行任务步骤
        let result;
        
        try {
            switch (taskPlan.intent) {
                case 'analyze_report':
                    result = await this.analyzeCareerReport();
                    break;
                    
                case 'analyze_trend':
                    result = await this.analyzeTrend(taskPlan.params);
                    break;
                    
                case 'get_suggestions':
                    result = await this.getCareerSuggestions(taskPlan.params);
                    break;
                    
                case 'optimize_path':
                    result = await this.optimizeCareerPath();
                    break;
                    
                case 'skill_recommendation':
                    result = await this.getSkillRecommendations();
                    break;
                    
                case 'report_update':
                    result = await this.updateCareerReport(taskPlan.params);
                    break;
                    
                default:
                    result = this.getGeneralResponse(taskPlan.params?.message || '');
            }
            
            return result;
        } catch (error) {
            console.error('任务执行错误:', error);
            return '执行任务时发生错误，请稍后再试。';
        }
    }
    
    // 分析职业市场趋势
    async analyzeTrend(params) {
        // 模拟工具调用：分析职业市场趋势
        console.log('工具调用：分析职业市场趋势', params);
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟异步操作
        
        const trendId = params.trend_id || '1';
        let trendAnalysis;
        
        switch (trendId) {
            case '1':
                trendAnalysis = {
                    title: '数字化转型加速',
                    description: '各行业对数字化人才的需求持续增长',
                    impact: [
                        '数字化技能成为职场必备能力',
                        '传统岗位面临转型压力',
                        '数字经济领域就业机会增加',
                        '远程工作和灵活办公模式普及'
                    ],
                    suggestions: [
                        '提升数字化技能，如数据分析、数字营销等',
                        '关注行业数字化转型趋势',
                        '学习使用数字化工具和平台',
                        '培养数字思维和创新能力'
                    ],
                    skills: ['数据分析', '数字营销', '云计算', '人工智能基础']
                };
                break;
            case '2':
                trendAnalysis = {
                    title: '技能更新周期缩短',
                    description: '技术技能的更新周期从3-5年缩短到1-2年',
                    impact: [
                        '持续学习成为职场常态',
                        '技能快速迭代，需要保持学习敏锐度',
                        '终身学习能力成为核心竞争力',
                        '跨领域技能组合更受青睐'
                    ],
                    suggestions: [
                        '建立持续学习习惯，定期更新技能',
                        '关注行业前沿技术和趋势',
                        '培养快速学习能力',
                        '构建多元化技能组合'
                    ],
                    skills: ['快速学习', '知识管理', '跨领域整合', '自主学习']
                };
                break;
            case '3':
                trendAnalysis = {
                    title: '远程工作常态化',
                    description: '混合办公模式成为主流',
                    impact: [
                        '工作方式更加灵活多样',
                        '地理限制减少，就业机会增加',
                        '工作与生活平衡成为关注焦点',
                        '远程协作能力成为必备技能'
                    ],
                    suggestions: [
                        '提升远程协作和沟通能力',
                        '建立高效的远程工作习惯',
                        '熟悉远程办公工具和平台',
                        '培养自我管理和时间管理能力'
                    ],
                    skills: ['远程协作', '时间管理', '自我驱动', '数字沟通']
                };
                break;
            case '4':
                trendAnalysis = {
                    title: '软技能价值提升',
                    description: '沟通、协作、适应性等软技能变得更加重要',
                    impact: [
                        '软技能成为职场核心竞争力',
                        '技术与软技能结合更受青睐',
                        '团队协作和领导力需求增加',
                        '情商(EQ)在职业发展中的作用凸显'
                    ],
                    suggestions: [
                        '提升沟通和表达能力',
                        '培养团队协作和领导力',
                        '增强情绪管理和人际关系处理能力',
                        '提升问题解决和批判性思维能力'
                    ],
                    skills: ['沟通表达', '团队协作', '领导力', '问题解决']
                };
                break;
            case '5':
                trendAnalysis = {
                    title: '新兴职业涌现',
                    description: 'AI、可再生能源、数字健康等领域出现新职业',
                    impact: [
                        '就业市场更加多元化',
                        '新兴领域人才需求旺盛',
                        '跨学科背景人才更具优势',
                        '职业发展路径更加灵活多样'
                    ],
                    suggestions: [
                        '关注新兴领域发展动态',
                        '培养跨学科思维和能力',
                        '保持职业灵活性和适应性',
                        '探索新兴领域的职业机会'
                    ],
                    skills: ['跨学科思维', '创新能力', '适应性', '行业洞察力']
                };
                break;
            default:
                trendAnalysis = {
                    title: '数字化转型加速',
                    description: '各行业对数字化人才的需求持续增长',
                    impact: [
                        '数字化技能成为职场必备能力',
                        '传统岗位面临转型压力',
                        '数字经济领域就业机会增加',
                        '远程工作和灵活办公模式普及'
                    ],
                    suggestions: [
                        '提升数字化技能，如数据分析、数字营销等',
                        '关注行业数字化转型趋势',
                        '学习使用数字化工具和平台',
                        '培养数字思维和创新能力'
                    ],
                    skills: ['数据分析', '数字营销', '云计算', '人工智能基础']
                };
        }
        
        // 获取用户的具体信息
        const userInfo = this.getCurrentUserInfo();
        
        // 生成个性化的可实行计划
        const personalizedPlan = this.generatePersonalizedPlan(trendAnalysis, userInfo);
        
        return {
            type: 'trend_analysis_result',
            content: [
                `📈 趋势${trendId}分析：${trendAnalysis.title}`,
                '',
                '趋势描述：',
                trendAnalysis.description,
                '',
                '对职业规划的影响：',
                ...trendAnalysis.impact.map(item => `- ${item}`),
                '',
                '应对建议：',
                ...trendAnalysis.suggestions.map(item => `- ${item}`),
                '',
                '推荐提升技能：',
                ...trendAnalysis.skills.map(item => `- ${item}`),
                '',
                '个性化可实行计划：',
                ...personalizedPlan
            ]
        };
    }
    
    // 获取用户的具体信息
    getCurrentUserInfo() {
        const reportData = this.currentReportData;
        if (!reportData) {
            return {
                careerGoal: '未设置',
                skills: [],
                experience: '无',
                education: '无'
            };
        }
        
        // 从报告数据中提取用户信息
        const careerGoal = reportData.section_1_job_matching?.career_choice_advice?.primary_recommendation || '未设置';
        const skills = reportData.section_1_job_matching?.recommended_careers?.[0]?.match_analysis?.capability_match?.professional_skills?.description || '';
        const experience = reportData.section_1_job_matching?.self_assessment?.strengths || [];
        const education = '大学学历'; // 假设用户有大学学历
        
        return {
            careerGoal,
            skills,
            experience,
            education
        };
    }
    
    // 生成个性化的可实行计划
    generatePersonalizedPlan(trendAnalysis, userInfo) {
        const plan = [];
        
        // 基于用户的职业目标生成计划
        plan.push(`1. 基于你的职业目标（${userInfo.careerGoal}），制定以下计划：`);
        
        // 短期计划（1-3个月）
        plan.push('');
        plan.push('短期计划（1-3个月）：');
        switch (trendAnalysis.title) {
            case '数字化转型加速':
                plan.push('- 选择1-2个数字化技能（如数据分析或数字营销）开始学习');
                plan.push('- 每周花5-10小时学习相关技能');
                plan.push('- 寻找数字化项目实践机会');
                break;
            case '技能更新周期缩短':
                plan.push('- 建立每周学习计划，固定时间学习新技能');
                plan.push('- 关注行业前沿技术博客和公众号');
                plan.push('- 参加1-2个线上技术研讨会');
                break;
            case '远程工作常态化':
                plan.push('- 熟悉1-2个远程协作工具（如Zoom、飞书）');
                plan.push('- 建立个人远程工作时间管理体系');
                plan.push('- 尝试参与远程项目或兼职');
                break;
            case '软技能价值提升':
                plan.push('- 参加沟通技巧培训或阅读相关书籍');
                plan.push('- 主动参与团队协作项目，锻炼团队合作能力');
                plan.push('- 学习基础的领导力知识');
                break;
            case '新兴职业涌现':
                plan.push('- 调研与你专业相关的新兴职业');
                plan.push('- 参加新兴领域的线上讲座或研讨会');
                plan.push('- 尝试学习新兴领域的基础知识');
                break;
        }
        
        // 中期计划（3-6个月）
        plan.push('');
        plan.push('中期计划（3-6个月）：');
        switch (trendAnalysis.title) {
            case '数字化转型加速':
                plan.push('- 完成至少一个数字化技能的系统学习');
                plan.push('- 构建数字化技能作品集');
                plan.push('- 开始投递数字化相关岗位');
                break;
            case '技能更新周期缩短':
                plan.push('- 掌握2-3个行业前沿技术');
                plan.push('- 建立个人知识管理系统');
                plan.push('- 开始分享学习心得，建立个人品牌');
                break;
            case '远程工作常态化':
                plan.push('- 完全适应远程工作模式');
                plan.push('- 拓展远程工作网络');
                plan.push('- 提升远程工作效率，建立个人工作方法论');
                break;
            case '软技能价值提升':
                plan.push('- 成为团队中的沟通协调者');
                plan.push('- 开始带领小型项目或团队');
                plan.push('- 建立良好的职场人际关系网络');
                break;
            case '新兴职业涌现':
                plan.push('- 确定1-2个感兴趣的新兴职业方向');
                plan.push('- 深入学习相关领域知识');
                plan.push('- 寻找新兴领域的实习或项目机会');
                break;
        }
        
        // 长期计划（6-12个月）
        plan.push('');
        plan.push('长期计划（6-12个月）：');
        switch (trendAnalysis.title) {
            case '数字化转型加速':
                plan.push('- 成为所在领域的数字化专家');
                plan.push('- 参与大型数字化转型项目');
                plan.push('- 建立数字化领域的专业网络');
                break;
            case '技能更新周期缩短':
                plan.push('- 形成持续学习的习惯和方法论');
                plan.push('- 成为团队中的技术领导者');
                plan.push('- 影响团队的学习文化');
                break;
            case '远程工作常态化':
                plan.push('- 实现工作地点自由选择');
                plan.push('- 建立全球范围内的专业网络');
                plan.push('- 提升远程团队管理能力');
                break;
            case '软技能价值提升':
                plan.push('- 成为团队或部门的领导者');
                plan.push('- 建立个人影响力和领导力品牌');
                plan.push('- 开始指导和培养他人');
                break;
            case '新兴职业涌现':
                plan.push('- 成功转型到新兴职业领域');
                plan.push('- 成为新兴领域的早期从业者');
                plan.push('- 建立在新兴领域的专业影响力');
                break;
        }
        
        return plan;
    }
    
    // 显示任务执行进度
    showTaskExecutionProgress(taskPlan) {
        // 在控制台显示任务执行进度
        console.log('开始执行任务:', taskPlan.intent);
        console.log('预计执行时间:', taskPlan.estimatedTime, 'ms');
        console.log('执行步骤:');
        taskPlan.steps.forEach(step => {
            console.log(`- ${step.id}. ${step.name}: ${step.description}`);
        });
        
        // 可以在这里添加UI进度显示
    }
    
    // 添加消息到聊天记录
    addMessageToChat(sender, content) {
        const chatHistory = document.getElementById('agentChatHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message' : 'agent-message';
        
        const avatar = sender === 'user' ? '👤' : '🎯';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${this.formatMessageContent(content)}
            </div>
        `;
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // 格式化消息内容
    formatMessageContent(content) {
        // 处理字符串内容，确保正确编码
        if (typeof content === 'string') {
            // 移除*符号 + HTML编码防乱码
            const cleaned = content.replace(/\*/g, '');
            return `<p>${this.htmlEncode(cleaned)}</p>`;
        } else if (Array.isArray(content)) {
            return `<ul>${content.map(item => {
                const s = typeof item === 'string' ? item.replace(/\*/g, '') : String(item);
                return `<li>${this.htmlEncode(s)}</li>`;
            }).join('')}</ul>`;
        } else if (typeof content === 'object' && content !== null) {
            if (content.content) {
                if (Array.isArray(content.content)) {
                    return `<ul>${content.content.map(item => {
                        const s = typeof item === 'string' ? item.replace(/\*/g, '') : String(item);
                        return `<li>${this.htmlEncode(s)}</li>`;
                    }).join('')}</ul>`;
                } else {
                    const s = String(content.content).replace(/\*/g, '');
                    return `<p>${this.htmlEncode(s)}</p>`;
                }
            } else {
                return `<p>${this.htmlEncode(JSON.stringify(content))}</p>`;
            }
        } else {
            return `<p>${this.htmlEncode(String(content))}</p>`;
        }
    }
    
    // HTML编码函数，防止乱码
    htmlEncode(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // 显示正在输入状态
    showTypingIndicator() {
        const chatHistory = document.getElementById('agentChatHistory');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'agent-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">🎯</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatHistory.appendChild(typingDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // 移除正在输入状态
    removeTypingIndicator() {
        const typingDiv = document.getElementById('typingIndicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }
    
    // 处理快捷操作
    handleQuickAction(action) {
        const actions = {
            analyze: '请分析我的职业规划报告，指出优势和不足',
            improve: '请提供针对性的改进建议',
            path: '请优化我的职业发展路径',
            skills: '请推荐我需要提升的技能'
        };
        
        const message = actions[action];
        if (message) {
            const input = document.getElementById('agentChatInput');
            input.value = message;
            this.sendAgentMessage();
        }
    }
    
    // 意图识别
    recognizeIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // 意图识别逻辑
        if (lowerMessage.includes('分析') && lowerMessage.includes('报告')) {
            return {
                type: 'analyze_report',
                confidence: 0.95,
                params: {
                    report_id: this.currentReportId
                }
            };
        } else if (lowerMessage.includes('分析') && lowerMessage.includes('趋势')) {
            return {
                type: 'analyze_trend',
                confidence: 0.9,
                params: {
                    trend_id: lowerMessage.match(/趋势(\d+)/)?.[1] || '1'
                }
            };
        } else if (lowerMessage.includes('优化') || lowerMessage.includes('建议')) {
            return {
                type: 'get_suggestions',
                confidence: 0.9,
                params: {
                    focus_areas: []
                }
            };
        } else if (lowerMessage.includes('职业') && lowerMessage.includes('路径')) {
            return {
                type: 'optimize_path',
                confidence: 0.85,
                params: {}
            };
        } else if (lowerMessage.includes('技能') && lowerMessage.includes('提升')) {
            return {
                type: 'skill_recommendation',
                confidence: 0.8,
                params: {}
            };
        } else if (lowerMessage.includes('更新') && lowerMessage.includes('报告')) {
            return {
                type: 'report_update',
                confidence: 0.75,
                params: {
                    update_type: 'full'
                }
            };
        } else {
            return {
                type: 'general_inquiry',
                confidence: 0.5,
                params: {
                    message: message
                }
            };
        }
    }
    
    // 分析职业规划报告
    async analyzeCareerReport() {
        // 模拟工具调用：分析当前职业规划报告
        console.log('工具调用：分析职业规划报告');
        
        // 1. 获取当前报告数据
        const reportData = this.currentReportData;
        if (!reportData) {
            return '未找到当前职业规划报告，请先加载报告。';
        }
        
        // 2. 执行分析
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟异步操作
        
        // 3. 基于报告数据生成个性化分析结果
        const strengths = this.identifyReportStrengths(reportData);
        const weaknesses = this.identifyReportWeaknesses(reportData);
        const suggestions = this.generateReportSuggestions(reportData);
        
        // 4. 生成分析结果
        return {
            type: 'analysis_result',
            content: [
                '📊 职业规划报告分析结果：',
                '',
                '优势分析：',
                ...strengths,
                '',
                '改进空间：',
                ...weaknesses,
                '',
                '建议下一步：',
                ...suggestions
            ]
        };
    }
    
    // 识别报告优势
    identifyReportStrengths(reportData) {
        const strengths = [];
        
        if (reportData.section_1_job_matching?.career_choice_advice?.primary_recommendation) {
            strengths.push('- 职业目标明确，符合个人兴趣和能力');
        }
        
        if (reportData.section_1_job_matching?.recommended_careers?.length) {
            strengths.push('- 技能评估全面，涵盖专业和软技能');
        }
        
        if (reportData.section_2_career_path?.short_term_goal) {
            strengths.push('- 发展路径合理，阶段性目标清晰');
        }
        
        if (reportData.section_3_action_plan?.short_term_plan) {
            strengths.push('- 行动计划具体，可操作性强');
        }
        
        if (strengths.length === 0) {
            strengths.push('- 正在积极构建职业规划，逐步完善各项内容');
        }
        
        return strengths;
    }
    
    // 识别报告不足
    identifyReportWeaknesses(reportData) {
        const weaknesses = [];
        
        if (!reportData.section_1_job_matching?.career_choice_advice?.primary_recommendation) {
            weaknesses.push('- 职业目标不够明确，需要进一步清晰化');
        }
        
        if (!reportData.section_1_job_matching?.recommended_careers?.length) {
            weaknesses.push('- 技能评估不够全面，需要详细评估');
        }
        
        if (!reportData.section_2_career_path?.short_term_goal) {
            weaknesses.push('- 发展路径不够合理，需要优化调整');
        }
        
        if (!reportData.section_3_action_plan?.short_term_plan) {
            weaknesses.push('- 行动计划不够具体，可操作性不强');
        }
        
        if (weaknesses.length === 0) {
            weaknesses.push('- 报告整体质量良好，可进一步细化和完善');
        }
        
        return weaknesses;
    }
    
    // 生成报告建议
    generateReportSuggestions(reportData) {
        const suggestions = [];
        
        if (!reportData.section_1_job_matching?.career_choice_advice?.primary_recommendation) {
            suggestions.push('- 明确职业目标，考虑个人兴趣、能力和价值观');
        }
        
        if (!reportData.section_1_job_matching?.recommended_careers?.length) {
            suggestions.push('- 详细评估各项技能水平，识别优势和不足');
        }
        
        if (!reportData.section_2_career_path?.short_term_goal) {
            suggestions.push('- 制定合理的职业发展路径，设定阶段性目标');
        }
        
        if (!reportData.section_3_action_plan?.short_term_plan) {
            suggestions.push('- 制定具体的行动计划，增加可操作性');
        }
        
        suggestions.push('- 定期回顾和调整职业规划，适应变化');
        suggestions.push('- 关注行业趋势，了解最新发展动态');
        suggestions.push('- 建立专业网络，增加行业联系');
        
        return suggestions;
    }
    
    // 获取职业规划建议
    async getCareerSuggestions(params) {
        // 模拟工具调用：获取职业规划建议
        console.log('工具调用：获取职业规划建议', params);
        
        await new Promise(resolve => setTimeout(resolve, 1200)); // 模拟异步操作
        
        return {
            type: 'suggestions_result',
            content: [
                '💡 针对性职业规划建议：',
                '',
                '短期建议（3-6个月）：',
                '1. 制定详细的月度目标和周计划',
                '2. 为每个技能提升项设定具体的学习计划',
                '3. 开始构建专业网络，参加行业活动',
                '4. 建立定期回顾机制，每月评估进展',
                '',
                '中期建议（6-12个月）：',
                '1. 寻求相关实习或项目经验',
                '2. 考取相关专业证书',
                '3. 建立个人品牌，如博客或作品集',
                '4. 拓展行业人脉，寻找导师',
                '',
                '长期建议（1-3年）：',
                '1. 明确职业晋升路径',
                '2. 发展领导力和管理能力',
                '3. 持续关注行业趋势和技术发展',
                '4. 建立个人专业影响力'
            ]
        };
    }
    
    // 优化职业发展路径
    async optimizeCareerPath() {
        // 模拟工具调用：优化职业发展路径
        console.log('工具调用：优化职业发展路径');
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟异步操作
        
        return {
            type: 'path_optimization_result',
            content: [
                '🎯 优化后的职业发展路径：',
                '',
                '阶段一：基础积累期（1-2年）',
                '- 目标：掌握核心技能，积累项目经验',
                '- 行动：',
                '  - 完成入门级职位，熟悉行业流程',
                '  - 持续学习专业技能，考取相关证书',
                '  - 参与多个项目，积累实战经验',
                '  - 建立专业网络，拓展人脉',
                '',
                '阶段二：能力提升期（2-4年）',
                '- 目标：成为领域专家，开始承担更多责任',
                '- 行动：',
                '  - 晋升到中级职位，负责更复杂的项目',
                '  - 深化专业知识，成为某个领域的专家',
                '  - 开始带领小型团队，发展领导力',
                '  - 建立个人品牌，分享专业知识',
                '',
                '阶段三：职业突破期（4-6年）',
                '- 目标：进入管理层或成为高级专家',
                '- 行动：',
                '  - 晋升到高级职位或管理层',
                '  - 负责战略规划和团队管理',
                '  - 拓展行业影响力，参与行业活动',
                '  - 持续创新，推动业务发展',
                '',
                '阶段四：事业稳定期（6年以上）',
                '- 目标：巩固地位，追求更大成就',
                '- 行动：',
                '  - 成为行业权威或高层管理者',
                '  - 指导和培养下一代人才',
                '  - 参与行业标准制定',
                '  - 考虑创业或顾问角色'
            ]
        };
    }
    
    // 获取技能提升建议
    async getSkillRecommendations() {
        // 模拟工具调用：获取技能提升建议
        console.log('工具调用：获取技能提升建议');
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟异步操作
        
        return {
            type: 'skill_recommendation_result',
            content: [
                '📚 个性化技能提升建议：',
                '',
                '核心专业技能：',
                '1. 行业知识：深入了解行业发展趋势、商业模式和竞争格局',
                '2. 技术能力：掌握行业核心技术，保持技术敏感性',
                '3. 专业认证：考取行业认可的专业证书，提升竞争力',
                '',
                '关键软技能：',
                '1. 沟通能力：提升书面和口头表达能力，学会有效沟通',
                '2. 领导力：培养团队管理能力，学会激励和指导他人',
                '3. 问题解决：提升分析和解决复杂问题的能力',
                '4. 时间管理：学会优先级排序，提高工作效率',
                '',
                '必备工具技能：',
                '1. 数据分析：掌握数据分析工具，如Excel、Python等',
                '2. 项目管理：熟悉项目管理方法和工具，如敏捷、Scrum等',
                '3. 数字化工具：掌握行业相关的数字化工具和平台',
                '',
                '学习资源推荐：',
                '- 在线课程平台：Coursera、Udemy、 LinkedIn Learning',
                '- 行业书籍和白皮书',
                '- 行业会议和研讨会',
                '- 专业社区和论坛'
            ]
        };
    }
    
    // 更新职业规划报告
    async updateCareerReport(params) {
        // 模拟工具调用：更新职业规划报告
        console.log('工具调用：更新职业规划报告', params);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟异步操作
        
        return {
            type: 'report_update_result',
            content: [
                '🔄 职业规划报告更新结果：',
                '',
                '更新内容：',
                '- 职业目标：根据最新市场趋势进行了调整',
                '- 技能评估：更新了技能水平和提升计划',
                '- 发展路径：优化了各阶段目标和时间节点',
                '- 行动计划：增加了具体的学习资源和网络拓展建议',
                '',
                '更新状态：已完成',
                '',
                '建议：',
                '1. 查看更新后的报告，确认所有内容符合你的期望',
                '2. 按照新的行动计划开始执行',
                '3. 定期回顾和调整职业规划'
            ]
        };
    }
    
    // 获取通用响应
    getGeneralResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
            return '你好！我是你的职业规划智能助手，有什么可以帮你的吗？';
        } else if (lowerMessage.includes('谢谢') || lowerMessage.includes('thank')) {
            return '不客气！如果你有任何关于职业规划的问题，随时告诉我。';
        } else {
            return '感谢你的问题。作为你的职业规划智能助手，我可以帮你：\n1. 分析职业规划报告\n2. 提供针对性建议\n3. 优化职业发展路径\n4. 推荐技能提升方向\n请告诉我你具体需要什么帮助？';
        }
    }

    // 7.5 导出职业规划报告（支持 PDF/Word）
    async exportCareerReport() {
        const id = this.currentReportId;
        if (!id) return this.showToast('暂无报告', 'error');
        
        // 检查报告内容是否存在
        const reportContent = document.getElementById('reportContent');
        if (!reportContent || reportContent.innerHTML.includes('加载中') || reportContent.innerHTML.includes('暂无报告')) {
            return this.showToast('报告内容未加载完成，请稍后再试', 'error');
        }
        
        this.showToast('正在生成导出文件，请稍候...', 'info');
        
        try {
            // 直接导出为PDF格式
            await this.exportToPDF(id);
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast('导出失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    // 导出为PDF
    async exportToPDF(reportId) {
        const { jsPDF } = window.jspdf;
        const reportContent = document.getElementById('reportContent');
        
        // 克隆内容以避免修改原始DOM
        const contentClone = reportContent.cloneNode(true);
        
        // 设置克隆内容的样式
        contentClone.style.width = '1000px';
        contentClone.style.maxWidth = '1000px';
        contentClone.style.padding = '20px';
        contentClone.style.backgroundColor = '#fff';
        contentClone.style.color = '#000';
        
        // 将克隆内容添加到页面
        document.body.appendChild(contentClone);
        
        try {
            // 使用html2canvas将内容转换为图片
            const canvas = await html2canvas(contentClone, {
                scale: 2, // 提高清晰度
                useCORS: true,
                logging: false,
                letterRendering: true
            });
            
            // 创建PDF文档
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // 计算图片在PDF中的尺寸
            const imgWidth = 210; // A4宽度
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            // 添加图片到PDF
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, imgWidth, imgHeight);
            
            // 保存PDF文件
            const filename = `career_report_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            this.showToast('PDF导出成功', 'success');
        } finally {
            // 移除克隆内容
            document.body.removeChild(contentClone);
        }
    }
    
    // 导出为Word
    exportToWord(reportId) {
        const reportContent = document.getElementById('reportContent');
        
        // 提取报告内容
        const reportHtml = reportContent.innerHTML;
        
        // 使用Turndown将HTML转换为Markdown
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(reportHtml);
        
        // 创建Word文档内容
        const content = `# 职业规划报告\n\n${markdown}`;
        
        // 创建Blob对象
        const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        
        // 保存Word文件
        const filename = `career_report_${reportId}_${new Date().toISOString().split('T')[0]}.docx`;
        saveAs(blob, filename);
        
        this.showToast('Word导出成功', 'success');
    }

    // 加载测评报告内容（职业规划报告页的历史列表若展示测评报告时可复用；主入口已改为 showAssessmentReportOnAssessmentPage）
    async loadAssessmentReportContent(reportId) {
        const contentDiv = document.getElementById('reportContent');
        if (!contentDiv) return;
        contentDiv.innerHTML = '<div class="loading-message">加载报告内容中...</div>';
        const userId = getCurrentUserId();
        if (!userId) {
            contentDiv.innerHTML = '<div class="hint-text">请先登录</div>';
            return;
        }
        const result = await getAssessmentReport(userId, reportId);
        if (result.success && result.data && result.data.status === 'completed') {
            this.currentReportId = reportId;
            this.renderReportContent(result.data, contentDiv);
        } else {
            contentDiv.innerHTML = '<div class="hint-text">加载失败</div>';
        }
    }

    // 渲染报告内容
    // 格式化时间：只显示到日为止（YYYY-MM-DD），不显示时分秒
    formatDateTime(dateString) {
        if (!dateString) return '未知时间';
        try {
            const date = new Date(dateString);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        } catch (e) {
            return dateString;
        }
    }

    renderReportContent(data, targetContainer) {
        const contentDiv = targetContainer || document.getElementById('assessmentReportContent');
        if (!contentDiv) return;
        const genTime = this.formatDateTime(data.created_at || data.assessment_date);
        const interest = data.interest_analysis || {};
        const primary = interest.primary_interest || {};
        const dist = interest.interest_distribution || [];
        const fields = interest.suitable_fields || [];
        const personality = data.personality_analysis || {};
        let mbti = (personality.mbti_type && String(personality.mbti_type).trim()) || '';
        const traits = personality.traits || [];
        // 后端未返回 MBTI 时，根据五项特质在前端做简易推断，避免显示为「—」
        if (!mbti && traits.length >= 4) {
            const scoreByName = {};
            traits.forEach(t => { scoreByName[t.trait_name] = Number(t.score) || 50; });
            const get = (name) => scoreByName[name] != null ? scoreByName[name] : 50;
            const e_i = get('外向性') >= 50 ? 'E' : 'I';
            const s_n = get('开放性') >= 50 ? 'N' : 'S';
            const t_f = get('宜人性') >= 50 ? 'F' : 'T';
            const j_p = get('尽责性') >= 50 ? 'J' : 'P';
            mbti = e_i + s_n + t_f + j_p;
        }
        if (!mbti) mbti = '—';
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
        // 性格特质展示：最低 20 分，不出现零分或过低分（仅影响展示与进度条）
        const safeTraitScore = (n) => { const v = Number(n); return Number.isFinite(v) ? Math.max(20, Math.min(100, v)) : 20; };
        // 能力分：总分 100，展示真实分数（仅做边界保护）
        const safeAbilityScore = (n) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
        // 能力详细分析：优先使用后端报告中的 ability_detail（5项、含差异化文案），否则回退 strengths/areas
        let allAbilities = [];
        const abilityDetail = data.ability_analysis && data.ability_analysis.ability_detail;
        if (Array.isArray(abilityDetail) && abilityDetail.length) {
            allAbilities = abilityDetail;
        } else {
        const allAbilitiesRaw = strengths.concat(areas);
        const uniqueAbilities = [...new Map(allAbilitiesRaw.map(a => [a.ability || a.name || '', a])).values()].filter(a => a.ability || a.name);
            allAbilities = uniqueAbilities.length ? uniqueAbilities : allAbilitiesRaw;
        }
        const abilityLabels = allAbilities.map(a => a.ability || a.name);
        const abilityValues = allAbilities.map(a => safeAbilityScore(a.score));
        // 优势能力卡片：无 strengths[0] 时从能力详细分析中取分数最高的两项
        const sortedByScore = allAbilities.length ? [...allAbilities].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)) : [];
        const topAbility = sortedByScore[0] || null;
        const secondAbility = sortedByScore[1] || null;
        const TRAIT_MAX_SCORE = 100;
        /* 性格特质已用于雷达图与展示，无需控制台输出 */
        const radarLabels = traits.map(t => t.trait_name);
        const radarValues = traits.map(t => safePct(safeTraitScore(t.score)));

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
                            const scoreNum = safeTraitScore(t.score);
                            const pct = safePct((scoreNum / TRAIT_MAX_SCORE) * 100);
                            const levelClass = pct >= 60 ? 'report-level-high' : pct >= 40 ? 'report-level-mid' : 'report-level-low';
                            const levelText = pct >= 60 ? '偏强' : pct >= 40 ? '中等' : '偏低';
                            return `<div class="report-trait-item">
                                <span class="report-trait-name">${t.trait_name}</span>
                                <div class="report-trait-bar-bg"><div class="report-trait-bar" style="width:${pct}%"></div></div>
                                <span class="report-trait-score">${scoreNum}分 <span class="report-level-tag ${levelClass}">${t.level || levelText}</span></span>
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
                    <div class="report-ability-detail">
                        <div class="ability-grid" id="reportAbilityGrid">
                        ${(function() {
                            const iconMap = { '学习能力':'📚', '沟通表达':'💬', '沟通表达能力':'💬', '执行能力':'⚡', '逻辑分析':'🧩', '逻辑分析能力':'🧩', '创新能力':'💡', '抗压能力':'🔥', '团队协作':'🤝', '领导力':'👤' };
                            const getIcon = (name) => iconMap[name] || (name && name.indexOf('学习') >= 0 ? '📚' : name && name.indexOf('沟通') >= 0 ? '💬' : name && name.indexOf('执行') >= 0 ? '⚡' : name && name.indexOf('逻辑') >= 0 ? '🧩' : name && name.indexOf('创新') >= 0 ? '💡' : name && name.indexOf('抗压') >= 0 ? '🔥' : '📊');
                            return allAbilities.map(a => {
                                const isCalculated = !!(a && a.level);
                                const score = safeAbilityScore(a && a.score);
                                const level = isCalculated ? a.level : (score >= 80 ? '优秀' : score >= 70 ? '良好' : score >= 60 ? '一般' : '待提升');
                                const themeClass = score >= 80 ? 'theme-green' : score >= 70 ? 'theme-blue' : score >= 60 ? 'theme-orange' : 'theme-red';
                                const desc = (a.description || '').trim();
                                const sugg = Array.isArray(a.suggestions) ? a.suggestions.filter(Boolean).join(' ') : '';
                                const textBlock = desc || sugg || '可通过练习与项目实践持续提升';
                                const name = (a.ability || a.name || '').trim();
                                const icon = getIcon(name);
                                return `<div class="${themeClass}">
                                    <div class="ab-card">
                                        <div class="card-top">
                                            <div class="card-name">
                                                <div class="card-icon">${icon}</div>
                                                ${name}
                                            </div>
                                            <span class="level-badge">${level}</span>
                                        </div>
                                        <div class="score-row">
                                            <span class="score-num">${score}</span>
                                            <span class="score-unit">分</span>
                                        </div>
                                        <div class="bar-wrap">
                                            <div class="bar-bg">
                                                <div class="bar-fill" style="width:${score}%"></div>
                                            </div>
                                        </div>
                                        <div class="card-desc">${String(textBlock).replace(/</g, '&lt;')}</div>
                                    </div>
                                </div>`;
                            }).join('');
                        })()}
                        </div>
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
            const uid = getCurrentUserId();
            if (id) {
                const q = 'id=' + encodeURIComponent(id) + (uid ? '&uid=' + encodeURIComponent(uid) : '');
                window.open('report/print.html?' + q, '_blank');
            }
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

    // 添加职业规划报告历史记录
    appendCareerReportHistory(reportId, created_at, extra = {}) {
        let userId = getCurrentUserId();
        // 如果没有用户ID，使用默认值
        if (!userId) userId = 'default';
        if (!reportId) return;
        const key = 'career_report_history_' + userId;
        let list = [];
        try {
            const raw = localStorage.getItem(key);
            if (raw) list = JSON.parse(raw);
            if (!Array.isArray(list)) list = [];
        } catch (e) {
            console.error('Failed to load career report history:', e);
        }
        const created = created_at || new Date().toISOString();
        const entry = { report_id: reportId, created_at: created, ...extra };
        const exists = list.some(item => (item.report_id || item.id) === reportId);
        if (!exists) list.unshift(entry);
        try {
            localStorage.setItem(key, JSON.stringify(list));
            console.log('Career report history saved:', entry);
        } catch (e) {
            console.error('Failed to save career report history:', e);
        }
    }

    // 加载职业规划报告历史信息
    async loadReportHistoryInfo() {
        let userId = getCurrentUserId();
        // 如果没有用户ID，使用默认值
        if (!userId) userId = 'default';
        
        // 从localStorage加载历史报告
        const key = 'career_report_history_' + userId;
        let list = [];
        try {
            const raw = localStorage.getItem(key);
            if (raw) list = JSON.parse(raw);
            if (!Array.isArray(list)) list = [];
        } catch (e) {
            console.error('Failed to load career report history info:', e);
        }
        
        // 更新历史报告数量
        const historyCount = list.length;
        const historyReportCountEl = document.getElementById('historyReportCount');
        if (historyReportCountEl) historyReportCountEl.textContent = `${historyCount} 份`;
        
        // 更新最近报告日期
        if (list.length > 0) {
            // 按生成时间降序排序
            list.sort((a, b) => new Date(b.created_at || b.create_time || 0) - new Date(a.created_at || a.create_time || 0));
            const latestReport = list[0];
            const date = latestReport.created_at || latestReport.create_time;
            if (date) {
                const formattedDate = new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const latestReportDateEl = document.getElementById('latestReportDate');
                if (latestReportDateEl) latestReportDateEl.textContent = formattedDate;
            }
        }

        // 检查能力画像状态
        try {
            const abilityResult = await getAbilityProfile(userId);
            const abilityProfileStatusEl = document.getElementById('abilityProfileStatus');
            if (abilityProfileStatusEl) {
                if (abilityResult.success && abilityResult.data) {
                    abilityProfileStatusEl.textContent = '已生成';
                } else {
                    abilityProfileStatusEl.textContent = '未生成';
                }
            }
        } catch (e) {
            const abilityProfileStatusEl = document.getElementById('abilityProfileStatus');
            if (abilityProfileStatusEl) abilityProfileStatusEl.textContent = '未生成';
        }

        // 检查人岗匹配状态
        try {
            const matchingResult = await getJobMatching(userId);
            const jobMatchingStatusEl = document.getElementById('jobMatchingStatus');
            if (jobMatchingStatusEl) {
                if (matchingResult.success && matchingResult.data) {
                    jobMatchingStatusEl.textContent = '已分析';
                } else {
                    jobMatchingStatusEl.textContent = '未分析';
                }
            }
        } catch (e) {
            const jobMatchingStatusEl = document.getElementById('jobMatchingStatus');
            if (jobMatchingStatusEl) jobMatchingStatusEl.textContent = '未分析';
        }
    }

    // 查看职业规划历史报告（仅职业规划报告，从localStorage加载，与测评报告历史分离）
    async viewCareerReportHistory() {
        let userId = getCurrentUserId();
        // 如果没有用户ID，使用默认值
        if (!userId) userId = 'default';
        const historyDiv = document.getElementById('reportHistory');
        const listDiv = document.getElementById('historyList');
        if (!historyDiv || !listDiv) return;
        historyDiv.classList.remove('hidden');
        listDiv.innerHTML = '<div class="loading-message">加载历史报告中...</div>';
        try {
            // 从localStorage加载历史报告
            const key = 'career_report_history_' + userId;
            let list = [];
            try {
                const raw = localStorage.getItem(key);
                if (raw) list = JSON.parse(raw);
                if (!Array.isArray(list)) list = [];
            } catch (e) {
                console.error('Failed to load career report history:', e);
            }
            
            // 按生成时间降序排序，确保最新的报告显示在最前面
            list.sort((a, b) => new Date(b.created_at || b.create_time || 0) - new Date(a.created_at || a.create_time || 0));
            
            if (list.length > 0) {
                this.renderCareerReportHistory(list);
                this.showToast('已加载 ' + list.length + ' 条历史报告', 'success');
            } else {
                listDiv.innerHTML = '<div class="hint-text">暂无职业规划历史报告</div>';
            }
        } catch (e) {
            console.error('Error viewing career report history:', e);
            listDiv.innerHTML = '<div class="hint-text">加载失败，请稍后重试</div>';
        }
    }

    // 渲染职业规划历史报告列表（仅 7.7 返回的规划报告，不包含测评报告；严格按照API文档结构渲染）
    renderCareerReportHistory(reports) {
        const listDiv = document.getElementById('historyList');
        listDiv.innerHTML = '';
        
        // 过滤只显示职业规划报告，排除测评报告
        const careerReports = reports.filter(report => {
            // 职业规划报告通常包含以下特征：
            // 1. 有 report_id 字段
            // 2. 不是测评报告
            return report.report_id && !report.assessment_id;
        });
        
        if (careerReports.length === 0) {
            listDiv.innerHTML = '<div class="hint-text">暂无职业规划历史报告</div>';
            return;
        }
        
        careerReports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'career-history-item';
            
            // 根据状态显示不同的标签
            let statusLabel = '';
            let statusColor = '';
            switch (report.status) {
                case 'completed':
                    statusLabel = '已完成';
                    statusColor = '#52c41a';
                    break;
                case 'processing':
                    statusLabel = '生成中';
                    statusColor = '#1890ff';
                    break;
                case 'archived':
                    statusLabel = '已归档';
                    statusColor = '#bfbfbf';
                    break;
                default:
                    statusLabel = '未知';
                    statusColor = '#bfbfbf';
            }
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div class="history-item-title">${report.primary_career || '职业规划报告'}</div>
                    <span style="font-size: 11px; font-weight: 500; color: white; background-color: ${statusColor}; padding: 2px 8px; border-radius: 10px;">${statusLabel}</span>
                </div>
                <div class="history-item-meta" style="margin-bottom: 8px;">${this.formatDateTime(report.created_at)}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; color: var(--text-secondary);">完整度：</span>
                        <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${report.completeness || 0}%</span>
                    </div>
                    ${report.last_viewed ? `<span style="font-size: 11px; color: var(--text-secondary);">最后查看：${this.formatDateTime(report.last_viewed)}</span>` : ''}
                </div>
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

// 全局：计划定制弹窗入口（供内联 onclick 与委托点击使用）
function openTrackingPlanModal() {
    if (window.app && typeof window.app.openTrackingPlanModal === 'function') {
        window.app.openTrackingPlanModal();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CareerPlanningApp();
    window.openTrackingPlanModal = openTrackingPlanModal;

    // 计划定制按钮：文档级委托，确保点击一定能触发（避免被遮挡或绑定丢失）
    document.addEventListener('click', function planFabDelegate(e) {
        if (e.target && e.target.closest && e.target.closest('#trackingPlanFab')) {
            openTrackingPlanModal();
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // 初始化日期输入框（即使没有加载档案数据）
    if (window.app && typeof window.app.initDateInput === 'function') {
        setTimeout(() => {
            window.app.initDateInput();
        }, 200);
    }

    // ========== 合并：悬浮聊天智能体初始化（与图谱共存） ==========
    initFloatingAgent();
});

// ==================== 模拟面试模块 ====================
let currentInterview = null;
var _interviewReportLoading = false;
let mockInterviewInitialized = false;

function initMockInterviewModule() {
    if (mockInterviewInitialized) return;
    
    initMockInterviewTabs();
    initMockInterviewForm();
    initMockInterviewHistoryDelegation();
    loadInterviewHistory();
    mockInterviewInitialized = true;
}

function initMockInterviewTabs() {
    const container = document.getElementById('mockInterviewPage');
    const tabs = container ? container.querySelectorAll('.matching-tabs .tab-btn') : document.querySelectorAll('.matching-tabs .tab-btn');
    const tabContents = container ? container.querySelectorAll('.mock-interview-tab-content .tab-content') : document.querySelectorAll('.mock-interview-tab-content .tab-content');
    // data-tab="create" 对应 id="createInterviewTab"，其余为 tabId + 'Tab'
    const tabToContentId = (tabId) => (tabId === 'create' ? 'createInterviewTab' : tabId + 'Tab');

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const targetTab = document.getElementById(tabToContentId(tabId));
            if (targetTab) {
                targetTab.classList.add('active');
            }
            if (container) {
                if (tabId === 'interview') container.classList.add('interview-tab-active');
                else container.classList.remove('interview-tab-active');
            }

            if (tabId === 'history') {
                loadInterviewHistory();
            }
        };
    });
}

function initMockInterviewForm() {
    const form = document.getElementById('createInterviewForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const targetPosition = document.getElementById('targetPosition').value;
            const interviewType = document.getElementById('interviewType').value;
            const difficulty = document.getElementById('difficulty').value;
            const duration = parseInt(document.getElementById('duration').value);
            const userId = getCurrentUserId();
            
            const positionTrim = (targetPosition || '').trim();
            if (!positionTrim) {
                alert('请输入目标岗位');
                return;
            }
            
            if (!userId) {
                alert('请先登录');
                return;
            }
            
            const createFn = (typeof api !== 'undefined' && typeof api.createMockInterview === 'function')
                ? api.createMockInterview
                : (typeof createMockInterview === 'function' ? createMockInterview : null);
            if (!createFn) {
                alert('功能加载异常，请刷新页面后重试');
                return;
            }
            const result = await createFn(userId, positionTrim, interviewType, difficulty, duration);
            
            if (result.success) {
                currentInterview = result.data;
                switchToInterviewTab();
                renderInterviewMessages();
                updateInterviewStats();
                startInterviewTimer();
            } else {
                alert(result.msg || '创建面试失败');
            }
        };
    }
    
    const sendBtn = document.getElementById('sendAnswerBtn');
    if (sendBtn) {
        sendBtn.onclick = submitInterviewAnswer;
    }
    
    const endBtn = document.getElementById('endInterviewBtn');
    if (endBtn) {
        endBtn.onclick = endInterview;
    }
    
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitInterviewAnswer();
            }
        };
    }
}

function switchToInterviewTab() {
    const container = document.getElementById('mockInterviewPage');
    const tabs = container ? container.querySelectorAll('.matching-tabs .tab-btn') : document.querySelectorAll('.matching-tabs .tab-btn');
    const tabContents = container ? container.querySelectorAll('.mock-interview-tab-content .tab-content') : document.querySelectorAll('.mock-interview-tab-content .tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    tabs[1].classList.add('active');
    document.getElementById('interviewTab').classList.add('active');
    if (container) container.classList.add('interview-tab-active');
}

/** 切换到「开始面试」tab */
function switchToCreateInterviewTab() {
    const container = document.getElementById('mockInterviewPage');
    const tabs = container ? container.querySelectorAll('.matching-tabs .tab-btn') : document.querySelectorAll('.matching-tabs .tab-btn');
    const tabContents = container ? container.querySelectorAll('.mock-interview-tab-content .tab-content') : document.querySelectorAll('.mock-interview-tab-content .tab-content');
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    if (tabs[0]) tabs[0].classList.add('active');
    const createTab = document.getElementById('createInterviewTab');
    if (createTab) createTab.classList.add('active');
    if (container) container.classList.remove('interview-tab-active');
}

/** 切换到「面试报告」tab（在获取报告成功后调用） */
function switchToInterviewReportTab() {
    const container = document.getElementById('mockInterviewPage');
    const tabs = container ? container.querySelectorAll('.matching-tabs .tab-btn') : document.querySelectorAll('.matching-tabs .tab-btn');
    const tabContents = container ? container.querySelectorAll('.mock-interview-tab-content .tab-content') : document.querySelectorAll('.mock-interview-tab-content .tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    tabs[2].classList.add('active');
    document.getElementById('reportTab').classList.add('active');
    if (container) container.classList.remove('interview-tab-active');
}

function updateInterviewerHeader() {
    const nameEl = document.getElementById('interviewerName');
    const roleEl = document.getElementById('interviewerRole');
    const avatarEl = document.getElementById('interviewerAvatar');
    if (avatarEl) avatarEl.textContent = '🤖';
    if (!nameEl || !roleEl || !currentInterview) return;
    const persona = currentInterview.interviewer_persona;
    nameEl.textContent = (persona && persona.name) ? persona.name : 'AI面试官';
    roleEl.textContent = (persona && persona.title) ? persona.title : '面试官角色';
}

function renderInterviewMessages() {
    const chatContainer = document.getElementById('interviewChat');
    if (!chatContainer || !currentInterview) return;
    
    updateInterviewerHeader();
    chatContainer.innerHTML = '';
    
    currentInterview.messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = 'mock-msg ' + (msg.role === 'user' ? 'user' : '');
        
        const avatar = document.createElement('div');
        avatar.className = 'mock-avatar' + (msg.role === 'user' ? ' user-avatar' : '');
        avatar.textContent = msg.role === 'interviewer' ? '🤖' : (msg.role === 'user' ? '你' : '');
        
        const content = document.createElement('div');
        content.className = 'mock-msg-bubble ' + (msg.role === 'user' ? 'user' : 'ai');
        content.innerHTML = (msg.content || '').replace(/\n/g, '<br>');
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        chatContainer.appendChild(messageEl);
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
    updateInterviewFooterState();
}

/** 根据面试状态更新底部输入区：已结束时禁用输入并显示「查看报告」 */
function updateInterviewFooterState() {
    const inputEl = document.getElementById('answerInput');
    const sendBtn = document.getElementById('sendAnswerBtn');
    const endBtn = document.getElementById('endInterviewBtn');
    if (!inputEl || !sendBtn || !endBtn) return;
    var isCompleted = currentInterview && currentInterview.status === 'completed';
    if (isCompleted) {
        inputEl.disabled = true;
        inputEl.placeholder = '面试已结束，请查看报告';
        inputEl.style.display = 'none';
        sendBtn.style.display = 'none';
        endBtn.textContent = '查看报告';
        endBtn.onclick = function () { if (currentInterview && currentInterview.interview_id) loadInterviewReport(currentInterview.interview_id); else switchToInterviewReportTab(); };
    } else {
        inputEl.disabled = false;
        inputEl.placeholder = '请输入你的回答...';
        inputEl.style.display = '';
        sendBtn.style.display = '';
        endBtn.textContent = '结束面试';
        endBtn.onclick = endInterview;
    }
}

let interviewTimerRemaining = 0;
let interviewTimerInterval = null;

function startInterviewTimer() {
    if (!currentInterview || interviewTimerInterval) return;
    const durationMins = typeof currentInterview.duration === 'number' ? currentInterview.duration : (parseInt(currentInterview.duration, 10) || 30);
    interviewTimerRemaining = durationMins * 60;
    if (interviewTimerInterval) clearInterval(interviewTimerInterval);
    interviewTimerInterval = setInterval(function () {
        interviewTimerRemaining--;
        updateInterviewTimerDisplay();
        if (interviewTimerRemaining <= 0) {
            if (interviewTimerInterval) clearInterval(interviewTimerInterval);
            interviewTimerInterval = null;
            endInterview();
        }
    }, 1000);
    updateInterviewTimerDisplay();
}

function stopInterviewTimer() {
    if (interviewTimerInterval) {
        clearInterval(interviewTimerInterval);
        interviewTimerInterval = null;
    }
    interviewTimerRemaining = 0;
    updateInterviewTimerDisplay();
}

function updateInterviewTimerDisplay() {
    const el = document.getElementById('interviewTimerDisplay');
    const pill = document.getElementById('mockPillTimer');
    const m = Math.floor(interviewTimerRemaining / 60);
    const s = interviewTimerRemaining % 60;
    const text = interviewTimerRemaining > 0 ? (m + ':' + (s < 10 ? '0' : '') + s) : '0:00';
    if (el) el.textContent = text;
    if (pill) pill.textContent = '剩余 ' + (interviewTimerRemaining > 0 ? text : '0:00');
}

function renderInterviewProgressTrack() {
    const container = document.getElementById('interviewProgressTrack');
    if (!container || !currentInterview) return;
    const plan = currentInterview.interview_plan;
    const types = (plan && plan.question_types) ? plan.question_types : MOCK_MODULE_NAMES;
    const current = currentInterview.current_question_index != null ? currentInterview.current_question_index : 0;
    container.innerHTML = types.map(function (label, idx) {
        const done = idx < current;
        const active = idx === current;
        const dotClass = done ? 'done' : (active ? 'active' : '');
        const itemClass = done ? 'done' : (active ? 'active' : '');
        const textClass = active ? 'progress-text active' : 'progress-text';
        return '<div class="mock-progress-item ' + itemClass + '">' +
            '<div class="mock-progress-dot ' + dotClass + '"></div>' +
            '<div class="' + textClass + '">' + (label || ('题目' + (idx + 1))) + '</div></div>';
    }).join('');
}

var MOCK_MODULE_NAMES = ['自我介绍', '岗位认知', '项目经验', '技术能力', '职业规划'];

function updateInterviewStats() {
    if (!currentInterview) return;
    updateInterviewTimerDisplay();
    renderInterviewProgressTrack();
}

async function submitInterviewAnswer() {
    const answerInput = document.getElementById('answerInput');
    const sendBtn = document.getElementById('sendAnswerBtn');
    
    if (!answerInput || !sendBtn || !currentInterview) return;
    
    const answer = answerInput.value.trim();
    if (!answer) {
        alert('请输入你的回答');
        return;
    }
    
    const userId = getCurrentUserId();
    
    sendBtn.disabled = true;
    answerInput.disabled = true;
    answerInput.value = '';
    
    currentInterview.messages.push({
        role: 'user',
        content: answer,
        timestamp: new Date().toISOString()
    });
    renderInterviewMessages();
    updateInterviewStats();
    
    sendBtn.textContent = 'AI思考中...';
    
    let aiMessageIndex = -1;
    
    const result = await sendInterviewAnswer(
        currentInterview.interview_id, 
        userId, 
        answer,
        (chunk) => {
            if (aiMessageIndex === -1) {
                aiMessageIndex = currentInterview.messages.length;
                currentInterview.messages.push({
                    role: 'interviewer',
                    content: chunk,
                    timestamp: Date.now()
                });
            } else {
                currentInterview.messages[aiMessageIndex].content += chunk;
            }
            renderInterviewMessages();
        },
        (currentIndex, remainingQuestions) => {
            if (currentInterview == null) return;
            currentInterview.current_question_index = currentIndex;
            updateInterviewStats();
        }
    );
    
    sendBtn.disabled = false;
    answerInput.disabled = false;
    sendBtn.textContent = '发送回答';
    
    if (result.success) {
        currentInterview.status = result.data.interview.status;
        if (result.data.interview.current_question_index != null) {
            currentInterview.current_question_index = result.data.interview.current_question_index;
        }
        updateInterviewStats();
    } else {
        alert(result.msg || '发送回答失败');
    }
}

async function endInterview() {
    if (!currentInterview) return;
    
    if (confirm('确定要结束本次面试吗？')) {
        const endBtn = document.getElementById('endInterviewBtn');
        if (endBtn) {
            endBtn.disabled = true;
            endBtn.textContent = '生成报告中...';
        }
        try {
            stopInterviewTimer();
            currentInterview.status = 'completed';
            if (typeof api !== 'undefined' && api.saveMockInterviews) api.saveMockInterviews();
            updateInterviewFooterState();
            await loadInterviewReport(currentInterview.interview_id);
        } finally {
            if (endBtn) endBtn.disabled = false;
            updateInterviewFooterState();
        }
    }
}

async function loadInterviewReport(interviewId) {
    if (_interviewReportLoading) return;
    _interviewReportLoading = true;
    switchToInterviewReportTab();
    var reportArea = document.getElementById('reportArea');
    if (reportArea) {
        reportArea.innerHTML = '<div class="mock-report-loading"><div class="mock-report-loading-spinner"></div><div class="mock-report-loading-text">加载报告中...</div></div>';
    }
    var userId = getCurrentUserId();
    var result;
    try {
        result = await getInterviewReport(interviewId, userId);
        console.log('[历史Debug] 获取报告响应:', result);
        console.log('[历史Debug] 响应success:', result && result.success);
        console.log('[历史Debug] 响应data:', result && result.data);
    } catch (e) {
        result = { success: false, msg: '网络异常，请确认 AI 服务 (http://localhost:5002) 已启动。' + (e && e.message ? ' ' + e.message : '') };
        console.error('[历史Debug] 获取报告异常:', e);
    } finally {
        _interviewReportLoading = false;
    }
    
    if (result && result.success && result.data) {
        try {
            renderInterviewReport(result.data);
        } catch (err) {
            console.error('[MockInterview] 渲染报告异常:', err);
        }
        switchToInterviewReportTab();
        console.log('[历史Debug] 跳转到面试报告tab完成');
        loadInterviewHistory();
    } else {
        console.error('[历史Debug] 报告数据获取失败:', result);
        // 后端不可用时：若有当前面试对话，展示本地离线报告，避免报告页空白
        if (currentInterview && currentInterview.interview_id === interviewId && currentInterview.messages && currentInterview.messages.length > 0) {
            var fallback = {
                interview_id: interviewId,
                target_job: currentInterview.target_position || currentInterview.target_job_title || '岗位',
                overall_score: 0,
                dimension_scores: { expression: 0, logic: 0, content: 0, stress_resistance: 0, cultural_fit: 0 },
                strengths: ['当前为本地对话记录，未连接 AI 服务'],
                weaknesses: ['完整报告需在 AI 服务 (http://localhost:5002) 启动后，重新点击「结束面试」生成'],
                suggestions: ['请启动 AI 服务后重试', '启动后再次点击「结束面试」可生成含评分的报告'],
                improvement_plan: { short_term: [], suggested_retry_days: 14 },
                created_at: new Date().toISOString()
            };
            try { renderInterviewReport(fallback); } catch (err) { console.error('[MockInterview] 渲染报告异常:', err); }
            switchToInterviewReportTab();
            setTimeout(function () { alert(result.msg || '无法连接面试服务，当前仅展示对话记录。请启动 AI 服务 (http://localhost:5002) 后重新点击「结束面试」获取完整报告。'); }, 300);
        } else {
            if (reportArea) {
                reportArea.innerHTML = '<div class="mock-report-loading mock-report-loading-error"><div class="mock-report-loading-text">' + (result && result.msg ? result.msg : '获取报告失败，请确认 AI 服务 (http://localhost:5002) 已启动后重试。') + '</div></div>';
            }
            if (typeof showToast === 'function') showToast(result && result.msg ? result.msg : '获取报告失败，请重试', 'error');
            else alert(result && result.msg ? result.msg : '加载面试报告失败，请确认 AI 服务 (http://localhost:5002) 已启动。');
        }
    }
}

function renderInterviewReport(report) {
    const reportArea = document.getElementById('reportArea');
    if (!reportArea) return;
    
    const score = report.overall_score != null ? Number(report.overall_score) : 0;
    const gradeText = score >= 80 ? '优秀' : (score >= 60 ? '良好' : '待提升');
    const gradeSub = score >= 80 ? '建议录用' : (score >= 60 ? '建议再培养' : '建议加强练习');
    const dims = report.dimension_scores || {};
    const dimOrder = [
        { key: 'content', label: '内容质量' },
        { key: 'expression', label: '表达能力' },
        { key: 'logic', label: '逻辑思维' },
        { key: 'cultural_fit', label: '文化适配' },
        { key: 'stress_resistance', label: '抗压能力' }
    ];
    function dimColor(v) {
        if (v >= 75) return 'var(--mock-sage)';
        if (v >= 50) return 'var(--mock-amber)';
        return 'var(--mock-red)';
    }
    const suggestedDays = (report.improvement_plan && report.improvement_plan.suggested_retry_days) ? report.improvement_plan.suggested_retry_days : 14;
    const shortTerm = (report.improvement_plan && report.improvement_plan.short_term) ? report.improvement_plan.short_term : [];
    const date = report.created_at ? new Date(report.created_at).toLocaleString('zh-CN') : '';
    const position = report.target_job || '岗位';
    var rawType = report.interview_type || (currentInterview && currentInterview.interview_type) || 'comprehensive';
    const interviewType = rawType === 'technical' ? '技术' : (rawType === 'behavioral' ? '行为' : '综合');
    
    var dimsHtml = dimOrder.map(function(d, idx) {
        var v = dims[d.key] != null ? Number(dims[d.key]) : 0;
        var scoreColor = dimColor(v);
        var barColor = dimColor(v);
        var last = idx === dimOrder.length - 1;
        return '<div style="padding:12px 14px;border-right:' + (last ? 'none' : '1px solid var(--mock-line)') + ';text-align:center;">' +
            '<div style="font-size:26px;font-weight:700;line-height:1;margin-bottom:4px;color:' + scoreColor + ';font-variant-numeric:tabular-nums;">' + v + '</div>' +
            '<div style="font-size:11px;color:var(--mock-ink-3);margin-bottom:8px;">' + d.label + '</div>' +
            '<div style="height:2px;background:var(--mock-line);border-radius:1px;">' +
            '<div style="height:2px;border-radius:1px;background:' + barColor + ';width:' + Math.min(100, v) + '%;"></div></div></div>';
    }).join('');
    
    var strengths = (report.strengths || []).map(function(s){ return '<li style="font-size:13px;color:var(--mock-ink-2);line-height:1.5;">' + s + '</li>'; }).join('');
    var weaknesses = (report.weaknesses || []).map(function(w){ return '<li style="font-size:13px;color:var(--mock-ink-2);line-height:1.5;">' + w + '</li>'; }).join('');
    var suggestions = (report.suggestions || []).map(function(s){ return '<li style="font-size:13px;color:var(--mock-ink-2);line-height:1.5;">' + s + '</li>'; }).join('');
    
    reportArea.innerHTML =
        '<div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start;padding-bottom:24px;border-bottom:1px solid var(--mock-line);margin-bottom:24px;">' +
        '<div><div style="font-size:52px;font-weight:700;color:var(--mock-ink);line-height:1;letter-spacing:-3px;font-variant-numeric:tabular-nums;">' + score + '</div>' +
        '<div style="font-size:10px;color:var(--mock-ink-3);margin-top:4px;">综合评分</div></div>' +
        '<div><div style="font-size:17px;font-weight:700;margin-bottom:3px;">面试表现报告</div>' +
        '<div style="font-size:12px;color:var(--mock-ink-3);margin-bottom:10px;">' + date + ' · ' + position + '</div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">' +
        '<span style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--mock-line);color:var(--mock-ink-2);background:var(--mock-bg);">' + position + '</span>' +
        '<span style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--mock-line);color:var(--mock-ink-2);background:var(--mock-bg);">' + interviewType + '</span>' +
        '<span style="font-size:11.5px;font-weight:600;color:var(--mock-sage);padding:2px 9px;background:var(--mock-sage-soft);border:1px solid var(--mock-sage-mid);border-radius:4px;">' + gradeText + ' · ' + gradeSub + '</span></div></div></div>' +
        '<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--mock-line);">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mock-ink-3);margin-bottom:14px;">维度评分</div>' +
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);">' + dimsHtml + '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--mock-line);">' +
        '<div style="padding:0 22px;border-right:1px solid var(--mock-line);padding-left:0;">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mock-sage);margin-bottom:11px;display:flex;align-items:center;gap:6px;">' +
        '<span style="width:8px;height:2px;border-radius:1px;background:var(--mock-sage);display:inline-block;"></span>优势</div>' +
        '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">' + strengths + '</ul></div>' +
        '<div style="padding:0 22px;border-right:1px solid var(--mock-line);">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mock-amber);margin-bottom:11px;display:flex;align-items:center;gap:6px;">' +
        '<span style="width:8px;height:2px;border-radius:1px;background:var(--mock-amber);display:inline-block;"></span>待提升</div>' +
        '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">' + weaknesses + '</ul></div>' +
        '<div style="padding:0 22px;padding-right:0;">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mock-ink-2);margin-bottom:11px;display:flex;align-items:center;gap:6px;">' +
        '<span style="width:8px;height:2px;border-radius:1px;background:var(--mock-ink-2);display:inline-block;"></span>改进建议</div>' +
        '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">' + suggestions + '</ul></div></div>' +
        '<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--mock-line);">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mock-ink-3);margin-bottom:14px;">提升计划</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">' +
        '<div style="padding:16px;background:var(--mock-bg);border-radius:var(--mock-radius);"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--mock-sage);margin-bottom:8px;">短期 · 1个月</div><div style="font-size:13px;color:var(--mock-ink-2);line-height:1.6;">' + (shortTerm.length ? shortTerm.join('；') : '根据报告建议制定短期学习与练习计划。') + '</div></div>' +
        '<div style="padding:16px;background:var(--mock-bg);border-radius:var(--mock-radius);"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--mock-sage);margin-bottom:8px;">中期 · 3个月</div><div style="font-size:13px;color:var(--mock-ink-2);line-height:1.6;">巩固专业能力，参与项目或实习，积累可讲述的经历。</div></div>' +
        '<div style="padding:16px;background:var(--mock-bg);border-radius:var(--mock-radius);"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--mock-amber);margin-bottom:8px;">长期 · 6个月</div><div style="font-size:13px;color:var(--mock-ink-2);line-height:1.6;">持续提升目标岗位竞争力，定期复盘与模拟面试。</div></div></div></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div style="font-size:13px;color:var(--mock-ink-3);">建议 <span style="color:var(--mock-ink);font-weight:600;">' + suggestedDays + ' 天后</span> 再次进行模拟面试以检验提升效果</div>' +
        '<button type="button" class="mock-btn mock-btn-primary" style="width:auto;margin:0;padding:8px 18px;font-size:13px" onclick="switchToCreateInterviewTab();">再次面试</button></div>';
}

async function loadInterviewHistory() {
    const userId = getCurrentUserId();
    const getHistoryFn = (typeof api !== 'undefined' && typeof api.getInterviewHistory === 'function')
        ? api.getInterviewHistory
        : (typeof getInterviewHistory === 'function' ? getInterviewHistory : null);
    
    if (!getHistoryFn) {
        renderInterviewHistory([]);
        return;
    }
    if (!userId) {
        renderInterviewHistory([]);
        return;
    }
    
    var list = [];
    try {
        var result = await getHistoryFn(userId, 1, 50);
        console.log('[历史] 接口返回全量数据:', result && result.data);
        list = (result.success && result.data)
            ? (result.data.list || result.data.interviews || (Array.isArray(result.data) ? result.data : []))
            : [];
    } catch (e) {
        console.warn('[MockInterview] 获取历史记录接口异常，尝试使用本地记录:', e && e.message);
    }
    // 后端不可用或返回空时，用本地缓存的面试列表兜底，避免历史数量为零
    if (list.length === 0 && typeof api !== 'undefined' && api.mockInterviews && Array.isArray(api.mockInterviews)) {
        var uid = String(userId);
        list = api.mockInterviews.filter(function(i) { return String(i.user_id) === uid; });
    }
    console.log('[MockInterview] 渲染历史记录，数量:', list.length);
    renderInterviewHistory(list);
}

/** 模拟面试历史列表：仅绑定一次委托，避免每次渲染重复绑定导致点一次触发多次 */
function initMockInterviewHistoryDelegation() {
    var listEl = document.getElementById('interviewHistoryList');
    if (!listEl) return;
    listEl.removeEventListener('click', _handleInterviewHistoryClick);
    listEl.addEventListener('click', _handleInterviewHistoryClick);
}

function _handleInterviewHistoryClick(e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-action="view-report"], [data-action="resume-interview"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var id = btn.getAttribute('data-interview-id');
    if (!id) return;
    if (btn.getAttribute('data-action') === 'view-report') {
        viewInterviewReport(id);
    } else {
        resumeInterview(id);
    }
}

function renderInterviewHistory(interviews) {
    var containerId = 'interviewHistoryList';
    var historyList = document.getElementById(containerId);
    console.log('[历史Debug] 目标容器:', historyList, ' id=', containerId);
    if (!historyList) {
        console.warn('[MockInterview] 未找到 #' + containerId + ' 元素');
        return;
    }
    var list = interviews || [];
    console.log('[MockInterview] 渲染历史记录，数量:', list.length);
    
    if (list.length === 0) {
        historyList.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--mock-ink-3);font-size:14px;">暂无面试记录，开始你的第一次模拟面试吧！</div>';
        updateMockInterviewStats([]);
        return;
    }
    var esc = function(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    historyList.innerHTML = list.map(function(interview) {
        const job = interview.target_position || interview.target_job || interview.target_job_title || '岗位';
        const typeText = interview.interview_type === 'behavioral' ? '行为' : (interview.interview_type === 'technical' ? '技术' : (interview.interview_type === 'comprehensive' ? '综合' : '模拟'));
        const typeClass = interview.interview_type === 'technical' ? 'mock-tag-green' : (interview.interview_type === 'behavioral' ? 'mock-tag-amber' : 'mock-tag-blue');
        const diffText = interview.difficulty === 'easy' ? '简单' : (interview.difficulty === 'hard' ? '困难' : '中等');
        const dateRaw = interview.created_at || interview.started_at;
        const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('zh-CN') : '';
        const score = interview.total_score != null ? Number(interview.total_score) : null;
        let scoreBadge = '';
        if (interview.status !== 'completed') {
            scoreBadge = '<span class="mock-score-badge mock-score-mid">进行中</span>';
        } else if (score != null) {
            var scoreClass = score >= 80 ? 'mock-score-good' : (score >= 60 ? 'mock-score-mid' : 'mock-score-bad');
            scoreBadge = '<span class="mock-score-badge ' + scoreClass + '">' + score + '</span>';
        } else {
            scoreBadge = '<span class="mock-score-badge mock-score-mid">-</span>';
        }
        var actionBtn = interview.status === 'completed'
            ? '<button type="button" class="mock-btn-sm" data-action="view-report" data-interview-id="' + esc(interview.interview_id) + '">查看</button>'
            : '<button type="button" class="mock-btn-sm" data-action="resume-interview" data-interview-id="' + esc(interview.interview_id) + '">继续</button>';
        return '<div class="mock-history-row">' +
            '<div class="mock-history-job">' + job + '</div>' +
            '<div><span class="mock-tag ' + typeClass + '">' + typeText + '</span></div>' +
            '<div style="color:var(--mock-ink-2)">' + diffText + '</div>' +
            '<div class="mock-history-date">' + dateStr + '</div>' +
            '<div>' + scoreBadge + '</div>' +
            '<div>' + actionBtn + '</div></div>';
    }).join('');
    
    updateMockInterviewStats(interviews);
}

function updateMockInterviewStats(interviews) {
    var totalEl = document.getElementById('mockStatTotal');
    var avgEl = document.getElementById('mockStatAvg');
    var monthEl = document.getElementById('mockStatMonth');
    if (!totalEl && !avgEl && !monthEl) return;
    var list = interviews || [];
    var completed = list.filter(function(i) { return i.status === 'completed' && i.total_score != null; });
    var total = list.length;
    var avg = completed.length ? Math.round(completed.reduce(function(s, i) { return s + Number(i.total_score); }, 0) / completed.length) : 0;
    if (totalEl) totalEl.textContent = total;
    if (avgEl) avgEl.textContent = avg;
    if (monthEl) monthEl.textContent = completed.length > 0 ? '+' + Math.max(0, avg - 70) : '0';
}

function viewInterviewReport(interviewId) {
    loadInterviewReport(interviewId);
}

function resumeInterview(interviewId) {
    const interview = api.mockInterviews.find(i => i.interview_id === interviewId);
    if (interview) {
        currentInterview = interview;
        switchToInterviewTab();
        renderInterviewMessages();
        updateInterviewStats();
        if (interview.status !== 'completed') startInterviewTimer();
    }
}

// ==================== 悬浮聊天智能体模块（从历史智能体版本合并，独立于图谱逻辑） ====================
var _agentHistory = [];
var _agentLoading = false;
var _agentOpen = false;
var _agentQuickBarClickBound = false;

var AGENT_QUICK_NAV = {
    assessment: 'assessment',
    ability: 'abilityProfile',
    matching: 'matching',
    report: 'report',
    query: 'jobProfile'
};

/** 快捷按钮：点击后发送 userMsg 到智能体接口，由 Qwen 流式输出回复再显示按钮 */
var AGENT_QUICK_BUTTON_CONTENT = {
    assessment:   { userMsg: '我想做职业测评' },
    ability:      { userMsg: '查看能力画像' },
    matching:     { userMsg: '岗位匹配' },
    report:       { userMsg: '职业规划报告' },
    query:        { userMsg: '查看岗位画像' },
    tracking:     { userMsg: '我想使用求职跟踪' },
    mockInterview: { userMsg: '我想进行模拟面试' }
};

/** 跟踪/面试快捷按钮：流式说明文案（不含按钮，按钮单独渲染），语气生动、带表情符号 */
var AGENT_LOCAL_NAV_MESSAGES = {
    tracking: '📋 在这里可以记录你的每一次投递、笔试、面试进展，还能查看失败分析与复盘报告，让求职有据可查～ ✨ 点击下方按钮进入求职跟踪页面。',
    mockInterview: '🎤 在这里可以和 AI 面试官进行模拟面试练习，实时获得回答评估与改进建议，越练越稳～ 💪 点击下方按钮开始你的模拟面试吧！'
};
/** 跟踪/面试跳转按钮文案与页面 */
var AGENT_LOCAL_NAV_BUTTONS = {
    tracking:     { label: '进入求职跟踪', page: 'tracking' },
    mockInterview: { label: '进入模拟面试', page: 'mockInterview' }
};

function showAgentLocalNavMessage(key, userMsg) {
    var msgs = document.getElementById('agentMessages');
    if (!msgs) return;
    var text = AGENT_LOCAL_NAV_MESSAGES[key];
    var btnCfg = AGENT_LOCAL_NAV_BUTTONS[key];
    if (!text || !btnCfg) return;
    var userDiv = document.createElement('div');
    userDiv.className = 'agent-msg agent-msg-user';
    userDiv.innerHTML = '<div class="agent-msg-bubble">' + agentEscapeHtml(userMsg) + '</div>';
    msgs.appendChild(userDiv);
    var botDiv = document.createElement('div');
    botDiv.className = 'agent-msg agent-msg-bot agent-msg-pop-in';
    var bubble = document.createElement('div');
    bubble.className = 'agent-msg-bubble';
    botDiv.appendChild(bubble);
    msgs.appendChild(botDiv);
    var chars = Array.from(text);
    var idx = 0;
    var delayMs = 38;
    function streamNext() {
        if (idx >= chars.length) {
            var row = document.createElement('div');
            row.className = 'agent-bubble-capsule';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'agent-capsule-btn';
            btn.textContent = btnCfg.label;
            btn.onclick = function() {
                if (window.app && typeof window.app.navigateTo === 'function') window.app.navigateTo(btnCfg.page);
            };
            row.appendChild(btn);
            bubble.appendChild(row);
            if (typeof agentScrollToBottom === 'function') agentScrollToBottom();
            return;
        }
        var chunk = chars[idx];
        idx += 1;
        if (/[\n\s，。、；：]/.test(chunk) && idx < chars.length) {
            chunk += chars[idx];
            idx += 1;
        }
        var accumulated = chars.slice(0, idx).join('');
        bubble.innerHTML = agentFormatText(accumulated);
        if (typeof agentScrollToBottom === 'function') agentScrollToBottom();
        setTimeout(streamNext, delayMs);
    }
    streamNext();
}

function initFloatingAgent() {
    var fab = document.getElementById('agentFab');
    var panel = document.getElementById('agentAssistant');
    if (!panel || !fab) return;
    if (fab.dataset.agentInitialized === '1') return;
    fab.dataset.agentInitialized = '1';

    var nav = document.getElementById('navbar');
    var onLogin = document.body.classList.contains('on-login-page');
    if (onLogin && (
        (typeof isLoggedIn === 'function' && isLoggedIn()) ||
        (nav && !nav.classList.contains('hidden'))
    )) {
        document.body.classList.remove('on-login-page');
    }
    var closeBtn = document.getElementById('agentCloseBtn');
    var sendBtn = document.getElementById('agentFloatingSendBtn');
    var input = document.getElementById('agentInput');

    var fabDragStartX = 0, fabDragStartY = 0, fabOffsetX = 0, fabOffsetY = 0, fabDragging = false, fabDidMove = false;
    fab.addEventListener('mousedown', function(e) {
        fabDragging = true;
        fabDidMove = false;
        fabDragStartX = e.clientX;
        fabDragStartY = e.clientY;
        var rect = fab.getBoundingClientRect();
        fabOffsetX = e.clientX - rect.left;
        fabOffsetY = e.clientY - rect.top;
    });
    document.addEventListener('mousemove', function(e) {
        if (!fabDragging) return;
        var dx = e.clientX - fabDragStartX, dy = e.clientY - fabDragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) fabDidMove = true;
        fab.style.left = (e.clientX - fabOffsetX) + 'px';
        fab.style.top = (e.clientY - fabOffsetY) + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', function() {
        fabDragging = false;
    });
    fab.addEventListener('click', function(e) {
        if (fabDidMove) { fabDidMove = false; return; }
        _agentOpen = true;
        panel.classList.remove('hidden');
        var dot = document.getElementById('agentFabDot');
        if (dot) dot.classList.remove('show');
        showAgentWelcomeIfEmpty();
    });
    closeBtn && closeBtn.addEventListener('click', function() {
        _agentOpen = false;
        panel.classList.add('hidden');
    });
    sendBtn && sendBtn.addEventListener('click', function() { window.sendFloatingAgentMessage(); });
    input && input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.sendFloatingAgentMessage();
        }
    });

    // 快捷栏 + 智能体内链跳转：只绑定一次，避免登录后 initFloatingAgent 再次执行导致重复触发
    if (!_agentQuickBarClickBound) {
        _agentQuickBarClickBound = true;
        document.body.addEventListener('click', function(e) {
            var q = e.target.closest('#agentInputQuickBar .agent-quick-btn');
            if (q && q.dataset.key) {
                var key = q.dataset.key;
                var content = AGENT_QUICK_BUTTON_CONTENT[key];
                if (!content || !content.userMsg) return;
                // 跟踪 / 面试 不依赖流式接口，即使在加载中也允许点击本地跳转
                if (key === 'tracking' || key === 'mockInterview') {
                    showAgentLocalNavMessage(key, content.userMsg);
                    return;
                }
                if (_agentLoading) return;
                if (typeof window.sendAgentMessageAndStream === 'function') {
                    window.sendAgentMessageAndStream(content.userMsg);
                }
                return;
            }
            var link = e.target.closest('#agentMessages .agent-inline-link');
            if (link && link.dataset.agentNav) {
                e.preventDefault();
                if (window.app && typeof window.app.navigateTo === 'function') window.app.navigateTo(link.dataset.agentNav);
            }
        });
    }

    setTimeout(function () {
        var n = document.getElementById('navbar');
        if (n && !n.classList.contains('hidden') && document.body.classList.contains('on-login-page')) {
            document.body.classList.remove('on-login-page');
        }
    }, 300);
}

function showAgentWelcomeIfEmpty() {
    var msgs = document.getElementById('agentMessages');
    if (!msgs || msgs.querySelector('.agent-msg-bot')) return;
    var welcome = '你好呀～ 👋 我是智能体小智，你的职业规划助手，支持求职进展跟踪与模拟面试练习。\n\n我可以帮你：\n✨ 完成职业倾向与能力潜力测评，生成专属报告\n📊 查看能力画像与岗位画像，了解匹配岗位\n🎯 获取人岗匹配推荐与职业规划报告\n💬 解答职业发展、转岗路径等问题\n\n随时在下方输入或点击快捷按钮，我们开始吧～ 😊';
    var div = document.createElement('div');
    div.className = 'agent-msg agent-msg-bot agent-msg-pop-in';
    var bubble = document.createElement('div');
    bubble.className = 'agent-msg-bubble';
    div.appendChild(bubble);
    msgs.appendChild(div);
    // 流式输出欢迎语（按字/符逐字显示，避免整句直接弹出）
    var chars = Array.from(welcome);
    var idx = 0;
    var delayMs = 38;
    function streamNext() {
        if (idx >= chars.length) {
    setTimeout(function() { agentScrollToBottom(); }, 50);
            return;
        }
        var chunk = chars[idx];
        idx += 1;
        // 标点、空格、换行可稍快，与后一字一起显示以减少停顿
        if (/[\n\s～。，、；：]/.test(chunk) && idx < chars.length) {
            chunk += chars[idx];
            idx += 1;
        }
        var accumulated = chars.slice(0, idx).join('');
        bubble.innerHTML = agentFormatText(accumulated);
        agentScrollToBottom();
        setTimeout(streamNext, delayMs);
    }
    streamNext();
}

/** 发送一条消息到智能体并流式输出回复（Qwen），流式结束后再追加按钮。供输入框发送与快捷按钮共用。 */
window.sendAgentMessageAndStream = function sendAgentMessageAndStream(text) {
    if (_agentLoading || !text) return;
    var msgs = document.getElementById('agentMessages');
    if (msgs) {
        var userDiv = document.createElement('div');
        userDiv.className = 'agent-msg agent-msg-user';
        userDiv.innerHTML = '<div class="agent-msg-bubble">' + agentEscapeHtml(text) + '</div>';
        msgs.appendChild(userDiv);
    }
    _agentHistory.push({ role: 'user', content: text });
    if (_agentHistory.length > 20) _agentHistory = _agentHistory.slice(-20);

    var typingId = appendAgentTyping();
    _agentLoading = true;
    var sendBtn = document.getElementById('agentFloatingSendBtn');
    if (sendBtn) sendBtn.disabled = true;
    var statusEl = document.getElementById('agentStatus');
    if (statusEl) statusEl.innerHTML = '<span class="agent-status-dot"></span>正在思考...';

    var botText = '';
    var token = _storage.getItem('token') || '';
    var userInfoStr = _storage.getItem('userInfo') || '{}';
    var userId = 0;
    try { userId = (JSON.parse(userInfoStr)).id || 0; } catch (e) {}
    var baseURL = (typeof API_CONFIG !== 'undefined') ? (API_CONFIG.assessmentBaseURL || API_CONFIG.baseURL || 'http://localhost:5002/api/v1') : 'http://localhost:5002/api/v1';
    if (!baseURL.endsWith('/api/v1')) baseURL = (baseURL.replace(/\/?$/, '') + '/api/v1');

    var profileSnapshot = null;
    var abilitySnapshot = null;
    function fetchBody() {
        return {
            message: text,
            history: _agentHistory.slice(-20),
            user_id: userId,
            profile_snapshot: profileSnapshot || undefined,
            ability_snapshot: abilitySnapshot || undefined
        };
    }
    function doFetch() {
        return fetch(baseURL + '/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(fetchBody())
        });
    }
    function getBubble() {
        var msgs = document.getElementById('agentMessages');
        if (!msgs) return null;
        var last = msgs.querySelector('.agent-msg.agent-msg-bot:last-child');
        return last ? last.querySelector('.agent-msg-bubble') : null;
    }
    function handleStream(reader) {
        var decoder = new TextDecoder();
        function readLoop() {
            return reader.read().then(function(chunk) {
                if (chunk.done) return;
                var lines = decoder.decode(chunk.value).split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (!line.startsWith('data: ')) continue;
                    var payload = line.slice(6).trim();
                    if (payload === '[DONE]') return;
                    try {
                        var obj = JSON.parse(payload);
                        if (obj.text) {
                            botText += obj.text;
                            var b = getBubble();
                            if (b) { b.innerHTML = agentFormatText(botText); agentScrollToBottom(); }
                        }
                        if (obj.error) {
                            botText += obj.error;
                            var b = getBubble();
                            if (b) { b.innerHTML = agentFormatText(botText); agentScrollToBottom(); }
                        }
                        if (obj.actions && obj.actions.length > 0) {
                            var b = getBubble();
                            if (b) {
                                var row = document.createElement('div');
                                row.className = 'agent-bubble-capsule';
                                for (var j = 0; j < obj.actions.length; j++) {
                                    (function(a) {
                                        var btn = document.createElement('button');
                                        btn.type = 'button';
                                        btn.className = 'agent-capsule-btn';
                                        btn.textContent = a.label;
                                        btn.onclick = function() { handleAgentAction(a.fn); };
                                        row.appendChild(btn);
                                    })(obj.actions[j]);
                                }
                                b.appendChild(row);
                                agentScrollToBottom();
                            }
                        }
                        if (obj.navigate) {
                            var page = obj.navigate === 'assessment' ? 'assessment' : obj.navigate === 'career-report' ? 'report' : obj.navigate === 'ability' ? 'abilityProfile' : obj.navigate === 'job-profile' ? 'jobProfile' : obj.navigate;
                            if (window.app && typeof window.app.navigateTo === 'function') setTimeout(function() { window.app.navigateTo(page); }, 500);
                        }
                    } catch (err) {}
                }
                return readLoop();
            });
        }
        return readLoop();
    }

    var snapPromise = (userId && typeof getProfile === 'function' && typeof getAbilityProfile === 'function')
        ? Promise.all([getProfile(userId), getAbilityProfile(userId)]).then(function(both) {
            if (both[0] && both[0].success && both[0].data) profileSnapshot = both[0].data;
            if (both[1] && both[1].success && both[1].data) abilitySnapshot = both[1].data;
        }).catch(function() {})
        : Promise.resolve();
    snapPromise.then(function() {
        return doFetch();
    }).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        removeAgentTyping(typingId);
        appendAgentMessage('bot', '');
        return res.body.getReader();
    }).then(function(reader) {
        return handleStream(reader);
    }).then(function() {
        _agentHistory.push({ role: 'assistant', content: botText });
        if (_agentHistory.length > 20) _agentHistory = _agentHistory.slice(-20);
        if (/一键跳转至.*测评|已为您.*跳转.*测评/.test(botText) && window.app && typeof window.app.navigateTo === 'function') {
            setTimeout(function() { window.app.navigateTo('assessment'); }, 3000);
        }
        var dot = document.getElementById('agentFabDot');
        if (dot && !_agentOpen) dot.classList.add('show');
    }).catch(function(e) {
        removeAgentTyping(typingId);
        appendAgentMessage('bot', '抱歉，遇到了点问题：' + (e && e.message ? e.message : String(e)) + '。请检查智能体服务是否启动（AI算法 python app.py）。');
    }).finally(function() {
        _agentLoading = false;
        if (sendBtn) sendBtn.disabled = false;
        if (statusEl) statusEl.innerHTML = '<span class="agent-status-dot"></span>在线';
    });
};

function sendFloatingAgentMessage() {
    if (_agentLoading) return;
    var input = document.getElementById('agentInput');
    var text = input ? input.value.trim() : '';
    if (!text) return;
    input.value = '';
    if (input.style) input.style.height = 'auto';
    if (typeof window.sendAgentMessageAndStream === 'function') {
        window.sendAgentMessageAndStream(text);
    }
}
window.sendFloatingAgentMessage = sendFloatingAgentMessage;

function appendAgentMessage(role, text) {
    var msgs = document.getElementById('agentMessages');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'agent-msg agent-msg-' + (role === 'user' ? 'user' : 'bot');
    var bubble = document.createElement('div');
    bubble.className = 'agent-msg-bubble';
    bubble.innerHTML = role === 'user' ? agentEscapeHtml(text) : agentFormatText(text);
    div.appendChild(bubble);
    msgs.appendChild(div);
    agentScrollToBottom();
    return bubble;
}

function appendAgentTyping() {
    var msgs = document.getElementById('agentMessages');
    if (!msgs) return '';
    var id = 'agentTyping_' + Date.now();
    var div = document.createElement('div');
    div.className = 'agent-msg agent-msg-bot';
    div.id = id;
    div.innerHTML = '<div class="agent-msg-bubble agent-typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    agentScrollToBottom();
    return id;
}

function removeAgentTyping(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
}

function agentScrollToBottom() {
    var msgs = document.getElementById('agentMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function agentEscapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function agentFormatText(text) {
    return String(text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/【立即开始测评】/g, '<a href="#" class="agent-inline-link" data-agent-nav="assessment">【立即开始测评】</a>')
        .replace(/【进入求职跟踪】/g, '<a href="#" class="agent-inline-link" data-agent-nav="tracking">【进入求职跟踪】</a>')
        .replace(/【进入模拟面试】/g, '<a href="#" class="agent-inline-link" data-agent-nav="mockInterview">【进入模拟面试】</a>')
        .replace(/\n/g, '<br>');
}

function handleAgentAction(fn) {
    if (window.app && typeof window.app.navigateTo === 'function') {
        var page = fn === 'career-report' ? 'report' : fn === 'ability' ? 'abilityProfile' : fn === 'job-profile' ? 'jobProfile' : fn;
        window.app.navigateTo(page);
    } else {
        try { location.hash = fn; } catch (e) {}
    }
}
