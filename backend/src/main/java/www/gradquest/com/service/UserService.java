package www.gradquest.com.service;

import www.gradquest.com.dto.UserProfileResponse;
import www.gradquest.com.entity.User;

/**
 * @author zhangzherui
 */
public interface UserService {
    User register(String username, String password, String nickname);

    User login(String username, String password);

    User getById(Long id);

    void updateProfile(Long userId, String nickname, String avatar);

    UserProfileResponse getProfileWithStats(Long userId);
}
