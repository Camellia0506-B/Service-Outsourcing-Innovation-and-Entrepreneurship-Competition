package www.gradquest.com.service;

import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;

/**
 * @author zhangzherui
 */
public interface CampNoticeService {
    NoticeListResponse listByUniversity(Integer univId, String deptName, String type, String examType, String beforeDate);

    NoticeDetailResponse getDetail(Long id);
}
