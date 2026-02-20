package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 1.4.1 发送验证码响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendCodeResponse {
    private String email;

    @JsonProperty("expire_minutes")
    private Integer expireMinutes;
}
