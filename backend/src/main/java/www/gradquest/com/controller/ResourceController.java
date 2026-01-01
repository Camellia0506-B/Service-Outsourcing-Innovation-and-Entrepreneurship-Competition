package www.gradquest.com.controller;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.service.ResourceService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
@Validated
public class ResourceController {

    private final ResourceService resourceService;

    @PostMapping("/resources/list")
    public ApiResponse<List<SharedResource>> list(@RequestBody(required = false) ResourceListRequest request) {
        Integer univId = request == null ? null : request.getUnivId();
        if (univId != null) {
            return ApiResponse.success(resourceService.listByUniversity(univId));
        }
        return ApiResponse.success(resourceService.listAll());
    }

    @PostMapping(value = "/resources/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> upload(@RequestParam("univ_id") @NotNull Integer univId,
                                      @RequestParam("user_id") @NotNull Long userId,
                                      @RequestParam("file_name") @NotNull String fileName, // 前端传来的文件名
                                      @RequestPart("file") @NotNull MultipartFile file) {
        if (file.isEmpty()) {
            return ApiResponse.badRequest("File must not be empty");
        }

        // 调用 Service 层处理上传逻辑
        String fileUrl = resourceService.uploadFile(univId, userId, fileName, file);

        return ApiResponse.success("success", fileUrl);
    }


    @Data
    private static class ResourceListRequest {
        private Integer univId;
    }

    private String generateRandomUrl(String fileName) {
        String extension = "";
        int index = fileName.lastIndexOf('.');
        if (index >= 0) {
            extension = fileName.substring(index);
        }
        return "https://files.gradquest.com/resources/" + UUID.randomUUID() + extension;
    }

    private String formatFileSize(long size) {
        if (size < 1024) {
            return size + "B";
        }
        double kb = size / 1024.0;
        if (kb < 1024) {
            return String.format("%.2fKB", kb);
        }
        double mb = kb / 1024.0;
        if (mb < 1024) {
            return String.format("%.2fMB", mb);
        }
        double gb = mb / 1024.0;
        return String.format("%.2fGB", gb);
    }
}
