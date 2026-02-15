package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("profile_awards")
public class ProfileAward {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String level;
    private String date;
}
