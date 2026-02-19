package www.gradquest.com.dto.assessment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 3.2 提交测评答案 - 响应 data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentSubmitResponse {
    @JsonProperty("report_id")
    private String reportId;
    private String status; // processing
}

