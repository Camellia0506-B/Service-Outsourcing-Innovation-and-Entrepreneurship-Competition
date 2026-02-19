package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import www.gradquest.com.dto.assessment.*;
import www.gradquest.com.entity.AssessmentReport;
import www.gradquest.com.entity.AssessmentSubmission;
import www.gradquest.com.mapper.AssessmentReportMapper;
import www.gradquest.com.mapper.AssessmentSubmissionMapper;
import www.gradquest.com.service.AssessmentService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentServiceImpl implements AssessmentService {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AssessmentSubmissionMapper submissionMapper;
    private final AssessmentReportMapper reportMapper;

    @Override
    public AssessmentQuestionnaireResponse questionnaire(AssessmentQuestionnaireRequest request) {
        String assessmentId = "assess_" + LocalDate.now().format(YMD) + "_" + request.getUserId();
        boolean quick = "quick".equalsIgnoreCase(request.getAssessmentType());
        int estimatedTime = quick ? 5 : 15;

        // 简化版示例问卷：结构严格对齐文档（dimensions -> questions -> options）
        List<AssessmentQuestionnaireResponse.Dimension> dimensions = List.of(
                dimInterest(),
                dimPersonality(),
                dimAbility(),
                dimValues()
        );
        int totalQuestions = dimensions.stream().mapToInt(d -> d.getQuestions() != null ? d.getQuestions().size() : 0).sum();

        return AssessmentQuestionnaireResponse.builder()
                .assessmentId(assessmentId)
                .totalQuestions(totalQuestions)
                .estimatedTime(estimatedTime)
                .dimensions(dimensions)
                .build();
    }

    @Override
    @Transactional
    public AssessmentSubmitResponse submit(AssessmentSubmitRequest request) {
        // 保存答卷（按 assessment_id 唯一）
        AssessmentSubmission submission = submissionMapper.selectOne(
                new LambdaQueryWrapper<AssessmentSubmission>().eq(AssessmentSubmission::getAssessmentId, request.getAssessmentId())
        );
        if (submission == null) {
            submission = new AssessmentSubmission();
            submission.setAssessmentId(request.getAssessmentId());
            submission.setCreatedAt(LocalDateTime.now());
        }
        submission.setUserId(request.getUserId());
        submission.setAssessmentType(inferTypeFromAssessmentId(request.getAssessmentId()));
        submission.setTimeSpent(request.getTimeSpent());
        submission.setAnswers(writeJsonSafely(request.getAnswers()));

        if (submission.getId() == null) submissionMapper.insert(submission);
        else submissionMapper.updateById(submission);

        // 创建/更新报告（按 report_id 唯一）
        String reportId = "report_" + LocalDate.now().format(YMD) + "_" + request.getUserId();
        AssessmentReport report = reportMapper.selectOne(
                new LambdaQueryWrapper<AssessmentReport>().eq(AssessmentReport::getReportId, reportId)
        );
        if (report == null) {
            report = new AssessmentReport();
            report.setReportId(reportId);
            report.setCreatedAt(LocalDateTime.now());
        }
        report.setUserId(request.getUserId());
        report.setAssessmentId(request.getAssessmentId());
        report.setStatus("completed"); // 这里同步生成示例报告，直接置为 completed
        report.setAssessmentDate(LocalDate.now());

        Map<String, Object> reportData = buildMockReport(reportId, request.getUserId(), LocalDate.now());
        report.setReportData(writeJsonSafely(reportData));

        if (report.getId() == null) reportMapper.insert(report);
        else reportMapper.updateById(report);

        // 按文档，submit 接口返回 status=processing（报告可稍后拉取）
        return AssessmentSubmitResponse.builder()
                .reportId(reportId)
                .status("processing")
                .build();
    }

    @Override
    public Map<String, Object> report(AssessmentReportRequest request) {
        AssessmentReport report = reportMapper.selectOne(
                new LambdaQueryWrapper<AssessmentReport>()
                        .eq(AssessmentReport::getReportId, request.getReportId())
                        .eq(AssessmentReport::getUserId, request.getUserId())
        );
        if (report == null) {
            return null;
        }
        if (report.getReportData() == null || report.getReportData().isBlank()) {
            // 保底：没有 report_data 时也返回基础结构
            return buildMockReport(report.getReportId(), report.getUserId(), report.getAssessmentDate() != null ? report.getAssessmentDate() : LocalDate.now());
        }
        try {
            return JSON.readValue(report.getReportData(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return buildMockReport(report.getReportId(), report.getUserId(), report.getAssessmentDate() != null ? report.getAssessmentDate() : LocalDate.now());
        }
    }

    private static String inferTypeFromAssessmentId(String assessmentId) {
        // assessment_id 示例：assess_yyyyMMdd_userId；这里无法确定 type，默认 comprehensive
        return "comprehensive";
    }

    private static String writeJsonSafely(Object obj) {
        try {
            return JSON.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static AssessmentQuestionnaireResponse.Dimension dimInterest() {
        return AssessmentQuestionnaireResponse.Dimension.builder()
                .dimensionId("interest")
                .dimensionName("职业兴趣")
                .questions(List.of(
                        AssessmentQuestionnaireResponse.Question.builder()
                                .questionId("q001")
                                .questionText("你更喜欢哪种工作方式？")
                                .questionType("single_choice")
                                .options(List.of(
                                        opt("A", "独立完成任务"),
                                        opt("B", "团队协作完成"),
                                        opt("C", "两者都可以")
                                ))
                                .build(),
                        AssessmentQuestionnaireResponse.Question.builder()
                                .questionId("q002")
                                .questionText("你更倾向于从事哪类任务？")
                                .questionType("multiple_choice")
                                .options(List.of(
                                        opt("A", "分析研究"),
                                        opt("B", "动手实践"),
                                        opt("C", "创意表达"),
                                        opt("D", "组织协调")
                                ))
                                .build()
                ))
                .build();
    }

    private static AssessmentQuestionnaireResponse.Dimension dimPersonality() {
        return AssessmentQuestionnaireResponse.Dimension.builder()
                .dimensionId("personality")
                .dimensionName("性格特质")
                .questions(List.of(
                        AssessmentQuestionnaireResponse.Question.builder()
                                .questionId("q003")
                                .questionText("你在社交场合更常：")
                                .questionType("single_choice")
                                .options(List.of(
                                        opt("A", "主动结识新朋友"),
                                        opt("B", "更喜欢熟人小圈子"),
                                        opt("C", "视情况而定")
                                ))
                                .build()
                ))
                .build();
    }

    private static AssessmentQuestionnaireResponse.Dimension dimAbility() {
        return AssessmentQuestionnaireResponse.Dimension.builder()
                .dimensionId("ability")
                .dimensionName("能力倾向")
                .questions(List.of(
                        AssessmentQuestionnaireResponse.Question.builder()
                                .questionId("q004")
                                .questionText("你认为自己的逻辑分析能力如何？")
                                .questionType("scale")
                                .options(List.of(
                                        opt("1", "1"),
                                        opt("2", "2"),
                                        opt("3", "3"),
                                        opt("4", "4"),
                                        opt("5", "5")
                                ))
                                .build()
                ))
                .build();
    }

    private static AssessmentQuestionnaireResponse.Dimension dimValues() {
        return AssessmentQuestionnaireResponse.Dimension.builder()
                .dimensionId("values")
                .dimensionName("职业价值观")
                .questions(List.of(
                        AssessmentQuestionnaireResponse.Question.builder()
                                .questionId("q005")
                                .questionText("以下哪些对你更重要？")
                                .questionType("multiple_choice")
                                .options(List.of(
                                        opt("A", "成就感"),
                                        opt("B", "学习发展"),
                                        opt("C", "工作稳定"),
                                        opt("D", "收入回报")
                                ))
                                .build()
                ))
                .build();
    }

    private static AssessmentQuestionnaireResponse.Option opt(String id, String text) {
        return AssessmentQuestionnaireResponse.Option.builder().optionId(id).optionText(text).build();
    }

    /**
     * 生成一份结构严格对齐文档 3.3 的示例报告
     */
    private static Map<String, Object> buildMockReport(String reportId, Long userId, LocalDate date) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("report_id", reportId);
        data.put("user_id", userId);
        data.put("assessment_date", date != null ? date.toString() : LocalDate.now().toString());
        data.put("status", "completed");

        // interest_analysis
        Map<String, Object> interest = new LinkedHashMap<>();
        interest.put("holland_code", "RIA");
        interest.put("primary_interest", Map.of(
                "type", "研究型(I)",
                "score", 85,
                "description", "喜欢观察、学习、研究、分析、评估和解决问题"
        ));
        interest.put("interest_distribution", List.of(
                Map.of("type", "研究型(I)", "score", 85),
                Map.of("type", "实用型(R)", "score", 72),
                Map.of("type", "艺术型(A)", "score", 65)
        ));
        interest.put("suitable_fields", List.of("软件开发", "数据分析", "算法工程师", "人工智能研发"));
        data.put("interest_analysis", interest);

        // personality_analysis
        Map<String, Object> personality = new LinkedHashMap<>();
        personality.put("mbti_type", "INTJ");
        personality.put("traits", List.of(
                Map.of("trait_name", "外向性", "score", 45, "level", "偏内向", "description", "更倾向于独立思考和深度工作"),
                Map.of("trait_name", "开放性", "score", 82, "level", "高", "description", "对新事物充满好奇，善于学习新技能"),
                Map.of("trait_name", "尽责性", "score", 78, "level", "高", "description", "做事认真负责，注重细节")
        ));
        data.put("personality_analysis", personality);

        // ability_analysis
        Map<String, Object> ability = new LinkedHashMap<>();
        ability.put("strengths", List.of(
                Map.of("ability", "逻辑分析能力", "score", 88, "description", "擅长发现问题本质和规律"),
                Map.of("ability", "学习能力", "score", 85, "description", "能够快速掌握新知识和技能")
        ));
        ability.put("areas_to_improve", List.of(
                Map.of("ability", "沟通表达能力", "score", 62, "suggestions", List.of("多参加团队讨论和技术分享", "练习清晰表达技术方案"))
        ));
        data.put("ability_analysis", ability);

        // values_analysis
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("top_values", List.of(
                Map.of("value", "成就感", "score", 90, "description", "追求技术突破和个人成长"),
                Map.of("value", "学习发展", "score", 88, "description", "重视持续学习和能力提升")
        ));
        data.put("values_analysis", values);

        // recommendations
        Map<String, Object> recommendations = new LinkedHashMap<>();
        recommendations.put("suitable_careers", List.of(
                Map.of(
                        "career", "算法工程师",
                        "match_score", 92,
                        "reasons", List.of("与你的研究型兴趣高度匹配", "充分发挥逻辑分析和学习能力", "符合追求成就感的价值观")
                ),
                Map.of(
                        "career", "后端开发工程师",
                        "match_score", 87,
                        "reasons", List.of("技术栈适配度高", "成长路径清晰", "有较强的市场需求")
                )
        ));
        recommendations.put("development_suggestions", List.of(
                "加强沟通表达能力的训练",
                "多参与团队项目提升协作能力",
                "保持技术深度的同时拓展技术广度"
        ));
        data.put("recommendations", recommendations);

        return data;
    }
}

