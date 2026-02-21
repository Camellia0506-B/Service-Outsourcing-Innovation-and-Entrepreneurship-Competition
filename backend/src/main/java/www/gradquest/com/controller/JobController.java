package www.gradquest.com.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.job.JobProfilePageData;
import www.gradquest.com.service.JobProfileService;

/**
 * 岗位画像模块：岗位列表分页查询（job_profiles 表）
 * GET /api/v1/job/profiles?page=1&size=12&keyword=&industry=&level=
 */
@RestController
@RequestMapping("/job")
@RequiredArgsConstructor
public class JobController {

    private final JobProfileService jobProfileService;

    @GetMapping("/profiles")
    public ApiResponse<JobProfilePageData> getJobProfiles(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String industry,
            @RequestParam(defaultValue = "") String level
    ) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 12;
        JobProfilePageData data = jobProfileService.getProfiles(page, size, keyword.trim(), industry.trim(), level.trim());
        return ApiResponse.success("success", data);
    }
}
