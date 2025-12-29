package www.gradquest.com.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * @author zhangzherui
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private long total;
    private List<T> list;
}
