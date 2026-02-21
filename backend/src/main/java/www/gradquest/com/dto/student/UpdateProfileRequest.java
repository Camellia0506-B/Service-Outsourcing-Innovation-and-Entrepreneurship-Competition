package www.gradquest.com.dto.student;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * 5.3 更新能力画像 - 请求
 */
@Data
public class UpdateProfileRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotNull(message = "updates 不能为空")
    private Map<String, Object> updates;
}
