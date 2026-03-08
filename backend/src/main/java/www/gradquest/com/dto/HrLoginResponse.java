package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HrLoginResponse {

    @JsonProperty("hr_id")
    private Long hrId;

    private String username;
    private String realName;
    private String companyName;
    private String companySize;
    private String industry;
    private String hrRole;
    private String status;
    private String token;

    @JsonProperty("unread_evaluations")
    private Integer unreadEvaluations;
}
