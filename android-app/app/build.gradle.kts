plugins {
  alias(libs.plugins.android.application)
}

android {
  namespace = "com.example.wwcatalog"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.wwrpg.catalog"
    minSdk = 24
    targetSdk = 34
    versionCode = 2
    versionName = "1.0.1"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  buildFeatures {
    compose = false
    aidl = false
    buildConfig = false
    shaders = false
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.12.0")
  implementation("androidx.activity:activity:1.8.2")
}
