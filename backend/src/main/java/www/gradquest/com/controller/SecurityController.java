package www.gradquest.com.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import www.gradquest.com.common.ApiResponse;
import www.gradquest.com.entity.DataAccessLog;
import www.gradquest.com.entity.PrivacySetting;
import www.gradquest.com.mapper.DataAccessLogMapper;
import www.gradquest.com.mapper.PrivacySettingMapper;
import www.gradquest.com.util.SM3Util;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/security")
@RequiredArgsConstructor
public class SecurityController {

    private final PrivacySettingMapper privacySettingMapper;
    private final DataAccessLogMapper dataAccessLogMapper;

    @PutMapping("/privacy/consent")
    public ApiResponse<UpdatePrivacyConsentResponse> updatePrivacyConsent(@RequestBody UpdatePrivacyConsentRequest request) {
        if (request.getUserId() == null) {
            return ApiResponse.badRequest("请提供 user_id 参数");
        }
        if (request.getConsents() == null) {
            return ApiResponse.badRequest("请提供有效的 consents 参数");
        }

        LambdaQueryWrapper<PrivacySetting> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PrivacySetting::getUserId, request.getUserId());
        PrivacySetting existing = privacySettingMapper.selectOne(wrapper);

        PrivacySetting setting;
        if (existing == null) {
            setting = new PrivacySetting();
            setting.setUserId(request.getUserId());
            setting.setResumeVisibleToHr(request.getConsents().getResumeVisibleToHr());
            setting.setAllowHrContact(request.getConsents().getAllowHrContact());
            setting.setAllowAlgorithmOptimization(request.getConsents().getAllowAlgorithmOptimization());
            setting.setAllowResearch(request.getConsents().getAllowResearch());
            setting.setDataRetentionYears(request.getConsents().getDataRetentionYears());
            privacySettingMapper.insert(setting);
        } else {
            existing.setResumeVisibleToHr(request.getConsents().getResumeVisibleToHr());
            existing.setAllowHrContact(request.getConsents().getAllowHrContact());
            existing.setAllowAlgorithmOptimization(request.getConsents().getAllowAlgorithmOptimization());
            existing.setAllowResearch(request.getConsents().getAllowResearch());
            existing.setDataRetentionYears(request.getConsents().getDataRetentionYears());
            privacySettingMapper.updateById(existing);
            setting = existing;
        }

        UpdatePrivacyConsentResponse response = UpdatePrivacyConsentResponse.builder()
                .userId(setting.getUserId())
                .consents(UpdatePrivacyConsentResponse.Consents.builder()
                        .resumeVisibleToHr(setting.getResumeVisibleToHr())
                        .allowHrContact(setting.getAllowHrContact())
                        .allowAlgorithmOptimization(setting.getAllowAlgorithmOptimization())
                        .allowResearch(setting.getAllowResearch())
                        .dataRetentionYears(setting.getDataRetentionYears())
                        .build())
                .consentsUpdated(true)
                .updatedAt(LocalDateTime.now().toString())
                .build();

        return ApiResponse.success("隐私设置更新成功", response);
    }

    @GetMapping("/privacy/consent")
    public ApiResponse<GetPrivacyConsentResponse> getPrivacyConsent(@RequestParam("user_id") Long userId) {
        if (userId == null) {
            return ApiResponse.badRequest("请提供 user_id 参数");
        }

        LambdaQueryWrapper<PrivacySetting> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PrivacySetting::getUserId, userId);
        PrivacySetting setting = privacySettingMapper.selectOne(wrapper);

        GetPrivacyConsentResponse response;
        if (setting == null) {
            response = GetPrivacyConsentResponse.builder()
                    .userId(userId)
                    .consents(GetPrivacyConsentResponse.Consents.builder()
                            .resumeVisibleToHr(false)
                            .allowHrContact(false)
                            .allowAlgorithmOptimization(true)
                            .allowResearch(false)
                            .dataRetentionYears(3)
                            .build())
                    .updatedAt(null)
                    .build();
        } else {
            response = GetPrivacyConsentResponse.builder()
                    .userId(setting.getUserId())
                    .consents(GetPrivacyConsentResponse.Consents.builder()
                            .resumeVisibleToHr(setting.getResumeVisibleToHr())
                            .allowHrContact(setting.getAllowHrContact())
                            .allowAlgorithmOptimization(setting.getAllowAlgorithmOptimization())
                            .allowResearch(setting.getAllowResearch())
                            .dataRetentionYears(setting.getDataRetentionYears())
                            .build())
                    .updatedAt(setting.getUpdatedAt() != null ? setting.getUpdatedAt().toString() : null)
                    .build();
        }

        return ApiResponse.success("success", response);
    }

    @GetMapping("/access/logs")
    public ApiResponse<GetAccessLogsResponse> getAccessLogs(
            @RequestParam("user_id") Long userId,
            @RequestParam(value = "limit", defaultValue = "20") Integer limit) {
        if (userId == null) {
            return ApiResponse.badRequest("请提供 user_id 参数");
        }

        LambdaQueryWrapper<DataAccessLog> wrapperAsc = new LambdaQueryWrapper<>();
        wrapperAsc.eq(DataAccessLog::getUserId, userId)
                .orderByAsc(DataAccessLog::getAccessedAt)
                .last("LIMIT " + limit);
        List<DataAccessLog> logsAsc = dataAccessLogMapper.selectList(wrapperAsc);

        boolean chainOk = verifyChain(logsAsc);

        List<GetAccessLogsResponse.LogItem> logItems = logsAsc.stream()
                .sorted((a, b) -> b.getAccessedAt().compareTo(a.getAccessedAt()))
                .map(log -> GetAccessLogsResponse.LogItem.builder()
                        .timestamp(log.getAccessedAt().toString())
                        .accessType(log.getAccessType())
                        .accessorInfo(log.getAccessorInfo() != null ? log.getAccessorInfo() : "{}")
                        .id("log_" + log.getId())
                        .hashPrefix(hashPrefix(log.getHash()))
                        .verified(chainOk)
                        .build()
                ).toList();

        GetAccessLogsResponse response = GetAccessLogsResponse.builder()
                .userId(userId)
                .logs(logItems)
                .total(logItems.size())
                .build();

        return ApiResponse.success("success", response);
    }

    @Data
    private static class UpdatePrivacyConsentRequest {
        @JsonProperty("user_id")
        private Long userId;

        private Consents consents;

        @Data
        public static class Consents {
            @JsonProperty("resume_visible_to_hr")
            private Boolean resumeVisibleToHr;

            @JsonProperty("allow_hr_contact")
            private Boolean allowHrContact;

            @JsonProperty("allow_algorithm_optimization")
            private Boolean allowAlgorithmOptimization;

            @JsonProperty("allow_research")
            private Boolean allowResearch;

            @JsonProperty("data_retention_years")
            private Integer dataRetentionYears;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class UpdatePrivacyConsentResponse {
        @JsonProperty("user_id")
        private Long userId;

        private Consents consents;

        @JsonProperty("consents_updated")
        private Boolean consentsUpdated;

        @JsonProperty("updated_at")
        private String updatedAt;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Consents {
            @JsonProperty("resume_visible_to_hr")
            private Boolean resumeVisibleToHr;

            @JsonProperty("allow_hr_contact")
            private Boolean allowHrContact;

            @JsonProperty("allow_algorithm_optimization")
            private Boolean allowAlgorithmOptimization;

            @JsonProperty("allow_research")
            private Boolean allowResearch;

            @JsonProperty("data_retention_years")
            private Integer dataRetentionYears;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class GetPrivacyConsentResponse {
        @JsonProperty("user_id")
        private Long userId;

        private Consents consents;

        @JsonProperty("updated_at")
        private String updatedAt;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Consents {
            @JsonProperty("resume_visible_to_hr")
            private Boolean resumeVisibleToHr;

            @JsonProperty("allow_hr_contact")
            private Boolean allowHrContact;

            @JsonProperty("allow_algorithm_optimization")
            private Boolean allowAlgorithmOptimization;

            @JsonProperty("allow_research")
            private Boolean allowResearch;

            @JsonProperty("data_retention_years")
            private Integer dataRetentionYears;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class GetAccessLogsResponse {
        @JsonProperty("user_id")
        private Long userId;

        private List<LogItem> logs;

        private Integer total;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class LogItem {
            private String timestamp;

            @JsonProperty("access_type")
            private String accessType;

            @JsonProperty("accessor_info")
            private String accessorInfo;

            private String id;

            @JsonProperty("hash_prefix")
            private String hashPrefix;

            private Boolean verified;
        }
    }

    private static boolean verifyChain(List<DataAccessLog> logsAsc) {
        if (logsAsc == null || logsAsc.isEmpty()) return true;
        String prevHash = "";
        for (DataAccessLog log : logsAsc) {
            String timestamp = log.getAccessedAt() != null ? log.getAccessedAt().toString() : "";
            String operatorId = extractOperatorId(log.getAccessorInfo());
            String action = log.getAccessType() != null ? log.getAccessType() : "";
            String expected = SM3Util.hash(prevHash + timestamp + operatorId + action);
            if (log.getHash() == null || log.getHash().isBlank()) return false;
            if (!expected.equalsIgnoreCase(log.getHash().trim())) return false;
            prevHash = log.getHash().trim();
        }
        return true;
    }

    private static String hashPrefix(String hash) {
        if (hash == null || hash.isBlank()) return "";
        String h = hash.trim();
        return h.length() <= 8 ? h : h.substring(0, 8);
    }

    private static String extractOperatorId(String accessorInfoJson) {
        if (accessorInfoJson == null || accessorInfoJson.isBlank()) return "";
        String s = accessorInfoJson;
        int k = s.indexOf("\"operator_id\"");
        if (k < 0) k = s.indexOf("\"operatorId\"");
        if (k < 0) return "";
        int colon = s.indexOf(':', k);
        if (colon < 0) return "";
        int startQ = s.indexOf('"', colon);
        if (startQ < 0) return "";
        int endQ = s.indexOf('"', startQ + 1);
        if (endQ < 0) return "";
        return s.substring(startQ + 1, endQ).trim();
    }
}
