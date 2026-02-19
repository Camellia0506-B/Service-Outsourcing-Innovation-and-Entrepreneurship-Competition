package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;

/**
 * @author zhangzherui
 */
public interface AuthService {

    RegisterResponse register(String username, String password, String nickname, MultipartFile avatar);

    LoginResponse login(String username, String password);

    void logout(Long userId);
}
