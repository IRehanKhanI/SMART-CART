import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ManualInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string, format: string) => void;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const [format, setFormat] = useState('EAN-13');

  const formats = ['EAN-13', 'CODE-128', 'QR-CODE', 'UPC-A'];

  const handleSubmit = () => {
    if (!code.trim()) {
      Alert.alert('Empty Input', 'Please enter a valid barcode number.');
      return;
    }
    onSubmit(code.trim(), format);
    setCode('');
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>MANUAL BARCODE INTAKE</Text>
              <Text style={styles.subtitle}>
                Direct digits entry for unreadable or damaged labels
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Symbology Selector */}
          <Text style={styles.fieldLabel}>BARCODE SYMBOLOGY</Text>
          <View style={styles.chipRow}>
            {formats.map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[
                  styles.chip,
                  format === fmt && styles.chipActive,
                ]}
                onPress={() => setFormat(fmt)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    format === fmt && styles.chipTextActive,
                  ]}
                >
                  {fmt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Code Input */}
          <Text style={styles.fieldLabel}>BARCODE DIGITS (SKU)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="barcode-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 8901030784912"
              placeholderTextColor={theme.colors.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="default"
              autoCapitalize="none"
              autoFocus
            />
          </View>

          {/* Submit Action */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.submitBtnText}>Inspect Barcode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 37, 34, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
    fontFamily: theme.fontFamily,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.accentSubtle,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  chipTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    fontFamily: theme.fontFamily,
  },
  submitBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 11,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily,
  },
});
