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
import www.gradquest.com.mapper.AppDailyContentMapper;
import www.gradquest.com.mapper.CampNoticeMapper;
import www.gradquest.com.mapper.ForumPostMapper;
import www.gradquest.com.mapper.UniversityMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.service.DashboardService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
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

    @Override
    public DashboardResponse getDashboard(Long userId) {
        AppDailyContent daily = appDailyContentMapper.selectOne(new LambdaQueryWrapper<AppDailyContent>().orderByDesc(AppDailyContent::getDate).last("limit 1"));
        LocalDate today = LocalDate.now();
        List<CampNotice> notices = campNoticeMapper.selectList(new LambdaQueryWrapper<CampNotice>().orderByAsc(CampNotice::getEndDate).last("limit 5"));
        List<ForumPost> hotPosts = forumPostMapper.selectList(new LambdaQueryWrapper<ForumPost>().orderByDesc(ForumPost::getViewCount).last("limit 5"));
        return DashboardResponse.builder()
                .date(today)
                .quote(daily != null ? daily.getQuote() : null)
                .bgImage(daily != null ? daily.getBgImage() : null)
                .ddlReminders(notices.stream().map(n -> {
                    University u = universityMapper.selectById(n.getUnivId());
                    return DashboardResponse.DdlReminder.builder()
                            .noticeId(n.getId())
                            .univName(u != null ? u.getName() : null)
                            .deptName(n.getDeptName())
                            .title(n.getTitle())
                            .daysLeft(n.getEndDate() != null ? ChronoUnit.DAYS.between(today, n.getEndDate()) : 0)
                            .endDate(n.getEndDate())
                            .build();
                }).collect(Collectors.toList()))
                .hotPosts(hotPosts.stream().map(p -> {
                    University u = universityMapper.selectById(p.getUnivId());
                    User user = userMapper.selectById(p.getUserId());
                    return DashboardResponse.HotPost.builder()
                            .postId(p.getId())
                            .title(p.getTitle())
                            .univName(u != null ? u.getName() : null)
                            .viewCount(p.getViewCount())
                            .username(user != null ? user.getUsername() : null)
                            .build();
                }).collect(Collectors.toList()))
                .build();
    }
}
