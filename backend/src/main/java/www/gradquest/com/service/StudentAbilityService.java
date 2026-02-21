package www.gradquest.com.service;

import www.gradquest.com.dto.student.AbilityProfileRequest;
import www.gradquest.com.dto.student.AiGenerateProfileRequest;
import www.gradquest.com.dto.student.UpdateProfileRequest;

import java.util.Map;

/**
 * 学生能力画像服务接口
 * 对应 API 文档第 5 章
 */
public interface StudentAbilityService {
    /**
     * 5.1 获取学生能力画像
     */
    Map<String, Object> getAbilityProfile(AbilityProfileRequest request);

    /**
     * 5.2 AI生成学生能力画像
     */
    Map<String, Object> aiGenerateProfile(AiGenerateProfileRequest request);

    /**
     * 5.3 更新能力画像
     */
    Map<String, Object> updateProfile(UpdateProfileRequest request);
}
