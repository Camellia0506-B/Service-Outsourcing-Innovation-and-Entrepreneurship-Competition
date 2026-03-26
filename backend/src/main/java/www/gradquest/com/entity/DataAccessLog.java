package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("data_access_logs")
public class DataAccessLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("access_type")
    private String accessType;

    @TableField("accessor_info")
    private String accessorInfo;

    @TableField("hash")
    private String hash;

    @TableField(value = "accessed_at", fill = FieldFill.INSERT)
    private LocalDateTime accessedAt;
}
