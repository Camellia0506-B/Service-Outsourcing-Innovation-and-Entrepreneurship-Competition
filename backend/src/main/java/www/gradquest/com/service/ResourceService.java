package www.gradquest.com.service;

import www.gradquest.com.entity.SharedResource;

import java.util.List;

/**
 * @author zhangzherui
 */
public interface ResourceService {
    List<SharedResource> listByUniversity(Integer univId);

    Long uploadResource(SharedResource resource);

    List<SharedResource> listByUser(Long userId);
}
