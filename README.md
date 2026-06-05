# 🛣️ DataLakeEdge — Offline-First Biometric Face Authentication
### NHAI Hackathon 7.0 — Track: Secure Biometric Offline Check-in

**DataLakeEdge** is a production-grade, offline-first face authentication application built on React Native 0.85 (New Architecture/Fabric enabled). It features secure, on-device biometric profile enrollment and verification, supported by a 3-step randomized liveness challenge (Smile, Blink, Neutral expressions) to prevent spoofing. It runs entirely offline under 1 second per check-in by leveraging Google ML Kit, MobileFaceNet, and C++ NEON JNI optimizations.

---

## 🏗️ System Architecture & Data Flow

DataLakeEdge follows a secure pipeline that keeps all biometric data on the local device:

```
┌─────────────────────────────────────────────────────────────┐
│                       1. CAMERA FRAME                       │
│  - Captures high-res frontal view (mirror axis compensated) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                2. GOOGLE ML KIT FACE DETECTOR                │
│  - Extracts face coordinates & roll angle (headEulerAngleZ) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             3. C++ NEON JNI / KOTLIN PREPROCESSING           │
│  - Rotates cropped face upright based on ML Kit roll angle   │
│  - Normalizes lighting using CLAHE (equalizes contrast)     │
│  - Downsamples to 112x112 pixel tensor                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          4. MOBILEFACENET INFERENCE (TFLite Engine)         │
│  - Executes 192-d floating-point embedding vector           │
│  - Runs on NNAPI hardware (NPU/DSP) with XNNPACK fallback   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              5. COSINE SIMILARITY COMPARISON                │
│  - Computes similarity score against local DB profile       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     SIMILARITY >= 0.68│             │     SIMILARITY < 0.68 │
├───────────────────────┤             ├───────────────────────┤
│       ✅ MATCH        │             │       ❌ MISMATCH     │
│ - Grant Access        │             │ - Deny Access         │
│ - Save SUCCESS log    │             │ - Save FAILED log     │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   6. LOCAL SQLite DATABASE                  │
│  - Stores employee records, timestamps, and audit log data │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Specs:
* **Offline Embedding Storage**: Saved securely in Shared Preferences using dynamic JSON encryption.
* **Database Engine**: Local SQLite engine with active table schemas tracking biometric confidence, inference latency (in ms), challenge sequences, and GPS plaza locations.
* **Performance**: End-to-end enrollment and authentication takes **< 150ms** for AI inference, and **< 15ms** for preprocessing.
* **APK Size**: Optimized from **226MB** to **44.2MB** (80.4% reduction).

---

## 📦 How Collaborators Can Test (No Source Code Required)

To verify the app's performance and test for negative matches (stranger rejection), follow these simple steps to install the pre-compiled optimized APK:

### 1. Installation
1. Locate the optimized release APK inside the repo:
   👉 **`android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`**
2. Transfer this `.apk` file to your Android phone/tablet (e.g. via Google Drive, Email, or USB).
3. On your Android device, go to **Settings** → **Apps** → **Special app access** → **Install unknown apps** → Enable permissions for your File Manager/Browser.
4. Open the APK file and select **Install**.

### 2. Live Verification Test Cases (Negative & Positive Testing)

* **Test Case 1: Enrollment**
  1. Open the app and tap **Register Employee**.
  2. Input Employee ID: `EMP-200` (Letters, numbers, and hyphens only).
  3. Select designation and enter a name.
  4. Position your face in the oval guide and tap **Capture**. You will receive an audio confirmation: *"Face profile enrolled successfully."*

* **Test Case 2: Negative Testing (Strangers Access Denied)**
  1. Return to the dashboard and select **Verify Attendance**.
  2. Enter the Employee ID: `EMP-200`.
  3. Complete the **3-Step Liveness Challenge** (perform the requested Smile, Blink, or Neutral face when prompted).
  4. Once liveness is verified, have a **different person** align their face for the matching capture.
  5. **Expected Result**: Access is denied, audio prompts *"Access denied. Face did not match"*, and logcat records a low similarity score (e.g., `0.22 - 0.29`), which is safely below the security threshold of `0.68`.

* **Test Case 3: Positive Testing (Access Granted)**
  1. Repeat the verification process for `EMP-200`.
  2. Complete the liveness challenges.
  3. Have the **original enrolled person** align their face for the capture.
  4. **Expected Result**: Access is granted, audio prompts *"Welcome"*, and logcat records a high similarity score (e.g. `0.85 - 0.94`), which is well above the `0.68` threshold.

* **Test Case 4: Audit Logs Check**
  1. Navigate to **Audit Logs** from the dashboard.
  2. View the list of all check-in attempts.
  3. Verify that the correct GPS locations, inference speed (in ms), biometric confidence scores, and challenge hashes are audited.

---

## 🛠️ How to Build and Run from Source (For Developers)

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: `v18` or higher
* **Android Studio**: Bundled with JDK 17
* **Android SDK**: Install SDK Platform version `34` (Android 14) and NDK `26.3.11579264`

### 2. Clone and Setup
Open PowerShell or your terminal and execute:
```bash
# Clone the repository
git clone https://github.com/AbhayBhise/DataLake.git
cd DataLake

# Install dependencies
npm install
```

### 3. Running the App (Debug Mode)
Ensure an Android device is connected with **USB Debugging** enabled (`adb devices` should list the device):

1. **Start the Metro Packager** (Terminal 1):
   ```bash
   npx react-native start --reset-cache
   ```
2. **Launch the Android App** (Terminal 2):
   ```bash
   npx react-native run-android
   ```

### 4. Compiling the Production Release Build (Windows Target)
To rebuild the optimized, Proguard-obfuscated ARM64 release APK:
```bash
# Navigate to android folder
cd android

# Clean existing build caches
./gradlew clean

# Compile release APK
./gradlew assembleRelease
```
The output APK will be generated at:
`android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

---

## ⚠️ Remaining Tasks for Teammates to Complete

Due to a power and battery outage, the latest project progress has been committed and pushed. Teammates must complete the following remaining items:

1. **Run and Complete the Final Release APK Build:**
   * Compile the optimized, obfuscated production APK:
     ```powershell
     cd android
     .\gradlew assembleRelease
     ```
   * Verify the build finishes without errors. (Note: The C++ JNI header compile warning and comment issue in `CMakeLists.txt` is already resolved and verified).

2. **Verify the New Adaptive App Icons:**
   * Install the generated build on a physical Android device.
   * Confirm the new **Face-Scan Viewfinder** launcher icon renders cleanly without any white/black background corners on different screen launchers (supports Android adaptive icon layers: `#0D2E6E` background + transparent vector foreground).

3. **Live AWS Sync Endpoint Testing:**
   * Ensure attendance logs sync successfully with the production API Gateway (`https://9e5wawwyq6.execute-api.ap-south-1.amazonaws.com/prod/sync`).
   * Verify local SQLite logs are purged *only* when the server responds with HTTP `200` and the response body is explicitly `{"success": true}`.

4. **Perform Ambient Light Liveness Testing:**
   * Test the randomized 3-step liveness challenge (Smile, Blink, Neutral) in real-world highway lighting conditions (direct sunlight and night lighting at plaza booths) to ensure high verification reliability.

