package www.gradquest.com.utils;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * PDF 处理工具类
 * 将 PDF 文件转换为图像
 * 
 * @author GradQuest
 */
@Component
public class PDFProcessor {

    private static final int DPI = 300;

    /**
     * 将 PDF 文件转换为图像列表
     * 
     * @param pdfFile PDF 文件
     * @return 图像列表，每个元素是一页 PDF 的图像
     */
    public List<BufferedImage> pdfToImages(File pdfFile) throws IOException {
        List<BufferedImage> images = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            PDFRenderer pdfRenderer = new PDFRenderer(document);

            int pageCount = document.getNumberOfPages();
            for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                // 渲染页面为图像，DPI 为 300
                BufferedImage image = pdfRenderer.renderImageWithDPI(pageIndex, DPI);
                images.add(image);
            }
        }

        return images;
    }

    /**
     * 将 BufferedImage 转换为 base64 编码的字符串
     * 
     * @param image 图像对象
     * @return base64 编码的图像字符串（data URL 格式）
     */
    public String imageToBase64(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        byte[] imageBytes = baos.toByteArray();

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        return "data:image/png;base64," + base64Image;
    }
}
