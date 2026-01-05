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
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;


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
    public String imageToBase64(BufferedImage image) {
        try {
            // ============================
            // 1️⃣ 缩放（控制最长边，防止超大图）
            // ============================
            int maxSize = 1200; // 推荐 1000~1400，越小越快
            int width = image.getWidth();
            int height = image.getHeight();

            if (Math.max(width, height) > maxSize) {
                float scale = (float) maxSize / Math.max(width, height);
                int newW = Math.round(width * scale);
                int newH = Math.round(height * scale);

                BufferedImage resized = new BufferedImage(
                        newW,
                        newH,
                        BufferedImage.TYPE_INT_RGB
                );

                Graphics2D g = resized.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                        RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.drawImage(image, 0, 0, newW, newH, null);
                g.dispose();

                image = resized;
            }

            // ============================
            // 2️⃣ JPEG 压缩（比 PNG 快 & 小很多）
            // ============================
            ByteArrayOutputStream baos = new ByteArrayOutputStream();

            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            ImageWriter writer = writers.next();

            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.75f); // ⭐ 关键参数：0.6~0.8 都可以

            ImageOutputStream ios = ImageIO.createImageOutputStream(baos);
            writer.setOutput(ios);

            writer.write(null, new IIOImage(image, null, null), param);

            writer.dispose();
            ios.close();

            // ============================
            // 3️⃣ Base64 + data URL
            // ============================
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            return "data:image/jpeg;base64," + base64;

        } catch (Exception e) {
            throw new RuntimeException("imageToBase64 failed", e);
        }
    }

}
