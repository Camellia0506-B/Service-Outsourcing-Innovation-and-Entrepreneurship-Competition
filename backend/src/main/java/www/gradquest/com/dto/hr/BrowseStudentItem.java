package www.gradquest.com.dto.hr;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * HR 浏览学生简历列表项（API 文档 11.3）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrowseStudentItem {

    @JsonProperty("anonymous_id")
    private String anonymousId;

    @JsonProperty("education_level")
    private String educationLevel;

    @JsonProperty("major_category")
    private String majorCategory;

    @JsonProperty("gpa_level")
    private String gpaLevel;

    @JsonProperty("system_match_score")
    private Integer systemMatchScore;

    @JsonProperty("ability_tags")
    private List<String> abilityTags;

    private String highlight;

    @JsonProperty("is_open_to_contact")
    private Boolean isOpenToContact;
}
