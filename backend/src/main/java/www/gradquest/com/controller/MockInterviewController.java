package www.gradquest.com.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.service.MockInterviewService;

/**
 * 模拟面试模块（API 文档 5）
 */
@RestController
@RequestMapping("/api/v1/mock-interview")
@RequiredArgsConstructor
@Validated
public class MockInterviewController {

    private final MockInterviewService mockInterviewService;

    /**
     * 6.1 语音转写接口
     */
    @PostMapping(value = "/speech/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SpeechTranscribeResponse> speechTranscribe(
            @RequestParam("audio_file") MultipartFile audioFile,
            @RequestParam("interview_id") @NotBlank String interviewId,
            @RequestParam("user_id") @NotNull Long userId) {
        try {
            SpeechTranscribeResponse data = mockInterviewService.speechTranscribe(audioFile, interviewId, userId);
            return ApiResponse.success("语音转写成功", data);
        } catch (IllegalArgumentException e) {
            return ApiResponse.badRequest(e.getMessage());
        } catch (IllegalStateException e) {
            return ApiResponse.failure(503, e.getMessage());
        }
    }

    @Data
    @Builder
    public static class SpeechTranscribeResponse {
        @JsonProperty("transcript")
        private String transcript;
        
        @JsonProperty("duration_seconds")
        private Integer durationSeconds;
        
        @JsonProperty("speech_meta")
        private SpeechMeta speechMeta;
    }

    @Data
    @Builder
    public static class SpeechMeta {
        @JsonProperty("words_per_minute")
        private Integer wordsPerMinute;
        
        @JsonProperty("pause_count")
        private Integer pauseCount;
        
        @JsonProperty("confidence_keywords")
        private java.util.List<String> confidenceKeywords;
        
        @JsonProperty("fluency_score")
        private Integer fluencyScore;
    }
}
