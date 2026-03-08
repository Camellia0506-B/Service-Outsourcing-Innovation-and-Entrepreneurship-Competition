package www.gradquest.com.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HrRegisterResponse {

    @JsonProperty("hr_id")
    private Long hrId;

    private String username;
    private String realName;
    private String companyName;
    private String companySize;
    private String industry;
    private String hrRole;
    private String status;

    @JsonProperty("created_at")
    private String createdAt;

    public static HrRegisterResponse from(Long hrId, String username, String realName, String companyName, String companySize, String industry, String hrRole, String status, LocalDateTime createdAt) {
        return HrRegisterResponse.builder()
                .hrId(hrId)
                .username(username)
                .realName(realName)
                .companyName(companyName)
                .companySize(companySize)
                .industry(industry)
                .hrRole(hrRole)
                .status(status)
                .createdAt(createdAt != null ? createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null)
                .build();
    }
}
