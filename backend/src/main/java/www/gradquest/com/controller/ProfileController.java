package www.gradquest.com.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.profile.*;
import www.gradquest.com.service.ProfileService;

/**
 * 个人档案模块（API 文档 2）
 */
@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@Validated
public class ProfileController {

    private final ProfileService profileService;

    /**
     * 2.1 获取个人档案
     */
    @PostMapping("/info")
    public ApiResponse<ProfileInfoResponse> getProfileInfo(@RequestBody @Validated ProfileUserIdRequest req) {
        ProfileInfoResponse data = profileService.getProfileInfo(req.getUserId());
        if (data == null) {
            return ApiResponse.failure(404, "用户不存在");
        }
        return ApiResponse.success("success", data);
    }

    /**
     * 2.2 更新个人档案
     */
    @PostMapping("/update")
    public ApiResponse<ProfileUpdateResponse> updateProfile(@RequestBody @Validated ProfileUpdateRequest req) {
        if (req.getUserId() == null) {
            return ApiResponse.badRequest("user_id 不能为空");
        }
        ProfileUpdateResponse data = profileService.updateProfile(req);
        if (data == null) {
            return ApiResponse.failure(404, "用户不存在");
        }
        return ApiResponse.success("档案更新成功", data);
    }

    /**
     * 2.3 上传简历
     */
    @PostMapping(value = "/upload-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UploadResumeResponse> uploadResume(
            @RequestParam("user_id") @NotNull Long userId,
            @RequestParam("resume_file") MultipartFile resumeFile) {
        try {
            UploadResumeResponse data = profileService.uploadResume(userId, resumeFile);
            return ApiResponse.success("简历上传成功，正在解析...", data);
        } catch (IllegalArgumentException e) {
            return ApiResponse.badRequest(e.getMessage());
        }
    }

    /**
     * 2.4 获取简历解析结果
     */
    @PostMapping("/resume-parse-result")
    public ApiResponse<ResumeParseResultResponse> getResumeParseResult(@RequestBody @Validated ResumeParseResultRequest req) {
        ResumeParseResultResponse data = profileService.getResumeParseResult(req.getUserId(), req.getTaskId());
        if (data == null) {
            return ApiResponse.failure(404, "任务不存在");
        }
        return ApiResponse.success("success", data);
    }

    @Data
    private static class ProfileUserIdRequest {
        @NotNull(message = "user_id 不能为空")
        @JsonProperty("user_id")
        private Long userId;
    }

    @Data
    private static class ResumeParseResultRequest {
        @NotNull(message = "user_id 不能为空")
        @JsonProperty("user_id")
        private Long userId;

        @NotBlank(message = "task_id 不能为空")
        @JsonProperty("task_id")
        private String taskId;
    }
}
