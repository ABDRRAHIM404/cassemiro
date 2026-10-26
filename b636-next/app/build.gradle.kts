plugins { id("com.android.application") }
android {
    namespace = "com.b636command"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.b636command"
        minSdk = 26
        targetSdk = 34
        versionCode = 10
        versionName = "1.9.0-alpha"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation("com.squareup.okhttp3:okhttp:4.12.0") }
