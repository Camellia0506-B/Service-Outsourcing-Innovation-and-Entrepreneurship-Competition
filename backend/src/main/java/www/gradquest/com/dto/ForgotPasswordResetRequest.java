package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 1.4.2 重置密码 - 请求
 */
@Data
public class ForgotPasswordResetRequest {
    @NotBlank(message = "username 不能为空")
    private String username;

    @NotBlank(message = "code 不能为空")
    private String code;

    @NotBlank(message = "new_password 不能为空")
    @JsonProperty("new_password")
    private String newPassword;
}

