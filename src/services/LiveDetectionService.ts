import { api } from './api';
import { comprehensiveFaceComparison, ComprehensiveFaceComparisonResult } from './FaceComparisonService';

/**
 * Live detection result for preventing catfishing
 */
export interface LiveDetectionResult {
  success: boolean;
  isMatch: boolean;
  similarity: number;
  confidence: number;
  storedPhotosMatched: number;
  totalStoredPhotos: number;
  error?: string;
  details: {
    selfieWithProfiles: Array<{
      isMatch: boolean;
      similarity: number;
      photoIndex: number;
    }>;
    overallSimilarity: number;
    threshold: number;
  };
}

/**
 * Live detection service for preventing catfishing
 * Compares live selfie with user's stored verification photos
 */
export class LiveDetectionService {
  private static instance: LiveDetectionService;
  private lastDetectionTime: number = 0;
  private detectionCooldown: number = 300000; // 5 minutes cooldown

  static getInstance(): LiveDetectionService {
    if (!LiveDetectionService.instance) {
      LiveDetectionService.instance = new LiveDetectionService();
    }
    return LiveDetectionService.instance;
  }

   /**
    * Perform live detection to verify user identity
    * Compares live selfie with stored profile photos and verification photos
    * Can optionally accept pre-fetched stored photos to avoid extra API call
    */
   async performLiveDetection(
     liveSelfieUri: string,
     options: {
       threshold?: number;
       requireMinimumMatches?: number;
       includeVerificationPhotos?: boolean;
       storedPhotos?: string[]; // Optional: pre-fetched photos for registration flow
     } = {}
   ): Promise<LiveDetectionResult> {
     try {
       const {
         threshold = 0.45,
         requireMinimumMatches = 2,
         includeVerificationPhotos = true,
         storedPhotos: providedStoredPhotos,
       } = options;

       // Check cooldown to prevent abuse
       const now = Date.now();
       if (now - this.lastDetectionTime < this.detectionCooldown) {
         return {
           success: false,
           isMatch: false,
           similarity: 0,
           confidence: 0,
           storedPhotosMatched: 0,
           totalStoredPhotos: 0,
           error: 'Live detection can only be performed every 5 minutes',
           details: {
             selfieWithProfiles: [],
             overallSimilarity: 0,
             threshold
           }
         };
       }

       // Use provided photos or fetch from backend
       let storedPhotos = providedStoredPhotos;
       if (!storedPhotos) {
         storedPhotos = await this.getStoredPhotos();
       }
       
       if (storedPhotos.length === 0) {
         return {
           success: false,
           isMatch: false,
           similarity: 0,
           confidence: 0,
           storedPhotosMatched: 0,
           totalStoredPhotos: 0,
           error: 'No stored photos found for comparison',
           details: {
             selfieWithProfiles: [],
             overallSimilarity: 0,
             threshold
           }
         };
       }

       // Perform comprehensive face comparison
       const comparisonResult = await comprehensiveFaceComparison(
         undefined, // No ID photo needed for live detection
         liveSelfieUri,
         storedPhotos,
         threshold
       );

       if (!comparisonResult.success) {
         return {
           success: false,
           isMatch: false,
           similarity: 0,
           confidence: 0,
           storedPhotosMatched: 0,
           totalStoredPhotos: storedPhotos.length,
           error: comparisonResult.error || 'Face comparison failed',
           details: {
             selfieWithProfiles: [],
             overallSimilarity: 0,
             threshold
           }
         };
       }

       // Analyze results
       const selfieWithProfiles = comparisonResult.selfieWithProfiles;
       const matchedPhotos = selfieWithProfiles.filter(result => result.isMatch);
       const totalMatches = matchedPhotos.length;
       const overallSimilarity = comparisonResult.overallSimilarity;

       // Calculate confidence based on number of matches and similarity
       const matchRatio = totalMatches / storedPhotos.length;
       const confidence = Math.min(1, (matchRatio * 0.7) + (overallSimilarity * 0.3));

       const isMatch = totalMatches >= requireMinimumMatches && overallSimilarity >= threshold;

       this.lastDetectionTime = now;

       // Submit successful verification to backend (optional - for logging)
       if (isMatch) {
         try {
           await api.submitLiveVerification({
             similarity: overallSimilarity,
             confidence,
             isMatch,
             photosMatched: totalMatches,
             totalPhotos: storedPhotos.length,
           });
           console.log('Live verification submitted to backend successfully');
         } catch (backendError) {
           console.error('Failed to submit live verification to backend:', backendError);
           // Don't fail the detection if backend submission fails
         }
       }

       return {
         success: true,
         isMatch,
         similarity: overallSimilarity,
         confidence,
         storedPhotosMatched: totalMatches,
         totalStoredPhotos: storedPhotos.length,
         details: {
           selfieWithProfiles: selfieWithProfiles.map((result, index) => ({
             isMatch: result.isMatch,
             similarity: result.similarity,
             photoIndex: index
           })),
           overallSimilarity,
           threshold
         }
       };

     } catch (error: any) {
       console.error('Live detection error:', error);
       return {
         success: false,
         isMatch: false,
         similarity: 0,
         confidence: 0,
         storedPhotosMatched: 0,
         totalStoredPhotos: 0,
         error: error.message || 'Live detection failed',
         details: {
           selfieWithProfiles: [],
           overallSimilarity: 0,
           threshold: options.threshold || 0.45
         }
       };
     }
   }

  /**
   * Get user's stored photos for comparison
   * Includes both profile photos and verification photos
   */
  private async getStoredPhotos(): Promise<string[]> {
    try {
      // Get user profile to access photos
      const profile = await api.getProfile();
      
      const photos: string[] = [];
      
      // Add profile photos
      if (profile.photos && Array.isArray(profile.photos)) {
        profile.photos.forEach((photo: any) => {
          if (photo.url) {
            photos.push(photo.url);
          }
        });
      }

      // Add verification selfie if available
      if (profile.verification?.selfieUrl) {
        photos.push(profile.verification.selfieUrl);
      }

      // Remove duplicates
      return [...new Set(photos)];
    } catch (error) {
      console.error('Error fetching stored photos:', error);
      return [];
    }
  }

  /**
   * Check if user can perform live detection (cooldown check)
   */
  canPerformLiveDetection(): boolean {
    const now = Date.now();
    return now - this.lastDetectionTime >= this.detectionCooldown;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getCooldownRemaining(): number {
    const now = Date.now();
    const remaining = this.detectionCooldown - (now - this.lastDetectionTime);
    return Math.max(0, remaining);
  }

  /**
   * Reset cooldown (for testing or special cases)
   */
  resetCooldown(): void {
    this.lastDetectionTime = 0;
  }
}

export default LiveDetectionService;