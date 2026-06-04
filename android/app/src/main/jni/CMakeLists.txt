# ─── CMakeLists.txt ────────────────────────────────────────────────────────────
# DatalakeEdge — Native C++ JNI Build Configuration (Customized template)
# Builds the appmodules library including custom face processing and standard JNI loader.
# ────────────────────────────────────────────────────────────────────────────────

cmake_minimum_required(VERSION 3.13)

# Define the library name. React Native expects "appmodules" under the New Architecture.
project(appmodules)

# Custom Windows Path handling for REACT_ANDROID_DIR
if(CMAKE_HOST_WIN32)
    string(REPLACE "\\" "/" REACT_ANDROID_DIR ${REACT_ANDROID_DIR})
endif()

# This file includes all the necessary to build your application with the New Architecture.
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Add our custom face_processor C++ file to the appmodules target.
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    face_processor.cpp
)

# Compiler optimization and standards setup
target_compile_features(${CMAKE_PROJECT_NAME} PRIVATE cxx_std_20)

target_compile_options(${CMAKE_PROJECT_NAME} PRIVATE
    -O3
    -ffast-math
    -ffunction-sections
    -fdata-sections
    -Wall
    -Wno-unused-parameter
)

if(ANDROID_ABI STREQUAL "arm64-v8a")
    target_compile_options(${CMAKE_PROJECT_NAME} PRIVATE -march=armv8-a+simd)
elseif(ANDROID_ABI STREQUAL "armeabi-v7a")
    target_compile_options(${CMAKE_PROJECT_NAME} PRIVATE -mfpu=neon -mfloat-abi=softfp)
endif()

# Link android JNI libraries
find_library(android-lib android)
find_library(log-lib     log)

target_link_libraries(${CMAKE_PROJECT_NAME}
    ${android-lib}
    ${log-lib}
    jnigraphics
)
