package com.zettabridge.launcher;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Process;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Temporary, non-invasive diagnostic for imported-APK compatibility.
 * Logs identity and file information; does not bypass or disable checks.
 */
final class CompatProbe {
    private static final String FILE_NAME = "zb-compat-probe.txt";
    private static File report;
    private static final Set<String> seen = new HashSet<>();
    private static int records = 0;
    private static final int LIMIT = 180;

    private CompatProbe() {}

    static synchronized void start(Context host) {
        File dir = host.getExternalFilesDir(null);
        if (dir == null) return;
        report = new File(dir, FILE_NAME);
        records = 0;
        seen.clear();
        try (FileOutputStream out = new FileOutputStream(report, false)) {
            out.write("Afterlife Java compatibility probe v1\\n".replace("\\n", "\n")
                    .getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            android.util.Log.w("zb-launcher", "cannot start compatibility probe", e);
        }
    }

    static synchronized void note(String message) {
        if (report == null || records >= LIMIT || !seen.add(message)) return;
        records++;
        try (FileOutputStream out = new FileOutputStream(report, true)) {
            out.write((message + "\n").getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            android.util.Log.w("zb-launcher", "cannot append compatibility probe", e);
        }
    }

    static String caller() {
        for (StackTraceElement f : Thread.currentThread().getStackTrace()) {
            String c = f.getClassName();
            if (c.startsWith("java.") || c.startsWith("android.") || c.startsWith("dalvik.")
                    || c.startsWith("com.zettabridge.") || c.startsWith("com.google.")
                    || c.startsWith("libcore.") || c.startsWith("jdk.")) continue;
            if (c.equals(CompatProbe.class.getName()) || c.equals(Thread.class.getName())) continue;
            return f.toString();
        }
        return "(framework or unknown)";
    }

    static void packageQuery(String method, Object[] args, Object result, Throwable error) {
        switch (method) {
            case "getPackageInfo":
            case "getApplicationInfo":
            case "getInstallerPackageName":
            case "getInstallSourceInfo":
            case "getPackagesForUid":
            case "getPackageUid":
            case "checkSignatures":
                break;
            default:
                return;
        }
        try {
            String a = args != null && args.length > 0 ? String.valueOf(args[0]) : "-";
            String flags = args != null && args.length > 1 ? String.valueOf(args[1]) : "-";
            String output = error == null ? describe(result) : error.getClass().getSimpleName()
                    + ":" + String.valueOf(error.getMessage());
            note("PM " + method + "(" + a + "," + flags + ") -> " + output
                    + " from " + caller());
        } catch (Throwable ignored) {
            // Diagnostics must never affect the plugin.
        }
    }

    static String describe(Object value) {
        if (value == null) return "null";
        if (value instanceof PackageInfo) {
            PackageInfo p = (PackageInfo) value;
            int signatures = p.signatures == null ? -1 : p.signatures.length;
            return "PackageInfo{name=" + p.packageName + ",version=" + p.versionName
                    + ",cert-count=" + signatures
                    + ",first-cert-sha256=" + firstCertificate(p.signatures)
                    + ",source=" + (p.applicationInfo == null ? "null" : p.applicationInfo.sourceDir)
                    + "}";
        }
        if (value instanceof ApplicationInfo) {
            ApplicationInfo a = (ApplicationInfo) value;
            return "ApplicationInfo{name=" + a.packageName + ",source=" + a.sourceDir
                    + ",nativeLib=" + a.nativeLibraryDir + ",uid=" + a.uid + "}";
        }
        if (value instanceof String[]) return Arrays.toString((String[]) value);
        return String.valueOf(value);
    }

    static void snapshot(Context host, LoadedPlugin p) {
        try {
            File apk = p.record.apk();
            note("SNAPSHOT host=" + host.getPackageName() + " guest=" + p.packageName
                    + " uid=" + Process.myUid() + " sdk=" + Build.VERSION.SDK_INT
                    + " supportedAbis=" + Arrays.toString(Build.SUPPORTED_ABIS));
            note("SNAPSHOT selectedAbi=" + p.record.selectedAbi
                    + " targetSdk=" + p.record.targetSdk
                    + " apk=" + apk.getAbsolutePath()
                    + " bytes=" + apk.length() + " readonly=" + !apk.canWrite());
            note("SNAPSHOT apkSha256=" + sha256(apk));
            note("SNAPSHOT archive " + describe(p.info));
            note("SNAPSHOT applicationInfo " + describe(p.appInfo));
            File[] libs = p.record.libDir().listFiles();
            note("SNAPSHOT extractedNativeLibs=" + (libs == null ? "(none)" :
                    Arrays.toString(Arrays.stream(libs).map(File::getName).sorted().toArray())));
            String[] packages = host.getPackageManager().getPackagesForUid(Process.myUid());
            note("SNAPSHOT realPackagesForUid=" + Arrays.toString(packages));
        } catch (Throwable t) {
            note("SNAPSHOT exception " + t.toString());
        }
    }

    private static String firstCertificate(Signature[] signatures) {
        if (signatures == null || signatures.length == 0) return "(unavailable)";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return hex(digest.digest(signatures[0].toByteArray()));
        } catch (Exception e) {
            return "(failed)";
        }
    }

    private static String sha256(File f) {
        try (FileInputStream in = new FileInputStream(f)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) != -1) digest.update(buf, 0, n);
            return hex(digest.digest());
        } catch (Exception e) {
            return "(failed: " + e.getClass().getSimpleName() + ")";
        }
    }

    private static String hex(byte[] data) {
        StringBuilder sb = new StringBuilder(data.length * 2);
        for (byte b : data) sb.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
        return sb.toString();
    }

    static String read(Context host) {
        File dir = host.getExternalFilesDir(null);
        if (dir == null) return "(no external files dir)";
        File file = new File(dir, FILE_NAME);
        if (!file.exists()) return "(no compatibility probe yet)";
        try {
            byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
            String s = new String(bytes, StandardCharsets.UTF_8);
            return s.length() > 30000 ? s.substring(0, 30000) + "\n(truncated)" : s;
        } catch (IOException e) {
            return "(cannot read compatibility probe: " + e + ")";
        }
    }
}
