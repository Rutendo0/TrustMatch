import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const [animation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.background],
  });

  if (!animated) {
    return (
      <View
        style={[
          styles.skeleton,
          { width, height, borderRadius, backgroundColor: COLORS.border },
          style,
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, backgroundColor },
        style,
      ]}
    />
  );
};

export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileContainer}>
    <SkeletonLoader width="100%" height={300} borderRadius={16} />
    <View style={styles.profileInfo}>
      <View style={styles.nameRow}>
        <SkeletonLoader width={120} height={24} />
        <SkeletonLoader width={60} height={20} borderRadius={10} />
      </View>
      <SkeletonLoader width="80%" height={16} />
      <View style={styles.interestsRow}>
        <SkeletonLoader width={80} height={20} borderRadius={10} />
        <SkeletonLoader width={60} height={20} borderRadius={10} />
        <SkeletonLoader width={90} height={20} borderRadius={10} />
      </View>
    </View>
  </View>
);

export const MessageSkeleton: React.FC = () => (
  <View style={styles.messageContainer}>
    <SkeletonLoader width={50} height={50} borderRadius={25} />
    <View style={styles.messageContent}>
      <SkeletonLoader width="60%" height={16} />
      <SkeletonLoader width="40%" height={14} />
    </View>
  </View>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.listItem}>
        <SkeletonLoader width={60} height={60} borderRadius={30} />
        <View style={styles.listContent}>
          <SkeletonLoader width="70%" height={18} />
          <SkeletonLoader width="50%" height={14} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.border,
  },
  profileContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileInfo: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interestsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  messageContent: {
    marginLeft: 12,
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listContent: {
    marginLeft: 12,
    flex: 1,
  },
});