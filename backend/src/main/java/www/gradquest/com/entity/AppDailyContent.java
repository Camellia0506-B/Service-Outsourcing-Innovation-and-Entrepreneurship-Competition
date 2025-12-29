package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

/**
 * @author zhangzherui
 */
@Data
@TableName("app_daily_content")
public class AppDailyContent {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private LocalDate date;
    private String quote;
    private String bgImage;
}
