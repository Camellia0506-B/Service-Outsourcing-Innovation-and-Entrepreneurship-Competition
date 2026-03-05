package www.gradquest.com.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;

import java.util.Map;

/**
 * 健康检查接口（用于启动验证与排错）
 *
 * 注意：application.yml 已设置 server.servlet.context-path=/api/v1
 * 因此此处实际访问地址为：/api/v1/health
 */
@RestController
@RequestMapping
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success(
                Map.of(
                        "service", "gradquest-backend",
                        "status", "ok"
                )
        );
    }
}

