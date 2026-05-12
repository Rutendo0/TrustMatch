import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegistrationStep = 
  | 'idle'
  | 'details'
  | 'id_upload'
  | 'id_back'
  | 'id_verifying'
  | 'id_success'
  | 'photos'
  | 'selfie'
  | 'completed';

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
    [key: string]: any;
  };
  lastUpdated: string;
}

const STORAGE_KEY = 'registration_progress';

// Safe storage that falls back to AsyncStorage when SecureStore isn't available (Expo Go)
const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (SecureStore?.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    try {
      if (SecureStore?.getItemAsync) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  },
  async deleteItem(key: string): Promise<void> {
    try {
      if (SecureStore?.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
      }
      await AsyncStorage.removeItem(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

class RegistrationProgressService {
  async saveProgress(step: RegistrationStep, formData: Record<string, any>): Promise<void> {
    try {
      const progress: RegistrationProgress = {
        step,
        formData,
        lastUpdated: new Date().toISOString(),
      };
      await storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save registration progress:', error);
    }
  }

  async getProgress(): Promise<RegistrationProgress | null> {
    try {
      const data = await storage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data) as RegistrationProgress;
      return null;
    } catch (error) {
      console.error('Failed to get registration progress:', error);
      return null;
    }
  }

  async clearProgress(): Promise<void> {
    try {
      await storage.deleteItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear registration progress:', error);
    }
  }

  async hasIncompleteRegistration(): Promise<boolean> {
    const progress = await this.getProgress();
    return progress !== null && progress.step !== 'completed';
  }

  async getResumeStep(): Promise<{ screen: string; formData: any } | null> {
    const progress = await this.getProgress();
    if (!progress || progress.step === 'completed' || progress.step === 'idle') return null;

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

    if (['id_upload', 'id_back', 'id_verifying'].includes(progress.step)) {
      return { screen: 'IDVerification', formData: progress.formData };
    }

    return { screen: stepToScreen[progress.step], formData: progress.formData };
  }
}

export const registrationProgress = new RegistrationProgressService();
