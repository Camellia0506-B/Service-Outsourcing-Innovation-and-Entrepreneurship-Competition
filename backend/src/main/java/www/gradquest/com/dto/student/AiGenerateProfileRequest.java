package www.gradquest.com.dto.student;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 5.2 AI生成学生能力画像 - 请求
 */
@Data
public class AiGenerateProfileRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("data_source")
    private String dataSource = "profile"; // profile 或 resume
}
