package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import www.gradquest.com.entity.SharedResource;
import www.gradquest.com.mapper.SharedResourceMapper;
import www.gradquest.com.service.ResourceService;

import java.util.List;

/**
 * @author zhangzherui
 */
@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final SharedResourceMapper sharedResourceMapper;

    @Override
    public List<SharedResource> listByUniversity(Integer univId) {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SharedResource::getUnivId, univId).orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }

    @Override
    public List<SharedResource> listAll() {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }

    @Override
    @Transactional
    public Long uploadResource(SharedResource resource) {
        sharedResourceMapper.insert(resource);
        return resource.getId();
    }

    @Override
    public List<SharedResource> listByUser(Long userId) {
        LambdaQueryWrapper<SharedResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SharedResource::getUserId, userId).orderByDesc(SharedResource::getCreatedAt);
        return sharedResourceMapper.selectList(wrapper);
    }
}
