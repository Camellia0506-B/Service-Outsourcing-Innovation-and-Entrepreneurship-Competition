package www.gradquest.com.dto.assessment;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 3.2 提交测评答案 - 请求
 */
@Data
public class AssessmentSubmitRequest {
    @NotNull(message = "user_id 不能为空")
    @JsonProperty("user_id")
    private Long userId;

    @NotBlank(message = "assessment_id 不能为空")
    @JsonProperty("assessment_id")
    private String assessmentId;

    @NotNull(message = "answers 不能为空")
    private List<AnswerItem> answers;

    @JsonProperty("time_spent")
    private Integer timeSpent;

    @Data
    public static class AnswerItem {
        @NotBlank(message = "question_id 不能为空")
        @JsonProperty("question_id")
        private String questionId;

        /**
         * 可能是 String / List<String> / Integer（按文档示例）
         */
        private Object answer;
    }
}

