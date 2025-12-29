package www.gradquest.com.service;

import www.gradquest.com.entity.User;

/**
 * @author zhangzherui
 */
public interface AuthService {
    User register(String username, String password, String nickname);

    User login(String username, String password);
}
