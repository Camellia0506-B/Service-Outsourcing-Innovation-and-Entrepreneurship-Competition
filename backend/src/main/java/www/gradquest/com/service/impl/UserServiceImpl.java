package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import www.gradquest.com.dto.UserProfileResponse;
import www.gradquest.com.entity.ForumPost;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.entity.User;
import www.gradquest.com.entity.UserFollow;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.service.UserService;
import www.gradquest.com.mapper.UserFollowMapper;
import www.gradquest.com.mapper.ForumPostMapper;
import www.gradquest.com.mapper.SharedResourceMapper;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final UserFollowMapper userFollowMapper;
    private final ForumPostMapper forumPostMapper;
    private final SharedResourceMapper sharedResourceMapper;

    @Override
    @Transactional
    public User register(String username, String password, String nickname) {
        LambdaQueryWrapper<User> query = new LambdaQueryWrapper<>();
        query.eq(User::getUsername, username);
        if (userMapper.selectCount(query) > 0) {
            throw new IllegalArgumentException("username exists");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setNickname(StringUtils.hasText(nickname) ? nickname : username);
        userMapper.insert(user);
        return user;
    }

    @Override
    public User login(String username, String password) {
        LambdaQueryWrapper<User> query = new LambdaQueryWrapper<>();
        query.eq(User::getUsername, username).eq(User::getPassword, password);
        return userMapper.selectOne(query);
    }

    @Override
    public User getById(Long id) {
        return userMapper.selectById(id);
    }

    @Override
    @Transactional
    public void updateProfile(Long userId, String nickname, String avatar) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return;
        }
        if (StringUtils.hasText(nickname)) {
            user.setNickname(nickname);
        }
        if (StringUtils.hasText(avatar)) {
            user.setAvatar(avatar);
        }
        userMapper.updateById(user);
    }

    @Override
    public UserProfileResponse getProfileWithStats(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return null;
        }
        int followCount = userFollowMapper
                .selectCount(new QueryWrapper<UserFollow>().eq("user_id", userId))
                .intValue();

        int postCount = forumPostMapper
                .selectCount(new QueryWrapper<ForumPost>().eq("user_id", userId))
                .intValue();

        int resourceCount = sharedResourceMapper
                .selectCount(new QueryWrapper<SharedResource>().eq("user_id", userId))
                .intValue();
        return UserProfileResponse.builder()
                .userInfo(UserProfileResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .build())
                .stats(UserProfileResponse.Stats.builder()
                        .followCount(followCount)
                        .postCount(postCount)
                        .resourceCount(resourceCount)
                        .build())
                .build();
    }
}
