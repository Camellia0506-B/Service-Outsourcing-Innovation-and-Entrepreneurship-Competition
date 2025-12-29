package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class ForumPostDetail {
    private Long id;
    private Integer univId;
    private Long userId;
    private String title;
    private String content;
    private Integer viewCount;
    private Integer replyCount;
    private LocalDateTime createdAt;
    private List<ForumCommentItem> comments;
}
