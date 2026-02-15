package www.gradquest.com.dto.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 2.4 获取简历解析结果 - 响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeParseResultResponse {

    private String status; // processing / completed / failed

    @JsonProperty("parsed_data")
    private Map<String, Object> parsedData;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    private List<String> suggestions;
}
