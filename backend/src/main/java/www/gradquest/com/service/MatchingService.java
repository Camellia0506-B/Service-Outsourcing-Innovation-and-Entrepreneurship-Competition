package www.gradquest.com.service;

import www.gradquest.com.dto.matching.AnalyzeRequest;
import www.gradquest.com.dto.matching.BatchAnalyzeRequest;
import www.gradquest.com.dto.matching.RecommendJobsRequest;

import java.util.Map;

/**
 * 人岗匹配服务接口
 * 对应 API 文档第 6 章
 */
public interface MatchingService {

    /**
     * 6.1 获取推荐岗位
     */
    Map<String, Object> recommendJobs(RecommendJobsRequest request);

    /**
     * 6.2 获取单个岗位匹配分析
     */
    Map<String, Object> analyze(AnalyzeRequest request);

    /**
     * 6.3 批量匹配分析
     */
    Map<String, Object> batchAnalyze(BatchAnalyzeRequest request);
}
