plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

// 版本号跟随根目录 ../package.json（与网页版/Capacitor 版同步）：0.40.x → versionName 0.41.0 之类
// MVP 阶段先独立起步，版本规则 M10 再接上
android {
    namespace = "io.github.tsuiwiki.castlediary"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.tsuiwiki.castlediary"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.41.0-mvp"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        // 正式签名沿用既有密钥（GitHub Secrets 注入，覆盖安装 Capacitor 版不丢数据）
        create("release") {
            val ksPath = System.getenv("CASTLE_KEYSTORE_PATH")
            if (ksPath != null) {
                storeFile = file(ksPath)
                storeType = "pkcs12"
                storePassword = System.getenv("CASTLE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("CASTLE_KEY_ALIAS")
                keyPassword = System.getenv("CASTLE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            val ksPath = System.getenv("CASTLE_KEYSTORE_PATH")
            if (ksPath != null) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures { compose = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // Room schema 导出到 app/schemas（Migration 测试用）
    ksp { arg("room.schemaLocation", "$projectDir/schemas") }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.10.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.datastore:datastore-preferences:1.1.7")

    val room = "2.8.2"
    implementation("androidx.room:room-runtime:$room")
    implementation("androidx.room:room-ktx:$room")
    ksp("androidx.room:room-compiler:$room")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("io.coil-kt.coil3:coil-compose:3.3.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.3.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
