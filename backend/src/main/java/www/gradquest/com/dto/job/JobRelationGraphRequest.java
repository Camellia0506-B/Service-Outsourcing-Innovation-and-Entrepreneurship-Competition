package www.gradquest.com.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 4.3 获取岗位关联图谱 - 请求
 */
@Data
public class JobRelationGraphRequest {
    @NotBlank(message = "job_id 不能为空")
    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("graph_type")
    private String graphType; // vertical / transfer / all
}

