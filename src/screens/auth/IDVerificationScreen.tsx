import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type IDVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type IDType = 'passport' | 'drivers_license' | 'national_id';

export const IDVerificationScreen: React.FC<IDVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [selectedIDType, setSelectedIDType] = useState<IDType | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const idTypes: { type: IDType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'passport', label: 'Passport', icon: 'document' },
    { type: 'drivers_license', label: "Driver's License", icon: 'car' },
    { type: 'national_id', label: 'National ID', icon: 'card' },
  ];

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload your ID.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIdImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to take a photo of your ID.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIdImage(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (!selectedIDType) {
      Alert.alert('Select ID Type', 'Please select the type of ID you want to upload.');
      return;
    }

    if (!idImage) {
      Alert.alert('Upload ID', 'Please upload or take a photo of your ID.');
      return;
    }

    navigation.navigate('SelfieVerification', {
      formData: {
        ...formData,
        idDocument: {
          type: selectedIDType,
          imageUri: idImage,
        },
      },
    });
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

        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Upload a clear photo of your government-issued ID. This helps us keep TrustMatch safe.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Select ID Type</Text>
        <View style={styles.idTypeContainer}>
          {idTypes.map(({ type, label, icon }) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.idTypeButton,
                selectedIDType === type && styles.idTypeButtonSelected,
              ]}
              onPress={() => setSelectedIDType(type)}
            >
              <Ionicons
                name={icon}
                size={24}
                color={selectedIDType === type ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.idTypeText,
                  selectedIDType === type && styles.idTypeTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Upload ID Photo</Text>
        {idImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: idImage }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setIdImage(null)}
            >
              <Ionicons name="close-circle" size={28} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color={COLORS.primary} />
              <Text style={styles.uploadText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color={COLORS.primary} />
              <Text style={styles.uploadText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <Card variant="outlined" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Make sure your ID is clearly visible, not blurry, and all text is readable.
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue to Selfie Verification"
          onPress={handleContinue}
          loading={isLoading}
          disabled={!selectedIDType || !idImage}
          size="large"
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  idTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  idTypeButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  idTypeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  idTypeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  idTypeTextSelected: {
    color: COLORS.white,
  },
  uploadContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  uploadButton: {
    flex: 1,
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  uploadText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  infoCard: {
    backgroundColor: COLORS.background,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
});
