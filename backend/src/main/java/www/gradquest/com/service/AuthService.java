package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.ForgotPasswordSendCodeResponse;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;

/**
 * @author zhangzherui
 */
public interface AuthService {

    RegisterResponse register(String username, String password, String nickname, MultipartFile avatar);

    LoginResponse login(String username, String password);

    void logout(Long userId);

    /**
     * 1.4.1 忘记密码：发送验证码
     */
    ForgotPasswordSendCodeResponse forgotPasswordSendCode(String username, String email);

    /**
     * 1.4.2 忘记密码：校验验证码并重置密码
     */
    void forgotPasswordReset(String username, String code, String newPassword);
}
