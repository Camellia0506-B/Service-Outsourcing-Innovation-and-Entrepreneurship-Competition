package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.mapper.SharedResourceMapper;
import www.gradquest.com.service.ResourceService;
import www.gradquest.com.utils.UploadFileUtil;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final SharedResourceMapper sharedResourceMapper;

    @Override
    public List<SharedResource> listByUniversity(Integer univId) {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SharedResource::getUnivId, univId).orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }

    @Override
    public List<SharedResource> listAll() {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }

    @Override
    @Transactional
    public String uploadFile(Integer univId, Long userId, String fileName, MultipartFile file) {
        // 使用前端传来的文件名，如果文件名为空则使用默认名称
        if (fileName == null || fileName.isEmpty()) {
            fileName = "Noname_" + System.currentTimeMillis();  // 添加时间戳避免文件名冲突
        }

        // 计算文件大小
        String fileSize = UploadFileUtil.formatFileSize(file.getSize());

        // 上传文件并保存至指定位置
        String fileUrl;
        try {
            // 使用 Files.createTempFile 创建临时文件
            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"));
            Path tempFilePath = Files.createTempFile(tempDir, "upload_", "_" + fileName);
            File tempFile = tempFilePath.toFile();

            // 保存上传的文件
            file.transferTo(tempFile);

            // 使用上传工具进行上传，假设它会返回云存储 URL
            fileUrl = UploadFileUtil.upload(tempFile);

            // 删除临时文件
            Files.deleteIfExists(tempFilePath);

        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("File upload failed", e);
        }

        // 创建资源对象
        SharedResource resource = new SharedResource();
        resource.setUnivId(univId);
        resource.setUserId(userId);
        resource.setFileName(fileName);
        resource.setFileUrl(fileUrl);
        resource.setFileSize(fileSize);
        resource.setCreatedAt(LocalDateTime.now());

        // 保存资源到数据库
        sharedResourceMapper.insert(resource);

        // 返回文件 URL
        return fileUrl;
    }



    @Override
    public List<SharedResource> listByUser(Long userId) {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SharedResource::getUserId, userId).orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }


}
