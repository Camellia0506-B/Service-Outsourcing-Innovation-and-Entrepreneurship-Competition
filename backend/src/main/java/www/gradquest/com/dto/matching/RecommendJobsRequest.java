package www.gradquest.com.dto.matching;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 6.1 获取推荐岗位 - 请求
 */
@Data
public class RecommendJobsRequest {

    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("top_n")
    private Integer topN = 10;

    @JsonProperty("filters")
    private Map<String, Object> filters;
}
