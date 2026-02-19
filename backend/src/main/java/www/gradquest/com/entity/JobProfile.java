package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

@Data
@TableName("job_profiles")
public class JobProfile {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String jobId;
    private String jobName;
    private String jobCode;
    private String industry;
    private String level;
    private String avgSalary;
    private String description;
    private Integer demandScore;
    private String growthTrend;
    /** JSON string of tags */
    private String tags;
    private LocalDate createdAt;
}

