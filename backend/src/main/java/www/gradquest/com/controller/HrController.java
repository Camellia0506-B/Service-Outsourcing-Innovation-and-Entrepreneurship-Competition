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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.service.HrService;

import java.util.ArrayList;
import java.util.List;
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
    public ApiResponse<BrowseStudentsResponse> browseStudents(
            @RequestParam("hr_id") Long hrId,
            @RequestParam(value = "target_job", required = false) String targetJob,
            @RequestParam(value = "min_match_score", required = false, defaultValue = "0") Integer minMatchScore,
            @RequestParam(value = "education_level", required = false) String educationLevel,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size) {
        
        List<BrowseStudentsResponse.StudentItem> students = new ArrayList<>();
        
        students.add(BrowseStudentsResponse.StudentItem.builder()
                .anonymousId("student_anon_001")
                .educationLevel("本科")
                .majorCategory("计算机科学与技术")
                .gpaLevel("优秀（3.7+）")
                .systemMatchScore(88)
                .abilityTags(List.of("Python", "机器学习", "数据分析", "项目管理"))
                .highlight("主导开发AI辅助系统，具备独立项目落地经验")
                .isOpenToContact(true)
                .build());
        
        students.add(BrowseStudentsResponse.StudentItem.builder()
                .anonymousId("student_anon_002")
                .educationLevel("硕士")
                .majorCategory("软件工程")
                .gpaLevel("良好（3.3-3.7）")
                .systemMatchScore(92)
                .abilityTags(List.of("Java", "Spring Boot", "微服务", "Docker"))
                .highlight("在大型互联网公司有实习经验，参与过百万级用户产品开发")
                .isOpenToContact(true)
                .build());
        
        students.add(BrowseStudentsResponse.StudentItem.builder()
                .anonymousId("student_anon_003")
                .educationLevel("本科")
                .majorCategory("人工智能")
                .gpaLevel("优秀（3.8+）")
                .systemMatchScore(85)
                .abilityTags(List.of("深度学习", "PyTorch", "计算机视觉", "NLP"))
                .highlight("发表过会议论文，有算法竞赛获奖经历")
                .isOpenToContact(true)
                .build());
        
        students.add(BrowseStudentsResponse.StudentItem.builder()
                .anonymousId("student_anon_004")
                .educationLevel("博士")
                .majorCategory("数据科学")
                .gpaLevel("优秀（3.9+）")
                .systemMatchScore(95)
                .abilityTags(List.of("R", "Python", "统计分析", "数据可视化"))
                .highlight("有丰富的数据分析项目经验，擅长从数据中发现商业价值")
                .isOpenToContact(true)
                .build());
        
        students.add(BrowseStudentsResponse.StudentItem.builder()
                .anonymousId("student_anon_005")
                .educationLevel("本科")
                .majorCategory("电子信息工程")
                .gpaLevel("良好（3.2-3.6）")
                .systemMatchScore(78)
                .abilityTags(List.of("C++", "嵌入式", "单片机", "电路设计"))
                .highlight("参加过电子设计竞赛，有硬件开发经验")
                .isOpenToContact(true)
                .build());
        
        BrowseStudentsResponse response = BrowseStudentsResponse.builder()
                .total(students.size())
                .list(students)
                .build();
        
        return ApiResponse.success("success", response);
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
    private static class BrowseStudentsResponse {
        private Integer total;
        private List<StudentItem> list;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        private static class StudentItem {
            @JsonProperty("anonymous_id")
            private String anonymousId;
            @JsonProperty("education_level")
            private String educationLevel;
            @JsonProperty("major_category")
            private String majorCategory;
            @JsonProperty("gpa_level")
            private String gpaLevel;
            @JsonProperty("system_match_score")
            private Integer systemMatchScore;
            @JsonProperty("ability_tags")
            private List<String> abilityTags;
            private String highlight;
            @JsonProperty("is_open_to_contact")
            private Boolean isOpenToContact;
        }
    }
}
