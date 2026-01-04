package www.gradquest.com.entity;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * @author Zherui
 */
@Data
@Builder
public class NoticePlaygroundItem {
    private Long id;
    private String deptName;
    private String title;
    private LocalDate endDate;
    private String sourceLink;
}
