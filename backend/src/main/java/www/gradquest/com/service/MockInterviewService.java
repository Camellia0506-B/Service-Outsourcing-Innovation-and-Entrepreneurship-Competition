package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.controller.MockInterviewController;

public interface MockInterviewService {

    /**
     * 6.1 语音转写
     */
    MockInterviewController.SpeechTranscribeResponse speechTranscribe(MultipartFile audioFile, String interviewId, Long userId);
}
