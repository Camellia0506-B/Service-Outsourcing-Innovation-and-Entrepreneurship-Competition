package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 岗位画像表（job_profiles），数据可来自求职岗位信息数据.csv 导入
 */
@Data
@TableName("job_profiles")
public class JobProfile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String jobId;
    private String jobName;
    private String industry;
    private String level;
    @TableField("salary_range")
    private String salaryRange;
    /** 技能标签，存 JSON 数组字符串 如 ["Python","机器学习"] */
    private String skills;
    @TableField("demand_score")
    private Integer demandScore;
    private String trend;
}
