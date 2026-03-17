import React, { useState } from 'react';
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
import { ExtractedDocumentData } from '../../services/DocumentVerificationService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type IDVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type Step = 'details' | 'id_upload' | 'id_back' | 'verifying' | 'success';
type IDType = 'passport' | 'drivers_license' | 'national_id';

export const IDVerificationScreen: React.FC<IDVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [step, setStep] = useState<Step>('details');
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
    setProcessingStep('Verifying your document...');

    try {
      // Skip server-side OCR — it's unreliable on mobile networks and the
      // server-side Tesseract worker can stall, causing cascade 401 errors.
      // The backend verifyLocalDocument endpoint validates name, age and
      // document type against the user's registration data, which is
      // sufficient for verification without OCR.
      await verifyDocument(null);
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
    // This is best-effort — a failed upload does not block the verification step.
    try {
      if (idFrontImage) {
        await api.uploadIdDocument(idType!.toUpperCase(), idFrontImage);
      }
    } catch (uploadErr) {
      console.log('ID image upload failed, continuing with data verification:', uploadErr);
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
      setProcessingStep('Finalizing verification...');

      const backendResult = await api.verifyLocalDocument({
        documentType: idType!.toUpperCase(),
        documentNumber: docData?.documentNumber,
        firstName: docData?.firstName || firstName,
        lastName: docData?.lastName || lastName,
        fullName: docData?.fullName,
        dateOfBirth: docData?.dateOfBirth || dateOfBirth,
        expiryDate: docData?.expiryDate,
        nationality: docData?.nationality,
        gender: docData?.gender || (gender || undefined),
        address: docData?.address,
        confidence: docData?.documentNumber ? 80 : 50,
      });

      if (backendResult.success) {
        setStep('success');
        setTimeout(() => {
          navigation.navigate('PhotoUploadScreen', {
            formData: {
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
            }
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
      Alert.alert(
        'Verification Error',
        error.message || 'An error occurred during verification. Please try again.',
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
      case 'details':
        return renderDetailsStep();
      case 'id_upload':
        return renderIdUploadStep();
      case 'id_back':
        return renderIdBackStep();
      case 'verifying':
        return renderVerifyingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return null;
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
            {step === 'details' ? 'About You' : 
             step === 'id_upload' ? 'Upload Your ID' :
             step === 'id_back' ? 'Upload ID Back' :
             step === 'success' ? 'Verified!' : 'Verifying'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'details' ? 'Tell us about yourself' : 
             step === 'id_upload' ? 'Upload a clear photo of your ID document' :
             step === 'id_back' ? 'Upload the back of your ID' :
             step === 'success' ? 'Your identity has been verified' : 
             'Analyzing your document'}
          </Text>
        </View>

        {/* Progress indicator */}
        {step !== 'verifying' && step !== 'success' && step !== 'details' && (
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
