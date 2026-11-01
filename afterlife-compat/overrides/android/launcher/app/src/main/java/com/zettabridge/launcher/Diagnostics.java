package com.zettabridge.launcher;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.util.Log;

import com.zettabridge.core.ZBridge;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Error reports that do not depend on logcat: some ROMs (OxygenOS) drop third-party app logs.
 * The full stack trace goes to the clipboard and to
 * /sdcard/Android/data/com.zettabridge.launcher/files/zb-errors.txt (appended).
 *
 * <p>The translator's own runtime report lands next to it as zb-runtime-report.txt, rewritten by
 * the :guest process whenever it changes, so it survives a :guest process that dies silently.
 */
final class Diagnostics {
    private static final String TAG = "zb-launcher";
    private static final String REPORT_NAME = "zb-runtime-report.txt";
    private static final String IDENTITY_TRACE_NAME = "zb-identity-trace.txt";
    private static File identityTrace;
    private static int identityCount;

    private Diagnostics() {}

    /** The runtime report file, or null when external storage is unavailable. */
    static File runtimeReportFile(Context context) {
        File dir = context.getExternalFilesDir(null);
        return dir == null ? null : new File(dir, REPORT_NAME);
    }

    /**
     * Makes the :guest process persist its runtime report. Called once, before plugin code runs;
     * failures are not fatal, the run simply leaves no report behind.
     */
    static void startRuntimeReport(Context context) {
        File file = runtimeReportFile(context);
        if (file == null) {
            Log.w(TAG, "no external files dir: the runtime report is not persisted");
            return;
        }
        try {
            if (!ZBridge.setReportFile(file.getAbsolutePath())) {
                Log.w(TAG, "cannot persist the runtime report to " + file);
            }
        } catch (Throwable t) {
            Log.w(TAG, "cannot start the runtime report: " + t);
        }
    }

    /** Capture Java-side package and identity checks before any native game library starts. */
    static synchronized void startIdentityTrace(Context context) {
        File dir = context.getExternalFilesDir(null);
        if (dir == null) return;
        identityTrace = new File(dir, IDENTITY_TRACE_NAME);
        identityCount = 0;
        try (FileOutputStream stream = new FileOutputStream(identityTrace, false)) {
            stream.write("Java identity trace (debug build)\n".getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            Log.w(TAG, "cannot initialize identity trace", e);
        }
    }

    static synchronized void noteIdentity(String message) {
        if (identityTrace == null || identityCount++ >= 160) return;
        try (FileOutputStream stream = new FileOutputStream(identityTrace, true)) {
            stream.write((message + "\n").getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            Log.w(TAG, "cannot append identity trace", e);
        }
    }

    static String findGuestCaller() {
        for (StackTraceElement element : Thread.currentThread().getStackTrace()) {
            String clazz = element.getClassName();
            if (clazz.startsWith("com.dts.") || clazz.startsWith("com.unity3d.")
                    || clazz.startsWith("com.google.") || clazz.startsWith("com.garena.")) {
                return element.toString();
            }
        }
        return "(no guest frame)";
    }

    /** The last run report, with the Java identity trace when available. */
    static String readRuntimeReport(Context context) {
        File file = runtimeReportFile(context);
        if (file == null || !file.isFile()) return null;
        try {
            String text = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            File identity = new File(context.getExternalFilesDir(null), IDENTITY_TRACE_NAME);
            if (identity.isFile()) {
                text += "\n--- JAVA IDENTITY TRACE ---\n"
                        + new String(Files.readAllBytes(identity.toPath()), StandardCharsets.UTF_8);
            }
            // The runtime report covers native translation only. A guest crash before
            // native loading appears in zb-errors.txt, so include recent Java exceptions.
            File errors = new File(context.getExternalFilesDir(null), "zb-errors.txt");
            if (errors.isFile()) {
                String javaErrors = new String(Files.readAllBytes(errors.toPath()), StandardCharsets.UTF_8);
                int keepFrom = Math.max(0, javaErrors.length() - 16000);
                if (keepFrom > 0) javaErrors = "(older errors omitted)\n" + javaErrors.substring(keepFrom);
                text += "\n--- JAVA ERRORS (RECENT) ---\n" + javaErrors;
            } else {
                text += "\n--- JAVA ERRORS (RECENT) ---\nNo recorded Java exceptions.\n";
            }
            return text.isEmpty() ? null : text;
        } catch (IOException | RuntimeException e) {
            Log.w(TAG, "cannot read the runtime report: " + e);
            return null;
        }
    }

    /** Copies text to the clipboard under `label`; false when the clipboard is unavailable. */
    static boolean copy(Context context, String label, String text) {
        try {
            ClipboardManager cm = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null) return false;
            cm.setPrimaryClip(ClipData.newPlainText(label, text));
            return true;
        } catch (RuntimeException e) {
            Log.w(TAG, "cannot copy to the clipboard: " + e);
            return false;
        }
    }

    /** Records an error; copies it to the clipboard when copy is true. Returns the report text. */
    static String report(Context context, String what, Throwable t, boolean copy) {
        String stamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
        String text = stamp + " " + what + "\n" + Log.getStackTraceString(t);
        Log.e(TAG, what, t);
        appendToFile(context, text);
        if (copy) copy(context, "Afterlife error", text);
        return text;
    }

    /** Uncaught exceptions of a process are appended to the error file before the default handler runs. */
    static void installCrashRecorder(Context context) {
        final Context app = context.getApplicationContext() != null ? context.getApplicationContext() : context;
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, t) -> {
            try {
                appendToFile(app, new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date())
                        + " uncaught in thread " + thread.getName() + "\n" + Log.getStackTraceString(t));
            } catch (Throwable ignored) {
                // never mask the original crash
            }
            if (previous != null) previous.uncaughtException(thread, t);
        });
    }

    private static void appendToFile(Context context, String text) {
        try {
            File dir = context.getExternalFilesDir(null);
            if (dir == null) return;
            try (FileOutputStream out = new FileOutputStream(new File(dir, "zb-errors.txt"), true)) {
                out.write((text + "\n").getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            Log.w(TAG, "cannot write the error file: " + e);
        }
    }
}
