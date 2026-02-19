package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import www.gradquest.com.dto.ForgotPasswordSendCodeResponse;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;
import www.gradquest.com.entity.PasswordResetCode;
import www.gradquest.com.entity.User;
import www.gradquest.com.mapper.PasswordResetCodeMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.service.AuthService;
import www.gradquest.com.service.UserService;
import www.gradquest.com.utils.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final UserMapper userMapper;
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
    @Transactional
    public ForgotPasswordSendCodeResponse forgotPasswordSendCode(String username, String email) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1000000));
        int expireMinutes = 10;

        PasswordResetCode row = new PasswordResetCode();
        row.setUsername(username);
        row.setEmail(email);
        row.setCode(code);
        row.setExpiresAt(LocalDateTime.now().plusMinutes(expireMinutes));
        row.setUsed(0);
        row.setCreatedAt(LocalDateTime.now());
        passwordResetCodeMapper.insert(row);

        // 真实邮件发送可在此接入 SMTP/第三方；当前版本仅落库（便于开发联调）
        return ForgotPasswordSendCodeResponse.builder()
                .email(email)
                .expireMinutes(expireMinutes)
                .build();
    }

    @Override
    @Transactional
    public void forgotPasswordReset(String username, String code, String newPassword) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        List<PasswordResetCode> list = passwordResetCodeMapper.selectList(
                new LambdaQueryWrapper<PasswordResetCode>()
                        .eq(PasswordResetCode::getUsername, username)
                        .eq(PasswordResetCode::getCode, code)
                        .eq(PasswordResetCode::getUsed, 0)
                        .orderByDesc(PasswordResetCode::getCreatedAt)
        );

        PasswordResetCode latest = list.isEmpty() ? null : list.get(0);
        if (latest == null || latest.getExpiresAt() == null || latest.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("验证码错误或已过期");
        }

        if (newPassword.length() < 6 || newPassword.length() > 20) {
            throw new IllegalArgumentException("新密码长度需为6-20位");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);

        latest.setUsed(1);
        passwordResetCodeMapper.updateById(latest);
    }
}
