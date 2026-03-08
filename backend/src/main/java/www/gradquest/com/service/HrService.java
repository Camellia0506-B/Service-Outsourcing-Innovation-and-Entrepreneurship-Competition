package www.gradquest.com.service;

import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.entity.Hr;

public interface HrService {
    HrRegisterResponse register(String username, String password, String realName, String companyName, String companySize, String industry, String hrRole, MultipartFile businessLicense);
    HrLoginResponse login(String username, String password);
    Hr getById(Long id);
}
