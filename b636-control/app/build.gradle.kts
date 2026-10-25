plugins { id("com.android.application") }
android {
    namespace = "com.b636control"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.b636control"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "0.6.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
