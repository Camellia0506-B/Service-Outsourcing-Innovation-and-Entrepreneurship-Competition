package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import www.gradquest.com.dto.student.AbilityProfileRequest;
import www.gradquest.com.dto.matching.AnalyzeRequest;
import www.gradquest.com.dto.matching.BatchAnalyzeRequest;
import www.gradquest.com.dto.matching.RecommendJobsRequest;
import www.gradquest.com.service.MatchingService;
import www.gradquest.com.service.StudentAbilityService;

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

    private final StudentAbilityService studentAbilityService;

    private WebClient getWebClient() {
        return WebClient.builder()
                .baseUrl(aiAlgorithmBaseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public Map<String, Object> recommendJobs(RecommendJobsRequest request) {
        try {
            Map<String, Object> abilityProfile = fetchAbilityProfile(request.getUserId());
            if (abilityProfile == null) {
                throw new RuntimeException("能力画像不存在，请先生成能力画像");
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("top_n", request.getTopN() != null ? request.getTopN() : 10);
            requestBody.put("ability_profile", abilityProfile);
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
            String detail = handleMatchingError(e, "推荐岗位");
            throw new RuntimeException(detail);
        } catch (Exception e) {
            log.error("[Matching] 推荐岗位异常", e);
            throw new RuntimeException("获取推荐岗位失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> analyze(AnalyzeRequest request) {
        try {
            Map<String, Object> abilityProfile = fetchAbilityProfile(request.getUserId());
            if (abilityProfile == null) {
                throw new RuntimeException("能力画像不存在，请先生成能力画像");
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("job_id", request.getJobId());
            requestBody.put("ability_profile", abilityProfile);

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
            String detail = handleMatchingError(e, "岗位匹配分析");
            throw new RuntimeException(detail);
        } catch (Exception e) {
            log.error("[Matching] 岗位匹配分析异常", e);
            throw new RuntimeException("获取岗位匹配分析失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> batchAnalyze(BatchAnalyzeRequest request) {
        try {
            Map<String, Object> abilityProfile = fetchAbilityProfile(request.getUserId());
            if (abilityProfile == null) {
                throw new RuntimeException("能力画像不存在，请先生成能力画像");
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("job_ids", request.getJobIds());
            requestBody.put("ability_profile", abilityProfile);

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
            String detail = handleMatchingError(e, "批量匹配分析");
            throw new RuntimeException(detail);
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

    private String handleMatchingError(WebClientResponseException e, String action) {
        String body = e.getResponseBodyAsString();
        log.error("[Matching] 调用AI服务失败: {} status={}, body={}", action, e.getStatusCode(), body);
        if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
            return "能力画像或岗位不存在，请先生成能力画像并确保岗位数据已生成";
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> json = mapper.readValue(body, java.util.Map.class);
            Object msg = json != null ? json.get("msg") : null;
            if (msg != null && !String.valueOf(msg).isBlank()) {
                return "调用AI服务失败: " + msg;
            }
        } catch (Exception ignored) { }
        return "调用AI服务失败: " + e.getStatusCode() + " " + (body != null && body.length() > 200 ? body.substring(0, 200) + "..." : body);
    }

    private Map<String, Object> fetchAbilityProfile(Long userId) {
        try {
            AbilityProfileRequest req = new AbilityProfileRequest();
            req.setUserId(userId);
            return studentAbilityService.getAbilityProfile(req);
        } catch (Exception e) {
            log.warn("[Matching] 获取能力画像失败: userId={}, {}", userId, e.getMessage());
            return null;
        }
    }
}
