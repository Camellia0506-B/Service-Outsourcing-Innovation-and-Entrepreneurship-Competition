package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;
import www.gradquest.com.entity.User;
import www.gradquest.com.service.AuthService;
import www.gradquest.com.service.UserService;
import www.gradquest.com.utils.JwtUtil;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;

    @Override
    public RegisterResponse register(String username, String password, String nickname, MultipartFile avatar) {
        User user = userService.register(username, password, nickname, avatar);
        return RegisterResponse.from(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatar(),
                user.getCreatedAt()
        );
    }

    @Override
    public LoginResponse login(String username, String password) {
        User user = userService.login(username, password);
        if (user == null) {
            return null;
        }
        String token = JwtUtil.createToken(user.getId());
        // 档案完善：有昵称即可；职业测评完成状态暂由业务表维护，此处默认 false
        boolean profileCompleted = user.getNickname() != null && !user.getNickname().isBlank();
        return LoginResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .token(token)
                .profileCompleted(profileCompleted)
                .assessmentCompleted(false)
                .build();
    }

    @Override
    public void logout(Long userId) {
        // 无状态 JWT：服务端仅确认请求，客户端丢弃 Token 即可
    }
}
