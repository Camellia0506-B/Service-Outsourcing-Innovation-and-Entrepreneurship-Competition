package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("profile_internships")
public class ProfileInternship {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String company;
    private String position;
    private String startDate;
    private String endDate;
    private String description;
}
