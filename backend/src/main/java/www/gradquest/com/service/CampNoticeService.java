package www.gradquest.com.service;

import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;
import www.gradquest.com.entity.NoticePlaygroundItem;

import java.util.List;

/**
 * @author zhangzherui
 */
public interface CampNoticeService {
    NoticeListResponse listByUniversity(Integer univId);

    NoticeDetailResponse getDetail(Long id);

    List<NoticePlaygroundItem> getAllNotice();
}
