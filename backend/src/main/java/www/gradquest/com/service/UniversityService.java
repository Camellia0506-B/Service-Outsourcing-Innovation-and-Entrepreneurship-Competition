package www.gradquest.com.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import www.gradquest.com.common.PageResponse;
import www.gradquest.com.entity.University;

/**
 * @author zhangzherui
 */
public interface UniversityService {
    PageResponse<University> listUniversities(int page, int size, String keyword, String tags);

    University getById(Integer id);
}
