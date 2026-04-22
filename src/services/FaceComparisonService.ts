import { api } from './api';

/**
 * Server-side face comparison result
 */
interface ServerFaceCompareResult {
  success: boolean;
  similarity: number;
  isMatch: boolean;
  distance?: number;
  threshold: number;
  message: string;
  error?: string;
}

/**
 * Face match result for each comparison
 */
export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number;
  threshold: number;
  faceDetected: boolean;
}

/**
 * Result of comparing selfie with ID and profile photos
 */
export interface ComprehensiveFaceComparisonResult {
  success: boolean;
  selfieWithId: FaceMatchResult;
  selfieWithProfiles: FaceMatchResult[];
  allMatch: boolean;
  overallSimilarity: number;
  error?: string;
}

export interface FaceComparisonResult {
  success: boolean;
  isMatch: boolean;
  similarity: number;
  idFaceDetected: boolean;
  selfieFaceDetected: boolean;
  error?: string;
}

/**
 * Compare two faces using the server-side face-api.js
 * This works in React Native because the actual comparison happens on the server
 */
export const serverFaceCompare = async (
  image1: string,
  image2: string
): Promise<ServerFaceCompareResult> => {
  try {
    console.log('Calling external face comparison API...');
    
    const response = await api.compareFaces(image1, image2);
    
    console.log('Face comparison response:', response);
    
    if (!response.success) {
      return {
        success: false,
        similarity: 0,
        isMatch: false,
        threshold: 0.5,
        message: response.message || 'Face comparison failed',
        error: response.message,
      };
    }
    
    return response;
  } catch (error: any) {
    console.error('Face comparison error:', error);
    return {
      success: false,
      similarity: 0,
      isMatch: false,
      threshold: 0.5,
      message: error.message || 'Face comparison failed',
      error: error.message,
    };
  }
};

/**
 * Compare selfie with ID photo and profile photos using server-side comparison
 * This is the FREE solution - no external APIs needed
 */
export const comprehensiveFaceComparison = async (
  idImageUri: string | undefined,
  selfieImageUri: string,
  profilePhotoUris: string[] | undefined,
  threshold: number = 0.45
): Promise<ComprehensiveFaceComparisonResult> => {
  try {
    console.log('=== Starting Server-Side Face Comparison ===');
    console.log('Selfie:', selfieImageUri);
    console.log('ID:', idImageUri);
    console.log('Profile photos:', profilePhotoUris?.length || 0);

    const results: FaceMatchResult[] = [];
    let totalSimilarity = 0;
    let matchCount = 0;

    // Compare selfie with ID photo
    if (idImageUri) {
      console.log('Comparing selfie with ID photo...');
      const idResult = await serverFaceCompare(idImageUri, selfieImageUri);
      
      results.push({
        isMatch: idResult.isMatch,
        similarity: idResult.similarity,
        threshold: idResult.threshold,
        faceDetected: idResult.success,
      });
      
      totalSimilarity += idResult.similarity;
      if (idResult.isMatch) matchCount++;
      
      console.log(`ID photo: ${idResult.message}`);
    }

    // Compare with all profile photos
    if (profilePhotoUris && profilePhotoUris.length > 0) {
      console.log(`Comparing selfie with ${profilePhotoUris.length} profile photos...`);
      
      for (let i = 0; i < profilePhotoUris.length; i++) {
        const profileUri = profilePhotoUris[i];
        const profileResult = await serverFaceCompare(profileUri, selfieImageUri);
        
        results.push({
          isMatch: profileResult.isMatch,
          similarity: profileResult.similarity,
          threshold: profileResult.threshold,
          faceDetected: profileResult.success,
        });
        
        totalSimilarity += profileResult.similarity;
        if (profileResult.isMatch) matchCount++;
        
        console.log(`Profile ${i + 1}: ${profileResult.message}`);
      }
    }

    // Calculate overall results
    const avgSimilarity = results.length > 0 ? totalSimilarity / results.length : 0;
    const allMatch = matchCount === results.length && results.length > 0;
    const passThreshold = matchCount > 0 && avgSimilarity >= threshold;

    console.log(`\n=== Face Comparison Summary ===`);
    console.log(`Total comparisons: ${results.length}`);
    console.log(`Matches: ${matchCount}`);
    console.log(`Average similarity: ${(avgSimilarity * 100).toFixed(0)}%`);
    console.log(`All match: ${allMatch}`);
    console.log(`Pass: ${passThreshold}`);

    return {
      success: true,
      selfieWithId: results[0] || { isMatch: false, similarity: 0, threshold, faceDetected: !!idImageUri },
      selfieWithProfiles: results.slice(1),
      allMatch,
      overallSimilarity: avgSimilarity,
    };
  } catch (error: any) {
    console.error('Comprehensive face comparison error:', error);
    return {
      success: false,
      selfieWithId: { isMatch: false, similarity: 0, threshold, faceDetected: false },
      selfieWithProfiles: [],
      allMatch: false,
      overallSimilarity: 0,
      error: error.message || 'Face comparison failed',
    };
  }
};

/**
 * Compare ID and selfie (legacy function)
 */
export const compareIdAndSelfie = async (
  idImageUri: string,
  selfieImageUri: string,
  threshold: number = 0.45
): Promise<FaceComparisonResult> => {
  const result = await serverFaceCompare(idImageUri, selfieImageUri);
  
  return {
    success: result.success,
    isMatch: result.isMatch,
    similarity: result.similarity,
    idFaceDetected: result.success,
    selfieFaceDetected: result.success,
    error: result.error,
  };
};

// Legacy functions - kept for compatibility but now use server-side comparison
export const loadFaceModels = async (): Promise<boolean> => {
  console.log('Face models now loaded on server - using server-side comparison');
  return true;
};

export const extractFaceDescriptor = async (
  imageUri: string
): Promise<Float32Array | null> => {
  console.log('Face descriptors now extracted on server');
  return null;
};

export const compareFaces = (
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number => {
  console.log('Face comparison now done on server');
  return 0;
};

export const facesMatch = (
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold: number = 0.5
): boolean => {
  console.log('Face matching now done on server');
  return false;
};

export default {
  loadFaceModels,
  extractFaceDescriptor,
  compareFaces,
  facesMatch,
  compareIdAndSelfie,
  comprehensiveFaceComparison,
  serverFaceCompare,
};
