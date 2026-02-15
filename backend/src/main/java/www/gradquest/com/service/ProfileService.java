package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.profile.*;

public interface ProfileService {

    /**
     * 2.1 获取个人档案
     */
    ProfileInfoResponse getProfileInfo(Long userId);

    /**
     * 2.2 更新个人档案
     */
    ProfileUpdateResponse updateProfile(ProfileUpdateRequest request);

    /**
     * 2.3 上传简历，返回 task_id 与 status=processing
     */
    UploadResumeResponse uploadResume(Long userId, MultipartFile resumeFile);

    /**
     * 2.4 获取简历解析结果
     */
    ResumeParseResultResponse getResumeParseResult(Long userId, String taskId);
}
