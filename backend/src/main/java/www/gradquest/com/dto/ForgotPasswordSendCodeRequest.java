package www.gradquest.com.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 1.4.1 发送验证码 - 请求
 */
@Data
public class ForgotPasswordSendCodeRequest {
    @NotBlank(message = "username 不能为空")
    private String username;

    @NotBlank(message = "email 不能为空")
    @Email(message = "email 格式错误")
    private String email;
}

