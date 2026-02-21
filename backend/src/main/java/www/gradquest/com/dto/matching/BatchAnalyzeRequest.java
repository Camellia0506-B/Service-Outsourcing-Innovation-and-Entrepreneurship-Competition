package www.gradquest.com.dto.matching;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 6.3 批量匹配分析 - 请求
 */
@Data
public class BatchAnalyzeRequest {

    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotNull(message = "job_ids 不能为空")
    @JsonProperty("job_ids")
    private List<String> jobIds;
}
