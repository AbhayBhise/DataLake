// ─── FaceAuth Service ─────────────────────────────────────────────────────────
// JS-side wrapper around the native FaceAuthModule with typed results and
// graceful error handling

import { NativeModules } from 'react-native';

const { FaceAuthModule: NativeFaceAuthModule } = NativeModules;

export interface AuthResult {
  success: boolean;
  message: string;
  confidence?: number;   // 0.0 – 1.0 cosine similarity score
  inferenceMs?: number;  // How long the TFLite model took
}

export interface RegisterResult {
  success: boolean;
  message: string;
}

/**
 * All known error codes thrown by the native FaceAuthModule.
 * Map them to user-friendly messages.
 */
const NATIVE_ERROR_MESSAGES: Record<string, string> = {
  DETECTION_ERROR: 'Face detection failed. Please ensure your face is clearly visible and well-lit.',
  AUTH_ERROR:      'Authentication error. Please try again.',
  MODEL_ERROR:     'AI model failed to initialise. Please restart the app.',
  NO_FACE:         'No face detected. Please align your face within the oval guide.',
  NO_EMPLOYEE:     'Employee ID not registered. Please enroll your face profile first.',
  MATCH_FAILED:    'Face match failed. Confidence too low — please try again.',
  SPOOF_DETECTED:  'Liveness check failed. Ensure you are a live person, not a photo.',
};

function resolveErrorMessage(code: string, fallback?: string): string {
  return NATIVE_ERROR_MESSAGES[code] ?? fallback ?? 'An unexpected error occurred. Please try again.';
}

export const FaceAuthService = {
  /**
   * Check if the native module is available (guard against module not linked).
   */
  isAvailable(): boolean {
    return !!NativeFaceAuthModule && typeof NativeFaceAuthModule.registerFace === 'function';
  },

  /**
   * Register a face embedding for the given employee ID.
   * @param imageUri  file:// URI of the captured photo
   * @param employeeId  Unique employee identifier
   */
  async registerFace(imageUri: string, employeeId: string): Promise<RegisterResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Face authentication module is not available on this device.',
      };
    }
    if (!imageUri || !employeeId.trim()) {
      return { success: false, message: 'Invalid parameters provided.' };
    }
    try {
      const result = await NativeFaceAuthModule.registerFace(imageUri, employeeId.trim().toUpperCase());
      if (typeof result === 'boolean') {
        return {
          success: result,
          message: result
            ? 'Face profile successfully enrolled!'
            : 'No face detected in the captured photo. Please try again.',
        };
      }
      // If native returns an object
      return {
        success: result.success ?? false,
        message: result.message ?? (result.success ? 'Enrolled successfully.' : 'Enrollment failed.'),
      };
    } catch (error: any) {
      console.error('[FaceAuth] registerFace error:', error);
      return {
        success: false,
        message: resolveErrorMessage(error?.code, error?.message),
      };
    }
  },

  /**
   * Authenticate a face against a stored embedding.
   * @param imageUri  file:// URI of the captured photo
   * @param employeeId  Unique employee identifier to match against
   */
  async authenticateFace(imageUri: string, employeeId: string): Promise<AuthResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Face authentication module is not available on this device.',
      };
    }
    if (!imageUri || !employeeId.trim()) {
      return { success: false, message: 'Invalid parameters provided.' };
    }
    try {
      const result = await NativeFaceAuthModule.authenticateFace(imageUri, employeeId.trim().toUpperCase());
      return {
        success:     result.success ?? false,
        message:     result.message ?? (result.success ? 'Authenticated.' : 'Not authenticated.'),
        confidence:  result.confidence,
        inferenceMs: result.inference_ms,
      };
    } catch (error: any) {
      console.error('[FaceAuth] authenticateFace error:', error);
      return {
        success: false,
        message: resolveErrorMessage(error?.code, error?.message),
      };
    }
  },

  /**
   * Delete a registered face embedding.
   */
  async deleteFace(employeeId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await NativeFaceAuthModule.deleteFace(employeeId.trim().toUpperCase());
    } catch (error) {
      console.error('[FaceAuth] deleteFace error:', error);
      return false;
    }
  },
};

export default FaceAuthService;
