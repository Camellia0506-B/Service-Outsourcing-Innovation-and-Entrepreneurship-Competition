package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import www.gradquest.com.common.PageResponse;
import www.gradquest.com.entity.University;
import www.gradquest.com.mapper.UniversityMapper;
import www.gradquest.com.service.UniversityService;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class UniversityServiceImpl implements UniversityService {

    private final UniversityMapper universityMapper;

    @Override
    public PageResponse<University> listUniversities(int page, int size, String keyword, String tags) {
        Page<University> p = new Page<>(page, size);
        LambdaQueryWrapper<University> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(University::getName, keyword);
        }
        if (StringUtils.hasText(tags)) {
            wrapper.like(University::getTags, tags);
        }
        Page<University> result = universityMapper.selectPage(p, wrapper);
        return new PageResponse<>(result.getTotal(), result.getRecords());
    }

    @Override
    public University getById(Integer id) {
        return universityMapper.selectById(id);
    }
}
