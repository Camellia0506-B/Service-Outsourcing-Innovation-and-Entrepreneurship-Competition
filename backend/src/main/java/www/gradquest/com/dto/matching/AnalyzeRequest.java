package www.gradquest.com.dto.matching;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 6.2 获取单个岗位匹配分析 - 请求
 */
@Data
public class AnalyzeRequest {

    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotBlank(message = "job_id 不能为空")
    @JsonProperty("job_id")
    private String jobId;
}
