package www.gradquest.com.service;

import www.gradquest.com.dto.DashboardResponse;

/**
 * @author zhangzherui
 */
public interface DashboardService {
    DashboardResponse getDashboard(Long userId);
}
