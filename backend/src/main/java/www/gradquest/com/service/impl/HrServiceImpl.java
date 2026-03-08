package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.entity.Hr;
import www.gradquest.com.mapper.HrMapper;
import www.gradquest.com.service.HrService;
import www.gradquest.com.utils.JwtUtil;
import www.gradquest.com.utils.UploadFileUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class HrServiceImpl implements HrService {

    private final HrMapper hrMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public HrRegisterResponse register(String username, String password, String realName, String companyName, String companySize, String industry, String hrRole, MultipartFile businessLicense) {
        LambdaQueryWrapper<Hr> query = new LambdaQueryWrapper<>();
        query.eq(Hr::getUsername, username);
        if (hrMapper.selectCount(query) > 0) {
            throw new IllegalArgumentException("用户名已存在");
        }

        Hr hr = new Hr();
        hr.setUsername(username);
        hr.setPassword(passwordEncoder.encode(password));
        hr.setRealName(realName);
        hr.setCompanyName(companyName);
        hr.setCompanySize(companySize);
        hr.setIndustry(industry);
        hr.setHrRole(hrRole);
        hr.setStatus("pending");
        hr.setCreatedAt(LocalDateTime.now());

        if (businessLicense != null && !businessLicense.isEmpty()) {
            File licenseFile = new File(System.getProperty("java.io.tmpdir"), Objects.requireNonNull(businessLicense.getOriginalFilename()));
            try {
                businessLicense.transferTo(licenseFile);
                String licenseUrl = UploadFileUtil.upload(licenseFile);
                hr.setBusinessLicense(licenseUrl);
            } catch (IOException e) {
                e.printStackTrace();
                throw new RuntimeException("营业执照上传失败", e);
            }
        }

        hrMapper.insert(hr);

        return HrRegisterResponse.from(
                hr.getId(),
                hr.getUsername(),
                hr.getRealName(),
                hr.getCompanyName(),
                hr.getCompanySize(),
                hr.getIndustry(),
                hr.getHrRole(),
                hr.getStatus(),
                hr.getCreatedAt()
        );
    }

    @Override
    public HrLoginResponse login(String username, String password) {
        Hr hr = hrMapper.selectOne(new LambdaQueryWrapper<Hr>().eq(Hr::getUsername, username));
        if (hr == null) {
            return null;
        }
        if (!passwordEncoder.matches(password, hr.getPassword())) {
            return null;
        }
        String token = JwtUtil.createToken(hr.getId());
        return HrLoginResponse.builder()
                .hrId(hr.getId())
                .username(hr.getUsername())
                .realName(hr.getRealName())
                .companyName(hr.getCompanyName())
                .companySize(hr.getCompanySize())
                .industry(hr.getIndustry())
                .hrRole(hr.getHrRole())
                .status(hr.getStatus())
                .token(token)
                .unreadEvaluations(0)
                .build();
    }

    @Override
    public Hr getById(Long id) {
        return hrMapper.selectById(id);
    }
}
