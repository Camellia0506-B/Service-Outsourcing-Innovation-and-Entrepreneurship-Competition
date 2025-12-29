package www.gradquest.com.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;
import www.gradquest.com.service.CampNoticeService;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
public class CampNoticeController {

    private final CampNoticeService campNoticeService;

    @GetMapping("/universities/{id}/notices")
    public ApiResponse<NoticeListResponse> list(@PathVariable("id") Integer univId,
                                                @RequestParam(value = "dept_name", required = false) String deptName,
                                                @RequestParam(value = "type", required = false) String type,
                                                @RequestParam(value = "exam_type", required = false) String examType,
                                                @RequestParam(value = "before_date", required = false) String beforeDate) {
        return ApiResponse.success(campNoticeService.listByUniversity(univId, deptName, type, examType, beforeDate));
    }

    @GetMapping("/notices/{id}")
    public ApiResponse<NoticeDetailResponse> detail(@PathVariable("id") Long id) {
        return ApiResponse.success(campNoticeService.getDetail(id));
    }
}
