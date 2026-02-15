package www.gradquest.com.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.LoginResponse;
import www.gradquest.com.dto.RegisterResponse;
import www.gradquest.com.service.AuthService;

import java.util.Set;

/**
 * 身份认证模块（符合 API 文档 0 & 1）
 *
 * @author zhangzherui
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private static final long AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
    private static final Set<String> AVATAR_ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/jpg");

    private final AuthService authService;

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<RegisterResponse> register(@ModelAttribute @Validated RegisterRequest request) {
        if (request.getAvatar() != null && !request.getAvatar().isEmpty()) {
            if (request.getAvatar().getSize() > AVATAR_MAX_SIZE) {
                return ApiResponse.badRequest("头像文件不能超过 2MB");
            }
            String contentType = request.getAvatar().getContentType();
            if (contentType == null || !AVATAR_ALLOWED_TYPES.contains(contentType.toLowerCase())) {
                return ApiResponse.badRequest("头像仅支持 jpg/png 格式");
            }
        }
        RegisterResponse data = authService.register(
                request.getUsername(),
                request.getPassword(),
                request.getNickname(),
                request.getAvatar()
        );
        return ApiResponse.success("注册成功", data);
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody @Validated LoginRequest request) {
        LoginResponse data = authService.login(request.getUsername(), request.getPassword());
        if (data == null) {
            return ApiResponse.failure(400, "用户名或密码错误");
        }
        return ApiResponse.success("登录成功", data);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody @Validated LogoutRequest request) {
        authService.logout(request.getUserId());
        return ApiResponse.success("退出成功", null);
    }

    @Data
    private static class RegisterRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
        @NotBlank(message = "昵称不能为空")
        private String nickname;
        private MultipartFile avatar;
    }

    @Data
    private static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }

    @Data
    private static class LogoutRequest {
        @NotNull(message = "user_id 不能为空")
        @JsonProperty("user_id")
        private Long userId;
    }
}
