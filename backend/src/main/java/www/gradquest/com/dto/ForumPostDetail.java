package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class ForumPostDetail {
    private Long id;
    private String title;
    private String authorNickname;
    private String content;
    private Integer viewCount;
    private Integer replyCount;
    private LocalDateTime createdAt;
}
