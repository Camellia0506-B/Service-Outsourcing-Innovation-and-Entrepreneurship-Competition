package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 忘记密码验证码（API 文档 1.4）
 */
@Data
@TableName("password_reset_codes")
public class PasswordResetCode {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String code;
    private LocalDateTime expireAt;
    private LocalDateTime createdAt;
}
