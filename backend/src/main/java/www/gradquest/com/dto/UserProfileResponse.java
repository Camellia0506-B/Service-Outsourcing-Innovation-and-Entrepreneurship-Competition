package www.gradquest.com.dto;

import lombok.Builder;
import lombok.Data;

/**
 * @author zhangzherui
 */
@Data
@Builder
public class UserProfileResponse {
    private UserInfo userInfo;
    private Stats stats;

    @Data
    @Builder
    public static class UserInfo {
        private Long id;
        private String username;
        private String nickname;
        private String avatar;
    }

    @Data
    @Builder
    public static class Stats {
        private Integer followCount;
        private Integer postCount;
        private Integer resourceCount;
    }
}
