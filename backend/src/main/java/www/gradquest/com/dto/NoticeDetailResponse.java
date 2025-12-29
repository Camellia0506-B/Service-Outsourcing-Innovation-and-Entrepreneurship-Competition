package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class NoticeDetailResponse {
    private Long id;
    private Integer univId;
    private String deptName;
    private String title;
    private String content;
    private String noticeType;
    private String examType;
    private LocalDate endDate;
    private String sourceLink;
    private Integer status;
}
