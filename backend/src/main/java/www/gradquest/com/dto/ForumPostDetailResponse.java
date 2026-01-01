package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class ForumPostDetailResponse {
    private ForumPostDetail post;
    private List<ForumCommentItem> comments;
}
