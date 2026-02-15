package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录接口响应体（符合 API 文档 1.2）
 *
 * @author zhangzherui
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    @JsonProperty("user_id")
    private Long userId;

    private String username;
    private String nickname;
    private String avatar;
    private String token;

    @JsonProperty("profile_completed")
    private Boolean profileCompleted;

    @JsonProperty("assessment_completed")
    private Boolean assessmentCompleted;
}
