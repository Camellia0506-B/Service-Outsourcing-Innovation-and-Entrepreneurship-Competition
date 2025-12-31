package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import www.gradquest.com.dto.ForumCommentItem;
import www.gradquest.com.dto.ForumPostDetail;
import www.gradquest.com.dto.ForumPostListItem;
import www.gradquest.com.entity.ForumComment;
import www.gradquest.com.entity.ForumPost;
import www.gradquest.com.mapper.ForumCommentMapper;
import www.gradquest.com.mapper.ForumPostMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.service.ForumService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class ForumServiceImpl implements ForumService {

    private final ForumPostMapper forumPostMapper;
    private final ForumCommentMapper forumCommentMapper;
    private final UserMapper userMapper;

    @Override
    public List<ForumPostListItem> listByUniversity(Integer univId, String keyword) {
        LambdaQueryWrapper<ForumPost> wrapper = new LambdaQueryWrapper<>();
        if (univId != null) {
            wrapper.eq(ForumPost::getUnivId, univId);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(ForumPost::getTitle, keyword).or().like(ForumPost::getContent, keyword));
        }
        wrapper.orderByDesc(ForumPost::getCreatedAt);
        List<ForumPost> posts = forumPostMapper.selectList(wrapper);
        return posts.stream().map(p -> ForumPostListItem.builder()
                        .id(p.getId())
                        .title(p.getTitle())
                        .authorNickname(userMapper.selectById(p.getUserId()) != null ? userMapper.selectById(p.getUserId()).getNickname() : null)
                        .viewCount(p.getViewCount())
                        .replyCount(p.getReplyCount())
                        .createdAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<ForumPostListItem> listByUser(Long userId) {
        LambdaQueryWrapper<ForumPost> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ForumPost::getUserId, userId).orderByDesc(ForumPost::getCreatedAt);
        List<ForumPost> posts = forumPostMapper.selectList(wrapper);
        return posts.stream().map(p -> ForumPostListItem.builder()
                        .id(p.getId())
                        .title(p.getTitle())
                        .authorNickname(userMapper.selectById(p.getUserId()) != null ? userMapper.selectById(p.getUserId()).getNickname() : null)
                        .viewCount(p.getViewCount())
                        .replyCount(p.getReplyCount())
                        .createdAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public ForumPostDetail getPostDetail(Long id) {
        ForumPost post = forumPostMapper.selectById(id);
        if (post == null) {
            return null;
        }
        LambdaQueryWrapper<ForumComment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ForumComment::getPostId, id).orderByAsc(ForumComment::getCreatedAt);
        List<ForumComment> comments = forumCommentMapper.selectList(wrapper);
        List<ForumCommentItem> items = comments.stream().map(c -> ForumCommentItem.builder()
                        .id(c.getId())
                        .userId(c.getUserId())
                        .content(c.getContent())
                        .createdAt(c.getCreatedAt())
                        .userNickname(userMapper.selectById(c.getUserId()) != null ? userMapper.selectById(c.getUserId()).getNickname() : null)
                        .userAvatar(userMapper.selectById(c.getUserId()) != null ? userMapper.selectById(c.getUserId()).getAvatar() : null)
                        .build())
                .collect(Collectors.toList());
        post.setViewCount(post.getViewCount() + 1);
        forumPostMapper.updateById(post);
        return ForumPostDetail.builder()
                .id(post.getId())
                .univId(post.getUnivId())
                .userId(post.getUserId())
                .title(post.getTitle())
                .content(post.getContent())
                .viewCount(post.getViewCount())
                .replyCount(post.getReplyCount())
                .createdAt(post.getCreatedAt())
                .comments(items)
                .build();
    }

    @Override
    @Transactional
    public Long createPost(Integer univId, Long userId, String title, String content) {
        ForumPost post = new ForumPost();
        post.setUnivId(univId);
        post.setUserId(userId);
        post.setTitle(title);
        post.setContent(content);
        post.setReplyCount(0);
        post.setViewCount(0);
        post.setCreatedAt(LocalDateTime.now());
        forumPostMapper.insert(post);
        return post.getId();
    }

    @Override
    @Transactional
    public Long createComment(Long postId, Long userId, String content) {
        ForumComment comment = new ForumComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setCreatedAt(LocalDateTime.now());
        forumCommentMapper.insert(comment);
        ForumPost post = forumPostMapper.selectById(postId);
        if (post != null) {
            post.setReplyCount(post.getReplyCount() + 1);
            forumPostMapper.updateById(post);
        }
        return comment.getId();
    }
}
