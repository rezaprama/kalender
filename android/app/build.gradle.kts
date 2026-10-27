import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.FileSystemOperations
import org.gradle.api.tasks.*
import javax.inject.Inject

plugins {
    id("com.android.application")
    kotlin("android")
    id("org.jetbrains.kotlin.plugin.compose")
}

abstract class CalendarAssetsTask : DefaultTask() {
    @get:InputDirectory @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val officialData: DirectoryProperty
    @get:InputFiles @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val licenseFiles: ConfigurableFileCollection
    @get:OutputDirectory abstract val outputDirectory: DirectoryProperty
    @get:Inject abstract val files: FileSystemOperations

    @TaskAction fun generate() {
        files.sync {
            from(officialData) { include("*.json"); into("official") }
            from(licenseFiles) { into("licenses") }
            into(outputDirectory)
        }
    }
}

android {
    namespace = "com.rezaprama.kalender"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.rezaprama.kalender"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        debug { applicationIdSuffix = ".debug"; resValue("string", "app_name", "Kalender (Dev)") }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        create("preview") {
            initWith(getByName("release"))
            applicationIdSuffix = ".preview"
            signingConfig = signingConfigs.getByName("debug")
            resValue("string", "app_name", "Kalender (Pratinjau)")
            matchingFallbacks += "release"
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    bundle { language { enableSplit = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    lint { abortOnError = true; checkReleaseBuilds = true }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

androidComponents.onVariants { variant ->
    val assets = tasks.register<CalendarAssetsTask>("generate${variant.name.replaceFirstChar { it.uppercase() }}CalendarAssets") {
        officialData.set(rootProject.layout.projectDirectory.dir("../data/official"))
        licenseFiles.from(listOf("LICENSE", "LICENSE-DATA.md", "NOTICE").map { rootProject.file("../$it") })
    }
    variant.sources.assets?.addGeneratedSourceDirectory(assets, CalendarAssetsTask::outputDirectory)
}

dependencies {
    implementation(project(":core"))
    implementation(platform("androidx.compose:compose-bom:2026.03.00"))
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.core:core-ktx:1.17.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    androidTestImplementation(platform("androidx.compose:compose-bom:2026.03.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    // Espresso 3.7 reflects a hidden input API removed in Android 17.
    // The test-only 3.8 alpha uses the supported service; it is not packaged in the app.
    androidTestImplementation("androidx.test.espresso:espresso-core:3.8.0-alpha01")
}
