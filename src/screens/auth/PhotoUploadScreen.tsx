import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import { Button } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useDeviceFingerprint } from '../../hooks/useDeviceFingerprint';
import { registrationProgress } from '../../services/RegistrationProgressService';

type PhotoUploadScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Photo {
  uri: string;
  id: string;
  uploaded?: boolean;
  cloudUrl?: string; // Cloudinary URL after upload
}

export const PhotoUploadScreen: React.FC<PhotoUploadScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData, verifiedSelfieUri } = route.params as { formData?: any; verifiedSelfieUri?: string };
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [verifyingPhotoIndex, setVerifyingPhotoIndex] = useState<number | null>(null);
  const deviceFingerprint = useDeviceFingerprint();

  // Load saved progress on mount — prefer server photos to avoid re-uploads
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const serverPhotos = await api.getPhotos();
        if (serverPhotos && serverPhotos.length > 0) {
          setPhotos(serverPhotos.map((p: any) => ({
            uri: p.url,
            id: p.id,
            uploaded: true,
            cloudUrl: p.url,
          })));
          return;
        }
      } catch {
        // Not logged in yet or no photos — fall through to local progress
      }

      const progress = await registrationProgress.getProgress();
      if (progress?.formData?.photos && progress.formData.photos.length > 0) {
        setPhotos((progress.formData.photos as string[]).map((uri: string, index: number) => ({
          uri,
          id: `restored_${index}`,
          uploaded: false,
        })));
      }
    };
    loadProgress();
  }, []);

  const handleContinue = async () => {
    if (photos.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo to continue.');
      return;
    }
    if (photos.length < 3) {
      Alert.alert('Minimum Photos Required', 'Please upload at least 3 photos to continue.');
      return;
    }

    try {
      setIsRegistering(true);

      // Ensure we have an auth token
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token && formData?.email && formData?.password) {
          await api.login(formData.email, formData.password);
        }
      } catch (authErr) {
        console.log('Auth check failed, continuing:', authErr);
      }

      // Upload photos and collect Cloudinary URLs
      const cloudinaryUrls: string[] = [];
      const newPhotos = photos.filter(p => !p.uploaded);

      for (let i = 0; i < newPhotos.length; i++) {
        const photo = newPhotos[i];
        try {
          const result = await api.uploadProfilePhoto(photo.uri);
          const cloudUrl = result?.url || result?.photo?.url || photo.uri;
          cloudinaryUrls.push(cloudUrl);

          // ── Face check: only compare the FIRST (main/profile) photo ─────────
          // Additional photos are not face-checked — only the main photo matters.
          const isMainPhoto = i === 0;
          const selfieUri = verifiedSelfieUri || formData?.verifiedSelfieUri;
          if (isMainPhoto && (selfieUri || formData?.selfieVerified)) {
            setVerifyingPhotoIndex(i);
            try {
              const checkResult = await api.comparePhotoToSelfie(cloudUrl);
              if (checkResult.locked) {
                Alert.alert(
                  'Photo not verified',
                  'Your profile photo did not match your verified selfie. Please upload a clear photo that shows your face.'
                );
                return;
              }
              if (!checkResult.isMatch) {
                const similarityPct = Math.round((checkResult.similarity ?? 0) * 100);
                Alert.alert(
                  'Profile photo does not match your selfie',
                  `Your profile photo (${similarityPct}% match) does not match your verified selfie. Please upload a clear, well-lit photo where your face is fully visible.`
                );
                return;
              }
            } catch (checkErr: any) {
              console.warn('[PhotoUpload] face check error:', checkErr?.message);
              setVerifyingPhotoIndex(null);
              const serverMsg =
                checkErr?.response?.data?.details ||
                checkErr?.response?.data?.error ||
                checkErr?.message ||
                'Verification service unavailable.';
              Alert.alert(
                'Photo Verification Failed',
                `We could not verify your profile photo against your selfie. Please upload a clear, well-lit photo where your face is fully visible.\n\nDetails: ${serverMsg}`
              );
              return;
            }
            setVerifyingPhotoIndex(null);
          }
        } catch (uploadError: any) {
          console.error('Photo upload error:', uploadError?.response?.data || uploadError?.message);
          // Stop flow: upload failure means we should not proceed to email verification
          Alert.alert('Upload failed', 'Could not upload one of your photos. Please try again.');
          return;
        }
      }


      setVerifyingPhotoIndex(null);

      // Collect already-uploaded photo URLs too
      const alreadyUploadedUrls = photos
        .filter(p => p.uploaded && p.cloudUrl)
        .map(p => p.cloudUrl!);

      const allPhotoUrls = [...alreadyUploadedUrls, ...cloudinaryUrls];

      navigation.navigate('EmailVerification', {
        formData: {
          ...formData,
          photos: allPhotoUrls,
          photosVerified: true,
        },
      });
    } catch (error: any) {
      console.error('Photo upload error:', error?.response?.data || error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to upload photos. Please try again.';
      Alert.alert('Upload Error', errorMessage);
    } finally {
      setIsRegistering(false);
      setVerifyingPhotoIndex(null);
    }
  };

  const selectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const newPhoto: Photo = {
          uri: compressedImage.uri,
          id: Date.now().toString(),
          uploaded: false,
        };

        if (photos.length < 6) {
          const newPhotos = [...photos, newPhoto];
          setPhotos(newPhotos);
          await registrationProgress.saveProgress('photos', {
            ...formData,
            photos: newPhotos.map(p => p.uri),
          });
        } else {
          Alert.alert('Maximum Photos', 'You can only upload up to 6 photos.');
        }
      } catch (error) {
        console.error('Image compression error:', error);
        Alert.alert('Error', 'Failed to process image. Please try another photo.');
      }
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const renderPhotoSlot = () => {
    const slots: React.ReactNode[] = [];

    photos.forEach((photo, index) => {
      const isBeingVerified = verifyingPhotoIndex === index;
      slots.push(
        <View key={photo.id} style={styles.photoContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photo} />
          {isBeingVerified && (
            <View style={styles.verifyingOverlay}>
              <ActivityIndicator size="small" color={COLORS.white} />
            </View>
          )}
          <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(photo.id)}>
            <Ionicons name="close" size={16} color={COLORS.white} />
          </TouchableOpacity>
          {index === 0 && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryText}>Main</Text>
            </View>
          )}
        </View>
      );
    });

    const remainingSlots = 6 - photos.length;
    for (let i = 0; i < remainingSlots; i++) {
      slots.push(
        <TouchableOpacity key={`empty-${i}`} style={styles.emptySlot} onPress={selectImage}>
          <Ionicons name="camera" size={32} color={COLORS.textLight} />
          <Text style={styles.emptySlotText}>
            {photos.length === 0 ? 'Add Photo' : 'Add Another'}
          </Text>
        </TouchableOpacity>
      );
    }

    return slots;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Photos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Show Your Best Self</Text>
          <Text style={styles.subtitle}>
            Upload 3–6 photos. Main photo is automatically verified to match your identity.
          </Text>

          {/* Security notice */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={styles.securityNoteText}>
              <Text style={styles.securityNoteLabel}>Security check: </Text>
              Your profile photo is compared against your verified selfie to prevent impersonation.
            </Text>
          </View>
        </View>

        <View style={styles.photoGrid}>{renderPhotoSlot()}</View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Photo Tips:</Text>
          {[
            'Use clear, well-lit photos',
            'Show your face clearly in at least one photo',
            'Include full body photos',
            'Avoid group photos',
          ].map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.photoCount}>
          <Text style={styles.photoCountText}>{photos.length}/6 photos selected</Text>
          {photos.length < 3 && (
            <Text style={styles.minimumText}>Minimum 3 photos required</Text>
          )}
        </View>

        <Button
          title={isUploading || isRegistering ? 'Verifying & Uploading...' : 'Continue'}
          onPress={handleContinue}
          size="large"
          disabled={photos.length < 3 || isUploading || isRegistering}
          loading={isUploading || isRegistering}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  titleSection: {
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 108,
    height: 108,
    borderRadius: BORDER_RADIUS.md,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  emptySlot: {
    width: 108,
    height: 108,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  emptySlotText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  securityNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  securityNoteLabel: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Keep importantNote alias for any remaining references
  importantNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  importantNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  importantNoteLabel: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  tipsSection: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  photoCount: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  photoCountText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  minimumText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});