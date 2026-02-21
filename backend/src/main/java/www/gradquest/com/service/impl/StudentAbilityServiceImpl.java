package www.gradquest.com.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import www.gradquest.com.dto.profile.ProfileInfoResponse;
import www.gradquest.com.dto.student.AbilityProfileRequest;
import www.gradquest.com.dto.student.AiGenerateProfileRequest;
import www.gradquest.com.dto.student.UpdateProfileRequest;
import www.gradquest.com.service.ProfileService;
import www.gradquest.com.service.StudentAbilityService;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * 学生能力画像服务实现
 * 调用 AI 算法服务（Flask，端口 5001）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentAbilityServiceImpl implements StudentAbilityService {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${ai.algorithm.base-url:http://127.0.0.1:5001/api/v1}")
    private String aiAlgorithmBaseUrl;

    private final ProfileService profileService;

    private WebClient getWebClient() {
        return WebClient.builder()
                .baseUrl(aiAlgorithmBaseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public Map<String, Object> getAbilityProfile(AbilityProfileRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/student/ability-profile")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response != null && response.get("code") != null) {
                Integer code = (Integer) response.get("code");
                if (code == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) response.get("data");
                    return data;
                } else {
                    log.warn("[StudentAbility] 获取能力画像失败: code={}, msg={}", code, response.get("msg"));
                    throw new RuntimeException("获取能力画像失败: " + response.get("msg"));
                }
            }
            throw new RuntimeException("AI服务返回格式异常");
        } catch (WebClientResponseException e) {
            log.error("[StudentAbility] 调用AI服务失败: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new RuntimeException("用户能力画像不存在，请先生成");
            }
            throw new RuntimeException("调用AI服务失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("[StudentAbility] 获取能力画像异常", e);
            throw new RuntimeException("获取能力画像失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> aiGenerateProfile(AiGenerateProfileRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            String dataSource = request.getDataSource() != null ? request.getDataSource() : "profile";
            requestBody.put("data_source", dataSource);

            if ("profile".equals(dataSource)) {
                ProfileInfoResponse profile = profileService.getProfileInfo(request.getUserId());
                if (profile == null) {
                    throw new RuntimeException("用户档案不存在，请先完善个人档案");
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> profileData = JSON.convertValue(profile, Map.class);
                requestBody.put("profile_data", profileData);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/student/ai-generate-profile")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response != null && response.get("code") != null) {
                Integer code = (Integer) response.get("code");
                if (code == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) response.get("data");
                    return data;
                } else {
                    log.warn("[StudentAbility] AI生成画像失败: code={}, msg={}", code, response.get("msg"));
                    throw new RuntimeException("AI生成画像失败: " + response.get("msg"));
                }
            }
            throw new RuntimeException("AI服务返回格式异常");
        } catch (WebClientResponseException e) {
            log.error("[StudentAbility] 调用AI服务失败: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("调用AI服务失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("[StudentAbility] AI生成画像异常", e);
            throw new RuntimeException("AI生成画像失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> updateProfile(UpdateProfileRequest request) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", request.getUserId());
            requestBody.put("updates", request.getUpdates());

            @SuppressWarnings("unchecked")
            Map<String, Object> response = getWebClient()
                    .post()
                    .uri("/student/update-profile")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response != null && response.get("code") != null) {
                Integer code = (Integer) response.get("code");
                if (code == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) response.get("data");
                    return data;
                } else {
                    log.warn("[StudentAbility] 更新画像失败: code={}, msg={}", code, response.get("msg"));
                    throw new RuntimeException("更新画像失败: " + response.get("msg"));
                }
            }
            throw new RuntimeException("AI服务返回格式异常");
        } catch (WebClientResponseException e) {
            log.error("[StudentAbility] 调用AI服务失败: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new RuntimeException("用户能力画像不存在，请先生成");
            }
            throw new RuntimeException("调用AI服务失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("[StudentAbility] 更新画像异常", e);
            throw new RuntimeException("更新画像失败: " + e.getMessage());
        }
    }
}
