package www.gradquest.com.utils;

import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;

class UploadFileUtilTest {

    @Test
    void testUpload() {
        // 获取测试资源文件（test.pdf）
        File testFile = new File(Objects.requireNonNull(getClass().getClassLoader().getResource("test.pdf")).getFile());

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
