package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 档案-项目经历，tech_stack 存 JSON 数组
 */
@Data
@TableName("profile_projects")
public class ProfileProject {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String role;
    private String startDate;
    private String endDate;
    private String description;
    private String techStack;
}
