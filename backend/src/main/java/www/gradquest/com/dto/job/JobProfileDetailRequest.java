package www.gradquest.com.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 4.2 获取岗位详细画像 - 请求
 */
@Data
public class JobProfileDetailRequest {
    @NotBlank(message = "job_id 不能为空")
    @JsonProperty("job_id")
    private String jobId;
}

