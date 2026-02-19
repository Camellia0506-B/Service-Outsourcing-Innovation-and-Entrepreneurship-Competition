package www.gradquest.com.dto.assessment;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 3.1 获取测评问卷 - 请求
 */
@Data
public class AssessmentQuestionnaireRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotBlank(message = "assessment_type 不能为空")
    @JsonProperty("assessment_type")
    private String assessmentType; // comprehensive / quick
}

