package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.dto.hr.BrowseStudentsResult;
import www.gradquest.com.entity.Hr;

public interface HrService {
    HrRegisterResponse register(String username, String password, String realName, String companyName, String companySize, String industry, String hrRole, MultipartFile businessLicense);
    HrLoginResponse login(String username, String password);
    Hr getById(Long id);

    /**
     * 浏览对 HR 可见的学生简历列表（API 文档 11.3）
     * 数据来源：user_profiles + privacy_settings(resume_visible_to_hr) + profile_skills
     */
    BrowseStudentsResult browseStudents(Long hrId, String targetJob, Integer minMatchScore, String educationLevel, int page, int size);
}
