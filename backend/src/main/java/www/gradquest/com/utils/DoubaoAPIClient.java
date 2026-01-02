package www.gradquest.com.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Doubao API 客户端
 * 用于调用 doubao-seed-1.6 API
 * 
 * @author GradQuest
 */
@Slf4j
@Component
public class DoubaoAPIClient {

    @Value("${doubao.api.key:#{systemEnvironment['ARK_API_KEY']}}")
    private String apiKey;

    @Value("${doubao.base.url:https://ark.cn-beijing.volces.com/api/v3}")
    private String baseUrl;

    @Value("${doubao.model:doubao-seed-1-6-251015}")
    private String model;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DoubaoAPIClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 调用聊天完成 API
     * 
     * @param messages 消息列表
     * @return AI 回答
     */
    public String chatCompletion(List<Map<String, Object>> messages) throws Exception {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("请设置环境变量 ARK_API_KEY 或配置 doubao.api.key");
        }

        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("reasoning_effort", "medium");

        String requestBodyJson = objectMapper.writeValueAsString(requestBody);

        // 构建 HTTP 请求
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                .timeout(Duration.ofSeconds(120))
                .build();

        // 发送请求
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API 调用失败: HTTP " + response.statusCode() + ", " + response.body());
        }

        // 解析响应
        JsonNode jsonNode = objectMapper.readTree(response.body());
        JsonNode choices = jsonNode.get("choices");
        if (choices == null || !choices.isArray() || choices.size() == 0) {
            throw new RuntimeException("API 响应格式错误: " + response.body());
        }

        JsonNode message = choices.get(0).get("message");
        if (message == null) {
            throw new RuntimeException("API 响应格式错误: " + response.body());
        }

        JsonNode content = message.get("content");
        if (content == null) {
            throw new RuntimeException("API 响应格式错误: " + response.body());
        }

        return content.asText();
    }
}
