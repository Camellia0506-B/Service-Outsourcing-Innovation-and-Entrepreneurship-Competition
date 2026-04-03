package www.gradquest.com.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import www.gradquest.com.controller.MockInterviewController;
import www.gradquest.com.service.MockInterviewService;

import java.io.File;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MockInterviewServiceImpl implements MockInterviewService {

    @Value("${ai.algorithm.base-url:http://127.0.0.1:5002/api/v1}")
    private String aiAlgorithmBaseUrl;

    @Override
    public MockInterviewController.SpeechTranscribeResponse speechTranscribe(MultipartFile audioFile, String interviewId, Long userId) {
        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("请上传音频文件");
        }
        if (interviewId == null || interviewId.isBlank()) {
            throw new IllegalArgumentException("interview_id 不能为空");
        }
        if (userId == null) {
            throw new IllegalArgumentException("user_id 不能为空");
        }

        try {
            File tmpFile = File.createTempFile("audio_", ".webm");
            audioFile.transferTo(tmpFile);

            try {
                Map<String, Object> pythonResult = callPythonSpeechTranscribe(tmpFile, interviewId, userId);
                if (pythonResult != null) {
                    String transcript = (String) pythonResult.get("transcript");
                    Integer durationSeconds = pythonResult.get("duration_seconds") != null 
                            ? ((Number) pythonResult.get("duration_seconds")).intValue() 
                            : null;
                    @SuppressWarnings("unchecked")
                    Map<String, Object> speechMetaMap = (Map<String, Object>) pythonResult.get("speech_meta");
                    
                    MockInterviewController.SpeechMeta speechMeta = null;
                    if (speechMetaMap != null) {
                        speechMeta = MockInterviewController.SpeechMeta.builder()
                                .wordsPerMinute(speechMetaMap.get("words_per_minute") != null ? ((Number) speechMetaMap.get("words_per_minute")).intValue() : null)
                                .pauseCount(speechMetaMap.get("pause_count") != null ? ((Number) speechMetaMap.get("pause_count")).intValue() : null)
                                .confidenceKeywords((java.util.List<String>) speechMetaMap.get("confidence_keywords"))
                                .fluencyScore(speechMetaMap.get("fluency_score") != null ? ((Number) speechMetaMap.get("fluency_score")).intValue() : null)
                                .build();
                    }
                    
                    return MockInterviewController.SpeechTranscribeResponse.builder()
                            .transcript(transcript)
                            .durationSeconds(durationSeconds)
                            .speechMeta(speechMeta)
                            .build();
                }
            } finally {
                tmpFile.delete();
            }

            throw new IllegalStateException("AI算法服务不可用或语音转写失败，请先启动 AI算法 服务（默认端口 5002）");
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("语音转写异常: " + (e.getMessage() != null ? e.getMessage() : "未知错误"));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callPythonSpeechTranscribe(File audioFile, String interviewId, Long userId) {
        try {
            Map<String, Object> response = WebClient.builder()
                    .baseUrl(aiAlgorithmBaseUrl)
                    .build()
                    .post()
                    .uri("/mock-interview/speech/transcribe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .bodyValue(
                            org.springframework.web.reactive.function.BodyInserters.fromMultipartData(
                                    "audio_file", 
                                    new FileSystemResource(audioFile)
                            ).with("interview_id", interviewId)
                            .with("user_id", userId.toString())
                    )
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
            
            if (response != null && Integer.valueOf(200).equals(response.get("code"))) {
                Object data = response.get("data");
                if (data instanceof Map) return (Map<String, Object>) data;
            }
        } catch (WebClientResponseException e) {
        } catch (Exception e) {
        }
        return null;
    }
}
