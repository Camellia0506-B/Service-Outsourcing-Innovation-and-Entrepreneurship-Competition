package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 忘记密码验证码
 */
@Data
@TableName("password_reset_codes")
public class PasswordResetCode {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;
    private String email;
    private String code;
    private LocalDateTime expiresAt;
    private Integer used; // 0/1
    private LocalDateTime createdAt;
}

