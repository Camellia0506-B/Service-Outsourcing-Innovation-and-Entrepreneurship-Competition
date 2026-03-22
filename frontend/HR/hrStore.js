/**
 * 全局 Mock 数据中心（HR + 学生端共享，localStorage 持久化）
 * 用于前端演示：HR 发邀约 → 学生接受 → HR 填写评估 → 双端可查看
 */
(function (window) {
  'use strict';
  var MOCK_KEY = 'gradquest_mock_store';

  var defaultStore = {
    students: [
      {
        anonymousId: 'student_001',
        realName: '李明远',
        userId: 1,
        educationLevel: '本科',
        school: '武汉理工大学',
        majorCategory: '计算机科学与技术',
        major: '计算机科学与技术',
        degree: '本科',
        grade: '2023级',
        gpaLevel: '优秀',
        gpa: '3.6/4.0',
        expectedGraduation: '2027/06',
        gender: '男',
        birth_date: '2003/08/15',
        phone: '13812345678',
        email: 'liminyuan2023@whut.edu.cn',
        systemMatchScore: 95,
        abilityTags: ['Python', 'Java', '机器学习', '深度学习', 'MySQL', 'Vue.js', 'Spring Boot', 'Linux', '数据结构', '算法'],
        highlight: '腾讯后端实习 · 字节算法实习 · RAG项目核心开发 · 数学建模二等奖',
        isOpenToContact: true,
        skills: {
          编程语言: ['Python', 'Java'],
          框架与工具: ['Vue.js', 'Spring Boot', 'MySQL', 'Linux', 'PyTorch', 'LangChain', 'ChromaDB', 'FastAPI'],
          领域知识: ['机器学习', '深度学习', '数据结构', '算法', 'RAG', '图像识别']
        },
        abilityProfile: {
          编程语言: ['Python', 'Java'],
          框架工具: ['Vue.js', 'Spring Boot', 'PyTorch', 'LangChain', 'ChromaDB', 'FastAPI', 'Flask', 'MySQL', 'Linux'],
          领域知识: ['机器学习', '深度学习', 'RAG', '图像识别', '推荐系统', 'NLP']
        },
        projects: [
          { name: '基于深度学习的图像识别系统', period: '2024.03 - 2024.06', desc: '使用 CNN 卷积神经网络构建图像分类模型，在 CIFAR-10 数据集上准确率达 92%。负责模型设计、训练调优及前端展示页面开发，独立完成从数据预处理到模型部署全流程。', tech_stack: 'Python, PyTorch, Vue.js, Flask' },
          { name: '校园智能问答系统', period: '2024.09 - 2024.12', desc: '基于 RAG 架构和大语言模型构建校园信息智能问答系统，使用 ChromaDB 向量数据库，集成 LangChain 框架实现多轮对话，日均查询响应时间小于 2 秒。', tech_stack: 'Python, LangChain, ChromaDB, FastAPI' },
          { name: 'GradQuest 职业规划智能体', period: '2025.01 - 至今', desc: '参与服务外包创新创业竞赛项目，负责 AI 算法模块开发。基于 ReAct Agent 架构实现多工具调用与任务自动分解，集成 BGE-M3 语义嵌入模型与 ChromaDB 实现岗位语义匹配，匹配准确率达 90% 以上。', tech_stack: 'Python, LangChain, DashScope/Qwen, ChromaDB, FastAPI' }
        ],
        internships: [
          { company: '腾讯科技', position: '后端开发实习生', start_date: '2024.07', end_date: '2024.09', description: '参与微信支付模块性能优化，使用 Java Spring Boot 重构部分核心接口，接口响应时间降低 30%。协助完成代码审查与单元测试编写，累计提交有效 PR 12 个，获组内导师好评。' },
          { company: '字节跳动', position: '算法实习生', start_date: '2025.03', end_date: '2025.06', description: '参与推荐系统召回模块的优化工作，使用 Python 对用户行为数据进行特征工程处理，配合团队完成离线模型训练与 A/B 实验评估。实习期间独立完成一项数据清洗流水线的重构，处理效率提升 25%。' }
        ],
        certs: ['英语六级（CET-6）', '计算机二级（Python）', '普通话二级甲等'],
        awards: ['2024年 全国大学生数学建模竞赛 二等奖', '2023年 武汉理工大学优秀学生奖学金 一等奖', '2024年 计算机程序设计竞赛 校级三等奖']
      },
      {
        anonymousId: 'student_002',
        realName: null,
        userId: 2,
        educationLevel: '硕士',
        majorCategory: '人工智能',
        gpaLevel: '优秀',
        systemMatchScore: 85,
        abilityTags: ['NLP', '大模型微调', 'PyTorch', 'Python', 'HuggingFace'],
        highlight: '参与国家级NLP科研项目，发表EI论文1篇，有大模型微调实战经验',
        isOpenToContact: true
      },
      {
        anonymousId: 'student_003',
        realName: null,
        userId: 3,
        educationLevel: '本科',
        school: '东南大学',
        major: '计算机科学与技术',
        majorCategory: '计算机科学与技术',
        degree: '本科',
        grade: '2022级',
        gpa: '3.5/4.0',
        gpaLevel: '良好',
        expectedGraduation: '2026/06',
        gender: '男',
        systemMatchScore: 75,
        abilityTags: ['数据结构', '算法', '机器学习', 'C++', 'LeetCode 200+'],
        highlight: 'ACM校赛银奖，算法基础扎实，有互联网大厂笔试通过经历',
        isOpenToContact: true,
        skills: {
          专业技能: ['数据结构', '算法', '机器学习', '动态规划', '图论'],
          编程语言: ['C++', 'Python', 'Java'],
          工具与框架: ['Git', 'Linux', 'PyTorch', 'STL', 'MySQL'],
          语言能力: ['英语CET-6']
        },
        abilityProfile: {
          编程语言: ['C++', 'Python'],
          框架工具: ['PyTorch', 'Linux', 'Git', 'MySQL'],
          领域知识: ['机器学习', '算法竞赛', '数据结构', '图论']
        },
        certs: ['英语六级（CET-6）', '计算机二级（C++）'],
        projects: [
          { name: '基于图神经网络的社交网络分析系统', period: '2024.03 - 2024.06', desc: '使用 GNN 对社交网络中的节点关系进行建模，完成社区划分与影响力预测，准确率达87%。技术栈：Python, PyTorch, NetworkX' },
          { name: 'ACM算法训练平台（校内）', period: '2023.09 - 2024.01', desc: '参与搭建校内算法题库与在线评测系统，负责后端判题模块开发，支持C++/Java/Python多语言提交。技术栈：Java, MySQL, Linux' }
        ],
        internships: [],
        awards: ['ACM-ICPC 东南大学校赛 银奖', '全国大学生算法设计大赛 三等奖', '东南大学优秀学生奖学金 二等奖']
      },
      {
        anonymousId: 'student_004',
        realName: '林晓雨',
        userId: 4,
        educationLevel: '本科',
        school: '电子科技大学',
        majorCategory: '人工智能',
        major: '人工智能',
        degree: '本科',
        grade: '2022级',
        gpaLevel: '良好',
        gpa: '3.2/4.0',
        expectedGraduation: '2026/06',
        gender: '女',
        birth_date: '2002/05',
        phone: '18234567890',
        email: 'student004@uestc.edu.cn',
        systemMatchScore: 77,
        abilityTags: ['Python', '机器学习', '数据分析'],
        highlight: '课程项目 LSTM 股票预测 · 学业奖学金 · PyTorch 实战',
        isOpenToContact: true,
        skills: {
          编程语言: ['Python'],
          领域技能: ['机器学习', '数据分析']
        },
        abilityProfile: {
          编程语言: ['Python'],
          框架工具: ['PyTorch'],
          领域知识: ['机器学习', '数据分析', 'LSTM', '时序预测']
        },
        projects: [
          {
            name: '基于LSTM的股票趋势预测模型',
            period: '2024.06 - 2024.12',
            desc: '使用PyTorch构建LSTM时序预测模型，在沪深300历史数据上训练，预测准确率达68%，完成数据清洗、特征工程与可视化展示。',
            tech_stack: 'Python, PyTorch, LSTM, 数据分析'
          }
        ],
        internships: [],
        certs: ['英语四级（CET-4）', '计算机二级（Python）'],
        awards: ['2024年 电子科技大学学业奖学金 二等奖', '2023年 Python程序设计课程 满分']
      },
      {
        anonymousId: 'student_005',
        realName: '陈雨桐',
        userId: 5,
        educationLevel: '本科',
        school: '北京航空航天大学',
        majorCategory: '软件工程',
        major: '软件工程',
        degree: '本科',
        grade: '2022级',
        gpaLevel: '良好',
        gpa: '2.9/4.0',
        expectedGraduation: '2026/06',
        gender: '女',
        birth_date: '2002/11',
        phone: '18798765432',
        email: 'chenyutong2022@buaa.edu.cn',
        systemMatchScore: 74,
        abilityTags: ['前端开发', 'React', 'TypeScript', 'Node.js', 'UI设计', 'Figma', '产品思维'],
        highlight: '字节前端实习 · 米哈游产品实习 · 拾光集全栈 · 课表工具 GitHub 430+ Star',
        isOpenToContact: true
      }
    ],
    invitations: [
      { invitationId: 'inv_001', hrId: 1, hrName: '孙于婷', companyName: '星途智探科技有限公司', anonymousStudentId: 'student_001', studentUserId: 1, targetJob: '算法工程师', message: '您好，我们公司正在招聘算法工程师，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。', status: 'accepted', sentAt: '2025-03-08 14:23' },
      { invitationId: 'inv_002', hrId: 1, hrName: '王雨晴', companyName: '深蓝智能（北京）有限公司', anonymousStudentId: 'student_003', studentUserId: 3, targetJob: '算法工程师', message: '您好，我们AI团队正在扩招，您的机器学习背景非常符合我们的需求，诚邀参与面试评估。', status: 'accepted', sentAt: '2025-03-09 10:05' }
    ],
    evaluations: [
      { evaluationId: 'eval_001', invitationId: 'inv_001', anonymousStudentId: 'student_001', studentUserId: 1, targetJob: '算法工程师', status: 'completed', createdAt: '2025-03-09 10:00', submittedAt: '2025-03-09 16:40', overallImpression: '优秀', hiringIntent: '强烈推荐', dimensionScores: { '专业技能匹配度': 95, '学习能力': 95, '沟通表达': 80, '团队协作意愿': 86, '抗压能力': 99, '职业成熟度': 94 }, strengthsNoted: '掌握技术种类多样，学习能力与抗压能力较强，具有较高的培养潜力，在开发项目中有极好的发挥优势', weaknessesNoted: '沟通能力弱，团队协作意愿弱', recommendedPositions: ['算法工程师', '开发员'], evaluationBasis: '简历审阅' }
    ],
    myInvitations: [
      { invitationId: 'inv_001', companyName: '星途智探科技有限公司', hrName: '孙于婷', targetJob: '算法工程师', message: '您好，我们公司正在招聘算法工程师，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。', status: 'accepted', sentAt: '2025-03-08 14:23' },
      { invitationId: 'inv_005', companyName: '深蓝智能（北京）有限公司', hrName: '王雨晴', targetJob: '算法工程师', message: '您好，我们AI团队正在扩招，您的机器学习背景非常符合我们的需求，诚邀参与面试评估。', status: 'pending', sentAt: '2025-03-09 10:05' }
    ],
    myReports: [
      { evaluationId: 'eval_001', companyName: '星途智探科技有限公司', targetJob: '算法工程师', submittedAt: '2025-03-09 16:40', overallImpression: '优秀', hiringIntent: '强烈推荐', dimensionScores: { '专业技能匹配度': 95, '学习能力': 95, '沟通表达': 80, '团队协作意愿': 86, '抗压能力': 99, '职业成熟度': 94 }, strengthsNoted: '掌握技术种类多样，学习能力与抗压能力较强，具有较高的培养潜力，在开发项目中有极好的发挥优势', weaknessesNoted: '沟通能力弱，团队协作意愿弱', recommendedPositions: ['算法工程师', '开发员'] }
    ]
  };

  /** localStorage 旧数据迁移：student_004 整记录、student_001 匹配分等 */
  var HR_DEMO_REVISION = 5;

  function _patchStudent001MatchScore(store) {
    if (!store.students || !store.students.length) return;
    var idx = store.students.findIndex(function (st) {
      return (st.anonymousId || st.anonymous_id) === 'student_001';
    });
    if (idx < 0) return;
    store.students[idx].systemMatchScore = 95;
  }

  function _pickDefaultStudent004() {
    var s = defaultStore.students || [];
    for (var i = 0; i < s.length; i++) {
      if (s[i].anonymousId === 'student_004') {
        return JSON.parse(JSON.stringify(s[i]));
      }
    }
    return null;
  }

  function _applyStudent004DemoDefaults(store) {
    var fresh = _pickDefaultStudent004();
    if (!fresh || !store.students || !store.students.length) return;
    var idx = store.students.findIndex(function (st) {
      return (st.anonymousId || st.anonymous_id) === 'student_004';
    });
    if (idx < 0) return;
    store.students[idx] = fresh;
  }

  function getMockStore() {
    try {
      var raw = window.localStorage.getItem(MOCK_KEY);
      if (!raw) {
        return defaultStore;
      }
      var store = JSON.parse(raw);
      if (!store._hrDemoRevision || store._hrDemoRevision < HR_DEMO_REVISION) {
        _applyStudent004DemoDefaults(store);
        _patchStudent001MatchScore(store);
        store._hrDemoRevision = HR_DEMO_REVISION;
        try {
          window.localStorage.setItem(MOCK_KEY, JSON.stringify(store));
        } catch (e2) {
          console.warn('[MockStore] persist revision failed:', e2);
        }
      }
      return store;
    } catch (e) {
      return defaultStore;
    }
  }

  function saveMockStore(store) {
    try {
      window.localStorage.setItem(MOCK_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('[MockStore] save failed:', e);
    }
  }

  function resetMockStore() {
    try {
      window.localStorage.setItem(MOCK_KEY, JSON.stringify(defaultStore));
    } catch (e) {
      console.warn('[MockStore] reset failed:', e);
    }
  }

  // 避免与其他模块的 mock/mockStore.js 冲突：
  // - 始终挂载到 HRMockStore（学生端 HR 演示专用）
  // - 仅当全局未定义 MockStore 时才兜底赋值，避免覆盖其它模块的 MockStore
  window.HRMockStore = {
    getMockStore: getMockStore,
    saveMockStore: saveMockStore,
    resetMockStore: resetMockStore,
    defaultStore: defaultStore
  };
  if (!window.MockStore) {
    window.MockStore = window.HRMockStore;
  }
})(typeof window !== 'undefined' ? window : {});
