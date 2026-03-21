import * as SecureStore from 'expo-secure-store';

export type RegistrationStep = 
  | 'idle'
  | 'details'       // ID verification - details step
  | 'id_upload'     // ID verification - upload ID
  | 'id_back'       // ID verification - upload back of ID (if drivers license)
  | 'id_verifying'  // ID verification - processing
  | 'id_success'    // ID verification - completed
  | 'photos'        // Photo upload step
  | 'selfie'        // Selfie verification step
  | 'completed';    // All steps completed

interface RegistrationProgress {
  step: RegistrationStep;
  formData: {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    idType?: string;
    idFrontImage?: string;
    idBackImage?: string;
    extractedData?: any;
    photos?: string[];
    // Store any data entered at each step
    [key: string]: any;
  };
  lastUpdated: string;
}

const STORAGE_KEY = 'registration_progress';

class RegistrationProgressService {
  /**
   * Save the current registration progress
   */
  async saveProgress(step: RegistrationStep, formData: Record<string, any>): Promise<void> {
    try {
      const progress: RegistrationProgress = {
        step,
        formData,
        lastUpdated: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save registration progress:', error);
    }
  }

  /**
   * Get the current registration progress
   */
  async getProgress(): Promise<RegistrationProgress | null> {
    try {
      const data = await SecureStore.getItemAsync(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as RegistrationProgress;
      }
      return null;
    } catch (error) {
      console.error('Failed to get registration progress:', error);
      return null;
    }
  }

  /**
   * Clear the registration progress (when user completes registration or logs in)
   */
  async clearProgress(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear registration progress:', error);
    }
  }

  /**
   * Check if there's an incomplete registration in progress
   */
  async hasIncompleteRegistration(): Promise<boolean> {
    const progress = await this.getProgress();
    return progress !== null && progress.step !== 'completed';
  }

  /**
   * Get the next step to resume from
   * Returns the screen name to navigate to
   */
  async getResumeStep(): Promise<{ screen: string; formData: any } | null> {
    const progress = await this.getProgress();
    
    if (!progress || progress.step === 'completed' || progress.step === 'idle') {
      return null;
    }

    // Map registration steps to screen names
    const stepToScreen: Record<RegistrationStep, string> = {
      'idle': 'Register',
      'details': 'IDVerification',
      'id_upload': 'IDVerification',
      'id_back': 'IDVerification',
      'id_verifying': 'IDVerification',
      'id_success': 'PhotoUploadScreen',
      'photos': 'PhotoUploadScreen',
      'selfie': 'SelfieVerification',
      'completed': 'MainTabs',
    };

    const screen = stepToScreen[progress.step];
    
    // For steps that are between 'details' and 'id_success', go to IDVerification
    if (progress.step === 'id_upload' || progress.step === 'id_back' || progress.step === 'id_verifying') {
      return { screen: 'IDVerification', formData: progress.formData };
    }
    
    return { screen, formData: progress.formData };
  }
}

export const registrationProgress = new RegistrationProgressService();
