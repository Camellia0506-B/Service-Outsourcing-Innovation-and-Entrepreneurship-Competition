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
@TableName("user_follows")
public class UserFollow {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Integer univId;
    private LocalDateTime createdAt;
}
