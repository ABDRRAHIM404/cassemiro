package com.zettabridge.launcher;

import android.content.ComponentName;
import android.content.Intent;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.ComponentInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.content.pm.Signature;
import android.os.Build;
import java.security.MessageDigest;
import android.util.Log;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;

/**
 * Package manager virtualization for the :guest process. Plugins run under the launcher's package
 * name, so SDKs that look up their own components or meta-data (Firebase component discovery,
 * AdMob/AppMetrica APPLICATION_ID, ...) would read the launcher's manifest. Queries for the
 * launcher package that name a plugin component, or ask for application/package info, are
 * answered from the plugin's parsed APK instead.
 */
final class PackageManagerHook implements InvocationHandler {
    private static final String TAG = "zb-launcher";

    private final Object real;
    private final String hostPackage;
    private final GuestRuntime runtime;

    private PackageManagerHook(Object real, String hostPackage, GuestRuntime runtime) {
        this.real = real;
        this.hostPackage = hostPackage;
        this.runtime = runtime;
    }

    static void install(Context host, GuestRuntime runtime) {
        Diagnostics.startIdentityTrace(host);
        try {
            Class<?> activityThread = Class.forName("android.app.ActivityThread");
            Object current = Reflect.method(activityThread, "getPackageManager").invoke(null);
            if (current == null || Proxy.isProxyClass(current.getClass())) return;
            Class<?> ipm = Class.forName("android.content.pm.IPackageManager");
            Object proxy = Proxy.newProxyInstance(ipm.getClassLoader(), new Class<?>[] {ipm},
                    new PackageManagerHook(current, host.getPackageName(), runtime));
            Field field = Reflect.field(activityThread, "sPackageManager");
            field.set(null, proxy);
            // ContextImpl caches an ApplicationPackageManager that holds the binder proxy directly.
            PackageManager pm = host.getPackageManager();
            Reflect.trySet(pm.getClass(), pm, "mPM", proxy);
            disableCaches();
            Log.i(TAG, "package manager virtualization installed");
        } catch (ReflectiveOperationException | RuntimeException e) {
            Diagnostics.report(host, "cannot install package manager virtualization", e, false);
        }
    }

    /** Android 11+ caches application/package info per process; stale entries would bypass the hook. */
    private static void disableCaches() {
        for (String name : new String[] {"disableApplicationInfoCache", "disablePackageInfoCache"}) {
            try {
                Reflect.method(PackageManager.class, name).invoke(null);
            } catch (ReflectiveOperationException | RuntimeException ignored) {
                // not present on this Android version
            }
        }
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        String name = method.getName();
        traceIdentityQuery(name, args);
        try {
            Object result = method.invoke(real, args);
            auditPackageResult("system", name, args, result, null);
            Object rewritten = rewrite(name, args, result);
            auditPackageResult("guest-visible", name, args, rewritten, null);
            return rewritten;
        } catch (InvocationTargetException e) {
            auditPackageResult("system-exception", name, args, null, e.getCause());
            // Plugin components are not in the launcher's manifest, so the system rejects toggling
            // them (ChatOn disables its own receivers at startup). There is no state to keep: ignore.
            if (e.getCause() instanceof IllegalArgumentException) {
                switch (method.getName()) {
                    case "setComponentEnabledSetting":
                    case "setComponentEnabledSettings":
                        return null;
                    case "getComponentEnabledSetting":
                        return PackageManager.COMPONENT_ENABLED_STATE_DEFAULT;
                    default:
                        break;
                }
            }
            Object fallback = rewriteMissing(method.getName(), args);
            if (fallback != null) {
                auditPackageResult("guest-fallback", name, args, fallback, null);
                return fallback;
            }
            throw e.getCause();
        }
    }


    /**
     * Read-only diagnostic of REAL binder answers and the VIRTUALIZED answers. Only the
     * certificate SHA-256 fingerprints are logged, never private keys or raw certificates.
     * Capture results in a separate file so frequent Context.getPackageName() calls cannot
     * exhaust the quota before the application's integrity checks.
     */
    private void auditPackageResult(String stage, String name, Object[] args, Object value, Throwable error) {
        boolean relevant = "getPackageInfo".equals(name) || "getApplicationInfo".equals(name)
                || "getPackagesForUid".equals(name) || "getPackageUid".equals(name)
                || "getPackageUidEtc".equals(name) || "checkSignatures".equals(name)
                || "getInstallerPackageName".equals(name) || "getInstallSourceInfo".equals(name);
        if (!relevant) return;
        try {
            String requested = args != null && args.length > 0 ? String.valueOf(args[0]) : "(none)";
            // This reflects the system binder method's actual flags parameter, if supplied.
            String flags = args != null && args.length > 1 ? String.valueOf(args[1]) : "-";
            StringBuilder report = new StringBuilder(stage).append(" PackageManager.")
                    .append(name).append(" package=").append(requested)
                    .append(" flags=").append(flags);
            if (error != null) {
                report.append(" error=").append(error.getClass().getSimpleName())
                        .append(": ").append(error.getMessage());
            } else if (value instanceof PackageInfo) {
                report.append(" ").append(describePackageInfo((PackageInfo) value));
            } else if (value instanceof ApplicationInfo) {
                report.append(" ").append(describeApplicationInfo((ApplicationInfo) value));
            } else if (value instanceof String[]) {
                report.append(" packages=").append(java.util.Arrays.toString((String[]) value));
            } else {
                report.append(" value=").append(String.valueOf(value));
            }
            LoadedPlugin guest = runtime.current();
            if (guest != null && guest.info != null && "getPackageInfo".equals(name)
                    && (requested.equals(guest.packageName) || requested.equals(hostPackage))) {
                report.append("\n  imported-archive=").append(describePackageInfo(guest.info));
            }
            Diagnostics.notePackageAudit(report.toString());
        } catch (RuntimeException failure) {
            Log.w(TAG, "cannot record package result", failure);
        }
    }

    private static String describePackageInfo(PackageInfo info) {
        StringBuilder out = new StringBuilder();
        out.append("package=").append(info.packageName)
                .append(" version=").append(info.versionName)
                .append(" signersLegacy=").append(signatureDigests(info.signatures));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            out.append(" versionCode=").append(info.getLongVersionCode());
            if (info.signingInfo == null) {
                out.append(" signingInfo=null");
            } else {
                out.append(" currentSigners=")
                        .append(signatureDigests(info.signingInfo.getApkContentsSigners()))
                        .append(" history=")
                        .append(signatureDigests(info.signingInfo.getSigningCertificateHistory()));
            }
        } else {
            out.append(" versionCode=").append(info.versionCode);
        }
        if (info.applicationInfo != null) {
            out.append(" ").append(describeApplicationInfo(info.applicationInfo));
        }
        return out.toString();
    }

    private static String describeApplicationInfo(ApplicationInfo info) {
        return "application=" + info.packageName + " uid=" + info.uid
                + " targetSdk=" + info.targetSdkVersion
                + " sourceDir=" + info.sourceDir + " publicSourceDir=" + info.publicSourceDir
                + " nativeLibraryDir=" + info.nativeLibraryDir + " dataDir=" + info.dataDir;
    }

    private static String signatureDigests(Signature[] signatures) {
        if (signatures == null) return "(null)";
        if (signatures.length == 0) return "[]";
        StringBuilder result = new StringBuilder("[");
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            for (int i = 0; i < signatures.length; i++) {
                if (i > 0) result.append(", ");
                byte[] bytes = sha256.digest(signatures[i].toByteArray());
                for (byte b : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
            }
        } catch (java.security.NoSuchAlgorithmException e) {
            return "(sha256 unavailable)";
        }
        return result.append(']').toString();
    }

    private void traceIdentityQuery(String name, Object[] args) {
        switch (name) {
            case "getPackageInfo":
            case "getApplicationInfo":
            case "getPackagesForUid":
            case "getInstallerPackageName":
            case "getInstallSourceInfo":
            case "checkSignatures":
            case "getPackageUid":
            case "getPackageUidEtc":
                break;
            default:
                return;
        }
        String arg = args != null && args.length > 0 ? String.valueOf(args[0]) : "(none)";
        String flags = args != null && args.length > 1 ? String.valueOf(args[1]) : "-";
        Diagnostics.noteIdentity("PackageManager." + name + "(" + arg + ", " + flags + ")"
                + " caller=" + Diagnostics.findGuestCaller());
    }

    private Object rewrite(String name, Object[] args, Object result) {
        if (args == null || args.length == 0) return result;
        switch (name) {
            case "getServiceInfo":
            case "getActivityInfo":
            case "getReceiverInfo":
            case "getProviderInfo": {
                Object component = pluginComponent(name, args[0]);
                return component != null ? component : result;
            }
            case "queryIntentActivities": {
                // Explicit intents for a plugin activity: old AdMob refuses to show ads unless
                // queryIntentActivities finds AdActivity with the right configChanges.
                ResolveInfo resolved = pluginActivityResolve(args[0]);
                return resolved != null ? withResolved(result, resolved) : result;
            }
            case "resolveIntent": {
                if (result != null) return result;
                return pluginActivityResolve(args[0]);
            }
            case "getApplicationInfo": {
                ApplicationInfo guestInfo = guestApplicationInfo(args[0]);
                // The imported APK is virtualized, but an installed host-package query
                // must describe the REAL host. Mixing host paths with guest metadata
                // produces inconsistent package identities during integrity checks.
                return guestInfo != null ? guestInfo : result;
            }
            case "getPackageInfo": {
                PackageInfo guestInfo = guestPackageInfo(args[0]);
                // Never mutate the real host PackageInfo or replace its version/signature.
                // Preserve the system's own answer for every installed third-party app.
                return guestInfo != null ? guestInfo : result;
            }
            default:
                return result;
        }
    }

    /** The real call threw (e.g. NameNotFound wrapped by the binder layer): answer plugin components anyway. */
    private Object rewriteMissing(String name, Object[] args) {
        if (args == null || args.length == 0) return null;
        switch (name) {
            case "getServiceInfo":
            case "getActivityInfo":
            case "getReceiverInfo":
            case "getProviderInfo":
                return pluginComponent(name, args[0]);
            case "getApplicationInfo":
                return guestApplicationInfo(args[0]);
            case "getPackageInfo":
                return guestPackageInfo(args[0]);
            default:
                return null;
        }
    }

    private Object pluginComponent(String method, Object arg) {
        if (!(arg instanceof ComponentName)) return null;
        ComponentName cn = (ComponentName) arg;
        if (!hostPackage.equals(cn.getPackageName()) && !isCurrentPluginPackage(cn.getPackageName())) return null;
        ComponentInfo info = runtime.findComponent(method, cn.getClassName());
        if (info == null) return null;
        if (info instanceof ServiceInfo) return new ServiceInfo((ServiceInfo) info);
        if (info instanceof ActivityInfo) return new ActivityInfo((ActivityInfo) info);
        if (info instanceof ProviderInfo) return new ProviderInfo((ProviderInfo) info);
        return info;
    }

    /** NativeActivity asks for its own intent's component, which names the plugin's package. */
    private boolean isCurrentPluginPackage(String packageName) {
        LoadedPlugin p = runtime.current();
        return p != null && p.info != null && p.info.packageName.equals(packageName);
    }

    private ResolveInfo pluginActivityResolve(Object arg) {
        if (!(arg instanceof Intent)) return null;
        Object info = pluginComponent("getActivityInfo", ((Intent) arg).getComponent());
        if (!(info instanceof ActivityInfo)) return null;
        ResolveInfo resolved = new ResolveInfo();
        resolved.activityInfo = (ActivityInfo) info;
        return resolved;
    }

    /** A query result (a ParceledListSlice, or a List on old releases) that holds `resolved` when it was empty. */
    private static Object withResolved(Object result, ResolveInfo resolved) {
        try {
            if (result instanceof List) {
                if (!((List<?>) result).isEmpty()) return result;
                List<ResolveInfo> list = new ArrayList<>();
                list.add(resolved);
                return list;
            }
            Class<?> slice = Class.forName("android.content.pm.ParceledListSlice");
            if (result != null && slice.isInstance(result)) {
                List<?> current = (List<?>) Reflect.method(slice, "getList").invoke(result);
                if (current != null && !current.isEmpty()) return result;
            }
            List<ResolveInfo> list = new ArrayList<>();
            list.add(resolved);
            return slice.getConstructor(List.class).newInstance(list);
        } catch (ReflectiveOperationException | RuntimeException e) {
            Log.w(TAG, "cannot rewrite an activity query: " + e);
            return result;
        }
    }

    /** Return the imported APK's package identity for explicit guest-package queries. */
    private ApplicationInfo guestApplicationInfo(Object requestedPackage) {
        LoadedPlugin p = runtime.current();
        if (p == null || !(requestedPackage instanceof String)
                || !p.packageName.equals(requestedPackage)) return null;
        return new ApplicationInfo(p.appInfo);
    }

    private PackageInfo guestPackageInfo(Object requestedPackage) {
        LoadedPlugin p = runtime.current();
        if (p == null || !(requestedPackage instanceof String)
                || !p.packageName.equals(requestedPackage)) return null;
        return p.info;
    }


}
