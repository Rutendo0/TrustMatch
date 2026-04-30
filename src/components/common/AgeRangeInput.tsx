import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AgeRangeInputProps {
  minAge: number;
  maxAge: number;
  onMinChange: (val: number) => void;
  onMaxChange: (val: number) => void;
  minLimit?: number;
  maxLimit?: number;
}

export const AgeRangeInput: React.FC<AgeRangeInputProps> = ({
  minAge,
  maxAge,
  onMinChange,
  onMaxChange,
  minLimit = 18,
  maxLimit = 99,
}) => {
  // Keep raw string while typing so the field doesn't jump
  const [minText, setMinText] = useState(String(minAge));
  const [maxText, setMaxText] = useState(String(maxAge));

  const handleMinChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setMinText(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= minLimit && num < maxAge) {
      onMinChange(num);
    }
  };

  const handleMinBlur = () => {
    const num = parseInt(minText, 10);
    if (isNaN(num) || num < minLimit) {
      setMinText(String(minLimit));
      onMinChange(minLimit);
    } else if (num >= maxAge) {
      const clamped = maxAge - 1;
      setMinText(String(clamped));
      onMinChange(clamped);
    } else {
      setMinText(String(num));
      onMinChange(num);
    }
  };

  const handleMaxChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setMaxText(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num <= maxLimit && num > minAge) {
      onMaxChange(num);
    }
  };

  const handleMaxBlur = () => {
    const num = parseInt(maxText, 10);
    if (isNaN(num) || num > maxLimit) {
      setMaxText(String(maxLimit));
      onMaxChange(maxLimit);
    } else if (num <= minAge) {
      const clamped = minAge + 1;
      setMaxText(String(clamped));
      onMaxChange(clamped);
    } else {
      setMaxText(String(num));
      onMaxChange(num);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>From</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={minText}
            onChangeText={handleMinChange}
            onBlur={handleMinBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder={String(minLimit)}
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.unit}>yrs</Text>
        </View>
      </View>

      <View style={styles.divider}>
        <Text style={styles.dash}>—</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>To</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={maxText}
            onChangeText={handleMaxChange}
            onBlur={handleMaxBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder={String(maxLimit)}
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.unit}>yrs</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  field: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  input: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    minWidth: 36,
    padding: 0,
  },
  unit: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  divider: {
    paddingTop: SPACING.lg,
  },
  dash: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
  },
});
