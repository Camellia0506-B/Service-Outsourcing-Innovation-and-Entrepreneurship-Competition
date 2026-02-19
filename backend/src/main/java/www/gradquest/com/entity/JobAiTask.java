package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("job_ai_tasks")
public class JobAiTask {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String taskId;
    private String jobName;
    private String jobDescRaw;
    private String status;
    /** JSON of job profile (same as /job/profile/detail data) */
    private String jobProfile;
    private Double aiConfidence;
    /** JSON of data_sources */
    private String dataSources;
    private LocalDateTime createdAt;
}

