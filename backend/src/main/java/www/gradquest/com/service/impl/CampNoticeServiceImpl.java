package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;
import www.gradquest.com.entity.CampNotice;
import www.gradquest.com.entity.NoticePlaygroundItem;
import www.gradquest.com.entity.University;
import www.gradquest.com.mapper.CampNoticeMapper;
import www.gradquest.com.service.CampNoticeService;
import www.gradquest.com.service.UniversityService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class CampNoticeServiceImpl implements CampNoticeService {

    private final CampNoticeMapper campNoticeMapper;
    private final UniversityService universityService;

    @Override
    public NoticeListResponse listByUniversity(Integer univId) {
        LambdaQueryWrapper<CampNotice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CampNotice::getUnivId, univId);
        List<CampNotice> notices = campNoticeMapper.selectList(wrapper);
        University university = universityService.getById(univId);
        NoticeListResponse.UniversityBrief brief = university == null ? null : NoticeListResponse.UniversityBrief.builder()
                .id(university.getId())
                .name(university.getName())
                .logoUrl(university.getLogoUrl())
                .tags(university.getTags())
                .intro(university.getIntro())
                .build();
        List<NoticeListResponse.NoticeItem> items = notices.stream().map(n -> NoticeListResponse.NoticeItem.builder()
                .id(n.getId())
                .deptName(n.getDeptName())
                .title(n.getTitle())
                .endDate(n.getEndDate())
                .sourceLink(n.getSourceLink())
                .build()).collect(Collectors.toList());
        return NoticeListResponse.builder().info(brief).notices(items).build();
    }

    @Override
    public NoticeDetailResponse getDetail(Long id) {
        CampNotice notice = campNoticeMapper.selectById(id);
        if (notice == null) {
            return null;
        }
        return NoticeDetailResponse.builder()
                .id(notice.getId())
                .univId(notice.getUnivId())
                .deptName(notice.getDeptName())
                .title(notice.getTitle())
                .content(notice.getContent())
                .endDate(notice.getEndDate())
                .sourceLink(notice.getSourceLink())
                .build();
    }
    @Override
    public List<NoticePlaygroundItem> getAllNotice() {
        // 1) 查全部 CampNotice（如果你想按 univId 过滤，把下面注释打开）
        LambdaQueryWrapper<CampNotice> wrapper = new LambdaQueryWrapper<>();
        // wrapper.eq(CampNotice::getUnivId, univId);

        List<CampNotice> notices = campNoticeMapper.selectList(wrapper);

        // 2) 映射成 NoticePlaygroundItem
        return notices.stream()
                .map(n -> NoticePlaygroundItem.builder()
                        .id(n.getId())
                        .deptName(n.getDeptName())
                        .title(n.getTitle())
                        .endDate(n.getEndDate())
                        .sourceLink(n.getSourceLink())
                        .build())
                .collect(Collectors.toList());
    }

}
