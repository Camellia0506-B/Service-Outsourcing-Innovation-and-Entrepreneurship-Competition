package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 职业测评报告（3.3）
 */
@Data
@TableName("assessment_reports")
public class AssessmentReport {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String reportId;
    private Long userId;
    private String assessmentId;
    private String status; // processing/completed/failed
    private LocalDate assessmentDate;
    /** JSON string */
    private String reportData;
    private LocalDateTime createdAt;
}

