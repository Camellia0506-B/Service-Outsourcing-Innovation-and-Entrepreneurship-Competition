package www.gradquest.com.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.DashboardResponse;
import www.gradquest.com.service.DashboardService;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @PostMapping
    public ApiResponse<DashboardResponse> getDashboard(@RequestBody DashboardRequest request) {
        return ApiResponse.success(dashboardService.getDashboard(request.userId()));
    }

    private record DashboardRequest(Long userId) {
    }
}
