package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 个人档案扩展（与 users 1:1）
 */
@Data
@TableName("user_profiles")
public class UserProfile {
    @TableId
    private Long userId;
    private String gender;
    private LocalDate birthDate;
    private String phone;
    private String email;
    private String school;
    private String major;
    private String degree;
    private String grade;
    private String expectedGraduation;
    private String gpa;
    private LocalDateTime updatedAt;
}
