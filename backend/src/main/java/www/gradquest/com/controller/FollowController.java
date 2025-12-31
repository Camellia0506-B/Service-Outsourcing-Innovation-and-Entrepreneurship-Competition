package www.gradquest.com.controller;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.entity.UserFollow;
import www.gradquest.com.service.FollowService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Validated
public class FollowController {

    private final FollowService followService;

    @PostMapping("/follows")
    public ApiResponse<List<UserFollow>> list(@RequestBody UserIdRequest request) {
        return ApiResponse.success(followService.listFollows(request.getUserId()));
    }

    @PostMapping("/follows/add")
    public ApiResponse<Long> add(@RequestBody @Validated AddFollowRequest request) {
        UserFollow follow = new UserFollow();
        follow.setUserId(request.getUserId());
        follow.setUnivId(request.getUnivId());
        follow.setDeptName(request.getDeptName());
        follow.setCreatedAt(LocalDateTime.now());
        return ApiResponse.success(followService.addFollow(follow));
    }

    @DeleteMapping("/follows")
    public ApiResponse<Void> delete(@RequestBody IdRequest request) {
        followService.removeFollow(request.getId());
        return ApiResponse.success("已取消关注", null);
    }

    @Data
    private static class UserIdRequest {
        @NotNull
        private Long userId;
    }

    @Data
    private static class AddFollowRequest {
        @NotNull
        private Long userId;
        @NotNull
        private Integer univId;
        private String deptName;
    }

    @Data
    private static class IdRequest {
        @NotNull
        private Long id;
    }
}
