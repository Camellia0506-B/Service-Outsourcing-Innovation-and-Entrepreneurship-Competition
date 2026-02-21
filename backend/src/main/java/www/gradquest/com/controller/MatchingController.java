package www.gradquest.com.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.matching.AnalyzeRequest;
import www.gradquest.com.dto.matching.BatchAnalyzeRequest;
import www.gradquest.com.dto.matching.RecommendJobsRequest;
import www.gradquest.com.service.MatchingService;

import java.util.Map;

/**
 * 人岗匹配模块（API 文档 6）
 */
@RestController
@RequestMapping("/matching")
@RequiredArgsConstructor
@Validated
public class MatchingController {

    private final MatchingService matchingService;

    /**
     * 6.1 获取推荐岗位
     */
    @PostMapping("/recommend-jobs")
    public ApiResponse<Map<String, Object>> recommendJobs(@RequestBody @Valid RecommendJobsRequest request) {
        try {
            if (request.getTopN() != null && (request.getTopN() < 1 || request.getTopN() > 50)) {
                return ApiResponse.badRequest("top_n 参数应在1-50之间");
            }
            Map<String, Object> data = matchingService.recommendJobs(request);
            return ApiResponse.success("success", data);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return ApiResponse.failure(404, e.getMessage());
            }
            return ApiResponse.serverError(e.getMessage());
        }
    }

    /**
     * 6.2 获取单个岗位匹配分析
     */
    @PostMapping("/analyze")
    public ApiResponse<Map<String, Object>> analyze(@RequestBody @Valid AnalyzeRequest request) {
        try {
            Map<String, Object> data = matchingService.analyze(request);
            return ApiResponse.success("success", data);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return ApiResponse.failure(404, e.getMessage());
            }
            return ApiResponse.serverError(e.getMessage());
        }
    }

    /**
     * 6.3 批量匹配分析
     */
    @PostMapping("/batch-analyze")
    public ApiResponse<Map<String, Object>> batchAnalyze(@RequestBody @Valid BatchAnalyzeRequest request) {
        try {
            if (request.getJobIds() == null || request.getJobIds().isEmpty()) {
                return ApiResponse.badRequest("请提供有效的 job_ids 数组");
            }
            if (request.getJobIds().size() > 20) {
                return ApiResponse.badRequest("job_ids 数量不能超过20个");
            }
            Map<String, Object> data = matchingService.batchAnalyze(request);
            return ApiResponse.success("success", data);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return ApiResponse.failure(404, e.getMessage());
            }
            return ApiResponse.serverError(e.getMessage());
        }
    }
}
