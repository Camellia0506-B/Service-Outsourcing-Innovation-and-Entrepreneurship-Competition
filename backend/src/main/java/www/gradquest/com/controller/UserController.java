package www.gradquest.com.controller;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.UserProfileResponse;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.service.UserService;
import www.gradquest.com.service.ResourceService;
import www.gradquest.com.service.ForumService;
import www.gradquest.com.dto.ForumPostListItem;

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

    @GetMapping("/profile")
    public ApiResponse<UserProfileResponse> profile(@RequestParam("user_id") Long userId) {
        return ApiResponse.success(userService.getProfileWithStats(userId));
    }

    @GetMapping("/posts")
    public ApiResponse<java.util.List<ForumPostListItem>> myPosts(@RequestParam("user_id") Long userId) {
        return ApiResponse.success(forumService.listByUser(userId));
    }

    @GetMapping("/resources")
    public ApiResponse<java.util.List<SharedResource>> myResources(@RequestParam("user_id") Long userId) {
        return ApiResponse.success(resourceService.listByUser(userId));
    }

    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(@RequestBody @Validated UpdateProfileRequest request) {
        userService.updateProfile(request.getUserId(), request.getNickname(), request.getAvatar());
        return ApiResponse.success(null);
    }

    @Data
    private static class UpdateProfileRequest {
        @NotNull
        private Long userId;
        private String nickname;
        private String avatar;
    }
}
