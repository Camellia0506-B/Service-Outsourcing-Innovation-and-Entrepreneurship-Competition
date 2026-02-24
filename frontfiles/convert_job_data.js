const fs = require('fs');
const path = require('path');

// 读取后端岗位画像数据
const backendDataPath = path.join(__dirname, '../AI算法/data/job_profiles/profiles.json');
const backendData = JSON.parse(fs.readFileSync(backendDataPath, 'utf8'));

// 转换为前端需要的格式
function convertToFrontendFormat(backendData) {
    const jobs = [];
    let id = 1;
    
    for (const [key, profile] of Object.entries(backendData)) {
        const job = {
            job_id: profile.job_id,
            job_name: profile.job_name,
            avg_salary: profile.basic_info.avg_salary,
            demand_score: profile.market_analysis?.demand_score || 75,
            growth_trend: profile.market_analysis?.growth_trend || '稳定',
            tags: [],
            industry: profile.basic_info.industry || '其他',
            level: profile.basic_info.level || '初级',
            skills: [],
            location: profile.basic_info.location || '未知',
            company_nature: profile.basic_info.company_type || '其他'
        };
        
        // 提取技能标签
        if (profile.requirements?.professional_skills) {
            const skills = [];
            
            // 编程语言
            if (profile.requirements.professional_skills.programming_languages) {
                profile.requirements.professional_skills.programming_languages.forEach(item => {
                    skills.push(item.skill);
                });
            }
            
            // 框架工具
            if (profile.requirements.professional_skills.frameworks_tools) {
                profile.requirements.professional_skills.frameworks_tools.forEach(item => {
                    skills.push(item.skill);
                });
            }
            
            // 领域知识
            if (profile.requirements.professional_skills.domain_knowledge) {
                profile.requirements.professional_skills.domain_knowledge.forEach(item => {
                    skills.push(item.skill);
                });
            }
            
            job.skills = skills.slice(0, 4); // 最多保留4个技能
        }
        
        // 提取标签
        if (job.skills.length > 0) {
            job.tags = job.skills.slice(0, 3); // 最多保留3个标签
        }
        
        jobs.push(job);
        id++;
    }
    
    return jobs;
}

// 转换数据
const frontendJobs = convertToFrontendFormat(backendData);

// 保存转换后的数据
const frontendDataPath = path.join(__dirname, 'converted_job_data.json');
fs.writeFileSync(frontendDataPath, JSON.stringify(frontendJobs, null, 2));

console.log(`成功转换 ${frontendJobs.length} 个岗位数据`);
console.log(`转换后的数据已保存到: ${frontendDataPath}`);

// 生成mockJobs函数代码
const mockJobsCode = `    mockJobs() {
        return ${JSON.stringify(frontendJobs, null, 4)};
    }`;

console.log('\n生成的mockJobs函数代码:');
console.log(mockJobsCode);
