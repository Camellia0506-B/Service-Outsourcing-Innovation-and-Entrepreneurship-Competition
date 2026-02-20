package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;
import www.gradquest.com.dto.SendCodeResponse;

/**
 * @author zhangzherui
 */
public interface AuthService {

    RegisterResponse register(String username, String password, String nickname, MultipartFile avatar);

    LoginResponse login(String username, String password);

    void logout(Long userId);

    /** 1.4.1 发送验证码到邮箱（校验用户名与邮箱一致后生成并落库，实际发邮件可后续接入） */
    SendCodeResponse sendForgotPasswordCode(String username, String email);

    /** 1.4.2 校验验证码并重置密码 */
    void resetPassword(String username, String code, String newPassword);
}
