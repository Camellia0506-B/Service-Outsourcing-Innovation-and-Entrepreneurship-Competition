package www.gradquest.com.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.dto.ForumPostDetail;
import www.gradquest.com.dto.ForumPostListItem;
import www.gradquest.com.service.ForumService;

import java.util.List;

/**
 * @author zhangzherui
 */
@RestController
@RequestMapping
@RequiredArgsConstructor
@Validated
public class ForumController {

    private final ForumService forumService;

    @GetMapping("/universities/{id}/posts")
    public ApiResponse<List<ForumPostListItem>> list(@PathVariable("id") Integer univId) {
        return ApiResponse.success(forumService.listByUniversity(univId));
    }

    @GetMapping("/posts/{id}")
    public ApiResponse<ForumPostDetail> detail(@PathVariable("id") Long id) {
        return ApiResponse.success(forumService.getPostDetail(id));
    }

    @PostMapping("/posts")
    public ApiResponse<Long> createPost(@RequestBody @Validated CreatePostRequest request) {
        Long id = forumService.createPost(request.getUnivId(), request.getUserId(), request.getTitle(), request.getContent());
        return ApiResponse.success(id);
    }

    @PostMapping("/posts/{id}/comments")
    public ApiResponse<Long> createComment(@PathVariable("id") Long postId, @RequestBody @Validated CreateCommentRequest request) {
        Long id = forumService.createComment(postId, request.getUserId(), request.getContent());
        return ApiResponse.success(id);
    }

    @Data
    private static class CreatePostRequest {
        @NotNull
        private Integer univId;
        @NotNull
        private Long userId;
        @NotBlank
        private String title;
        @NotBlank
        private String content;
    }

    @Data
    private static class CreateCommentRequest {
        @NotNull
        private Long userId;
        @NotBlank
        private String content;
    }
}
