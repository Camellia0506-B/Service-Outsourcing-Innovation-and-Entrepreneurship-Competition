package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class NoticeListResponse {
    private UniversityBrief info;
    private List<NoticeItem> notices;

    @Data
    @Builder
    public static class UniversityBrief {
        private Integer id;
        private String name;
        private String logoUrl;
        private String tags;
        private String intro;
    }

    @Data
    @Builder
    public static class NoticeItem {
        private Long id;
        private String deptName;
        private String title;
        private LocalDate endDate;
    }
}
