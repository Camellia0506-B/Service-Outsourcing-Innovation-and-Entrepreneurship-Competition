package www.gradquest.com.dto.student;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 5.1 获取学生能力画像 - 请求
 */
@Data
public class AbilityProfileRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;
}
