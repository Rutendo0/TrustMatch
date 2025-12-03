import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface SafetyAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired?: boolean;
  autoHide?: boolean;
  duration?: number;
}

interface RealTimeSafetyAlertsProps {
  onAlertDismiss?: (alertId: string) => void;
  onAlertAction?: (alertId: string, action: string) => void;
}

export const RealTimeSafetyAlerts: React.FC<RealTimeSafetyAlertsProps> = ({
  onAlertDismiss,
  onAlertAction,
}) => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Simulate real-time safety monitoring
    const simulateSafetyMonitoring = () => {
      // Mock safety events that could trigger alerts
      const mockAlerts: SafetyAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Suspicious Activity Detected',
          message: 'We noticed unusual login patterns on your account. Please verify your recent activity.',
          timestamp: new Date(),
          actionRequired: true,
          autoHide: false,
        },
        {
          id: '2',
          type: 'critical',
          title: 'Report Received',
          message: 'A report was filed against a user you recently matched with. We are investigating.',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          actionRequired: true,
          autoHide: false,
        },
        {
          id: '3',
          type: 'info',
          title: 'Safety Check Reminder',
          message: 'Remember to share your location when meeting someone new.',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          autoHide: true,
          duration: 10000, // 10 seconds
        },
      ];

      // Randomly add alerts to simulate real-time monitoring
      if (Math.random() > 0.7) {
        const randomAlert = mockAlerts[Math.floor(Math.random() * mockAlerts.length)];
        addAlert(randomAlert);
      }
    };

    const interval = setInterval(simulateSafetyMonitoring, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animate alerts when they appear
    if (alerts.length > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [alerts]);

  const addAlert = (alert: SafetyAlert) => {
    setAlerts(prev => {
      // Avoid duplicates
      if (prev.find(a => a.id === alert.id)) return prev;
      return [alert, ...prev];
    });

    // Auto-hide alerts if specified
    if (alert.autoHide && alert.duration) {
      setTimeout(() => {
        dismissAlert(alert.id);
      }, alert.duration);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    onAlertDismiss?.(alertId);
  };

  const handleAlertAction = (alert: SafetyAlert, action: string) => {
    if (action === 'dismiss') {
      dismissAlert(alert.id);
    } else {
      onAlertAction?.(alert.id, action);
    }
  };

  const getAlertIcon = (type: SafetyAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'warning';
      case 'warning':
        return 'alert-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getAlertColor = (type: SafetyAlert['type']) => {
    switch (type) {
      case 'critical':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'info':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {alerts.slice(0, 3).map((alert) => (
        <Card key={alert.id} style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View style={styles.alertIconContainer}>
              <Ionicons
                name={getAlertIcon(alert.type)}
                size={24}
                color={getAlertColor(alert.type)}
              />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTimestamp}>
                {formatTimestamp(alert.timestamp)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => dismissAlert(alert.id)}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {alert.actionRequired && (
            <View style={styles.alertActions}>
              {alert.type === 'critical' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAlertAction(alert, 'review')}
                >
                  <Text style={styles.actionButtonText}>Review Profile</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAlertAction(alert, 'report')}
              >
                <Text style={styles.actionButtonText}>Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAlertAction(alert, 'block')}
              >
                <Text style={styles.actionButtonText}>Block</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      ))}

      {alerts.length > 3 && (
        <View style={styles.moreAlerts}>
          <Text style={styles.moreAlertsText}>
            +{alerts.length - 3} more safety alerts
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return timestamp.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  alertCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  alertTimestamp: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreAlerts: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  moreAlertsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});