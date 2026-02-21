package www.gradquest.com.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import www.gradquest.com.dto.job.JobProfilePageData;
import www.gradquest.com.dto.job.JobProfileRecord;
import www.gradquest.com.entity.JobProfile;
import www.gradquest.com.mapper.JobProfileMapper;
import www.gradquest.com.service.JobProfileService;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 从 job_profiles 表分页查询：keyword LIKE job_name，industry/level 精确筛选
 */
@Service
@RequiredArgsConstructor
public class JobProfileServiceImpl implements JobProfileService {

    private final JobProfileMapper jobProfileMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public JobProfilePageData getProfiles(int page, int size, String keyword, String industry, String level) {
        Page<JobProfile> p = new Page<>(page, size);
        LambdaQueryWrapper<JobProfile> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(JobProfile::getJobName, keyword);
        }
        if (StringUtils.hasText(industry)) {
            wrapper.eq(JobProfile::getIndustry, industry);
        }
        if (StringUtils.hasText(level)) {
            wrapper.eq(JobProfile::getLevel, level);
        }
        wrapper.orderByAsc(JobProfile::getId);
        Page<JobProfile> result = jobProfileMapper.selectPage(p, wrapper);
        List<JobProfileRecord> records = result.getRecords().stream()
                .map(this::toRecord)
                .collect(Collectors.toList());
        int totalPages = (int) Math.max(1, (result.getTotal() + size - 1) / size);
        return JobProfilePageData.builder()
                .total(result.getTotal())
                .pages(totalPages)
                .current((int) result.getCurrent())
                .records(records)
                .build();
    }

    private JobProfileRecord toRecord(JobProfile e) {
        List<String> skillsList = parseSkills(e.getSkills());
        return JobProfileRecord.builder()
                .jobId(e.getJobId())
                .jobName(e.getJobName())
                .industry(e.getIndustry())
                .level(e.getLevel())
                .salaryRange(e.getSalaryRange())
                .skills(skillsList)
                .demandScore(e.getDemandScore())
                .trend(e.getTrend())
                .build();
    }

    private List<String> parseSkills(String skills) {
        if (!StringUtils.hasText(skills)) return Collections.emptyList();
        try {
            return objectMapper.readValue(skills, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
