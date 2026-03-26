package www.gradquest.com.util;

import jakarta.annotation.PostConstruct;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Base64;

@Component
public class SM4Util {

    private static final String TRANSFORMATION = "SM4/CBC/PKCS5Padding";
    private static final String ALGO = "SM4";
    private static final String PROVIDER = "BC";

    private static volatile byte[] KEY;
    private static volatile byte[] IV;

    @Value("${sm4.key}")
    private String key;

    @Value("${sm4.iv}")
    private String iv;

    @PostConstruct
    public void init() {
        if (Security.getProvider(PROVIDER) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        KEY = normalize16(key);
        IV = normalize16(iv);
    }

    public static String encrypt(String plainText) {
        if (plainText == null) return null;
        if (plainText.isBlank()) return plainText;
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION, PROVIDER);
            SecretKeySpec keySpec = new SecretKeySpec(KEY, ALGO);
            IvParameterSpec ivSpec = new IvParameterSpec(IV);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] out = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("SM4 encrypt failed", e);
        }
    }

    public static String decrypt(String cipherText) {
        if (cipherText == null) return null;
        if (cipherText.isBlank()) return cipherText;
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION, PROVIDER);
            SecretKeySpec keySpec = new SecretKeySpec(KEY, ALGO);
            IvParameterSpec ivSpec = new IvParameterSpec(IV);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] in = Base64.getDecoder().decode(cipherText);
            byte[] out = cipher.doFinal(in);
            return new String(out, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 兼容历史明文/脏数据：解密失败时直接回退原值，避免上层接口整体失败
            return cipherText;
        }
    }

    private static byte[] normalize16(String s) {
        if (s == null) throw new IllegalStateException("SM4 key/iv is null");
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        if (b.length == 16) return b;
        byte[] out = new byte[16];
        int n = Math.min(b.length, 16);
        System.arraycopy(b, 0, out, 0, n);
        return out;
    }
}
