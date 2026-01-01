package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.entity.User;
import www.gradquest.com.service.AuthService;
import www.gradquest.com.service.UserService;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;

    @Override
    public User register(String username, String password, String nickname, MultipartFile avatar) {
        return userService.register(username, password, nickname, avatar);
    }

    @Override
    public User login(String username, String password) {
        return userService.login(username, password);
    }
}
