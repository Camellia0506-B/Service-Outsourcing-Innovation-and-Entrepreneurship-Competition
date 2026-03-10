package www.gradquest.com.dto.hr;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * HR 浏览学生简历响应体（API 文档 11.3）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrowseStudentsResult {
    private Integer total;
    private List<BrowseStudentItem> list;
}
