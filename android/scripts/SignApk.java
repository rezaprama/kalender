import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

/** Offline signing with the Apache-2.0 apksig library; no Android SDK installation needed. */
public final class SignApk {
    public static void main(String[] args) throws Exception {
        if (args.length != 4) throw new IllegalArgumentException("Expected input APK, output APK, keystore, alias");
        String value = System.getenv("KALENDER_STORE_PASSWORD");
        if (value == null || value.isEmpty()) throw new IllegalStateException("Signing password is missing");
        char[] password = value.toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (var input = Files.newInputStream(Path.of(args[2]))) { store.load(input, password); }
        PrivateKey key = (PrivateKey) store.getKey(args[3], password);
        Arrays.fill(password, '\0');
        X509Certificate certificate = (X509Certificate) store.getCertificate(args[3]);
        if (key == null || certificate == null) throw new IllegalStateException("Signing identity is missing");
        certificate.checkValidity();
        Path output = Path.of(args[1]);
        var signer = new ApkSigner.SignerConfig.Builder(args[3], key, List.of(certificate)).build();
        new ApkSigner.Builder(List.of(signer)).setInputApk(Path.of(args[0]).toFile())
            .setOutputApk(output.toFile()).setMinSdkVersion(26)
            .setV1SigningEnabled(false).setV2SigningEnabled(true).setV3SigningEnabled(true)
            .setV4SigningEnabled(false).build().sign();
        var result = new ApkVerifier.Builder(output.toFile()).setMinCheckedPlatformVersion(26).build().verify();
        if (!result.isVerified() || !result.isVerifiedUsingV2Scheme() || !result.isVerifiedUsingV3Scheme()) {
            throw new IllegalStateException("APK signature verification failed: " + result.getErrors());
        }
        String apkHash = hex(Files.readAllBytes(output));
        String certificateHash = hex(certificate.getEncoded());
        Files.writeString(Path.of(args[1] + ".sha256"), apkHash + "  " + output.getFileName() + "\n");
        Files.writeString(Path.of(args[1] + ".certificate.sha256"), certificateHash + "\n");
        System.out.println("Verified APK signature schemes v2/v3 (minimum API 26).");
        System.out.println("APK SHA-256: " + apkHash);
        System.out.println("Certificate SHA-256: " + certificateHash);
    }

    private static String hex(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
