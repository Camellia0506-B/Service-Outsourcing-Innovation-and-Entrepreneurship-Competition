package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import www.gradquest.com.dto.matching.AnalyzeRequest;
import www.gradquest.com.dto.matching.BatchAnalyzeRequest;
import www.gradquest.com.dto.matching.RecommendJobsRequest;
import www.gradquest.com.service.MatchingService;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * 人岗匹配服务实现
 * 调用 AI 算法服务（Flask，端口 5001）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingServiceImpl implements MatchingService {

    @Value("${ai.algorithm.base-url:http://127.0.0.1:5001/api/v1}")
    private String aiAlgorithmBaseUrl;

    private WebClient getWebClient() {
        return WebClient.builder()
                .baseUrl(aiAlgorithmBaseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public Map<String, Object> recommendJobs(RecommendJobsRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("top_n", request.getTopN() != null ? request.getTopN() : 10);
            if (request.getFilters() != null && !request.getFilters().isEmpty()) {
                requestBody.put("filters", request.getFilters());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/matching/recommend-jobs")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();

            return extractDataOrThrow(response, "推荐岗位");
        } catch (WebClientResponseException e) {
            handleMatchingError(e, "推荐岗位");
            throw new RuntimeException("调用AI服务失败");
        } catch (Exception e) {
            log.error("[Matching] 推荐岗位异常", e);
            throw new RuntimeException("获取推荐岗位失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> analyze(AnalyzeRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("job_id", request.getJobId());

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/matching/analyze")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            return extractDataOrThrow(response, "岗位匹配分析");
        } catch (WebClientResponseException e) {
            handleMatchingError(e, "岗位匹配分析");
            throw new RuntimeException("调用AI服务失败");
        } catch (Exception e) {
            log.error("[Matching] 岗位匹配分析异常", e);
            throw new RuntimeException("获取岗位匹配分析失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> batchAnalyze(BatchAnalyzeRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("job_ids", request.getJobIds());

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/matching/batch-analyze")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(90))
                    .block();

            return extractDataOrThrow(response, "批量匹配分析");
        } catch (WebClientResponseException e) {
            handleMatchingError(e, "批量匹配分析");
            throw new RuntimeException("调用AI服务失败");
        } catch (Exception e) {
            log.error("[Matching] 批量匹配分析异常", e);
            throw new RuntimeException("批量匹配分析失败: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractDataOrThrow(Map<String, Object> response, String action) {
        if (response == null || response.get("code") == null) {
            throw new RuntimeException("AI服务返回格式异常");
        }
        Integer code = (Integer) response.get("code");
        if (code != 200) {
            String msg = String.valueOf(response.get("msg"));
            log.warn("[Matching] {} 失败: code={}, msg={}", action, code, msg);
            throw new RuntimeException(msg);
        }
        Object data = response.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        throw new RuntimeException("AI服务返回 data 格式异常");
    }

    private void handleMatchingError(WebClientResponseException e, String action) {
        log.error("[Matching] 调用AI服务失败: {} status={}, body={}", action, e.getStatusCode(), e.getResponseBodyAsString());
        if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
            throw new RuntimeException("能力画像或岗位不存在，请先生成能力画像并确保岗位数据已生成");
        }
    }
}
