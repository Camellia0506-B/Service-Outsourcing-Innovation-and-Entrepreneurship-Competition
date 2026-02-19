package www.gradquest.com.dto.assessment;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 3.3 获取测评报告 - 请求
 */
@Data
public class AssessmentReportRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotBlank(message = "report_id 不能为空")
    @JsonProperty("report_id")
    private String reportId;
}

