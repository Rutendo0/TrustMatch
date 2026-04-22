import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

// Types for document verification
export type DocumentType = 'passport' | 'drivers_license' | 'national_id';

export interface ExtractedDocumentData {
  documentType: DocumentType;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  documentNumber?: string;
  expiryDate?: string;
  nationality?: string;
  issueDate?: string;
  address?: string;
  gender?: string;
  restrictions?: string;
  rawText: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData: ExtractedDocumentData | null;
  confidence: number;
}

export interface UserDataForComparison {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
}

export interface VerificationResult {
  success: boolean;
  documentVerified: boolean;
  nameMatches: boolean;
  ageVerified: boolean;
  documentValid: boolean;
  notExpired: boolean;
  extractedData?: ExtractedDocumentData;
  errors: string[];
  confidence: number;
}

// Document field patterns for different document types
const DOCUMENT_PATTERNS = {
  passport: {
    documentNumber: /(?:PASSPORT|PASSPORT\s*NO|PP\s*NO|DOCUMENT\s*NO)[:.\s]*([A-Z0-9]{6,9})/i,
    surname: /(?:SURNAME)[:.\s]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*)/i,
    firstName: /(?:FIRST\s*NAME|GIVEN\s*NAMES?)[:.\s]*([A-Za-z]+)/i,
    name: /(?:NAME|SURNAME\s*AND\s*GIVEN\s*NAMES?|GIVEN\s*NAMES?)[:.\s]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*)/i,
    nationality: /(?:NATIONALITY|COUNTRY)[:.\s]*([A-Za-z]+)/i,
    dob: /(?:DATE\s*OF\s*BIRTH|DOB|D\.O\.B)[:.\s]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL|EXPIRATION)[:.\s]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    gender: /(?:SEX|GENDER)[:.\s]*([MF]|MALE|FEMALE)/i,
  },
  drivers_license: {
    documentNumber: /(?:LICENSE\s*NO|LICENCE\s*NO|DL\s*NO|DRIVER'S?\s*LICENSE)[:.\s]*([A-Z0-9]{5,15})/i,
    surname: /(?:SURNAME)[:.\s]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*)/i,
    firstName: /(?:FIRST\s*NAME|GIVEN\s*NAMES?)[:.\s]*([A-Za-z]+)/i,
    name: /(?:NAME|SURNAME|FULL\s*NAME|LICENCE\s*HOLDER)[:.\s]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*)/i,
    dob: /(?:DATE\s*OF\s*BIRTH|DOB|D\.O\.B|DATE\s*OF\s*ISSUE)[:.\s]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL|EXPIRATION\s*DATE)[:.\s]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    address: /(?:ADDRESS|ADD)[:.\s]*([A-Za-z0-9\s,]+(?:,\s*[A-Za-z0-9\s,]+)*)/i,
    restrictions: /(?:RESTRICTIONS|CONDITIONS)[:.\s]*([A-Za-z]+)/i,
    class: /(?:CLASS|CAT)[:.\s]*([A-Z0-9]+)/i,
  },
  national_id: {
    documentNumber: /(?:ID\s*NO|IDENTIFICATION\s*NO|NATIONAL\s*ID|NRIC)[^A-Za-z]*([A-Z0-9-]+)/i,
    firstName: /(?:FIRST\s*NAME|GIVEN\s*NAMES?)[^A-Za-z]*([A-Za-z]+)/i,
    surname: /(?:SURNAME)[^A-Za-z]*([A-Za-z]+)/i,
    name: /(?:NAME|FULL\s*NAME|IC\s*HOLDER)[^A-Za-z]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*)/i,
    dob: /(?:DATE\s*(?:O[FB]|OF)\s*BIRTH|DOB|D\.O\.B|BIRTH\s*DATE)[^0-9]*(\d{1,2}\D+\d{1,2}\D+\d{2,4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL)[^0-9]*(\d{1,2}\D+\d{1,2}\D+\d{2,4})/i,
    nationality: /(?:NATIONALITY|COUNTRY)[^A-Za-z]*([A-Za-z]+)/i,
    address: /(?:ADDRESS)[^A-Za-z]*([A-Za-z0-9\s,]+(?:,\s*[A-Za-z0-9\s,]+)*)/i,
  },
};

// Common date formats
const DATE_FORMATS = [
  /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,  // YYYY/MM/DD or YYYY-MM-DD
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,  // D/M/YY or DD/MM/YY
];

class DocumentVerificationService {
  /**
   * Extract text from document image using server-side OCR.
   * Accepts a data: base64 URI, a remote http/https URL, or a local file:// / ph:// URI
   * (local URIs are read and converted to base64 before sending).
   */
  async extractTextFromImage(imageUri: string): Promise<string> {
    try {
      let imageForOcr = imageUri;

      // Convert local file URIs (file://, ph://, content://) to base64 so the
      // server-side OCR can process them — the server can't reach the device filesystem.
      if (!imageUri.startsWith('data:') && !imageUri.startsWith('http')) {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64' as any,
        });
        const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageForOcr = `data:${mimeType};base64,${base64}`;
      }

      const result = await api.extractDocumentText(imageForOcr);

      if (result?.success && result.text) {
        return result.text as string;
      }

      console.log('Server-side OCR returned no text');
      return '';
    } catch (error) {
      console.log('OCR error:', error);
      return '';
    }
  }

  /**
   * Parse extracted text to find document fields
   */
  parseDocumentText(text: string, documentType: DocumentType): ExtractedDocumentData {
    const patterns = DOCUMENT_PATTERNS[documentType];
    const extractedData: ExtractedDocumentData = {
      documentType,
      rawText: text,
    };

    // Extract each field using regex patterns
    for (const [field, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim().toUpperCase();
        
        switch (field) {
          case 'name':
            // Store full name - let backend handle name order comparison
            extractedData.fullName = value;
            break;
          case 'firstName':
            extractedData.firstName = value;
            break;
          case 'lastName':
            extractedData.lastName = value;
            break;
          case 'documentNumber':
            extractedData.documentNumber = value;
            break;
          case 'dob':
            extractedData.dateOfBirth = this.normalizeDate(value);
            break;
          case 'expiry':
            extractedData.expiryDate = this.normalizeDate(value);
            break;
          case 'nationality':
            extractedData.nationality = value;
            break;
          case 'gender':
            extractedData.gender = value.startsWith('M') ? 'MALE' : 'FEMALE';
            break;
          case 'address':
            extractedData.address = value;
            break;
        }
      }
    }

    return extractedData;
  }

  /**
   * Normalize date string to ISO format (YYYY-MM-DD)
   * Avoids using new Date().toISOString() to prevent timezone issues
   */
  private normalizeDate(dateStr: string): string {
    for (const format of DATE_FORMATS) {
      const match = dateStr.match(format);
      if (match) {
        let day: number, month: number, year: number;

        if (match[1].length === 4) {
          // YYYY/MM/DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else if (match[3].length === 4) {
          // DD/MM/YYYY
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          // DD/MM/YY
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
          year = year < 100 ? 2000 + year : year;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Format directly to avoid timezone issues with new Date().toISOString()
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    return dateStr;
  }

  /**
   * Validate document format and required fields
   */
  validateDocumentFormat(extractedData: ExtractedDocumentData): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 0;

    // Check required fields based on document type
    switch (extractedData.documentType) {
      case 'passport':
        if (!extractedData.documentNumber) {
          errors.push('Passport number not found');
        } else {
          confidence += 25;
        }
        
        if (!extractedData.dateOfBirth) {
          errors.push('Date of birth not found');
        } else {
          confidence += 25;
        }
        
        if (!extractedData.expiryDate) {
          warnings.push('Expiry date not found');
        } else {
          confidence += 20;
        }
        
        if (extractedData.nationality) {
          confidence += 15;
        }
        break;

      case 'drivers_license':
        if (!extractedData.documentNumber) {
          errors.push('License number not found');
        } else {
          confidence += 25;
        }
        
        if (!extractedData.dateOfBirth) {
          errors.push('Date of birth not found');
        } else {
          confidence += 25;
        }
        
        if (!extractedData.expiryDate) {
          warnings.push('Expiry date not found');
        } else {
          confidence += 20;
        }
        break;

      case 'national_id':
        if (!extractedData.documentNumber) {
          errors.push('ID number not found');
        } else {
          confidence += 30;
        }
        
        if (!extractedData.dateOfBirth) {
          errors.push('Date of birth not found');
        } else {
          confidence += 30;
        }
        
        if (!extractedData.expiryDate) {
          warnings.push('Expiry date not found (national IDs may not expire)');
        } else {
          confidence += 15;
        }
        break;
    }

    // Add confidence for name
    if (extractedData.firstName || extractedData.fullName) {
      confidence += 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      extractedData,
      confidence: Math.min(confidence, 100),
    };
  }

  /**
   * Check if document is expired
   */
  isDocumentExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;

    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiry < today;
    } catch {
      return false;
    }
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth: string): number | null {
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  }

  /**
   * Compare extracted name with user registration data
   */
  compareNames(
    extractedFirstName?: string,
    extractedLastName?: string,
    extractedFullName?: string,
    userFirstName?: string,
    userLastName?: string
  ): { matches: boolean; confidence: number; details: string } {
    const extracted = (extractedFullName || `${extractedFirstName || ''} ${extractedLastName || ''}`)
      .toLowerCase()
      .trim();
    const userName = `${userFirstName || ''} ${userLastName || ''}`.toLowerCase().trim();

    if (!extracted || !userName) {
      return { matches: false, confidence: 0, details: 'Name data incomplete' };
    }

    // Exact match
    if (extracted === userName) {
      return { matches: true, confidence: 100, details: 'Exact name match' };
    }

    // Normalize names for comparison
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const normExtracted = normalize(extracted);
    const normUser = normalize(userName);

    if (normExtracted === normUser) {
      return { matches: true, confidence: 95, details: 'Normalized name match' };
    }

    // Try both name orderings since ID format may vary
    const userFirst = (userFirstName || '').toLowerCase().trim();
    const userLast = (userLastName || '').toLowerCase().trim();
    const extractedFirst = (extractedFirstName || extracted.split(' ')[0] || '').toLowerCase();
    const extractedLast = (extractedLastName || extracted.split(' ').slice(1).join(' ') || '').toLowerCase();

    // Check first-last and last-first orderings
    const directMatch = extractedFirst === userFirst && extractedLast === userLast;
    const reverseMatch = extractedFirst === userLast && extractedLast === userFirst;
    
    // Check if all name parts are present (regardless of order)
    const userParts = [userFirst, userLast].filter(p => p.length > 0);
    const docParts = [extractedFirst, extractedLast].filter(p => p.length > 0);
    let allUserPartsFound = false;
    for (const up of userParts) {
      let found = false;
      for (const dp of docParts) {
        const normUp = normalize(up);
        const normDp = normalize(dp);
        if (normDp.includes(normUp) || normUp.includes(normDp)) {
          found = true;
          break;
        }
      }
      if (!found) {
        allUserPartsFound = false;
        break;
      }
      allUserPartsFound = true;
    }

    if (directMatch || reverseMatch) {
      return { matches: true, confidence: 90, details: directMatch ? 'First and last name match' : 'Name order variation match' };
    } else if (allUserPartsFound) {
      return { matches: true, confidence: 80, details: 'All name components found' };
    } else if (extracted.includes(userFirst) || userName.includes(extractedFirst)) {
      return { matches: true, confidence: 60, details: 'Name components overlap' };
    }

    return { matches: false, confidence: 20, details: 'Name does not match' };
  }

  /**
   * Verify extracted document data against user registration data
   */
  async verifyDocument(
    frontImageUri: string,
    backImageUri: string | null,
    documentType: DocumentType,
    userData: UserDataForComparison
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    let extractedData: ExtractedDocumentData | null = null;
    let confidence = 0;

    try {
      // Extract text from front image
      const frontText = await this.extractTextFromImage(frontImageUri);
      
      // If we have text, parse it
      if (frontText) {
        extractedData = this.parseDocumentText(frontText, documentType);
        const validation = this.validateDocumentFormat(extractedData);
        
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
        confidence = validation.confidence;
      } else {
        // No ML available - assume valid for now (user enters data manually)
        // This is a fallback for when ML is not available
        extractedData = {
          documentType,
          rawText: 'Manual entry fallback',
        };
        confidence = 50;
      }

      // If we have back image, parse it
      if (backImageUri) {
        const backText = await this.extractTextFromImage(backImageUri);
        if (backText && extractedData) {
          // Parse back of license for additional fields
          const backData = this.parseDocumentText(backText, documentType);
          // Merge data - note: back of license may have address/restrictions
          extractedData = {
            ...extractedData,
            address: extractedData.address || backData.address,
            restrictions: backData.restrictions,
          };
        }
      }

      // Validate document is not expired
      const notExpired = !this.isDocumentExpired(extractedData?.expiryDate);
      if (!notExpired) {
        errors.push('Document has expired');
      }

      // Verify age is 18+
      let ageVerified = false;
      if (extractedData?.dateOfBirth) {
        const age = this.calculateAge(extractedData.dateOfBirth);
        if (age !== null && age >= 18) {
          ageVerified = true;
        } else if (age !== null) {
          errors.push('User must be at least 18 years old');
        }
      } else {
        // If we can't extract DOB, use user's provided DOB
        const userAge = this.calculateAge(userData.dateOfBirth);
        if (userAge !== null && userAge >= 18) {
          ageVerified = true;
        } else {
          errors.push('Age verification failed');
        }
      }

      // Compare names
      const nameComparison = this.compareNames(
        extractedData?.firstName,
        extractedData?.lastName,
        extractedData?.fullName,
        userData.firstName,
        userData.lastName
      );

      if (!nameComparison.matches) {
        errors.push(`Name mismatch: ${nameComparison.details}`);
      }

      const success = errors.length === 0 && confidence >= 40;

      return {
        success,
        documentVerified: success,
        nameMatches: nameComparison.matches,
        ageVerified,
        documentValid: notExpired && extractedData !== null,
        notExpired,
        extractedData: extractedData || undefined,
        errors,
        confidence,
      };
    } catch (error) {
      console.error('Document verification error:', error);
      return {
        success: false,
        documentVerified: false,
        nameMatches: false,
        ageVerified: false,
        documentValid: false,
        notExpired: false,
        errors: ['Document verification failed. Please try again.'],
        confidence: 0,
      };
    }
  }

  /**
   * Generate a simple hash of the document for deduplication
   */
  async generateDocumentHash(imageUri: string): Promise<string> {
    try {
      // Read file as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          // Simple hash - in production, use a proper hashing algorithm
          let hash = 0;
          for (let i = 0; i < base64.length; i++) {
            const char = base64.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          resolve(Math.abs(hash).toString(16));
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }
}

export const documentVerificationService = new DocumentVerificationService();
export default documentVerificationService;
