package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class ForumCommentItem {
    private Long id;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;
    private String userNickname;
    private String userAvatar;
}
