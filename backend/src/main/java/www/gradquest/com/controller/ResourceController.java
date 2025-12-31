package www.gradquest.com.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.service.ResourceService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
@Validated
public class ResourceController {

    private final ResourceService resourceService;

    @PostMapping("/resources")
    public ApiResponse<List<SharedResource>> list(@RequestBody(required = false) ResourceListRequest request) {
        Integer univId = request == null ? null : request.getUnivId();
        if (univId != null) {
            return ApiResponse.success(resourceService.listByUniversity(univId));
        }
        return ApiResponse.success(resourceService.listAll());
    }

    @PostMapping("/resources/upload")
    public ApiResponse<Long> upload(@RequestBody @Validated UploadResourceRequest request) {
        SharedResource resource = new SharedResource();
        resource.setUnivId(request.getUnivId());
        resource.setUserId(request.getUserId());
        resource.setFileName(request.getFileName());
        resource.setFileUrl(request.getFileUrl());
        resource.setFileSize(request.getFileSize());
        resource.setCreatedAt(LocalDateTime.now());
        return ApiResponse.success(resourceService.uploadResource(resource));
    }

    @Data
    private static class ResourceListRequest {
        private Integer univId;
    }

    @Data
    private static class UploadResourceRequest {
        @NotNull
        private Integer univId;
        @NotNull
        private Long userId;
        @NotBlank
        private String fileName;
        @NotBlank
        private String fileUrl;
        private String fileSize;
    }
}
