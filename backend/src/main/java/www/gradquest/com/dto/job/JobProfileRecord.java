package www.gradquest.com.dto.job;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 岗位列表单条记录，前端约定字段：jobId, jobName, industry, level, salaryRange, skills, demandScore, trend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class JobProfileRecord {
    private String jobId;
    private String jobName;
    private String industry;
    private String level;
    private String salaryRange;
    private List<String> skills;
    private Integer demandScore;
    private String trend;
}
