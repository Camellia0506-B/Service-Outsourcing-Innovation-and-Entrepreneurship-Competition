package www.gradquest.com.controller;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.NoticeDetailResponse;
import www.gradquest.com.dto.NoticeListResponse;
import www.gradquest.com.entity.NoticePlaygroundItem;
import www.gradquest.com.service.CampNoticeService;

import java.time.LocalDate;
import java.util.List;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
public class CampNoticeController {

    private final CampNoticeService campNoticeService;

    @PostMapping("/universities/notices")
    public ApiResponse<NoticeListResponse> list(@RequestBody NoticeListRequest request) {
        return ApiResponse.success(campNoticeService.listByUniversity(request.getUnivId()));
    }

    @PostMapping("/notices/detail")
    public ApiResponse<NoticeDetailResponse> noticeDetail(@RequestBody NoticeIdRequest request) {
        return ApiResponse.success(campNoticeService.getDetail(request.getNoticeId()));
    }

    @PostMapping("/notices/playground")
    public ApiResponse<List<NoticePlaygroundItem>> noticePlayground() {
        return ApiResponse.success(campNoticeService.getAllNotice());
    }

    @Data
    private static class NoticeListRequest {
        private Integer univId;
    }

    @Data
    private static class NoticeIdRequest {
        private Long noticeId;
    }
}
