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

    @PostMapping("/universities/posts")
    public ApiResponse<List<ForumPostListItem>> list(@RequestBody ListRequest request) {
        return ApiResponse.success(forumService.listByUniversity(request.getUnivId(), request.getKeyword()));
    }

    @PostMapping("/posts/detail")
    public ApiResponse<ForumPostDetail> detail(@RequestBody IdRequest request) {
        return ApiResponse.success(forumService.getPostDetail(request.getPostId()));
    }

    @PostMapping("/posts/new")
    public ApiResponse<Long> createPost(@RequestBody @Validated CreatePostRequest request) {
        Long id = forumService.createPost(request.getUnivId(), request.getUserId(), request.getTitle(), request.getContent());
        return ApiResponse.success(id);
    }

    @PostMapping("/posts/comments")
    public ApiResponse<Long> createComment(@RequestBody @Validated CreateCommentRequest request) {
        Long id = forumService.createComment(request.getPostId(), request.getUserId(), request.getContent());
        return ApiResponse.success("评论发布成功", id);
    }

    @Data
    private static class ListRequest {
        private Integer univId;
        private String keyword;
    }

    @Data
    private static class IdRequest {
        private Long postId;
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
        private Long postId;
        @NotNull
        private Long userId;
        @NotBlank
        private String content;
    }
}
