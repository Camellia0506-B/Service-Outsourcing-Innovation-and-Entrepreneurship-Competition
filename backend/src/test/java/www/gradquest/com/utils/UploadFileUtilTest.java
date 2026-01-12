package www.gradquest.com.utils;

import org.junit.jupiter.api.Test;

import java.io.File;
import java.net.URISyntaxException;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;

class UploadFileUtilTest {

    @Test
    void testUpload() throws URISyntaxException {
        // 获取测试资源文件（test.pdf）
        var url = getClass().getClassLoader().getResource("test.pdf");
        assertNotNull(url, "test.pdf should exist in src/test/resources.");

        File testFile = new File(url.toURI()); // ⭐ 关键修复点
        // 校验文件存在性
        assertNotNull(testFile, "test.pdf should exist in the resources folder.");
        assertTrue(testFile.exists(), "test.pdf should exist in the resources folder.");

        // 调用 UploadFileUtil.upload() 上传文件
        String fileUrl = UploadFileUtil.upload(testFile);

        // 校验返回的 URL 是否以“http”开头（基本验证URL格式）
        assertNotNull(fileUrl, "File URL should not be null.");
        assertTrue(fileUrl.startsWith("http"), "Returned URL should start with http.");

        // 打印 URL（可以查看是否正确生成）
        System.out.println("Uploaded file URL: " + fileUrl);
    }
}
