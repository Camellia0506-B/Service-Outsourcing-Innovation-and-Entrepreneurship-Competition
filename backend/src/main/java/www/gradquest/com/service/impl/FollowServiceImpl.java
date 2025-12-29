package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import www.gradquest.com.entity.UserFollow;
import www.gradquest.com.mapper.UserFollowMapper;
import www.gradquest.com.service.FollowService;

import java.util.List;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class FollowServiceImpl implements FollowService {

    private final UserFollowMapper userFollowMapper;

    @Override
    public List<UserFollow> listFollows(Long userId) {
        LambdaQueryWrapper<UserFollow> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFollow::getUserId, userId).orderByDesc(UserFollow::getCreatedAt);
        return userFollowMapper.selectList(wrapper);
    }

    @Override
    @Transactional
    public Long addFollow(UserFollow follow) {
        userFollowMapper.insert(follow);
        return follow.getId();
    }

    @Override
    @Transactional
    public void removeFollow(Long id) {
        userFollowMapper.deleteById(id);
    }
}
