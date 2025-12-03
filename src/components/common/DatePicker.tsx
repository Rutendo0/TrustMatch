import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface DatePickerProps {
  label: string;
  value: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onDateChange,
  placeholder = 'DD/MM/YYYY',
  error,
  icon = 'calendar',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (dateString: string): Date | null => {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  };

  const handleConfirm = () => {
    const formattedDate = formatDate(selectedDate);
    onDateChange(formattedDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1950; year--) {
      years.push(year);
    }
    return years;
  };

  const generateMonthOptions = () => {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Initialize with existing date if available
  React.useEffect(() => {
    if (value) {
      const parsedDate = parseDate(value);
      if (parsedDate) {
        setSelectedDate(parsedDate);
      }
    }
  }, [value]);

  const renderDatePicker = () => (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.modalConfirm}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateSelector}>
            {/* Day Selector */}
            <ScrollView style={styles.scrollSection} showsVerticalScrollIndicator={false}>
              <Text style={styles.selectorLabel}>Day</Text>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.optionItem,
                    selectedDate.getDate() === day && styles.selectedItem
                  ]}
                  onPress={() => {
                    const maxDays = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
                    if (day <= maxDays) {
                      setSelectedDate(new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        day
                      ));
                    }
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedDate.getDate() === day && styles.selectedText
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month Selector */}
            <ScrollView style={styles.scrollSection} showsVerticalScrollIndicator={false}>
              <Text style={styles.selectorLabel}>Month</Text>
              {generateMonthOptions().map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.optionItem,
                    selectedDate.getMonth() === index && styles.selectedItem
                  ]}
                  onPress={() => {
                    setSelectedDate(new Date(
                      selectedDate.getFullYear(),
                      index,
                      selectedDate.getDate()
                    ));
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedDate.getMonth() === index && styles.selectedText
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Year Selector */}
            <ScrollView style={styles.scrollSection} showsVerticalScrollIndicator={false}>
              <Text style={styles.selectorLabel}>Year</Text>
              {generateYearOptions().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.optionItem,
                    selectedDate.getFullYear() === year && styles.selectedItem
                  ]}
                  onPress={() => {
                    setSelectedDate(new Date(
                      year,
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    ));
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedDate.getFullYear() === year && styles.selectedText
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Selected Date:</Text>
            <Text style={styles.previewText}>{formatDate(selectedDate)}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dateInput,
          error && styles.inputError
        ]}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {renderDatePicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  dateText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalConfirm: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  scrollSection: {
    flex: 1,
    maxHeight: 200,
  },
  selectorLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  optionItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 2,
  },
  selectedItem: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  previewText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  errorText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});