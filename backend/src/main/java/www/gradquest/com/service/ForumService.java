package www.gradquest.com.service;

import www.gradquest.com.dto.ForumPostDetailResponse;
import www.gradquest.com.dto.ForumPostListItem;

import java.util.List;

/**
 * @author zhangzherui
 */
public interface ForumService {
    List<ForumPostListItem> listByUniversity(Integer univId, String keyword);
    List<ForumPostListItem> listByPlayground();
    List<ForumPostListItem> listByUser(Long userId);

    ForumPostDetailResponse getPostDetail(Long id);

    Long createPost(Integer univId, Long userId, String title, String content);

    Long createComment(Long postId, Long userId, String content);
}
