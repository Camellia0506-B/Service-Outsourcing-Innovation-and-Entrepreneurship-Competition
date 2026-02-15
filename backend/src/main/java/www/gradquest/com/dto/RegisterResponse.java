package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 注册接口响应体（符合 API 文档 1.1）
 *
 * @author zhangzherui
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {

    @JsonProperty("user_id")
    private Long userId;

    private String username;
    private String nickname;
    private String avatar;

    @JsonProperty("created_at")
    private String createdAt;

    public static RegisterResponse from(Long userId, String username, String nickname, String avatar, LocalDateTime createdAt) {
        return RegisterResponse.builder()
                .userId(userId)
                .username(username)
                .nickname(nickname)
                .avatar(avatar != null ? avatar : "")
                .createdAt(createdAt != null ? createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null)
                .build();
    }
}
