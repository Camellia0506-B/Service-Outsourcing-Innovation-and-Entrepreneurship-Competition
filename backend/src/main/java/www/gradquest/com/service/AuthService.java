package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.entity.User;

/**
 * @author zhangzherui
 */
public interface AuthService {
    User register(String username, String password, String nickname, MultipartFile avatar);

    User login(String username, String password);
}
