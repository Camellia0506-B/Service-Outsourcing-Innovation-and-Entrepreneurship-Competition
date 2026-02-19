package www.gradquest.com.dto.assessment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 3.1 获取测评问卷 - 响应 data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentQuestionnaireResponse {

    @JsonProperty("assessment_id")
    private String assessmentId;

    @JsonProperty("total_questions")
    private Integer totalQuestions;

    @JsonProperty("estimated_time")
    private Integer estimatedTime;

    private List<Dimension> dimensions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Dimension {
        @JsonProperty("dimension_id")
        private String dimensionId;
        @JsonProperty("dimension_name")
        private String dimensionName;
        private List<Question> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        @JsonProperty("question_id")
        private String questionId;
        @JsonProperty("question_text")
        private String questionText;
        @JsonProperty("question_type")
        private String questionType; // single_choice / multiple_choice / scale
        private List<Option> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Option {
        @JsonProperty("option_id")
        private String optionId;
        @JsonProperty("option_text")
        private String optionText;
    }
}

