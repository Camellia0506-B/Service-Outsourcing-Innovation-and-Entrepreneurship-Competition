package www.gradquest.com.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 简历解析任务：parsed_data、suggestions 为 JSON 字符串
 */
@Data
@TableName("resume_parse_tasks")
public class ResumeParseTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String taskId;
    private Long userId;
    private String status;
    private String parsedData;
    private BigDecimal confidenceScore;
    private String suggestions;
    private LocalDateTime createdAt;
}
