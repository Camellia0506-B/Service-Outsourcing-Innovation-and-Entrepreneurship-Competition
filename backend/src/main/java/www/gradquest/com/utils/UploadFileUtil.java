package www.gradquest.com.utils;

import com.obs.services.ObsClient;
import com.obs.services.exception.ObsException;
import com.obs.services.model.AccessControlList;
import com.obs.services.model.PutObjectRequest;
import com.obs.services.model.PutObjectResult;

import java.io.File;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 上传文件到华为云 OBS，并返回“永久对象URL”
 * <p>
 * 前提：
 * 1) endpoint 必须是公网 endpoint（否则返回的 URL 可能是内网不可达）
 * 2) 对象需要对匿名用户可读（本类默认在上传时把对象 ACL 设为 PUBLIC_READ）
 * <p>
 * 环境变量：
 *   ACCESS_KEY_ID
 *   SECRET_ACCESS_KEY_ID
 *   ENDPOINT   例如：<a href="https://obs.cn-north-4.myhuaweicloud.com">...</a>
 *   OBS_BUCKET
 * @author zhangzherui
 */
public class UploadFileUtil {

    private UploadFileUtil() {}

    /**
     * 上传并返回永久可访问 URL（公共读）
     */
    public static String upload(File file) {
        validateFile(file);

        String ak = "HPUA1TW0PAOGKP1B8YKK";;
        String sk = "QbmYAfO2tMa6TAqTYmhf8SY9zed2qB7RrvIZPhdO";
        String endPoint = "https://obs.cn-north-4.myhuaweicloud.com";
        String bucket = "gardquest";

        // 建议自己生成安全的对象名，避免中文/空格等导致 URL 编码问题
        String objectKey = buildObjectKey(file.getName());

        try (ObsClient obsClient = new ObsClient(ak, sk, endPoint)) {

            // 1) 上传（并在上传时指定对象ACL）
            PutObjectRequest request = new PutObjectRequest();
            request.setBucketName(bucket);
            request.setObjectKey(objectKey);
            request.setFile(file);

            // 关键：设置对象为“公共读”，这样返回的对象URL才是“永久可访问”
            // 预定义ACL常量参考官方文档：AccessControlList.REST_CANNED_PUBLIC_READ :contentReference[oaicite:3]{index=3}
            request.setAcl(AccessControlList.REST_CANNED_PUBLIC_READ);

            PutObjectResult result = obsClient.putObject(request);

            // 2) 直接返回对象URL（文档：PutObjectResult.getObjectUrl） :contentReference[oaicite:4]{index=4}
            return result.getObjectUrl();

        } catch (ObsException e) {
            String msg = "OBS 上传失败: HTTP=" + e.getResponseCode()
                    + ", ErrorCode=" + e.getErrorCode()
                    + ", ErrorMessage=" + e.getErrorMessage()
                    + ", RequestId=" + e.getErrorRequestId();
            throw new RuntimeException(msg, e);
        } catch (Exception e) {
            throw new RuntimeException("OBS 上传失败: " + e.getMessage(), e);
        }
    }

    private static String buildObjectKey(String originalFilename) {
        String ext = "";
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                ext = originalFilename.substring(dot);
            }
        }

        LocalDate d = LocalDate.now();
        String ymdPath = d.getYear() + "/" + String.format("%02d", d.getMonthValue()) + "/" + String.format("%02d", d.getDayOfMonth());

        return "uploads/" + ymdPath + "/" + UUID.randomUUID().toString().replace("-", "") + ext;
    }

    private static void validateFile(File file) {
        if (file == null) {
            throw new IllegalArgumentException("file 不能为空");
        }
        if (!file.exists() || !file.isFile()) {
            throw new IllegalArgumentException("file 不存在或不是文件: " + file.getAbsolutePath());
        }
        if (file.length() <= 0) {
            throw new IllegalArgumentException("file 为空文件: " + file.getAbsolutePath());
        }
    }

    public static String formatFileSize(long size) {
        if (size <= 0) {
            return "0 Bytes";
        }

        String[] units = new String[]{"Bytes", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double fileSizeInUnit = size;

        while (fileSizeInUnit >= 1024 && unitIndex < units.length - 1) {
            fileSizeInUnit /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", fileSizeInUnit, units[unitIndex]);
    }

}
