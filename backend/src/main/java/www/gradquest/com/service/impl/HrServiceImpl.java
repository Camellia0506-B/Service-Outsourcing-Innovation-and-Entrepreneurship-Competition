package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.HrLoginResponse;
import www.gradquest.com.dto.HrRegisterResponse;
import www.gradquest.com.dto.hr.BrowseStudentItem;
import www.gradquest.com.dto.hr.BrowseStudentsResult;
import www.gradquest.com.entity.Hr;
import www.gradquest.com.entity.DataAccessLog;
import www.gradquest.com.entity.PrivacySetting;
import www.gradquest.com.entity.ProfileSkill;
import www.gradquest.com.entity.User;
import www.gradquest.com.entity.UserProfile;
import www.gradquest.com.mapper.DataAccessLogMapper;
import www.gradquest.com.mapper.HrMapper;
import www.gradquest.com.mapper.PrivacySettingMapper;
import www.gradquest.com.mapper.ProfileSkillMapper;
import www.gradquest.com.mapper.UserMapper;
import www.gradquest.com.mapper.UserProfileMapper;
import www.gradquest.com.service.HrService;
import www.gradquest.com.util.SM3Util;
import www.gradquest.com.util.SM4Util;
import www.gradquest.com.utils.JwtUtil;
import www.gradquest.com.utils.UploadFileUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HrServiceImpl implements HrService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final HrMapper hrMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserProfileMapper userProfileMapper;
    private final UserMapper userMapper;
    private final PrivacySettingMapper privacySettingMapper;
    private final ProfileSkillMapper profileSkillMapper;
    private final DataAccessLogMapper dataAccessLogMapper;

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

    @Override
    public BrowseStudentsResult browseStudents(Long hrId, String targetJob, Integer minMatchScore, String educationLevel, int page, int size) {
        List<UserProfile> allProfiles = userProfileMapper.selectList(null);
        List<BrowseStudentItem> filtered = new ArrayList<>();
        for (UserProfile profile : allProfiles) {
            Long userId = profile.getUserId();
            if (userId == null) continue;
            PrivacySetting privacy = privacySettingMapper.selectOne(new LambdaQueryWrapper<PrivacySetting>().eq(PrivacySetting::getUserId, userId));
            if (privacy != null && Boolean.FALSE.equals(privacy.getResumeVisibleToHr())) continue;
            String eduLevel = profile.getDegree() != null ? profile.getDegree() : "本科";
            if (educationLevel != null && !educationLevel.isBlank() && !educationLevel.equals(eduLevel)) continue;
            List<String> tags = new ArrayList<>();
            List<ProfileSkill> skills = profileSkillMapper.selectList(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, userId));
            for (ProfileSkill sk : skills) {
                if (sk.getItems() == null || sk.getItems().isBlank()) continue;
                try {
                    List<String> items = JSON.readValue(sk.getItems(), new TypeReference<List<String>>() {});
                    if (items != null) tags.addAll(items);
                } catch (Exception ignored) {}
            }
            if (tags.size() > 8) tags = tags.subList(0, 8);
            String gpaLevel = toGpaLevel(profile.getGpa());
            boolean openContact = privacy == null || !Boolean.FALSE.equals(privacy.getAllowHrContact());
            int systemMatchScore = 75;
            if (minMatchScore != null && systemMatchScore < minMatchScore) continue;
            filtered.add(BrowseStudentItem.builder()
                    .anonymousId("student_" + String.format("%03d", userId))
                    .educationLevel(eduLevel)
                    .majorCategory(profile.getMajor() != null ? profile.getMajor() : "计算机相关")
                    .gpaLevel(gpaLevel)
                    .systemMatchScore(systemMatchScore)
                    .abilityTags(tags.isEmpty() ? List.of("学习能力", "职业规划中") : tags)
                    .highlight("该候选人已完善个人档案，欢迎查看详情。")
                    .isOpenToContact(openContact)
                    .build());
        }
        int total = filtered.size();
        int from = Math.min((page - 1) * size, total);
        int to = Math.min(from + size, total);
        List<BrowseStudentItem> list = from < to ? filtered.subList(from, to) : List.of();
        return BrowseStudentsResult.builder().total(total).list(list).build();
    }

    private static String toGpaLevel(String gpa) {
        Double v = parseGpaValue(gpa);
        if (v == null) return "合格";
        if (v >= 3.7) return "优秀（3.7+）";
        if (v >= 3.5) return "良好（3.5+）";
        if (v >= 3.0) return "中等（3.0+）";
        return "合格";
    }

    @Override
    public Map<String, Object> getStudentDetailByAnonymousId(String anonymousId) {
        if (anonymousId == null || anonymousId.isBlank()) return null;
        Long userId = null;
        String id = anonymousId.strip();
        if (id.startsWith("student_")) {
            try {
                userId = Long.parseLong(id.substring("student_".length()).trim());
            } catch (NumberFormatException ignored) {}
        } else if (id.startsWith("求职者_")) {
            try {
                userId = Long.parseLong(id.substring("求职者_".length()).trim());
            } catch (NumberFormatException ignored) {}
        }
        if (userId == null) return null;
        UserProfile profile = userProfileMapper.selectById(userId);
        if (profile == null) return null;
        User user = userMapper.selectById(userId);
        String nickname = user != null ? user.getNickname() : null;

        Map<String, Object> basicInfo = new HashMap<>();
        basicInfo.put("name", nickname);
        basicInfo.put("nickname", nickname);
        basicInfo.put("gender", profile.getGender());
        basicInfo.put("phone", maskPhone(safeDecrypt(profile.getPhone())));
        basicInfo.put("email", maskEmail(safeDecrypt(profile.getEmail())));
        if (profile.getBirthDate() != null) {
            basicInfo.put("birth_date", profile.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            basicInfo.put("birthday", profile.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        Map<String, Object> educationInfo = new HashMap<>();
        educationInfo.put("school", profile.getSchool());
        educationInfo.put("major", profile.getMajor());
        educationInfo.put("degree", profile.getDegree());
        educationInfo.put("grade", profile.getGrade());
        educationInfo.put("gpa_level", toGpaLevel(profile.getGpa()));
        educationInfo.put("expected_graduation", profile.getExpectedGraduation());

        Map<String, Object> profileMap = new HashMap<>();
        profileMap.put("basic_info", basicInfo);
        profileMap.put("education_info", educationInfo);

        Map<String, Object> data = new HashMap<>();
        data.put("anonymous_id", "student_" + String.format("%03d", userId));
        data.put("user_id", userId);
        data.put("realName", nickname);
        data.put("profile", profileMap);
        data.put("ability_profile", new HashMap<String, Object>());

        writeAccessLog(userId, "HR", "HR_BROWSE_RESUME", hrAccessorInfo(anonymousId));
        return data;
    }

    private void writeAccessLog(Long userId, String operatorId, String action, String accessorInfoJson) {
        if (userId == null) return;
        LocalDateTime ts = LocalDateTime.now();
        String prevHash = "";
        try {
            DataAccessLog last = dataAccessLogMapper.selectOne(
                    new LambdaQueryWrapper<DataAccessLog>()
                            .eq(DataAccessLog::getUserId, userId)
                            .orderByDesc(DataAccessLog::getAccessedAt)
                            .last("LIMIT 1")
            );
            if (last != null && last.getHash() != null) prevHash = last.getHash();
        } catch (Exception ignored) {}

        String content = (prevHash != null ? prevHash : "") + ts.toString() + (operatorId != null ? operatorId : "") + (action != null ? action : "");
        String hash = SM3Util.hash(content);

        DataAccessLog log = new DataAccessLog();
        log.setUserId(userId);
        log.setAccessType(action);
        log.setAccessorInfo(accessorInfoJson);
        log.setAccessedAt(ts);
        log.setHash(hash);
        dataAccessLogMapper.insert(log);
    }

    private static String hrAccessorInfo(String anonymousId) {
        String aid = anonymousId != null ? anonymousId : "";
        return "{\"operator_type\":\"HR\",\"operator_id\":\"HR\",\"target\":\"" + aid.replace("\"", "") + "\"}";
    }

    private static String safeDecrypt(String maybeCipherText) {
        if (maybeCipherText == null || maybeCipherText.isBlank()) return maybeCipherText;
        try {
            return SM4Util.decrypt(maybeCipherText);
        } catch (Exception e) {
            return maybeCipherText;
        }
    }

    private static String maskPhone(String phone) {
        if (phone == null) return null;
        String p = phone.trim();
        if (p.length() < 7) return "****";
        String digits = p.replaceAll("\\D", "");
        if (digits.length() == 11) {
            return digits.substring(0, 3) + "****" + digits.substring(7);
        }
        return p.substring(0, Math.min(3, p.length())) + "****" + p.substring(Math.max(p.length() - 4, 0));
    }

    private static String maskEmail(String email) {
        if (email == null) return null;
        String e = email.trim();
        int at = e.indexOf('@');
        if (at <= 0) return "***";
        String prefix = e.substring(0, at);
        String domain = e.substring(at);
        String keep = prefix.length() >= 2 ? prefix.substring(0, 2) : prefix.substring(0, 1);
        return keep + "***" + domain;
    }

    private static Double parseGpaValue(String gpa) {
        if (gpa == null) return null;
        String s = gpa.trim();
        if (s.isEmpty()) return null;
        int slash = s.indexOf('/');
        if (slash > 0) s = s.substring(0, slash).trim();
        s = s.replaceAll("[^0-9.]", "");
        if (s.isEmpty()) return null;
        try {
            return Double.parseDouble(s);
        } catch (Exception e) {
            return null;
        }
    }
}
