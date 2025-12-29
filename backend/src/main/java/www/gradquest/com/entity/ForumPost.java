package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @author zhangzherui
 */
@Data
@TableName("forum_posts")
public class ForumPost {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer univId;
    private Long userId;
    private String title;
    private String content;
    private Integer replyCount;
    private Integer viewCount;
    private LocalDateTime createdAt;
}
