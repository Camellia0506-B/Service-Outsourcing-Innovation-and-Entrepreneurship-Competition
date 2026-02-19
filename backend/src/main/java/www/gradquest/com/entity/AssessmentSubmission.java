package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 职业测评答卷（3.2）
 */
@Data
@TableName("assessment_submissions")
public class AssessmentSubmission {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String assessmentId;
    private Long userId;
    private String assessmentType;
    /** JSON string */
    private String answers;
    private Integer timeSpent;
    private LocalDateTime createdAt;
}

