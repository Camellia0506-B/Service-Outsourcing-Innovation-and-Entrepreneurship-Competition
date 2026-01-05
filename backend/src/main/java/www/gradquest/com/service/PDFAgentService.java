package www.gradquest.com.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import www.gradquest.com.utils.PDFProcessor;
import www.gradquest.com.utils.DoubaoAPIClient;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * PDF 智能体服务
 * 
 * @author GradQuest
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PDFAgentService {

    private final PDFProcessor pdfProcessor;
    private final DoubaoAPIClient apiClient;

    // 存储会话数据：sessionId -> {images, conversationHistory}
    private final Map<String, SessionData> sessions = new HashMap<>();

    /**
     * 上传 PDF 文件并初始化会话
     */
    public Map<String, Object> uploadPdf(MultipartFile file, String sessionId) throws IOException {
        // 生成或使用提供的 sessionId
        if (sessionId == null || sessionId.trim().isEmpty()) {
            sessionId = UUID.randomUUID().toString();
        }

        // 保存临时文件
        File tempFile = null;
        try {
            tempFile = File.createTempFile("pdf_", ".pdf");
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(file.getBytes());
            }

            // 处理 PDF：转换为图像
            List<BufferedImage> images = pdfProcessor.pdfToImages(tempFile);

            if (images.isEmpty()) {
                throw new IOException("PDF 文件处理失败，无法提取页面");
            }

            // 初始化会话
            SessionData sessionData = new SessionData();
            sessionData.setImages(images);
            sessionData.setConversationHistory(new ArrayList<>());
            sessions.put(sessionId, sessionData);

            Map<String, Object> result = new HashMap<>();
            result.put("session_id", sessionId);
            result.put("page_count", images.size());
            result.put("filename", file.getOriginalFilename());

            return result;
        } finally {
            // 清理临时文件
            if (tempFile != null && tempFile.exists()) {
                Files.deleteIfExists(tempFile.toPath());
            }
        }
    }

    /**
     * 与 PDF 进行对话
     */
    public Map<String, Object> chat(String sessionId, String question) throws Exception {
        SessionData sessionData = sessions.get(sessionId);
        if (sessionData == null) {
            throw new IllegalArgumentException("会话不存在或已过期，请重新上传 PDF 文件");
        }

        // 构建消息列表
        List<Map<String, Object>> messages = new ArrayList<>();

        // 添加历史对话
        for (Map<String, Object> msg : sessionData.getConversationHistory()) {
            messages.add(new HashMap<>(msg));
        }

        // 构建当前问题的消息
        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");

        List<Map<String, Object>> contentList = new ArrayList<>();

        // 添加图像（限制最多 10 页）
        int maxPages = Math.min(sessionData.getImages().size(), 10);
        for (int i = 0; i < maxPages; i++) {
            BufferedImage image = sessionData.getImages().get(i);
            String base64Image = pdfProcessor.imageToBase64(image);

            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("type", "image_url");
            Map<String, Object> imageUrl = new HashMap<>();
            imageUrl.put("url", base64Image);
            imageContent.put("image_url", imageUrl);
            contentList.add(imageContent);
        }

        // 添加文本问题
        String questionWithContext = question;
        if (sessionData.getImages().size() > maxPages) {
            questionWithContext = question + "\n\n注意：文档共有 " + sessionData.getImages().size()
                    + " 页，当前显示了前 " + maxPages + " 页。";
        }

        Map<String, Object> textContent = new HashMap<>();
        textContent.put("type", "text");
        textContent.put("text", questionWithContext);
        contentList.add(textContent);

        userMessage.put("content", contentList);
        messages.add(userMessage);

        // 调用 API
        String answer = apiClient.chatCompletion(messages);

        // 保存对话历史
        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", question);
        sessionData.getConversationHistory().add(userMsg);

        Map<String, Object> assistantMsg = new HashMap<>();
        assistantMsg.put("role", "assistant");
        assistantMsg.put("content", answer);
        sessionData.getConversationHistory().add(assistantMsg);

        Map<String, Object> result = new HashMap<>();
        result.put("answer", answer);
        result.put("session_id", sessionId);

        return result;
    }

    /**
     * 流式与 PDF 进行对话
     */
    public Flux<String> streamChat(String sessionId, String question) {

        // 1) 先拿 session（同步检查）
        SessionData sessionData = sessions.get(sessionId);
        if (sessionData == null) {
            return Flux.error(new IllegalArgumentException("会话不存在或已过期，请重新上传 PDF 文件"));
        }

        // 2) 构建 messages + base64 编码是“重活”，放到 boundedElastic，避免阻塞 Netty event-loop
        return Mono.fromCallable(() -> {
                    // 构建消息列表
                    List<Map<String, Object>> messages = new ArrayList<>();

                    // 添加历史对话（做快照，避免并发修改风险）
                    List<Map<String, Object>> historySnapshot = new ArrayList<>(sessionData.getConversationHistory());
                    for (Map<String, Object> msg : historySnapshot) {
                        messages.add(new HashMap<>(msg));
                    }

                    // 构建当前问题消息
                    Map<String, Object> userMessage = new HashMap<>();
                    userMessage.put("role", "user");

                    List<Map<String, Object>> contentList = new ArrayList<>();

                    // 添加图像（最多 10 页）
                    int maxPages = Math.min(sessionData.getImages().size(), 10);
                    for (int i = 0; i < maxPages; i++) {
                        BufferedImage image = sessionData.getImages().get(i);
                        String base64Image = pdfProcessor.imageToBase64(image);

                        Map<String, Object> imageContent = new HashMap<>();
                        imageContent.put("type", "image_url");
                        Map<String, Object> imageUrl = new HashMap<>();
                        imageUrl.put("url", base64Image);
                        imageContent.put("image_url", imageUrl);
                        contentList.add(imageContent);
                    }

                    // 添加文本问题
                    String questionWithContext = question;
                    if (sessionData.getImages().size() > maxPages) {
                        questionWithContext = question + "\n\n注意：文档共有 " + sessionData.getImages().size()
                                + " 页，当前显示了前 " + maxPages + " 页。";
                    }

                    Map<String, Object> textContent = new HashMap<>();
                    textContent.put("type", "text");
                    textContent.put("text", questionWithContext);
                    contentList.add(textContent);

                    userMessage.put("content", contentList);
                    messages.add(userMessage);

                    return messages;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(messages -> {
                    // 3) 保存用户消息到历史（这里如果并发大，建议换线程安全 list 或加锁）
                    Map<String, Object> userMsg = new HashMap<>();
                    userMsg.put("role", "user");
                    userMsg.put("content", question);
                    sessionData.getConversationHistory().add(userMsg);

                    // 4) 真正的流式转发：直接返回上游 Flux（不在这里 subscribe）
                    StringBuilder fullAnswer = new StringBuilder();

                    return apiClient.streamChatCompletion(messages)
                            .doOnNext(token -> fullAnswer.append(token))
                            .doOnComplete(() -> {
                                Map<String, Object> assistantMsg = new HashMap<>();
                                assistantMsg.put("role", "assistant");
                                assistantMsg.put("content", fullAnswer.toString());
                                sessionData.getConversationHistory().add(assistantMsg);
                            })
                            .doOnError(err -> log.error("流式聊天错误", err));
                });
    }

    /**
     * 清除会话
     */
    public void clearSession(String sessionId) {
        sessions.remove(sessionId);
    }

    /**
     * 会话数据内部类
     */
    private static class SessionData {
        private List<BufferedImage> images;
        private List<Map<String, Object>> conversationHistory;

        public List<BufferedImage> getImages() {
            return images;
        }

        public void setImages(List<BufferedImage> images) {
            this.images = images;
        }

        public List<Map<String, Object>> getConversationHistory() {
            return conversationHistory;
        }

        public void setConversationHistory(List<Map<String, Object>> conversationHistory) {
            this.conversationHistory = conversationHistory;
        }
    }
}
