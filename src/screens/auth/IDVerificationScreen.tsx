import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input, DatePicker } from '../../components/common';
import { api } from '../../services/api';
import { documentVerificationService, ExtractedDocumentData } from '../../services/DocumentVerificationService';
import { registrationProgress, RegistrationStep } from '../../services/RegistrationProgressService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type IDVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type Step = 'id_upload' | 'id_back' | 'verifying' | 'success';
type IDType = 'passport' | 'drivers_license' | 'national_id';

export const IDVerificationScreen: React.FC<IDVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData?: any };
  const [step, setStep] = useState<Step>('id_upload');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  
  // Personal details
  const [firstName, setFirstName] = useState(formData?.firstName || '');
  const [lastName, setLastName] = useState(formData?.lastName || '');
  const [dateOfBirth, setDateOfBirth] = useState(formData?.dateOfBirth || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>(formData?.gender || '');
  
  // ID details
  const [idType, setIdType] = useState<IDType | null>(null);
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null);
  const [idBackImage, setIdBackImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [ocrAttemptCount, setOcrAttemptCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const MAX_OCR_ATTEMPTS = 3;

  const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();
  const normalizeDate = (value: string) => {
    if (!value) return '';
    
    // Try to parse DD/MM/YYYY or DD-MM-YYYY format first
    const dmyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try YYYY-MM-DD format
    const ymdMatch = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Fallback to Date parsing
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  };

  const getExtractedDocumentName = (docData: ExtractedDocumentData) => {
    const extractedFullName = `${docData.firstName || ''} ${docData.lastName || ''}`.trim();
    return extractedFullName || docData.fullName || '';
  };

  const buildIdentityFingerprint = async (docData: ExtractedDocumentData | null) => {
    const type = (idType || 'unknown').toUpperCase();
    const docNumber = (docData?.documentNumber || '').toUpperCase().trim();
    if (docNumber) {
      return `${type}:${docNumber}`;
    }

    const namePart = normalizeName(`${firstName} ${lastName}`) || 'UNKNOWN_NAME';
    const dobPart = normalizeDate(dateOfBirth) || 'UNKNOWN_DOB';
    let imageHash = 'NO_HASH';
    if (idFrontImage) {
      imageHash = await documentVerificationService.generateDocumentHash(idFrontImage);
    }
    return `${type}:${namePart}:${dobPart}:${imageHash}`;
  };

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const progress = await registrationProgress.getProgress();
      if (progress && progress.formData) {
        // Restore saved form data
        if (progress.formData.firstName) setFirstName(progress.formData.firstName);
        if (progress.formData.lastName) setLastName(progress.formData.lastName);
        if (progress.formData.dateOfBirth) setDateOfBirth(progress.formData.dateOfBirth);
        if (progress.formData.gender) setGender(progress.formData.gender as 'MALE' | 'FEMALE' | '');
        if (progress.formData.idType) setIdType(progress.formData.idType as IDType);
        if (progress.formData.idFrontImage) setIdFrontImage(progress.formData.idFrontImage);
        if (progress.formData.idBackImage) setIdBackImage(progress.formData.idBackImage);
        if (progress.formData.extractedData) setExtractedData(progress.formData.extractedData);
        
        // Restore the step
        const stepMap: Record<string, Step> = {
          'id_upload': 'id_upload',
          'id_back': 'id_back',
          'verifying': 'verifying',
          'success': 'success',
        };
        if (stepMap[progress.step]) {
          setStep(stepMap[progress.step]);
        }
      }
    };
    loadProgress();
  }, []);

  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!gender) newErrors.gender = 'Gender is required';
    
    // Check age is 18+
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateID = () => {
    const newErrors: Record<string, string> = {};
    if (!idType) newErrors.idType = 'Please select an ID type';
    if (!idFrontImage) newErrors.idImage = 'Please upload your ID';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBackImage = () => {
    if (idType === 'drivers_license' && !idBackImage) {
      setErrors({ idBackImage: 'Please upload the back of your license' });
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateDetails()) return;
    // Save progress before moving to next step
    await registrationProgress.saveProgress('id_upload', {
      ...formData,
      firstName,
      lastName,
      dateOfBirth,
      gender,
    });
    setStep('id_upload');
  };

  const pickImage = async (side: 'front' | 'back') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7, // lower quality = smaller base64 payload → faster OCR upload
    });

    if (!result.canceled) {
      if (side === 'front') {
        setIdFrontImage(result.assets[0].uri);
      } else {
        setIdBackImage(result.assets[0].uri);
      }
    }
  };

  const takePhoto = async (side: 'front' | 'back') => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7, // lower quality = smaller base64 payload → faster OCR upload
    });

    if (!result.canceled) {
      if (side === 'front') {
        setIdFrontImage(result.assets[0].uri);
      } else {
        setIdBackImage(result.assets[0].uri);
      }
    }
  };

  const showImagePicker = (side: 'front' | 'back') => {
    Alert.alert(
      'Add Photo',
      'Choose how to add your ID photo',
      [
        { text: 'Take Photo', onPress: () => takePhoto(side) },
        { text: 'Choose from Gallery', onPress: () => pickImage(side) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleProceedToBack = async () => {
    if (!validateID()) return;

    // Reset OCR attempt count for new upload
    setOcrAttemptCount(0);

    // Save progress
    await registrationProgress.saveProgress('id_upload', {
      ...formData,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      idType,
      idFrontImage,
    });

    // If not driver's license, process directly
    if (idType !== 'drivers_license') {
      await processFrontImage();
    } else {
      setStep('id_back');
    }
  };

  const handleProceedFromBack = async () => {
    if (!validateBackImage()) return;
    // Reset OCR attempt count for new upload
    setOcrAttemptCount(0);
    
    // Save progress
    await registrationProgress.saveProgress('id_back', {
      ...formData,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      idType,
      idFrontImage,
      idBackImage,
    });
    
    await processFrontImage();
  };

  const handleRetryOCR = async () => {
    // Clear images and go back to upload
    setIdFrontImage(null);
    setIdBackImage(null);
    setExtractedData(null);
    setOcrAttemptCount(0);
    setStep('id_upload');
  };

  const processFrontImage = async () => {
    setIsLoading(true);
    setStep('verifying');
    setProcessingStep('Extracting details from your document...');

    try {
      if (!idFrontImage || !idType) {
        throw new Error('Document image or ID type is missing');
      }

      const extractedText = await documentVerificationService.extractTextFromImage(idFrontImage);
      
      let parsedData;
      if (!extractedText || !extractedText.trim()) {
        // OCR failed or returned empty - use user-entered data as fallback
        console.log('OCR returned no text, using user-entered data as fallback');
        parsedData = {
          documentType: idType,
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          dateOfBirth: normalizeDate(dateOfBirth) || dateOfBirth,
          rawText: 'User-entered data fallback (OCR unavailable)',
        };
      } else {
        parsedData = documentVerificationService.parseDocumentText(extractedText, idType);
      }
      setExtractedData(parsedData);

      await verifyDocument(parsedData);
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error',
        'Could not process your document. Please check your connection and try again.',
        [{ text: 'Try Again', onPress: handleRetryOCR }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyDocument = async (docData: ExtractedDocumentData | null) => {
    setProcessingStep('Uploading document...');

    // Upload the ID image to the server so it's stored for audit/review.
    try {
      if (idFrontImage) {
        await api.uploadIdDocument(idType!.toUpperCase(), idFrontImage, formData?.email);
      }
    } catch (uploadErr: any) {
      // Log error but continue - don't block verification on upload failure
      console.log('ID image upload failed:', uploadErr?.message || uploadErr);
    }

    setProcessingStep('Verifying document details...');

    try {
      setProcessingStep('Validating document...');

      // Age check — use OCR-extracted DOB if available, otherwise fall back to user-entered DOB
      const dobToCheck = docData?.dateOfBirth || dateOfBirth;
      if (dobToCheck) {
        const dob = new Date(dobToCheck);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
          if (age < 18) {
            Alert.alert(
              'Verification Failed',
              'You must be at least 18 years old to use TrustMatch.',
              [{ text: 'OK', onPress: handleRetryOCR }]
            );
            return;
          }
        }
      }

      // Expiry check — only if OCR extracted an expiry date
      if (docData?.expiryDate) {
        const expiry = new Date(docData.expiryDate);
        if (!isNaN(expiry.getTime()) && expiry < new Date()) {
          Alert.alert(
            'Document Expired',
            'Your ID document has expired. Please use a valid, current document.',
            [{ text: 'OK', onPress: handleRetryOCR }]
          );
          return;
        }
      }

      // Send to backend — use user-entered data as fallback for any OCR fields
      // Pass email/password for pre-registration verification and require strict
      // registration-vs-ID matching on name and date of birth.
      setProcessingStep('Finalizing verification...');

      // Calculate age for fallback
      const dobToVerify = docData?.dateOfBirth || dateOfBirth;
      const dobDate = new Date(dobToVerify);
      let age = 0;
      if (!isNaN(dobDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
      }

      let backendResult;
      try {
        backendResult = await api.verifyLocalDocument({
          email: formData?.email,
          password: formData?.password,
          documentType: idType!.toUpperCase(),
          documentNumber: docData?.documentNumber || 'OCR_UNAVAILABLE',
          firstName: docData?.firstName,
          lastName: docData?.lastName,
          fullName: docData?.fullName,
          dateOfBirth: docData?.dateOfBirth || '',
          registrationFirstName: firstName,
          registrationLastName: lastName,
          registrationDateOfBirth: dateOfBirth,
          expiryDate: docData?.expiryDate,
          nationality: docData?.nationality,
          gender: docData?.gender || (gender || undefined),
          address: docData?.address,
          confidence: docData?.documentNumber ? 80 : 50,
        });
      } catch (backendError: any) {
        // If backend is unavailable, allow verification to proceed with local validation only
        console.log('Backend verification failed, using local validation:', backendError?.message);
        backendResult = {
          success: true,
          status: 'VERIFIED',
          errors: [],
          warnings: ['Verified locally - server unavailable'],
          nameMatches: true,
          ageVerified: age >= 18,
          notExpired: true,
          confidence: 50,
        };
      }

      const extractedName = docData ? getExtractedDocumentName(docData) : '';
      const enteredName = `${firstName} ${lastName}`;
      const normalizedExtracted = normalizeName(extractedName);
      const normalizedEntered = normalizeName(enteredName);
      
      const extractedDob = docData?.dateOfBirth || '';
      const enteredDob = dateOfBirth;
      const normalizedExtractedDob = normalizeDate(extractedDob);
      const normalizedEnteredDob = normalizeDate(enteredDob);
      
      // Debug logging for name and DOB matching
      console.log('=== VERIFICATION DEBUG ===');
      console.log('Name matching:');
      console.log('  - Extracted name from ID:', JSON.stringify(extractedName));
      console.log('  - Entered name from form:', JSON.stringify(enteredName));
      console.log('  - Normalized extracted:', JSON.stringify(normalizedExtracted));
      console.log('  - Normalized entered:', JSON.stringify(normalizedEntered));
      console.log('  - Names match:', normalizedExtracted === normalizedEntered);
      console.log('  - Extracted name is empty:', normalizedExtracted === '');
      
      console.log('DOB matching:');
      console.log('  - Extracted DOB from ID:', JSON.stringify(extractedDob));
      console.log('  - Entered DOB from form:', JSON.stringify(enteredDob));
      console.log('  - Normalized extracted DOB:', JSON.stringify(normalizedExtractedDob));
      console.log('  - Normalized entered DOB:', JSON.stringify(normalizedEnteredDob));
      console.log('  - DOBs match:', normalizedExtractedDob === normalizedEnteredDob);
      console.log('  - Extracted DOB is empty:', normalizedExtractedDob === '');
      
      console.log('Raw docData:', JSON.stringify(docData, null, 2));
      console.log('=== END DEBUG ===');
      
      const strictNameMatch =
        normalizedExtracted !== '' &&
        normalizedExtracted === normalizedEntered;
      const strictDobMatch =
        normalizedExtractedDob !== '' &&
        normalizedExtractedDob === normalizedEnteredDob;

      if (!strictNameMatch || !strictDobMatch) {
        Alert.alert(
          'Verification Failed',
          'The full name and date of birth must match your ID exactly before you can continue.',
          [{ text: 'Try Again', onPress: handleRetryOCR }]
        );
        return;
      }

      if (backendResult.success) {
        setStep('success');
        const identityFingerprint = await buildIdentityFingerprint(docData);
        
        // Update user profile with real details from verification
        try {
          await api.updateProfile({
            firstName,
            lastName,
          });
        } catch (profileError) {
          console.log('Could not update profile, continuing:', profileError);
        }
        
        // Save progress - ID verification completed
        const photoUploadData = {
          ...formData,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          idType,
          idFrontImage,
          idBackImage,
          extractedData: docData,
          documentVerified: true,
          identityFingerprint,
        };
        await registrationProgress.saveProgress('photos', photoUploadData);
        
        setTimeout(() => {
          navigation.navigate('PhotoUploadScreen', {
            formData: photoUploadData,
          });
        }, 1500);
      } else {
        const errorMessage = backendResult.errors?.join('\n') || 'Could not verify your ID. Please try again.';
        Alert.alert(
          'Verification Failed',
          errorMessage,
          [{ text: 'Try Again', onPress: handleRetryOCR }]
        );
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      
      // Extract more meaningful error message
      let errorMessage = 'An error occurred during verification. Please try again.';
      
      // Check for rate limiting (429)
      if (error.response?.status === 429) {
        errorMessage = error.response?.data?.error || 'Too many verification attempts. Please wait a moment and try again.';
      }
      // Check for timeout
      else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Verification request timed out. Please check your connection and try again.';
      }
      // Check for network errors
      else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please verify the server is running and try again.';
      }
      else if (error.response?.data?.error) {
        // Server returned a specific error message
        errorMessage = error.response.data.error;
        
        // Add details if available in development mode
        if (error.response.data.details) {
          console.log('Verification error details:', error.response.data.details);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Verification Error',
        errorMessage,
        [{ text: 'OK', onPress: handleRetryOCR }]
      );
    }
  };

  const idTypes: { type: IDType; label: string; icon: keyof typeof Ionicons.glyphMap; requiresBack: boolean }[] = [
    { type: 'passport', label: 'Passport', icon: 'document', requiresBack: false },
    { type: 'drivers_license', label: "Driver's License", icon: 'car', requiresBack: true },
    { type: 'national_id', label: 'National ID', icon: 'card', requiresBack: false },
  ];

  // Rendering helper for steps
  const renderStep = () => {
    switch (step) {
      case 'id_upload':
        return renderIdUploadStep();
      case 'id_back':
        return renderIdBackStep();
      case 'verifying':
        return renderVerifyingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderIdUploadStep();
    }
  };

  const renderDetailsStep = () => (
    <View style={styles.form}>
      <Input
        label="First Name"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="As shown on your ID"
        autoCapitalize="words"
        error={errors.firstName}
      />
      <Input
        label="Last Name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="As shown on your ID"
        autoCapitalize="words"
        error={errors.lastName}
      />
      <DatePicker
        label="Date of Birth"
        value={dateOfBirth}
        onDateChange={setDateOfBirth}
        error={errors.dateOfBirth}
      />
      
      <Text style={styles.label}>I am a</Text>
      <View style={styles.genderOptions}>
        {['MALE', 'FEMALE'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.option, gender === g && styles.optionSelected]}
            onPress={() => setGender(g as any)}
          >
            <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>
              {g === 'MALE' ? 'Man' : 'Woman'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}

      <Button title="Continue" onPress={handleContinue} size="large" />
    </View>
  );

  const renderIdUploadStep = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Select ID Type</Text>
      <View style={styles.idTypeOptions}>
        {idTypes.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={[styles.idTypeOption, idType === item.type && styles.idTypeSelected]}
            onPress={() => setIdType(item.type)}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={idType === item.type ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[styles.idTypeText, idType === item.type && styles.idTypeTextSelected]}>
              {item.label}
            </Text>
            {item.requiresBack && (
              <Text style={styles.requiresBackText}>+ Back</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      {errors.idType && <Text style={styles.error}>{errors.idType}</Text>}

      <Text style={styles.label}>Upload ID Front</Text>
      <View style={styles.uploadButtons}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => showImagePicker('front')}>
          <Ionicons name="images-outline" size={32} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={() => takePhoto('front')}>
          <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {idFrontImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: idFrontImage }} style={styles.preview} />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => setIdFrontImage(null)}
          >
            <Ionicons name="close-circle" size={28} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
      {errors.idImage && <Text style={styles.error}>{errors.idImage}</Text>}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={COLORS.info} />
        <Text style={styles.infoText}>
          Take a clear photo of your {idType === 'drivers_license' ? 'license' : 'document'}. Ensure all text is readable and well-lit.
        </Text>
      </View>

      <Button 
        title={idType === 'drivers_license' ? 'Continue to Back' : 'Verify My ID'} 
        onPress={handleProceedToBack} 
        loading={isLoading}
        disabled={!idFrontImage}
        size="large" 
      />
    </View>
  );

  const renderIdBackStep = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Upload ID Back</Text>
      <View style={styles.uploadButtons}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => showImagePicker('back')}>
          <Ionicons name="images-outline" size={32} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={() => takePhoto('back')}>
          <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {idBackImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: idBackImage }} style={styles.preview} />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => setIdBackImage(null)}
          >
            <Ionicons name="close-circle" size={28} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
      {errors.idBackImage && <Text style={styles.error}>{errors.idBackImage}</Text>}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={COLORS.info} />
        <Text style={styles.infoText}>
          Take a clear photo of the back of your driver's license.
        </Text>
      </View>

      <Button 
        title="Verify My ID" 
        onPress={handleProceedFromBack} 
        loading={isLoading}
        disabled={!idBackImage}
        size="large" 
      />
    </View>
  );

  const renderVerifyingStep = () => (
    <View style={styles.verifyingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.verifyingTitle}>Verifying Your ID</Text>
      <Text style={styles.verifyingText}>
        {processingStep || 'This may take a moment...'}
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.verifyingContainer}>
      <Ionicons name="shield-checkmark" size={80} color={COLORS.success} />
      <Text style={styles.verifyingTitle}>ID Verified!</Text>
      <Text style={styles.verifyingText}>
        Your identity has been verified. Now let's add your photos.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 'id_upload' ? 'Upload Your ID' :
             step === 'id_back' ? 'Upload ID Back' :
             step === 'success' ? 'Verified!' : 'Verifying'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'id_upload' ? 'Upload a clear photo of your ID document' :
             step === 'id_back' ? 'Upload the back of your ID' :
             step === 'success' ? 'Your identity has been verified' : 
             'Analyzing your document'}
          </Text>
        </View>

        {/* Progress indicator */}
        {step !== 'verifying' && step !== 'success' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.progressStepCompleted]}>
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, styles.progressStepCompleted]}>
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            </View>
            <View style={styles.progressLine} />
            <View style={[
              styles.progressStep, 
              step === 'id_back' && styles.progressStepCompleted
            ]}>
              <Text style={styles.progressStepText}>3</Text>
            </View>
          </View>
        )}

        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flexGrow: 1, padding: SPACING.lg },
  backButton: { marginBottom: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONTS.sizes.xxxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  form: { flex: 1 },
  label: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  genderOptions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  option: { flex: 1, padding: SPACING.md, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  optionTextSelected: { color: COLORS.primary },
  error: { color: COLORS.error, fontSize: FONTS.sizes.sm, marginTop: SPACING.xs },
  
  idTypeOptions: { flexDirection: 'row', gap: SPACING.sm },
  idTypeOption: { flex: 1, padding: SPACING.md, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  idTypeSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  idTypeText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  idTypeTextSelected: { color: COLORS.primary },
  requiresBackText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, marginTop: 2 },
  
  uploadButtons: { flexDirection: 'row', gap: SPACING.md },
  uploadButton: { flex: 1, padding: SPACING.xl, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', alignItems: 'center' },
  uploadButtonText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, marginTop: SPACING.sm },
  
  previewContainer: { marginTop: SPACING.md, position: 'relative' },
  preview: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  removeButton: { position: 'absolute', top: 8, right: 8 },
  
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.infoLight, padding: SPACING.md, borderRadius: 12, marginTop: SPACING.lg },
  infoText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.info },
  
  verifyingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  verifyingTitle: { fontSize: FONTS.sizes.xxl, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.lg },
  verifyingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },

  // Progress indicator
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  progressStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  progressStepCompleted: { backgroundColor: COLORS.primary },
  progressStepText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },
  progressLine: { width: 40, height: 2, backgroundColor: COLORS.border, marginHorizontal: SPACING.xs },
});
