package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;
import www.gradquest.com.dto.SendCodeResponse;
import www.gradquest.com.entity.PasswordResetCode;
import www.gradquest.com.entity.User;
import www.gradquest.com.entity.UserProfile;
import www.gradquest.com.mapper.PasswordResetCodeMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.mapper.UserProfileMapper;
import www.gradquest.com.service.AuthService;
import www.gradquest.com.service.UserService;
import www.gradquest.com.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
<<<<<<< Updated upstream
=======
import java.util.Optional;
>>>>>>> Stashed changes
import java.util.Random;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int CODE_EXPIRE_MINUTES = 10;
    private static final int CODE_LENGTH = 6;

    private final UserService userService;
    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;
    private final PasswordResetCodeMapper passwordResetCodeMapper;
    private final PasswordEncoder passwordEncoder;

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

    @Override
    public SendCodeResponse sendForgotPasswordCode(String username, String email) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        UserProfile profile = userProfileMapper.selectById(user.getId());
        String profileEmail = profile != null ? profile.getEmail() : null;
        if (profileEmail == null || profileEmail.isBlank()) {
            throw new IllegalArgumentException("该账号未绑定邮箱，无法发送验证码");
        }
        if (!profileEmail.trim().equalsIgnoreCase(email != null ? email.trim() : "")) {
            throw new IllegalArgumentException("邮箱与账号绑定邮箱不一致");
        }
        // 使该用户旧验证码失效（可选：仅保留最新一条）
        passwordResetCodeMapper.delete(new LambdaQueryWrapper<PasswordResetCode>().eq(PasswordResetCode::getUserId, user.getId()));
        String code = generateCode(CODE_LENGTH);
        LocalDateTime expireAt = LocalDateTime.now().plusMinutes(CODE_EXPIRE_MINUTES);
        PasswordResetCode record = new PasswordResetCode();
        record.setUserId(user.getId());
        record.setCode(code);
        record.setExpireAt(expireAt);
        record.setCreatedAt(LocalDateTime.now());
        passwordResetCodeMapper.insert(record);
        // TODO: 实际发送邮件（接入邮件服务）；当前仅落库供 reset 校验
        return SendCodeResponse.builder()
                .email(email)
                .expireMinutes(CODE_EXPIRE_MINUTES)
                .build();
    }

    @Override
    public void resetPassword(String username, String code, String newPassword) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        PasswordResetCode record = passwordResetCodeMapper.selectOne(
                new LambdaQueryWrapper<PasswordResetCode>()
                        .eq(PasswordResetCode::getUserId, user.getId())
                        .eq(PasswordResetCode::getCode, code)
                        .gt(PasswordResetCode::getExpireAt, LocalDateTime.now())
                        .last("LIMIT 1"));
        if (record == null) {
            throw new IllegalArgumentException("验证码错误或已过期");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
        passwordResetCodeMapper.deleteById(record.getId());
    }

    private static String generateCode(int length) {
        Random r = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(r.nextInt(10));
        }
        return sb.toString();
    }
}
