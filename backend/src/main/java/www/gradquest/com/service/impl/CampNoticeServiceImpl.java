package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;
import www.gradquest.com.entity.CampNotice;
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
    public NoticeListResponse listByUniversity(Integer univId, String deptName, String type, String examType, String beforeDate) {
        LambdaQueryWrapper<CampNotice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CampNotice::getUnivId, univId);
        if (StringUtils.hasText(deptName)) {
            wrapper.like(CampNotice::getDeptName, deptName);
        }
        if (StringUtils.hasText(type)) {
            wrapper.eq(CampNotice::getNoticeType, type);
        }
        if (StringUtils.hasText(examType)) {
            wrapper.like(CampNotice::getExamType, examType);
        }
        if (StringUtils.hasText(beforeDate)) {
            LocalDate date = LocalDate.parse(beforeDate, DateTimeFormatter.ISO_LOCAL_DATE);
            wrapper.le(CampNotice::getEndDate, date);
        }
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
                .noticeType(n.getNoticeType())
                .examType(n.getExamType())
                .endDate(n.getEndDate())
                .status(n.getStatus())
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
                .noticeType(notice.getNoticeType())
                .examType(notice.getExamType())
                .endDate(notice.getEndDate())
                .sourceLink(notice.getSourceLink())
                .status(notice.getStatus())
                .build();
    }
}
