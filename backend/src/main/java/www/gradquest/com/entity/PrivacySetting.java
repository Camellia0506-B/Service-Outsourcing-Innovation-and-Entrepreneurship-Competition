package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("privacy_settings")
public class PrivacySetting {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("resume_visible_to_hr")
    private Boolean resumeVisibleToHr;

    @TableField("allow_hr_contact")
    private Boolean allowHrContact;

    @TableField("allow_algorithm_optimization")
    private Boolean allowAlgorithmOptimization;

    @TableField("allow_research")
    private Boolean allowResearch;

    @TableField("data_retention_years")
    private Integer dataRetentionYears;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
