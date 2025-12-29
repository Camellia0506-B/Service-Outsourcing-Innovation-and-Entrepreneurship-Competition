package www.gradquest.com.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping
    public ApiResponse<PageResponse<University>> list(@RequestParam(value = "page", defaultValue = "1") int page,
                                                     @RequestParam(value = "size", defaultValue = "10") int size,
                                                     @RequestParam(value = "keyword", required = false) String keyword,
                                                     @RequestParam(value = "tags", required = false) String tags) {
        return ApiResponse.success(universityService.listUniversities(page, size, keyword, tags));
    }
}
