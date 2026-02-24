package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import www.gradquest.com.dto.profile.*;
import www.gradquest.com.entity.*;
import www.gradquest.com.mapper.*;
import www.gradquest.com.service.ProfileService;
import www.gradquest.com.utils.PDFProcessor;

import java.io.File;
import java.time.Duration;
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

    @Value("${ai.algorithm.base-url:http://127.0.0.1:5002/api/v1}")
    private String aiAlgorithmBaseUrl;

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

            UserProfile profile = userProfileMapper.selectById(userId);
            if (profile == null) {
                profile = new UserProfile();
                profile.setUserId(userId);
            }

            // 优先调用 Python AI 全量解析；请求失败再走 Java 本地解析
            Map<String, Object> pythonResult = callPythonParseResume(text);
            if (pythonResult != null && pythonResult.get("parsed_data") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsedData = (Map<String, Object>) pythonResult.get("parsed_data");
                if (!parsedData.isEmpty()) {
                    applyPythonParsedDataToDb(userId, user, profile, parsedData);
                    task.setStatus("completed");
                    task.setParsedData(JSON.writeValueAsString(parsedData));
                    Object conf = pythonResult.get("confidence_score");
                    task.setConfidenceScore(conf instanceof Number ? java.math.BigDecimal.valueOf(((Number) conf).doubleValue()) : java.math.BigDecimal.valueOf(0.85));
                    Object sugg = pythonResult.get("suggestions");
                    task.setSuggestions(sugg instanceof List ? JSON.writeValueAsString(sugg) : "[]");
                    resumeParseTaskMapper.updateById(task);
                    return UploadResumeResponse.builder().taskId(taskId).status("processing").build();
                }
            }

            // Java 兜底：简单抽取邮箱/手机号/姓名/出生日期/性别
            String email = extractEmail(text);
            String phone = extractPhone(text);
            String name = extractName(text);
            String birthDateStr = extractBirthDate(text);
            String gender = extractGender(text);
            if (phone != null && !phone.isBlank()) {
                profile.setPhone(phone);
            }
            if (email != null && !email.isBlank()) {
                profile.setEmail(email);
            }
            if (birthDateStr != null && !birthDateStr.isBlank()) {
                try {
                    profile.setBirthDate(LocalDate.parse(birthDateStr));
                } catch (Exception ignored) {}
            }
            if (gender != null && !gender.isBlank()) {
                profile.setGender(gender);
            }
            profile.setUpdatedAt(LocalDateTime.now());
            if (userProfileMapper.selectById(userId) == null) userProfileMapper.insert(profile);
            else userProfileMapper.updateById(profile);
            if (name != null && !name.isBlank()) {
                user.setNickname(name);
                userMapper.updateById(user);
            }

            // Java 兜底：本地正则解析（技能/实习/项目等）
            String skillsBlock = findSectionBlock(text, "技能|专业技能|技术技能|个人技能|Skills?");
            String internshipBlock = findSectionBlock(text, "实习(?:经历)?|工作经历|实习经历|Experience");
            String projectBlock = findSectionBlock(text, "项目(?:经历|经验)?|Projects?");

            applyEducationFromText(text, profile);
            userProfileMapper.updateById(profile);

            profileSkillMapper.delete(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, userId));
            for (ProfileSkill ps : extractSkillsFromText(skillsBlock != null ? skillsBlock : text)) {
                ps.setUserId(userId);
                profileSkillMapper.insert(ps);
            }
            profileInternshipMapper.delete(new LambdaQueryWrapper<ProfileInternship>().eq(ProfileInternship::getUserId, userId));
            for (ProfileInternship pi : extractInternshipsFromText(internshipBlock != null ? internshipBlock : text)) {
                pi.setUserId(userId);
                profileInternshipMapper.insert(pi);
            }
            profileProjectMapper.delete(new LambdaQueryWrapper<ProfileProject>().eq(ProfileProject::getUserId, userId));
            for (ProfileProject pp : extractProjectsFromText(projectBlock != null ? projectBlock : text)) {
                pp.setUserId(userId);
                profileProjectMapper.insert(pp);
            }

            Map<String, Object> parsed = new LinkedHashMap<>();
            Map<String, Object> basic = new LinkedHashMap<>();
            basic.put("name", name != null ? name : "");
            basic.put("nickname", name != null ? name : "");
            basic.put("phone", phone != null ? phone : "");
            basic.put("email", email != null ? email : "");
            basic.put("birth_date", birthDateStr != null ? birthDateStr : "");
            basic.put("birthday", birthDateStr != null ? birthDateStr : "");
            basic.put("gender", gender != null ? gender : "");
            parsed.put("basic_info", basic);
            parsed.put("education", List.of(toEducationMap(profile)));
            List<ProfileSkill> parsedSkills = extractSkillsFromText(skillsBlock != null ? skillsBlock : text);
            List<ProfileInternship> parsedInterns = extractInternshipsFromText(internshipBlock != null ? internshipBlock : text);
            List<ProfileProject> parsedProjs = extractProjectsFromText(projectBlock != null ? projectBlock : text);
            parsed.put("skills", parsedSkills.stream().map(s -> Map.<String, Object>of("category", s.getCategory(), "items", parseJsonList(s.getItems()))).collect(Collectors.toList()));
            parsed.put("internships", parsedInterns.stream().map(i -> Map.of("company", nullToEmpty(i.getCompany()), "position", nullToEmpty(i.getPosition()), "start_date", nullToEmpty(i.getStartDate()), "end_date", nullToEmpty(i.getEndDate()), "description", nullToEmpty(i.getDescription()))).collect(Collectors.toList()));
            parsed.put("projects", parsedProjs.stream().map(p -> Map.<String, Object>of("name", nullToEmpty(p.getName()), "role", nullToEmpty(p.getRole()), "start_date", nullToEmpty(p.getStartDate()), "end_date", nullToEmpty(p.getEndDate()), "description", nullToEmpty(p.getDescription()), "tech_stack", parseJsonList(p.getTechStack()))).collect(Collectors.toList()));
            task.setStatus("completed");
            task.setParsedData(JSON.writeValueAsString(parsed));
            task.setConfidenceScore(java.math.BigDecimal.valueOf(0.85));
            List<String> suggestions = new ArrayList<>();
            if (text == null || text.isBlank()) {
                suggestions.add("未能从PDF提取文本。若为图片型/扫描版PDF，请安装Tesseract及chi_sim语言包以支持OCR，或使用Word重新导出为纯文本PDF");
            } else {
                suggestions.add("建议补充GPA信息");
                suggestions.add("实习经历描述可以更具体");
            }
            task.setSuggestions(JSON.writeValueAsString(suggestions));
            resumeParseTaskMapper.updateById(task);
        } catch (Exception e) {
            task.setStatus("failed");
            try {
                task.setSuggestions(JSON.writeValueAsString(List.of("解析异常: " + (e.getMessage() != null ? e.getMessage() : "未知错误"))));
            } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
                task.setSuggestions("[\"解析异常\"]");
            }
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

    /**
     * 完整度仅按档案页可见字段计算：基本信息(5) + 教育信息(6) + 专业技能(1) = 12 项。
     * 不包含证书、实习经历、项目经历、荣誉奖项（页面无对应填写入口）。
     */
    private int computeCompleteness(User user, UserProfile profile, List<ProfileSkill> skills,
                                    List<ProfileCertificate> certs, List<ProfileInternship> interns,
                                    List<ProfileProject> projects, List<ProfileAward> awards) {
        int n = 0;
        final int total = 12;
        if (user != null && has(user.getNickname())) n++;
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
        if (skills != null && !skills.isEmpty()) n++;
        return total <= 0 ? 0 : Math.min(100, n * 100 / total);
    }

    private static boolean has(String s) {
        return s != null && !s.isBlank();
    }

    /**
     * 调用 Python AI 服务做全量简历解析。失败或超时返回 null，由 Java 兜底。
     * 返回：{ "parsed_data": {...}, "confidence_score": 0.xx, "suggestions": [...] } 或 null
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> callPythonParseResume(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) return null;
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("resume_text", resumeText);
            Map<String, Object> response = WebClient.builder()
                    .baseUrl(aiAlgorithmBaseUrl)
                    .defaultHeader("Content-Type", "application/json")
                    .build()
                    .post()
                    .uri("/profile/parse-resume")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
            if (response != null && Integer.valueOf(200).equals(response.get("code"))) {
                Object data = response.get("data");
                if (data instanceof Map) return (Map<String, Object>) data;
            }
        } catch (WebClientResponseException e) {
            // AI 服务(5002) 未启动或返回 4xx/5xx 时静默降级到 Java 兜底
        } catch (Exception e) {
            // 超时、网络异常等
        }
        return null;
    }

    /**
     * 将 Python 返回的 parsed_data 写入 DB：user.nickname、profile、skills、internships、projects
     */
    @SuppressWarnings("unchecked")
    private void applyPythonParsedDataToDb(Long userId, User user, UserProfile profile, Map<String, Object> parsedData) {
        Map<String, Object> basic = (Map<String, Object>) parsedData.get("basic_info");
        if (basic != null) {
            String name = str(basic.get("name"));
            if (name.isEmpty()) name = str(basic.get("nickname"));
            if (!name.isEmpty()) { user.setNickname(name); userMapper.updateById(user); }
            if (has(str(basic.get("phone")))) profile.setPhone(str(basic.get("phone")));
            if (has(str(basic.get("email")))) profile.setEmail(str(basic.get("email")));
            if (has(str(basic.get("gender")))) profile.setGender(str(basic.get("gender")));
            String bd = str(basic.get("birth_date"));
            if (bd.isEmpty()) bd = str(basic.get("birthday"));
            if (has(bd)) { try { profile.setBirthDate(LocalDate.parse(bd)); } catch (Exception ignored) {} }
        }
        Object eduObj = parsedData.get("education");
        if (eduObj instanceof List && !((List<?>) eduObj).isEmpty()) {
            Object first = ((List<?>) eduObj).get(0);
            if (first instanceof Map) {
                Map<String, Object> edu = (Map<String, Object>) first;
                if (has(str(edu.get("school")))) profile.setSchool(str(edu.get("school")));
                if (has(str(edu.get("major")))) profile.setMajor(str(edu.get("major")));
                if (has(str(edu.get("degree")))) profile.setDegree(str(edu.get("degree")));
                if (has(str(edu.get("grade")))) profile.setGrade(str(edu.get("grade")));
                if (has(str(edu.get("expected_graduation")))) profile.setExpectedGraduation(str(edu.get("expected_graduation")));
                if (has(str(edu.get("gpa")))) profile.setGpa(str(edu.get("gpa")));
            }
        }
        profile.setUpdatedAt(LocalDateTime.now());
        if (userProfileMapper.selectById(userId) == null) userProfileMapper.insert(profile);
        else userProfileMapper.updateById(profile);

        profileSkillMapper.delete(new LambdaQueryWrapper<ProfileSkill>().eq(ProfileSkill::getUserId, userId));
        Object skillsObj = parsedData.get("skills");
        if (skillsObj instanceof List) {
            for (Object so : (List<?>) skillsObj) {
                if (!(so instanceof Map)) continue;
                Map<String, Object> s = (Map<String, Object>) so;
                ProfileSkill ps = new ProfileSkill();
                ps.setUserId(userId);
                ps.setCategory(str(s.get("category")));
                Object items = s.get("items");
                try { ps.setItems(items != null ? JSON.writeValueAsString(items) : "[]"); } catch (Exception e) { ps.setItems("[]"); }
                profileSkillMapper.insert(ps);
            }
        }

        profileInternshipMapper.delete(new LambdaQueryWrapper<ProfileInternship>().eq(ProfileInternship::getUserId, userId));
        Object internObj = parsedData.get("internships");
        if (internObj instanceof List) {
            for (Object io : (List<?>) internObj) {
                if (!(io instanceof Map)) continue;
                Map<String, Object> i = (Map<String, Object>) io;
                ProfileInternship pi = new ProfileInternship();
                pi.setUserId(userId);
                pi.setCompany(str(i.get("company")));
                pi.setPosition(str(i.get("position")));
                pi.setStartDate(str(i.get("start_date")));
                pi.setEndDate(str(i.get("end_date")));
                pi.setDescription(str(i.get("description")));
                profileInternshipMapper.insert(pi);
            }
        }

        profileProjectMapper.delete(new LambdaQueryWrapper<ProfileProject>().eq(ProfileProject::getUserId, userId));
        Object projObj = parsedData.get("projects");
        if (projObj instanceof List) {
            for (Object po : (List<?>) projObj) {
                if (!(po instanceof Map)) continue;
                Map<String, Object> p = (Map<String, Object>) po;
                ProfileProject pp = new ProfileProject();
                pp.setUserId(userId);
                pp.setName(str(p.get("name")));
                pp.setRole(str(p.get("role")));
                pp.setStartDate(str(p.get("start_date")));
                pp.setEndDate(str(p.get("end_date")));
                pp.setDescription(str(p.get("description")));
                Object ts = p.get("tech_stack");
                try { pp.setTechStack(ts != null ? JSON.writeValueAsString(ts) : "[]"); } catch (Exception e) { pp.setTechStack("[]"); }
                profileProjectMapper.insert(pp);
            }
        }
    }

    private static String str(Object o) {
        return o != null ? o.toString().trim() : "";
    }

    private static String extractEmail(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
        Matcher m = p.matcher(text);
        return m.find() ? m.group() : null;
    }

    private static String extractPhone(String text) {
        if (text == null) return null;
        // 中国大陆手机号：1[3-9]xxxxxxxxx（允许中间有空格/短横线，支持3-4-4、3-3-4等格式）
        Pattern p = Pattern.compile("1[3-9]\\d[-\\s]?\\d{3,4}[-\\s]?\\d{4}");
        Matcher m = p.matcher(text);
        if (m.find()) {
            String phone = m.group().replaceAll("[-\\s]", "");
            // 确保是11位数字
            if (phone.length() == 11) return phone;
        }
        // 备用：直接匹配11位连续数字（1开头）
        Pattern p2 = Pattern.compile("1[3-9]\\d{9}");
        Matcher m2 = p2.matcher(text.replaceAll("[-\\s]", ""));
        if (m2.find()) {
            return m2.group();
        }
        return null;
    }

    /** 出生日期：匹配 出生日期/生日/出生/Birth 等后的 yyyy-MM、yyyy/MM/dd、yyyy年M月 等，归一化为 yyyy-MM-dd */
    private static String extractBirthDate(String text) {
        if (text == null) return null;
        String half = text.replace('／', '/').replace('．', '.');
        Pattern p = Pattern.compile("(?:出生日期|生日|出生|Birth|DOB|Date of Birth)[:：\\s]*" +
                "(\\d{4})[-/年.](\\d{1,2})(?:[-/日.](\\d{1,2}))?", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(half);
        if (m.find()) {
            String y = m.group(1);
            String mo = m.group(2).length() == 1 ? "0" + m.group(2) : m.group(2);
            String d = m.group(3);
            if (d == null || d.isEmpty()) d = "01";
            else if (d.length() == 1) d = "0" + d;
            return y + "-" + mo + "-" + d;
        }
        Pattern p2 = Pattern.compile("(?:出生日期|生日|出生)[:：\\s]*(\\d{4})年?(\\d{1,2})?");
        Matcher m2 = p2.matcher(half);
        if (m2.find()) {
            String y = m2.group(1);
            String mo = m2.group(2);
            if (mo == null || mo.isEmpty()) return y + "-01-01";
            if (mo.length() == 1) mo = "0" + mo;
            return y + "-" + mo + "-01";
        }
        return null;
    }

    /** 性别：匹配 性别/Gender 后的 男/女 */
    private static String extractGender(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("(?:性别|Gender)[:：\\s]*(男|女)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) return m.group(1);
        return null;
    }

    private static final Set<String> NAME_BLOCKLIST = Set.of(
            "国家级", "省级", "校级", "院级", "一等奖", "二等奖", "三等奖", "优秀奖", "特等奖",
            "金奖", "银奖", "铜奖", "获奖", "等级", "级别", "等级证书");

    /** 姓名：优先「姓名/Name」标签行；排除奖项级别；若无则取前几行中 2～4 个汉字作为姓名 */
    private static String extractName(String text) {
        if (text == null) return null;
        String[] lines = text.split("\\R");
        Pattern p1 = Pattern.compile("^(姓名|Name)[:：\\s]+(.+)$", Pattern.CASE_INSENSITIVE);
        int max = Math.min(lines.length, 15);
        String labelCandidate = null;
        for (int i = 0; i < max; i++) {
            String line = lines[i].trim();
            Matcher m = p1.matcher(line);
            if (m.find()) {
                String v = m.group(2).trim();
                String[] parts = v.split("[\\s\\|\\/\\-]");
                if (parts.length > 0) v = parts[0].trim();
                if (!v.isEmpty() && v.length() <= 20 && !v.contains("@") && !v.matches(".*\\d{11}.*")) {
                    if (!v.matches(".*[\\u4e00-\\u9fa5].*") && v.length() <= 4) continue;
                    if (NAME_BLOCKLIST.contains(v)) continue;
                    return v;
                }
                labelCandidate = v;
            }
        }
        // 若标签行匹配到的是奖项级别等，则尝试前几行中首个「纯 2～4 个汉字」作为姓名（常见简历首行为姓名）
        if (labelCandidate == null || NAME_BLOCKLIST.contains(labelCandidate)) {
            Pattern chineseName = Pattern.compile("^[\\u4e00-\\u9fa5]{2,4}$");
            for (int i = 0; i < Math.min(lines.length, 8); i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;
                if (chineseName.matcher(line).matches()) return line;
                String firstToken = line.split("[\\s\\|\\/\\-、]")[0].trim();
                if (chineseName.matcher(firstToken).matches()) return firstToken;
            }
        }
        return null;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    /** 将 PDF 提取文本归一化：全角转半角、换行/多空格合并为单空格，便于跨行匹配和正则匹配 */
    private static String normalizeTextForParse(String text) {
        if (text == null) return null;
        String half = toHalfWidth(text);
        return half.replaceAll("\\s+", " ").trim();
    }

    /** 将全角数字/字母/符号统一转成半角，避免 PDF 中使用全角导致正则匹配不到年份等信息 */
    private static String toHalfWidth(String src) {
        if (src == null || src.isEmpty()) return src;
        StringBuilder sb = new StringBuilder(src.length());
        for (int i = 0; i < src.length(); i++) {
            char c = src.charAt(i);
            // 全角空格
            if (c == '\u3000') {
                sb.append(' ');
                continue;
            }
            // 全角字符（！-～）
            if (c >= '\uFF01' && c <= '\uFF5E') {
                sb.append((char) (c - 0xFEE0));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /** 从正文中抽取教育信息并只填充空字段；排除奖项、政治面貌等错位内容 */
    private void applyEducationFromText(String text, UserProfile profile) {
        if (text == null || profile == null) return;
        String normalized = normalizeTextForParse(text);
        if (normalized == null || normalized.isEmpty()) return;

        // 教育区块（用于优先匹配入学时间/院校等）
        String educationBlock = findSectionBlock(text, "教育(?:经历|背景)?|Education");
        String eduNormalized = (educationBlock != null && !educationBlock.isEmpty())
                ? normalizeTextForParse(educationBlock)
                : null;

        // 学校：优先在教育背景区块内匹配，排除竞赛、奖项中的"大学"字样
        if (true) {
            String school = null;
            // 策略1：先尝试在教育背景区块内查找（更准确）
            if (eduNormalized != null && !eduNormalized.isEmpty()) {
                school = matchAfterKeyword(eduNormalized, "(毕业院校|毕业学校|学校|院校|School)\\s*[:：]\\s*([^\\s]{2,40})");
                if (school != null && (school.contains("全国") || school.contains("竞赛") || school.contains("比赛"))) {
                    school = null;
                }
                if (school == null || !isValidSchool(school)) {
                    // 在教育区块内匹配学校名
                    Matcher schoolM = Pattern.compile("([\\u4e00-\\u9fa5]{2,}(?:大学|理工大学|科技大学|师范大学|工业大学|交通大学|农业大学|财经大学|医科大学))").matcher(eduNormalized);
                    while (schoolM.find()) {
                        String found = schoolM.group(1);
                        int start = schoolM.start();
                        int end = schoolM.end();
                        String contextBefore = start > 0 ? eduNormalized.substring(Math.max(0, start - 15), start) : "";
                        String contextAfter = end < eduNormalized.length() ? eduNormalized.substring(end, Math.min(eduNormalized.length(), end + 15)) : "";
                        String fullContext = contextBefore + found + contextAfter;
                        // 严格排除：如果上下文包含"全国"、"第X届"、"竞赛"、"比赛"、"奖"，则跳过
                        if (fullContext.contains("全国") || fullContext.matches(".*第[\\d一二三四五六七八九十]+届.*") 
                                || fullContext.contains("竞赛") || fullContext.contains("比赛") || fullContext.contains("奖")
                                || found.contains("全国") || found.matches(".*第[\\d一二三四五六七八九十]+届.*")) {
                            continue;
                        }
                        if (isValidSchool(found)) {
                            school = found;
                            break;
                        }
                    }
                }
            }
            // 策略2：如果教育区块内没找到，在全文查找（但更严格地排除竞赛/奖项）
            if (school == null || !isValidSchool(school)) {
                school = matchAfterKeyword(normalized, "(毕业院校|毕业学校|学校|院校|School)\\s*[:：]\\s*([^\\s]{2,40})");
                if (school != null && (school.contains("全国") || school.contains("竞赛") || school.contains("比赛"))) {
                    school = null;
                }
                if (school == null || !isValidSchool(school)) {
                    Matcher schoolM = Pattern.compile("([\\u4e00-\\u9fa5]{2,}(?:大学|理工大学|科技大学|师范大学|工业大学|交通大学|农业大学|财经大学|医科大学))").matcher(normalized);
                    while (schoolM.find()) {
                        String found = schoolM.group(1);
                        // 扩大上下文检查范围到30个字符
                        int start = schoolM.start();
                        int end = schoolM.end();
                        String contextBefore = start > 0 ? normalized.substring(Math.max(0, start - 30), start) : "";
                        String contextAfter = end < normalized.length() ? normalized.substring(end, Math.min(normalized.length(), end + 30)) : "";
                        String fullContext = contextBefore + found + contextAfter;
                        // 严格排除：如果上下文或学校名本身包含"全国"、"第X届"、"竞赛"、"比赛"、"奖"，则跳过
                        if (fullContext.contains("全国") || fullContext.matches(".*第[\\d一二三四五六七八九十]+届.*") 
                                || fullContext.contains("竞赛") || fullContext.contains("比赛") || fullContext.contains("奖")
                                || found.contains("全国") || found.matches(".*第[\\d一二三四五六七八九十]+届.*")) {
                            continue;
                        }
                        // 额外检查：如果学校名前后紧跟着"竞赛"、"比赛"、"奖"等词，也排除
                        if (contextAfter.matches("^[\\s]*[竞赛比赛奖].*") || contextBefore.matches(".*[竞赛比赛奖][\\s]*$")) {
                            continue;
                        }
                        if (isValidSchool(found)) {
                            school = found;
                            break;
                        }
                    }
                }
            }
            if (school != null && isValidSchool(school)) profile.setSchool(school.trim());
        }
        // 专业：匹配"XX专业"、"计算机科学与技术"等
        if (true) {
            String major = matchAfterKeyword(normalized, "(所学专业|专业|Major)\\s*[:：]\\s*([^\\s]{2,40})");
            if (major != null) major = major.replaceAll("专业$", "").trim();
            if (major == null || !isValidMajor(major)) {
                Matcher majorM = Pattern.compile("([\\u4e00-\\u9fa5]{2,}(?:专业|学专业|与技术专业|工程专业))").matcher(normalized);
                if (majorM.find()) {
                    String found = majorM.group(1).replaceAll("专业$", "").trim();
                    if (isValidMajor(found) && !isAwardOrPolitical(found)) major = found;
                }
                if (major == null) {
                    majorM = Pattern.compile("(计算机科学与技术|软件工程|人工智能|数据科学|电子信息工程|自动化)").matcher(normalized);
                    if (majorM.find()) major = majorM.group(1);
                }
            }
            if (major != null && isValidMajor(major)) profile.setMajor(major.trim());
        }
        // 学历
        {
            String degree = matchAfterKeyword(normalized, "(学历|学位|Degree)\\s*[:：]\\s*([^\\s]{2,20})");
            if (degree == null || isAwardOrPolitical(degree)) {
                if (normalized.contains("研究生") || normalized.contains("硕士")) degree = "硕士";
                else if (normalized.contains("博士")) degree = "博士";
                else if (normalized.contains("本科") || normalized.contains("学士")) degree = "本科";
                else degree = "本科";
            }
            if (degree != null && !isAwardOrPolitical(degree)) profile.setDegree(degree.trim());
        }
        // 年级：从入学时间推断（支持多种格式：2023.09 至今、2023年9月至今、2023.09-至今等）
        // 说明：这里不再依赖原有的年级值，而是每次根据简历文本重新计算，避免历史错误值（如 2025级）一直保留
        {
            String grade = matchAfterKeyword(normalized, "(年级|Grade)\\s*[:：]\\s*([^\\s]{1,20})");
            if (grade == null || !isValidGrade(grade)) {
                // 优先在教育背景区块内查找入学时间
                String searchText = (eduNormalized != null && !eduNormalized.isEmpty())
                        ? eduNormalized
                        : normalized;
                
                // 匹配多种时间格式：2023.09至今、2023.09 至今、2023年9月 至今、2023-09 至今、2023/09 至今 等
                // 更宽松的匹配：允许空格、短横线、点号等分隔符（注意这里不把“至”放进分隔符，避免吃掉“至今”的第一个字）
                Matcher yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?\\s*[-到~]?\\s*(?:至今|现在|当前|入学|开始)", Pattern.CASE_INSENSITIVE).matcher(searchText);
                if (!yearM.find()) {
                    // 备用1：匹配 2023.09 至今 / 2023-09 至今（年月后有空格再接“至今”）
                    yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?\\s+(?:至今|现在|当前|入学|开始)", Pattern.CASE_INSENSITIVE).matcher(searchText);
                }
                if (!yearM.find()) {
                    // 备用2：匹配 2023.09 / 2023-09（即使没有"至今"，但在教育背景区块内）
                    if (educationBlock != null && !educationBlock.isEmpty()) {
                        yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?").matcher(searchText);
                        if (yearM.find()) {
                            int year = Integer.parseInt(yearM.group(1));
                            if (year >= 2000 && year <= 2035) {
                                grade = year + "级";
                            }
                        }
                    }
                } else {
                    int year = Integer.parseInt(yearM.group(1));
                    if (year >= 2000 && year <= 2035) {
                        grade = year + "级";
                    }
                }

                // 兜底1：如果依然没有匹配到格式化时间，在教育区块中寻找最早的 2000–2035 年份
                if ((grade == null || !isValidGrade(grade)) && eduNormalized != null && !eduNormalized.isEmpty()) {
                    Integer earliest = findEarliestYear(eduNormalized);
                    if (earliest != null) {
                        grade = earliest + "级";
                    }
                }

                // 兜底2：如果连教育区块都没切到，则在全文中寻找最早的 2000–2035 年份
                if ((grade == null || !isValidGrade(grade))) {
                    Integer earliest = findEarliestYear(normalized);
                    if (earliest != null) {
                        grade = earliest + "级";
                    }
                }
            }
            if (grade != null && isValidGrade(grade)) profile.setGrade(grade.trim());
        }
        // 预计毕业：从入学时间+4年推断（同样每次根据简历文本重新计算）
        {
            String exp = matchAfterKeyword(normalized, "(预计毕业|毕业时间|Expected Graduation|Graduation)\\s*[:：]\\s*([^\\s]{2,30})");
            if (exp == null || isAwardOrPolitical(exp)) {
                // 匹配入学时间：2023.09 至今、2023年9月 至今等
                String searchText = (eduNormalized != null && !eduNormalized.isEmpty())
                        ? eduNormalized
                        : normalized;
                Matcher yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?\\s*[-到~]?\\s*(?:至今|现在|当前|入学|开始)").matcher(searchText);
                if (!yearM.find()) {
                    yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?\\s+(?:至今|现在|当前|入学|开始)").matcher(searchText);
                }
                if (!yearM.find() && eduNormalized != null && !eduNormalized.isEmpty()) {
                    // 备用：教育区块内出现起始年月，但没写“至今”（2023.09 / 2023-09 / 2023/09）
                    yearM = Pattern.compile("(\\d{4})[.年/\\-]\\s*\\d{1,2}[.月/\\-]?").matcher(searchText);
                }
                if (yearM.find()) {
                    try {
                        int startYear = Integer.parseInt(yearM.group(1));
                        if (startYear >= 2000 && startYear <= 2035) {
                            // 默认4年制，6月毕业
                            exp = (startYear + 4) + "-06";
                        }
                    } catch (NumberFormatException ignored) {}
                }

                // 兜底1：如果还是没找到，以教育区块中的最早 2000–2035 年份作为入学年份
                if ((exp == null || isAwardOrPolitical(exp)) && eduNormalized != null && !eduNormalized.isEmpty()) {
                    Integer earliest = findEarliestYear(eduNormalized);
                    if (earliest != null) {
                        exp = (earliest + 4) + "-06";
                    }
                }

                // 兜底2：如果没有教育区块或依然没命中，则在全文中找最早 2000–2035 年份推断毕业时间
                if ((exp == null || isAwardOrPolitical(exp))) {
                    Integer earliest = findEarliestYear(normalized);
                    if (earliest != null) {
                        exp = (earliest + 4) + "-06";
                    }
                }
            }
            if (exp != null && !isAwardOrPolitical(exp)) profile.setExpectedGraduation(exp.trim());
        }
        // GPA：支持 3.8/4.0、4.347/5 等形式；新简历解析覆盖原值，与“新简历覆盖档案”一致
        Matcher gpaM = Pattern.compile("(?:GPA|绩点|平均绩点)\\s*[:：]?\\s*([\\d.]+)(?:/\\d+)?", Pattern.CASE_INSENSITIVE).matcher(normalized);
        if (gpaM.find()) {
            profile.setGpa(gpaM.group(1).trim());
        }
    }

    /** 学校名：必须包含"大学"、"学院"、"理工"等关键词，且不能是奖学金、奖项、竞赛、政治等 */
    private static boolean isValidSchool(String s) {
        if (s == null || s.length() < 2) return false;
        // 必须包含学校相关关键词
        if (!s.contains("大学") && !s.contains("学院") && !s.contains("理工") && !s.contains("科技") 
                && !s.contains("师范") && !s.contains("工业") && !s.contains("交通") && !s.contains("农业")) {
            return false;
        }
        // 排除明显的错误内容：竞赛、奖项、政治等
        if (isAwardOrPolitical(s) || s.contains("奖学金") || s.contains("奖状") || s.contains("竞赛")
                || s.contains("政治面貌") || s.contains("党员") || s.contains("团员")) {
            return false;
        }
        // 特别排除：包含"全国"、"第X届"的匹配（如"第十七届全国大学生数学竞赛"）
        if (s.contains("全国") || s.matches(".*第[\\d一二三四五六七八九十]+届.*") 
                || s.contains("竞赛") || s.contains("比赛") || s.contains("奖")) {
            return false;
        }
        return true;
    }

    /** 专业：不能是政治面貌、党员、奖学金等，且应该包含专业相关关键词 */
    private static boolean isValidMajor(String s) {
        if (s == null || s.length() < 2) return false;
        // 排除明显的错误内容
        if (isAwardOrPolitical(s)) return false;
        // 如果包含"专业"关键词，或者长度合理（2-30字符），认为是有效专业
        return s.contains("专业") || s.contains("学") || (s.length() >= 2 && s.length() <= 30);
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

    /** 在文本中查找 2000–2035 之间最早出现的年份；用于作为入学年份的兜底推断 */
    private static Integer findEarliestYear(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = Pattern.compile("(20\\d{2})").matcher(text);
        int best = Integer.MAX_VALUE;
        int currentYear = LocalDate.now().getYear();
        while (m.find()) {
            try {
                int y = Integer.parseInt(m.group(1));
                // 只接受合理范围内，并且不晚于当前年份+1 的年份
                if (y >= 2000 && y <= 2035 && y <= currentYear + 1 && y < best) {
                    best = y;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        return best == Integer.MAX_VALUE ? null : best;
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

    /** 从正文抽取技能：找“技能/专业技能”等段落，或从项目经历/核心课程中提取技术关键词 */
    private static List<ProfileSkill> extractSkillsFromText(String text) {
        List<ProfileSkill> list = new ArrayList<>();
        if (text == null || text.isBlank()) return list;
        List<String> items = new ArrayList<>();
        
        // 策略1：找明确的"技能"段落
        Pattern section = Pattern.compile("(?:技能|专业技能|技术技能|个人技能|Skills?)[:：\\s]*([\\s\\S]*?)(?=\\n\\s*[\\u4e00-\\u9fa5]{2,8}[:：]|\\n\\s*\\n|$)");
        Matcher m = section.matcher(text);
        if (m.find()) {
            String block = m.group(1).replaceAll("\\r", "").trim();
            for (String line : block.split("\\n")) {
                line = line.trim();
                if (line.isEmpty()) continue;
                for (String part : line.split("[,，、;；]")) {
                    String s = part.replaceAll("^[•\\-*\\d.\\s]+", "").trim();
                    if (s.length() >= 1 && s.length() <= 80) items.add(s);
                }
            }
        }
        
        // 策略2：如果没有明确技能段落，从核心课程和项目经历中提取技术关键词
        if (items.isEmpty()) {
            // 核心课程关键词（编程语言、技术栈）
            String[] techKeywords = {
                "Java", "Python", "C\\+\\+", "C#", "JavaScript", "TypeScript", "Go", "Rust", "Kotlin",
                "Spring", "Django", "Flask", "React", "Vue", "Angular", "Node\\.js",
                "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQL",
                "Linux", "Docker", "Kubernetes", "Git",
                "机器学习", "深度学习", "人工智能", "AI", "神经网络",
                "数据结构", "算法", "编译原理", "操作系统", "计算机网络",
                "SLR", "LR", "词法分析", "语法分析", "进程调度", "内存管理"
            };
            for (String keyword : techKeywords) {
                Pattern p = Pattern.compile(keyword, Pattern.CASE_INSENSITIVE);
                if (p.matcher(text).find() && !items.contains(keyword.replaceAll("\\\\", ""))) {
                    items.add(keyword.replaceAll("\\\\", ""));
                }
            }
            
            // 从项目描述中提取技术栈（如"基于SLR(1)"、"进程调度"等）
            Pattern projectTech = Pattern.compile("(?:基于|使用|采用|涉及)([\\u4e00-\\u9fa5A-Za-z0-9+()]+(?:系统|算法|框架|语言|技术))");
            Matcher pm = projectTech.matcher(text);
            while (pm.find() && items.size() < 15) {
                String tech = pm.group(1).trim();
                if (tech.length() >= 2 && tech.length() <= 30 && !items.contains(tech)) {
                    items.add(tech);
                }
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
