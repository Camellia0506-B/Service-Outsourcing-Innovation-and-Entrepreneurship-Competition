package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

/**
 * @author zhangzherui
 */
@Data
@TableName("camp_notices")
public class CampNotice {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer univId;
    private String deptName;
    private String title;
    private String content;
    private LocalDate endDate;
    private String sourceLink;
    private String examType;
    private String noticeType;
    private Integer status;
}
