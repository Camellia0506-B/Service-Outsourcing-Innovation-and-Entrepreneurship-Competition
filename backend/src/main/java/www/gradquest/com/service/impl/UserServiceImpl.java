package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
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
import www.gradquest.com.utils.UploadFileUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Objects;

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
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public User register(String username, String password, String nickname, MultipartFile avatar) {
        // 检查用户名是否已存在
        LambdaQueryWrapper<User> query = new LambdaQueryWrapper<>();
        query.eq(User::getUsername, username);
        if (userMapper.selectCount(query) > 0) {
            throw new IllegalArgumentException("用户名已存在");
        }

        // 创建用户对象，密码使用 BCrypt 哈希
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(StringUtils.hasText(nickname) ? nickname : username);
        user.setCreatedAt(LocalDateTime.now());

        // 处理头像文件上传
        if (avatar != null && !avatar.isEmpty()) {
            // 创建一个临时文件来保存上传的头像
            File avatarFile = new File(System.getProperty("java.io.tmpdir"), Objects.requireNonNull(avatar.getOriginalFilename()));
            try {
                // 将 MultipartFile 保存到临时文件
                avatar.transferTo(avatarFile);

                // 上传文件并获取文件 URL
                String avatarUrl = UploadFileUtil.upload(avatarFile);
                user.setAvatar(avatarUrl);
            } catch (IOException e) {
                e.printStackTrace();
                throw new RuntimeException("Avatar upload failed", e);
            }
        }

        // 保存用户数据
        userMapper.insert(user);

        return user;
    }


    @Override
    public User login(String username, String password) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null) {
            return null;
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return null;
        }
        return user;
    }

    @Override
    public User getById(Long id) {
        return userMapper.selectById(id);
    }

    @Override
    @Transactional
    public boolean updateProfile(Long userId, String nickname, MultipartFile avatarFile) {
        // 获取用户
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }

        // 处理头像上传并获取 URL
        String avatarUrl = null;
        if (avatarFile != null && !avatarFile.isEmpty()) {
            try {
                // 将 MultipartFile 转换为 File，保存到临时文件并上传
                File avatarTempFile = new File(System.getProperty("java.io.tmpdir"), avatarFile.getOriginalFilename());
                avatarFile.transferTo(avatarTempFile);

                // 上传文件并获取文件 URL
                avatarUrl = UploadFileUtil.upload(avatarTempFile);

                // 上传成功后，删除临时文件
                avatarTempFile.delete();
            } catch (IOException e) {
                e.printStackTrace();
                return false;
            }
        }

        // 更新昵称（如果传入了）和头像 URL（如果上传了头像）
        if (StringUtils.hasText(nickname)) {
            user.setNickname(nickname);
        }
        if (StringUtils.hasText(avatarUrl)) {
            user.setAvatar(avatarUrl);
        }

        // 更新用户信息
        userMapper.updateById(user);
        return true;
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
