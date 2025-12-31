package www.gradquest.com.controller;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.entity.User;
import www.gradquest.com.service.AuthService;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<User> register(@RequestBody @Validated RegisterRequest request) {
        User user = authService.register(request.getUsername(), request.getPassword(), request.getNickname());
        return ApiResponse.success("注册成功", user);
    }

    @PostMapping("/login")
    public ApiResponse<User> login(@RequestBody @Validated LoginRequest request) {
        User user = authService.login(request.getUsername(), request.getPassword());
        if (user == null) {
            return ApiResponse.failure(400, "用户名或密码错误");
        }
        return ApiResponse.success("登录成功", user);
    }

    @Data
    private static class RegisterRequest {
        @NotBlank
        private String username;
        @NotBlank
        private String password;
        private String nickname;
    }

    @Data
    private static class LoginRequest {
        @NotBlank
        private String username;
        @NotBlank
        private String password;
    }
}
