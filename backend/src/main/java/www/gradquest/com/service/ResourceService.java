package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.entity.SharedResource;

import java.util.List;

/**
 * @author zhangzherui
 */
public interface ResourceService {
    List<SharedResource> listByUniversity(Integer univId);

    List<SharedResource> listAll();

    public String uploadFile(Integer univId, Long userId, String fileName, MultipartFile file);

    List<SharedResource> listByUser(Long userId);
}
