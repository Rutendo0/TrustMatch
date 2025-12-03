import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { normalize } from '../../hooks/useResponsive';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error?: Error; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={64} color={COLORS.error} />
      </View>
      
      <Text style={styles.title}>Something went wrong</Text>
      
      <Text style={styles.subtitle}>
        We're sorry, but something unexpected happened. Please try again.
      </Text>
      
      {__DEV__ && error && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorTitle}>Error Details (Development Only):</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          {error.stack && (
            <Text style={styles.stackText} numberOfLines={10}>
              {error.stack}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.actions}>
        <Button
          title="Try Again"
          onPress={onRetry}
          size="large"
          style={styles.retryButton}
        />
        
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => {
            // In production, this would send error report
          }}
          accessibilityLabel="Report this error"
          accessibilityRole="button"
        >
          <Ionicons name="bug-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.reportText}>Report Error</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: normalize(FONTS.sizes.xl),
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: normalize(22),
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  actions: {
    gap: SPACING.md,
    alignItems: 'center',
  },
  retryButton: {
    minWidth: normalize(140),
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: normalize(44),
  },
  reportText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
  },
  errorDetails: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    maxWidth: '100%',
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stackText: {
    fontSize: normalize(10),
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
});