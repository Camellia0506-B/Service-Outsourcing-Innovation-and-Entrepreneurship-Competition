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
@TableName("shared_resources")
public class SharedResource {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer univId;
    private Long userId;
    private String fileName;
    private String fileUrl;
    private String fileSize;
    private LocalDateTime createdAt;
}
