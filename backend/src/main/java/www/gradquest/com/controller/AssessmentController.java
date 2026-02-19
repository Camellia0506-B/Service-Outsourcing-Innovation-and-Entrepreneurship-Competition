package www.gradquest.com.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.assessment.*;
import www.gradquest.com.service.AssessmentService;

import java.util.Map;

/**
 * 职业测评模块（API 文档 3）
 */
@RestController
@RequestMapping("/assessment")
@RequiredArgsConstructor
@Validated
public class AssessmentController {

    private final AssessmentService assessmentService;

    /**
     * 3.1 获取测评问卷
     */
    @PostMapping("/questionnaire")
    public ApiResponse<AssessmentQuestionnaireResponse> questionnaire(@RequestBody @Valid AssessmentQuestionnaireRequest request) {
        return ApiResponse.success("success", assessmentService.questionnaire(request));
    }

    /**
     * 3.2 提交测评答案
     */
    @PostMapping("/submit")
    public ApiResponse<AssessmentSubmitResponse> submit(@RequestBody @Valid AssessmentSubmitRequest request) {
        return ApiResponse.success("测评提交成功，正在生成报告...", assessmentService.submit(request));
    }

    /**
     * 3.3 获取测评报告
     */
    @PostMapping("/report")
    public ApiResponse<Map<String, Object>> report(@RequestBody @Valid AssessmentReportRequest request) {
        Map<String, Object> data = assessmentService.report(request);
        if (data == null) {
            return ApiResponse.failure(404, "资源不存在");
        }
        return ApiResponse.success("success", data);
    }
}

