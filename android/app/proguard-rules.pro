# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep TensorFlow Lite
-keep class org.tensorflow.** { *; }
-keep class org.tensorflow.lite.** { *; }

# Keep React Native core & JNI
-keep class com.facebook.react.** { *; }
-keep class com.facebook.fbreact.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }

# Keep all implementations of NativeModule, TurboModule, JSIModule
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.BaseJavaModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }

# Keep JNI native methods intact (names and arguments)
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep attributes needed for JNI/reflection
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep your app package
-keep class com.datalakeedge.** { *; }

# Keep dependencies specified for NHAI Hackathon modules
-keep class com.mrousavy.** { *; }
-keep class com.visioncamerafacedetector.** { *; }
-keep class com.worklets.** { *; }
-keep class org.pgsqlite.** { *; }
-keep class net.no_mad.tts.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# React Native TurboModule & bridge defaults
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.common.** { *; }
-keep class com.facebook.react.defaults.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Ignore missing class warnings for TensorFlow Lite GPU delegates
-dontwarn org.tensorflow.lite.gpu.**
