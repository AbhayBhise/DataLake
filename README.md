# 🛣️ DataLakeEdge
### Secure Offline Facial Authentication & Liveness Detection for NHAI

**DataLakeEdge** is a production-grade, 100% offline face authentication module built specifically for the **NHAI Hackathon 7.0**. Engineered to integrate seamlessly into the existing **Datalake 3.0** React Native application, it solves the critical challenge of authenticating field personnel in remote, zero-network toll plazas. 

By leveraging an ultra-lightweight AI model and Google ML Kit, the entire enrollment and verification process—including a randomized active liveness challenge—executes securely on-device in **under 150 milliseconds**.

---

## 🚀 Key Innovations & Benchmarks

- **100% Offline Capability**: No internet connection required for facial enrollment or daily attendance verification.
- **Micro-Footprint AI**: The integrated MobileFaceNet model is quantized to **under 5 MB**, guaranteeing no bloat to the existing Datalake app.
- **Lightning Inference**: Utilizes NNAPI hardware acceleration for complete authentication in **< 150ms** on standard mid-range mobile devices.
- **Anti-Spoofing Security**: Features an active 3-step Temporal Sequence Challenge (Smile → Blink → Neutral) to defeat photograph and video spoofing attempts.
- **Harsh Environment Ready**: Employs mathematically adaptive brightness normalisation (CLAHE) to handle extreme Indian highway lighting conditions, from harsh direct sunlight to deep shadows.

---

## ⚙️ Seamless Integration Guide (Plug-and-Play)

Integrating the DataLakeEdge module into the existing Datalake 3.0 architecture requires **zero changes to the core app architecture**. We built it as an independent React Native Bridge Module.

Here are the 3 simple steps to integrate:

### **Step 1: Drop in the Edge Module**
Copy the highly-compressed AI model (`mobilefacenet.tflite`) into the app's `assets` folder, and drop our Native Module file (`FaceAuthModule.kt`) into the Android source directory. 

### **Step 2: Register the Package**
In the Datalake 3.0 app's `MainApplication.kt`, simply add one line to expose the edge module to the JavaScript UI:
```kotlin
// Inside getPackages()
packages.add(FaceAuthPackage())
```

### **Step 3: Call it from React Native**
The authentication logic is now natively exposed. The Datalake 3.0 UI can call a single asynchronous function to authenticate a user:
```javascript
import { NativeModules } from 'react-native';
const { FaceAuthModule } = NativeModules;

// 1-line call from any React Native screen
const result = await FaceAuthModule.authenticateFace(userId);

if (result.success) {
   console.log("Offline Check-In Verified! Processing time: ", result.inferenceTimeMs);
}
```

---

## 🏗️ System Architecture & Data Flow

DataLakeEdge follows a highly secure, localized pipeline that ensures biometric data never leaves the device without explicit synchronization:

```
┌─────────────────────────────────────────────────────────────┐
│                       1. CAMERA FRAME                       │
│  - Captures high-res frontal view (mirror axis compensated) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                2. GOOGLE ML KIT FACE DETECTOR               │
│  - Extracts face coordinates & roll angle                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             3. C++ NEON JNI / NATIVE PREPROCESSING          │
│  - Rotates cropped face upright                             │
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
│  - Stores employee records, timestamps, and audit logs      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 How Evaluators Can Test the Prototype

To verify the app's performance, offline capability, and negative match rejection, follow these simple steps to install the provided optimized APK.

### 1. Installation
1. Locate the provided release APK: **`app-arm64-v8a-release.apk`**
2. Transfer the file to an Android device (Android 8.0+, minimum 3GB RAM).
3. Open the APK file and select **Install** (Allow installation from unknown sources if prompted).

### 2. Live Verification Test Cases

#### **Test Case 1: Initial Enrollment**
1. Open the app and tap **Enroll Face**.
2. Input an Employee ID (e.g., `EMP-200`) and a Name.
3. Position your face in the oval guide and tap **Capture**. 
   * *Expected Result:* Audio confirmation plays: *"Face profile enrolled successfully."*

#### **Test Case 2: Positive Testing (Access Granted)**
1. Return to the dashboard and select **Verify Check-In**.
2. Enter the enrolled Employee ID: `EMP-200`.
3. Complete the **3-Step Liveness Challenge** (perform the requested Smile, Blink, or Neutral face when prompted).
4. Keep your face aligned for the final capture.
   * *Expected Result:* Access is granted. The dashboard will now display a successful log entry with the processing time (ms) and confidence score.

#### **Test Case 3: Negative Testing (Strangers Access Denied)**
1. Select **Verify Check-In** again for `EMP-200`.
2. Complete the liveness challenges.
3. Have a **different person** (not the enrolled user) align their face for the capture.
   * *Expected Result:* Access is strictly denied. The dashboard audit logs will record a `FAILED` attempt with a low similarity score, safely below the security threshold of `0.68`.

#### **Test Case 4: Sync & Purge Mechanism**
1. Ensure the device is connected to the internet (toggle "Zero-Network Mode" to Online).
2. Tap the **Sync & Purge** button on the dashboard.
   * *Expected Result:* The app securely pushes the local audit logs to the AWS API Gateway. Upon receiving an `HTTP 200 OK` success receipt from the server, the local database is permanently purged to free up device storage, demonstrating reliable data synchronization.
