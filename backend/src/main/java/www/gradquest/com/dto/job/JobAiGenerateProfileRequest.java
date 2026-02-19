package www.gradquest.com.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 4.4 AI生成岗位画像 - 请求
 */
@Data
public class JobAiGenerateProfileRequest {

    @NotBlank(message = "job_name 不能为空")
    @JsonProperty("job_name")
    private String jobName;

    @NotEmpty(message = "job_descriptions 不能为空")
    @JsonProperty("job_descriptions")
    private List<String> jobDescriptions;

    @JsonProperty("sample_size")
    private Integer sampleSize;
}

