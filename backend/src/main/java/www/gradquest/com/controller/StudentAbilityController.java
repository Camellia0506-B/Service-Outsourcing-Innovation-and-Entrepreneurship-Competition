package www.gradquest.com.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.student.AbilityProfileRequest;
import www.gradquest.com.dto.student.AiGenerateProfileRequest;
import www.gradquest.com.dto.student.UpdateProfileRequest;
import www.gradquest.com.service.StudentAbilityService;

import java.util.Map;

/**
 * 学生能力画像模块（API 文档 5）
 */
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
@Validated
public class StudentAbilityController {

    private final StudentAbilityService studentAbilityService;

    /**
     * 5.1 获取学生能力画像
     */
    @PostMapping("/ability-profile")
    public ApiResponse<Map<String, Object>> getAbilityProfile(@RequestBody @Valid AbilityProfileRequest request) {
        try {
            Map<String, Object> data = studentAbilityService.getAbilityProfile(request);
            return ApiResponse.success("success", data);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return ApiResponse.failure(404, e.getMessage());
            }
            return ApiResponse.serverError(e.getMessage());
        }
    }

    /**
     * 5.2 AI生成学生能力画像
     */
    @PostMapping("/ai-generate-profile")
    public ApiResponse<Map<String, Object>> aiGenerateProfile(@RequestBody @Valid AiGenerateProfileRequest request) {
        try {
            Map<String, Object> data = studentAbilityService.aiGenerateProfile(request);
            return ApiResponse.success("AI画像生成中...", data);
        } catch (RuntimeException e) {
            return ApiResponse.serverError(e.getMessage());
        }
    }

    /**
     * 5.3 更新能力画像
     */
    @PostMapping("/update-profile")
    public ApiResponse<Map<String, Object>> updateProfile(@RequestBody @Valid UpdateProfileRequest request) {
        try {
            Map<String, Object> data = studentAbilityService.updateProfile(request);
            return ApiResponse.success("画像更新成功", data);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return ApiResponse.failure(404, e.getMessage());
            }
            return ApiResponse.serverError(e.getMessage());
        }
    }
}
