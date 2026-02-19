package www.gradquest.com.service;

import www.gradquest.com.dto.assessment.*;

import java.util.Map;

public interface AssessmentService {

    /**
     * 3.1 获取测评问卷
     */
    AssessmentQuestionnaireResponse questionnaire(AssessmentQuestionnaireRequest request);

    /**
     * 3.2 提交测评答案
     */
    AssessmentSubmitResponse submit(AssessmentSubmitRequest request);

    /**
     * 3.3 获取测评报告（返回结构严格按文档字段）
     */
    Map<String, Object> report(AssessmentReportRequest request);
}

