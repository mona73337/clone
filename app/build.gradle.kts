plugins {
    id("com.android.application")
}

// Release signing comes from environment variables (set as GitHub Actions secrets in CI):
//   CLONE_KEYSTORE (path to .p12/.jks), CLONE_KEYSTORE_PASSWORD, CLONE_KEY_ALIAS, CLONE_KEY_PASSWORD
val keystorePath: String? = System.getenv("CLONE_KEYSTORE")
val hasReleaseKey = keystorePath != null && file(keystorePath).exists()

android {
    namespace = "app.clone"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.clone"
        minSdk = 24
        targetSdk = 35
        versionCode = (System.getenv("CLONE_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("CLONE_VERSION_NAME") ?: "1.0.0"
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = System.getenv("CLONE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("CLONE_KEY_ALIAS") ?: "clone"
                keyPassword = System.getenv("CLONE_KEY_PASSWORD") ?: System.getenv("CLONE_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // The app is tiny and the JS bridge is reflective, so shrinking buys nothing here.
            isMinifyEnabled = false
            signingConfig = if (hasReleaseKey) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
        debug {
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = false
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}
