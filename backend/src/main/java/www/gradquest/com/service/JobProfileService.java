package www.gradquest.com.service;

import www.gradquest.com.dto.job.*;

import java.util.Map;

public interface JobProfileService {

    /**
     * 4.1 获取岗位画像列表
     */
    Map<String, Object> listProfiles(JobProfilesRequest request);

    /**
     * 4.2 获取岗位详细画像
     */
    Map<String, Object> getProfileDetail(String jobId);

    /**
     * 4.3 获取岗位关联图谱
     */
    Map<String, Object> getRelationGraph(JobRelationGraphRequest request);

    /**
     * 4.4 AI 生成岗位画像
     */
    Map<String, Object> aiGenerateProfile(JobAiGenerateProfileRequest request);

    /**
     * 4.5 获取 AI 生成结果
     */
    Map<String, Object> aiGenerateResult(String taskId);
}

