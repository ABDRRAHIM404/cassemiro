plugins { id("com.android.application") }
android {
    namespace = "com.b636control"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.b636control"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}