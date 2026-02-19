package www.gradquest.com.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.job.*;
import www.gradquest.com.service.JobProfileService;

import java.util.Map;

/**
 * 岗位画像模块（API 文档 4）
 */
@RestController
@RequestMapping("/job")
@RequiredArgsConstructor
@Validated
public class JobController {

    private final JobProfileService jobProfileService;

    /**
     * 4.1 获取岗位画像列表
     */
    @PostMapping("/profiles")
    public ApiResponse<Map<String, Object>> profiles(@RequestBody @Valid JobProfilesRequest request) {
        Map<String, Object> data = jobProfileService.listProfiles(request);
        return ApiResponse.success("success", data);
    }

    /**
     * 4.2 获取岗位详细画像
     */
    @PostMapping("/profile/detail")
    public ApiResponse<Map<String, Object>> profileDetail(@RequestBody @Valid JobProfileDetailRequest request) {
        Map<String, Object> data = jobProfileService.getProfileDetail(request.getJobId());
        if (data == null) {
            return ApiResponse.failure(404, "资源不存在");
        }
        return ApiResponse.success("success", data);
    }

    /**
     * 4.3 获取岗位关联图谱
     */
    @PostMapping("/relation-graph")
    public ApiResponse<Map<String, Object>> relationGraph(@RequestBody @Valid JobRelationGraphRequest request) {
        Map<String, Object> data = jobProfileService.getRelationGraph(request);
        if (data == null) {
            return ApiResponse.failure(404, "资源不存在");
        }
        return ApiResponse.success("success", data);
    }

    /**
     * 4.4 AI生成岗位画像
     */
    @PostMapping("/ai-generate-profile")
    public ApiResponse<Map<String, Object>> aiGenerateProfile(@RequestBody @Valid JobAiGenerateProfileRequest request) {
        Map<String, Object> data = jobProfileService.aiGenerateProfile(request);
        return ApiResponse.success("AI画像生成中...", data);
    }

    /**
     * 4.5 获取AI生成结果
     */
    @PostMapping("/ai-generate-result")
    public ApiResponse<Map<String, Object>> aiGenerateResult(@RequestBody @Valid JobAiGenerateResultRequest request) {
        Map<String, Object> data = jobProfileService.aiGenerateResult(request.getTaskId());
        if (data == null) {
            return ApiResponse.failure(404, "资源不存在");
        }
        return ApiResponse.success("success", data);
    }
}

