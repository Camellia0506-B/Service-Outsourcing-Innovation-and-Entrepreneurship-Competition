package www.gradquest.com.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.dto.hr.BrowseStudentsResult;
import www.gradquest.com.service.HrService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/hr")
@RequiredArgsConstructor
@Validated
public class HrController {

    private static final long LICENSE_MAX_SIZE = 10 * 1024 * 1024;
    private static final Set<String> LICENSE_ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/jpg", "application/pdf");

    private final HrService hrService;

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<HrRegisterResponse> register(@ModelAttribute HrRegisterRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            return ApiResponse.badRequest("用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ApiResponse.badRequest("密码不能为空");
        }
        if (request.getRealName() == null || request.getRealName().isBlank()) {
            return ApiResponse.badRequest("真实姓名不能为空");
        }
        if (request.getCompanyName() == null || request.getCompanyName().isBlank()) {
            return ApiResponse.badRequest("企业名称不能为空");
        }
        if (request.getCompanySize() == null || request.getCompanySize().isBlank()) {
            return ApiResponse.badRequest("企业规模不能为空");
        }
        if (request.getIndustry() == null || request.getIndustry().isBlank()) {
            return ApiResponse.badRequest("行业不能为空");
        }
        if (request.getHrRole() == null || request.getHrRole().isBlank()) {
            return ApiResponse.badRequest("岗位不能为空");
        }
        if (request.getBusinessLicense() != null && !request.getBusinessLicense().isEmpty()) {
            if (request.getBusinessLicense().getSize() > LICENSE_MAX_SIZE) {
                return ApiResponse.badRequest("营业执照文件不能超过 10MB");
            }
            String contentType = request.getBusinessLicense().getContentType();
            if (contentType == null || !LICENSE_ALLOWED_TYPES.contains(contentType.toLowerCase())) {
                return ApiResponse.badRequest("营业执照仅支持 jpg/png/pdf 格式");
            }
        }

        HrRegisterResponse data = hrService.register(
                request.getUsername(),
                request.getPassword(),
                request.getRealName(),
                request.getCompanyName(),
                request.getCompanySize(),
                request.getIndustry(),
                request.getHrRole(),
                request.getBusinessLicense()
        );
        return ApiResponse.success("注册成功，等待平台审核", data);
    }

    @PostMapping("/login")
    public ApiResponse<HrLoginResponse> login(@RequestBody @Validated HrLoginRequest request) {
        HrLoginResponse data = hrService.login(request.getUsername(), request.getPassword());
        if (data == null) {
            return ApiResponse.failure(400, "用户名或密码错误");
        }
        return ApiResponse.success("登录成功", data);
    }

    @GetMapping("/students/browse")
    public ApiResponse<BrowseStudentsResult> browseStudents(
            @RequestParam("hr_id") Long hrId,
            @RequestParam(value = "target_job", required = false) String targetJob,
            @RequestParam(value = "min_match_score", required = false) Integer minMatchScore,
            @RequestParam(value = "education_level", required = false) String educationLevel,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        BrowseStudentsResult result = hrService.browseStudents(hrId, targetJob, minMatchScore, educationLevel, page, size);
        return ApiResponse.success("success", result);
    }

    @GetMapping("/students/detail")
    public ApiResponse<Map<String, Object>> getStudentDetail(@RequestParam("anonymous_id") String anonymousId) {
        if (anonymousId == null || anonymousId.isBlank()) {
            return ApiResponse.badRequest("anonymous_id 不能为空");
        }
        Map<String, Object> data = hrService.getStudentDetailByAnonymousId(anonymousId);
        if (data == null) {
            return ApiResponse.failure(404, "未找到该学生档案");
        }
        return ApiResponse.success("success", data);
    }

    @GetMapping("/evaluation/invitations")
    public ApiResponse<GetInvitationsResponse> getInvitations(
            @RequestParam("hr_id") Long hrId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size) {
        
        List<GetInvitationsResponse.InvitationItem> invitations = new ArrayList<>();
        
        invitations.add(GetInvitationsResponse.InvitationItem.builder()
                .invitationId("inv_001")
                .anonymousStudentId("student_001")
                .targetJob("算法工程师")
                .message("您好，我们公司正在招聘算法工程师，看到您的简历后很感兴趣，希望邀请您参与一次评估交流。")
                .status("pending")
                .sentAt("2025-03-10 15:00:00")
                .build());
        
        invitations.add(GetInvitationsResponse.InvitationItem.builder()
                .invitationId("inv_002")
                .anonymousStudentId("student_002")
                .targetJob("后端开发工程师")
                .message("您好，我们正在招聘后端开发工程师，您的经历非常匹配，期待与您交流。")
                .status("accepted")
                .sentAt("2025-03-09 10:30:00")
                .build());
        
        GetInvitationsResponse response = GetInvitationsResponse.builder()
                .total(invitations.size())
                .list(invitations)
                .build();
        
        return ApiResponse.success("success", response);
    }

    @PostMapping("/evaluation/invite")
    public ApiResponse<InviteStudentResponse> inviteStudent(@RequestBody InviteStudentRequest request) {
        if (request.getHrId() == null) {
            return ApiResponse.badRequest("HR ID不能为空");
        }
        if (request.getAnonymousStudentId() == null || request.getAnonymousStudentId().isBlank()) {
            return ApiResponse.badRequest("学生ID不能为空");
        }
        if (request.getTargetJob() == null || request.getTargetJob().isBlank()) {
            return ApiResponse.badRequest("目标岗位不能为空");
        }
        
        InviteStudentResponse response = InviteStudentResponse.builder()
                .invitationId("inv_" + System.currentTimeMillis())
                .status("pending")
                .sentAt("2025-03-10 15:00:00")
                .build();
        
        return ApiResponse.success("邀请已发送，等待学生确认", response);
    }

    @GetMapping("/evaluation/evaluations")
    public ApiResponse<GetEvaluationsResponse> getEvaluations(
            @RequestParam("hr_id") Long hrId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size) {
        
        List<GetEvaluationsResponse.EvaluationItem> evaluations = new ArrayList<>();
        
        evaluations.add(GetEvaluationsResponse.EvaluationItem.builder()
                .evaluationId("eval_001")
                .invitationId("inv_002")
                .anonymousStudentId("student_002")
                .targetJob("后端开发工程师")
                .status("in_progress")
                .createdAt("2025-03-09 11:00:00")
                .build());
        
        evaluations.add(GetEvaluationsResponse.EvaluationItem.builder()
                .evaluationId("eval_003")
                .invitationId("inv_003")
                .anonymousStudentId("student_003")
                .targetJob("算法工程师")
                .status("completed")
                .createdAt("2025-03-08 14:00:00")
                .submittedAt("2025-03-08 16:30:00")
                .overallImpression("good")
                .hiringIntent("strong")
                .build());
        
        GetEvaluationsResponse response = GetEvaluationsResponse.builder()
                .total(evaluations.size())
                .list(evaluations)
                .build();
        
        return ApiResponse.success("success", response);
    }

    @PostMapping("/evaluation/{evaluation_id}/submit")
    public ApiResponse<SubmitEvaluationResponse> submitEvaluation(
            @PathVariable("evaluation_id") String evaluationId,
            @RequestBody SubmitEvaluationRequest request) {
        if (request.getHrId() == null) {
            return ApiResponse.badRequest("HR ID不能为空");
        }
        if (request.getEvaluationForm() == null) {
            return ApiResponse.badRequest("评估表单不能为空");
        }
        
        SubmitEvaluationResponse response = SubmitEvaluationResponse.builder()
                .evaluationId(evaluationId)
                .status("completed")
                .profileUpdated(true)
                .submittedAt("2025-03-12 16:30:00")
                .build();
        
        return ApiResponse.success("评估提交成功", response);
    }

    @Data
    private static class HrRegisterRequest {
        private String username;
        private String password;
        private String realName;
        private String real_name;
        private String companyName;
        private String company_name;
        private String companySize;
        private String company_size;
        private String industry;
        private String hrRole;
        private String hr_role;
        private MultipartFile businessLicense;
        private MultipartFile business_license;

        public String getUsername() {
            return username;
        }

        public String getPassword() {
            return password;
        }

        public String getRealName() {
            return realName != null ? realName : real_name;
        }

        public String getCompanyName() {
            return companyName != null ? companyName : company_name;
        }

        public String getCompanySize() {
            return companySize != null ? companySize : company_size;
        }

        public String getIndustry() {
            return industry;
        }

        public String getHrRole() {
            return hrRole != null ? hrRole : hr_role;
        }

        public MultipartFile getBusinessLicense() {
            return businessLicense != null ? businessLicense : business_license;
        }
    }

    @Data
    private static class HrLoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class GetInvitationsResponse {
        private Integer total;
        private List<InvitationItem> list;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        private static class InvitationItem {
            @JsonProperty("invitation_id")
            private String invitationId;
            @JsonProperty("anonymous_student_id")
            private String anonymousStudentId;
            @JsonProperty("target_job")
            private String targetJob;
            private String message;
            private String status;
            @JsonProperty("sent_at")
            private String sentAt;
        }
    }

    @Data
    private static class InviteStudentRequest {
        @JsonProperty("hr_id")
        private Long hrId;
        @JsonProperty("anonymous_student_id")
        private String anonymousStudentId;
        @JsonProperty("target_job")
        private String targetJob;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class InviteStudentResponse {
        @JsonProperty("invitation_id")
        private String invitationId;
        private String status;
        @JsonProperty("sent_at")
        private String sentAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class GetEvaluationsResponse {
        private Integer total;
        private List<EvaluationItem> list;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        private static class EvaluationItem {
            @JsonProperty("evaluation_id")
            private String evaluationId;
            @JsonProperty("invitation_id")
            private String invitationId;
            @JsonProperty("anonymous_student_id")
            private String anonymousStudentId;
            @JsonProperty("target_job")
            private String targetJob;
            private String status;
            @JsonProperty("created_at")
            private String createdAt;
            @JsonProperty("submitted_at")
            private String submittedAt;
            @JsonProperty("overall_impression")
            private String overallImpression;
            @JsonProperty("hiring_intent")
            private String hiringIntent;
        }
    }

    @Data
    private static class SubmitEvaluationRequest {
        @JsonProperty("hr_id")
        private Long hrId;
        @JsonProperty("evaluation_id")
        private String evaluationId;
        @JsonProperty("evaluation_form")
        private EvaluationForm evaluationForm;

        @Data
        public static class EvaluationForm {
            @JsonProperty("overall_impression")
            private String overallImpression;
            @JsonProperty("dimension_scores")
            private java.util.Map<String, Integer> dimensionScores;
            @JsonProperty("hiring_intent")
            private String hiringIntent;
            @JsonProperty("strengths_noted")
            private String strengthsNoted;
            @JsonProperty("weaknesses_noted")
            private String weaknessesNoted;
            @JsonProperty("recommended_positions")
            private List<String> recommendedPositions;
            @JsonProperty("evaluation_basis")
            private String evaluationBasis;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class SubmitEvaluationResponse {
        @JsonProperty("evaluation_id")
        private String evaluationId;
        private String status;
        @JsonProperty("profile_updated")
        private Boolean profileUpdated;
        @JsonProperty("submitted_at")
        private String submittedAt;
    }
}
