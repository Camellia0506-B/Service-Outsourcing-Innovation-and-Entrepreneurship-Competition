package www.gradquest.com.dto.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 2.2 更新个人档案 - 请求（严格对应 API 文档 2.2）
 */
@Data
public class ProfileUpdateRequest {

    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("basic_info")
    private BasicInfo basicInfo;

    @JsonProperty("education_info")
    private EducationInfo educationInfo;

    private List<SkillItem> skills;
    private List<CertificateItem> certificates;

    @Data
    public static class BasicInfo {
        private String nickname;
        private String gender;

        @JsonProperty("birth_date")
        private String birthDate;
        private String phone;
        private String email;
    }

    @Data
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
    public static class SkillItem {
        private String category;
        private List<String> items;
    }

    @Data
    public static class CertificateItem {
        private String name;

        @JsonProperty("issue_date")
        private String issueDate;
    }
}
