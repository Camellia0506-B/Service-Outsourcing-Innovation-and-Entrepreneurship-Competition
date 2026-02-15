package www.gradquest.com.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具：生成与解析 Token（仅用于身份认证模块）
 *
 * @author zhangzherui
 */
public class JwtUtil {

    private static final String SECRET = "GradQuest-JWT-Secret-Key-At-Least-256Bits-For-HS256";
    private static final long EXPIRE_MS = 7 * 24 * 60 * 60 * 1000L; // 7 天

    private static SecretKey secretKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成 Token，payload 中包含 user_id
     */
    public static String createToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRE_MS))
                .signWith(secretKey())
                .compact();
    }

    /**
     * 解析 Token，返回 user_id；无效或过期返回 null
     */
    public static Long getUserIdFromToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.parseLong(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }
}
