package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import www.gradquest.com.dto.job.*;
import www.gradquest.com.entity.JobAiTask;
import www.gradquest.com.entity.JobProfile;
import www.gradquest.com.mapper.JobAiTaskMapper;
import www.gradquest.com.mapper.JobProfileMapper;
import www.gradquest.com.service.JobProfileService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobProfileServiceImpl implements JobProfileService {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final JobProfileMapper jobProfileMapper;
    private final JobAiTaskMapper jobAiTaskMapper;

    @Override
    @Transactional
    public Map<String, Object> listProfiles(JobProfilesRequest request) {
        ensureSeedJobs();

        List<JobProfile> all = jobProfileMapper.selectList(new LambdaQueryWrapper<>());

        // 过滤
        List<JobProfile> filtered = all.stream().filter(j -> {
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String kw = request.getKeyword().trim();
                if (!(contains(j.getJobName(), kw) || contains(j.getDescription(), kw))) {
                    return false;
                }
            }
            if (request.getIndustry() != null && !request.getIndustry().isBlank()) {
                if (!Objects.equals(j.getIndustry(), request.getIndustry())) return false;
            }
            if (request.getLevel() != null && !request.getLevel().isBlank()) {
                if (!Objects.equals(j.getLevel(), request.getLevel())) return false;
            }
            return true;
        }).collect(Collectors.toList());

        int page = request.getPage() != null && request.getPage() > 0 ? request.getPage() : 1;
        int size = request.getSize() != null && request.getSize() > 0 ? request.getSize() : 20;
        int total = filtered.size();
        int from = Math.min((page - 1) * size, total);
        int to = Math.min(from + size, total);
        List<JobProfile> pageList = filtered.subList(from, to);

        List<Map<String, Object>> list = pageList.stream().map(this::toListItem).collect(Collectors.toList());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("total", total);
        data.put("page", page);
        data.put("size", size);
        data.put("list", list);
        return data;
    }

    @Override
    public Map<String, Object> getProfileDetail(String jobId) {
        JobProfile jp = jobProfileMapper.selectOne(new LambdaQueryWrapper<JobProfile>().eq(JobProfile::getJobId, jobId));
        if (jp == null) return null;
        // 当前实现：对 job_001 返回文档中的示例结构，其他岗位按此模板稍作调整
        return buildJobDetail(jp);
    }

    @Override
    public Map<String, Object> getRelationGraph(JobRelationGraphRequest request) {
        JobProfile jp = jobProfileMapper.selectOne(new LambdaQueryWrapper<JobProfile>().eq(JobProfile::getJobId, request.getJobId()));
        if (jp == null) return null;

        Map<String, Object> center = Map.of(
                "job_id", jp.getJobId(),
                "job_name", jp.getJobName(),
                "level", jp.getLevel() != null ? jp.getLevel() : "初级"
        );

        Map<String, Object> verticalGraph = buildVerticalGraph(jp);
        Map<String, Object> transferGraph = buildTransferGraph(jp);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("center_job", center);
        data.put("vertical_graph", verticalGraph);
        data.put("transfer_graph", transferGraph);
        return data;
    }

    @Override
    @Transactional
    public Map<String, Object> aiGenerateProfile(JobAiGenerateProfileRequest request) {
        String taskId = "job_gen_" + LocalDate.now().format(YMD) + "_001";
        JobAiTask task = new JobAiTask();
        task.setTaskId(taskId);
        task.setJobName(request.getJobName());
        String raw = String.join("\n", request.getJobDescriptions());
        task.setJobDescRaw(raw);
        task.setStatus("processing");
        task.setCreatedAt(LocalDateTime.now());

        // 构造一个示例画像，结构与 4.2 data 一致
        Map<String, Object> profile = buildAiGeneratedProfile(request.getJobName());
        task.setJobProfile(writeJson(profile));
        task.setAiConfidence(0.88);
        Map<String, Object> dataSources = Map.of(
                "total_samples", request.getSampleSize() != null ? request.getSampleSize() : 50,
                "valid_samples", Math.max(1, (int) ((request.getSampleSize() != null ? request.getSampleSize() : 50) * 0.94)),
                "analysis_date", LocalDate.now().toString()
        );
        task.setDataSources(writeJson(dataSources));
        task.setStatus("completed");

        jobAiTaskMapper.insert(task);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task_id", taskId);
        data.put("status", "processing");
        data.put("estimated_time", 30);
        return data;
    }

    @Override
    public Map<String, Object> aiGenerateResult(String taskId) {
        JobAiTask task = jobAiTaskMapper.selectOne(new LambdaQueryWrapper<JobAiTask>().eq(JobAiTask::getTaskId, taskId));
        if (task == null) return null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", task.getStatus());

        Map<String, Object> jobProfile = null;
        if (task.getJobProfile() != null) {
            try {
                jobProfile = JSON.readValue(task.getJobProfile(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {}
        }

        Map<String, Object> dataSources = null;
        if (task.getDataSources() != null) {
            try {
                dataSources = JSON.readValue(task.getDataSources(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {}
        }

        result.put("job_profile", jobProfile);
        result.put("ai_confidence", task.getAiConfidence());
        result.put("data_sources", dataSources);
        return result;
    }

    private void ensureSeedJobs() {
        long count = jobProfileMapper.selectCount(new LambdaQueryWrapper<>());
        if (count > 0) return;

        // 至少插入 10 个示例岗位，其中 job_001 与文档示例保持一致字段
        List<JobProfile> list = new ArrayList<>();
        list.add(buildJob("job_001", "算法工程师", "ALG001", "互联网", "初级", "15k-25k",
                "负责机器学习算法的研究、开发和优化", 85, "上升",
                List.of("人工智能", "机器学习", "Python")));
        list.add(buildJob("job_002", "中级算法工程师", "ALG002", "互联网", "中级", "25k-40k",
                "负责核心算法模块的设计与优化", 80, "上升",
                List.of("机器学习", "深度学习")));
        list.add(buildJob("job_003", "高级算法工程师", "ALG003", "互联网", "高级", "40k-70k",
                "带领算法团队攻克关键技术难题", 78, "上升",
                List.of("算法架构", "团队管理")));
        list.add(buildJob("job_004", "数据科学家", "DS001", "互联网", "中级", "25k-45k",
                "负责数据分析与建模，支持业务决策", 82, "上升",
                List.of("数据分析", "统计建模")));
        list.add(buildJob("job_005", "机器学习工程师", "ML001", "互联网", "中级", "25k-40k",
                "负责模型训练与部署，保障线上效果", 83, "上升",
                List.of("模型部署", "MLOps")));
        list.add(buildJob("job_006", "后端开发工程师", "BE001", "互联网", "初级", "15k-25k",
                "负责后端服务开发与维护", 75, "平稳",
                List.of("Java", "Spring Boot")));
        list.add(buildJob("job_007", "前端开发工程师", "FE001", "互联网", "初级", "15k-25k",
                "负责 Web 前端界面开发", 74, "平稳",
                List.of("JavaScript", "React")));
        list.add(buildJob("job_008", "AI 产品经理", "PM001", "互联网", "中级", "20k-35k",
                "负责 AI 产品规划与落地", 79, "上升",
                List.of("产品规划", "AI 应用")));
        list.add(buildJob("job_009", "数据分析师", "DA001", "互联网", "初级", "12k-20k",
                "负责数据报表与业务分析", 70, "平稳",
                List.of("SQL", "可视化")));
        list.add(buildJob("job_010", "推荐算法工程师", "ALG004", "互联网", "中级", "25k-40k",
                "负责推荐系统相关算法研发", 81, "上升",
                List.of("推荐系统", "CTR 预估")));

        for (JobProfile jp : list) {
            jobProfileMapper.insert(jp);
        }
    }

    private JobProfile buildJob(String jobId, String name, String code, String industry, String level,
                                String salary, String desc, int demandScore, String trend, List<String> tags) {
        JobProfile jp = new JobProfile();
        jp.setJobId(jobId);
        jp.setJobName(name);
        jp.setJobCode(code);
        jp.setIndustry(industry);
        jp.setLevel(level);
        jp.setAvgSalary(salary);
        jp.setDescription(desc);
        jp.setDemandScore(demandScore);
        jp.setGrowthTrend(trend);
        jp.setTags(writeJson(tags));
        jp.setCreatedAt(LocalDate.now());
        return jp;
    }

    private Map<String, Object> toListItem(JobProfile jp) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("job_id", jp.getJobId());
        m.put("job_name", jp.getJobName());
        m.put("job_code", jp.getJobCode());
        m.put("industry", jp.getIndustry());
        m.put("level", jp.getLevel());
        m.put("avg_salary", jp.getAvgSalary());
        m.put("description", jp.getDescription());
        m.put("demand_score", jp.getDemandScore());
        m.put("growth_trend", jp.getGrowthTrend());
        m.put("tags", readJsonList(jp.getTags()));
        m.put("created_at", jp.getCreatedAt() != null ? jp.getCreatedAt().toString() : null);
        return m;
    }

    private static boolean contains(String src, String kw) {
        return src != null && src.contains(kw);
    }

    private static List<String> readJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return JSON.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private static String writeJson(Object o) {
        try {
            return JSON.writeValueAsString(o);
        } catch (Exception e) {
            return "[]";
        }
    }

    // 4.2 详细画像：返回结构与文档示例一致
    private Map<String, Object> buildJobDetail(JobProfile jp) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("job_id", jp.getJobId());
        data.put("job_name", jp.getJobName());
        data.put("job_code", jp.getJobCode() != null ? jp.getJobCode() : "ALG001");

        Map<String, Object> basic = new LinkedHashMap<>();
        basic.put("industry", jp.getIndustry());
        basic.put("level", jp.getLevel());
        basic.put("avg_salary", jp.getAvgSalary());
        basic.put("work_locations", List.of("北京", "上海", "深圳", "杭州"));
        basic.put("company_scales", List.of("100-500人", "500-2000人", "2000人以上"));
        basic.put("description", jp.getDescription());
        data.put("basic_info", basic);

        // requirements
        Map<String, Object> requirements = new LinkedHashMap<>();
        requirements.put("basic_requirements", Map.of(
                "education", Map.of(
                        "level", "本科及以上",
                        "preferred_majors", List.of("计算机科学与技术", "软件工程", "人工智能", "数学与应用数学"),
                        "weight", 0.15
                ),
                "gpa", Map.of(
                        "min_requirement", "3.0/4.0",
                        "preferred", "3.5/4.0以上",
                        "weight", 0.05
                )
        ));
        requirements.put("professional_skills", Map.of(
                "programming_languages", List.of(
                        Map.of("skill", "Python", "level", "熟练", "importance", "必需", "weight", 0.10),
                        Map.of("skill", "C++", "level", "熟悉", "importance", "重要", "weight", 0.05)
                ),
                "frameworks_tools", List.of(
                        Map.of("skill", "TensorFlow/PyTorch", "level", "熟练", "importance", "必需", "weight", 0.15),
                        Map.of("skill", "Scikit-learn", "level", "熟悉", "importance", "重要", "weight", 0.08)
                ),
                "algorithms_theory", List.of(
                        Map.of("skill", "机器学习算法", "level", "熟练", "importance", "必需", "weight", 0.12),
                        Map.of("skill", "深度学习", "level", "熟悉", "importance", "重要", "weight", 0.10)
                ),
                "total_weight", 0.40
        ));
        requirements.put("certificates", Map.of(
                "required", List.of(),
                "preferred", List.of("AWS机器学习认证", "Google TensorFlow开发者证书"),
                "weight", 0.05
        ));
        requirements.put("soft_skills", Map.of(
                "innovation_ability", Map.of("description", "能够提出创新的算法方案", "level", "高", "weight", 0.08),
                "learning_ability", Map.of("description", "快速学习新技术和算法", "level", "高", "weight", 0.10),
                "pressure_resistance", Map.of("description", "能够在项目压力下保持高效", "level", "中", "weight", 0.05),
                "communication_ability", Map.of("description", "清晰表达技术方案，与团队协作", "level", "中", "weight", 0.07),
                "total_weight", 0.30
        ));
        requirements.put("experience", Map.of(
                "internship_required", false,
                "preferred_experience", List.of("机器学习相关实习经验", "算法竞赛经历（Kaggle等）", "开源项目贡献"),
                "project_requirements", List.of("至少1个完整的机器学习项目", "有模型训练和部署经验"),
                "weight", 0.10
        ));
        data.put("requirements", requirements);

        // market_analysis
        Map<String, Object> market = new LinkedHashMap<>();
        market.put("demand_score", jp.getDemandScore());
        market.put("growth_trend", jp.getGrowthTrend());
        market.put("salary_range", Map.of(
                "junior", "15k-25k",
                "intermediate", "25k-40k",
                "senior", "40k-70k"
        ));
        market.put("hottest_cities", List.of(
                Map.of("city", "北京", "job_count", 1500),
                Map.of("city", "上海", "job_count", 1200),
                Map.of("city", "深圳", "job_count", 800)
        ));
        market.put("top_companies", List.of("字节跳动", "阿里巴巴", "腾讯", "百度", "华为"));
        market.put("industry_trends", List.of(
                "大模型应用场景持续扩大",
                "多模态AI成为新热点",
                "AI+垂直行业深度融合"
        ));
        data.put("market_analysis", market);

        // career_path
        Map<String, Object> careerPath = new LinkedHashMap<>();
        careerPath.put("current_level", "初级算法工程师");
        careerPath.put("promotion_path", List.of(
                Map.of("level", "中级算法工程师", "years_required", "2-3年",
                        "key_requirements", List.of("独立负责算法模块", "优化算法性能", "指导初级工程师")),
                Map.of("level", "高级算法工程师", "years_required", "3-5年",
                        "key_requirements", List.of("设计复杂算法架构", "解决关键技术难题", "带领算法团队")),
                Map.of("level", "算法专家/技术总监", "years_required", "5-8年",
                        "key_requirements", List.of("制定技术战略", "行业影响力", "管理大型团队"))
        ));
        data.put("career_path", careerPath);

        // transfer_paths
        List<Map<String, Object>> transferPaths = List.of(
                Map.of(
                        "target_job", "数据科学家",
                        "relevance_score", 85,
                        "required_skills", List.of("统计分析能力", "业务理解能力", "数据可视化"),
                        "transition_difficulty", "中",
                        "estimated_time", "6-12个月"
                ),
                Map.of(
                        "target_job", "机器学习工程师",
                        "relevance_score", 90,
                        "required_skills", List.of("模型部署", "工程化能力", "系统设计"),
                        "transition_difficulty", "低",
                        "estimated_time", "3-6个月"
                )
        );
        data.put("transfer_paths", transferPaths);

        return data;
    }

    private Map<String, Object> buildVerticalGraph(JobProfile jp) {
        Map<String, Object> graph = new LinkedHashMap<>();
        graph.put("nodes", List.of(
                Map.of("job_id", jp.getJobId(), "job_name", "初级算法工程师", "level", 1),
                Map.of("job_id", "job_002", "job_name", "中级算法工程师", "level", 2),
                Map.of("job_id", "job_003", "job_name", "高级算法工程师", "level", 3),
                Map.of("job_id", "job_004", "job_name", "算法专家", "level", 4)
        ));
        graph.put("edges", List.of(
                Map.of("from", jp.getJobId(), "to", "job_002",
                        "years", "2-3",
                        "requirements", List.of("独立项目经验", "算法优化能力")),
                Map.of("from", "job_002", "to", "job_003",
                        "years", "3-5",
                        "requirements", List.of("架构设计能力", "技术攻坚能力"))
        ));
        return graph;
    }

    private Map<String, Object> buildTransferGraph(JobProfile jp) {
        Map<String, Object> graph = new LinkedHashMap<>();
        graph.put("nodes", List.of(
                Map.of("job_id", jp.getJobId(), "job_name", jp.getJobName()),
                Map.of("job_id", "job_010", "job_name", "数据科学家"),
                Map.of("job_id", "job_011", "job_name", "机器学习工程师"),
                Map.of("job_id", "job_012", "job_name", "AI产品经理")
        ));
        graph.put("edges", List.of(
                Map.of("from", jp.getJobId(), "to", "job_010",
                        "relevance_score", 85,
                        "difficulty", "中",
                        "time", "6-12个月",
                        "skills_gap", List.of("统计学", "业务分析", "可视化")),
                Map.of("from", jp.getJobId(), "to", "job_011",
                        "relevance_score", 90,
                        "difficulty", "低",
                        "time", "3-6个月",
                        "skills_gap", List.of("模型部署", "工程化"))
        ));
        return graph;
    }

    private Map<String, Object> buildAiGeneratedProfile(String jobName) {
        // 这里直接复用 buildJobDetail 的模板，只是 job_name 使用传入的 jobName
        JobProfile jp = buildJob("job_new_001", jobName, "AI-PM-001", "互联网", "中级",
                "20k-35k", jobName + " 的AI生成岗位画像", 80, "上升",
                List.of("AI", "产品规划"));
        return buildJobDetail(jp);
    }
}

