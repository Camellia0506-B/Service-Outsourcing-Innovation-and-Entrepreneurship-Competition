package www.gradquest.com.dto.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 2.2 更新个人档案 - 响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateResponse {

    @JsonProperty("profile_completeness")
    private Integer profileCompleteness;

    @JsonProperty("updated_at")
    private String updatedAt;
}
