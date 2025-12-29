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
public class DashboardResponse {
    private LocalDate date;
    private String quote;
    private String bgImage;
    private List<DdlReminder> ddlReminders;
    private List<HotPost> hotPosts;

    @Data
    @Builder
    public static class DdlReminder {
        private Long noticeId;
        private String univName;
        private String deptName;
        private String title;
        private long daysLeft;
        private LocalDate endDate;
    }

    @Data
    @Builder
    public static class HotPost {
        private Long postId;
        private String title;
        private String univName;
        private Integer viewCount;
    }
}
