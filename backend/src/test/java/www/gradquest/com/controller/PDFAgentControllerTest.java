package www.gradquest.com.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * PDF 智能体控制器测试
 */
@SpringBootTest
@AutoConfigureMockMvc
public class PDFAgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testHealthCheck() throws Exception {
        mockMvc.perform(get("/pdf"))
                .andExpect(status().isOk());
    }

    @Test
    public void testUploadPdf() throws Exception {
        // 创建一个模拟的 PDF 文件
        byte[] pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
                .getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                pdfContent);

        mockMvc.perform(multipart("/api/v1/pdf/upload")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.session_id").exists())
                .andExpect(jsonPath("$.data.page_count").exists());
    }

    @Test
    public void testChatWithoutSession() throws Exception {
        String requestBody = """
                {
                    "question": "这个文档的主要内容是什么？",
                    "session_id": "invalid-session-id"
                }
                """;

        mockMvc.perform(post("/api/v1/pdf/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }
}
