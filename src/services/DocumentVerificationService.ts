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
    surname: /SURNAME\s+([A-Z][A-Z\s]+?)(?=\s+FIRST|\s+GIVEN|\s+DATE|\s*$)/i,
    firstName: /FIRST\s+NAME\s+([A-Z][A-Z\s]+?)(?=\s+DATE|\s+OF\s+BIRTH|\s+NATION|\s+SEX|\s*$)/i,
    name: /(?:NAME|SURNAME\s*AND\s*GIVEN\s*NAMES?)[\s:]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*?)(?:\s{2,}|DATE|$)/i,
    nationality: /(?:NATIONALITY|COUNTRY)[\s:]*([A-Za-z]+)/i,
    dob: /DATE\s+OF\s+BIRTH\s+(\d{2}\/\d{2}\/\d{4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL|EXPIRATION)[^0-9]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    gender: /(?:SEX|GENDER)[\s:]*([MF](?:ALE|EMALE)?)\b/i,
  },
  drivers_license: {
    documentNumber: /(?:LICENSE\s*NO|LICENCE\s*NO|DL\s*NO|DRIVER'?S?\s*LICEN[SC]E)[\s:]*([A-Z0-9]{5,15})/i,
    surname: /SURNAME\s+([A-Z][A-Z\s]+?)(?=\s+FIRST|\s+DATE|\s*$)/i,
    firstName: /FIRST\s+NAME\s+([A-Z][A-Z\s]+?)(?=\s+DATE|\s+OF|\s*$)/i,
    name: /(?:NAME|FULL\s*NAME|LICENCE\s*HOLDER)[\s:]*([A-Za-z]+(?:[\s-]+[A-Za-z]+)*?)(?:\s{2,}|DATE|$)/i,
    dob: /DATE\s+OF\s+BIRTH\s+(\d{2}\/\d{2}\/\d{4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL|EXPIRATION\s*DATE)[^0-9]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    address: /(?:ADDRESS|ADD)[\s:]*([A-Za-z0-9\s,]+?)(?:\s{2,}|DATE|$)/i,
  },
  national_id: {
    // Zimbabwe NID: "ID NUMBER 63-2271966 L 63 CIT"
    documentNumber: /ID\s+NUMBER\s+(\d{2}-\d{7}(?:\s+\w+\s+\d{2}\s+\w+)?)/i,
    // Robust surname: capture everything between SURNAME and FIRST (stop at noise)
    surname: /SURNAME\s+([A-Z][A-Z\s]+?)(?=\s+FIRST|\s+[A-Z]{4,}\s+NAME|\s*$)/i,
    // Robust first name: capture everything between FIRST NAME and DATE OF BIRTH
    firstName: /FIRST\s+NAME\s+([A-Z][A-Z\s]+?)(?=\s+DATE|\s+OF\s+BIRTH|\s+VILLAGE|\s+PLACE|\s*$)/i,
    // DOB with label
    dob: /DATE\s+OF\s+BIRTH\s+(\d{2}\/\d{2}\/\d{4})/i,
    expiry: /(?:EXPIRY|EXPIRES?|VALID\s*UNTIL)[^0-9]*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i,
    nationality: /(?:NATIONALITY|COUNTRY)[\s:]*([A-Za-z]+)/i,
    address: /(?:ADDRESS)[\s:]*([A-Za-z0-9\s,]+?)(?:\s{2,}|DATE|$)/i,
  },
};

/**
 * Smart extractor for OCR output from ID documents (Zimbabwe NID, passport, driver's license).
 * Works on the normalized single-line OCR text returned by the server.
 *
 * Zimbabwe NID layout has TWO rows:
 *   Row 1 (labels): SURNAME  FIRST NAME  DATE OF BIRTH  VILLAGE OF ORIGIN  PLACE OF BIRTH  DATE OF ISSUE
 *   Row 2 (values): MIKITA YO  RUTENDO BRENDA  19/07/2002  HARARE  ...
 *
 * After server normalization all newlines become spaces, producing:
 *   "... SURNAME FIRST NAME DATE OF BIRTH ... MIKITA YO RUTENDO BRENDA 19/07/2002 ..."
 *
 * Strategy order:
 *  1. Two-row layout: labels block followed by values block (Zimbabwe NID style)
 *  2. Label-inline: values sit directly after their label (passport / some IDs)
 *  3. Positional: names appear right after the ID number
 *  4. Generic: two ALL-CAPS words adjacent to a date
 */
function extractNamesFromOcrText(text: string): { firstName?: string; lastName?: string; dob?: string } {
  const upper = text.toUpperCase();

  // ── Noise words to strip from captured name segments ────────────────────────
  const NOISE = new Set([
    'FIRST', 'NAME', 'NAMES', 'DATE', 'BIRTH', 'VILLAGE', 'PLACE', 'ORIGIN', 'ISSUE',
    'SIGNATURE', 'HOLDER', 'FINGERPRINT', 'NATIONAL', 'REGISTRATION', 'REPUBLIC',
    'ZIMBABWE', 'NUMBER', 'SURNAME', 'CIT', 'HARARE', 'BULAWAYO', 'GIVEN', 'OF',
    'FORENAME', 'FORENAMES', 'AND', 'THE', 'SEX', 'GENDER', 'MALE', 'FEMALE',
    'IDENTITY', 'CARD', 'DOCUMENT', 'PASSPORT', 'LICENSE', 'LICENCE', 'DRIVER',
  ]);

  // ── Clean helper: strip noise words and OCR punctuation/digits ───────────────
  const cleanWords = (raw: string): string => {
    return raw
      .trim()
      .replace(/[^A-Z\s\-']/g, ' ')  // remove non-alpha chars
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length >= 2 && !NOISE.has(w))
      .join(' ')
      .trim();
  };

  // ── Extract DOB (used by all strategies) ────────────────────────────────────
  const dobMatch = upper.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 1: Two-row layout (Zimbabwe NID)
  //
  // The OCR text contains the label row followed by the value row, all in one
  // flat string. The label block ends at the last known label keyword, and the
  // value block starts immediately after.
  //
  // Pattern: "... SURNAME FIRST NAME DATE OF BIRTH [more labels] <VALUES> ..."
  // We find where the label block ends (after "DATE OF ISSUE" or similar) and
  // then parse the value tokens positionally.
  //
  // Label order on Zimbabwe NID:
  //   SURNAME | FIRST NAME | DATE OF BIRTH | VILLAGE OF ORIGIN | PLACE OF BIRTH | DATE OF ISSUE
  // Value order (same positions):
  //   <surname> | <first names> | <DD/MM/YYYY> | <village> | <place> | <DD/MM/YYYY>
  // ─────────────────────────────────────────────────────────────────────────────

  // Detect the two-row layout: labels appear consecutively with no values between them
  // i.e. "SURNAME" is immediately followed (within ~30 chars) by "FIRST NAME"
  const twoRowDetect = upper.match(/SURNAME.{0,30}?FIRST\s+NAME.{0,30}?DATE\s+OF\s+BIRTH/);
  if (twoRowDetect) {
    // Find the end of the label block — the last label before values start
    // "DATE OF ISSUE" or "Signature of Holder" or "FINGERPRINT" marks the boundary
    const labelBlockEnd = upper.search(
      /DATE\s+OF\s+ISSUE|SIGNATURE\s+OF\s+HOLDER|FINGERPRINT/
    );

    // The value block starts after the label block end marker
    const valueBlockStart = labelBlockEnd !== -1
      ? upper.indexOf(' ', labelBlockEnd + 10) + 1  // skip past the matched label phrase
      : upper.search(/\d{2}-\d{7}/);                // fallback: start at ID number

    if (valueBlockStart > 0) {
      // Find the ID number in the value block — values come after it
      // Format: "63-2271966 L 63 CIT F <SURNAME_VALUE> <FIRSTNAME_VALUE> <DOB>"
      const afterIdNum = upper.substring(valueBlockStart);
      const idNumMatch = afterIdNum.match(
        /\d{2}-\d{7}[A-Z0-9\s]{0,20}?(?:CIT|CITIZEN)\s+[MF]\s+(.*)/
      );

      if (idNumMatch) {
        const valueStr = idNumMatch[1].trim();
        // valueStr: "MIKITA YO RUTENDO BRENDA 19/07/2002 HARARE 07/04/2022 Fingerprint"
        // Split on the first date — everything before is names, everything after is location/dates
        const dateIdx = valueStr.search(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
        if (dateIdx > 0) {
          const namesPart = valueStr.substring(0, dateIdx).trim();
          // namesPart: "MIKITA YO RUTENDO BRENDA"
          // On Zimbabwe NID: surname comes first, then first name(s)
          // We need to split namesPart into surname vs first names.
          // The surname is the token(s) before the first name that appears in the
          // registration data — but we don't have that here, so we use a heuristic:
          // surname = first word(s) up to the point where a new "name group" starts.
          //
          // Better heuristic: the ID number section contains the district code
          // (e.g. "63") which matches the first two digits of the ID number.
          // The surname is typically ONE token (may have a space if OCR split it).
          // We'll split on the assumption that surname = first 1-2 tokens,
          // first name = remaining tokens — but we expose BOTH so the caller
          // can do fuzzy matching against registration data.
          const nameTokens = namesPart
            .replace(/[^A-Z\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(w => w.length >= 2);

          if (nameTokens.length >= 2) {
            // Return all name tokens; the server's fuzzy matcher will find the right ones.
            // We set lastName = first token, firstName = rest — this matches Zimbabwe NID order.
            const lastName  = nameTokens[0];
            const firstName = nameTokens.slice(1).join(' ');
            console.log('[extractNames] Two-row strategy:', { lastName, firstName });
            return {
              lastName:  cleanWords(lastName),
              firstName: cleanWords(firstName),
              dob: dobMatch?.[1],
            };
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 2: Label-inline extraction
  // Handles: "SURNAME SIBANDA FIRST NAME BRIGHT TINASHE DATE OF BIRTH 26/10/2002"
  // Also handles passport: "SURNAME SMITH GIVEN NAMES JOHN WILLIAM DATE OF BIRTH ..."
  // ─────────────────────────────────────────────────────────────────────────────

  const surnameMatch = upper.match(
    /SURNAME[S]?\s+([A-Z][A-Z0-9\s\-']{0,40}?)(?=\s+(?:FIRST|GIVEN|FORE)\s*NAME|\s+DATE\s+OF\s+BIRTH|\s+VILLAGE|\s+PLACE|\s+GENDER|\s+SEX|\s+NATIONALITY|\s*$)/
  );

  const firstNameMatch = upper.match(
    /(?:FIRST\s+NAMES?|GIVEN\s+NAMES?|FORENAMES?)\s+([A-Z][A-Z0-9\s\-']{0,60}?)(?=\s+DATE\s+OF\s+BIRTH|\s+VILLAGE|\s+PLACE\s+OF|\s+DATE\s+OF\s+ISSUE|\s+FINGERPRINT|\s+SIGNATURE|\s+NATIONALITY|\s+SEX|\s+GENDER|\s*$)/
  );

  const lastName2  = surnameMatch?.[1]   ? cleanWords(surnameMatch[1])   : undefined;
  const firstName2 = firstNameMatch?.[1] ? cleanWords(firstNameMatch[1]) : undefined;

  if (lastName2 || firstName2) {
    console.log('[extractNames] Label-inline strategy:', { lastName: lastName2, firstName: firstName2 });
    return {
      firstName: firstName2 || undefined,
      lastName:  lastName2  || undefined,
      dob: dobMatch?.[1],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 3: Positional extraction after Zimbabwe NID number
  // ─────────────────────────────────────────────────────────────────────────────

  const positional = upper.match(
    /\d{2}-\d{7}[A-Z0-9\s]{0,20}?(?:CIT|CITIZEN)\s+[MF]\s+([A-Z]{2,})\s+([A-Z]{2,}(?:\s+[A-Z]{2,})*)\s+\d{2}[\/\-]\d{2}[\/\-]\d{4}/
  );
  if (positional) {
    console.log('[extractNames] Positional strategy:', { lastName: positional[1], firstName: positional[2] });
    return {
      lastName:  cleanWords(positional[1]),
      firstName: cleanWords(positional[2]),
      dob: dobMatch?.[1],
    };
  }

  // Looser positional
  const positionalLoose = upper.match(
    /\d{2}-\d{7}\S*\s+(?:\S+\s+){0,5}([A-Z]{3,})\s+([A-Z]{3,}(?:\s+[A-Z]{3,})?)\s+\d{2}[\/\-]\d{2}[\/\-]\d{4}/
  );
  if (positionalLoose) {
    const c1 = cleanWords(positionalLoose[1]);
    const c2 = cleanWords(positionalLoose[2]);
    if (c1 && c2) {
      console.log('[extractNames] Positional-loose strategy:', { lastName: c1, firstName: c2 });
      return { lastName: c1, firstName: c2, dob: dobMatch?.[1] };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 4: Generic — two ALL-CAPS words adjacent to a date
  // ─────────────────────────────────────────────────────────────────────────────

  if (dobMatch) {
    const dobIndex = upper.indexOf(dobMatch[1]);

    const beforeDob = upper.substring(0, dobIndex).trim();
    const beforeWords = beforeDob.split(/\s+/).filter(w => /^[A-Z]{2,}$/.test(w) && !NOISE.has(w));
    if (beforeWords.length >= 2) {
      const last = beforeWords[beforeWords.length - 1];
      const secondLast = beforeWords[beforeWords.length - 2];
      console.log('[extractNames] Generic-before strategy:', { lastName: secondLast, firstName: last });
      return { lastName: secondLast, firstName: last, dob: dobMatch[1] };
    }

    const afterDob = upper.substring(dobIndex + dobMatch[1].length).trim();
    const afterWords = afterDob.split(/\s+/).filter(w => /^[A-Z]{2,}$/.test(w) && !NOISE.has(w));
    if (afterWords.length >= 2) {
      console.log('[extractNames] Generic-after strategy:', { lastName: afterWords[0], firstName: afterWords.slice(1).join(' ') });
      return { lastName: afterWords[0], firstName: afterWords.slice(1).join(' '), dob: dobMatch[1] };
    }
  }

  return { firstName: undefined, lastName: undefined, dob: dobMatch?.[1] };
}

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
  async extractTextFromImage(imageUri: string): Promise<{ text: string; error?: string }> {
    try {
      let imageForOcr = imageUri;

      if (!imageUri.startsWith('data:') && !imageUri.startsWith('http')) {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64' as any,
        });
        const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageForOcr = `data:${mimeType};base64,${base64}`;
      }

      const result = await api.extractDocumentText(imageForOcr);

      // Server rejected due to low quality — surface the error
      if (result?.error) {
        return { text: '', error: result.error };
      }

      if (result?.success && result.text) {
        return { text: result.text as string };
      }

      console.log('Server-side OCR returned no text');
      return { text: '' };
    } catch (error) {
      console.log('OCR error:', error);
      return { text: '' };
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

    // For national IDs, use the smart positional extractor first
    if (documentType === 'national_id') {
      const smartNames = extractNamesFromOcrText(text);
      if (smartNames.firstName) extractedData.firstName = smartNames.firstName;
      if (smartNames.lastName) extractedData.lastName = smartNames.lastName;
      if (smartNames.dob) extractedData.dateOfBirth = this.normalizeDate(smartNames.dob);

      // Extract ID number: "ID NUMBER 63-2271966 L 63 CIT"
      const idMatch = text.match(/ID\s+NUMBER\s+(\d{2}-\d{7})/i);
      if (idMatch) extractedData.documentNumber = idMatch[1].trim().toUpperCase();

      console.log('[parseDocumentText] Smart extraction result:', {
        firstName: extractedData.firstName,
        lastName: extractedData.lastName,
        dateOfBirth: extractedData.dateOfBirth,
        documentNumber: extractedData.documentNumber,
      });

      return extractedData;
    }

    // For passport and driver's license, use regex patterns
    for (const [field, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim().toUpperCase();

        switch (field) {
          case 'name':
            extractedData.fullName = value;
            break;
          case 'surname':
            extractedData.lastName = value;
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

    // If label-based patterns didn't find a name, fall back to the smart extractor
    if (!extractedData.firstName && !extractedData.lastName && !extractedData.fullName) {
      const smartNames = extractNamesFromOcrText(text);
      if (smartNames.firstName) extractedData.firstName = smartNames.firstName;
      if (smartNames.lastName) extractedData.lastName = smartNames.lastName;
      if (!extractedData.dateOfBirth && smartNames.dob) {
        extractedData.dateOfBirth = this.normalizeDate(smartNames.dob);
      }
      console.log('[parseDocumentText] Smart extractor fallback result:', {
        firstName: extractedData.firstName,
        lastName: extractedData.lastName,
      });
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
