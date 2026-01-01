package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.UserProfileResponse;
import www.gradquest.com.entity.User;

/**
 * @author zhangzherui
 */
public interface UserService {
    User register(String username, String password, String nickname, MultipartFile avatar);

    User login(String username, String password);

    User getById(Long id);

    boolean updateProfile(Long userId, String nickname, MultipartFile avatarFile);

    UserProfileResponse getProfileWithStats(Long userId);
}
