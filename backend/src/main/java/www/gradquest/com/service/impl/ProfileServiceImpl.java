package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import www.gradquest.com.dto.profile.*;
import www.gradquest.com.entity.*;
import www.gradquest.com.mapper.*;
import www.gradquest.com.service.ProfileService;
import www.gradquest.com.utils.PDFProcessor;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final long RESUME_MAX_SIZE = 10 * 1024 * 1024; // 10MB
    private static final ObjectMapper JSON = new ObjectMapper();

    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;
    private final ProfileSkillMapper profileSkillMapper;
    private final ProfileCertificateMapper profileCertificateMapper;
    private final ProfileInternshipMapper profileInternshipMapper;
    private final ProfileProjectMapper profileProjectMapper;
    private final ProfileAwardMapper profileAwardMapper;
    private final ResumeParseTaskMapper resumeParseTaskMapper;
    private final PDFProcessor pdfProcessor;

    @Override
    public ProfileInfoResponse getProfileInfo(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return null;
        }
        UserProfile profile = userProfileMapper.selectById(userId);
        List<ProfileSkill> skillList = profileSkillMapper.selectList(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, userId));
        List<ProfileCertificate> certList = profileCertificateMapper.selectList(new LambdaQueryWrapper<ProfileCertificate>().eq(ProfileCertificate::getUserId, userId));
        List<ProfileInternship> internList = profileInternshipMapper.selectList(new LambdaQueryWrapper<ProfileInternship>().eq(ProfileInternship::getUserId, userId));
        List<ProfileProject> projectList = profileProjectMapper.selectList(new LambdaQueryWrapper<ProfileProject>().eq(ProfileProject::getUserId, userId));
        List<ProfileAward> awardList = profileAwardMapper.selectList(new LambdaQueryWrapper<ProfileAward>().eq(ProfileAward::getUserId, userId));

        ProfileInfoResponse.BasicInfo basicInfo = ProfileInfoResponse.BasicInfo.builder()
                .nickname(user.getNickname())
                .avatar(user.getAvatar() != null ? user.getAvatar() : "")
                .gender(profile != null ? profile.getGender() : null)
                .birthDate(profile != null && profile.getBirthDate() != null ? profile.getBirthDate().format(DATE_FORMAT) : null)
                .phone(profile != null ? profile.getPhone() : null)
                .email(profile != null ? profile.getEmail() : null)
                .build();

        ProfileInfoResponse.EducationInfo educationInfo = null;
        if (profile != null) {
            educationInfo = ProfileInfoResponse.EducationInfo.builder()
                    .school(profile.getSchool())
                    .major(profile.getMajor())
                    .degree(profile.getDegree())
                    .grade(profile.getGrade())
                    .expectedGraduation(profile.getExpectedGraduation())
                    .gpa(profile.getGpa())
                    .build();
        } else {
            educationInfo = ProfileInfoResponse.EducationInfo.builder().build();
        }

        List<ProfileInfoResponse.SkillItem> skills = skillList.stream().map(s -> {
            List<String> items = parseJsonList(s.getItems());
            return ProfileInfoResponse.SkillItem.builder().category(s.getCategory()).items(items != null ? items : List.of()).build();
        }).collect(Collectors.toList());

        List<ProfileInfoResponse.CertificateItem> certificates = certList.stream().map(c -> ProfileInfoResponse.CertificateItem.builder()
                .name(c.getName()).issueDate(c.getIssueDate()).certUrl(c.getCertUrl()).build()).collect(Collectors.toList());

        List<ProfileInfoResponse.InternshipItem> internships = internList.stream().map(i -> ProfileInfoResponse.InternshipItem.builder()
                .company(i.getCompany()).position(i.getPosition()).startDate(i.getStartDate()).endDate(i.getEndDate()).description(i.getDescription()).build()).collect(Collectors.toList());

        List<ProfileInfoResponse.ProjectItem> projects = projectList.stream().map(p -> ProfileInfoResponse.ProjectItem.builder()
                .name(p.getName()).role(p.getRole()).startDate(p.getStartDate()).endDate(p.getEndDate()).description(p.getDescription())
                .techStack(parseJsonList(p.getTechStack())).build()).collect(Collectors.toList());

        List<ProfileInfoResponse.AwardItem> awards = awardList.stream().map(a -> ProfileInfoResponse.AwardItem.builder()
                .name(a.getName()).level(a.getLevel()).date(a.getDate()).build()).collect(Collectors.toList());

        String updatedAt = profile != null && profile.getUpdatedAt() != null ? profile.getUpdatedAt().format(DATETIME_FORMAT) : null;
        int completeness = computeCompleteness(user, profile, skillList, certList, internList, projectList, awardList);

        return ProfileInfoResponse.builder()
                .userId(userId)
                .basicInfo(basicInfo)
                .educationInfo(educationInfo)
                .skills(skills)
                .certificates(certificates)
                .internships(internships)
                .projects(projects)
                .awards(awards)
                .profileCompleteness(completeness)
                .updatedAt(updatedAt)
                .build();
    }

    @Override
    @Transactional
    public ProfileUpdateResponse updateProfile(ProfileUpdateRequest req) {
        if (req.getUserId() == null) return null;
        User user = userMapper.selectById(req.getUserId());
        if (user == null) return null;

        if (req.getBasicInfo() != null) {
            if (req.getBasicInfo().getNickname() != null) {
                user.setNickname(req.getBasicInfo().getNickname());
                userMapper.updateById(user);
            }
        }

        UserProfile profile = userProfileMapper.selectById(req.getUserId());
        if (profile == null) {
            profile = new UserProfile();
            profile.setUserId(req.getUserId());
            profile.setUpdatedAt(LocalDateTime.now());
            userProfileMapper.insert(profile);
        }
        if (req.getBasicInfo() != null) {
            if (req.getBasicInfo().getGender() != null) profile.setGender(req.getBasicInfo().getGender());
            if (req.getBasicInfo().getBirthDate() != null) {
                try {
                    profile.setBirthDate(LocalDate.parse(req.getBasicInfo().getBirthDate()));
                } catch (Exception ignored) {}
            }
            if (req.getBasicInfo().getPhone() != null) profile.setPhone(req.getBasicInfo().getPhone());
            if (req.getBasicInfo().getEmail() != null) profile.setEmail(req.getBasicInfo().getEmail());
        }
        if (req.getEducationInfo() != null) {
            if (req.getEducationInfo().getSchool() != null) profile.setSchool(req.getEducationInfo().getSchool());
            if (req.getEducationInfo().getMajor() != null) profile.setMajor(req.getEducationInfo().getMajor());
            if (req.getEducationInfo().getDegree() != null) profile.setDegree(req.getEducationInfo().getDegree());
            if (req.getEducationInfo().getGrade() != null) profile.setGrade(req.getEducationInfo().getGrade());
            if (req.getEducationInfo().getExpectedGraduation() != null) profile.setExpectedGraduation(req.getEducationInfo().getExpectedGraduation());
            if (req.getEducationInfo().getGpa() != null) profile.setGpa(req.getEducationInfo().getGpa());
        }
        profile.setUpdatedAt(LocalDateTime.now());
        userProfileMapper.updateById(profile);

        profileSkillMapper.delete(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, req.getUserId()));
        if (req.getSkills() != null) {
            for (ProfileUpdateRequest.SkillItem si : req.getSkills()) {
                if (si.getCategory() == null || si.getItems() == null) continue;
                ProfileSkill s = new ProfileSkill();
                s.setUserId(req.getUserId());
                s.setCategory(si.getCategory());
                s.setItems(JSON.valueToTree(si.getItems()).toString());
                profileSkillMapper.insert(s);
            }
        }

        profileCertificateMapper.delete(new LambdaQueryWrapper<ProfileCertificate>().eq(ProfileCertificate::getUserId, req.getUserId()));
        if (req.getCertificates() != null) {
            for (ProfileUpdateRequest.CertificateItem ci : req.getCertificates()) {
                if (ci.getName() == null) continue;
                ProfileCertificate c = new ProfileCertificate();
                c.setUserId(req.getUserId());
                c.setName(ci.getName());
                c.setIssueDate(ci.getIssueDate());
                profileCertificateMapper.insert(c);
            }
        }

        ProfileInfoResponse after = getProfileInfo(req.getUserId());
        return ProfileUpdateResponse.builder()
                .profileCompleteness(after != null ? after.getProfileCompleteness() : 0)
                .updatedAt(profile.getUpdatedAt().format(DATETIME_FORMAT))
                .build();
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public UploadResumeResponse uploadResume(Long userId, MultipartFile resumeFile) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (resumeFile == null || resumeFile.isEmpty()) {
            throw new IllegalArgumentException("请上传简历文件");
        }
        if (resumeFile.getSize() > RESUME_MAX_SIZE) {
            throw new IllegalArgumentException("简历文件不能超过 10MB");
        }
        String original = resumeFile.getOriginalFilename();
        if (original == null || !original.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("仅支持 PDF 格式简历");
        }
        String taskId = "resume_parse_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS")) + "_" + userId + "_" + (int)(Math.random() * 9000 + 1000);
        ResumeParseTask task = new ResumeParseTask();
        task.setTaskId(taskId);
        task.setUserId(userId);
        task.setStatus("processing");
        resumeParseTaskMapper.insert(task);

        try {
            File tmp = File.createTempFile("resume_", ".pdf");
            resumeFile.transferTo(tmp);
            String text = pdfProcessor.extractText(tmp);
            tmp.delete();

            // 简单抽取：邮箱/手机号/姓名（可后续替换为 AI 结构化解析）
            String email = extractEmail(text);
            String phone = extractPhone(text);
            String name = extractName(text);

            // 写回个人档案：user_profiles(phone/email) & users.nickname（若为空且能抽取到姓名）
            UserProfile profile = userProfileMapper.selectById(userId);
            if (profile == null) {
                profile = new UserProfile();
                profile.setUserId(userId);
            }
            boolean profileChanged = false;
            if (phone != null && (profile.getPhone() == null || profile.getPhone().isBlank())) {
                profile.setPhone(phone);
                profileChanged = true;
            }
            if (email != null && (profile.getEmail() == null || profile.getEmail().isBlank())) {
                profile.setEmail(email);
                profileChanged = true;
            }
            profile.setUpdatedAt(LocalDateTime.now());
            if (profileChanged) {
                if (userProfileMapper.selectById(userId) == null) userProfileMapper.insert(profile);
                else userProfileMapper.updateById(profile);
            } else {
                // 仍然刷新 updated_at
                if (userProfileMapper.selectById(userId) == null) userProfileMapper.insert(profile);
                else userProfileMapper.updateById(profile);
            }

            if (name != null && (user.getNickname() == null || user.getNickname().isBlank() || user.getNickname().startsWith("user_"))) {
                user.setNickname(name);
                userMapper.updateById(user);
            }

            Map<String, Object> parsed = new LinkedHashMap<>();
            Map<String, Object> basic = new LinkedHashMap<>();
            basic.put("name", name != null ? name : "");
            basic.put("phone", phone != null ? phone : "");
            basic.put("email", email != null ? email : "");
            parsed.put("basic_info", basic);
            parsed.put("education", List.of());
            parsed.put("skills", List.of());
            parsed.put("internships", List.of());
            parsed.put("projects", List.of());
            task.setStatus("completed");
            task.setParsedData(JSON.writeValueAsString(parsed));
            task.setConfidenceScore(java.math.BigDecimal.valueOf(0.85));
            task.setSuggestions(JSON.writeValueAsString(List.of("建议补充GPA信息", "实习经历描述可以更具体")));
            resumeParseTaskMapper.updateById(task);
        } catch (Exception e) {
            task.setStatus("failed");
            resumeParseTaskMapper.updateById(task);
        }
        return UploadResumeResponse.builder().taskId(taskId).status("processing").build();
    }

    @Override
    public ResumeParseResultResponse getResumeParseResult(Long userId, String taskId) {
        ResumeParseTask task = resumeParseTaskMapper.selectOne(
                new LambdaQueryWrapper<ResumeParseTask>().eq(ResumeParseTask::getTaskId, taskId).eq(ResumeParseTask::getUserId, userId));
        if (task == null) return null;
        Map<String, Object> parsedData = null;
        if (task.getParsedData() != null) {
            try {
                parsedData = JSON.readValue(task.getParsedData(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {}
        }
        List<String> suggestions = null;
        if (task.getSuggestions() != null) {
            try {
                suggestions = JSON.readValue(task.getSuggestions(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }
        return ResumeParseResultResponse.builder()
                .status(task.getStatus())
                .parsedData(parsedData)
                .confidenceScore(task.getConfidenceScore() != null ? task.getConfidenceScore().doubleValue() : null)
                .suggestions(suggestions != null ? suggestions : List.of())
                .build();
    }

    private static List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return JSON.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private int computeCompleteness(User user, UserProfile profile, List<ProfileSkill> skills,
                                    List<ProfileCertificate> certs, List<ProfileInternship> interns,
                                    List<ProfileProject> projects, List<ProfileAward> awards) {
        int n = 0;
        if (user != null) {
            if (has(user.getNickname())) n++;
            if (has(user.getAvatar())) n++;
        }
        if (profile != null) {
            if (has(profile.getGender())) n++;
            if (profile.getBirthDate() != null) n++;
            if (has(profile.getPhone())) n++;
            if (has(profile.getEmail())) n++;
            if (has(profile.getSchool())) n++;
            if (has(profile.getMajor())) n++;
            if (has(profile.getDegree())) n++;
            if (has(profile.getGrade())) n++;
            if (has(profile.getExpectedGraduation())) n++;
            if (has(profile.getGpa())) n++;
        }
        int total = 12;
        if (skills != null) { total++; if (!skills.isEmpty()) n++; }
        if (certs != null) { total++; if (!certs.isEmpty()) n++; }
        if (interns != null) { total++; if (!interns.isEmpty()) n++; }
        if (projects != null) { total++; if (!projects.isEmpty()) n++; }
        if (awards != null) { total++; if (!awards.isEmpty()) n++; }
        return total <= 0 ? 0 : Math.min(100, n * 100 / total);
    }

    private static boolean has(String s) {
        return s != null && !s.isBlank();
    }

    private static String extractEmail(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
        Matcher m = p.matcher(text);
        return m.find() ? m.group() : null;
    }

    private static String extractPhone(String text) {
        if (text == null) return null;
        // 中国大陆手机号：1[3-9]xxxxxxxxx（允许中间有空格/短横线）
        Pattern p = Pattern.compile("1[3-9]\\d[-\\s]?\\d{4}[-\\s]?\\d{4}");
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.group().replaceAll("[-\\s]", "");
        }
        return null;
    }

    private static String extractName(String text) {
        if (text == null) return null;
        // 简单策略：取前 5 行内第一个“姓名/Name”字段；找不到则返回 null
        String[] lines = text.split("\\R");
        int max = Math.min(lines.length, 5);
        Pattern p1 = Pattern.compile("^(姓名|Name)[:：\\s]+(.+)$");
        for (int i = 0; i < max; i++) {
            String line = lines[i].trim();
            Matcher m = p1.matcher(line);
            if (m.find()) {
                String v = m.group(2).trim();
                if (!v.isEmpty() && v.length() <= 20) return v;
            }
        }
        return null;
    }
}
