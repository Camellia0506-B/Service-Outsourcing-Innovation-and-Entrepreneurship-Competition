package www.gradquest.com.dto.job;

import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 4.1 获取岗位画像列表 - 请求
 */
@Data
public class JobProfilesRequest {
    @Min(value = 1, message = "page 必须 >= 1")
    private Integer page = 1;

    @Min(value = 1, message = "size 必须 >= 1")
    private Integer size = 20;

    private String keyword;
    private String industry;
    private String level;
}

