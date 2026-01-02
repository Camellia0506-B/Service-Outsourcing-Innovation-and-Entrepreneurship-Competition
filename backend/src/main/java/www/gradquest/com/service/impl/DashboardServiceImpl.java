package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import www.gradquest.com.dto.DashboardResponse;
import www.gradquest.com.entity.AppDailyContent;
import www.gradquest.com.entity.CampNotice;
import www.gradquest.com.entity.ForumPost;
import www.gradquest.com.entity.University;
import www.gradquest.com.entity.User;
import www.gradquest.com.entity.UserFollow;
import www.gradquest.com.mapper.AppDailyContentMapper;
import www.gradquest.com.mapper.CampNoticeMapper;
import www.gradquest.com.mapper.ForumPostMapper;
import www.gradquest.com.mapper.UniversityMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.mapper.UserFollowMapper;
import www.gradquest.com.service.DashboardService;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final AppDailyContentMapper appDailyContentMapper;
    private final CampNoticeMapper campNoticeMapper;
    private final ForumPostMapper forumPostMapper;
    private final UniversityMapper universityMapper;
    private final UserMapper userMapper;
    private final UserFollowMapper userFollowMapper;

    @Override
    public DashboardResponse getDashboard(Long userId) {
        AppDailyContent daily = appDailyContentMapper.selectOne(
                new LambdaQueryWrapper<AppDailyContent>().last("order by rand() limit 1")
        );

        List<UserFollow> follows = userFollowMapper.selectList(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getUserId, userId)
        );

        Set<Integer> univIds = follows.stream()
                .map(UserFollow::getUnivId)
                .collect(Collectors.toSet());

        Map<Integer, String> univNameMap = univIds.isEmpty()
                ? Collections.emptyMap()
                : universityMapper.selectBatchIds(univIds).stream()
                .collect(Collectors.toMap(University::getId, University::getName));

        List<CampNotice> notices = univIds.isEmpty()
                ? Collections.emptyList()
                : campNoticeMapper.selectList(new LambdaQueryWrapper<CampNotice>()
                .in(CampNotice::getUnivId, univIds)
                .orderByAsc(CampNotice::getEndDate));

        List<ForumPost> hotPosts = univIds.isEmpty()
                ? Collections.emptyList()
                : forumPostMapper.selectList(new LambdaQueryWrapper<ForumPost>()
                .in(ForumPost::getUnivId, univIds)
                .orderByDesc(ForumPost::getReplyCount));

        Map<Long, String> userNameMap = hotPosts.isEmpty()
                ? Collections.emptyMap()
                : userMapper.selectBatchIds(
                hotPosts.stream().map(ForumPost::getUserId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(User::getId, User::getUsername));

        return DashboardResponse.builder()
                .quote(daily != null ? daily.getQuote() : null)
                .bgImage(daily != null ? daily.getBgImage() : null)
                .ddlReminders(notices.stream().map(n -> DashboardResponse.DdlReminder.builder()
                        .noticeId(n.getId())
                        .univName(univNameMap.get(n.getUnivId()))
                        .deptName(n.getDeptName())
                        .title(n.getTitle())
                        .sourceLink(n.getSourceLink())
                        .endDate(n.getEndDate())
                        .build()).collect(Collectors.toList()))
                .hotPosts(hotPosts.stream().map(p -> DashboardResponse.HotPost.builder()
                        .postId(p.getId())
                        .title(p.getTitle())
                        .univName(univNameMap.get(p.getUnivId()))
                        .viewCount(p.getViewCount())
                        .username(userNameMap.get(p.getUserId()))
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
