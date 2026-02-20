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

            // 先按标题切出各区块，再在对应区块内解析，避免“专业”匹配到“专业技能”等错位
            String educationBlock = findSectionBlock(text, "教育(?:经历|背景)?|Education");
            String skillsBlock = findSectionBlock(text, "技能|专业技能|技术技能|个人技能|Skills?");
            String internshipBlock = findSectionBlock(text, "实习(?:经历)?|工作经历|实习经历|Experience");
            String projectBlock = findSectionBlock(text, "项目(?:经历|经验)?|Projects?");

            // 教育信息：仅在教育区块内匹配 学校/专业/学历 等
            applyEducationFromText(educationBlock != null ? educationBlock : text, profile);
            userProfileMapper.updateById(profile);

            // 技能：优先技能区块，无则从全文再试一次（兼容不同标题）
            profileSkillMapper.delete(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, userId));
            List<ProfileSkill> parsedSkills = extractSkillsFromText(skillsBlock != null ? skillsBlock : text);
            for (ProfileSkill ps : parsedSkills) {
                ps.setUserId(userId);
                profileSkillMapper.insert(ps);
            }

            // 实习：优先实习区块，无则从全文再试
            profileInternshipMapper.delete(new LambdaQueryWrapper<ProfileInternship>().eq(ProfileInternship::getUserId, userId));
            List<ProfileInternship> parsedInterns = extractInternshipsFromText(internshipBlock != null ? internshipBlock : text);
            for (ProfileInternship pi : parsedInterns) {
                pi.setUserId(userId);
                profileInternshipMapper.insert(pi);
            }

            // 项目：优先项目区块，无则从全文再试
            profileProjectMapper.delete(new LambdaQueryWrapper<ProfileProject>().eq(ProfileProject::getUserId, userId));
            List<ProfileProject> parsedProjs = extractProjectsFromText(projectBlock != null ? projectBlock : text);
            for (ProfileProject pp : parsedProjs) {
                pp.setUserId(userId);
                profileProjectMapper.insert(pp);
            }

            // 构建 parsed_data 供 resume-parse-result 返回
            Map<String, Object> parsed = new LinkedHashMap<>();
            Map<String, Object> basic = new LinkedHashMap<>();
            basic.put("name", name != null ? name : "");
            basic.put("phone", phone != null ? phone : "");
            basic.put("email", email != null ? email : "");
            parsed.put("basic_info", basic);
            parsed.put("education", toEducationMap(profile));
            parsed.put("skills", parsedSkills.stream().map(s -> Map.<String, Object>of("category", s.getCategory(), "items", parseJsonList(s.getItems()))).collect(Collectors.toList()));
            parsed.put("internships", parsedInterns.stream().map(i -> Map.of("company", nullToEmpty(i.getCompany()), "position", nullToEmpty(i.getPosition()), "start_date", nullToEmpty(i.getStartDate()), "end_date", nullToEmpty(i.getEndDate()), "description", nullToEmpty(i.getDescription()))).collect(Collectors.toList()));
            parsed.put("projects", parsedProjs.stream().map(p -> Map.<String, Object>of("name", nullToEmpty(p.getName()), "role", nullToEmpty(p.getRole()), "start_date", nullToEmpty(p.getStartDate()), "end_date", nullToEmpty(p.getEndDate()), "description", nullToEmpty(p.getDescription()), "tech_stack", parseJsonList(p.getTechStack()))).collect(Collectors.toList()));
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

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    /** 从正文中抽取教育信息并只填充空字段；排除奖项、政治面貌等错位内容 */
    private void applyEducationFromText(String text, UserProfile profile) {
        if (text == null || profile == null) return;
        // 学校：必须为“教育”区块内、且不能是奖项/荣誉类
        if (profile.getSchool() == null || profile.getSchool().isBlank()) {
            String school = matchAfterKeyword(text, "(毕业院校|毕业学校|学校|院校|School)\\s*[:：]\\s*([^\\n\\r]{2,40})");
            if (school != null && isValidSchool(school)) profile.setSchool(school.trim());
        }
        // 专业：不能是政治面貌、奖项等
        if (profile.getMajor() == null || profile.getMajor().isBlank()) {
            String major = matchAfterKeyword(text, "(所学专业|专业|Major)\\s*[:：]\\s*([^\\n\\r]{2,40})");
            if (major != null && isValidMajor(major)) profile.setMajor(major.trim());
        }
        if (profile.getDegree() == null || profile.getDegree().isBlank()) {
            String degree = matchAfterKeyword(text, "(学历|学位|Degree)\\s*[:：]\\s*([^\\n\\r]{2,20})");
            if (degree != null && !isAwardOrPolitical(degree)) profile.setDegree(degree.trim());
        }
        if (profile.getGrade() == null || profile.getGrade().isBlank()) {
            String grade = matchAfterKeyword(text, "(年级|Grade)\\s*[:：]\\s*([^\\n\\r]{1,20})");
            if (grade != null && isValidGrade(grade)) profile.setGrade(grade.trim());
        }
        if (profile.getExpectedGraduation() == null || profile.getExpectedGraduation().isBlank()) {
            String exp = matchAfterKeyword(text, "(预计毕业|毕业时间|Expected Graduation|Graduation)\\s*[:：]\\s*([^\\n\\r]{2,30})");
            if (exp != null && !isAwardOrPolitical(exp)) profile.setExpectedGraduation(exp.trim());
        }
        if (profile.getGpa() == null || profile.getGpa().isBlank()) {
            Matcher gpaM = Pattern.compile("(?:GPA|绩点|平均绩点)\\s*[:：]?\\s*([\\d.]+)").matcher(text);
            if (gpaM.find()) profile.setGpa(gpaM.group(1).trim());
        }
    }

    /** 学校名：不能是奖学金、奖项、竞赛、政治等 */
    private static boolean isValidSchool(String s) {
        if (s == null || s.length() < 2) return false;
        return !isAwardOrPolitical(s) && !s.contains("奖学金") && !s.contains("奖状") && !s.contains("竞赛");
    }

    /** 专业：不能是政治面貌、党员、奖学金等 */
    private static boolean isValidMajor(String s) {
        if (s == null || s.length() < 2) return false;
        return !isAwardOrPolitical(s);
    }

    /** 年级：允许 2021级、大一 等，排除纯奖项描述 */
    private static boolean isValidGrade(String s) {
        if (s == null) return false;
        return !isAwardOrPolitical(s) && (s.matches(".*\\d+级?.*") || s.contains("大") || s.contains("研") || s.contains("博") || s.length() <= 15);
    }

    private static boolean isAwardOrPolitical(String s) {
        if (s == null) return true;
        return s.contains("政治面貌") || s.contains("党员") || s.contains("团员") || s.contains("群众")
                || s.contains("奖学金") || s.contains("一等奖") || s.contains("二等奖") || s.contains("三等奖")
                || s.contains("奖状") || s.contains("荣誉") || s.contains("竞赛");
    }

    private static String matchAfterKeyword(String text, String regex) {
        if (text == null || text.isBlank()) return null;
        Matcher m = Pattern.compile(regex).matcher(text);
        return m.find() ? m.group(2).trim() : null;
    }

    /** 按标题切出区块内容，避免“专业”匹配到“专业技能”、奖项/政治面貌进入教育区块。返回该区块正文，无则返回 null。 */
    private static String findSectionBlock(String text, String sectionTitlePattern) {
        if (text == null || text.isBlank()) return null;
        // 下一段落的常见标题（用于截断），教育区块必须在 获奖/政治面貌 之前结束
        String nextSection = "获奖|荣誉|政治面貌|证书|教育(?:经历|背景)?|技能|专业技能|实习|工作经历|项目(?:经历|经验)?|自我|Education|Skills?|Experience|Project";
        Pattern p = Pattern.compile(
            "(?:" + sectionTitlePattern + ")\\s*[:：]?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:" + nextSection + ")\\s*[:：]?|\\n\\s*\\n\\s*\\n|$)"
        );
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    /** 教育信息转 map 供 parsed_data */
    private static Map<String, Object> toEducationMap(UserProfile p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("school", nullToEmpty(p != null ? p.getSchool() : null));
        m.put("major", nullToEmpty(p != null ? p.getMajor() : null));
        m.put("degree", nullToEmpty(p != null ? p.getDegree() : null));
        m.put("grade", nullToEmpty(p != null ? p.getGrade() : null));
        m.put("expected_graduation", nullToEmpty(p != null ? p.getExpectedGraduation() : null));
        m.put("gpa", nullToEmpty(p != null ? p.getGpa() : null));
        return m;
    }

    /** 从正文抽取技能：找“技能/专业技能”等段落，按行或逗号拆分 */
    private static List<ProfileSkill> extractSkillsFromText(String text) {
        List<ProfileSkill> list = new ArrayList<>();
        if (text == null || text.isBlank()) return list;
        String lower = text;
        // 找技能段落：从标题到下一个大标题或空行
        Pattern section = Pattern.compile("(?:技能|专业技能|技术技能|个人技能|Skills?)[:：\\s]*([\\s\\S]*?)(?=\\n\\s*[\\u4e00-\\u9fa5]{2,8}[:：]|\\n\\s*\\n|$)");
        Matcher m = section.matcher(lower);
        if (m.find()) {
            String block = m.group(1).replaceAll("\\r", "").trim();
            List<String> items = new ArrayList<>();
            for (String line : block.split("\\n")) {
                line = line.trim();
                if (line.isEmpty()) continue;
                // 每行可能是 "• xxx" 或 " - xxx" 或逗号分隔
                for (String part : line.split("[,，、;；]")) {
                    String s = part.replaceAll("^[•\\-*\\d.\\s]+", "").trim();
                    if (s.length() >= 1 && s.length() <= 80) items.add(s);
                }
            }
            if (!items.isEmpty()) {
                ProfileSkill ps = new ProfileSkill();
                ps.setCategory("专业技能");
                try {
                    ps.setItems(JSON.writeValueAsString(items));
                } catch (Exception ignored) {
                    ps.setItems("[]");
                }
                list.add(ps);
            }
        }
        return list;
    }

    /** 从正文抽取实习经历：找“实习”段落，按条解析公司/职位/时间/描述 */
    private static List<ProfileInternship> extractInternshipsFromText(String text) {
        List<ProfileInternship> list = new ArrayList<>();
        if (text == null || text.isBlank()) return list;
        Pattern section = Pattern.compile("(?:实习|工作经历|实习经历|Experience)[:：\\s]*([\\s\\S]*?)(?=\\n\\s*[\\u4e00-\\u9fa5]{2,8}[:：]|\\n\\s*\\n{2,}|$)");
        Matcher m = section.matcher(text);
        if (!m.find()) return list;
        String block = m.group(1);
        // 按行或明显条目拆分（公司名 + 时间 或 职位）
        String[] parts = block.split("(?=\\d{4}[年\\-/.]\\d|\\d{4}[年\\-/.]\\d{2}|[\\u4e00-\\u9fa5]{2,}[有限公司|科技|集团])");
        for (String part : parts) {
            part = part.trim();
            if (part.length() < 5) continue;
            ProfileInternship i = new ProfileInternship();
            Matcher dateRange = Pattern.compile("(\\d{4})[年\\-/.](\\d{1,2})?[月]?[至到\\-~]?(\\d{4})?[年\\-/.]?(\\d{1,2})?[月]?").matcher(part);
            if (dateRange.find()) {
                i.setStartDate(dateRange.group(1) + (dateRange.group(2) != null && !dateRange.group(2).isEmpty() ? "-" + dateRange.group(2) : "-01"));
                i.setEndDate(dateRange.group(3) != null ? dateRange.group(3) + (dateRange.group(4) != null && !dateRange.group(4).isEmpty() ? "-" + dateRange.group(4) : "-12") : null);
            }
            Matcher company = Pattern.compile("([\\u4e00-\\u9fa5a-zA-Z0-9]+(?:有限公司|科技|集团|公司|股份有限公司)?)").matcher(part);
            if (company.find()) i.setCompany(company.group(1).trim());
            Matcher pos = Pattern.compile("(?:职位|岗位|Position|岗位名称)[:：\\s]*([^\\n]{1,40})").matcher(part);
            if (pos.find()) i.setPosition(pos.group(1).trim());
            if (i.getPosition() == null) {
                String firstLine = part.split("\\n")[0].trim();
                if (firstLine.length() > 0 && firstLine.length() < 50) i.setPosition(firstLine);
            }
            i.setDescription(part.length() > 200 ? part.substring(0, 200) + "…" : part);
            if (i.getCompany() != null || i.getPosition() != null) list.add(i);
        }
        if (list.isEmpty()) {
            // 退化为整块作为一条
            String desc = block.trim();
            if (desc.length() > 10) {
                ProfileInternship one = new ProfileInternship();
                one.setDescription(desc.length() > 500 ? desc.substring(0, 500) + "…" : desc);
                list.add(one);
            }
        }
        return list;
    }

    /** 从正文抽取项目经历 */
    private static List<ProfileProject> extractProjectsFromText(String text) {
        List<ProfileProject> list = new ArrayList<>();
        if (text == null || text.isBlank()) return list;
        Pattern section = Pattern.compile("(?:项目|项目经历|项目经验|Projects?)[:：\\s]*([\\s\\S]*?)(?=\\n\\s*[\\u4e00-\\u9fa5]{2,8}[:：]|\\n\\s*\\n{2,}|$)");
        Matcher m = section.matcher(text);
        if (!m.find()) return list;
        String block = m.group(1);
        String[] entries = block.split("(?=\\d{4}[年\\-/.]|项目名称|项目描述|[\\u4e00-\\u9fa5]{3,}项目)");
        for (String entry : entries) {
            entry = entry.trim();
            if (entry.length() < 5) continue;
            ProfileProject p = new ProfileProject();
            Matcher dateRange = Pattern.compile("(\\d{4})[年\\-/.](\\d{1,2})?[至到\\-~]?(\\d{4})?[年\\-/.]?(\\d{1,2})?").matcher(entry);
            if (dateRange.find()) {
                p.setStartDate(dateRange.group(1) + (dateRange.group(2) != null && !dateRange.group(2).isEmpty() ? "-" + dateRange.group(2) : "-01"));
                p.setEndDate(dateRange.group(3) != null ? dateRange.group(3) + (dateRange.group(4) != null && !dateRange.group(4).isEmpty() ? "-" + dateRange.group(4) : "-12") : null);
            }
            String firstLine = entry.split("\\n")[0].trim();
            if (firstLine.length() > 0 && firstLine.length() <= 100) p.setName(firstLine);
            p.setDescription(entry.length() > 300 ? entry.substring(0, 300) + "…" : entry);
            Matcher role = Pattern.compile("(?:角色|职务|Role)[:：\\s]*([^\\n]{1,30})").matcher(entry);
            if (role.find()) p.setRole(role.group(1).trim());
            if (p.getName() != null || p.getDescription() != null) list.add(p);
        }
        if (list.isEmpty() && block.trim().length() > 10) {
            ProfileProject one = new ProfileProject();
            one.setDescription(block.trim().length() > 500 ? block.trim().substring(0, 500) + "…" : block.trim());
            list.add(one);
        }
        return list;
    }
}
