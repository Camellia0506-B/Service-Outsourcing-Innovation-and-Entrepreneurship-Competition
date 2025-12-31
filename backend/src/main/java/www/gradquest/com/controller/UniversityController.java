package www.gradquest.com.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.common.PageResponse;
import www.gradquest.com.entity.University;
import www.gradquest.com.service.UniversityService;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping("/universities")
@RequiredArgsConstructor
public class UniversityController {

    private final UniversityService universityService;

    @PostMapping
    public ApiResponse<PageResponse<University>> list(@RequestBody UniversityListRequest request) {
        int page = request.page == null ? 1 : request.page;
        int size = request.size == null ? 10 : request.size;
        return ApiResponse.success(universityService.listUniversities(page, size, request.keyword, request.tags));
    }

    @PostMapping("/info")
    public ApiResponse<University> detail(@RequestBody UniversityInfoRequest request) {
        return ApiResponse.success(universityService.getById(request.univId));
    }

    private record UniversityListRequest(Integer page, Integer size, String keyword, String tags) {
    }

    private record UniversityInfoRequest(Integer univId) {
    }
}
