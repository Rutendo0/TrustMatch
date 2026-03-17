import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useDeviceFingerprint } from '../../hooks/useDeviceFingerprint';

type PhotoUploadScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Photo {
  uri: string;
  id: string;
}

export const PhotoUploadScreen: React.FC<PhotoUploadScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const deviceFingerprint = useDeviceFingerprint();

  const handleContinue = async () => {
    if (photos.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo to continue.');
      return;
    }

    try {
      setIsRegistering(true);
      
      // Register the user in the backend after ID verification passed
      await api.register({
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        interestedIn: formData.gender === 'MALE' ? 'FEMALE' : 'MALE',
        deviceFingerprint: deviceFingerprint.fingerprint || 'unknown',
        platform: 'mobile',
      });

      // Upload profile photos to server (token is now set after register)
      for (const photo of photos) {
        try {
          await api.uploadProfilePhoto(photo.uri);
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          // Continue — don't block registration if one photo fails
        }
      }

      navigation.navigate('SelfieVerification', {
        formData: { ...formData, photos: photos.map(p => p.uri) }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsRegistering(false);
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
      const newPhoto: Photo = {
        uri: result.assets[0].uri,
        id: Date.now().toString(),
      };
      
      if (photos.length < 6) {
        setPhotos([...photos, newPhoto]);
      } else {
        Alert.alert('Maximum Photos', 'You can only upload up to 6 photos.');
      }
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const handleNext = async () => {
    if (photos.length < 3) {
      Alert.alert('Minimum Photos Required', 'Please upload at least 3 photos to continue.');
      return;
    }

    setIsUploading(true);
    
    // Simulate photo processing
    setTimeout(() => {
      setIsUploading(false);
      navigation.navigate('SelfieVerification', { 
        formData: { ...formData, photos: photos.map(p => p.uri) } 
      });
    }, 2000);
  };

  const renderPhotoSlot = () => {
    const slots: React.ReactNode[] = [];

    // Render existing photos
    photos.forEach((photo, index) => {
      slots.push(
        <View key={photo.id} style={styles.photoContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photo} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removePhoto(photo.id)}
          >
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

    // Render empty slots to fill up to 6
    const remainingSlots = 6 - photos.length;
    for (let i = 0; i < remainingSlots; i++) {
      slots.push(
        <TouchableOpacity
          key={`empty-${i}`}
          style={styles.emptySlot}
          onPress={selectImage}
        >
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Photos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Show Your Best Self</Text>
          <Text style={styles.subtitle}>
            Upload 3-6 photos that represent you. Your first photo will be your main profile picture.
          </Text>
        </View>

        <View style={styles.photoGrid}>
          {renderPhotoSlot()}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Photo Tips:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Use clear, well-lit photos</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Show your face clearly in at least one photo</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Include full body photos</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Avoid group photos</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.photoCount}>
          <Text style={styles.photoCountText}>
            {photos.length}/6 photos selected
          </Text>
          {photos.length < 3 && (
            <Text style={styles.minimumText}>
              Minimum 3 photos required
            </Text>
          )}
        </View>
        
        <Button
          title={isUploading || isRegistering ? "Processing..." : "Continue"}
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
    alignItems: 'center',
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