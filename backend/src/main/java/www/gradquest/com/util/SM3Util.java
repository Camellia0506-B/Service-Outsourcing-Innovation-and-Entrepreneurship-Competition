package www.gradquest.com.util;

import org.bouncycastle.crypto.digests.SM3Digest;

import java.nio.charset.StandardCharsets;

public class SM3Util {

    public static String hash(String input) {
        if (input == null) input = "";
        byte[] in = input.getBytes(StandardCharsets.UTF_8);
        SM3Digest d = new SM3Digest();
        d.update(in, 0, in.length);
        byte[] out = new byte[d.getDigestSize()];
        d.doFinal(out, 0);
        return toHex(out);
    }

    private static String toHex(byte[] bytes) {
        char[] hex = "0123456789abcdef".toCharArray();
        char[] out = new char[bytes.length * 2];
        for (int i = 0; i < bytes.length; i++) {
            int v = bytes[i] & 0xFF;
            out[i * 2] = hex[v >>> 4];
            out[i * 2 + 1] = hex[v & 0x0F];
        }
        return new String(out);
    }
}
