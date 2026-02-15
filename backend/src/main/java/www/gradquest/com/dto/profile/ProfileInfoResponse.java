package www.gradquest.com.dto.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 2.1 获取个人档案 - 响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileInfoResponse {

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("basic_info")
    private BasicInfo basicInfo;

    @JsonProperty("education_info")
    private EducationInfo educationInfo;

    private List<SkillItem> skills;
    private List<CertificateItem> certificates;
    private List<InternshipItem> internships;
    private List<ProjectItem> projects;
    private List<AwardItem> awards;

    @JsonProperty("profile_completeness")
    private Integer profileCompleteness;

    @JsonProperty("updated_at")
    private String updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BasicInfo {
        private String nickname;
        private String avatar;
        private String gender;

        @JsonProperty("birth_date")
        private String birthDate;
        private String phone;
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EducationInfo {
        private String school;
        private String major;
        private String degree;
        private String grade;

        @JsonProperty("expected_graduation")
        private String expectedGraduation;
        private String gpa;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillItem {
        private String category;
        private List<String> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CertificateItem {
        private String name;

        @JsonProperty("issue_date")
        private String issueDate;

        @JsonProperty("cert_url")
        private String certUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InternshipItem {
        private String company;
        private String position;

        @JsonProperty("start_date")
        private String startDate;

        @JsonProperty("end_date")
        private String endDate;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectItem {
        private String name;
        private String role;

        @JsonProperty("start_date")
        private String startDate;

        @JsonProperty("end_date")
        private String endDate;
        private String description;

        @JsonProperty("tech_stack")
        private List<String> techStack;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AwardItem {
        private String name;
        private String level;
        private String date;
    }
}
