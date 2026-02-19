package www.gradquest.com.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 4.5 获取AI生成结果 - 请求
 */
@Data
public class JobAiGenerateResultRequest {
    @NotBlank(message = "task_id 不能为空")
    @JsonProperty("task_id")
    private String taskId;
}

