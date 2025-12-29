package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * @author zhangzherui
 */
@Data
@TableName("universities")
public class University {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String name;
    private String logoUrl;
    private String intro;
    private String tags;
}
