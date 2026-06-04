# ─── CMakeLists.txt ────────────────────────────────────────────────────────────
# DatalakeEdge — Native C++ JNI Build Configuration
# Builds the face_processor shared library for NHAI Hackathon 7.0
# ────────────────────────────────────────────────────────────────────────────────

cmake_minimum_required(VERSION 3.22.1)
project("datalakeedge_native" LANGUAGES CXX)

# ── C++ standard ──────────────────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Compiler flags ─────────────────────────────────────────────────────────────
# -O3          : maximum optimisation
# -march=armv8-a+simd : target ARM64 with NEON (SIMD) extensions
# -ffast-math  : allow aggressive FP optimisations (safe for image processing)
# -DANDROID_PLATFORM=android-26 : minimum API level (NNAPI requires 27+)
add_compile_options(
    -O3
    -ffast-math
    -ffunction-sections
    -fdata-sections
    -Wall
    -Wno-unused-parameter
)

if(ANDROID_ABI STREQUAL "arm64-v8a")
    add_compile_options(-march=armv8-a+simd)
    message(STATUS "[datalakeedge] Building arm64-v8a with NEON SIMD")
elseif(ANDROID_ABI STREQUAL "armeabi-v7a")
    add_compile_options(-mfpu=neon -mfloat-abi=hard)
    message(STATUS "[datalakeedge] Building armeabi-v7a with NEON")
else()
    message(STATUS "[datalakeedge] Building ${ANDROID_ABI} (scalar path)")
endif()

# ── Sources ────────────────────────────────────────────────────────────────────
add_library(
    datalakeedge_native     # Library name
    SHARED                  # .so output
    face_processor.cpp
)

# ── Android system libraries ───────────────────────────────────────────────────
find_library(android-lib android)   # ANativeWindow, AHardwareBuffer
find_library(log-lib     log)       # __android_log_print

# ── Link ───────────────────────────────────────────────────────────────────────
target_link_libraries(
    datalakeedge_native
    ${android-lib}
    ${log-lib}
    jnigraphics   # For potential bitmap pixel access via AndroidBitmap_*
)

# ── Strip unused sections (smaller .so) ───────────────────────────────────────
set_target_properties(datalakeedge_native PROPERTIES
    LINK_FLAGS "-Wl,--gc-sections"
)

message(STATUS "[datalakeedge] CMake configure complete for ABI=${ANDROID_ABI}")
