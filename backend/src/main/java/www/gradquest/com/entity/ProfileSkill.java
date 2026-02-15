package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 档案-技能（按分类，items 存 JSON 数组）
 */
@Data
@TableName("profile_skills")
public class ProfileSkill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String category;
    /** JSON array of strings */
    private String items;
}
