package www.gradquest.com.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.service.PDFAgentService;
import org.springframework.http.codec.ServerSentEvent;

import java.util.Map;

/**
 * PDF 文档阅读智能体控制器
 * 
 * @author GradQuest
 */
@RestController
@RequestMapping("/pdf")
@RequiredArgsConstructor
@Validated
public class PDFAgentController {

    private final PDFAgentService pdfAgentService;


    /**
     * 上传 PDF 文件并初始化智能体会话
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Map<String, Object>> uploadPdf(
            @RequestPart("file") @NotNull MultipartFile file,
            @RequestParam(value = "session_id", required = false) String sessionId) {

        if (file.isEmpty()) {
            return ApiResponse.badRequest("文件不能为空");
        }

        if (!file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
            return ApiResponse.badRequest("文件类型错误，仅支持 PDF 格式");
        }

        try {
            Map<String, Object> result = pdfAgentService.uploadPdf(file, sessionId);
            return ApiResponse.success("PDF 上传成功", result);
        } catch (Exception e) {
            return ApiResponse.serverError("服务器错误: " + e.getMessage());
        }
    }

    /**
     * 与 PDF 文档进行对话
     */
    @PostMapping("/chat")
    public ApiResponse<Map<String, Object>> chatWithPdf(@RequestBody @Validated ChatRequest request) {
        if (request.getQuestion() == null || request.getQuestion().trim().isEmpty()) {
            return ApiResponse.badRequest("问题不能为空");
        }

        if (request.getSessionId() == null || request.getSessionId().trim().isEmpty()) {
            return ApiResponse.badRequest("session_id 不能为空，请先上传 PDF 文件");
        }

        try {
            Map<String, Object> result = pdfAgentService.chat(request.getSessionId(), request.getQuestion());
            return ApiResponse.success(result);
        } catch (IllegalArgumentException e) {
            return ApiResponse.badRequest(e.getMessage());
        } catch (Exception e) {
            return ApiResponse.serverError("服务器错误: " + e.getMessage());
        }
    }

    /**
     * 与 PDF 文档进行流式对话（逐 token 返回）
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChatWithPdf(@RequestBody @Validated ChatRequest request) {
        if (request.getQuestion() == null || request.getQuestion().trim().isEmpty()) {
            return Flux.error(new IllegalArgumentException("问题不能为空"));
        }
        if (request.getSessionId() == null || request.getSessionId().trim().isEmpty()) {
            return Flux.error(new IllegalArgumentException("session_id 不能为空，请先上传 PDF 文件"));
        }

        return pdfAgentService.streamChat(request.getSessionId(), request.getQuestion())
                .map(token -> ServerSentEvent.builder(token).event("token").build())
                .concatWithValues(ServerSentEvent.builder("[DONE]").event("done").build())
                .onErrorResume(e -> Flux.just(
                        ServerSentEvent.builder("❌ " + (e.getMessage() == null ? "流式异常" : e.getMessage()))
                                .event("error").build(),
                        ServerSentEvent.builder("[DONE]").event("done").build()
                ));
    }

    /**
     * 清除会话数据
     */
    @PostMapping("/clear")
    public ApiResponse<Void> clearSession(@RequestBody @Validated ClearRequest request) {
        try {
            pdfAgentService.clearSession(request.getSessionId());
            return ApiResponse.success("会话已清除", null);
        } catch (Exception e) {
            return ApiResponse.serverError("服务器错误: " + e.getMessage());
        }
    }

    @Data
    private static class ChatRequest {
        @NotBlank(message = "问题不能为空")
        private String question;

        @NotBlank(message = "session_id 不能为空")
        private String sessionId;
    }

    @Data
    private static class ClearRequest {
        @NotBlank(message = "session_id 不能为空")
        private String sessionId;
    }
}
