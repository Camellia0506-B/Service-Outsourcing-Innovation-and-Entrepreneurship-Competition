package www.gradquest.com.service;

import www.gradquest.com.entity.UserFollow;

import java.util.List;

/**
 * @author zhangzherui
 */
public interface FollowService {
    List<UserFollow> listFollows(Long userId);

    Long addFollow(UserFollow follow);

    void removeFollow(Long id);
}
