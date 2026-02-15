package www.gradquest.com.dto.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 2.3 上传简历 - 响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadResumeResponse {

    @JsonProperty("task_id")
    private String taskId;
    private String status;
}
