package www.gradquest.com.controller;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.ForumPostListItem;
import www.gradquest.com.dto.UserProfileResponse;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.service.ForumService;
import www.gradquest.com.service.ResourceService;
import www.gradquest.com.service.UserService;
import www.gradquest.com.utils.UploadFileUtil;

import java.util.UUID;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;
    private final ResourceService resourceService;
    private final ForumService forumService;

    @PostMapping("/info")
    public ApiResponse<UserProfileResponse> profile(@RequestBody UserIdRequest request) {
        return ApiResponse.success(userService.getProfileWithStats(request.getUserId()));
    }

    @PostMapping("/posts")
    public ApiResponse<java.util.List<ForumPostListItem>> myPosts(@RequestBody UserIdRequest request) {
        return ApiResponse.success(forumService.listByUser(request.getUserId()));
    }

    @PostMapping("/resources")
    public ApiResponse<java.util.List<SharedResource>> myResources(@RequestBody UserIdRequest request) {
        return ApiResponse.success(resourceService.listByUser(request.getUserId()));
    }

    @PutMapping(value = "/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> updateProfile(@RequestParam("user_id") @NotNull Long userId,
                                             @RequestParam(value = "nickname", required = false) String nickname,
                                             @RequestPart(value = "avatar", required = false) MultipartFile avatarFile) {
        // 调用 Service 更新用户资料，返回成功或失败的响应
        boolean isUpdated = userService.updateProfile(userId, nickname, avatarFile);
        if (isUpdated) {
            return ApiResponse.success("更新成功");
        } else {
            return ApiResponse.badRequest("更新失败，用户不存在或其他问题");
        }
    }


    @Data
    private static class UserIdRequest {
        @NotNull
        private Long userId;
    }

    private String generateRandomUrl(String fileName) {
        String extension = "";
        int index = fileName.lastIndexOf('.');
        if (index >= 0) {
            extension = fileName.substring(index);
        }
        return "https://files.gradquest.com/avatars/" + UUID.randomUUID() + extension;
    }
}
