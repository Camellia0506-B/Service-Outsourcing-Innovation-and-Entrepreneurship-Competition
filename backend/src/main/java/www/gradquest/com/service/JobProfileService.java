package www.gradquest.com.service;

import www.gradquest.com.dto.job.JobProfilePageData;

/**
 * 岗位画像列表分页查询（job_profiles 表）
 */
public interface JobProfileService {
    JobProfilePageData getProfiles(int page, int size, String keyword, String industry, String level);
}
